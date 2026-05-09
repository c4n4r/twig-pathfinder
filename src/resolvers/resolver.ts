// src/resolvers/resolver.ts
// Base Resolver interface

import { ResolveContext } from '../types/resolve-context';
import * as vscode from 'vscode';

export interface Resolver<TContext extends ResolveContext, TResult> {
  canResolve(context: TContext): boolean;
  resolve(context: TContext): Promise<TResult | null>;
}
