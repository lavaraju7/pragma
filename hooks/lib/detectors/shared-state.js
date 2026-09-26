import { JS, codeLines, finding, withDepth } from '../source.js';

const P9 = { principle: 'P9', title: 'Shared State', tier: 'safety' };

const MODULE_BINDING = /^(?:export\s+)?(?:let|var)\s+([A-Za-z_$][\w$]*)/;

function reassignmentPattern(name) {
  return new RegExp(`(?:^|[^.\\w$])${name}\\s*(?:=[^=]|\\+=|-=|\\*=|\\/=|\\+\\+|--)`);
}

/** A module-level binding that anything in the file can reassign is shared mutable state. */
const moduleMutable = {
  id: 'state/module-mutable',
  ...P9,
  extensions: JS,
  run(source) {
    const lines = withDepth(source);
    const declarations = lines
      .filter((line) => line.depthBefore === 0)
      .map((line) => ({ line, match: MODULE_BINDING.exec(line.trimmed) }))
      .filter(({ match }) => match);

    return declarations
      .filter(({ line, match }) => lines.some((candidate) => candidate.number !== line.number
        && reassignmentPattern(match[1]).test(candidate.code)))
      .map(({ line, match }) => finding({
        detector: moduleMutable.id,
        ...P9,
        line: line.number,
        message: `Module-level "${match[1]}" is mutated elsewhere in this file`,
        fix: 'Give one owner the state and expose operations, or pass the value instead of sharing it.',
      }));
  },
};

const GLOBAL_WRITE = /\b(?:globalThis|global|window)\s*\.\s*[A-Za-z_$][\w$]*\s*=[^=]/;

const globalWrite = {
  id: 'state/global-write',
  ...P9,
  extensions: JS,
  run(source) {
    return codeLines(source)
      .filter((line) => GLOBAL_WRITE.test(line.text))
      .map((line) => finding({
        detector: globalWrite.id,
        ...P9,
        line: line.number,
        message: 'Writes to global state',
        fix: 'Pass the value explicitly. A global write is a hidden dependency for every reader.',
      }));
  },
};

const AWAITED_READ = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s/;
const LOOKAHEAD_LINES = 6;

/**
 * Read, compute, write back — with an await in between, another request can run
 * and its write is the one that gets lost.
 */
const readModifyWrite = {
  id: 'state/read-modify-write',
  ...P9,
  extensions: JS,
  run(source) {
    const lines = codeLines(source);

    return lines.flatMap((line, index) => {
      const read = AWAITED_READ.exec(line.trimmed);
      if (!read) return [];

      const name = read[1];
      const derivedWrite = new RegExp(`await[^;]*\\b${name}\\s*[+\\-*]|await[^;]*\\(\\s*[^)]*\\b${name}\\s*[+\\-]`);
      const writeBack = lines
        .slice(index + 1, index + 1 + LOOKAHEAD_LINES)
        .find((candidate) => derivedWrite.test(candidate.text));

      if (!writeBack) return [];

      return [finding({
        detector: readModifyWrite.id,
        ...P9,
        line: writeBack.number,
        message: `"${name}" is read, modified and written back across an await`,
        fix: 'Use an atomic operation or a transaction. Another request can run between the read and the write.',
      })];
    });
  },
};

export default [moduleMutable, globalWrite, readModifyWrite];
