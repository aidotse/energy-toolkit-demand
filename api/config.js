/**
 * @fileoverview Configuration settings for different deployment environments.
 *
 * This module provides environment-specific configuration objects for deploying
 * the Demand Toolkit API to different AWS environments (dev, staging, prod).
 * Each configuration includes API Gateway settings, S3 bucket information,
 * and IAM role specifications.
 *
 * @module config
 * @version 0.0.1
 * @author Demand Toolkit Team
 */

/**
 * Configuration object for a deployment environment.
 *
 * @typedef {Object} EnvironmentConfig
 * @property {string} api_name - Name of the API Gateway deployment
 * @property {string} stage_name - Stage name for deployment (dev, staging, prod)
 * @property {string} region - AWS region where resources are deployed
 * @property {string} bucket_name - S3 bucket name for storing generated data files
 * @property {string} service_role - ARN of the IAM service role for API execution
 */

/**
 * Staging environment configuration
 * @type {EnvironmentConfig}
 */
export const staging = {
    api_name: "behovskartan-api-staging",
    stage_name: "staging",
    region: "eu-central-1",
    bucket_name: "behovskartan-data-staging",
    service_role: "arn:aws:iam::600627346413:role/behovskartan-api-role"
};