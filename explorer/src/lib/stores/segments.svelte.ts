/**
 * Segment configuration store.
 *
 * Initialized from config.yaml (via /config) so components that render a
 * segment picker show only the segments the current implementation actually
 * models — not a hardcoded Sweden list. Defaults are set to an empty array;
 * callers that need a fallback can handle it explicitly.
 */

class SegmentsState {
	private _segments = $state<string[]>([]);

	get segments(): string[] {
		return this._segments;
	}

	initialize(segments: string[] | undefined) {
		if (Array.isArray(segments)) {
			this._segments = segments;
		}
	}

	reset() {
		this._segments = [];
	}
}

export const segmentsState = new SegmentsState();

export function getConfiguredSegments(): string[] {
	return segmentsState.segments;
}
