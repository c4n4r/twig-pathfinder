// src/types/config.test.ts
// Tests for configuration types

import { describe, it, expect } from 'vitest';
import { defaultConfig } from '../config/defaults';
import { ExtensionConfig } from './config';

describe('Configuration Types', () => {
  describe('defaultConfig', () => {
    it('should have all required properties', () => {
      expect(defaultConfig).toHaveProperty('indexing');
      expect(defaultConfig).toHaveProperty('twig');
      expect(defaultConfig).toHaveProperty('symfony');
      expect(defaultConfig).toHaveProperty('cache');
      expect(defaultConfig).toHaveProperty('watch');
      expect(defaultConfig).toHaveProperty('performance');
    });

    it('should have correct default values for indexing', () => {
      expect(defaultConfig.indexing.enabled).toBe(true);
      expect(defaultConfig.indexing.eagerIndexTwig).toBe(true);
      expect(defaultConfig.indexing.indexRoutes).toBe(true);
      expect(defaultConfig.indexing.indexControllers).toBe(true);
    });

    it('should have correct default values for twig', () => {
      expect(defaultConfig.twig.templateDirectories).toEqual(['templates', '']);
      expect(defaultConfig.twig.fileExtensions).toEqual(['.twig']);
      expect(defaultConfig.twig.searchLimit).toBe(5000);
    });

    it('should have correct default values for cache', () => {
      expect(defaultConfig.cache.enabled).toBe(true);
      expect(defaultConfig.cache.ttl.fileExists).toBe(300000);
      expect(defaultConfig.cache.ttl.fileContent).toBe(300000);
      expect(defaultConfig.cache.ttl.resolution).toBe(600000);
      expect(defaultConfig.cache.maxSize).toBe(1000);
    });

    it('should have correct default values for watch', () => {
      expect(defaultConfig.watch.enabled).toBe(true);
      expect(defaultConfig.watch.debounceMs).toBe(500);
      expect(defaultConfig.watch.excludePatterns).toEqual(['**/{node_modules,vendor}/**']);
    });

    it('should have correct default values for performance', () => {
      expect(defaultConfig.performance.parallelResolution).toBe(true);
      expect(defaultConfig.performance.maxParallelOperations).toBe(5);
    });
  });

  describe('ExtensionConfig type', () => {
    it('should be assignable from defaultConfig', () => {
      const config: ExtensionConfig = defaultConfig;
      expect(config).toBeDefined();
    });
  });
});
