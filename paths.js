// paths.js - Path utilities for the project

import path from 'path';
import fs from 'fs';

/**
 * Utility functions for resolving paths consistently across the project
 */

/**
 * Finds the project root directory by looking for config.yaml
 * @param {string} startDir - Directory to start searching from
 * @returns {string} - Absolute path to the project root
 */
export function findProjectRoot(startDir = process.cwd()) {
  let currentDir = startDir;
  
  // Look for config.yaml to identify project root
  while (!fs.existsSync(path.join(currentDir, 'config.yaml'))) {
    const parentDir = path.dirname(currentDir);
    
    // If we've reached the root of the filesystem without finding config.yaml
    if (parentDir === currentDir) {
      throw new Error('Could not find project root (config.yaml not found in any parent directory)');
    }
    
    currentDir = parentDir;
  }
  
  return currentDir;
}

/**
 * Get the absolute path to the API directory
 * @returns {string} - Absolute path to the API directory
 */
export function getApiDir() {
  const projectRoot = findProjectRoot();
  return path.join(projectRoot, 'api');
}

/**
 * Get the absolute path to the data directory
 * @returns {string} - Absolute path to the data directory
 */
export function getDataDir() {
  const apiDir = getApiDir();
  return path.join(apiDir, 'data');
}

/**
 * Resolve a path relative to the project root
 * @param {string} relativePath - Path relative to project root
 * @returns {string} - Absolute path
 */
export function resolveFromRoot(relativePath) {
  return path.join(findProjectRoot(), relativePath);
}

/**
 * Resolve a path relative to the API directory
 * @param {string} relativePath - Path relative to API directory
 * @returns {string} - Absolute path
 */
export function resolveFromApi(relativePath) {
  return path.join(getApiDir(), relativePath);
}