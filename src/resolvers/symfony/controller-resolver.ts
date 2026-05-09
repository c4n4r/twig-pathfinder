// src/resolvers/symfony/controller-resolver.ts
// Controller resolver

import * as vscode from 'vscode';
import { ResolveContext } from '../../types/resolve-context';
import { Resolver } from '../resolver';
import { WorkspaceIndexer } from '../../indexer/workspace-indexer';
import { FileSystem } from '../../filesystem/file-system';
import { ExtensionConfig } from '../../types/config';

export class ControllerResolver implements Resolver<ResolveContext, vscode.Location> {
  constructor(
    private indexer: WorkspaceIndexer,
    private fileSystem: FileSystem,
    private config: ExtensionConfig
  ) {}

  canResolve(context: ResolveContext): boolean {
    // This resolver handles controller FQCN resolution (e.g., from YAML routes)
    return context.type === 'twig' &&
      (context.action === 'path' || context.action === 'url');
  }

  async resolve(context: ResolveContext): Promise<vscode.Location | null> {
    // Try to find the controller in the index
    const controller = await this.indexer.findController(context.value);
    if (controller) {
      return controller;
    }

    // Fallback to file search
    return await this.resolvePhpController(context.value);
  }

  private async resolvePhpController(controller: string): Promise<vscode.Location | null> {
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
