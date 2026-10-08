// BEGIN CHILD_LIFECYCLE
function observeChildLifecycle(child) {
  const state = {pid:child.pid ?? null, closeExpected:false, closed:false, earlyClose:false, exitCode:null,
    signalCode:null, error:null, killAttempted:false, killReturned:null, killError:null};
  const stdout = [], stderr = [];
  child.stdout?.on('data', bytes => stdout.push(Buffer.from(bytes)));
  child.stderr?.on('data', bytes => stderr.push(Buffer.from(bytes)));
  let resolveClose;
  const closed = new Promise(resolve => { resolveClose = resolve; });
  child.once('error', error => {
    state.error = {name:error.name, message:error.message, code:error.code ?? null};
  });
  child.once('close', (code, signal) => {
    state.closed = true; state.earlyClose = !state.closeExpected;
    state.exitCode = code; state.signalCode = signal; resolveClose();
  });
  async function waitForClose(ms) {
    if (state.closed) return true;
    let timer;
    try {
      return await Promise.race([
        closed.then(() => true),
        new Promise(resolve => { timer = setTimeout(() => resolve(false), ms); }),
      ]);
    } finally { clearTimeout(timer); }
  }
  return {
    state,
    expectClose() { state.closeExpected = true; },
    stdout() { return Buffer.concat(stdout); },
    stderr() { return Buffer.concat(stderr); },
    async finish(graceMs = 4000, killMs = 4000) {
      if (await waitForClose(graceMs)) return true;
      if (child.exitCode === null && child.signalCode === null) {
        state.killAttempted = true;
        try { state.killReturned = child.kill(); }
        catch (error) { state.killError = {name:error.name, message:error.message}; }
      }
      return await waitForClose(killMs);
    },
  };
}
// END CHILD_LIFECYCLE
