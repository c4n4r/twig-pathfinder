// src/filesystem/cached-file-system.ts
// Cached implementation

import * as vscode from 'vscode';
import { FileSystem } from './file-system';
import { LRUCache } from '../cache/lru-cache';
import { ExtensionConfig } from '../types/config';

export class CachedFileSystem implements FileSystem {
  private findFilesCache: LRUCache<string, vscode.Uri[]>;
  private readFileCache: LRUCache<string, string>;
  private fileExistsCache: LRUCache<string, boolean>;
  private statCache: LRUCache<string, vscode.FileStat>;
  private config: ExtensionConfig;

  constructor(config: ExtensionConfig) {
    this.config = config;
    this.findFilesCache = new LRUCache(
      config.cache.maxSize,
      config.cache.ttl.fileExists
    );
    this.readFileCache = new LRUCache(
      config.cache.maxSize,
      config.cache.ttl.fileContent
    );
    this.fileExistsCache = new LRUCache(
      config.cache.maxSize,
      config.cache.ttl.fileExists
    );
    this.statCache = new LRUCache(
      config.cache.maxSize,
      config.cache.ttl.fileExists
    );
  }

  async findFiles(pattern: string, excludeOrMaxResults?: string | number, maxResults?: number): Promise<vscode.Uri[]> {
    let exclude: string | undefined;
    if (typeof excludeOrMaxResults === 'string') {
      exclude = excludeOrMaxResults;
    } else if (typeof excludeOrMaxResults === 'number') {
      maxResults = excludeOrMaxResults;
    }

    const cacheKey = `${pattern}:${exclude}:${maxResults}`;

    if (this.config.cache.enabled) {
      const cached = this.findFilesCache.get(cacheKey);
      if (cached) return cached;
    }

    const result = await vscode.workspace.findFiles(
      pattern,
      exclude || this.config.watch.excludePatterns.join(','),
      maxResults
    );

    if (this.config.cache.enabled) {
      this.findFilesCache.set(cacheKey, result);
    }

    return result;
  }

  async readFile(uri: vscode.Uri): Promise<string> {
    const cacheKey = uri.toString();

    if (this.config.cache.enabled) {
      const cached = this.readFileCache.get(cacheKey);
      if (cached) return cached;
    }

    const bytes = await vscode.workspace.fs.readFile(uri);
    const content = Buffer.from(bytes).toString('utf8');

    if (this.config.cache.enabled) {
      this.readFileCache.set(cacheKey, content);
    }

    return content;
  }

  async fileExists(fsPath: string): Promise<boolean> {
    if (this.config.cache.enabled) {
      const cached = this.fileExistsCache.get(fsPath);
      if (cached !== undefined) return cached;
    }

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(fsPath));
      const result = true;
      if (this.config.cache.enabled) {
        this.fileExistsCache.set(fsPath, result);
      }
      return result;
    } catch {
      const result = false;
      if (this.config.cache.enabled) {
        this.fileExistsCache.set(fsPath, result);
      }
      return result;
    }
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const cacheKey = uri.toString();

    if (this.config.cache.enabled) {
      const cached = this.statCache.get(cacheKey);
      if (cached) return cached;
    }

    const result = await vscode.workspace.fs.stat(uri);

    if (this.config.cache.enabled) {
      this.statCache.set(cacheKey, result);
    }

    return result;
  }

  updateConfig(config: ExtensionConfig): void {
    this.config = config;
  }
}
