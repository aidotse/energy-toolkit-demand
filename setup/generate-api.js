// generate-api.js

import { buildStaticEndpoints } from '../api/scripts/generate-endpoints.js';

export async function generateAPISupport() {
  console.log('Generating API static endpoints...');
  try {
    await buildStaticEndpoints();
    console.log('✅ API support files generated successfully.');
  } catch (error) {
    console.error('❌ Error generating API support files:', error);
  }
}
