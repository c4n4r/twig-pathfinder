// src/utils/path-utils.test.ts
// Unit tests for path utilities

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import {
  normalizePath,
  joinPaths,
  getRelativePath,
  getBasename,
  getDirname,
  getExtension,
  removeLeadingSlash,
  addLeadingSlash,
} from './path-utils';

describe('Path Utilities', () => {
  describe('normalizePath', () => {
    it('should normalize path with double slashes', () => {
      expect(normalizePath('path//to//file')).toBe(path.normalize('path//to//file'));
    });

    it('should handle empty path', () => {
      expect(normalizePath('')).toBe(path.normalize(''));
    });

    it('should handle path with dots', () => {
      expect(normalizePath('path/./to/../file')).toBe(path.normalize('path/./to/../file'));
    });
  });

  describe('joinPaths', () => {
    it('should join multiple path segments', () => {
      expect(joinPaths('dir', 'subdir', 'file.txt')).toBe(path.join('dir', 'subdir', 'file.txt'));
    });

    it('should handle empty segments', () => {
      expect(joinPaths('dir', '', 'file.txt')).toBe(path.join('dir', '', 'file.txt'));
    });

    it('should handle single segment', () => {
      expect(joinPaths('file.txt')).toBe(path.join('file.txt'));
    });

    it('should handle no segments', () => {
      expect(joinPaths()).toBe(path.join());
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path from one directory to another', () => {
      const from = '/path/to/dir';
      const to = '/path/to/dir/file.txt';
      expect(getRelativePath(from, to)).toBe(path.relative(from, to));
    });

    it('should handle same directory', () => {
      const from = '/path/to/dir';
      const to = '/path/to/dir';
      expect(getRelativePath(from, to)).toBe(path.relative(from, to));
    });

    it('should handle parent directory', () => {
      const from = '/path/to/dir/subdir';
      const to = '/path/to/dir';
      expect(getRelativePath(from, to)).toBe(path.relative(from, to));
    });
  });

  describe('getBasename', () => {
    it('should return filename without directory', () => {
      expect(getBasename('/path/to/file.txt')).toBe('file.txt');
    });

    it('should return filename without extension', () => {
      expect(getBasename('/path/to/file.txt')).toBe(path.basename('/path/to/file.txt'));
    });

    it('should handle path with trailing slash', () => {
      expect(getBasename('/path/to/')).toBe(path.basename('/path/to/'));
    });

    it('should handle simple filename', () => {
      expect(getBasename('file.txt')).toBe(path.basename('file.txt'));
    });
  });

  describe('getDirname', () => {
    it('should return directory path', () => {
      expect(getDirname('/path/to/file.txt')).toBe('/path/to');
    });

    it('should handle path with trailing slash', () => {
      expect(getDirname('/path/to/')).toBe(path.dirname('/path/to/'));
    });

    it('should handle simple filename', () => {
      expect(getDirname('file.txt')).toBe(path.dirname('file.txt'));
    });
  });

  describe('getExtension', () => {
    it('should return file extension', () => {
      expect(getExtension('file.txt')).toBe('.txt');
    });

    it('should return empty string for no extension', () => {
      expect(getExtension('file')).toBe(path.extname('file'));
    });

    it('should handle multiple dots', () => {
      expect(getExtension('file.tar.gz')).toBe('.gz');
    });

    it('should handle hidden files', () => {
      expect(getExtension('.gitignore')).toBe(path.extname('.gitignore'));
    });
  });

  describe('removeLeadingSlash', () => {
    it('should remove leading slash', () => {
      expect(removeLeadingSlash('/path/to/file')).toBe('path/to/file');
    });

    it('should not modify path without leading slash', () => {
      expect(removeLeadingSlash('path/to/file')).toBe('path/to/file');
    });

    it('should handle empty string', () => {
      expect(removeLeadingSlash('')).toBe('');
    });

    it('should handle multiple leading slashes', () => {
      expect(removeLeadingSlash('//path/to/file')).toBe('/path/to/file');
    });
  });

  describe('addLeadingSlash', () => {
    it('should add leading slash', () => {
      expect(addLeadingSlash('path/to/file')).toBe('/path/to/file');
    });

    it('should not modify path with leading slash', () => {
      expect(addLeadingSlash('/path/to/file')).toBe('/path/to/file');
    });

    it('should handle empty string', () => {
      expect(addLeadingSlash('')).toBe('/');
    });
  });
});
