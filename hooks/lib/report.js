import { TIER_RANK } from './config.js';
import { normalize } from './source.js';

/**
 * Findings are ranked safety first and capped, because this text is injected into
 * the session after every edit. A long list gets skimmed; a short one gets fixed.
 */
export function rank(findings) {
  return [...findings].sort((a, b) => (TIER_RANK[a.tier] - TIER_RANK[b.tier])
    || (a.line - b.line)
    || a.detector.localeCompare(b.detector));
}

export function formatFindings(findings, filePath, maxFindings) {
  if (!findings.length) return '';

  const ranked = rank(findings);
  const shownFindings = ranked.slice(0, maxFindings);
  const labelWidth = Math.max(...shownFindings.map((f) => `${f.principle} ${f.title}`.length));

  const lines = [
    `pragma — ${count(ranked.length, 'finding')} in ${normalize(filePath)}`,
    ...shownFindings.map((f) => `  ${`${f.principle} ${f.title}`.padEnd(labelWidth)}  :${f.line}  ${f.message}`
      + `\n  ${' '.repeat(labelWidth)}       ${f.fix}`),
  ];

  if (ranked.length > shownFindings.length) {
    lines.push(`  ...and ${ranked.length - shownFindings.length} more. Run /pragma:review for the full list.`);
  }

  lines.push('', 'Fix these before moving on. If a deviation is deliberate, record it with /pragma:debt'
    + ' rather than leaving it unexplained.');

  return lines.join('\n');
}

function count(n, noun) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
