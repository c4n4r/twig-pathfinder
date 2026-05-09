import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigManager } from './config/manager';
import { CachedFileSystem } from './filesystem/cached-file-system';
import { WorkspaceIndexer, WorkspaceWatcher } from './indexer';
import { ResolverDispatcher } from './resolvers/dispatcher';
import { TwigTemplateResolver } from './resolvers/twig/twig-template-resolver';
import { SymfonyRouteResolver } from './resolvers/symfony/symfony-route-resolver';
import { PhpControllerTwigResolver } from './resolvers/php/php-controller-twig-resolver';
import { TwigDocumentLinkProvider } from './providers/document-link-provider';
import { TwigDefinitionProvider } from './providers/twig-definition-provider';
import { PhpDefinitionProvider } from './providers/php-definition-provider';
import { ExtensionConfig } from './types/config';
import { Logger, getLogger } from './utils/logger';
import { profiler } from './utils/performance';

// Global instances (will be initialized in activate)
let configManager: ConfigManager;
let fileSystem: CachedFileSystem;
let indexer: WorkspaceIndexer;
let watcher: WorkspaceWatcher;
let resolverDispatcher: ResolverDispatcher;
let currentConfig: ExtensionConfig;
let logger: Logger;

// Legacy functions (kept for backward compatibility during transition)
const TWIG_INCLUDE_REGEX =
  /(?:\{%\s*(?:include|extends|embed)\s+|include\(\s*)(['"])([^'"]+)\1/g;
const SEARCH_EXCLUDE = '**/{node_modules,vendor}/**';

export function activate(context: vscode.ExtensionContext) {
  try {
    // Initialize logger
    logger = getLogger('Twig Open Include');
    logger.info('Extension activating...');

    // Initialize configuration
    configManager = new ConfigManager();
    currentConfig = configManager.getConfiguration();
    logger.debug('Configuration loaded', currentConfig);

  // Initialize filesystem with caching
  fileSystem = new CachedFileSystem(currentConfig);

  // Initialize indexer
  indexer = new WorkspaceIndexer(fileSystem, currentConfig);

  // Initialize and start file watcher
  watcher = new WorkspaceWatcher(indexer, currentConfig);
  watcher.start();
  logger.info('File watcher started');

  // Initialize resolver dispatcher
  resolverDispatcher = new ResolverDispatcher(indexer, fileSystem, currentConfig);
  logger.info('Resolver dispatcher initialized');
  
  // Register resolvers with dispatcher
  registerResolvers();
  logger.debug('Resolvers registered');

  // Eager indexing on startup with progress notification
  const indexPromise = profiler.profile('startup-indexing', () => indexWorkspaceWithProgress());
  logger.info('Workspace indexing started');

  // Watch for configuration changes
  const configDisposable = configManager.onConfigurationChanged(() => {
    currentConfig = configManager.getConfiguration();
    fileSystem.updateConfig(currentConfig);
    watcher = new WorkspaceWatcher(indexer, currentConfig);
    watcher.start();
    
    // Recreate resolver dispatcher with new config
    resolverDispatcher = new ResolverDispatcher(indexer, fileSystem, currentConfig);
    registerResolvers();
    
    // Re-index if indexing config changed
    if (currentConfig.indexing.enabled) {
      indexWorkspaceWithProgress();
    } else {
      indexer.clear();
    }
  });
  context.subscriptions.push(configDisposable);

  // Register new providers using resolver dispatcher
  const documentLinkProvider = new TwigDocumentLinkProvider(resolverDispatcher, currentConfig);
  const twigDefinitionProvider = new TwigDefinitionProvider(resolverDispatcher, currentConfig);
  const phpDefinitionProvider = new PhpDefinitionProvider(resolverDispatcher, currentConfig);

  // Register providers with VS Code
  const documentLinkDisposable = vscode.languages.registerDocumentLinkProvider(
    { language: 'twig' },
    documentLinkProvider
  );

  const twigDefinitionDisposable = vscode.languages.registerDefinitionProvider(
    { language: 'twig' },
    twigDefinitionProvider
  );

  const phpDefinitionDisposable = vscode.languages.registerDefinitionProvider(
    { language: 'php' },
    phpDefinitionProvider
  );

  context.subscriptions.push(
    documentLinkDisposable,
    twigDefinitionDisposable,
    phpDefinitionDisposable
  );

  logger.info('Extension activated successfully');
  } catch (error) {
    logger.error('Failed to activate extension', error);
    vscode.window.showErrorMessage(`Twig Open Include: Failed to activate. See output for details.`);
    throw error;
  }
}

function registerResolvers(): void {
  // Register all resolvers with the dispatcher
  resolverDispatcher.registerResolver(new TwigTemplateResolver(indexer, fileSystem, currentConfig));
  resolverDispatcher.registerResolver(new SymfonyRouteResolver(indexer, fileSystem, currentConfig));
  resolverDispatcher.registerResolver(new PhpControllerTwigResolver(indexer, fileSystem, currentConfig));
}

async function indexWorkspaceWithProgress(): Promise<void> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Twig Open Include: Indexing workspace',
      cancellable: false,
    },
    async (progress) => {
      try {
        await indexer.indexWorkspace();
        const twigCount = indexer.getTwigIndexSize();
        const routeCount = indexer.getRouteIndexSize();
        const controllerCount = indexer.getControllerIndexSize();
        progress.report({ message: `Indexed ${twigCount} Twig templates, ${routeCount} routes, ${controllerCount} controllers` });
        logger.info(`Workspace indexed: ${twigCount} templates, ${routeCount} routes, ${controllerCount} controllers`);
      } catch (error) {
        logger.error('Failed to index workspace', error);
        progress.report({ message: 'Error indexing workspace. See output for details.' });
        throw error;
      }
    },
  );
}

// Legacy functions - kept for backward compatibility
// These will be removed once the new architecture is fully tested

async function resolveSymfonyRoute(
  routeName: string,
): Promise<vscode.Location | null> {
  // Try index first
  const indexedRoute = await indexer.findRoute(routeName);
  if (indexedRoute) {
    return indexedRoute;
  }

  // Fallback to file search (original implementation)
  const phpResult = await findRouteInPhpFiles(routeName);
  if (phpResult) {
    return phpResult;
  }

  const yamlResult = await findRouteInYamlFiles(routeName);
  if (yamlResult) {
    return yamlResult;
  }

  return null;
}

async function findRouteInPhpFiles(
  routeName: string,
): Promise<vscode.Location | null> {
  const files = await fileSystem.findFiles(
    '**/*.php',
    SEARCH_EXCLUDE,
    5000,
  );

  for (const file of files) {
    const content = await fileSystem.readFile(file);
    if (!content.includes(routeName)) {
      continue;
    }

    const attrRegex =
      /#\[\s*Route\s*\(([\s\S]*?)\)\s*\]\s*(?:public|protected|private)?\s*function\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(content)) !== null) {
      if (extractRouteName(m[1]) === routeName) {
        const fnPos = content.indexOf(`function ${m[2]}`, m.index);
        return new vscode.Location(
          file,
          positionAt(content, fnPos >= 0 ? fnPos : m.index),
        );
      }
    }

    const annoRegex =
      /\/\*\*([\s\S]*?)\*\/\s*(?:public|protected|private)?\s*function\s+(\w+)/g;
    while ((m = annoRegex.exec(content)) !== null) {
      const block = m[1];
      if (!block.includes('@Route')) {
        continue;
      }
      if (extractRouteName(block) === routeName) {
        const fnPos = content.indexOf(`function ${m[2]}`, m.index);
        return new vscode.Location(
          file,
          positionAt(content, fnPos >= 0 ? fnPos : m.index),
        );
      }
    }
  }

  return null;
}

function extractRouteName(source: string): string | undefined {
  const m = /name\s*[:=]\s*(['"])(.*?)\1/.exec(source);
  return m?.[2];
}

async function findRouteInYamlFiles(
  routeName: string,
): Promise<vscode.Location | null> {
  const files = await fileSystem.findFiles(
    '**/*.{yaml,yml}',
    SEARCH_EXCLUDE,
    500,
  );

  for (const file of files) {
    if (!isRouteFile(file.fsPath)) {
      continue;
    }

    const content = await fileSystem.readFile(file);
    if (!content.includes(routeName)) {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed !== `${routeName}:`) {
        continue;
      }

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

        const ctrlMatch = sub
          .trim()
          .match(/^controller:\s*['"]?(.+?)['"]?\s*$/);
        if (ctrlMatch) {
          controllerFqcn = ctrlMatch[1];
          break;
        }

        const defMatch = sub
          .trim()
          .match(/^defaults:\s*\{[^}]*_controller:\s*['"]?(.+?)['"]?\s*\}/);
        if (defMatch) {
          controllerFqcn = defMatch[1];
          break;
        }
      }

      if (controllerFqcn) {
        const loc = await resolvePhpController(controllerFqcn);
        if (loc) {
          return loc;
        }
      }

      return new vscode.Location(
        file,
        new vscode.Position(i, line.indexOf(routeName)),
      );
    }
  }

  return null;
}

async function resolvePhpController(
  controller: string,
): Promise<vscode.Location | null> {
  // Try index first
  const indexedController = await indexer.findController(controller);
  if (indexedController) {
    return indexedController;
  }

  const parts = controller.split('::');
  const classFqcn = parts[0].replace(/\\\\/g, '\\');
  const methodName = parts[1] ?? '__invoke';

  const classShortName = classFqcn.split('\\').pop()!;
  const files = await fileSystem.findFiles(
    `**/${classShortName}.php`,
    SEARCH_EXCLUDE,
    10,
  );

  for (const file of files) {
    const content = await fileSystem.readFile(file);

    const nsMatch = /namespace\s+([^;\s]+)/.exec(content);
    const clsMatch = /class\s+(\w+)/.exec(content);
    if (!clsMatch) {
      continue;
    }

    const fullName = nsMatch ? `${nsMatch[1]}\\${clsMatch[1]}` : clsMatch[1];
    if (fullName !== classFqcn) {
      continue;
    }

    const methodRegex = new RegExp(`function\\s+${methodName}\\s*\\(`);
    const methodMatch = methodRegex.exec(content);
    if (methodMatch) {
      return new vscode.Location(file, positionAt(content, methodMatch.index));
    }

    return new vscode.Location(file, positionAt(content, clsMatch.index));
  }

  return null;
}

async function resolveTwigTemplateUri(
  templatePath: string,
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<vscode.Uri | undefined> {
  // Try index first
  const indexedTemplate = await indexer.findTwigTemplate(templatePath);
  if (indexedTemplate) {
    return indexedTemplate;
  }

  const stripped = templatePath.startsWith('/')
    ? templatePath.slice(1)
    : templatePath;

  const candidates = [
    templatePath,
    stripped,
    path.join('templates', templatePath),
    path.join('templates', stripped),
  ];

  for (const candidate of candidates) {
    const fsPath = path.join(workspaceFolder.uri.fsPath, candidate);
    if (await fileSystem.fileExists(fsPath)) {
      return vscode.Uri.file(fsPath);
    }
  }

  const basename = path.basename(templatePath);
  const foundFiles = await fileSystem.findFiles(
    `**/${basename}`,
    SEARCH_EXCLUDE,
    20,
  );
  if (foundFiles.length > 0) {
    const explicitMatch = foundFiles.find((uri) =>
      uri.fsPath.endsWith(templatePath),
    );
    return explicitMatch ?? foundFiles[0];
  }

  return undefined;
}

function positionAt(text: string, offset: number): vscode.Position {
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return new vscode.Position(
    lines.length - 1,
    lines[lines.length - 1]?.length ?? 0,
  );
}

function isRouteFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.includes('/config/') ||
    lower.includes('routes') ||
    lower.includes('routing')
  );
}

export function deactivate() {
  try {
    logger?.info('Extension deactivating...');
    
    // Print performance summary
    profiler.printSummary();
    
    if (watcher) {
      watcher.stop();
      logger?.debug('File watcher stopped');
    }
    
    if (configManager) {
      configManager.dispose();
      logger?.debug('Config manager disposed');
    }
    
    logger?.info('Extension deactivated successfully');
    logger?.dispose();
  } catch (error) {
    console.error('Error during deactivation:', error);
  }
}

export { configManager, fileSystem, indexer, watcher, resolverDispatcher, currentConfig };
