// api/scripts/endpoint-parameters.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import $RefParser from 'json-schema-ref-parser';

/**
 * Reads parameters.yaml and openapi.yaml, inlines $refs,
 * and emits a trimmed array of public parameter definitions.
 * Each entry has:
 *   - name: the parameter key or nested key
 *   - required: boolean
 *   - values: enum array
 *   - endpoints: [path, …]
 */
export async function generateParameters(paramsPath, openapiPath) {
  console.log(`Generating parameters from ${paramsPath} and ${openapiPath}`);
  
  // 1) Load & dereference parameters.yaml
  const rawParams = fs.readFileSync(paramsPath, 'utf8');
  const paramsDoc = yaml.load(rawParams);
  
  try {
    // Attempt to dereference the parameters document
    const fullParams = await $RefParser.dereference(paramsPath, paramsDoc);
    
    // 2) Load and parse openapi.yaml
    const rawApi = fs.readFileSync(openapiPath, 'utf8');
    const apiDoc = yaml.load(rawApi);

  // 3) Map each parameter key to the paths that reference it
  const paramUsage = {};
  for (const [route, methods] of Object.entries(apiDoc.paths || {})) {
    for (const op of Object.values(methods || {})) {
      (op.parameters || []).forEach(p => {
        const ref = p.$ref || `#/components/parameters/${p.name}`;
        const key = ref.split('/').pop();
        paramUsage[key] = paramUsage[key] || new Set();
        paramUsage[key].add(route);
      });
    }
  }

  const out = [];
  const paramsObj = fullParams.components?.parameters || {};

  const getEnum = arr => arr.map(v => v);

  for (const [paramKey, paramDef] of Object.entries(paramsObj)) {
    const { name: baseName, required: reqRoot = false, schema = {} } = paramDef;
    const endpoints = Array.from(paramUsage[paramKey] || []);

    // top-level scalar enum?
    if (Array.isArray(schema.enum)) {
      out.push({
        name: baseName,
        required: reqRoot,
        values: getEnum(schema.enum),
        endpoints
      });
      continue;
    }

    // recurse nested properties
    function traverse(props, requiredList = [], path = []) {
      for (const [key, sub] of Object.entries(props)) {
        const fullPath = [...path, key];
        const propName = `${baseName}.${fullPath.join('.')}`;
        const isReq = reqRoot && requiredList.includes(key);
        
        // collect any enum values
        let values = [];
        if (Array.isArray(sub.enum)) {
          values = getEnum(sub.enum);
        } else if (Array.isArray(sub.oneOf)) {
          sub.oneOf.forEach(branch => {
            if (Array.isArray(branch.enum)) {
              values.push(...getEnum(branch.enum));
            } else if (branch.$ref) {
              // Handle $ref in oneOf - this is where references to parameters-geography.yaml, etc. are
              try {
                // Extract the file path and reference path from the $ref
                const refParts = branch.$ref.split('#/');
                if (refParts.length === 2) {
                  const refFile = refParts[0];
                  const refPath = refParts[1].split('/');
                  
                  if (refFile) {
                    // Resolve the file path relative to the parameters.yaml file
                    const refFilePath = path.resolve(path.dirname(paramsPath), refFile);
                    if (fs.existsSync(refFilePath)) {
                      // Load the referenced file
                      const refContent = yaml.load(fs.readFileSync(refFilePath, 'utf8'));
                      
                      // Navigate to the referenced property
                      let current = refContent;
                      for (const segment of refPath) {
                        if (current && current[segment]) {
                          current = current[segment];
                        } else {
                          current = null;
                          break;
                        }
                      }
                      
                      // If we found an array, add its values
                      if (Array.isArray(current)) {
                        values.push(...current);
                      }
                    }
                  }
                }
              } catch (err) {
                console.error(`Error resolving reference ${branch.$ref}: ${err.message}`);
              }
            }
          });
        }

        const isLeaf = !sub.properties;
        // emit all leaves, even if values===[]
        if (isLeaf) {
          out.push({
            name: propName,
            required: isReq,
            values,
            endpoints
          });
        }

        // dive deeper
        if (sub.properties) {
          traverse(
            sub.properties,
            Array.isArray(sub.required) ? sub.required : [],
            fullPath
          );
        }
      }
    }

    if (schema.properties) {
      traverse(schema.properties, Array.isArray(schema.required) ? schema.required : [], []);
    }
  }

    return out;
  } catch (err) {
    console.error(`Error in generateParameters: ${err.message}`);
    console.error(err.stack);
    throw err;
  }
}
