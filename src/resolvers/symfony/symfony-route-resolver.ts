// src/resolvers/symfony/symfony-route-resolver.ts
// Main Symfony route resolver

import * as vscode from 'vscode';
import { ResolveContext } from '../../types/resolve-context';
import { Resolver } from '../resolver';
import { WorkspaceIndexer } from '../../indexer/workspace-indexer';
import { FileSystem } from '../../filesystem/file-system';
import { ExtensionConfig } from '../../types/config';
import { PhpRouteResolver } from './php-route-resolver';
import { YamlRouteResolver } from './yaml-route-resolver';

export class SymfonyRouteResolver implements Resolver<ResolveContext, vscode.Location> {
  private phpRouteResolver: PhpRouteResolver;
  private yamlRouteResolver: YamlRouteResolver;

  constructor(
    private indexer: WorkspaceIndexer,
    private fileSystem: FileSystem,
    private config: ExtensionConfig
  ) {
    this.phpRouteResolver = new PhpRouteResolver(indexer, fileSystem, config);
    this.yamlRouteResolver = new YamlRouteResolver(indexer, fileSystem, config);
  }

  canResolve(context: ResolveContext): boolean {
    return context.type === 'twig' &&
      (context.action === 'path' || context.action === 'url');
  }

  async resolve(context: ResolveContext): Promise<vscode.Location | null> {
    // Try index first
    const indexedRoute = await this.indexer.findRoute(context.value);
    if (indexedRoute) {
      return indexedRoute;
    }

    // Fallback to parallel resolution
    if (this.config.performance.parallelResolution) {
      const [phpResult, yamlResult] = await Promise.all([
        this.phpRouteResolver.resolve(context),
        this.yamlRouteResolver.resolve(context),
      ]);
      return phpResult || yamlResult;
    }

    // Sequential resolution
    const phpResult = await this.phpRouteResolver.resolve(context);
    if (phpResult) {
      return phpResult;
    }

    const yamlResult = await this.yamlRouteResolver.resolve(context);
    return yamlResult;
  }
}
