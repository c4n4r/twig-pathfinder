// src/utils/logger.ts
// Logging utility

import * as vscode from 'vscode';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
}

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private config: LoggerConfig;

  constructor(name: string, config: LoggerConfig = { level: 'info', enabled: true }) {
    this.outputChannel = vscode.window.createOutputChannel(name);
    this.config = config;
  }

  debug(message: string, ...args: any[]): void {
    if (!this.config.enabled || this.shouldLog('debug')) return;
    this.log('DEBUG', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    if (!this.config.enabled || this.shouldLog('info')) return;
    this.log('INFO', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    if (!this.config.enabled || this.shouldLog('warn')) return;
    this.log('WARN', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    if (!this.config.enabled || this.shouldLog('error')) return;
    this.log('ERROR', message, ...args);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.config.level);
    const targetIndex = levels.indexOf(level);
    return targetIndex >= currentIndex;
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (args.length > 0) {
      console.log(formattedMessage, ...args);
      this.outputChannel.appendLine(`${formattedMessage} ${JSON.stringify(args)}`);
    } else {
      console.log(formattedMessage);
      this.outputChannel.appendLine(formattedMessage);
    }
  }

  show(): void {
    this.outputChannel.show();
  }

  hide(): void {
    this.outputChannel.hide();
  }

  clear(): void {
    this.outputChannel.clear();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }

  updateConfig(config: LoggerConfig): void {
    this.config = config;
  }
}

// Global logger instance
let logger: Logger | null = null;

export function getLogger(name: string = 'Twig Open Include'): Logger {
  if (!logger) {
    logger = new Logger(name);
  }
  return logger;
}

export function setLogger(newLogger: Logger): void {
  logger = newLogger;
}
