import fs from 'fs';
import yaml from 'js-yaml';
import merge from 'lodash';

export function mergeAndSave(filePath, newCfg) {
  let existing = {};
  if (fs.existsSync(filePath)) {
    existing = yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
  }
  const merged = merge({}, existing, newCfg);
  fs.writeFileSync(filePath, yaml.dump(merged, { sortKeys: false, lineWidth: -1 }), 'utf8');
}
