import { hasExtension } from '../source.js';
import complexity from './complexity.js';
import configuration from './configuration.js';
import coupling from './coupling.js';
import duplication from './duplication.js';
import naming from './naming.js';
import safety from './safety.js';
import sharedState from './shared-state.js';

export const ALL_DETECTORS = [
  ...safety,
  ...sharedState,
  ...configuration,
  ...naming,
  ...coupling,
  ...duplication,
  ...complexity,
];

export function selectDetectors({ filePath, tiers = [], disabled = [] }) {
  return ALL_DETECTORS.filter((detector) => tiers.includes(detector.tier)
    && !disabled.includes(detector.id)
    && hasExtension(filePath, detector.extensions));
}

/**
 * Runs the selected detectors over one file. A detector that throws is skipped
 * rather than allowed to take the whole hook down with it.
 */
export function analyze(source, filePath, options = {}) {
  return selectDetectors({ filePath, ...options }).flatMap((detector) => {
    try {
      return detector.run(source, filePath) ?? [];
    } catch {
      return [];
    }
  });
}
