// src/providers/document-link-provider.ts
// DocumentLink provider for Twig

import * as vscode from 'vscode';
import { ResolverDispatcher } from '../resolvers/dispatcher';
import { ResolveContext } from '../types/resolve-context';
import { ExtensionConfig } from '../types/config';

const TWIG_INCLUDE_REGEX =
  /(?:\{%\s*(?:include|extends|embed)\s+|include\(\s*)(['"])([^'"]+)\1/g;

export class TwigDocumentLinkProvider implements vscode.DocumentLinkProvider {
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
