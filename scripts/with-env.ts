#!/usr/bin/env node
/**
 * Environment-aware script wrapper
 *
 * Loads env file then executes the given command.
 *
 * Usage:
 *   tsx scripts/with-env.ts <command> [args...]
 *   NODE_ENV=production tsx scripts/with-env.ts <command> [args...]
 *   ENV_FILE=.env.production tsx scripts/with-env.ts <command> [args...]
 *
 * Priority: ENV_FILE > .env.{NODE_ENV} > .env.local > .env
 */
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';

function loadEnv(filePath: string) {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  return true;
}

// Determine which env files to load
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = process.env.ENV_FILE;

const filesToTry = envFile
  ? [envFile]
  : [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env.local', '.env'];

let loaded = false;
for (const file of filesToTry) {
  const fullPath = resolve(file);
  if (loadEnv(fullPath)) {
    console.log(`📄 Loaded: ${file}`);
    loaded = true;
  }
}

if (!loaded) {
  console.log('⚠️  No env file found, using process environment');
}

// Get command
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ No command provided');
  process.exit(1);
}

const command = args.join(' ');
console.log(`▶️  ${command}\n`);

try {
  let executable = args[0];
  let commandArgs = args.slice(1);
  // Execute local JS entrypoints with Node; .cmd shims are not executables on Windows.
  if (['drizzle-kit', 'tsx'].includes(executable)) {
    const packagePath = resolve('node_modules', executable, 'package.json');
    const metadata = JSON.parse(readFileSync(packagePath, 'utf8')) as {
      bin: string | Record<string, string>;
    };
    const entry =
      typeof metadata.bin === 'string'
        ? metadata.bin
        : metadata.bin[executable];
    if (!entry) throw new Error('Missing local command entrypoint');
    commandArgs = [resolve(dirname(packagePath), entry), ...commandArgs];
    executable = process.execPath;
  }
  execFileSync(executable, commandArgs, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
} catch {
  process.exit(1);
}
