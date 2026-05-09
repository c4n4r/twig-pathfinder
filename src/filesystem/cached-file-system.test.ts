// src/filesystem/cached-file-system.test.ts
// Unit tests for CachedFileSystem

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { CachedFileSystem } from './cached-file-system';
import { ExtensionConfig } from '../types/config';

// Mock VS Code API
vi.mock('vscode', () => ({
  workspace: {
    findFiles: vi.fn(),
    fs: {
      readFile: vi.fn(),
      stat: vi.fn(),
    },
  },
  Uri: {
    file: (path: string) => ({ toString: () => path, fsPath: path }),
    parse: (uri: string) => ({ toString: () => uri, fsPath: uri }),
  },
}));

describe('CachedFileSystem', () => {
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

  let fileSystem: CachedFileSystem;

  beforeEach(() => {
    fileSystem = new CachedFileSystem(mockConfig);
    vi.clearAllMocks();
  });

  describe('fileExists', () => {
    it('should cache file existence results', async () => {
      const testPath = '/test/file.txt';
      
      // Mock vscode to return true for file existence
      (vscode.workspace.fs.stat as any).mockResolvedValue({ type: 1 });
      
      // First call - should hit the filesystem
      const result1 = await fileSystem.fileExists(testPath);
      expect(result1).toBe(true);
      expect(vscode.workspace.fs.stat).toHaveBeenCalled();
      
      // Second call - should use cache
      const result2 = await fileSystem.fileExists(testPath);
      expect(result2).toBe(true);
      expect(vscode.workspace.fs.stat).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should cache negative results', async () => {
      const testPath = '/nonexistent/file.txt';
      
      // Mock vscode to throw error (file doesn't exist)
      (vscode.workspace.fs.stat as any).mockRejectedValue(new Error('File not found'));
      
      // First call
      const result1 = await fileSystem.fileExists(testPath);
      expect(result1).toBe(false);
      
      // Second call - should use cache
      const result2 = await fileSystem.fileExists(testPath);
      expect(result2).toBe(false);
      expect(vscode.workspace.fs.stat).toHaveBeenCalledTimes(1);
    });
  });

  describe('readFile', () => {
    it('should cache file contents', async () => {
      const testUri = vscode.Uri.file('/test/file.txt');
      const testContent = 'test content';
      
      // Mock vscode to return test content
      (vscode.workspace.fs.readFile as any).mockResolvedValue(Buffer.from(testContent));
      
      // First call
      const result1 = await fileSystem.readFile(testUri);
      expect(result1).toBe(testContent);
      expect(vscode.workspace.fs.readFile).toHaveBeenCalled();
      
      // Second call - should use cache
      const result2 = await fileSystem.readFile(testUri);
      expect(result2).toBe(testContent);
      expect(vscode.workspace.fs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('findFiles', () => {
    it('should cache findFiles results', async () => {
      const testPattern = '**/*.twig';
      const testUris = [
        vscode.Uri.file('/test/file1.twig'),
        vscode.Uri.file('/test/file2.twig'),
      ];
      
      // Mock vscode to return test URIs
      (vscode.workspace.findFiles as any).mockResolvedValue(testUris);
      
      // First call
      const result1 = await fileSystem.findFiles(testPattern);
      expect(result1).toEqual(testUris);
      expect(vscode.workspace.findFiles).toHaveBeenCalled();
      
      // Second call - should use cache
      const result2 = await fileSystem.findFiles(testPattern);
      expect(result2).toEqual(testUris);
      expect(vscode.workspace.findFiles).toHaveBeenCalledTimes(1);
    });

    it('should handle exclude patterns', async () => {
      const testPattern = '**/*.twig';
      const testExclude = '**/node_modules/**';
      const testUris = [vscode.Uri.file('/test/file.twig')];
      
      (vscode.workspace.findFiles as any).mockResolvedValue(testUris);
      
      await fileSystem.findFiles(testPattern, testExclude);
      
      expect(vscode.workspace.findFiles).toHaveBeenCalledWith(
        testPattern,
        testExclude,
        undefined
      );
    });
  });

  describe('updateConfig', () => {
    it('should update the configuration', () => {
      const newConfig: ExtensionConfig = {
        ...mockConfig,
        cache: {
          ...mockConfig.cache,
          enabled: false,
        },
      };
      
      fileSystem.updateConfig(newConfig);
      
      // The config should be updated (we can't directly test this without accessing private members,
      // but we can test that the method doesn't throw)
      expect(() => fileSystem.updateConfig(newConfig)).not.toThrow();
    });
  });
});
