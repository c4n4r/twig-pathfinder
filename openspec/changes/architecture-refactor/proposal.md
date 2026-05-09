# Change Proposal: Architecture Refactor for Performance and Extensibility

## Summary

Refactor the Twig Open Include extension from a monolithic implementation into a modular, performant architecture that supports bidirectional navigation (Twig ↔ PHP) and enables future feature expansion.

## Motivation

The current implementation has several limitations:

1. **Monolithic Code**: All logic (391 lines) is in `extension.ts`, making it difficult to:
   - Add new features (e.g., PHP → Twig navigation)
   - Test individual components
   - Maintain as the codebase grows

2. **Performance Issues**:
   - No caching of resolved paths
   - Sequential file searches
   - Repeated file reads for the same resources
   - No workspace indexing

3. **No Bidirectional Navigation**: Currently only supports Twig → Target navigation. Users cannot navigate from Symfony controllers to Twig templates.

4. **Limited Extensibility**: Adding support for new frameworks (Laravel, WordPress) or new Twig constructs (import, from, asset) requires invasive changes.

## Goals

- Modular architecture with clear separation of concerns
- Eager workspace indexing for fast resolution
- Comprehensive caching layer
- Support for PHP → Twig navigation
- Configurable behavior with sensible defaults
- File watching to keep indexes up to date
- Foundation for future feature expansion

## Non-Goals

- Adding support for additional frameworks (Laravel, WordPress, Drupal) in this change
- Implementing hover providers or other new UI features
- Adding diagnostic/error reporting features
- Code linting or formatting improvements

## Scope

### In Scope

1. **Architecture Refactor**:
   - Split monolithic `extension.ts` into modular components
   - Create provider layer (DocumentLink, Definition for Twig and PHP)
   - Create resolver layer with dispatcher pattern
   - Create filesystem abstraction with caching
   - Create workspace indexer

2. **Performance Improvements**:
   - Eager indexing of Twig templates on startup
   - LRU caching for file operations and resolutions
   - Parallel resolution where possible
   - Debounced file watching

3. **New Features**:
   - PHP DefinitionProvider for controller → Twig navigation
   - Configuration system for all behaviors

### Out of Scope

- Adding new Twig constructs (import, from, asset, etc.)
- Adding support for additional PHP frameworks
- Implementing new provider types (Hover, CodeLens, etc.)
- Advanced error handling and user feedback

## Success Criteria

- [ ] Extension activates and provides same functionality as before
- [ ] Twig → Template navigation works (existing feature)
- [ ] Twig → Route navigation works (existing feature)
- [ ] PHP → Twig template navigation works (new feature)
- [ ] Configuration changes are reflected without restart
- [ ] File changes are detected and indexes updated
- [ ] Startup time with eager indexing is acceptable (< 10 seconds for medium projects)
- [ ] Memory usage is reasonable (< 50 MB for medium projects)
- [ ] All existing tests pass (if any exist)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Startup time too long with eager indexing | Medium | High | Allow users to disable eager indexing via config; show progress notification |
| Memory usage too high with indexing | Medium | High | Implement memory limits; allow users to disable indexing |
| Breaking existing functionality | Medium | High | Comprehensive testing; incremental migration |
| Complexity overwhelming for maintenance | Low | Medium | Clear documentation; modular design |
| Performance worse than current | Low | Medium | Benchmark before and after; optimize critical paths |

## Open Questions

1. Should we support incremental indexing (only index changed files on startup) as an alternative to full eager indexing?
2. What should the default cache TTL values be?
3. Should we implement a persistent index (stored on disk) to speed up startup?
4. How should we handle very large workspaces (> 10,000 files)?

## Next Steps

1. Review and approve this proposal
2. Finalize the detailed design (see `design.md`)
3. Break down implementation into tasks (see `tasks.md`)
4. Begin implementation with the foundation (types, config, filesystem)
5. Implement indexing and caching
6. Migrate existing functionality to new architecture
7. Add PHP DefinitionProvider
8. Test and optimize performance
9. Release as new version

## Related Documents

- [Design](design.md) - Detailed architecture and component specifications
- [Tasks](tasks.md) - Implementation breakdown and timeline
- [Configuration Schema](specs/configuration/spec.md) - Configuration options specification
