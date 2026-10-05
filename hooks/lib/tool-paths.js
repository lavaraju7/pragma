import { isAbsolute, resolve } from 'node:path';

/**
 * Which file(s) did an editing tool call touch? Every host names the argument
 * differently and none of their docs pin it down for every editing tool, so this
 * is the one place that knows the plausible names — the Cursor, Antigravity and
 * Copilot adapters all ask here rather than each keeping its own copy of the list.
 * A miss returns nothing, and the caller treats that as "not a file edit".
 */
const PATH_KEYS = ['file_path', 'path', 'filePath', 'target_file', 'targetFile', 'AbsolutePath'];

const PATCH_MARKER = '*** Begin Patch';
const PATCH_FILE_HEADER = /^\*\*\* (?:Add|Update) File: (.+)$/gm;

export function pathFromArgs(args) {
  return PATH_KEYS.map((key) => args?.[key]).find(Boolean);
}

/**
 * Tool arguments arrive as an object on most hosts but as a JSON string on some
 * (Copilot's camelCase payloads); accept both.
 */
export function normalizeArgs(args) {
  if (typeof args !== 'string') return args ?? {};
  try {
    const parsed = JSON.parse(args);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * A patch-style tool (Copilot's apply_patch) carries no path argument — the files
 * are named inside the patch text, one `*** Add File:` / `*** Update File:`
 * header each, and one call can touch several.
 */
function pathsFromPatches(args) {
  return Object.values(args)
    .filter((value) => typeof value === 'string' && value.includes(PATCH_MARKER))
    .flatMap((patch) => [...patch.matchAll(PATCH_FILE_HEADER)].map((match) => match[1].trim()));
}

/** Absolute paths for every file the call touched, resolved against `cwd` when relative. */
export function pathsFromToolCall(rawArgs, cwd) {
  const args = normalizeArgs(rawArgs);
  const candidatePaths = [pathFromArgs(args), ...pathsFromPatches(args)].filter(Boolean);
  const base = cwd || process.cwd();
  return [...new Set(candidatePaths.map((path) => (isAbsolute(path) ? path : resolve(base, path))))];
}
