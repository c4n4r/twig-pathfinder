// src/types/filesystem.ts
// FileSystem interface

import * as vscode from 'vscode';

export interface FileSystem {
  findFiles(pattern: string, maxResults?: number): Promise<vscode.Uri[]>;
  findFiles(pattern: string, exclude: string, maxResults?: number): Promise<vscode.Uri[]>;
  readFile(uri: vscode.Uri): Promise<string>;
  fileExists(fsPath: string): Promise<boolean>;
  stat(uri: vscode.Uri): Promise<vscode.FileStat>;
  onDidChangeFile: vscode.Event<vscode.Uri>;
  onDidCreateFile: vscode.Event<vscode.Uri>;
  onDidDeleteFile: vscode.Event<vscode.Uri>;
}
