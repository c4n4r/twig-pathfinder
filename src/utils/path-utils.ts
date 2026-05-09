// src/utils/path-utils.ts
// Path manipulation utilities

import * as path from 'path';

export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

export function joinPaths(...parts: string[]): string {
  return path.join(...parts);
}

export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

export function getBasename(filePath: string): string {
  return path.basename(filePath);
}

export function getDirname(filePath: string): string {
  return path.dirname(filePath);
}

export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

export function removeLeadingSlash(str: string): string {
  return str.startsWith('/') ? str.slice(1) : str;
}

export function addLeadingSlash(str: string): string {
  return str.startsWith('/') ? str : `/${str}`;
}
