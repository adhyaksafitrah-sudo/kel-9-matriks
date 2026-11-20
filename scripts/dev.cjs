const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const children = [];
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  children.forEach(function (child) {
    if (!child.killed) child.kill();
  });
}

function startChild(args) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: 'inherit'
  });
  children.push(child);
  child.on('error', function (err) {
    console.error('Gagal menjalankan proses development:', err);
    stop(1);
  });
  child.on('exit', function (code, signal) {
    if (!stopping) {
      console.error('Proses development berhenti:', signal || code);
      stop(code === 0 ? 0 : 1);
    }
  });
  return child;
}

function wait(milliseconds) {
  return new Promise(function (resolve) { setTimeout(resolve, milliseconds); });
}

async function waitForApi(api) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && !stopping) {
    if (api.exitCode !== null) throw new Error('Server API berhenti sebelum siap.');
    try {
      const response = await fetch('http://127.0.0.1:3001/api/health');
      if (response.ok) return;
    } catch (err) {
      await wait(200);
      continue;
    }
    await wait(200);
  }
  throw new Error('Server API tidak siap dalam 15 detik.');
}

process.on('SIGINT', function () { stop(0); });
process.on('SIGTERM', function () { stop(0); });

async function run() {
  const api = startChild(['server/index.cjs']);
  await waitForApi(api);
  if (!stopping) startChild(['node_modules/vite/bin/vite.js', '--host', '127.0.0.1']);
}

run().catch(function (err) {
  console.error('Gagal memulai aplikasi development:', err);
  stop(1);
});
