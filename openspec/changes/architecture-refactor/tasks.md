# Tasks: Architecture Refactor

## Overview

This document breaks down the implementation of the architecture refactor into manageable tasks. Tasks are organized by phase and priority.

## Phases

### Phase 1: Foundation (High Priority)
*Create the base infrastructure without breaking existing functionality*

### Phase 2: Resolvers (High Priority)
*Migrate existing resolution logic to the new resolver system*

### Phase 3: New Features (Medium Priority)
*Implement the new PHP → Twig navigation and indexing*

### Phase 4: Optimization (Medium Priority)
*Fine-tune performance and add polish*

---

## Phase 1: Foundation

### Task 1.1: Create Type Definitions
**Priority:** High | **Estimate:** 1-2 hours | **Status:** completed

Create the foundational type definitions that will be used throughout the codebase.

- [x] Create `src/types/index.ts` - Main exports file
- [x] Create `src/types/config.ts` - Configuration type definitions
- [x] Create `src/types/resolve-context.ts` - ResolveContext interface
- [x] Create `src/types/filesystem.ts` - FileSystem interface

**Files to create:**
- `src/types/config.ts`
- `src/types/resolve-context.ts`
- `src/types/filesystem.ts`
- `src/types/index.ts`

**Dependencies:** None

---

### Task 1.2: Create Configuration System
**Priority:** High | **Estimate:** 2-3 hours | **Status:** completed

Implement the configuration system with defaults and manager.

- [x] Create `src/config/defaults.ts` - Default configuration values
- [x] Create `src/config/schema.ts` - JSON schema for VS Code settings
- [x] Create `src/config/manager.ts` - Configuration manager that reads from VS Code settings
- [x] Export from `src/config/index.ts`

**Files to create:**
- `src/config/defaults.ts`
- `src/config/schema.ts`
- `src/config/manager.ts`
- `src/config/index.ts`

**Dependencies:** Task 1.1 (Type Definitions)

---

### Task 1.3: Create Cache Implementation
**Priority:** High | **Estimate:** 2-3 hours | **Status:** completed

Implement the LRU cache for file operations and resolutions.

- [x] Create `src/cache/cache.ts` - Base Cache interface
- [x] Create `src/cache/lru-cache.ts` - LRU cache implementation
- [x] Export from `src/cache/index.ts`
- [x] Write unit tests for cache functionality

**Files to create:**
- `src/cache/cache.ts`
- `src/cache/lru-cache.ts`
- `src/cache/index.ts`

**Dependencies:** None

---

### Task 1.4: Create FileSystem Abstraction
**Priority:** High | **Estimate:** 3-4 hours | **Status:** completed

Create the FileSystem abstraction with caching wrapper.

- [x] Create `src/filesystem/file-system.ts` - FileSystem interface
- [x] Create `src/filesystem/cached-file-system.ts` - Cached implementation
- [x] Export from `src/filesystem/index.ts`
- [x] Write unit tests for FileSystem

**Files to create:**
- `src/filesystem/file-system.ts`
- `src/filesystem/cached-file-system.ts`
- `src/filesystem/index.ts`

**Dependencies:** Task 1.3 (Cache)

---

### Task 1.5: Create Workspace Indexer
**Priority:** High | **Estimate:** 4-5 hours | **Status:** completed

Implement the workspace indexer for Twig templates, routes, and controllers.

- [x] Create `src/indexer/workspace-indexer.ts` - Main indexer class
- [x] Implement `indexWorkspace()` method
- [x] Implement `indexTwigTemplates()` method
- [x] Implement `indexRoutes()` method
- [x] Implement `indexControllers()` method
- [x] Implement `findTwigTemplate()` method
- [x] Implement `findRoute()` method
- [x] Implement `findController()` method
- [x] Implement `indexFile()` method
- [x] Implement `remove()` method
- [x] Implement `clear()` method
- [x] Export from `src/indexer/index.ts`

**Files to create:**
- `src/indexer/workspace-indexer.ts`
- `src/indexer/index.ts`

**Dependencies:** Task 1.4 (FileSystem)

---

### Task 1.6: Update extension.ts to Use New Components
**Priority:** High | **Estimate:** 2-3 hours | **Status:** completed

Refactor `extension.ts` to use the new configuration, filesystem, and indexer, but keep the existing provider logic for now.

- [x] Import new components (config, filesystem, indexer)
- [x] Initialize components in `activate()`
- [x] Add eager indexing on startup (with progress notification)
- [x] Start file watcher
- [x] Ensure existing functionality still works
- [x] Update `deactivate()` if needed

**Files to modify:**
- `src/extension.ts`

**Dependencies:** Tasks 1.2, 1.4, 1.5

---

## Phase 2: Resolvers

### Task 2.1: Create Resolver Interface and Dispatcher
**Priority:** High | **Estimate:** 3-4 hours | **Status:** completed

Implement the resolver pattern with dispatcher.

- [x] Create `src/resolvers/resolver.ts` - Base Resolver interface
- [x] Create `src/resolvers/dispatcher.ts` - Resolver dispatcher
- [x] Export from `src/resolvers/index.ts`

**Files to create:**
- `src/resolvers/resolver.ts`
- `src/resolvers/dispatcher.ts`
- `src/resolvers/index.ts`

**Dependencies:** Tasks 1.1, 1.5

---

### Task 2.2: Create Twig Template Resolver
**Priority:** High | **Estimate:** 2-3 hours | **Status:** completed

Move Twig template resolution logic to a dedicated resolver.

- [x] Create `src/resolvers/twig/twig-template-resolver.ts`
- [x] Implement `canResolve()` method
- [x] Implement `resolve()` method
- [x] Move logic from current `resolveTwigTemplateUri()` function
- [x] Use indexer for fast lookup
- [x] Fall back to file search when not in index
- [x] Export from `src/resolvers/twig/index.ts`

**Files to create:**
- `src/resolvers/twig/twig-template-resolver.ts`
- `src/resolvers/twig/index.ts`

**Dependencies:** Tasks 2.1, 1.5

---

### Task 2.3: Create Symfony Route Resolver
**Priority:** High | **Estimate:** 6-8 hours | **Status:** completed

Move Symfony route resolution logic to dedicated resolvers.

- [x] Create `src/resolvers/symfony/symfony-route-resolver.ts` - Main Symfony route resolver
- [x] Create `src/resolvers/symfony/php-route-resolver.ts` - PHP route resolver
- [x] Create `src/resolvers/symfony/yaml-route-resolver.ts` - YAML route resolver
- [x] Create `src/resolvers/symfony/controller-resolver.ts` - Controller resolver
- [x] Implement `canResolve()` and `resolve()` for each
- [x] Move logic from current `resolveSymfonyRoute()`, `findRouteInPhpFiles()`, `findRouteInYamlFiles()`, `resolvePhpController()`
- [x] Use indexer for fast lookup
- [x] Fall back to file search when not in index
- [x] Implement parallel resolution for PHP and YAML
- [x] Export from `src/resolvers/symfony/index.ts`

**Files to create:**
- `src/resolvers/symfony/symfony-route-resolver.ts`
- `src/resolvers/symfony/php-route-resolver.ts`
- `src/resolvers/symfony/yaml-route-resolver.ts`
- `src/resolvers/symfony/controller-resolver.ts`
- `src/resolvers/symfony/index.ts`

**Dependencies:** Tasks 2.1, 1.5

---

### Task 2.4: Update Resolver Dispatcher with All Resolvers
**Priority:** High | **Estimate:** 1-2 hours | **Status:** completed

Register all resolvers with the dispatcher.

- [x] Import all resolvers in `src/resolvers/dispatcher.ts`
- [x] Register resolvers in priority order
- [x] Ensure caching works correctly

**Files to modify:**
- `src/resolvers/dispatcher.ts`

**Dependencies:** Tasks 2.1, 2.2, 2.3

---

### Task 2.5: Create Provider Layer
**Priority:** High | **Estimate:** 4-5 hours | **Status:** completed

Create the provider classes that use the resolver dispatcher.

- [x] Create `src/providers/document-link-provider.ts` - DocumentLink provider for Twig
- [x] Create `src/providers/twig-definition-provider.ts` - Definition provider for Twig
- [x] Move logic from current providers in `extension.ts`
- [x] Use ResolverDispatcher for resolution
- [x] Export from `src/providers/index.ts`

**Files to create:**
- `src/providers/document-link-provider.ts`
- `src/providers/twig-definition-provider.ts`
- `src/providers/index.ts`

**Dependencies:** Tasks 2.1, 2.2, 2.3, 2.4

---

### Task 2.6: Update extension.ts to Use New Providers
**Priority:** High | **Estimate:** 2-3 hours | **Status:** completed

Replace the inline provider implementations in `extension.ts` with the new provider classes.

- [x] Import new providers
- [x] Instantiate providers with resolver dispatcher
- [x] Register providers with VS Code
- [x] Remove old provider code from `extension.ts`
- [x] Ensure all existing functionality works

**Files to modify:**
- `src/extension.ts`

**Dependencies:** Tasks 2.5, 1.6

---

### Task 2.7: Test Existing Functionality
**Priority:** High | **Estimate:** 2-3 hours | **Status:** completed

Verify that all existing functionality still works after the refactor.

- [x] Test Twig include/extend/embed navigation
- [x] Test Symfony route navigation (path() and url())
- [x] Test with various Twig syntaxes
- [x] Test with various route definition styles (PHP attributes, annotations, YAML)
- [x] Fix any issues found

**Dependencies:** Tasks 2.6, 1.6

---

## Phase 3: New Features

### Task 3.1: Implement Workspace Watcher
**Priority:** Medium | **Estimate:** 2-3 hours | **Status:** completed

Implement the file watcher to keep indexes up to date.

- [x] Create `src/indexer/workspace-watcher.ts`
- [x] Implement `start()` method
- [x] Implement `stop()` method
- [x] Implement debounced file handling
- [x] Integrate with WorkspaceIndexer
- [x] Export from `src/indexer/index.ts`
- [x] Start watcher in `extension.ts`

**Files to create:**
- `src/indexer/workspace-watcher.ts`

**Files to modify:**
- `src/indexer/index.ts`
- `src/extension.ts`

**Dependencies:** Tasks 1.5, 1.6

---

### Task 3.2: Implement Full Route Indexing
**Priority:** Medium | **Estimate:** 5-7 hours | **Status:** completed

Complete the implementation of route indexing.

- [x] Implement `indexRoutesFromPhp()` in WorkspaceIndexer
- [x] Implement `indexRoutesFromYaml()` in WorkspaceIndexer
- [x] Implement `indexPhpFile()` for PHP files
- [x] Implement `indexYamlFile()` for YAML files
- [x] Update `indexRoutes()` to call both methods
- [x] Test route indexing

**Files to modify:**
- `src/indexer/workspace-indexer.ts`

**Dependencies:** Task 1.5

---

### Task 3.3: Implement Full Controller Indexing
**Priority:** Medium | **Estimate:** 4-6 hours | **Status:** completed

Complete the implementation of controller indexing.

- [x] Implement `indexControllerFile()` in WorkspaceIndexer
- [x] Update `indexControllers()` to use the new method
- [x] Test controller indexing

**Files to modify:**
- `src/indexer/workspace-indexer.ts`

**Dependencies:** Task 1.5

---

### Task 3.4: Create PHP → Twig Resolver
**Priority:** Medium | **Estimate:** 2-3 hours | **Status:** completed

Create the resolver for PHP → Twig navigation.

- [x] Create `src/resolvers/php/php-controller-twig-resolver.ts`
- [x] Implement `canResolve()` method (detects render/renderView patterns)
- [x] Implement `resolve()` method
- [x] Use indexer for fast lookup
- [x] Fall back to file search when not in index
- [x] Export from `src/resolvers/php/index.ts`
- [x] Register with ResolverDispatcher

**Files to create:**
- `src/resolvers/php/php-controller-twig-resolver.ts`
- `src/resolvers/php/index.ts`

**Files to modify:**
- `src/resolvers/dispatcher.ts`

**Dependencies:** Tasks 2.1, 1.5, 3.2, 3.3

---

### Task 3.5: Create PHP Definition Provider
**Priority:** Medium | **Estimate:** 2-3 hours | **Status:** completed

Create the DefinitionProvider for PHP files.

- [x] Create `src/providers/php-definition-provider.ts`
- [x] Implement `provideDefinition()` method
- [x] Detect render/renderView patterns in PHP
- [x] Use ResolverDispatcher for resolution
- [x] Export from `src/providers/index.ts`
- [x] Register provider in `extension.ts`

**Files to create:**
- `src/providers/php-definition-provider.ts`

**Files to modify:**
- `src/providers/index.ts`
- `src/extension.ts`

**Dependencies:** Tasks 3.4, 2.5

---

### Task 3.6: Add PHP Language Support
**Priority:** Medium | **Estimate:** 1 hour | **Status:** completed

Update package.json to support PHP language.

- [x] Add PHP to activation events
- [x] Update package.json contributes.configuration with all settings

**Files to modify:**
- `package.json`

**Dependencies:** Task 3.5

---

### Task 3.7: Test New PHP → Twig Functionality
**Priority:** Medium | **Estimate:** 2-3 hours | **Status:** completed

Verify that PHP → Twig navigation works correctly.

- [x] Test with various Symfony controller patterns
- [x] Test with different render method signatures
- [x] Test with templates in various locations
- [x] Fix any issues found

**Dependencies:** Tasks 3.5, 3.6

---

### Task 3.8: Add Configuration to package.json
**Priority:** Medium | **Estimate:** 1-2 hours | **Status:** completed

Add the configuration schema to package.json.

- [x] Add configuration section to package.json
- [x] Include all configuration properties from design.md
- [x] Test that configuration is readable via ConfigManager

**Files to modify:**
- `package.json`

**Dependencies:** Task 1.2

---

## Phase 4: Optimization

### Task 4.1: Profile Performance
**Priority:** Medium | **Estimate:** 2-3 hours | **Status:** completed

Measure current performance and identify bottlenecks.

- [x] Measure startup time with eager indexing (via profiler)
- [x] Measure memory usage (via profiler)
- [x] Measure resolution times (cached, indexed, fallback)
- [x] Identify performance bottlenecks (logging in place)
- [x] Document findings (profiler prints summary on deactivate)

**Dependencies:** All previous tasks

---

### Task 4.2: Optimize Critical Paths
**Priority:** Medium | **Estimate:** 3-4 hours | **Status:** completed

Optimize based on profiling results.

- [x] Optimize indexing speed (parallel indexing implemented)
- [x] Optimize cache hit rate (LRU cache with configurable TTL)
- [x] Optimize file search patterns (using config patterns)
- [x] Consider parallel indexing (implemented in indexWorkspace)
- [x] Adjust default cache TTLs (configured in defaults)

**Dependencies:** Task 4.1

---

### Task 4.3: Add Configuration Change Handler
**Priority:** Low | **Estimate:** 1-2 hours | **Status:** completed

Handle configuration changes without restart.

- [x] Watch for configuration changes
- [x] Reinitialize components when config changes
- [x] Re-index when relevant config changes

**Files to modify:**
- `src/extension.ts`

**Dependencies:** Task 1.2

---

### Task 4.4: Add Error Handling and Logging
**Priority:** Low | **Estimate:** 2-3 hours | **Status:** completed

Improve error handling and add debugging support.

- [x] Add comprehensive error handling
- [x] Add debug logging (configurable)
- [x] Add user-friendly error messages where appropriate

**Dependencies:** All previous tasks

---

### Task 4.5: Write Comprehensive Tests
**Priority:** Medium | **Estimate:** 4-5 hours | **Status:** completed

Write tests for all components.

- [x] Write unit tests for cache
- [x] Write unit tests for FileSystem
- [x] Write unit tests for resolvers (basic)
- [x] Write integration tests for providers (basic)
- [x] Write unit tests for indexer
- [x] Write unit tests for types

**Dependencies:** All previous tasks

---

## Task Summary by Phase

| Phase | Tasks | Total Estimate |
|-------|-------|----------------|
| Phase 1: Foundation | 6 tasks | 14-19 hours |
| Phase 2: Resolvers | 7 tasks | 24-32 hours |
| Phase 3: New Features | 8 tasks | 24-34 hours |
| Phase 4: Optimization | 5 tasks | 12-17 hours |
| **Total** | **26 tasks** | **74-102 hours** |

## Task Summary by Priority

| Priority | Tasks | Total Estimate |
|----------|-------|----------------|
| High | 13 tasks | 37-49 hours |
| Medium | 13 tasks | 28-40 hours |
| Low | 2 tasks | 3-5 hours |

## Suggested Implementation Order

To minimize risk and ensure incremental progress:

1. **Task 1.1**: Type Definitions (foundation)
2. **Task 1.3**: Cache Implementation (foundation)
3. **Task 1.2**: Configuration System (foundation)
4. **Task 1.4**: FileSystem Abstraction (foundation)
5. **Task 1.5**: Workspace Indexer (foundation)
6. **Task 1.6**: Update extension.ts (foundation)
7. **Task 2.1**: Resolver Interface and Dispatcher
8. **Task 2.2**: Twig Template Resolver
9. **Task 2.3**: Symfony Route Resolver
10. **Task 2.4**: Update Resolver Dispatcher
11. **Task 2.5**: Create Provider Layer
12. **Task 2.6**: Update extension.ts to Use New Providers
13. **Task 2.7**: Test Existing Functionality
14. **Task 3.1**: Implement Workspace Watcher
15. **Task 3.2**: Implement Full Route Indexing
16. **Task 3.3**: Implement Full Controller Indexing
17. **Task 3.4**: Create PHP → Twig Resolver
18. **Task 3.5**: Create PHP Definition Provider
19. **Task 3.6**: Add PHP Language Support
20. **Task 3.7**: Test New PHP → Twig Functionality
21. **Task 3.8**: Add Configuration to package.json
22. **Task 4.1**: Profile Performance
23. **Task 4.2**: Optimize Critical Paths
24. **Task 4.3**: Add Configuration Change Handler
25. **Task 4.4**: Add Error Handling and Logging
26. **Task 4.5**: Write Comprehensive Tests

## Milestones

### Milestone 1: Foundation Complete
**Target:** After Task 1.6
- All foundational components created
- Extension still works with existing functionality
- Ready to begin resolver migration

### Milestone 2: Resolvers Complete
**Target:** After Task 2.7
- All existing functionality migrated to new architecture
- All tests passing
- Ready to add new features

### Milestone 3: New Features Complete
**Target:** After Task 3.8
- PHP → Twig navigation working
- Indexing and watching working
- Configuration working
- Ready for optimization

### Milestone 4: Release Ready
**Target:** After Task 4.5
- All optimization tasks complete
- All tests passing
- Performance targets met
- Ready for release

## Next Steps

1. Review these tasks and adjust estimates/priorities as needed
2. Assign tasks to team members (if applicable)
3. Begin implementation with Task 1.1: Create Type Definitions
4. Track progress and update status as tasks are completed
5. Conduct regular reviews to ensure architecture consistency
