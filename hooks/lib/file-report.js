import { readFileSync } from 'node:fs';
import { analyze } from './detectors/index.js';
import { formatFindings } from './report.js';

/**
 * Read each file as it is on disk now, run the detectors the active mode enables,
 * and format whatever they find — one block per file, blank-line separated, or ''
 * when there is nothing to say. What differs per host is only how that text gets
 * back out (a JSON field, plain stdout), so that stays in each adapter.
 */
export function reportForFiles(files, config) {
  return files
    .map((file) => ({ file, source: readSafely(file) }))
    .filter(({ source }) => source)
    .map(({ file, source }) => formatFindings(
      analyze(source, file, { tiers: config.tiers, disabled: config.disabledDetectors }),
      file,
      config.maxFindings,
    ))
    .filter(Boolean)
    .join('\n\n');
}

function readSafely(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}
