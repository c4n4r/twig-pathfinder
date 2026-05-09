// src/config/defaults.ts
// Default configuration values

import { ExtensionConfig } from '../types/config';

export const defaultConfig: ExtensionConfig = {
  indexing: {
    enabled: true,
    eagerIndexTwig: true,
    indexRoutes: true,
    indexControllers: true,
  },
  twig: {
    templateDirectories: ['templates', ''],
    fileExtensions: ['.twig'],
    searchLimit: 5000,
  },
  symfony: {
    routeFilePatterns: [
      '**/config/routes/**/*.{yaml,yml}',
      '**/config/routing/**/*.{yaml,yml}',
    ],
    phpFilePatterns: ['**/*.php'],
    controllerPatterns: [
      '**/src/Controller/**/*.php',
      '**/src/Controller/*.php',
    ],
  },
  cache: {
    enabled: true,
    ttl: {
      fileExists: 300000, // 5 minutes
      fileContent: 300000, // 5 minutes
      resolution: 600000, // 10 minutes
    },
    maxSize: 1000,
  },
  watch: {
    enabled: true,
    debounceMs: 500,
    excludePatterns: ['**/{node_modules,vendor}/**'],
  },
  performance: {
    parallelResolution: true,
    maxParallelOperations: 5,
  },
};
