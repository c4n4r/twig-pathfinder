// src/types/resolve-context.ts
// ResolveContext interface

import * as vscode from 'vscode';

export interface ResolveContext {
  document: vscode.TextDocument;
  position: vscode.Position;
  range: vscode.Range;
  text: string;
  type: 'twig' | 'php' | 'yaml' | 'other';
  action: 'include' | 'extend' | 'embed' | 'import' | 'path' | 'url' | 'render' | 'route';
  value: string;
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  options: Record<string, unknown>;
}
