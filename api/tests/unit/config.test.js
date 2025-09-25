import { describe, test, expect } from 'vitest';
import { dev, staging } from '../../config.js';

describe('config.js', () => {
  describe('dev configuration', () => {
    test('should have all required properties', () => {
      expect(dev).toBeDefined();
      expect(dev).toHaveProperty('api_name');
      expect(dev).toHaveProperty('stage_name');
      expect(dev).toHaveProperty('region');
      expect(dev).toHaveProperty('bucket_name');
      expect(dev).toHaveProperty('service_role');
    });

    test('should have correct values for dev environment', () => {
      expect(dev.api_name).toBe('behovskartan-api-dev');
      expect(dev.stage_name).toBe('dev');
      expect(dev.region).toBe('eu-central-1');
      expect(dev.bucket_name).toBe('behovskartan-data-dev');
      expect(dev.service_role).toContain('arn:aws:iam::');
    });

    test('should have valid AWS ARN format for service_role', () => {
      expect(dev.service_role).toMatch(/^arn:aws:iam::\d+:role\/[\w-]+$/);
    });
  });

  describe('staging configuration', () => {
    test('should have all required properties', () => {
      expect(staging).toBeDefined();
      expect(staging).toHaveProperty('api_name');
      expect(staging).toHaveProperty('stage_name');
      expect(staging).toHaveProperty('region');
      expect(staging).toHaveProperty('bucket_name');
      expect(staging).toHaveProperty('service_role');
    });

    test('should have correct values for staging environment', () => {
      expect(staging.api_name).toBe('behovskartan-api-staging');
      expect(staging.stage_name).toBe('staging');
      expect(staging.region).toBe('eu-central-1');
      expect(staging.bucket_name).toBe('behovskartan-data-staging');
      expect(staging.service_role).toContain('arn:aws:iam::');
    });

    test('should use same region as dev', () => {
      expect(staging.region).toBe(dev.region);
    });

    test('should use same service role as dev', () => {
      expect(staging.service_role).toBe(dev.service_role);
    });
  });

  describe('environment consistency', () => {
    test('should have different API names', () => {
      expect(dev.api_name).not.toBe(staging.api_name);
    });

    test('should have different stage names', () => {
      expect(dev.stage_name).not.toBe(staging.stage_name);
    });

    test('should have different bucket names', () => {
      expect(dev.bucket_name).not.toBe(staging.bucket_name);
    });

    test('should follow consistent naming pattern', () => {
      expect(dev.api_name).toContain('behovskartan-api');
      expect(staging.api_name).toContain('behovskartan-api');
      expect(dev.bucket_name).toContain('behovskartan-data');
      expect(staging.bucket_name).toContain('behovskartan-data');
    });
  });
});