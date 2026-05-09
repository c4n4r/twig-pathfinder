// src/providers/twig-definition-provider.ts
// Definition provider for Twig

import * as vscode from 'vscode';
import { ResolverDispatcher } from '../resolvers/dispatcher';
import { ResolveContext } from '../types/resolve-context';
import { ExtensionConfig } from '../types/config';

export class TwigDefinitionProvider implements vscode.DefinitionProvider {
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
