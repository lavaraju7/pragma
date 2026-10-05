import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const ROOT_PLACEHOLDER = '{{PRAGMA_ROOT}}';

/**
 * The per-project installers (Cursor, Antigravity, Windsurf) all do the same
 * three things around their host-specific layout: swap the {{PRAGMA_ROOT}}
 * placeholder for this checkout's real path, report paths relative to the
 * project being installed into, and copy the shared command templates across.
 * Each had its own copy until a third arrived; this is the one place they live.
 */

/** Accepts a string or any JSON-able value; always hands back the same kind. */
export function substitutePaths(value, root) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const replaced = text.replaceAll(ROOT_PLACEHOLDER, root.replaceAll('\\', '/'));
  return typeof value === 'string' ? replaced : JSON.parse(replaced);
}

/** `file` is always an absolute path an installer already built under `target`. */
export function describeUnderTarget(file, target) {
  return file.slice(target.length + 1).replaceAll('\\', '/');
}

/** Copies every template across with the root substituted; returns their slash-command names. */
export function installTemplates(sourceDir, targetDir, root) {
  mkdirSync(targetDir, { recursive: true });

  return readdirSync(sourceDir).map((name) => {
    writeFileSync(join(targetDir, name), substitutePaths(readFileSync(join(sourceDir, name), 'utf8'), root), 'utf8');
    return `/${basename(name, '.md')}`;
  });
}

/**
 * Add pragma's hook entries to an existing { event: [entries] } map without
 * disturbing anything already in it: an entry is skipped when one with the same
 * command is already registered, so re-running an installer never duplicates,
 * and every other tool's entries stay exactly as they were. (Antigravity's
 * schema is namespaced by hook name instead, so its installer doesn't use this.)
 *
 * The scan inside the loop is over the handful of hooks one project registers by
 * hand — see .pragma/debt.md.
 */
export function mergeHooksByCommand(existingHooks, templateHooks) {
  for (const [event, entries] of Object.entries(templateHooks)) {
    existingHooks[event] ??= [];
    for (const entry of entries) {
      const alreadyPresent = existingHooks[event].some((existing) => existing.command === entry.command);
      if (!alreadyPresent) existingHooks[event].push(entry);
    }
  }
}
