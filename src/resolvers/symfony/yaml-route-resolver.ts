// src/resolvers/symfony/yaml-route-resolver.ts
// YAML route resolver

import * as vscode from 'vscode';
import { ResolveContext } from '../../types/resolve-context';
import { Resolver } from '../resolver';
import { WorkspaceIndexer } from '../../indexer/workspace-indexer';
import { FileSystem } from '../../filesystem/file-system';
import { ExtensionConfig } from '../../types/config';

export class YamlRouteResolver implements Resolver<ResolveContext, vscode.Location> {
  constructor(
    private indexer: WorkspaceIndexer,
    private fileSystem: FileSystem,
    private config: ExtensionConfig
  ) {}

  canResolve(context: ResolveContext): boolean {
    return (context.type === 'twig' &&
      (context.action === 'path' || context.action === 'url')) ||
      (context.type === 'php' && context.action === 'route');
  }

  async resolve(context: ResolveContext): Promise<vscode.Location | null> {
    // Try index first
    const indexedRoute = await this.indexer.findRoute(context.value);
    if (indexedRoute) {
      return indexedRoute;
    }

    // Fallback to file search
    const files = await this.fileSystem.findFiles(
      this.config.symfony.routeFilePatterns.join(','),
      this.config.watch.excludePatterns.join(','),
      this.config.twig.searchLimit
    );

    for (const file of files) {
      if (!this.isRouteFile(file.fsPath)) {
        continue;
      }

      const content = await this.fileSystem.readFile(file);
      if (!content.includes(context.value)) {
        continue;
      }

      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed !== `${context.value}:`) {
          continue;
        }

        // Found the route key — look for controller in sub-keys
        const baseIndent = (line.match(/^(\s*)/)?.[1] ?? '').length;
        let controllerFqcn: string | undefined;

        for (let j = i + 1; j < lines.length; j++) {
          const sub = lines[j];
          if (sub.trim().length === 0) {
            continue;
          }
          const indent = (sub.match(/^(\s*)/)?.[1] ?? '').length;
          if (indent <= baseIndent) {
            break;
          }

          // controller: App\Controller\MyController
          const ctrlMatch = sub
            .trim()
            .match(/^controller:\s*['"]?(.+?)['"]?\s*$/);
          if (ctrlMatch) {
            controllerFqcn = ctrlMatch[1];
            break;
          }

          // defaults: { _controller: App\Controller\MyController }
          const defMatch = sub
            .trim()
            .match(/^defaults:\s*\{[^}]*_controller:\s*['"]?(.+?)['"]?\s*\}/);
          if (defMatch) {
            controllerFqcn = defMatch[1];
            break;
          }
        }

        // Resolve the controller FQCN to a PHP file + method
        if (controllerFqcn) {
          const loc = await this.resolvePhpController(controllerFqcn);
          if (loc) {
            return loc;
          }
        }

        // Fallback: point to the route key in the YAML file
        return new vscode.Location(
          file,
          new vscode.Position(i, line.indexOf(context.value))
        );
      }
    }

    return null;
  }

  private isRouteFile(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    return (
      lower.includes('/config/') ||
      lower.includes('routes') ||
      lower.includes('routing')
    );
  }

  private async resolvePhpController(controller: string): Promise<vscode.Location | null> {
    // Try index first
    const indexedController = await this.indexer.findController(controller);
    if (indexedController) {
      return indexedController;
    }

    // Fallback to file search
    const parts = controller.split('::');
    const classFqcn = parts[0].replace(/\\\\/g, '\\');
    const methodName = parts[1] ?? '__invoke';

    // Search for the PHP file by class short name
    const classShortName = classFqcn.split('\\').pop()!;
    const files = await this.fileSystem.findFiles(
      `**/${classShortName}.php`,
      this.config.watch.excludePatterns.join(','),
      10
    );

    for (const file of files) {
      const content = await this.fileSystem.readFile(file);

      // Verify namespace + class name match the FQCN
      const nsMatch = /namespace\s+([^;\s]+)/.exec(content);
      const clsMatch = /class\s+(\w+)/.exec(content);
      if (!clsMatch) {
        continue;
      }

      const fullName = nsMatch ? `${nsMatch[1]}\\${clsMatch[1]}` : clsMatch[1];
      if (fullName !== classFqcn) {
        continue;
      }

      // Find the method
      const methodRegex = new RegExp(`function\\s+${methodName}\\s*\\(`);
      const methodMatch = methodRegex.exec(content);
      if (methodMatch) {
        return new vscode.Location(file, this.positionAt(content, methodMatch.index));
      }

      // Method not found — fallback to class declaration
      return new vscode.Location(file, this.positionAt(content, clsMatch.index));
    }

    return null;
  }

  private positionAt(text: string, offset: number): vscode.Position {
    const before = text.slice(0, offset);
    const lines = before.split(/\r?\n/);
    return new vscode.Position(
      lines.length - 1,
      lines[lines.length - 1]?.length ?? 0
    );
  }
}
