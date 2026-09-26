/**
 * Small helpers shared by detectors. Everything here is deliberately cheap and
 * line-oriented: these run on every edit, inside a hook with a short timeout.
 */

const JS_EXTENSIONS = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'];
const PY_EXTENSIONS = ['.py'];

export const JS = JS_EXTENSIONS;
export const PY = PY_EXTENSIONS;
export const JS_AND_PY = [...JS_EXTENSIONS, ...PY_EXTENSIONS];

export function extensionOf(filePath) {
  const name = normalize(filePath);
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

const WINDOWS_SEPARATOR = /\\/g;

export function normalize(filePath) {
  return String(filePath ?? '').replace(WINDOWS_SEPARATOR, '/');
}

/** Line number (1-based) of a character offset, for regexes run over the whole file. */
export function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source[i] === '\n') line += 1;
  }
  return line;
}

/**
 * Lines paired with their 1-based number, with comment-only and blank lines
 * dropped. Detectors that scan line by line should use this so a rule written in
 * a comment or a doc example is never reported.
 */
export function codeLines(source) {
  return source.split(/\r?\n/).flatMap((text, index) => {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (isCommentLine(trimmed)) return [];
    return [{ number: index + 1, text, trimmed }];
  });
}

function isCommentLine(trimmed) {
  return trimmed.startsWith('//')
    || trimmed.startsWith('*')
    || trimmed.startsWith('/*')
    || trimmed.startsWith('#');
}

export function isTestFile(filePath) {
  const name = normalize(filePath).toLowerCase();
  return /(^|\/)(tests?|__tests__|spec|e2e|fixtures?|mocks?|__mocks__)\//.test(name)
    || /\.(test|spec)\.[a-z]+$/.test(name)
    || /(^|\/)(conftest|test_[^/]+)\.py$/.test(name);
}

/**
 * Files whose whole job is to hold configuration. Hardcoded endpoints and direct
 * environment reads are correct here, so config detectors stay quiet.
 */
export function isConfigFile(filePath) {
  const name = normalize(filePath).toLowerCase();
  return /(^|\/)(config|configs|settings|env)\//.test(name)
    || /(^|\/)[^/]*\.?(config|settings)\.[a-z]+$/.test(name)
    || /(^|\/)env\.[a-z]+$/.test(name)
    || /(^|\/)\.env(\.[a-z]+)?$/.test(name);
}

/** Files that usually hold business logic, where infrastructure imports are a smell. */
export function isBusinessLogicFile(filePath) {
  const name = normalize(filePath).toLowerCase();
  return /(^|\/)(services?|domain|usecases?|use-cases?|core|application|handlers?|controllers?)\//.test(name);
}

export function hasExtension(filePath, extensions) {
  return extensions.includes(extensionOf(filePath));
}

const STRING_LITERAL = /(['"`])(?:\\.|(?!\1).)*\1/g;
const LINE_COMMENT = /\/\/.*$/;
const REGEX_LITERAL = /(?<![\w)\]])\/(?![/*])(?:\\.|\[(?:\\.|[^\]\n])*\]|[^/\\\n])+\/[gimsuyd]*/g;

/** A line with its string literals and trailing comment blanked, for brace counting. */
export function withoutLiterals(text) {
  return text.replace(STRING_LITERAL, '""').replace(LINE_COMMENT, '');
}

/**
 * Blanks regex literals. Character classes like ['"] otherwise read as quotes and
 * turn every pattern in a file into imaginary duplicated strings.
 */
export function withoutRegexLiterals(text) {
  return text.replace(REGEX_LITERAL, '/RE/');
}

/**
 * Brace depth per line, so detectors can ask "am I inside a loop / a function /
 * three levels of nesting" without parsing. Good enough for the shapes we report.
 */
const CONTROL_FLOW = /\b(?:if|else|for|while|switch|try|catch|finally|do)\b/;

export function withDepth(source) {
  let depth = 0;
  // Braces open for object literals and callbacks too, which is not nesting a
  // reader has to hold in their head. controlDepth counts only the constructs
  // that are: conditionals, loops and try blocks.
  const openBlocks = [];
  let controlDepth = 0;

  return source.split(/\r?\n/).map((text, index) => {
    const code = withoutLiterals(text);
    const opens = (code.match(/\{/g) ?? []).length;
    const closes = (code.match(/\}/g) ?? []).length;
    const depthBefore = depth;
    const controlDepthBefore = controlDepth;

    for (let n = 0; n < closes; n += 1) {
      if (openBlocks.pop()) controlDepth -= 1;
    }
    const isControl = CONTROL_FLOW.test(code);
    for (let n = 0; n < opens; n += 1) {
      openBlocks.push(isControl);
      if (isControl) controlDepth += 1;
    }
    depth += opens - closes;

    return {
      number: index + 1,
      text,
      code,
      trimmed: text.trim(),
      depthBefore,
      depthAfter: depth,
      controlDepth: controlDepthBefore,
    };
  });
}

/**
 * Brace-delimited blocks whose opening line matches `startPattern`. Returns the
 * header line and every line up to the matching close.
 */
export function blocksOf(source, startPattern) {
  const lines = withDepth(source);
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!startPattern.test(line.code) || line.depthAfter <= line.depthBefore) continue;

    const bodyLines = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor].depthBefore < line.depthAfter) break;
      bodyLines.push(lines[cursor]);
    }
    blocks.push({ header: line, body: bodyLines, length: bodyLines.length + 1 });
  }

  return blocks;
}

/** A finding, in the one shape the reporter understands. */
export function finding({ detector, principle, title, tier, line, message, fix }) {
  return { detector, principle, title, tier, line, message, fix };
}
