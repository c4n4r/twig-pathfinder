// src/config/manager.ts
// Configuration manager that reads from VS Code settings

import * as vscode from "vscode";
import { ExtensionConfig } from "../types/config";
import { defaultConfig } from "./defaults";

export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.config = vscode.workspace.getConfiguration("twigPathfinder");
  }

  getConfiguration(): ExtensionConfig {
    return {
      indexing: {
        enabled: this.config.get<boolean>(
          "indexing.enabled",
          defaultConfig.indexing.enabled,
        ),
        eagerIndexTwig: this.config.get<boolean>(
          "indexing.eagerIndexTwig",
          defaultConfig.indexing.eagerIndexTwig,
        ),
        indexRoutes: this.config.get<boolean>(
          "indexing.indexRoutes",
          defaultConfig.indexing.indexRoutes,
        ),
        indexControllers: this.config.get<boolean>(
          "indexing.indexControllers",
          defaultConfig.indexing.indexControllers,
        ),
      },
      twig: {
        templateDirectories: this.config.get<string[]>(
          "twig.templateDirectories",
          defaultConfig.twig.templateDirectories,
        ),
        fileExtensions: this.config.get<string[]>(
          "twig.fileExtensions",
          defaultConfig.twig.fileExtensions,
        ),
        searchLimit: this.config.get<number>(
          "twig.searchLimit",
          defaultConfig.twig.searchLimit,
        ),
      },
      symfony: {
        routeFilePatterns: this.config.get<string[]>(
          "symfony.routeFilePatterns",
          defaultConfig.symfony.routeFilePatterns,
        ),
        phpFilePatterns: this.config.get<string[]>(
          "symfony.phpFilePatterns",
          defaultConfig.symfony.phpFilePatterns,
        ),
        controllerPatterns: this.config.get<string[]>(
          "symfony.controllerPatterns",
          defaultConfig.symfony.controllerPatterns,
        ),
      },
      cache: {
        enabled: this.config.get<boolean>(
          "cache.enabled",
          defaultConfig.cache.enabled,
        ),
        ttl: {
          fileExists: this.config.get<number>(
            "cache.ttl.fileExists",
            defaultConfig.cache.ttl.fileExists,
          ),
          fileContent: this.config.get<number>(
            "cache.ttl.fileContent",
            defaultConfig.cache.ttl.fileContent,
          ),
          resolution: this.config.get<number>(
            "cache.ttl.resolution",
            defaultConfig.cache.ttl.resolution,
          ),
        },
        maxSize: this.config.get<number>(
          "cache.maxSize",
          defaultConfig.cache.maxSize,
        ),
      },
      watch: {
        enabled: this.config.get<boolean>(
          "watch.enabled",
          defaultConfig.watch.enabled,
        ),
        debounceMs: this.config.get<number>(
          "watch.debounceMs",
          defaultConfig.watch.debounceMs,
        ),
        excludePatterns: this.config.get<string[]>(
          "watch.excludePatterns",
          defaultConfig.watch.excludePatterns,
        ),
      },
      performance: {
        parallelResolution: this.config.get<boolean>(
          "performance.parallelResolution",
          defaultConfig.performance.parallelResolution,
        ),
        maxParallelOperations: this.config.get<number>(
          "performance.maxParallelOperations",
          defaultConfig.performance.maxParallelOperations,
        ),
      },
    };
  }

  onConfigurationChanged(callback: () => void): vscode.Disposable {
    const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("twigPathfinder")) {
        this.config = vscode.workspace.getConfiguration("twigPathfinder");
        callback();
      }
    });
    this.disposables.push(disposable);
    return disposable;
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
