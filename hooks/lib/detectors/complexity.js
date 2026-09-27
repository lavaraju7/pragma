import { JS, blocksOf, dedupeByLine, finding, isTestFile, withDepth } from '../source.js';

const P1 = { principle: 'P1', title: 'Good Design', tier: 'strict' };
const P10 = { principle: 'P10', title: 'Algorithm Speed', tier: 'strict' };

const MAX_FUNCTION_LINES = 50;
const MAX_PARAMETERS = 4;
const MAX_NESTING = 3;

const FUNCTION_HEADER = /\bfunction\s|\)\s*(?::\s*[\w<>[\],\s|]+\s*)?=>\s*\{|^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*[A-Za-z_$][\w$]*\s*\([^)]*\)\s*(?::\s*[\w<>[\],\s|]+\s*)?\{/;

const longFunction = {
  id: 'complexity/long-function',
  ...P1,
  extensions: JS,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    return blocksOf(source, FUNCTION_HEADER)
      .filter((block) => block.length > MAX_FUNCTION_LINES)
      .map((block) => finding({
        detector: longFunction.id,
        ...P1,
        line: block.header.number,
        message: `Function is ${block.length} lines`,
        fix: 'Extract the steps it performs into named functions; the outline should read as a summary.',
      }));
  },
};

const SIGNATURE = /\b(?:function\s+[A-Za-z_$][\w$]*|constructor)\s*\(([^)]*)\)/g;

const tooManyParameters = {
  id: 'complexity/too-many-parameters',
  ...P1,
  extensions: JS,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    return withDepth(source).flatMap((line) => [...line.code.matchAll(SIGNATURE)]
      .map((match) => parametersOf(match[1]))
      .filter((params) => params.length > MAX_PARAMETERS)
      .map((params) => finding({
        detector: tooManyParameters.id,
        ...P1,
        line: line.number,
        message: `${params.length} parameters`,
        fix: 'Group the related ones into a named object, or split the function.',
      })));
  },
};

/**
 * A destructured object is one parameter, not one per field — it is the fix this
 * detector recommends, so counting its fields would punish the good shape.
 */
function parametersOf(signature) {
  const trimmed = signature.trim();
  if (trimmed.startsWith('{')) return [trimmed];
  return trimmed.split(',').map((parameter) => parameter.trim()).filter(Boolean);
}

const deepNesting = {
  id: 'complexity/deep-nesting',
  ...P1,
  extensions: JS,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    const deepest = withDepth(source)
      .filter((line) => line.trimmed && line.controlDepth > MAX_NESTING)
      .slice(0, 1);

    return deepest.map((line) => finding({
      detector: deepNesting.id,
      ...P1,
      line: line.number,
      message: `Nested ${line.controlDepth} levels of conditionals and loops deep`,
      fix: 'Use guard clauses to return early, or extract the inner block into its own function.',
    }));
  },
};

const LOOP_HEADER = /\b(?:for|while)\s*\(|\.\s*(?:forEach|map)\s*\(/;
const LINEAR_SCAN = /\.\s*(?:find|findIndex|includes|indexOf|filter|some|every)\s*\(/;

/** A linear scan inside a loop is the most common accidental quadratic. */
const lookupInLoop = {
  id: 'complexity/lookup-in-loop',
  ...P10,
  extensions: JS,
  run(source, filePath) {
    if (isTestFile(filePath)) return [];

    const perBlockLines = blocksOf(source, LOOP_HEADER)
      .flatMap((block) => block.body.filter((line) => LINEAR_SCAN.test(line.code)).slice(0, 1));

    return dedupeByLine(perBlockLines).map((line) => finding({
      detector: lookupInLoop.id,
      ...P10,
      line: line.number,
      message: 'Linear scan inside a loop — quadratic in the input',
      fix: 'Index the collection into a Map once before the loop, then look up in constant time.',
    }));
  },
};

export default [longFunction, tooManyParameters, deepNesting, lookupInLoop];
