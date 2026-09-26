import { JS_AND_PY, codeLines, finding, isConfigFile, isTestFile } from '../source.js';

const P6 = { principle: 'P6', title: 'Configuration' };

const ENDPOINT = /\b(?:https?|redis|rediss|mongodb(?:\+srv)?|postgres(?:ql)?|mysql|amqps?|kafka|wss?|grpc|ftp|s3):\/\/[^\s'"`)\]]+/gi;

/**
 * Hosts that do not vary by environment: loopback, reserved example domains, and
 * the specification URLs that appear in schemas and licence headers.
 */
const ENVIRONMENT_INDEPENDENT = /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|host\.docker\.internal|(?:[\w-]+\.)*example\.(?:com|org|net)|(?:[\w-]+\.)*(?:w3\.org|json-schema\.org|schema\.org|spdx\.org|opensource\.org|xmlns\.com))(?::\d+)?$/i;

function hostOf(url) {
  const afterScheme = url.split('://')[1] ?? '';
  return afterScheme.split(/[/?#]/)[0];
}

const hardcodedEndpoint = {
  id: 'config/hardcoded-endpoint',
  ...P6,
  tier: 'safety',
  extensions: JS_AND_PY,
  run(source, filePath) {
    if (isConfigFile(filePath) || isTestFile(filePath)) return [];

    return codeLines(source).flatMap((line) => [...line.text.matchAll(ENDPOINT)]
      .filter((match) => !ENVIRONMENT_INDEPENDENT.test(hostOf(match[0])))
      .map((match) => finding({
        detector: hardcodedEndpoint.id,
        ...P6,
        tier: 'safety',
        line: line.number,
        message: `Hardcoded endpoint "${truncate(match[0])}"`,
        fix: 'Move it to the config module, read from the environment, and validate it at startup.',
      })));
  },
};

const ENV_READ = /process\.env\s*(?:\.\s*([A-Za-z_][\w]*)|\[\s*['"]([^'"]+)['"]\s*\])|os\.environ(?:\.get\(\s*['"]([^'"]+)['"]|\[\s*['"]([^'"]+)['"])/g;

/** Reading NODE_ENV to branch on the environment is idiomatic and not worth flagging. */
const UNREMARKABLE = /^(NODE_ENV|PYTHON_ENV|ENV)$/i;

const directEnvRead = {
  id: 'config/direct-env',
  ...P6,
  tier: 'design',
  extensions: JS_AND_PY,
  run(source, filePath) {
    if (isConfigFile(filePath) || isTestFile(filePath)) return [];

    return codeLines(source).flatMap((line) => [...line.text.matchAll(ENV_READ)]
      .map((match) => match[1] ?? match[2] ?? match[3] ?? match[4] ?? '')
      .filter((name) => !UNREMARKABLE.test(name))
      .map((name) => finding({
        detector: directEnvRead.id,
        ...P6,
        tier: 'design',
        line: line.number,
        message: `Environment read directly (${name}) outside the config module`,
        fix: 'Parse and validate it once in the config module, then read config.<name> here.',
      })));
  },
};

function truncate(value, max = 48) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default [hardcodedEndpoint, directEnvRead];
