# Change: Architecture Refactor for Performance and Extensibility

## Overview

This change refactors the Twig Open Include VS Code extension from a monolithic implementation into a modular, performant architecture that supports bidirectional navigation and enables future feature expansion.

## Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [Proposal](proposal.md) | High-level vision, scope, and success criteria | ✅ Complete |
| [Design](design.md) | Detailed architecture and component specifications | ✅ Complete |
| [Tasks](tasks.md) | Implementation breakdown and timeline | ✅ Complete |
| [Configuration Spec](specs/configuration/spec.md) | Configuration system specification | ✅ Complete |

## Quick Links

- **Start here:** [Proposal](proposal.md)
- **Technical details:** [Design](design.md)
- **Implementation plan:** [Tasks](tasks.md)
- **Configuration:** [Configuration Spec](specs/configuration/spec.md)

## Status

| Phase | Status | Completion |
|-------|--------|------------|
| Proposal | ✅ Complete | 100% |
| Design | ✅ Complete | 100% |
| Tasks | ✅ Complete | 100% |
| Implementation | ⏳ Not Started | 0% |

## Key Decisions

Based on user input, the following architectural decisions have been made:

1. **Eager Indexing**: Pre-index Twig templates on startup for fast resolution
2. **Watch All Files**: Monitor all workspace files for changes
3. **New Definition Provider**: Add a separate DefinitionProvider for PHP files (new feature)
4. **Configurable**: All behaviors are configurable with sensible defaults

## What's New

### Bidirectional Navigation
- **Twig → Target**: Existing functionality (includes, extends, embed, routes)
- **PHP → Twig**: New functionality (controller render() calls → Twig templates)

### Performance Improvements
- Eager workspace indexing
- LRU caching for file operations and resolutions
- Parallel resolution where possible
- Debounced file watching

### Architecture Improvements
- Modular design with clear separation of concerns
- Resolver pattern for extensible resolution
- FileSystem abstraction with caching
- Workspace indexer for fast lookups

## Implementation Phases

### Phase 1: Foundation (14-19 hours)
Create base infrastructure without breaking existing functionality.

### Phase 2: Resolvers (19-26 hours)
Migrate existing resolution logic to the new resolver system.

### Phase 3: New Features (20-27 hours)
Implement PHP → Twig navigation and indexing.

### Phase 4: Optimization (12-17 hours)
Fine-tune performance and add polish.

**Total Estimated Time:** 74-102 hours

## Getting Started

To begin implementation:

1. Review the [Proposal](proposal.md) to understand the vision
2. Review the [Design](design.md) to understand the architecture
3. Start with [Task 1.1: Create Type Definitions](tasks.md#task-11-create-type-definitions)
4. Follow the [suggested implementation order](tasks.md#suggested-implementation-order)

## Directory Structure

After implementation, the project structure will be:

```
src/
├── extension.ts                    # Main entry point
├── config/                        # Configuration system
│   ├── defaults.ts               # Default values
│   ├── schema.ts                 # JSON schema
│   └── manager.ts                # Configuration manager
├── types/                        # Type definitions
│   ├── index.ts                  # Main exports
│   ├── config.ts                 # Configuration types
│   ├── resolve-context.ts        # ResolveContext interface
│   └── filesystem.ts              # FileSystem interface
├── providers/                    # VS Code providers
│   ├── index.ts                  # Exports
│   ├── document-link-provider.ts # DocumentLink for Twig
│   ├── twig-definition-provider.ts # Definition for Twig
│   └── php-definition-provider.ts # Definition for PHP (NEW)
├── resolvers/                    # Resolution logic
│   ├── index.ts                  # Exports
│   ├── resolver.ts               # Base interface
│   ├── dispatcher.ts             # Dispatcher
│   ├── twig/
│   │   └── twig-template-resolver.ts
│   └── symfony/
│       ├── symfony-route-resolver.ts
│       ├── php-route-resolver.ts
│       ├── yaml-route-resolver.ts
│       ├── controller-resolver.ts
│       └── php-controller-twig-resolver.ts (NEW)
├── filesystem/                   # File system abstraction
│   ├── index.ts                  # Exports
│   ├── file-system.ts            # Interface
│   └── cached-file-system.ts     # Cached implementation
├── indexer/                      # Workspace indexing
│   ├── index.ts                  # Exports
│   ├── workspace-indexer.ts      # Main indexer
│   └── workspace-watcher.ts      # File watcher
├── cache/                        # Caching
│   ├── index.ts                  # Exports
│   ├── cache.ts                  # Base interface
│   └── lru-cache.ts              # LRU implementation
└── utils/                        # Utilities
    ├── index.ts                  # Exports
    ├── path-utils.ts             # Path utilities
    └── string-utils.ts            # String utilities
```

## Configuration

The extension will support comprehensive configuration. See [Configuration Spec](specs/configuration/spec.md) for details.

Example configuration:

```json
{
  "twigPathfinder": {
    "indexing": {
      "enabled": true,
      "eagerIndexTwig": true
    },
    "twig": {
      "templateDirectories": ["templates", ""],
      "fileExtensions": [".twig"]
    },
    "cache": {
      "enabled": true,
      "maxSize": 1000
    },
    "watch": {
      "enabled": true,
      "debounceMs": 500
    }
  }
}
```

## Testing

Each phase includes testing tasks. Comprehensive testing is planned for:
- Unit tests for individual components
- Integration tests for complete flows
- Performance tests for critical paths
- Manual testing with real Symfony projects

## Success Criteria

The change will be considered successful when:

- [ ] Extension activates and provides same functionality as before
- [ ] Twig → Template navigation works (existing feature)
- [ ] Twig → Route navigation works (existing feature)
- [ ] PHP → Twig template navigation works (new feature)
- [ ] Configuration changes are reflected without restart
- [ ] File changes are detected and indexes updated
- [ ] Startup time with eager indexing is acceptable (< 10 seconds for medium projects)
- [ ] Memory usage is reasonable (< 50 MB for medium projects)
- [ ] All tests pass

## Next Steps

1. **Review**: Review all documents in this change directory
2. **Refine**: Adjust estimates, priorities, or scope as needed
3. **Approve**: Approve the proposal to begin implementation
4. **Implement**: Start with Task 1.1 and follow the implementation order
5. **Track**: Update task status as implementation progresses

## Related Changes

This is the first major change for the Twig Open Include extension. Future changes might include:
- Adding support for additional Twig constructs (import, from, asset)
- Adding support for additional frameworks (Laravel, WordPress)
- Adding new provider types (Hover, CodeLens)
- Adding diagnostic features

## Changelog Entry

When this change is released, the changelog entry might look like:

```markdown
## [0.2.0] - YYYY-MM-DD

### Added
- Bidirectional navigation: Navigate from Symfony controllers to Twig templates
- Comprehensive configuration system for customizing extension behavior
- Workspace indexing for faster template and route resolution
- File watching to keep indexes up to date

### Changed
- Refactored extension architecture for better maintainability and extensibility
- Improved performance with caching and parallel resolution

### Performance
- Faster template resolution with eager indexing
- Reduced redundant file operations with caching
- Parallel route resolution for improved speed
```

## Questions or Concerns?

If you have any questions about this change:

1. Review the [Proposal](proposal.md) for the vision and scope
2. Review the [Design](design.md) for technical details
3. Review the [Tasks](tasks.md) for implementation details
4. Open an issue or start a discussion

---

**Status:** Proposal Complete | **Last Updated:** 2026-05-09 | **Author:** opencode
