# Specification: Configuration System

## Overview

This document specifies the configuration system for the Twig Open Include extension, including all configurable options, their types, defaults, and descriptions.

## Configuration Structure

The configuration is organized into logical groups:

```
twigOpenInclude
├── indexing          # Workspace indexing settings
├── twig             # Twig-specific settings
├── symfony          # Symfony-specific settings
├── cache            # Caching settings
├── watch            # File watching settings
└── performance      # Performance-related settings
```

## Configuration Options

### 1. Indexing Settings (`twigOpenInclude.indexing`)

Controls workspace indexing behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Master switch for all indexing functionality. When disabled, the extension falls back to file search for all resolutions. |
| `eagerIndexTwig` | boolean | `true` | Whether to eagerly index all Twig templates on extension activation. Improves resolution speed but increases startup time. |
| `indexRoutes` | boolean | `true` | Whether to index Symfony routes (from PHP and YAML files) on startup. |
| `indexControllers` | boolean | `true` | Whether to index Symfony controllers on startup. Required for PHP → Twig navigation. |

**Example:**
```json
{
  "twigOpenInclude.indexing": {
    "enabled": true,
    "eagerIndexTwig": true,
    "indexRoutes": true,
    "indexControllers": true
  }
}
```

### 2. Twig Settings (`twigOpenInclude.twig`)

Controls Twig template resolution behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `templateDirectories` | array of strings | `["templates", ""]` | Directories to search for Twig templates, in order of priority. An empty string means the workspace root. |
| `fileExtensions` | array of strings | `[".twig"]` | File extensions to recognize as Twig templates. |
| `searchLimit` | number | `5000` | Maximum number of files to search when resolving templates that aren't in the index. |

**Example:**
```json
{
  "twigOpenInclude.twig": {
    "templateDirectories": ["templates", "views", ""],
    "fileExtensions": [".twig", ".html.twig"],
    "searchLimit": 5000
  }
}
```

**Use Cases:**
- Projects with custom template directories (e.g., `views/` instead of `templates/`)
- Projects with multiple template directories
- Projects using different file extensions

### 3. Symfony Settings (`twigOpenInclude.symfony`)

Controls Symfony-specific resolution behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `routeFilePatterns` | array of strings | `["**/config/routes/**/*.{yaml,yml}", "**/config/routing/**/*.{yaml,yml}"]` | Glob patterns for Symfony route YAML files. |
| `phpFilePatterns` | array of strings | `["**/*.php"]` | Glob patterns for PHP files to search for route definitions. |
| `controllerPatterns` | array of strings | `["**/src/Controller/**/*.php", "**/src/Controller/*.php"]` | Glob patterns for Symfony controller files. Used for PHP → Twig navigation. |

**Example:**
```json
{
  "twigOpenInclude.symfony": {
    "routeFilePatterns": [
      "**/config/routes/**/*.{yaml,yml}",
      "**/config/routing/**/*.{yaml,yml}",
      "**/routes/**/*.yaml"
    ],
    "phpFilePatterns": ["**/*.php"],
    "controllerPatterns": [
      "**/src/Controller/**/*.php",
      "**/src/Controller/*.php",
      "**/Controller/**/*.php"
    ]
  }
}
```

**Use Cases:**
- Projects with custom route file locations
- Projects with custom controller locations
- Large projects where limiting PHP file search improves performance

### 4. Cache Settings (`twigOpenInclude.cache`)

Controls caching behavior for file operations and resolutions.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Master switch for all caching. When disabled, all operations go directly to the file system. |
| `ttl.fileExists` | number | `300000` | Time-to-live for file existence cache in milliseconds (5 minutes). |
| `ttl.fileContent` | number | `300000` | Time-to-live for file content cache in milliseconds (5 minutes). |
| `ttl.resolution` | number | `600000` | Time-to-live for resolution cache in milliseconds (10 minutes). |
| `maxSize` | number | `1000` | Maximum number of entries in each cache. When exceeded, oldest entries are evicted. |

**Example:**
```json
{
  "twigOpenInclude.cache": {
    "enabled": true,
    "ttl": {
      "fileExists": 300000,
      "fileContent": 300000,
      "resolution": 600000
    },
    "maxSize": 1000
  }
}
```

**Use Cases:**
- Projects with many files where longer cache TTLs improve performance
- Development environments where shorter cache TTLs ensure up-to-date results
- Memory-constrained environments where smaller cache sizes are needed

### 5. Watch Settings (`twigOpenInclude.watch`)

Controls file watching behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Whether to watch for file changes and update indexes automatically. |
| `debounceMs` | number | `500` | Debounce time in milliseconds for file change events. Prevents rapid successive updates. |
| `excludePatterns` | array of strings | `["**/{node_modules,vendor}/**"]` | Glob patterns for files/directories to exclude from watching. |

**Example:**
```json
{
  "twigOpenInclude.watch": {
    "enabled": true,
    "debounceMs": 500,
    "excludePatterns": [
      "**/{node_modules,vendor,var,public}/**",
      "**/.git/**"
    ]
  }
}
```

**Use Cases:**
- Large projects where excluding certain directories improves performance
- Development environments where immediate updates are desired (lower debounceMs)
- Production environments where file watching might not be needed (disabled)

### 6. Performance Settings (`twigOpenInclude.performance`)

Controls performance-related behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `parallelResolution` | boolean | `true` | Whether to perform parallel resolution when multiple resolvers might handle a request. |
| `maxParallelOperations` | number | `5` | Maximum number of parallel operations (file searches, etc.). |

**Example:**
```json
{
  "twigOpenInclude.performance": {
    "parallelResolution": true,
    "maxParallelOperations": 5
  }
}
```

**Use Cases:**
- Environments with limited CPU cores (lower maxParallelOperations)
- Debugging where sequential operations are easier to trace (disable parallelResolution)

## Complete Configuration Example

```json
{
  "twigOpenInclude": {
    "indexing": {
      "enabled": true,
      "eagerIndexTwig": true,
      "indexRoutes": true,
      "indexControllers": true
    },
    "twig": {
      "templateDirectories": ["templates", ""],
      "fileExtensions": [".twig"],
      "searchLimit": 5000
    },
    "symfony": {
      "routeFilePatterns": [
        "**/config/routes/**/*.{yaml,yml}",
        "**/config/routing/**/*.{yaml,yml}"
      ],
      "phpFilePatterns": ["**/*.php"],
      "controllerPatterns": [
        "**/src/Controller/**/*.php",
        "**/src/Controller/*.php"
      ]
    },
    "cache": {
      "enabled": true,
      "ttl": {
        "fileExists": 300000,
        "fileContent": 300000,
        "resolution": 600000
      },
      "maxSize": 1000
    },
    "watch": {
      "enabled": true,
      "debounceMs": 500,
      "excludePatterns": ["**/{node_modules,vendor}/**"]
    },
    "performance": {
      "parallelResolution": true,
      "maxParallelOperations": 5
    }
  }
}
```

## Configuration Precedence

Configuration values are resolved in the following order (later overrides earlier):

1. Default values (from `src/config/defaults.ts`)
2. Workspace settings (`.vscode/settings.json`)
3. User settings (`~/.vscode/argv.json` or equivalent)

## Configuration Validation

The extension should validate configuration values on load:

- **Type validation**: Ensure values match expected types
- **Range validation**: Ensure numeric values are within reasonable ranges
- **Pattern validation**: Ensure glob patterns are valid

Invalid configuration values should:
1. Log a warning to the VS Code output panel
2. Fall back to default values
3. Continue operation

## Configuration Changes

When configuration changes are detected:

1. The `ConfigManager` emits a change event
2. Components that depend on configuration should:
   - Re-read the configuration
   - Update their internal state if needed
   - Re-index if indexing configuration changed
   - Clear caches if caching configuration changed

## Performance Considerations

### Startup Time

- Eager indexing (`eagerIndexTwig: true`) increases startup time but improves resolution speed
- For large projects, consider setting `eagerIndexTwig: false` and relying on lazy indexing

### Memory Usage

- Indexes consume memory proportional to the number of files in the workspace
- Caches consume memory proportional to `cache.maxSize` and the size of cached data
- For memory-constrained environments, consider:
  - Reducing `cache.maxSize`
  - Disabling caching (`cache.enabled: false`)
  - Disabling indexing (`indexing.enabled: false`)

### Resolution Speed

- Indexed lookups are fastest (O(1) map lookup)
- Cached lookups are fast (O(1) cache lookup)
- File searches are slowest (O(n) file system operations)

## Migration Guide

### From Version < 0.1.0

No migration needed. The new configuration system has sensible defaults that match the previous behavior.

### Customizing Configuration

Users can customize the extension by adding settings to their VS Code `settings.json`:

1. Open VS Code settings (Ctrl+, or Cmd+,)
2. Search for "Twig Open Include"
3. Modify the desired settings
4. Save the file

Or edit `settings.json` directly:

```json
{
  "twigOpenInclude.indexing.eagerIndexTwig": false,
  "twigOpenInclude.twig.templateDirectories": ["views"],
  "twigOpenInclude.cache.enabled": false
}
```

## Implementation Notes

### ConfigManager

The `ConfigManager` class in `src/config/manager.ts` is responsible for:

1. Reading configuration from VS Code
2. Merging with defaults
3. Providing type-safe access to configuration values
4. Emitting change events when configuration changes

### Defaults

Default values are defined in `src/config/defaults.ts` and should match the defaults specified in this document.

### Schema

The JSON schema for configuration is defined in `src/config/schema.ts` and should be contributed to `package.json` to enable VS Code's configuration UI.

## Testing

Configuration should be tested with:

1. **Default values**: Ensure all defaults work correctly
2. **Custom values**: Ensure custom values override defaults
3. **Invalid values**: Ensure invalid values are handled gracefully
4. **Change events**: Ensure configuration changes are detected and handled
5. **Edge cases**: Empty arrays, zero values, very large values, etc.

## Future Considerations

Potential future configuration options:

- `twig.additionalPatterns`: Additional regex patterns for detecting Twig includes
- `symfony.additionalRoutePatterns`: Additional patterns for route detection
- `logging.level`: Logging verbosity (debug, info, warn, error)
- `experimental.features`: Toggle for experimental features
