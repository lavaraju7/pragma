import { JS_AND_PY, codeLines, finding, isTestFile, withoutRegexLiterals } from '../source.js';

const P2 = { principle: 'P2', title: 'DRY', tier: 'design' };

const MIN_OCCURRENCES = 3;
// Scanning left to right and consuming each literal whole is what keeps the gap
// between two literals ("', title: '") from being read as a literal itself.
const STRING_LITERAL = /'([^'\n]*)'|"([^"\n]*)"/g;
const MIN_LITERAL_LENGTH = 4;
const NUMBER_LITERAL = /(?<![\w.])(\d{2,})(?![\w.])/g;

/** Import paths, format fragments and the boilerplate that carries no rule. */
const NOT_A_RULE = /^(?:\.{1,2}\/|[\w-]+\/|use strict$|utf-?8$|application\/|text\/)|[{}]/i;
const UNREMARKABLE_NUMBER = /^(?:10|100|1000|12|24|60|365|200|201|204|400|401|403|404|500)$/;

const repeatedLiteral = {
  id: 'dup/repeated-literal',
  ...P2,
  extensions: JS_AND_PY,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    const occurrences = new Map();
    for (const line of codeLines(source)) {
      if (/^(?:import|from|export|require|#include)\b/.test(line.trimmed)) continue;

      for (const match of withoutRegexLiterals(line.text).matchAll(STRING_LITERAL)) {
        const value = match[1] ?? match[2];
        if (value.length >= MIN_LITERAL_LENGTH && !NOT_A_RULE.test(value)) {
          record(occurrences, `"${value}"`, line.number);
        }
      }
      for (const [, value] of line.text.matchAll(NUMBER_LITERAL)) {
        if (!UNREMARKABLE_NUMBER.test(value)) record(occurrences, value, line.number);
      }
    }

    return [...occurrences.entries()]
      .filter(([, lines]) => lines.length >= MIN_OCCURRENCES)
      .map(([value, lines]) => finding({
        detector: repeatedLiteral.id,
        ...P2,
        line: lines[0],
        message: `${value} appears ${lines.length} times (lines ${lines.join(', ')})`,
        fix: 'If this encodes a rule, name it once and reference the name. If the repeats mean different things, leave them.',
      }));
  },
};

const WINDOW_LINES = 5;

/** Identical runs of statements inside one file — the easy half of DRY. */
const duplicateBlock = {
  id: 'dup/duplicate-block',
  ...P2,
  tier: 'strict',
  extensions: JS_AND_PY,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    const lines = codeLines(source).filter((line) => line.trimmed.length > 3 && line.trimmed !== '}');
    const windows = new Map();

    for (let start = 0; start + WINDOW_LINES <= lines.length; start += 1) {
      const windowLines = lines.slice(start, start + WINDOW_LINES);
      const key = windowLines.map((line) => line.trimmed).join('\n');
      record(windows, key, windowLines[0].number);
    }

    return [...windows.entries()]
      .filter(([, starts]) => starts.length > 1 && !overlapping(starts))
      .slice(0, 1)
      .map(([, starts]) => finding({
        detector: duplicateBlock.id,
        ...P2,
        tier: 'strict',
        line: starts[0],
        message: `${WINDOW_LINES} identical lines repeated at lines ${starts.join(' and ')}`,
        fix: 'Extract them into a named function — but only if both copies encode the same rule.',
      }));
  },
};

function record(map, key, line) {
  const existing = map.get(key);
  if (existing) existing.push(line);
  else map.set(key, [line]);
}

function overlapping(starts) {
  return starts.some((start, index) => index > 0 && start - starts[index - 1] < WINDOW_LINES);
}

export default [repeatedLiteral, duplicateBlock];
