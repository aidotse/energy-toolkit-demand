export async function generatePartition(cfg, useScenarioId = true, rowGroupSize = 100_000) {
  // always include these baseline keys
  const partitionKeys = [
    { path: 'period.start', transform: 'year' },
    { path: 'dimensions.geography' }
  ];

  // optional: partition on scenario._id (always useful for full scenario pruning)
  if (useScenarioId) {
    partitionKeys.push({ path: 'scenario._id' });
  } else {
    // alternatively: include a few individual scenario keys
    const candidates = [];

    for (const s of cfg.scenario?.scenarios || []) {
      const n = s.items?.length || 0;
      if (n <= 3) {
        candidates.push({ name: s.name, score: 2 });
      } else if (n <= 20) {
        candidates.push({ name: s.name, score: 1 });
      }
    }

    // sort by score desc, then name
    candidates.sort((a, b) =>
      b.score - a.score || a.name.localeCompare(b.name)
    );

    // take top 2 keys
    candidates.slice(0, 2).forEach(c => {
      partitionKeys.push({ path: `scenario.${c.name}` });
    });
  }

  return { partitionKeys, rowGroupSize: rowGroupSize };
}
