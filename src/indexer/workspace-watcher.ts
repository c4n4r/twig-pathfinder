// src/indexer/workspace-watcher.ts
// File watcher implementation

import * as vscode from 'vscode';
import { WorkspaceIndexer } from './workspace-indexer';
import { ExtensionConfig } from '../types/config';

export class WorkspaceWatcher {
  private disposables: vscode.Disposable[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private indexer: WorkspaceIndexer,
    private config: ExtensionConfig
  ) {}

  start(): void {
    if (!this.config.watch.enabled) return;

    const watcher = vscode.workspace.createFileSystemWatcher(
      '**/*',
      false,
      false,
      false
    );

    watcher.onDidChange(this.debounceHandleChange.bind(this));
    watcher.onDidCreate(this.debounceHandleCreate.bind(this));
    watcher.onDidDelete(this.handleDelete.bind(this));

    this.disposables.push(watcher);
  }

  private debounceHandleChange(uri: vscode.Uri): void {
    this.debounceIndex(uri, this.config.watch.debounceMs);
  }

  private debounceHandleCreate(uri: vscode.Uri): void {
    this.debounceIndex(uri, this.config.watch.debounceMs);
  }

  private handleDelete(uri: vscode.Uri): void {
    this.indexer.remove(uri);
  }

  private debounceIndex(uri: vscode.Uri, delay: number): void {
    const key = uri.toString();
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    this.debounceTimers.set(key, setTimeout(async () => {
      try {
        await this.indexer.indexFile(uri);
      } catch (error) {
        console.error(`Failed to index file ${uri.fsPath}:`, error);
      } finally {
        this.debounceTimers.delete(key);
      }
    }, delay));
  }

  stop(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}
