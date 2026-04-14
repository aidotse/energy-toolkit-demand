import { describe, test, expect } from 'vitest';
import { staging } from '../../config.js';

describe('config.js', () => {
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

    test('should have valid AWS ARN format for service_role', () => {
      expect(staging.service_role).toMatch(/^arn:aws:iam::\d+:role\/[\w-]+$/);
    });

    test('should follow consistent naming pattern', () => {
      expect(staging.api_name).toContain('behovskartan-api');
      expect(staging.bucket_name).toContain('behovskartan-data');
    });
  });
});
