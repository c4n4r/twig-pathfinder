// src/config/schema.ts
// JSON schema for VS Code settings

import { ExtensionConfig } from '../types/config';

export const configSchema: Record<keyof ExtensionConfig, any> = {
  indexing: {
    type: 'object',
    properties: {
      enabled: {
        type: 'boolean',
        default: true,
        description: 'Enable workspace indexing for faster resolution',
      },
      eagerIndexTwig: {
        type: 'boolean',
        default: true,
        description: 'Eagerly index Twig templates on startup',
      },
      indexRoutes: {
        type: 'boolean',
        default: true,
        description: 'Index Symfony routes for faster resolution',
      },
      indexControllers: {
        type: 'boolean',
        default: true,
        description: 'Index Symfony controllers for PHP → Twig navigation',
      },
    },
  },
  twig: {
    type: 'object',
    properties: {
      templateDirectories: {
        type: 'array',
        items: { type: 'string' },
        default: ['templates', ''],
        description: 'Directories to search for Twig templates, in order of priority',
      },
      fileExtensions: {
        type: 'array',
        items: { type: 'string' },
        default: ['.twig'],
        description: 'File extensions to recognize as Twig templates',
      },
      searchLimit: {
        type: 'number',
        default: 5000,
        description: 'Maximum number of files to search when resolving templates that aren\'t in the index',
      },
    },
  },
  symfony: {
    type: 'object',
    properties: {
      routeFilePatterns: {
        type: 'array',
        items: { type: 'string' },
        default: [
          '**/config/routes/**/*.{yaml,yml}',
          '**/config/routing/**/*.{yaml,yml}',
        ],
        description: 'Glob patterns for Symfony route YAML files',
      },
      phpFilePatterns: {
        type: 'array',
        items: { type: 'string' },
        default: ['**/*.php'],
        description: 'Glob patterns for PHP files to search for route definitions',
      },
      controllerPatterns: {
        type: 'array',
        items: { type: 'string' },
        default: [
          '**/src/Controller/**/*.php',
          '**/src/Controller/*.php',
        ],
        description: 'Glob patterns for Symfony controller files',
      },
    },
  },
  cache: {
    type: 'object',
    properties: {
      enabled: {
        type: 'boolean',
        default: true,
        description: 'Master switch for all caching',
      },
      ttl: {
        type: 'object',
        properties: {
          fileExists: {
            type: 'number',
            default: 300000,
            description: 'Time-to-live for file existence cache in milliseconds',
          },
          fileContent: {
            type: 'number',
            default: 300000,
            description: 'Time-to-live for file content cache in milliseconds',
          },
          resolution: {
            type: 'number',
            default: 600000,
            description: 'Time-to-live for resolution cache in milliseconds',
          },
        },
      },
      maxSize: {
        type: 'number',
        default: 1000,
        description: 'Maximum number of entries in each cache',
      },
    },
  },
  watch: {
    type: 'object',
    properties: {
      enabled: {
        type: 'boolean',
        default: true,
        description: 'Whether to watch for file changes and update indexes automatically',
      },
      debounceMs: {
        type: 'number',
        default: 500,
        description: 'Debounce time in milliseconds for file change events',
      },
      excludePatterns: {
        type: 'array',
        items: { type: 'string' },
        default: ['**/{node_modules,vendor}/**'],
        description: 'Glob patterns for files/directories to exclude from watching',
      },
    },
  },
  performance: {
    type: 'object',
    properties: {
      parallelResolution: {
        type: 'boolean',
        default: true,
        description: 'Whether to perform parallel resolution when multiple resolvers might handle a request',
      },
      maxParallelOperations: {
        type: 'number',
        default: 5,
        description: 'Maximum number of parallel operations',
      },
    },
  },
};

export function getPackageJsonConfigSchema(): any {
  return {
    type: 'object',
    title: 'Twig Open Include',
    properties: configSchema,
  };
}
