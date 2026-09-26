/** The enforcement-mode vocabulary. Kept separate so both config.js (which turns a
 * mode into active tiers) and project-mode.js (which reads/writes the mode itself)
 * can depend on it without importing each other. */
export const MODES = ['off', 'lite', 'standard', 'strict'];

export function normalizeMode(value) {
  const mode = String(value ?? '').trim().toLowerCase();
  return MODES.includes(mode) ? mode : undefined;
}
