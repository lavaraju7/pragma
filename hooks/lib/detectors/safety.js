import { JS_AND_PY, codeLines, finding, isTestFile, lineOf } from '../source.js';

const P13 = { principle: 'P13', title: 'Stay Safe', tier: 'safety' };

const SQL_KEYWORDS = /\b(?:select\s+[\w*"`(]|insert\s+into|update\s+\w+\s+set|delete\s+from)/i;
const TEMPLATE_LITERAL = /`(?:[^`\\]|\\.)*`/g;
const PY_FSTRING = /\bf(['"])(?:(?!\1)[^\\]|\\.)*\1/g;
const INTERPOLATION = /\$\{|\{[^}]*\}/;

/** SQL assembled from a template literal or f-string that interpolates a value. */
const sqlInterpolation = {
  id: 'safety/sql-interpolation',
  ...P13,
  extensions: JS_AND_PY,
  run(source) {
    const spans = [
      ...source.matchAll(TEMPLATE_LITERAL),
      ...source.matchAll(PY_FSTRING),
    ];
    return spans
      .filter((match) => SQL_KEYWORDS.test(match[0]) && INTERPOLATION.test(match[0]))
      .map((match) => finding({
        detector: sqlInterpolation.id,
        ...P13,
        line: lineOf(source, match.index),
        message: 'SQL built by interpolating a value into the query string',
        fix: 'Use a parameterised query: pass the value as a bound parameter, not as text.',
      }));
  },
};

/** SQL assembled by concatenating a variable onto a quoted fragment. */
const SQL_CONCAT_BEFORE = /(['"])[^'"\n]*\b(?:select|insert|update|delete|where|from|values)\b[^'"\n]*\1\s*\+(?!\+)/i;
// A clause appended to a query under construction. `and`/`or` alone appear in ordinary
// prose, so those only count when the fragment also carries a comparison.
const SQL_CONCAT_AFTER = /\+=?\s*['"]\s*(?:where|values|order\s+by|group\s+by|limit|join|set)\b/i;
const SQL_CONCAT_CLAUSE = /\+=?\s*['"]\s*(?:and|or)\b[^'"]*[=<>]/i;

const sqlConcatenation = {
  id: 'safety/sql-concatenation',
  ...P13,
  extensions: JS_AND_PY,
  run(source) {
    return codeLines(source)
      .filter((line) => SQL_CONCAT_BEFORE.test(line.text)
        || SQL_CONCAT_AFTER.test(line.text)
        || SQL_CONCAT_CLAUSE.test(line.text))
      .map((line) => finding({
        detector: sqlConcatenation.id,
        ...P13,
        line: line.number,
        message: 'SQL built by string concatenation',
        fix: 'Use a parameterised query so the driver keeps data and query text separate.',
      }));
  },
};

const SHELL_CALL = /\b(?:exec|execSync|spawn|spawnSync|execFile|os\.system|subprocess\.(?:run|call|Popen))\s*\(/;
const SHELL_INTERPOLATED_ARG = /\(\s*(?:`[^`]*\$\{|f['"][^'"]*\{|['"][^'"]*['"]\s*\+)/;

const shellInterpolation = {
  id: 'safety/shell-interpolation',
  ...P13,
  extensions: JS_AND_PY,
  run(source) {
    return codeLines(source)
      .filter((line) => SHELL_CALL.test(line.text) && SHELL_INTERPOLATED_ARG.test(line.text))
      .map((line) => finding({
        detector: shellInterpolation.id,
        ...P13,
        line: line.number,
        message: 'Shell command built from an interpolated string',
        fix: 'Pass arguments as an array (execFile / spawn with argv) instead of building a command line.',
      }));
  },
};

const DYNAMIC_EVAL = /(?:^|[^.\w])eval\s*\(|new\s+Function\s*\(/;

const dynamicEval = {
  id: 'safety/dynamic-eval',
  ...P13,
  extensions: JS_AND_PY,
  run(source) {
    return codeLines(source)
      .filter((line) => DYNAMIC_EVAL.test(line.text))
      .map((line) => finding({
        detector: dynamicEval.id,
        ...P13,
        line: line.number,
        message: 'Code evaluated from a string at runtime',
        fix: 'Replace with an explicit lookup or parser. Nothing untrusted should ever reach eval.',
      }));
  },
};

const SECRET_NAME = /(api[_-]?key|secret|passwd|password|private[_-]?key|credential|access[_-]?token|auth[_-]?token|^token$|_token$)/i;
const ASSIGNED_STRING = /([A-Za-z_$][\w$]*)\s*[:=]\s*(['"])([^'"\n]{8,})\2/g;
const PLACEHOLDER = /^(your|my|change|changeme|placeholder|example|sample|dummy|fake|redacted|todo|xxx|\*+|<|\$\{|%|\{\{|process\.env|os\.environ)/i;

const hardcodedSecret = {
  id: 'safety/hardcoded-secret',
  ...P13,
  extensions: JS_AND_PY,
  run(source, filePath) {
    // Test fixtures legitimately carry fake credentials.
    if (isTestFile(filePath)) return [];

    return [...source.matchAll(ASSIGNED_STRING)]
      .filter(([, name, , value]) => SECRET_NAME.test(name)
        && !PLACEHOLDER.test(value)
        && !value.includes(' '))
      .map((match) => finding({
        detector: hardcodedSecret.id,
        ...P13,
        line: lineOf(source, match.index),
        message: `Secret assigned to "${match[1]}" as a literal`,
        fix: 'Read it from a secret manager or the environment, and rotate this value if it was ever committed.',
      }));
  },
};

const UNTRUSTED_SOURCE = /\b(?:req|request)\.(?:params|query|body|headers)\b|\bparams\.\w|\bbody\.\w/;
const PATH_BUILD = /\b(?:path\.(?:join|resolve)|fs\.(?:readFile|readFileSync|writeFile|writeFileSync|createReadStream|createWriteStream|unlink|unlinkSync)|open\s*\()/;

const pathFromInput = {
  id: 'safety/path-from-input',
  ...P13,
  extensions: JS_AND_PY,
  run(source) {
    return codeLines(source)
      .filter((line) => PATH_BUILD.test(line.text) && UNTRUSTED_SOURCE.test(line.text))
      .map((line) => finding({
        detector: pathFromInput.id,
        ...P13,
        line: line.number,
        message: 'File path built from request input',
        fix: 'Resolve the path, then confirm it is still inside the intended directory before touching it.',
      }));
  },
};

export default [
  sqlInterpolation,
  sqlConcatenation,
  shellInterpolation,
  dynamicEval,
  hardcodedSecret,
  pathFromInput,
];
