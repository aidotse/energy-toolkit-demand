import fs from 'fs';

export async function loadGeoJSON(filePath, idField='geo_id', nameField='geo_name', typeField='geo_type') {
  const raw = fs.readFileSync(filePath, 'utf8');
  const gj = JSON.parse(raw);
  const features = (gj.features || []).map(feat => {
    const p = feat.properties || {};
    return {
      id: p[idField]!=null?String(p[idField]):null,
      name: nameField!=='none'?p[nameField]:null,
      type: typeField!=='none'?p[typeField]:null
    };
  }).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);

  return { file: filePath, geographies: features };
}