import { input, checkbox, select, confirm } from '@inquirer/prompts';

export async function askProjectComponents() {
  const components = await checkbox({
    message: 'Which components will you be using?',
    choices: [
      { name: 'Generator', value: 'useGenerator', checked: false },
      { name: 'API', value: 'useAPI', checked: false },
      { name: 'Explorer', value: 'useExplorer', checked: false }
    ],
    validate: selected => selected.length > 0 || 'At least one component must be selected.'
  });

  // Convert the array of selected components to the expected object format
  const answers = {
    useGenerator: components.includes('useGenerator'),
    useAPI: components.includes('useAPI'),
    useExplorer: components.includes('useExplorer')
  };

  return answers;
}

export async function askProjectConfig() {
  const name = await input({ message: 'Project name', validate: v => !!v || 'Required' });
  const version = await input({ message: 'Version', default: '0.1.0' });
  const access = await input({ message: 'Access (public/private)', default: 'public' });
  
  return { name, version, access };
}

export async function askTimeSpan() {
  const start = await input({ message: 'Start datetime (ISO)', default: '2025-01-01T00:00:00Z' });
  const end = await input({ message: 'End datetime (ISO)', default: '2044-12-31T23:00:00Z' });
  const baseResolution = await input({ message: 'Base resolution (e.g. 1h,1d,1M,1Y)', default: '1h' });
  const baseAggregation = await input({ message: 'Base aggregation (mean,sum,min,max)', default: 'mean' });
  
  return { start, end, baseResolution, baseAggregation };
}

export async function askGeoJSONConfig() {
  const filePath = await input({ message: 'GeoJSON file path', default: 'geographies/regions.geojson', validate: v=>!!v || 'Required' });
  const idField = await input({ message: "Feature ID property name (e.g. 'id' or 'geo_id')", default: 'geo_id' });
  const nameField = await input({ message: "Feature name property name (e.g. 'name' or 'geo_name')", default: 'geo_name' });
  const typeField = await input({ message: "Feature type property name (e.g. 'type' or 'geo_type')", default: 'geo_type' });
  
  return { filePath, idField, nameField, typeField };
}

export async function askSegmentation() {
  const level1Desc = await input({ message: 'Description for top-level segments', default: 'Primary segments' });
  const topSegmentsRaw = await input({
    message: 'Top-level segments (comma separated)'
  });
  const topSegments = topSegmentsRaw.split(',').map(s => s.trim()).filter(Boolean);

  const level1 = [];
  for (const name of topSegments) {
    const label = await input({ message: `Label for segment '${name}'`, default: name });
    level1.push({ name, label });
  }

  const submode = await select({
    message: 'Sub-level segmentation?',
    choices: [
      { name: 'None', value: 'none' },
      { name: 'Common', value: 'common' },
      { name: 'Per segment', value: 'per' }
    ],
    default: 'none'
  });

  let level2 = null;
  if (submode === 'common') {
    const level2Desc = await input({ message: 'Description for sub-level segments', default: 'Sub-segments (common)' });
    const subSegmentsRaw = await input({ message: 'Sub-level segments (comma separated)' });
    const subSegments = subSegmentsRaw.split(',').map(s => s.trim()).filter(Boolean);
    level2 = { description: level2Desc, values: subSegments.map(name => ({ name, label: name })) };
  } else if (submode === 'per') {
    const level2Desc = await input({ message: 'Description for sub-level segments', default: 'Sub-segments per top-level' });
    const per = {};
    for (const seg of level1) {
      const subsRaw = await input({ message: `Sub-segments for '${seg.name}' (comma separated)` });
      const subs = subsRaw.split(',').map(s => s.trim()).filter(Boolean);
      per[seg.name] = subs.map(name => ({ name, label: name }));
    }
    level2 = { description: level2Desc, values: per };
  }

  return { segments: { level1: { description: level1Desc, values: level1 }, level2 } };
}

export async function askScenarios() {
  const numScenariosStr = await input({ message: 'Number of scenarios to configure', default: '1' });
  const numScenarios = Number(numScenariosStr);
  const scenarios = [];
  for (let i = 0; i < numScenarios; i++) {
    const name = await input({ message: `Name for scenario ${i+1}`, validate: v=>!!v||'Required' });
    const description = await input({ message: 'Description' });
    const type = await select({
      message: 'Scenario type',
      choices: [
        { name: 'Index', value: 'index' },
        { name: 'Scalar', value: 'scalar' },
        { name: 'Boolean', value: 'boolean' }
      ],
      default: 'scalar'
    });

    let values = [];
    if (type === 'index') {
      const countStr = await input({ message: 'Number of index values', default: '2' });
      const count = Number(countStr);
      values = Array.from({ length: count }, (_,i) => i);
    } else if (type === 'scalar') {
      const numItemsStr = await input({ message: 'Number of scalar values', default: '2' });
      const numItems = Number(numItemsStr);
      for (let j = 0; j < numItems; j++) {
        const value = await input({ message: `Value for item ${j+1}`, validate: v=>!!v||'Required' });
        values.push(value);
      }
    } else if (type === 'boolean') {
      values = [true, false];
    }

    const defaultStr = await input({ message: 'Default value', default: values[0] });
    const defaultVal = type === 'boolean' ? (defaultStr === 'true' || defaultStr === true) : Number(defaultStr);

    const wantLabels = await confirm({ message: 'Provide custom labels?', default: false });
    const items = [];
    for (const v of values) {
      if (wantLabels) {
        const label = await input({ message: `Label for value '${v}'`, default: String(v) });
        items.push({ value: v, label });
      } else {
        items.push({ value: v, label: String(v) });
      }
    }

    scenarios.push({ name, type, items, default: defaultVal, description });
  }
  return { scenario:{ scenarios } };
}
