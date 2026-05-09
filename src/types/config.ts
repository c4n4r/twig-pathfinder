// src/types/config.ts
// Configuration type definitions

export interface ExtensionConfig {
  indexing: {
    enabled: boolean;
    eagerIndexTwig: boolean;
    indexRoutes: boolean;
    indexControllers: boolean;
  };
  twig: {
    templateDirectories: string[];
    fileExtensions: string[];
    searchLimit: number;
  };
  symfony: {
    routeFilePatterns: string[];
    phpFilePatterns: string[];
    controllerPatterns: string[];
  };
  cache: {
    enabled: boolean;
    ttl: {
      fileExists: number;
      fileContent: number;
      resolution: number;
    };
    maxSize: number;
  };
  watch: {
    enabled: boolean;
    debounceMs: number;
    excludePatterns: string[];
  };
  performance: {
    parallelResolution: boolean;
    maxParallelOperations: number;
  };
}
