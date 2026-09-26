import { ALL_DETECTORS } from '../hooks/lib/detectors/index.js';

/** Run one detector by id, so a test cannot accidentally assert another rule's output. */
export function run(detectorId, source, filePath = 'src/services/order.ts') {
  const detector = ALL_DETECTORS.find((candidate) => candidate.id === detectorId);
  if (!detector) throw new Error(`No detector registered with id "${detectorId}"`);
  return detector.run(source, filePath) ?? [];
}

export function lines(findings) {
  return findings.map((f) => f.line);
}
