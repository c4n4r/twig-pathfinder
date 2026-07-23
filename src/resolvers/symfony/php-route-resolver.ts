// src/resolvers/symfony/php-route-resolver.ts
// PHP route resolver

import * as vscode from 'vscode';
import { ResolveContext } from '../../types/resolve-context';
import { Resolver } from '../resolver';
import { WorkspaceIndexer } from '../../indexer/workspace-indexer';
import { FileSystem } from '../../filesystem/file-system';
import { ExtensionConfig } from '../../types/config';

export class PhpRouteResolver implements Resolver<ResolveContext, vscode.Location> {
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
      this.config.symfony.phpFilePatterns.join(','),
      this.config.watch.excludePatterns.join(','),
      this.config.twig.searchLimit
    );

    for (const file of files) {
      const content = await this.fileSystem.readFile(file);
      if (!content.includes(context.value)) {
        continue;
      }

      // #[Route('/path', name: 'route_name')] public function myMethod()
      const attrRegex =
        /#\[\s*Route\s*\(([\s\S]*?)\)\s*\]\s*(?:public|protected|private)?\s*function\s+(\w+)/g;
      let m: RegExpExecArray | null;
      while ((m = attrRegex.exec(content)) !== null) {
        if (this.extractRouteName(m[1]) === context.value) {
          const fnPos = content.indexOf(`function ${m[2]}`, m.index);
          return new vscode.Location(
            file,
            this.positionAt(content, fnPos >= 0 ? fnPos : m.index)
          );
        }
      }

      // /** @Route("/path", name="route_name") */ public function myMethod()
      const annoRegex =
        /\/\*\*([\s\S]*?)\*\/\s*(?:public|protected|private)?\s*function\s+(\w+)/g;
      while ((m = annoRegex.exec(content)) !== null) {
        const block = m[1];
        if (!block.includes('@Route')) {
          continue;
        }
        if (this.extractRouteName(block) === context.value) {
          const fnPos = content.indexOf(`function ${m[2]}`, m.index);
          return new vscode.Location(
            file,
            this.positionAt(content, fnPos >= 0 ? fnPos : m.index)
          );
        }
      }
    }

    return null;
  }

  private extractRouteName(source: string): string | null {
    const m = /name\s*[:=]\s*(['"])(.*?)\1/.exec(source);
    return m ? m[2] : null;
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
