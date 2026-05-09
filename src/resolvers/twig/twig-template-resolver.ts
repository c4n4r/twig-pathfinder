// src/resolvers/twig/twig-template-resolver.ts
// Twig template resolver

import * as vscode from 'vscode';
import * as path from 'path';
import { ResolveContext } from '../../types/resolve-context';
import { Resolver } from '../resolver';
import { WorkspaceIndexer } from '../../indexer/workspace-indexer';
import { FileSystem } from '../../filesystem/file-system';
import { ExtensionConfig } from '../../types/config';

export class TwigTemplateResolver implements Resolver<ResolveContext, vscode.Uri> {
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
