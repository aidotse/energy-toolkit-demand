#!/usr/bin/env node

/**
 * @fileoverview Generate interactive OpenAPI documentation using Swagger UI.
 *
 * This script creates a standalone HTML page with Swagger UI that renders
 * the OpenAPI specification. The generated documentation is interactive
 * and allows users to try out the API endpoints directly from the browser.
 *
 * @module scripts/generate-openapi-docs
 * @version 0.0.1
 * @author Demand Toolkit Team
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate interactive OpenAPI documentation with Swagger UI.
 *
 * Creates a standalone HTML file that includes Swagger UI and the OpenAPI
 * specification. The documentation is fully interactive and allows users
 * to test API endpoints directly from the browser.
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Generate documentation
 * await generateOpenAPIDocumentation();
 * // Open docs/openapi/index.html in browser
 *
 * @since 0.0.1
 */
async function generateOpenAPIDocumentation() {
  const docsDir = path.join(__dirname, '..', 'docs', 'openapi');
  const openApiPath = path.join(__dirname, '..', 'openapi.yaml');

  // Create docs directory
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Read OpenAPI spec
  const openApiSpec = fs.readFileSync(openApiPath, 'utf8');

  // Generate HTML with embedded Swagger UI
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Demand Toolkit API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.29.0/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
        .swagger-ui .topbar {
            background-color: #2c3e50;
        }
        .swagger-ui .topbar .topbar-wrapper .link {
            content: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8dGV4dCB4PSI2MCIgeT0iMjQiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkRlbWFuZCBUb29sa2l0IEFQSTY8L3RleHQ+Cjwvc3ZnPgo=');
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>

    <script src="https://unpkg.com/swagger-ui-dist@5.29.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.29.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const spec = \`${openApiSpec}\`;

            // Parse the YAML spec
            const ui = SwaggerUIBundle({
                spec: jsyaml.load(spec),
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1,
                docExpansion: 'list',
                filter: true,
                showRequestHeaders: true,
                showCommonExtensions: true,
                tryItOutEnabled: true
            });
        };
    </script>
    <script src="https://unpkg.com/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
</body>
</html>
`;

  // Write the HTML file
  const outputPath = path.join(docsDir, 'index.html');
  fs.writeFileSync(outputPath, html);

  console.log('✅ OpenAPI documentation generated successfully!');
  console.log(`📖 Documentation available at: ${outputPath}`);
  console.log(`🌐 Open in browser: file://${outputPath}`);
  console.log('🚀 Or run: npm run docs:serve-openapi');
}

/**
 * Main execution function when script is run directly.
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  generateOpenAPIDocumentation().catch(err => {
    console.error('❌ Error generating OpenAPI documentation:');
    console.error(err.message);
    process.exit(1);
  });
}