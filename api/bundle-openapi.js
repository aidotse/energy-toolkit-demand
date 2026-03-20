#!/usr/bin/env node
/**
 * Bundles the OpenAPI spec (resolving all $ref pointers) into a single JSON file.
 * Output goes to explorer/static/openapi.json for use by Scalar API docs.
 *
 * Usage: node api/bundle-openapi.js
 */
import $RefParser from 'json-schema-ref-parser';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, 'openapi.yaml');
const outputPath = resolve(__dirname, '..', 'explorer', 'static', 'openapi.json');

try {
	const bundled = await $RefParser.dereference(inputPath);
	mkdirSync(dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, JSON.stringify(bundled, null, 2));
	console.log(`Bundled OpenAPI spec → ${outputPath}`);
} catch (err) {
	console.error('Failed to bundle OpenAPI spec:', err.message);
	process.exit(1);
}
