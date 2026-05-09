// src/indexer/workspace-indexer.test.ts
// Unit tests for WorkspaceIndexer

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import * as path from 'path';
import { WorkspaceIndexer } from './workspace-indexer';
import { ExtensionConfig } from '../types/config';
import { CachedFileSystem } from '../filesystem/cached-file-system';

// Mock VS Code API
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    findFiles: vi.fn(),
  },
  Uri: {
    file: (p: string) => ({
      toString: () => p,
      fsPath: p,
      scheme: 'file',
    }),
    parse: (uri: string) => ({ toString: () => uri, fsPath: uri }),
  },
  Location: class {
    constructor(public uri: any, public range: any) {}
  },
  Position: class {
    constructor(public line: number, public character: number) {}
  },
  Range: class {
    constructor(public startLine: number, public startCharacter: number, public endLine: number, public endCharacter: number) {}
  },
}));

const mockConfig: ExtensionConfig = {
  indexing: {
    enabled: true,
    eagerIndexTwig: true,
    indexRoutes: true,
    indexControllers: true,
  },
  twig: {
    templateDirectories: ['templates'],
    fileExtensions: ['.twig'],
    searchLimit: 5000,
  },
  symfony: {
    routeFilePatterns: ['**/config/routes/**/*.{yaml,yml}'],
    phpFilePatterns: ['**/*.php'],
    controllerPatterns: ['**/src/Controller/**/*.php'],
  },
  cache: {
    enabled: true,
    ttl: {
      fileExists: 300000,
      fileContent: 300000,
      resolution: 600000,
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

const mockFileSystem = {
  findFiles: vi.fn(),
  readFile: vi.fn(),
  fileExists: vi.fn(),
  stat: vi.fn(),
} as any as CachedFileSystem;

describe('WorkspaceIndexer', () => {
  let indexer: WorkspaceIndexer;

  beforeEach(() => {
    indexer = new WorkspaceIndexer(mockFileSystem, mockConfig);
    vi.clearAllMocks();
  });

  describe('indexTwigFile', () => {
    it('should index Twig files with multiple keys', async () => {
      const testUri = vscode.Uri.file('/test/workspace/templates/test.twig');
      
      await (indexer as any).indexTwigFile(testUri);
      
      // Should be indexed by relative path
      expect(indexer['twigIndex'].has('templates/test.twig')).toBe(true);
      
      // Should be indexed without templates prefix
      expect(indexer['twigIndex'].has('test.twig')).toBe(true);
      
      // Should be indexed by basename
      expect(indexer['twigIndex'].has('test.twig')).toBe(true);
    });
  });

  describe('findTwigTemplate', () => {
    it('should find templates by exact path', async () => {
      const testUri = vscode.Uri.file('/test/workspace/templates/test.twig');
      await (indexer as any).indexTwigFile(testUri);
      
      const result = await indexer.findTwigTemplate('templates/test.twig');
      expect(result?.fsPath).toBe('/test/workspace/templates/test.twig');
    });

    it('should find templates by basename', async () => {
      const testUri = vscode.Uri.file('/test/workspace/templates/test.twig');
      await (indexer as any).indexTwigFile(testUri);
      
      const result = await indexer.findTwigTemplate('test.twig');
      expect(result?.fsPath).toBe('/test/workspace/templates/test.twig');
    });

    it('should return null for non-existent templates', async () => {
      const result = await indexer.findTwigTemplate('nonexistent.twig');
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all indexes', async () => {
      const testUri = vscode.Uri.file('/test/workspace/templates/test.twig');
      await (indexer as any).indexTwigFile(testUri);
      
      expect(indexer.getTwigIndexSize()).toBeGreaterThan(0);
      
      indexer.clear();
      
      expect(indexer.getTwigIndexSize()).toBe(0);
      expect(indexer.getRouteIndexSize()).toBe(0);
      expect(indexer.getControllerIndexSize()).toBe(0);
    });
  });

  describe('remove', () => {
    it('should remove entries for a specific URI', async () => {
      const testUri = vscode.Uri.file('/test/workspace/templates/test.twig');
      await (indexer as any).indexTwigFile(testUri);
      
      expect(indexer.getTwigIndexSize()).toBeGreaterThan(0);
      
      indexer.remove(testUri);
      
      expect(indexer.getTwigIndexSize()).toBe(0);
    });
  });

  describe('indexFile', () => {
    it('should index Twig files', async () => {
      const testUri = vscode.Uri.file('/test/workspace/templates/test.twig');
      (mockFileSystem.readFile as any) = vi.fn().mockResolvedValue('');
      
      await indexer.indexFile(testUri);
      
      expect(indexer.getTwigIndexSize()).toBeGreaterThan(0);
    });

    it('should index PHP files', async () => {
      const testUri = vscode.Uri.file('/test/workspace/src/Controller/TestController.php');
      
      // Mock readFile to return PHP controller content
      (mockFileSystem.readFile as any) = vi.fn().mockResolvedValue(`
namespace App\\Controller;
class TestController {
  public function index() {}
}`);
      
      // Mock findFiles to return empty array for controller search
      (mockFileSystem.findFiles as any) = vi.fn().mockResolvedValue([]);
      
      await indexer.indexFile(testUri);
      
      // Should have indexed the controller
      expect(indexer.getControllerIndexSize()).toBeGreaterThan(0);
    });

    it('should index YAML files', async () => {
      const testUri = vscode.Uri.file('/test/workspace/config/routes/test.yaml');
      (mockFileSystem.readFile as any) = vi.fn().mockResolvedValue(`
        test_route:
          path: /test
          controller: App\\Controller\\TestController::index
      `);
      
      // Mock findFiles to return empty array for controller search
      (mockFileSystem.findFiles as any) = vi.fn().mockResolvedValue([]);
      
      await indexer.indexFile(testUri);
      
      // Should have indexed the route
      expect(indexer.getRouteIndexSize()).toBeGreaterThan(0);
    });
  });
});
