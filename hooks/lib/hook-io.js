/**
 * Hook scripts get their payload on stdin as JSON and answer on stdout. Anything
 * that throws here must still exit 0: a broken hook should never stall a session.
 */
export async function readHookInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

export function emitJson(payload) {
  process.stdout.write(JSON.stringify(payload));
}

export function emitContext(hookEventName, additionalContext) {
  if (!additionalContext) return;
  emitJson({ hookSpecificOutput: { hookEventName, additionalContext } });
}

/**
 * Wrap a hook body so any unexpected failure degrades to silence. Never call
 * process.exit here: stdout to a pipe is asynchronous, and exiting would truncate
 * the payload Claude Code is waiting for.
 */
export function runHook(main) {
  main().catch(() => {}).finally(() => {
    process.exitCode = 0;
  });
}
