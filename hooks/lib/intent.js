/**
 * Situational nudges only. An unconditional reminder on every prompt is the
 * fastest way to get a plugin disabled, so anything ambiguous returns nothing.
 */

const DEBUG = /\b(?:bug|broken|failing|fails|failed|crash(?:ing|es)?|throw(?:ing|s)?|thrown|errors?|exception|stack ?trace|regression|flaky|not working|doesn'?t work|isn'?t working|why (?:is|does|do|am|are))\b/i;

/** "Add error handling" is a feature request, not a bug report. */
const ERROR_AS_FEATURE = /\berrors?\s+(?:handling|handler|messages?|boundar(?:y|ies)|types?|classes?|states?|pages?)\b/gi;

const REFACTOR = /\b(?:refactor|clean ?up|tidy|restructure|simplify|extract|untangle|split (?:up|this|these)|rewrite (?:this|it))\b/i;

const DESIGN = /\b(?:implement|build|design|architect|scaffold|from scratch|new (?:service|feature|module|endpoint|api|integration|system)|add (?:a |an |the )?(?:new )?(?:service|feature|module|endpoint|api|integration|table|queue|worker))\b/i;

const NUDGES = {
  debug: [
    'pragma: this reads as a debugging task. Investigate, do not guess:',
    '  reproduce it reliably -> read the whole error -> verify the assumption rather than believing it',
    '  -> bisect -> fix the root cause, not the symptom -> add the regression test.',
    '  Write the test that fails BECAUSE of the bug before fixing it. A test that never failed proves nothing.',
    '  Full protocol: /pragma:debug',
  ],
  refactor: [
    'pragma: this reads as a refactoring task. Behaviour must not change:',
    '  confirm tests cover this and are green FIRST -> one small change -> run tests -> repeat.',
    '  Never batch changes, and never fold a behaviour change into a refactor.',
    '  Full protocol: /pragma:refactor',
  ],
  design: [
    'pragma: before writing code, settle the design:',
    '  What already exists here that should be reused or extended?',
    '  What is likely to change, and what goes behind an interface because of it?',
    '  What is each unit responsible for — one thing, describable without "and"?',
    '  What are the preconditions, postconditions and invariants, and where is untrusted input validated?',
    '  Do not abstract what has no expected second implementation. Full walkthrough: /pragma:design',
  ],
};

/** The first intent that matches, in priority order, or undefined. */
export function classify(prompt) {
  const text = String(prompt ?? '').replace(ERROR_AS_FEATURE, '');
  if (DEBUG.test(text)) return 'debug';
  if (REFACTOR.test(text)) return 'refactor';
  if (DESIGN.test(text)) return 'design';
  return undefined;
}

export function nudgeFor(prompt) {
  const intent = classify(prompt);
  return intent ? NUDGES[intent].join('\n') : '';
}
