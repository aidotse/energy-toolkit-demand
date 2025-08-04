import fs from 'fs';
import path from 'path';
import routes from './routes.js';
import * as configs from './config.js';

const env = process.argv[2] || 'development';
const config = configs[env];

if (!config) {
  throw new Error(`❌ No config found for environment: ${env}`);
}

const {
  api_name,
  stage_name,
  region,
  bucket_name,
  service_role
} = config;

function paramMap(params) {
  return params.map(p => `"method.request.querystring.${p}" = true`).join('\n    ');
}


function integrationParamMap(params) {
  return params.map(p =>
    `"integration.request.path.${p}" = "method.request.querystring.${p}"`
  ).join('\n    ');
}

function responseHeaders() {
  return `
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Content-Disposition"          = true
    "method.response.header.Content-Encoding"             = true
    "method.response.header.Content-Type"                 = true
  `;
}

function integrationResponseHeaders(route) {
  return [
    `"method.response.header.Access-Control-Allow-Origin" = "'*'"`,
    `"method.response.header.Content-Disposition" = "'inline'"`,
    route.contentType && `"method.response.header.Content-Type" = "'${route.contentType}'"`,
    route.encoding && `"method.response.header.Content-Encoding" = "'${route.encoding}'"`

  ].filter(Boolean).join('\n    ');
}

function tfName(str) {
  return str.replace(/[^\w]/g, '_');
}

let blocks = `
resource "aws_api_gateway_rest_api" "demand_api" {
  name        = "${api_name}"
  description = "Auto-generated from routes.js"
  binary_media_types = ["text/csv"]
}
`;

routes.forEach(route => {
  const resourceName = tfName(route.path);
  const paramList = route.requiredParams || [];
  const s3Path = `${bucket_name}/${route.filePattern(Object.fromEntries(paramList.map(p => [p, `{${p}}`])))}`
  
  blocks += `

resource "aws_api_gateway_resource" "${resourceName}" {
  rest_api_id = aws_api_gateway_rest_api.demand_api.id
  parent_id   = aws_api_gateway_rest_api.demand_api.root_resource_id
  path_part   = "${route.path.replace(/^\/+/, '')}"
}

resource "aws_api_gateway_method" "get_${resourceName}" {
  rest_api_id   = aws_api_gateway_rest_api.demand_api.id
  resource_id   = aws_api_gateway_resource.${resourceName}.id
  http_method   = "${route.method}"
  authorization = "NONE"
  request_parameters = {
    ${paramMap(paramList)}
  }
}

resource "aws_api_gateway_integration" "get_${resourceName}" {
  rest_api_id             = aws_api_gateway_rest_api.demand_api.id
  resource_id             = aws_api_gateway_resource.${resourceName}.id
  http_method             = aws_api_gateway_method.get_${resourceName}.http_method
  integration_http_method = "GET"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:${region}:s3:path/${s3Path}"
  credentials             = "${service_role}"

  request_parameters = {
    ${integrationParamMap(paramList)}
  }

  passthrough_behavior = "WHEN_NO_TEMPLATES"
}

resource "aws_api_gateway_method_response" "get_${resourceName}" {
  rest_api_id = aws_api_gateway_rest_api.demand_api.id
  resource_id = aws_api_gateway_resource.${resourceName}.id
  http_method = aws_api_gateway_method.get_${resourceName}.http_method
  status_code = "200"

  response_parameters = {
    ${responseHeaders()}
  }
}

resource "aws_api_gateway_integration_response" "get_${resourceName}" {
  rest_api_id = aws_api_gateway_rest_api.demand_api.id
  resource_id = aws_api_gateway_resource.${resourceName}.id
  http_method = aws_api_gateway_method.get_${resourceName}.http_method
  status_code = aws_api_gateway_method_response.get_${resourceName}.status_code

  response_parameters = {
    ${integrationResponseHeaders(route)}
  }

  selection_pattern = ""
  depends_on = [aws_api_gateway_integration.get_${resourceName}]
}

# OPTIONS method for CORS
resource "aws_api_gateway_method" "options_${resourceName}" {
  rest_api_id   = aws_api_gateway_rest_api.demand_api.id
  resource_id   = aws_api_gateway_resource.${resourceName}.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_${resourceName}" {
  rest_api_id          = aws_api_gateway_rest_api.demand_api.id
  resource_id          = aws_api_gateway_resource.${resourceName}.id
  http_method          = "OPTIONS"
  type                 = "MOCK"
  passthrough_behavior = "WHEN_NO_TEMPLATES"

  request_templates = {
    "application/json" = "{\\\"statusCode\\\": 200}"
  }

  depends_on = [aws_api_gateway_method.options_${resourceName}]
}

resource "aws_api_gateway_method_response" "options_${resourceName}" {
  rest_api_id = aws_api_gateway_rest_api.demand_api.id
  resource_id = aws_api_gateway_resource.${resourceName}.id
  http_method = "OPTIONS"
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_${resourceName}" {
  rest_api_id = aws_api_gateway_rest_api.demand_api.id
  resource_id = aws_api_gateway_resource.${resourceName}.id
  http_method = aws_api_gateway_method.options_${resourceName}.http_method
  status_code = aws_api_gateway_method_response.options_${resourceName}.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.options_${resourceName},
    aws_api_gateway_method_response.options_${resourceName}
  ]
}
`;
});

blocks += `

resource "aws_api_gateway_deployment" "deploy" {
  depends_on = [
    ${routes.map(r => `aws_api_gateway_integration.get_${tfName(r.path)}`).join(',\n    ')}
  ]

  triggers = {
    redeploy = sha1(join("", [
      ${routes.map(r => `aws_api_gateway_integration.get_${tfName(r.path)}.id`).join(',\n      ')}
    ]))
  }

  rest_api_id = aws_api_gateway_rest_api.demand_api.id
}

resource "aws_api_gateway_stage" "stage" {
  rest_api_id   = aws_api_gateway_rest_api.demand_api.id
  deployment_id = aws_api_gateway_deployment.deploy.id
  stage_name    = "${stage_name}"
}
`;

const outputPath = path.join(
  path.resolve(`../terraform/environments/${env}`),
  'generated_api_gateway.tf'
);

fs.writeFileSync(outputPath, blocks);
console.log(`✅ Terraform config written to ${outputPath}`);
