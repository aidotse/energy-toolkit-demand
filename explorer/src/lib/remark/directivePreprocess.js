/**
 * Svelte preprocessor: transform :::directive{props} syntax into Svelte component tags.
 *
 * Runs BEFORE MDsveX in the preprocessor chain. Does string-level transformation
 * so MDsveX sees standard HTML component tags (which it passes through to Svelte).
 *
 * Container directives:
 *   :::Name{prop="value" icon={Component}}
 *   markdown content here
 *   :::
 *   → <Name prop="value" icon={Component}>markdown content here</Name>
 *
 * Leaf directives:
 *   ::Name{prop="value"}
 *   → <Name prop="value" />
 *
 * Auto-injects import statements for used components. If a <script> block exists,
 * imports are prepended into it. Otherwise a new <script> block is created.
 *
 * @module directivePreprocess
 */

/** @type {Record<string, string>} Map of component names → import paths */
const COMPONENTS = {
	InsightBox: '$lib/components/report/InsightBox.svelte',
	ReportSection: '$lib/components/report/ReportSection.svelte',
	HighlightCard: '$lib/components/report/HighlightCard.svelte',
	ContentCard: '$lib/components/layout/ContentCard.svelte',
	MethodologySteps: '$lib/components/report/MethodologySteps.svelte',
	InterpolationChart: '$lib/components/report/InterpolationChart.svelte',
	LoadProfileChart: '$lib/components/report/LoadProfileChart.svelte',
	GrowthLevelGrid: '$lib/components/report/GrowthLevelGrid.svelte',
	HomeMetrics: '$lib/components/report/HomeMetrics.svelte',
	HomeDynamicText: '$lib/components/report/HomeDynamicText.svelte',
	HomePeakInsight: '$lib/components/report/HomePeakInsight.svelte',
	ChartEmbed: '$lib/components/report/ChartEmbed.svelte',
	PowerConceptChart: '$lib/components/report/PowerConceptChart.svelte',
	FlexIllustrationChart: '$lib/components/report/FlexIllustrationChart.svelte',
	FlexFactorChart: '$lib/components/report/FlexFactorChart.svelte',
	HomeFooterCTA: '$lib/components/report/HomeFooterCTA.svelte',
	HomeFooter: '$lib/components/report/HomeFooter.svelte',
	Comparison: '$lib/components/report/Comparison.svelte'
};

/**
 * Find the matching closing brace for an opening `{` at position `start`.
 * Handles nested braces like `icon={Target}`.
 * Returns the index of the matching `}`, or -1 if not found.
 * @param {string} str
 * @param {number} start
 * @returns {number}
 */
function findMatchingBrace(str, start) {
	let depth = 0;
	for (let i = start; i < str.length; i++) {
		if (str[i] === '{') depth++;
		else if (str[i] === '}') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

/**
 * Find and transform all container directives (:::Name{props}\n...\n:::)
 * in the given content string.
 * @param {string} content
 * @param {Set<string>} usedComponents
 * @returns {string}
 */
function transformContainers(content, usedComponents) {
	// Match opening line: :::Name{ at start of line
	const openRe = /^(:::(\w+)\{)/gm;
	let result = content;
	let match;

	// Process from end to start to preserve offsets
	const replacements = [];

	while ((match = openRe.exec(content)) !== null) {
		const name = match[2];
		const braceStart = match.index + match[1].length - 1; // index of opening {
		const closeBrace = findMatchingBrace(content, braceStart);
		if (closeBrace === -1) continue;

		const attrs = content.slice(braceStart + 1, closeBrace).trim();

		// Find the rest of the opening line (after closing brace)
		const afterBrace = content.indexOf('\n', closeBrace);
		if (afterBrace === -1) continue;

		// Find closing ::: on its own line
		const bodyStart = afterBrace + 1;
		const closeRe = /^:::\s*$/gm;
		closeRe.lastIndex = bodyStart;
		const closeMatch = closeRe.exec(content);
		if (!closeMatch) continue;

		const inner = content.slice(bodyStart, closeMatch.index);
		const fullEnd = closeMatch.index + closeMatch[0].length;

		if (!COMPONENTS[name]) {
			console.warn(`[directivePreprocess] Unknown directive: "${name}" — left as-is`);
			continue;
		}

		usedComponents.add(name);
		const propsAttr = attrs ? ` ${attrs}` : '';
		const replacement = `<${name}${propsAttr}>\n${inner.trimEnd()}\n\n</${name}>`;
		replacements.push({ start: match.index, end: fullEnd, replacement });
	}

	// Apply replacements from end to start
	for (let i = replacements.length - 1; i >= 0; i--) {
		const { start, end, replacement } = replacements[i];
		result = result.slice(0, start) + replacement + result.slice(end);
	}

	return result;
}

/**
 * Find and transform all leaf directives (::Name{props}) in the given content string.
 * @param {string} content
 * @param {Set<string>} usedComponents
 * @returns {string}
 */
function transformLeaves(content, usedComponents) {
	const openRe = /^(::(\w+)\{)/gm;
	let result = content;
	let match;

	const replacements = [];

	while ((match = openRe.exec(content)) !== null) {
		const name = match[2];
		const braceStart = match.index + match[1].length - 1;
		const closeBrace = findMatchingBrace(content, braceStart);
		if (closeBrace === -1) continue;

		// Verify the rest of the line is just whitespace
		const lineEnd = content.indexOf('\n', closeBrace);
		const trailing = content.slice(closeBrace + 1, lineEnd === -1 ? undefined : lineEnd).trim();
		if (trailing) continue;

		const attrs = content.slice(braceStart + 1, closeBrace).trim();
		const fullEnd = lineEnd === -1 ? content.length : lineEnd;

		if (!COMPONENTS[name]) {
			console.warn(`[directivePreprocess] Unknown leaf directive: "${name}" — left as-is`);
			continue;
		}

		usedComponents.add(name);
		const propsAttr = attrs ? ` ${attrs}` : '';
		const replacement = `<${name}${propsAttr} />`;
		replacements.push({ start: match.index, end: fullEnd, replacement });
	}

	for (let i = replacements.length - 1; i >= 0; i--) {
		const { start, end, replacement } = replacements[i];
		result = result.slice(0, start) + replacement + result.slice(end);
	}

	return result;
}

/**
 * Create the Svelte preprocessor.
 * @param {{ extensions?: string[] }} [options]
 * @returns {import('svelte/compiler').PreprocessorGroup}
 */
export function directivePreprocess(options = {}) {
	const extensions = options.extensions || ['.md', '.svx'];

	return {
		name: 'directive-preprocess',
		markup({ content, filename }) {
			if (!filename || !extensions.some((ext) => filename.endsWith(ext))) {
				return;
			}

			const usedComponents = new Set();
			let result = content;

			// Transform container directives first (:::), then leaves (::)
			// Container regex won't match leaves because containers require closing :::
			result = transformContainers(result, usedComponents);
			result = transformLeaves(result, usedComponents);

			// Also detect components used as regular <Component> tags (not directives).
			// This handles cases like <InsightBox> inside a :::ReportSection container.
			for (const name of Object.keys(COMPONENTS)) {
				if (new RegExp(`<${name}[\\s>/{]`).test(result)) {
					usedComponents.add(name);
				}
			}

			if (usedComponents.size === 0) return;

			// Build import statements
			const imports = [...usedComponents]
				.map((name) => `\timport ${name} from '${COMPONENTS[name]}';`)
				.join('\n');

			// Inject imports into existing <script> or create a new one
			if (/<script[\s>]/.test(result)) {
				result = result.replace(/(<script[^>]*>)/, `$1\n${imports}`);
			} else {
				// Insert after frontmatter (---...---) if present, otherwise at top
				const fmMatch = result.match(/^---\n[\s\S]*?\n---\n/);
				if (fmMatch) {
					const fmEnd = fmMatch[0].length;
					result =
						result.slice(0, fmEnd) + `\n<script>\n${imports}\n</script>\n` + result.slice(fmEnd);
				} else {
					result = `<script>\n${imports}\n</script>\n\n` + result;
				}
			}

			return { code: result };
		}
	};
}
