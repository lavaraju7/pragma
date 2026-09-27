import { JS, blocksOf, codeLines, dedupeByLine, finding, isBusinessLogicFile, isTestFile } from '../source.js';

const P8 = { principle: 'P8', title: 'Temporal Coupling', tier: 'design' };
const P5 = { principle: 'P5', title: 'Decoupling', tier: 'design' };
const P7 = { principle: 'P7', title: 'Inheritance Tax', tier: 'design' };

const LOOP_HEADER = /\b(?:for|while)\s*\(|\.\s*forEach\s*\(/;
const AWAIT = /\bawait\s/;

/** Awaiting inside a loop serialises work that is usually independent. */
const awaitInLoop = {
  id: 'coupling/await-in-loop',
  ...P8,
  extensions: JS,
  run(source) {
    const perBlockLines = blocksOf(source, LOOP_HEADER)
      .flatMap((block) => block.body.filter((line) => AWAIT.test(line.code)).slice(0, 1));

    return dedupeByLine(perBlockLines).map((line) => finding({
      detector: awaitInLoop.id,
      ...P8,
      line: line.number,
      message: 'Awaiting inside a loop, one iteration at a time',
      fix: 'If the iterations are independent, collect the promises and await Promise.all.',
    }));
  },
};

const BARE_AWAIT = /^await\s+[\w$.[\]]+\s*\(/;

/** Consecutive awaits whose results nothing uses cannot depend on each other. */
const sequentialAwaits = {
  id: 'coupling/sequential-awaits',
  ...P8,
  extensions: JS,
  run(source) {
    const lines = codeLines(source);
    const findings = [];
    let runStart = null;
    let runLength = 0;

    for (const line of [...lines, { number: -1, trimmed: '' }]) {
      if (BARE_AWAIT.test(line.trimmed)) {
        runStart ??= line;
        runLength += 1;
        continue;
      }
      if (runLength >= 2) {
        findings.push(finding({
          detector: sequentialAwaits.id,
          ...P8,
          line: runStart.number,
          message: `${runLength} awaits in a row whose results nothing uses`,
          fix: 'Nothing here consumes an earlier result — await Promise.all([...]) instead.',
        }));
      }
      runStart = null;
      runLength = 0;
    }

    return findings;
  },
};

const INFRASTRUCTURE = /\b(?:from\s+|require\s*\(\s*)['"](mysql2?|pg|ioredis|redis|mongodb|mongoose|kafkajs|amqplib|@aws-sdk\/[\w-]+|aws-sdk|@google-cloud\/[\w-]+|nodemailer|stripe)(?:\/[\w-]+)?['"]/;

/** Business logic that names a driver cannot be tested or re-pointed without it. */
const infrastructureImport = {
  id: 'coupling/infrastructure-import',
  ...P5,
  extensions: JS,
  run(source, filePath) {
    if (!isBusinessLogicFile(filePath) || isTestFile(filePath)) return [];

    return codeLines(source)
      .filter((line) => INFRASTRUCTURE.test(line.text))
      .map((line) => finding({
        detector: infrastructureImport.id,
        ...P5,
        line: line.number,
        message: `Business logic imports "${INFRASTRUCTURE.exec(line.text)[1]}" directly`,
        fix: 'Depend on an interface this module defines, and let an adapter in the infrastructure layer implement it.',
      }));
  },
};

const SUBCLASS = /\bclass\s+([A-Za-z_$][\w$]*)\s+extends\s+([A-Za-z_$][\w$.]*)\s*\{/;
const MEMBER = /^(?:public\s+|private\s+|protected\s+|static\s+|readonly\s+|async\s+|get\s+|set\s+|\*)*([A-Za-z_$][\w$]*)\s*[(<]/;

/** Extending purely to inherit implementation buys reuse and pays with coupling. */
const inheritanceForReuse = {
  id: 'coupling/inheritance-for-reuse',
  ...P7,
  extensions: JS,
  run(source) {
    return blocksOf(source, SUBCLASS)
      // Only lines at the class body's own depth are members; anything deeper is
      // inside a method, where `super(...)` would otherwise read as an override.
      .filter((block) => !block.body.some((line) => {
        if (line.depthBefore !== block.header.depthAfter) return false;
        const member = MEMBER.exec(line.trimmed);
        return member && member[1] !== 'constructor';
      }))
      .map((block) => finding({
        detector: inheritanceForReuse.id,
        ...P7,
        line: block.header.number,
        message: `"${SUBCLASS.exec(block.header.code)[1]}" extends but overrides nothing`,
        fix: 'Compose instead: take the behaviour as a constructor dependency rather than inheriting it.',
      }));
  },
};

export default [awaitInLoop, sequentialAwaits, infrastructureImport, inheritanceForReuse];
