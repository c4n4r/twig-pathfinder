// src/indexer/workspace-indexer.ts
// Main indexer class

import * as vscode from 'vscode';
import * as path from 'path';
import { FileSystem } from '../filesystem/file-system';
import { ExtensionConfig } from '../types/config';

export class WorkspaceIndexer {
  private twigIndex: Map<string, vscode.Uri> = new Map();
  private routeIndex: Map<string, vscode.Location> = new Map();
  private controllerIndex: Map<string, vscode.Location> = new Map();

  constructor(
    private fileSystem: FileSystem,
    private config: ExtensionConfig
  ) {}

  async indexWorkspace(): Promise<void> {
    if (!this.config.indexing.enabled) return;

    const tasks: Promise<void>[] = [];

    if (this.config.indexing.eagerIndexTwig) {
      tasks.push(this.indexTwigTemplates());
    }

    if (this.config.indexing.indexRoutes) {
      tasks.push(this.indexRoutes());
    }

    if (this.config.indexing.indexControllers) {
      tasks.push(this.indexControllers());
    }

    await Promise.all(tasks);
  }

  async indexTwigTemplates(): Promise<void> {
    const patterns = this.config.twig.fileExtensions
      .map(ext => `**/*${ext}`);

    for (const pattern of patterns) {
      const files = await this.fileSystem.findFiles(pattern);
      for (const file of files) {
        await this.indexTwigFile(file);
      }
    }
  }

  private async indexTwigFile(uri: vscode.Uri): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const relativePath = path.relative(workspaceRoot, uri.fsPath);

    // Store multiple keys for the same template
    this.twigIndex.set(relativePath, uri);
    this.twigIndex.set(relativePath.replace(/^templates\//, ''), uri);
    this.twigIndex.set(path.basename(uri.fsPath), uri);
  }

  async indexRoutes(): Promise<void> {
    await this.indexRoutesFromPhp();
    await this.indexRoutesFromYaml();
  }

  private async indexRoutesFromPhp(): Promise<void> {
    const patterns = this.config.symfony.phpFilePatterns;
    for (const pattern of patterns) {
      const files = await this.fileSystem.findFiles(pattern);
      for (const file of files) {
        await this.indexPhpFile(file);
      }
    }
  }

  private async indexRoutesFromYaml(): Promise<void> {
    const patterns = this.config.symfony.routeFilePatterns;
    for (const pattern of patterns) {
      const files = await this.fileSystem.findFiles(pattern);
      for (const file of files) {
        await this.indexYamlFile(file);
      }
    }
  }

  async indexControllers(): Promise<void> {
    const patterns = this.config.symfony.controllerPatterns;
    for (const pattern of patterns) {
      const files = await this.fileSystem.findFiles(pattern);
      for (const file of files) {
        await this.indexControllerFile(file);
      }
    }
  }

  private async indexPhpFile(uri: vscode.Uri): Promise<void> {
    const content = await this.fileSystem.readFile(uri);
    
    // Extract routes from PHP file and add to routeIndex
    await this.extractRoutesFromPhpContent(content, uri);
    
    // Also extract controllers from PHP file and add to controllerIndex
    await this.extractControllerFromPhpContent(content, uri);
  }

  private async extractRoutesFromPhpContent(content: string, uri: vscode.Uri): Promise<void> {
    // #[Route('/path', name: 'route_name')] public function myMethod()
    const attrRegex = /#\[\s*Route\s*\(([\s\S]*?)\)\s*\]\s*(?:public|protected|private)?\s*function\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(content)) !== null) {
      const routeName = this.extractRouteName(m[1]);
      if (routeName) {
        const fnPos = content.indexOf(`function ${m[2]}`, m.index);
        const position = this.positionAt(content, fnPos >= 0 ? fnPos : m.index);
        this.routeIndex.set(routeName, new vscode.Location(uri, position));
      }
    }

    // /** @Route("/path", name="route_name") */ public function myMethod()
    const annoRegex = /\/\*\*([\s\S]*?)\*\/\s*(?:public|protected|private)?\s*function\s+(\w+)/g;
    while ((m = annoRegex.exec(content)) !== null) {
      const block = m[1];
      if (!block.includes('@Route')) {
        continue;
      }
      const routeName = this.extractRouteName(block);
      if (routeName) {
        const fnPos = content.indexOf(`function ${m[2]}`, m.index);
        const position = this.positionAt(content, fnPos >= 0 ? fnPos : m.index);
        this.routeIndex.set(routeName, new vscode.Location(uri, position));
      }
    }
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

  private async indexYamlFile(uri: vscode.Uri): Promise<void> {
    // Extract routes from YAML file and add to routeIndex
    const content = await this.fileSystem.readFile(uri);
    // Parse YAML file for route definitions
    await this.extractRoutesFromYamlContent(content, uri);
  }

  private async extractRoutesFromYamlContent(content: string, uri: vscode.Uri): Promise<void> {
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check if this line is a route name (e.g., "route_name:")
      const routeMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
      if (!routeMatch) continue;

      const routeName = routeMatch[1];

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
          this.routeIndex.set(routeName, loc);
        } else {
          // Fallback: point to the route key in the YAML file
          const position = new vscode.Position(i, line.indexOf(routeName));
          this.routeIndex.set(routeName, new vscode.Location(uri, position));
        }
      } else {
        // Fallback: point to the route key in the YAML file
        const position = new vscode.Position(i, line.indexOf(routeName));
        this.routeIndex.set(routeName, new vscode.Location(uri, position));
      }
    }
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

  private async indexControllerFile(uri: vscode.Uri): Promise<void> {
    // Extract controller FQCN and methods from PHP file
    const content = await this.fileSystem.readFile(uri);
    // Parse PHP file for class and method definitions
    await this.extractControllerFromPhpContent(content, uri);
  }

  private async extractControllerFromPhpContent(content: string, uri: vscode.Uri): Promise<void> {
    // Extract namespace and class name
    const nsMatch = /namespace\s+([^;\s]+)/.exec(content);
    const clsMatch = /class\s+(\w+)/.exec(content);
    
    if (!clsMatch) return;

    const className = clsMatch[1];
    const fullName = nsMatch ? `${nsMatch[1]}\\${className}` : className;

    // Find all public methods (potential action methods)
    const methodRegex = /(?:public\s+)?function\s+(\w+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = methodRegex.exec(content)) !== null) {
      const methodName = m[1];
      const controllerKey = `${fullName}::${methodName}`;
      this.controllerIndex.set(controllerKey, new vscode.Location(uri, this.positionAt(content, m.index)));
    }

    // Also index the class itself (for invokable controllers)
    this.controllerIndex.set(fullName, new vscode.Location(uri, this.positionAt(content, clsMatch.index)));
  }

  async findTwigTemplate(templatePath: string): Promise<vscode.Uri | null> {
    const candidates = [
      templatePath,
      templatePath.replace(/^\//, ''),
      path.join('templates', templatePath),
      path.join('templates', templatePath.replace(/^\//, '')),
      path.basename(templatePath),
    ];

    for (const candidate of candidates) {
      if (this.twigIndex.has(candidate)) {
        return this.twigIndex.get(candidate)!;
      }
    }

    return null;
  }

  async findRoute(routeName: string): Promise<vscode.Location | null> {
    return this.routeIndex.get(routeName) || null;
  }

  async findController(controllerFqcn: string): Promise<vscode.Location | null> {
    return this.controllerIndex.get(controllerFqcn) || null;
  }

  async indexFile(uri: vscode.Uri): Promise<void> {
    if (uri.fsPath.endsWith('.twig')) {
      await this.indexTwigFile(uri);
    } else if (uri.fsPath.endsWith('.php')) {
      await this.indexPhpFile(uri);
    } else if (uri.fsPath.match(/\.(yaml|yml)$/)) {
      await this.indexYamlFile(uri);
    }
  }

  remove(uri: vscode.Uri): void {
    // Remove from twigIndex
    for (const [key, value] of this.twigIndex.entries()) {
      if (value.toString() === uri.toString()) {
        this.twigIndex.delete(key);
      }
    }

    // Remove from routeIndex
    for (const [key, value] of this.routeIndex.entries()) {
      if (value.uri.toString() === uri.toString()) {
        this.routeIndex.delete(key);
      }
    }

    // Remove from controllerIndex
    for (const [key, value] of this.controllerIndex.entries()) {
      if (value.uri.toString() === uri.toString()) {
        this.controllerIndex.delete(key);
      }
    }
  }

  clear(): void {
    this.twigIndex.clear();
    this.routeIndex.clear();
    this.controllerIndex.clear();
  }

  getTwigIndexSize(): number {
    return this.twigIndex.size;
  }

  getRouteIndexSize(): number {
    return this.routeIndex.size;
  }

  getControllerIndexSize(): number {
    return this.controllerIndex.size;
  }
}
