# Twig Open Include - Agent Instructions

## Build & Test
- `npm install` - Install dependencies
- `npm run compile` - Compile TypeScript to `out/`
- `F5` in VS Code - Launch Extension Development Host

## Architecture
- VS Code extension written in TypeScript
- Entry: `src/extension.ts` → compiled to `out/extension.js`
- Language support: Twig templates (`.twig` files)

## Key Features
- Detects `{% include %}`, `{% extends %}`, `{% embed %}` patterns
- Resolves Twig template paths to files
- Resolves Symfony routes in `path()`/`url()` calls to PHP controllers
- Supports both PHP attributes (`#[Route]`) and annotations (`@Route`)
- Supports YAML route files (`config/routes/*.yml`)

## Search Exclusions
- Excludes `**/{node_modules,vendor}/**` from file searches

## File Resolution
- Twig templates: checks direct path, `templates/` prefix, and filename search
- PHP controllers: searches by class short name, verifies namespace + class name
- Routes: checks PHP files first, then YAML route files
