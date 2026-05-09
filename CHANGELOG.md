# Changelog

All notable changes to the **Twig Pathfinder* VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Release 1.0.0

### Renamed to "Twig Pathfinder"

### ✨ New Features

- **PHP → Twig Navigation**: Added support for navigating from PHP controllers to Twig templates. Click on template names in `render()`, `renderView()`, and similar methods to jump directly to the template file.
- **Workspace Indexing**: Implemented eager indexing of Twig templates, Symfony routes, and controllers on extension startup for faster resolution.
- **File Watching**: Added automatic index updates when files change, ensuring navigation always works with the latest file structure.
- **Configuration System**: Added comprehensive configuration with 20+ settings to customize extension behavior.
- **Performance Profiling**: Added built-in performance profiling to measure and optimize extension performance.

### 🔧 Improvements

- **Modular Architecture**: Refactored from monolithic implementation to modular architecture with clear separation of concerns.
- **Caching Layer**: Added LRU caching for file operations and path resolutions with configurable TTL.
- **Parallel Resolution**: Implemented parallel resolution for PHP and YAML route files.
- **Error Handling**: Added comprehensive error handling and configurable logging.
- **Type Safety**: Added TypeScript type definitions throughout the codebase.

### 🐛 Bug Fixes

- Fixed various edge cases in template path resolution
- Improved route detection for PHP attributes and annotations
- Fixed YAML route file parsing
- Improved controller FQCN resolution

### 📊 Performance

- Reduced resolution time from O(n) file searches to O(1) index lookups
- Added caching to avoid repeated file system operations
- Implemented debounced file watching to prevent performance issues
- Optimized indexing for large projects

### 🧪 Testing

- Added 92+ unit tests covering core functionality
- Achieved ~68% code coverage
- Added comprehensive test suite for cache, filesystem, and utilities

---