const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const target = path.join(__dirname, 'receive-independent-r0.mjs');
const bytes = fs.readFileSync(target);
const sourceBlob = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
if (sourceBlob !== '991cdf14c6f6b0f599a460cc33612f46f2a03ef3') throw new Error('Frozen source mismatch: ' + sourceBlob);
for (const name of ['node.stdout', 'node.stderr', 'driver-result.json', 'independent-browser-receiving.json']) if (fs.existsSync(path.join(__dirname, name))) throw new Error('Prior execution present; reconcile instead of repeating: ' + name);
const record = { schema: 'hamon-native-node-controller/1', startUtc: new Date().toISOString(), driver: __filename, sourceBlob, identity: { user: os.userInfo().username, hostname: os.hostname(), node: process.version, execPath: process.execPath }, scope: 'Native JavaScript controller. No PowerShell file is read or evaluated. No policy or shell configuration change.', args: ['--max-old-space-size=384', target], timeoutMs: 180000 };
const started = performance.now();
const syntax = spawnSync(process.execPath, ['--check', target], { cwd: __dirname, timeout: 10000, encoding: 'utf8', windowsHide: true });
record.syntax = { status: syntax.status, signal: syntax.signal, stdout: syntax.stdout, stderr: syntax.stderr, error: syntax.error?.message };
if (syntax.status !== 0) {
  fs.writeFileSync(path.join(__dirname, 'driver-result.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(record)); process.exitCode = 1;
} else {
  const child = spawn(process.execPath, record.args, { cwd: __dirname, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  record.pid = child.pid;
  const out = [], err = [];
  child.stdout.on('data', b => out.push(b)); child.stderr.on('data', b => err.push(b));
  child.on('error', e => { record.spawnError = e.message; });
  const timer = setTimeout(() => {
    record.timeout = true;
    const stop = spawnSync('C:\\Windows\\System32\\taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { timeout: 10000, encoding: 'utf8', windowsHide: true });
    record.ownTreeStop = { status: stop.status, stdout: stop.stdout, stderr: stop.stderr, error: stop.error?.message };
  }, record.timeoutMs);
  child.on('close', (code, signal) => {
    clearTimeout(timer);
    record.exitCode = code; record.signal = signal; record.elapsedMs = performance.now() - started; record.endUtc = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'node.stdout'), Buffer.concat(out), { flag: 'wx' });
    fs.writeFileSync(path.join(__dirname, 'node.stderr'), Buffer.concat(err), { flag: 'wx' });
    fs.writeFileSync(path.join(__dirname, 'driver-result.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(record)); process.exitCode = record.timeout ? 124 : (code === 0 && !signal && !record.spawnError ? 0 : 1);
  });
}
