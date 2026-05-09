// src/providers/php-definition-provider.ts
// Definition provider for PHP

import * as vscode from 'vscode';
import { ResolverDispatcher } from '../resolvers/dispatcher';
import { ResolveContext } from '../types/resolve-context';
import { ExtensionConfig } from '../types/config';

export class PhpDefinitionProvider implements vscode.DefinitionProvider {
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
