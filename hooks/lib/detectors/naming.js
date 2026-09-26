import { JS, codeLines, finding, isTestFile } from '../source.js';

const P14 = { principle: 'P14', title: 'Naming', tier: 'design' };

const DECLARATION = /\b(?:const|let|var|function|async\s+function)\s+([A-Za-z_$][\w$]*)/g;

/** Names that describe that something happens, not what. */
const VAGUE = /^(data|info|temp|tmp|obj|item2|val|res2|stuff|thing|doStuff|process|handle|manage|manager|helper|util|utils|doIt|execute|perform)$/i;

const vagueName = {
  id: 'naming/vague-name',
  ...P14,
  extensions: JS,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    return codeLines(source).flatMap((line) => [...line.text.matchAll(DECLARATION)]
      .filter(([, name]) => VAGUE.test(name))
      .map(([, name]) => finding({
        detector: vagueName.id,
        ...P14,
        line: line.number,
        message: `"${name}" does not say what this is`,
        fix: 'Name it for the thing it holds or the action it performs.',
      })));
  },
};

/** Single letters are only readable as loop counters and short lambda parameters. */
const SINGLE_LETTER_DECLARATION = /\b(?:const|let|var)\s+([a-z])\s*=/g;
const LOOP_COUNTER = /\bfor\s*\(/;

const singleLetterName = {
  id: 'naming/single-letter',
  ...P14,
  extensions: JS,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    return codeLines(source)
      .filter((line) => !LOOP_COUNTER.test(line.text))
      .flatMap((line) => [...line.text.matchAll(SINGLE_LETTER_DECLARATION)]
        .map(([, name]) => finding({
          detector: singleLetterName.id,
          ...P14,
          line: line.number,
          message: `"${name}" is a single-letter name outside a loop`,
          fix: 'Give it a name that survives being read six months from now.',
        })));
  },
};

const ASSIGNMENT = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(:\s*boolean\s*)?=\s*([^;\n]+)/g;
const ASSERTION_PREFIX = /^(is|has|can|should|will|was|were|did|does|must|allow|enable|include|contains?)[A-Z_]/;
const ALREADY_READS_AS_ASSERTION = /^(loading|done|ready|ok|valid|found|active|visible|enabled|disabled|dirty|empty)$/i;
// `=>` and `>=`/`<=` share characters with the comparisons we are looking for, and
// an arrow function on the line must never make its binding look boolean.
const COMPARISON = /(?:===|!==|(?<![=!<>-])[<>]=?(?!=))\s/;
const ARROW = /=>/;
const NEGATION = /^!(?!=)/;

function isBooleanExpression(rhs, annotated) {
  if (annotated) return true;
  if (ARROW.test(rhs)) return false;
  return /^(?:true|false)\b/.test(rhs) || NEGATION.test(rhs) || COMPARISON.test(rhs);
}

const booleanName = {
  id: 'naming/boolean-name',
  ...P14,
  extensions: JS,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    return codeLines(source)
      // A for-header binds a counter, not a boolean, however many `<` it contains.
      .filter((line) => !LOOP_COUNTER.test(line.text))
      .flatMap((line) => [...line.text.matchAll(ASSIGNMENT)]
      .filter(([, name, annotated, rhs]) => isBooleanExpression(rhs.trim(), Boolean(annotated))
        && !ASSERTION_PREFIX.test(name)
        && !ALREADY_READS_AS_ASSERTION.test(name))
      .map(([, name]) => finding({
        detector: booleanName.id,
        ...P14,
        line: line.number,
        message: `Boolean "${name}" does not read as an assertion`,
        fix: 'Prefix it: isActive, hasPermission, canRetry, shouldPublish.',
      })));
  },
};

const COLLECTION_ASSIGNMENT = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[\w<>[\],\s|]*\[\]\s*)?=\s*([^;\n]+)/g;
const PLURAL_OR_COLLECTIVE = /(s|list|set|array|collection|all|each|map|index|data|queue|stack|batch|group|rows|lines)$/i;
const SCREAMING_CASE = /^[A-Z][A-Z0-9_]*$/;
const PRODUCES_COLLECTION = /^\[|\.(?:map|filter|split|concat|slice|flatMap)\s*\(/;
// The same call chain often ends by reducing back to a scalar.
const REDUCES_TO_SCALAR = /\.(?:join|reduce|length|size|find|some|every|includes|indexOf|at|pop|shift)\b|^Math\.|\bnew (?:Map|Set)\b|\[[^\]]*\]\s*(?:\?\?.*)?$/;

const singularCollection = {
  id: 'naming/singular-collection',
  ...P14,
  tier: 'strict',
  extensions: JS,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    return codeLines(source).flatMap((line) => [...line.text.matchAll(COLLECTION_ASSIGNMENT)]
      .filter(([, name, rhs]) => PRODUCES_COLLECTION.test(rhs.trim())
        && !REDUCES_TO_SCALAR.test(rhs)
        && !SCREAMING_CASE.test(name)
        && !PLURAL_OR_COLLECTIVE.test(name))
      .map(([, name]) => finding({
        detector: singularCollection.id,
        ...P14,
        tier: 'strict',
        line: line.number,
        message: `"${name}" holds a collection but is named as one thing`,
        fix: 'Make collection names plural, so the reader knows what they have.',
      })));
  },
};

/** A bare number carries no unit and no meaning at the call site. */
const MAGIC_NUMBER = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(\d{3,})\s*[;,)]/g;
// `timeout` and `interval` name the concept but not the unit, which is exactly the
// ambiguity worth flagging — `timeoutMs` is what settles it.
const CARRIES_UNIT = /(ms|milliseconds?|seconds?|minutes?|hours?|days?|bytes?|kb|mb|gb|px|percent|count|max|min|limit|size|length|port|width|height|capacity)/i;

const unitlessConstant = {
  id: 'naming/unitless-constant',
  ...P14,
  extensions: JS,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    return codeLines(source).flatMap((line) => [...line.text.matchAll(MAGIC_NUMBER)]
      .filter(([, name]) => !CARRIES_UNIT.test(name))
      .map(([, name, value]) => finding({
        detector: unitlessConstant.id,
        ...P14,
        line: line.number,
        message: `"${name} = ${value}" gives no unit`,
        fix: 'Put the unit in the name: timeoutMs, secondsPerDay, maxSizeBytes.',
      })));
  },
};

export default [vagueName, singleLetterName, booleanName, singularCollection, unitlessConstant];
