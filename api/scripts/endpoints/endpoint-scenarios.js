// api/scripts/endpoints/endpoint-scenarios.js

/**
 * Generates scenarios list for Strategy 2 (base scenarios only).
 * Reads baseScenarios directly from config.yaml — no mapping file needed.
 *
 * @param {Object} config - The configuration object from config.yaml
 * @returns {Array} - Array of base scenario objects
 */
export async function generateScenarios(config) {
  const baseScenarios = config?.parameters?.baseScenarios;

  if (!baseScenarios || !Array.isArray(baseScenarios)) {
    throw new Error('Invalid config: missing parameters.baseScenarios list');
  }

  const scenarios = baseScenarios.map(s => ({
    id: s.id,
    scenario_id: s.id,
    name: s.label,
    default: !!s.default,
    description: `Base scenario: ${s.label}`
  }));

  // Sort so default is first
  scenarios.sort((a, b) => {
    if (a.default) return -1;
    if (b.default) return 1;
    return a.name.localeCompare(b.name);
  });

  console.log(`Generated ${scenarios.length} base scenarios (Strategy 2)`);
  return scenarios;
}
