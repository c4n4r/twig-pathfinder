# Design: Modular Architecture for Twig Open Include

## Overview

This document describes the detailed architecture for refactoring the Twig Open Include extension into a modular, performant system that supports bidirectional navigation.

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           EXTENSION ARCHITECTURE                                │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      EXTENSION ENTRY (extension.ts)                         │ │
│  │  - Initialize configuration, filesystem, indexer                           │ │
│  │  - Eager index workspace on activation                                    │ │
│  │  - Register providers with VS Code                                        │ │
│  │  - Start file watcher                                                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      CONFIGURATION LAYER                                    │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │ │
│  │  │ defaults.ts      │  │ schema.ts        │  │ manager.ts       │            │ │
│  │  │ (static defaults)│  │ (JSON schema)    │  │ (reads VS Code  │            │ │
│  │  └─────────────────┘  └─────────────────┘  │   settings)      │            │ │
│  │                                                  └─────────────────┘            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                            │
│         ┌──────────────────────────┬──────────────────────────┐              │
│         ▼                          ▼                          ▼              │
│  ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐    │
│  │  FileSystem      │        │  Workspace       │        │  Cache           │    │
│  │  Abstraction     │        │  Indexer         │        │  (LRU)           │    │
│  │                 │        │                 │        │                 │    │
│  │  - findFiles()   │        │  - twigIndex    │        │  - fileExists   │    │
│  │  - readFile()    │        │  - routeIndex   │        │  - fileContent  │    │
│  │  - fileExists()  │        │  - controller   │        │  - resolution    │    │
│  │  - stat()        │        │    Index        │        │                 │    │
│  └────────┬────────┘        └────────┬────────┘        └─────────────────┘    │
│           │                         │                                          │
│           └─────────────────────────┼──────────────────────────┘                  │
│                                     ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      RESOLVER DISPATCHER                                    │ │
│  │  - Single entry point for all resolution requests                         │ │
│  │  - Routes to appropriate resolver based on context                        │ │
│  │  - Manages caching layer                                                   │ │
│  │  - Handles parallel resolution requests                                  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                            │
│         ┌──────────────────────────┬──────────────────────────┐              │
│         ▼                          ▼                          ▼              │
│  ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐    │
│  │  TwigResolver    │        │ SymfonyResolver  │        │ PhpController   │    │
│  │                 │        │                 │        │ TwigResolver    │    │
│  │  - template.twig │        │ - routes        │        │ (PHP → Twig)     │    │
│  │  - macros        │        │ - controllers    │        │                 │    │
│  │  - imports       │        │                 │        │                 │    │
│  └─────────────────┘        └─────────────────┘        └─────────────────┘    │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      PROVIDERS LAYER                                       │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │ │
│  │  │ DocumentLink     │  │ Twig Definition  │  │ PHP Definition  │            │ │
│  │  │ Provider         │  │ Provider         │  │ Provider        │            │ │
│  │  │ (Twig files)     │  │ (Twig files)     │  │ (PHP files)     │            │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Configuration System

#### Files
- `src/config/defaults.ts` - Default configuration values
- `src/config/schema.ts` - JSON schema for VS Code settings
- `src/config/manager.ts` - Configuration manager
- `src/types/config.ts` - Configuration type definitions

#### Configuration Interface

```typescript
interface ExtensionConfig {
  indexing: {
    enabled: boolean;              // Default: true
    eagerIndexTwig: boolean;       // Default: true
    indexRoutes: boolean;          // Default: true
    indexControllers: boolean;     // Default: true
  };
  twig: {
    templateDirectories: string[]; // Default: ['templates', '']
    fileExtensions: string[];      // Default: ['.twig']
    searchLimit: number;            // Default: 5000
  };
  symfony: {
    routeFilePatterns: string[];   // Default: ['**/config/routes/**/*.{yaml,yml}', '**/config/routing/**/*.{yaml,yml}']
    phpFilePatterns: string[];     // Default: ['**/*.php']
    controllerPatterns: string[]; // Default: ['**/src/Controller/**/*.php', '**/src/Controller/*.php']
  };
  cache: {
    enabled: boolean;              // Default: true
    ttl: {
      fileExists: number;          // Default: 300000 (5 minutes)
      fileContent: number;         // Default: 300000 (5 minutes)
      resolution: number;          // Default: 600000 (10 minutes)
    };
    maxSize: number;               // Default: 1000 entries
  };
  watch: {
    enabled: boolean;              // Default: true
    debounceMs: number;            // Default: 500
    excludePatterns: string[];     // Default: ['**/{node_modules,vendor}/**']
  };
  performance: {
    parallelResolution: boolean;   // Default: true
    maxParallelOperations: number; // Default: 5
  };
}
```

#### Configuration Manager

```typescript
class ConfigManager {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration('twigOpenInclude');
  }

  getConfiguration(): Partial<ExtensionConfig> {
    return {
      indexing: {
        enabled: this.config.get<boolean>('indexing.enabled', defaultConfig.indexing.enabled),
        eagerIndexTwig: this.config.get<boolean>('indexing.eagerIndexTwig', defaultConfig.indexing.eagerIndexTwig),
        indexRoutes: this.config.get<boolean>('indexing.indexRoutes', defaultConfig.indexing.indexRoutes),
        indexControllers: this.config.get<boolean>('indexing.indexControllers', defaultConfig.indexing.indexControllers),
      },
      // ... other properties
    };
  }

  onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('twigOpenInclude')) {
        this.config = vscode.workspace.getConfiguration('twigOpenInclude');
        callback();
      }
    });
  }
}
```

### 2. File System Abstraction

#### Files
- `src/filesystem/file-system.ts` - FileSystem interface
- `src/filesystem/cached-file-system.ts` - Cached implementation
- `src/filesystem/index.ts` - Exports

#### Interface

```typescript
interface FileSystem {
  findFiles(pattern: string, maxResults?: number): Promise<vscode.Uri[]>;
  findFiles(pattern: string, exclude: string, maxResults?: number): Promise<vscode.Uri[]>;
  readFile(uri: vscode.Uri): Promise<string>;
  fileExists(fsPath: string): Promise<boolean>;
  stat(uri: vscode.Uri): Promise<vscode.FileStat>;
  onDidChangeFile: vscode.Event<vscode.Uri>;
  onDidCreateFile: vscode.Event<vscode.Uri>;
  onDidDeleteFile: vscode.Event<vscode.Uri>;
}
```

#### Cached Implementation

```typescript
class CachedFileSystem implements FileSystem {
  private findFilesCache: LRUCache<string, vscode.Uri[]>;
  private readFileCache: LRUCache<string, string>;
  private fileExistsCache: LRUCache<string, boolean>;
  private statCache: LRUCache<string, vscode.FileStat>;

  constructor(private config: ExtensionConfig) {
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

  async findFiles(pattern: string, exclude?: string, maxResults?: number): Promise<vscode.Uri[]> {
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

  // ... other methods
}
```

### 3. Cache Implementation

#### Files
- `src/cache/cache.ts` - Base Cache interface
- `src/cache/lru-cache.ts` - LRU cache implementation
- `src/cache/index.ts` - Exports

#### LRU Cache Implementation

```typescript
interface Cache<TKey, TValue> {
  get(key: TKey): TValue | undefined;
  set(key: TKey, value: TValue): void;
  has(key: TKey): boolean;
  delete(key: TKey): void;
  clear(): void;
  size: number;
}

class LRUCache<TKey extends string, TValue> implements Cache<TKey, TValue> {
  private cache: Map<TKey, { value: TValue; timestamp: number }> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: TKey): TValue | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: TKey, value: TValue): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // If at capacity, delete oldest
    else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  has(key: TKey): boolean {
    return this.cache.has(key);
  }

  delete(key: TKey): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
```

### 4. Workspace Indexer

#### Files
- `src/indexer/workspace-indexer.ts` - Main indexer
- `src/indexer/workspace-watcher.ts` - File watcher
- `src/indexer/index.ts` - Exports

#### Workspace Indexer

```typescript
class WorkspaceIndexer {
  private twigIndex: Map<string, vscode.Uri> = new Map();
  private routeIndex: Map<string, vscode.Location> = new Map();
  private controllerIndex: Map<string, vscode.Location> = new Map();

  constructor(
    private fileSystem: FileSystem,
    private config: ExtensionConfig
  ) {}

  async indexWorkspace(): Promise<void> {
    if (!this.config.indexing.enabled) return;

    const tasks: Promise<void>[] = [];

    if (this.config.indexing.eagerIndexTwig) {
      tasks.push(this.indexTwigTemplates());
    }

    if (this.config.indexing.indexRoutes) {
      tasks.push(this.indexRoutes());
    }

    if (this.config.indexing.indexControllers) {
      tasks.push(this.indexControllers());
    }

    await Promise.all(tasks);
  }

  async indexTwigTemplates(): Promise<void> {
    const patterns = this.config.twig.fileExtensions
      .map(ext => `**/*${ext}`);

    for (const pattern of patterns) {
      const files = await this.fileSystem.findFiles(pattern);
      for (const file of files) {
        await this.indexTwigFile(file);
      }
    }
  }

  private async indexTwigFile(uri: vscode.Uri): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const relativePath = path.relative(workspaceRoot, uri.fsPath);

    // Store multiple keys for the same template
    this.twigIndex.set(relativePath, uri);
    this.twigIndex.set(relativePath.replace(/^templates\//, ''), uri);
    this.twigIndex.set(path.basename(uri.fsPath), uri);
  }

  async indexRoutes(): Promise<void> {
    await this.indexRoutesFromPhp();
    await this.indexRoutesFromYaml();
  }

  private async indexRoutesFromPhp(): Promise<void> {
    const patterns = this.config.symfony.phpFilePatterns;
    for (const pattern of patterns) {
      const files = await this.fileSystem.findFiles(pattern);
      for (const file of files) {
        await this.indexPhpFile(file);
      }
    }
  }

  private async indexRoutesFromYaml(): Promise<void> {
    const patterns = this.config.symfony.routeFilePatterns;
    for (const pattern of patterns) {
      const files = await this.fileSystem.findFiles(pattern);
      for (const file of files) {
        await this.indexYamlFile(file);
      }
    }
  }

  async indexControllers(): Promise<void> {
    const patterns = this.config.symfony.controllerPatterns;
    for (const pattern of patterns) {
      const files = await this.fileSystem.findFiles(pattern);
      for (const file of files) {
        await this.indexControllerFile(file);
      }
    }
  }

  private async indexPhpFile(uri: vscode.Uri): Promise<void> {
    // Extract routes from PHP file and add to routeIndex
    // Implementation uses PhpRouteResolver logic
    const content = await this.fileSystem.readFile(uri);
    // Parse PHP file for #[Route] attributes and @Route annotations
    // Add found routes to this.routeIndex
  }

  private async indexYamlFile(uri: vscode.Uri): Promise<void> {
    // Extract routes from YAML file and add to routeIndex
    // Implementation uses YamlRouteResolver logic
    const content = await this.fileSystem.readFile(uri);
    // Parse YAML file for route definitions
    // Add found routes to this.routeIndex
  }

  private async indexControllerFile(uri: vscode.Uri): Promise<void> {
    // Extract controller FQCN and methods from PHP file
    // Add to controllerIndex
    const content = await this.fileSystem.readFile(uri);
    // Parse PHP file for class and method definitions
    // Add found controllers to this.controllerIndex
  }

  async findTwigTemplate(templatePath: string): Promise<vscode.Uri | null> {
    const candidates = [
      templatePath,
      templatePath.replace(/^\//, ''),
      path.join('templates', templatePath),
      path.join('templates', templatePath.replace(/^\//, '')),
      path.basename(templatePath),
    ];

    for (const candidate of candidates) {
      if (this.twigIndex.has(candidate)) {
        return this.twigIndex.get(candidate)!;
      }
    }

    return null;
  }

  async findRoute(routeName: string): Promise<vscode.Location | null> {
    return this.routeIndex.get(routeName) || null;
  }

  async findController(controllerFqcn: string): Promise<vscode.Location | null> {
    return this.controllerIndex.get(controllerFqcn) || null;
  }

  async indexFile(uri: vscode.Uri): Promise<void> {
    if (uri.fsPath.endsWith('.twig')) {
      await this.indexTwigFile(uri);
    } else if (uri.fsPath.endsWith('.php')) {
      await this.indexPhpFile(uri);
    } else if (uri.fsPath.match(/\.(yaml|yml)$/)) {
      await this.indexYamlFile(uri);
    }
  }

  remove(uri: vscode.Uri): void {
    // Remove from twigIndex
    for (const [key, value] of this.twigIndex.entries()) {
      if (value.toString() === uri.toString()) {
        this.twigIndex.delete(key);
      }
    }
    // Similar for other indexes...
  }

  clear(): void {
    this.twigIndex.clear();
    this.routeIndex.clear();
    this.controllerIndex.clear();
  }
}
```

#### Workspace Watcher

```typescript
class WorkspaceWatcher {
  private disposables: vscode.Disposable[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private indexer: WorkspaceIndexer,
    private config: ExtensionConfig
  ) {}

  start(): void {
    if (!this.config.watch.enabled) return;

    const watcher = vscode.workspace.createFileSystemWatcher(
      '**/*',
      false,
      false,
      false
    );

    watcher.onDidChange(this.debounceHandleChange.bind(this));
    watcher.onDidCreate(this.debounceHandleCreate.bind(this));
    watcher.onDidDelete(this.handleDelete.bind(this));

    this.disposables.push(watcher);
  }

  private debounceHandleChange(uri: vscode.Uri): void {
    this.debounceIndex(uri, this.config.watch.debounceMs);
  }

  private debounceHandleCreate(uri: vscode.Uri): void {
    this.debounceIndex(uri, this.config.watch.debounceMs);
  }

  private handleDelete(uri: vscode.Uri): void {
    this.indexer.remove(uri);
  }

  private debounceIndex(uri: vscode.Uri, delay: number): void {
    const key = uri.toString();
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    this.debounceTimers.set(key, setTimeout(async () => {
      try {
        await this.indexer.indexFile(uri);
      } catch (error) {
        console.error(`Failed to index file ${uri.fsPath}:`, error);
      } finally {
        this.debounceTimers.delete(key);
      }
    }, delay));
  }

  stop(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}
```

### 5. Resolver System

#### Files
- `src/resolvers/resolver.ts` - Base Resolver interface
- `src/resolvers/dispatcher.ts` - Resolver dispatcher
- `src/resolvers/twig/twig-template-resolver.ts` - Twig template resolver
- `src/resolvers/symfony/symfony-route-resolver.ts` - Symfony route resolver
- `src/resolvers/symfony/php-route-resolver.ts` - PHP route resolver
- `src/resolvers/symfony/yaml-route-resolver.ts` - YAML route resolver
- `src/resolvers/symfony/controller-resolver.ts` - Controller resolver
- `src/resolvers/php/php-controller-twig-resolver.ts` - PHP → Twig resolver
- `src/resolvers/index.ts` - Exports

#### Resolver Interface

```typescript
interface ResolveContext {
  document: vscode.TextDocument;
  position: vscode.Position;
  range: vscode.Range;
  text: string;
  type: 'twig' | 'php' | 'yaml' | 'other';
  action: 'include' | 'extend' | 'embed' | 'import' | 'path' | 'url' | 'render';
  value: string;
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  options: Record<string, unknown>;
}

interface Resolver<TContext extends ResolveContext, TResult> {
  canResolve(context: TContext): boolean;
  resolve(context: TContext): Promise<TResult | null>;
}
```

#### Resolver Dispatcher

```typescript
class ResolverDispatcher {
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

    this.resolvers = [
      new TwigTemplateResolver(indexer, fileSystem, config),
      new SymfonyRouteResolver(indexer, fileSystem, config),
      new PhpControllerTwigResolver(indexer, fileSystem, config),
    ];
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
    // Implementation depends on cache structure
  }
}
```

#### Twig Template Resolver

```typescript
class TwigTemplateResolver implements Resolver<ResolveContext, vscode.Uri> {
  constructor(
    private indexer: WorkspaceIndexer,
    private fileSystem: FileSystem,
    private config: ExtensionConfig
  ) {}

  canResolve(context: ResolveContext): boolean {
    return context.type === 'twig' &&
      (context.action === 'include' ||
       context.action === 'extend' ||
       context.action === 'embed' ||
       context.action === 'import');
  }

  async resolve(context: ResolveContext): Promise<vscode.Uri | null> {
    // Try index first
    let uri = await this.indexer.findTwigTemplate(context.value);
    if (uri) return uri;

    // Fallback to file search
    if (context.workspaceFolder) {
      uri = await this.searchForTwigTemplate(context.value, context.workspaceFolder);
    }
    return uri || null;
  }

  private async searchForTwigTemplate(
    templatePath: string,
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<vscode.Uri | null> {
    const candidates = [
      templatePath,
      templatePath.replace(/^\//, ''),
      path.join('templates', templatePath),
      path.join('templates', templatePath.replace(/^\//, '')),
    ];

    for (const candidate of candidates) {
      const fsPath = path.join(workspaceFolder.uri.fsPath, candidate);
      if (await this.fileSystem.fileExists(fsPath)) {
        return vscode.Uri.file(fsPath);
      }
    }

    // Search by basename
    const basename = path.basename(templatePath);
    const files = await this.fileSystem.findFiles(
      `**/${basename}`,
      this.config.twig.searchLimit
    );

    if (files.length > 0) {
      const explicitMatch = files.find(uri =>
        uri.fsPath.endsWith(templatePath) ||
        uri.fsPath.endsWith(templatePath.replace(/^\//, ''))
      );
      return explicitMatch || files[0];
    }

    return null;
  }
}
```

#### PHP Controller → Twig Resolver

```typescript
class PhpControllerTwigResolver implements Resolver<ResolveContext, vscode.Uri> {
  constructor(
    private indexer: WorkspaceIndexer,
    private fileSystem: FileSystem,
    private config: ExtensionConfig
  ) {}

  canResolve(context: ResolveContext): boolean {
    return context.type === 'php' && context.action === 'render';
  }

  async resolve(context: ResolveContext): Promise<vscode.Uri | null> {
    // Try index first
    let uri = await this.indexer.findTwigTemplate(context.value);
    if (uri) return uri;

    // Fallback to file search
    if (context.workspaceFolder) {
      const twigResolver = new TwigTemplateResolver(
        this.indexer,
        this.fileSystem,
        this.config
      );
      uri = await (twigResolver as any).searchForTwigTemplate(
        context.value,
        context.workspaceFolder
      );
    }
    return uri || null;
  }
}
```

### 6. Providers

#### Files
- `src/providers/document-link-provider.ts` - DocumentLink provider for Twig
- `src/providers/twig-definition-provider.ts` - Definition provider for Twig
- `src/providers/php-definition-provider.ts` - Definition provider for PHP
- `src/providers/index.ts` - Exports

#### Twig DocumentLink Provider

```typescript
class TwigDocumentLinkProvider implements vscode.DocumentLinkProvider {
  constructor(
    private resolverDispatcher: ResolverDispatcher,
    private config: ExtensionConfig
  ) {}

  async provideDocumentLinks(
    document: vscode.TextDocument
  ): Promise<vscode.DocumentLink[]> {
    const links: vscode.DocumentLink[] = [];
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return links;

    const TWIG_INCLUDE_REGEX = /(?:\{%\s*(?:include|extends|embed)\s+|include\(\s*)(['"])([^'"]+)\1/g;

    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);
      TWIG_INCLUDE_REGEX.lastIndex = 0;
      let m: RegExpExecArray | null;

      while ((m = TWIG_INCLUDE_REGEX.exec(line.text)) !== null) {
        const templatePath = m[2];
        const start = line.text.indexOf(templatePath, m.index);
        if (start < 0) continue;

        const range = new vscode.Range(
          lineIndex,
          start,
          lineIndex,
          start + templatePath.length
        );

        const context: ResolveContext = {
          document,
          position: new vscode.Position(lineIndex, start),
          range,
          text: line.text,
          type: 'twig',
          action: this.getActionFromText(line.text, start),
          value: templatePath,
          workspaceFolder,
          options: {},
        };

        const targetUri = await this.resolverDispatcher.resolve(context);
        if (targetUri instanceof vscode.Uri) {
          links.push(new vscode.DocumentLink(range, targetUri));
        }
      }
    }

    return links;
  }

  private getActionFromText(text: string, position: number): 'include' | 'extend' | 'embed' {
    const before = text.slice(0, position);
    if (/\binclude\b/.test(before)) return 'include';
    if (/\bextends\b/.test(before)) return 'extend';
    if (/\bembed\b/.test(before)) return 'embed';
    return 'include';
  }
}
```

#### Twig Definition Provider

```typescript
class TwigDefinitionProvider implements vscode.DefinitionProvider {
  constructor(
    private resolverDispatcher: ResolverDispatcher,
    private config: ExtensionConfig
  ) {}

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | null> {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /['"][^'"]+['"]/
    );
    if (!wordRange) return null;

    const raw = document.getText(wordRange);
    if (raw.length < 2) return null;

    const value = raw.slice(1, -1);
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return null;

    const line = document.lineAt(position).text;
    const before = line.slice(0, wordRange.start.character);

    // Check for Symfony route functions
    if (/\b(?:path|url)\s*\(\s*$/.test(before)) {
      const context: ResolveContext = {
        document,
        position,
        range: wordRange,
        text: line,
        type: 'twig',
        action: 'path',
        value,
        workspaceFolder,
        options: {},
      };

      const result = await this.resolverDispatcher.resolve(context);
      if (result instanceof vscode.Location) {
        return result;
      }
      return null;
    }

    // Check for Twig include/extend/embed
    if (
      /(?:\b(?:include|extends|embed)\b\s*)$/.test(before) ||
      /\binclude\s*\(\s*$/.test(before)
    ) {
      const context: ResolveContext = {
        document,
        position,
        range: wordRange,
        text: line,
        type: 'twig',
        action: this.getActionFromText(line, wordRange.start.character),
        value,
        workspaceFolder,
        options: {},
      };

      const result = await this.resolverDispatcher.resolve(context);
      if (result instanceof vscode.Uri) {
        return new vscode.Location(result, new vscode.Position(0, 0));
      }
      return null;
    }

    return null;
  }

  private getActionFromText(text: string, position: number): 'include' | 'extend' | 'embed' {
    const before = text.slice(0, position);
    if (/\binclude\b/.test(before)) return 'include';
    if (/\bextends\b/.test(before)) return 'extend';
    if (/\bembed\b/.test(before)) return 'embed';
    return 'include';
  }
}
```

#### PHP Definition Provider

```typescript
class PhpDefinitionProvider implements vscode.DefinitionProvider {
  constructor(
    private resolverDispatcher: ResolverDispatcher,
    private config: ExtensionConfig
  ) {}

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | null> {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /['"][^'"]+['"]/
    );
    if (!wordRange) return null;

    const raw = document.getText(wordRange);
    if (raw.length < 2) return null;

    const value = raw.slice(1, -1);
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return null;

    const line = document.lineAt(position).text;
    const before = line.slice(0, wordRange.start.character);

    // Detect PHP patterns that reference Twig templates
    // Pattern: $this->render('...')
    // Pattern: $this->renderView('...')
    // Pattern: return $this->render('...')
    // Pattern: $twig->render('...')
    if (
      /\b(?:render|renderView)\s*\(\s*$/.test(before) ||
      /\breturn\s+\$this\s*->\s*(?:render|renderView)\s*\(\s*$/.test(before) ||
      /->\s*(?:render|renderView)\s*\(\s*$/.test(before)
    ) {
      const context: ResolveContext = {
        document,
        position,
        range: wordRange,
        text: line,
        type: 'php',
        action: 'render',
        value,
        workspaceFolder,
        options: {},
      };

      const result = await this.resolverDispatcher.resolve(context);
      if (result instanceof vscode.Uri) {
        return new vscode.Location(result, new vscode.Position(0, 0));
      }
      return null;
    }

    return null;
  }
}
```

### 7. Types

#### Files
- `src/types/index.ts` - Main exports
- `src/types/config.ts` - Configuration types
- `src/types/resolve-context.ts` - ResolveContext type
- `src/types/filesystem.ts` - FileSystem types

#### ResolveContext Type

```typescript
// src/types/resolve-context.ts

export interface ResolveContext {
  document: vscode.TextDocument;
  position: vscode.Position;
  range: vscode.Range;
  text: string;
  type: 'twig' | 'php' | 'yaml' | 'other';
  action: 'include' | 'extend' | 'embed' | 'import' | 'path' | 'url' | 'render';
  value: string;
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  options: Record<string, unknown>;
}
```

### 8. Utilities

#### Files
- `src/utils/path-utils.ts` - Path manipulation utilities
- `src/utils/string-utils.ts` - String utilities
- `src/utils/index.ts` - Exports

## Directory Structure

```
src/
├── extension.ts                    # Main entry point
├── config/
│   ├── defaults.ts               # Default configuration values
│   ├── schema.ts                 # Configuration schema for package.json
│   └── manager.ts                # Configuration manager
├── types/
│   ├── index.ts                  # Main exports
│   ├── config.ts                 # Configuration type definitions
│   ├── resolve-context.ts        # ResolveContext interface
│   └── filesystem.ts              # FileSystem interface
├── providers/
│   ├── index.ts                  # Exports
│   ├── document-link-provider.ts # DocumentLink provider for Twig
│   ├── twig-definition-provider.ts # Definition provider for Twig
│   └── php-definition-provider.ts # Definition provider for PHP
├── resolvers/
│   ├── index.ts                  # Exports
│   ├── resolver.ts               # Base Resolver interface
│   ├── dispatcher.ts             # Resolver dispatcher
│   ├── twig/
│   │   └── twig-template-resolver.ts # Twig template resolver
│   ├── symfony/
│   │   ├── symfony-route-resolver.ts # Symfony route resolver
│   │   ├── php-route-resolver.ts # PHP route resolver
│   │   ├── yaml-route-resolver.ts # YAML route resolver
│   │   └── controller-resolver.ts # Controller resolver
│   └── php/
│       └── php-controller-twig-resolver.ts # PHP → Twig resolver
├── filesystem/
│   ├── index.ts                  # Exports
│   ├── file-system.ts            # FileSystem interface
│   └── cached-file-system.ts     # Cached implementation
├── indexer/
│   ├── index.ts                  # Exports
│   ├── workspace-indexer.ts      # Workspace indexer
│   └── workspace-watcher.ts      # File watcher
├── cache/
│   ├── index.ts                  # Exports
│   ├── cache.ts                  # Base Cache interface
│   └── lru-cache.ts              # LRU cache implementation
└── utils/
    ├── index.ts                  # Exports
    ├── path-utils.ts             # Path utilities
    └── string-utils.ts            # String utilities
```

## Data Flow Diagrams

### Startup Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  activate()  │────▶│ Load Config  │────▶│ Init File   │────▶│ Index       │
└─────────────┘     └─────────────┘     │ System      │     │ Workspace   │
                                          └─────────────┘     └────────┬──────┘
                                                                    │
                                                                    ▼
                                                             ┌─────────────┐
                                                             │ Register     │
                                                             │ Providers    │
                                                             └─────────────┘
                                                                    │
                                                                    ▼
                                                             ┌─────────────┐
                                                             │ Start File   │
                                                             │ Watcher      │
                                                             └─────────────┘
```

### Resolution Flow (Twig → Template)

```
┌─────────────┐     ┌─────────────────────────┐     ┌─────────────┐
│ User clicks  │────▶│ DocumentLinkProvider     │────▶│ Create       │
│ on include   │     │ (or DefinitionProvider)   │     │ Resolve      │
└─────────────┘     └─────────────────────────┘     │ Context      │
                                                        └────────┬──────┘
                                                                 │
                                                                 ▼
                                                        ┌─────────────────────────┐
                                                        │ ResolverDispatcher       │
                                                        │ - Check cache            │
                                                        │ - Find matching resolver │
                                                        └─────────────┬───────────┘
                                                                      │
                                                                      ▼
                                                        ┌─────────────────────────┐
                                                        │ TwigTemplateResolver     │
                                                        │ - Check index            │
                                                        │ - Fallback to file search│
                                                        └─────────────┬───────────┘
                                                                      │
                                                                      ▼
                                                        ┌─────────────────────────┐
                                                        │ WorkspaceIndexer /       │
                                                        │ FileSystem               │
                                                        └─────────────┬───────────┘
                                                                      │
                                                                      ▼
                                                        ┌─────────────────────────┐
                                                        │ Return URI               │
                                                        └─────────────────────────┘
```

### Resolution Flow (PHP → Twig)

```
┌─────────────┐     ┌─────────────────────────┐     ┌─────────────┐
│ User clicks  │────▶│ PhpDefinitionProvider    │────▶│ Create       │
│ on render()  │     │                         │     │ Resolve      │
└─────────────┘     └─────────────────────────┘     │ Context      │
                                                        └────────┬──────┘
                                                                 │
                                                                 ▼
                                                        ┌─────────────────────────┐
                                                        │ ResolverDispatcher       │
                                                        │ - Check cache            │
                                                        │ - Find matching resolver │
                                                        └─────────────┬───────────┘
                                                                      │
                                                                      ▼
                                                        ┌─────────────────────────┐
                                                        │ PhpControllerTwigResolver│
                                                        │ - Check index            │
                                                        │ - Fallback to file search│
                                                        └─────────────┬───────────┘
                                                                      │
                                                                      ▼
                                                        ┌─────────────────────────┐
                                                        │ WorkspaceIndexer /       │
                                                        │ FileSystem               │
                                                        └─────────────┬───────────┘
                                                                      │
                                                                      ▼
                                                        ┌─────────────────────────┐
                                                        │ Return URI               │
                                                        └─────────────────────────┘
```

### File Change Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ File saved  │────▶│ File Watcher │────▶│ Debounce    │────▶│ Indexer     │
└─────────────┘     └─────────────┘     └─────────────┘     │ Update       │
                                                        │ Indexes      │
                                                        └─────────────┘
```

## Migration Strategy

To minimize disruption and risk, we'll migrate incrementally:

### Phase 1: Foundation (Non-breaking)
1. Create type definitions
2. Create configuration system
3. Create FileSystem abstraction (wraps existing vscode.workspace.fs calls)
4. Create Cache implementation
5. Create WorkspaceIndexer
6. Update extension.ts to use new components but keep existing logic

### Phase 2: Resolvers (Non-breaking)
1. Create Resolver interface and Dispatcher
2. Move Twig template resolution to TwigTemplateResolver
3. Move Symfony route resolution to SymfonyRouteResolver
4. Update providers to use ResolverDispatcher
5. Verify all existing functionality works

### Phase 3: New Features
1. Add WorkspaceWatcher
2. Implement eager indexing on startup
3. Add PHP DefinitionProvider
4. Add PhpControllerTwigResolver
5. Add configuration to package.json

### Phase 4: Optimization
1. Profile performance
2. Optimize critical paths
3. Adjust cache TTLs and sizes
4. Fine-tune indexing strategy

## Testing Strategy

1. **Unit Tests**: Test individual components (resolvers, cache, indexer)
2. **Integration Tests**: Test complete flows (click → resolution)
3. **Manual Testing**: Test with real Symfony projects
4. **Performance Testing**: Measure startup time, memory usage, resolution speed

### Test Fixtures

Create a test workspace with:
- Sample Twig templates with includes/extends/embed
- Sample Symfony controllers with render() calls
- Sample route definitions (PHP attributes and YAML)
- Various edge cases (missing files, circular references, etc.)

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Startup time (small project) | < 2 seconds | Time from activate() to providers registered |
| Startup time (medium project) | < 10 seconds | Time from activate() to providers registered |
| Memory usage (medium project) | < 50 MB | Process memory after indexing |
| Resolution time (cached) | < 10 ms | Time to resolve from cache |
| Resolution time (uncached) | < 100 ms | Time to resolve with index lookup |
| Resolution time (fallback) | < 500 ms | Time to resolve with file search |

## Configuration for package.json

```json
{
  "contributes": {
    "configuration": {
      "title": "Twig Open Include",
      "properties": {
        "twigOpenInclude.indexing.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable workspace indexing for faster resolution"
        },
        "twigOpenInclude.indexing.eagerIndexTwig": {
          "type": "boolean",
          "default": true,
          "description": "Eagerly index Twig templates on startup"
        },
        "twigOpenInclude.indexing.indexRoutes": {
          "type": "boolean",
          "default": true,
          "description": "Index Symfony routes for faster resolution"
        },
        "twigOpenInclude.indexing.indexControllers": {
          "type": "boolean",
          "default": true,
          "description": "Index Symfony controllers for PHP → Twig navigation"
        },
        "twigOpenInclude.twig.templateDirectories": {
          "type": "array",
          "default": ["templates", ""],
          "description": "Directories to search for Twig templates"
        },
        "twigOpenInclude.twig.fileExtensions": {
          "type": "array",
          "default": [".twig"],
          "description": "File extensions to recognize as Twig templates"
        },
        "twigOpenInclude.twig.searchLimit": {
          "type": "number",
          "default": 5000,
          "description": "Maximum number of files to search when resolving templates"
        },
        "twigOpenInclude.symfony.routeFilePatterns": {
          "type": "array",
          "default": [
            "**/config/routes/**/*.{yaml,yml}",
            "**/config/routing/**/*.{yaml,yml}"
          ],
          "description": "Glob patterns for Symfony route YAML files"
        },
        "twigOpenInclude.symfony.phpFilePatterns": {
          "type": "array",
          "default": ["**/*.php"],
          "description": "Glob patterns for PHP files to search for routes"
        },
        "twigOpenInclude.symfony.controllerPatterns": {
          "type": "array",
          "default": [
            "**/src/Controller/**/*.php",
            "**/src/Controller/*.php"
          ],
          "description": "Glob patterns for Symfony controller files"
        },
        "twigOpenInclude.cache.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable caching for file operations and resolutions"
        },
        "twigOpenInclude.cache.ttl.fileExists": {
          "type": "number",
          "default": 300000,
          "description": "TTL for file existence cache in milliseconds"
        },
        "twigOpenInclude.cache.ttl.fileContent": {
          "type": "number",
          "default": 300000,
          "description": "TTL for file content cache in milliseconds"
        },
        "twigOpenInclude.cache.ttl.resolution": {
          "type": "number",
          "default": 600000,
          "description": "TTL for resolution cache in milliseconds"
        },
        "twigOpenInclude.cache.maxSize": {
          "type": "number",
          "default": 1000,
          "description": "Maximum number of entries in each cache"
        },
        "twigOpenInclude.watch.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Watch for file changes and update indexes"
        },
        "twigOpenInclude.watch.debounceMs": {
          "type": "number",
          "default": 500,
          "description": "Debounce time for file change events in milliseconds"
        },
        "twigOpenInclude.watch.excludePatterns": {
          "type": "array",
          "default": ["**/{node_modules,vendor}/**"],
          "description": "Patterns to exclude from file watching"
        },
        "twigOpenInclude.performance.parallelResolution": {
          "type": "boolean",
          "default": true,
          "description": "Enable parallel resolution for better performance"
        },
        "twigOpenInclude.performance.maxParallelOperations": {
          "type": "number",
          "default": 5,
          "description": "Maximum number of parallel operations"
        }
      }
    }
  }
}
```

## Dependencies

This change has no new external dependencies. It uses only:
- VS Code API (already used)
- Node.js standard library (path, etc.)
- TypeScript standard types

## Breaking Changes

This change should be **non-breaking** for existing users. The same functionality will be available, just implemented differently internally.

## Rollback Plan

If issues are discovered after release:
1. Users can disable indexing via configuration to fall back to old behavior
2. We can release a patch that reverts to the old implementation if needed
3. The modular design allows us to swap out individual components if needed

## Success Metrics

After implementation, we should measure:
1. Startup time improvement (or acceptable degradation)
2. Memory usage
3. Resolution speed improvement
4. User satisfaction (no new bugs reported)
5. Ease of adding new features (developer experience)
