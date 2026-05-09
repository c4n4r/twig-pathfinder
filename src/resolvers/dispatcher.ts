// src/resolvers/dispatcher.ts
// Resolver dispatcher

import * as vscode from 'vscode';
import { ResolveContext } from '../types/resolve-context';
import { Resolver } from './resolver';
import { WorkspaceIndexer } from '../indexer/workspace-indexer';
import { FileSystem } from '../filesystem/file-system';
import { ExtensionConfig } from '../types/config';
import { LRUCache } from '../cache/lru-cache';

export class ResolverDispatcher {
  private resolvers: Array<Resolver<ResolveContext, vscode.Location | vscode.Uri>>;
  private cache: LRUCache<string, vscode.Location | vscode.Uri | null>;

  constructor(
    private indexer: WorkspaceIndexer,
    private fileSystem: FileSystem,
    private config: ExtensionConfig
  ) {
    this.cache = new LRUCache(
      config.cache.maxSize,
      config.cache.ttl.resolution
    );

    this.resolvers = [];
    this.registerDefaultResolvers();
  }

  private registerDefaultResolvers(): void {
    // Import resolvers dynamically to avoid circular dependencies
    // We'll register them in the extension.ts after instantiation
  }

  async resolve(context: ResolveContext): Promise<vscode.Location | vscode.Uri | null> {
    const cacheKey = this.getCacheKey(context);

    if (this.config.cache.enabled) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) return cached;
    }

    for (const resolver of this.resolvers) {
      if (resolver.canResolve(context)) {
        const result = await resolver.resolve(context);
        if (result) {
          if (this.config.cache.enabled) {
            this.cache.set(cacheKey, result);
          }
          return result;
        }
      }
    }

    if (this.config.cache.enabled) {
      this.cache.set(cacheKey, null);
    }
    return null;
  }

  private getCacheKey(context: ResolveContext): string {
    return `${context.type}:${context.action}:${context.value}:${context.document.uri.toString()}`;
  }

  async invalidateCache(): Promise<void> {
    this.cache.clear();
  }

  async invalidateCacheForFile(uri: vscode.Uri): Promise<void> {
    // Find all cache entries involving this file and remove them
    // For simplicity, we'll just clear the entire cache
    // A more sophisticated implementation could track which entries involve which files
    this.cache.clear();
  }

  registerResolver(resolver: Resolver<ResolveContext, vscode.Location | vscode.Uri>): void {
    this.resolvers.push(resolver);
  }

  getResolvers(): Array<Resolver<ResolveContext, vscode.Location | vscode.Uri>> {
    return this.resolvers;
  }
}
