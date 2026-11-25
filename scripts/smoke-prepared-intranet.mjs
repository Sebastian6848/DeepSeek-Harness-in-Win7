/** Run with the prepared Electron in Node mode, against a private temporary profile. */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'

const application = resolve(process.argv[2])
const temporary = mkdtempSync(join(tmpdir(), 'dsh-intranet-smoke-'))
const runtime = join(application, 'resources/app.asar/dsh')
const support = join(application, 'resources/runtime')
const profile = join(temporary, 'home/profiles/desktop')
const home = join(temporary, 'home')
const log = join(temporary, 'external-attempts.jsonl'), guard = join(temporary, 'observe.cjs')
mkdirSync(profile, { recursive: true })
Object.assign(process.env, { DSH_HOME: home, USERPROFILE: home, APPDATA: home, LOCALAPPDATA: home,
  XDG_CONFIG_HOME: home, XDG_CACHE_HOME: home, XDG_STATE_HOME: home, ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '' })
for (const key of ['DEEPSEEK_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_BASE_URL', 'DSH_ALLOW_EXTERNAL_NETWORK', 'DSH_TELEMETRY_DISABLED']) delete process.env[key]
const require = createRequire(join(runtime, 'package.json'))
const { initProfile } = require('@deepseek-ai/dsh-app-boot')
const { PROFILE_TEMPLATES } = require('@deepseek-ai/dsh-official-bundles')
initProfile(profile, PROFILE_TEMPLATES.web.bundles)
writeFileSync(guard, `const net = require('node:net'); const fs = require('node:fs');
const original = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const input = Array.isArray(args[0]) ? args[0] : args;
  const options = input[0];
  const host = options && typeof options === 'object' ? options.host : typeof input[1] === 'string' ? input[1] : undefined;
  if (host && !['127.0.0.1', 'localhost', '::1'].includes(host)) {
    fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({host})+'\\n');
    throw new Error('Unexpected external connection during smoke');
  }
  return original.apply(this, args);
};`)
const child = spawn(process.execPath, ['--expose-internals', '--require', guard,
  join(runtime, 'node_modules/@deepseek-ai/dsh-desktop-host/lib/index.js'), runtime, profile,
  join(support, 'primary-runtime'), join(support, 'primary-runtime/dependencies/pnpm/bin/pnpm.mjs'), join(support, 'bin')],
  { cwd: profile, env: process.env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] })
let diagnostics = ''
child.stdout.on('data', b => { diagnostics += b; process.stdout.write(String(b).replace(/([?&]token=)[A-Za-z0-9_-]+/gu, '$1<redacted>')) })
child.stderr.on('data', b => { diagnostics += b; process.stderr.write(b) })
const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })))
let timer
try {
  const ready = await Promise.race([
    new Promise((resolve, reject) => {
      child.on('error', reject)
      child.on('message', message => {
        if (message.type === 'ready') resolve(message)
        if (message.type === 'fatal') reject(new Error(message.diagnostic || message.message))
      })
    }),
    exited.then(result => { throw new Error('Host exited before ready: ' + JSON.stringify(result)) }),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Host startup timed out')), 60000) }),
  ])
  clearTimeout(timer)
  const login = await fetch(ready.url, { redirect: 'manual' })
  const cookie = login.headers.getSetCookie().map(x => x.split(';')[0]).join('; ')
  const page = await fetch(new URL('/', ready.url), { headers: { cookie } })
  const html = await page.text()
  assert.equal(page.status, 200); assert.match(html, /<html/u)
  assert.match(readFileSync(join(runtime, 'node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js'), 'utf8'), /intranet-deepseek/u)
  assert.match(JSON.stringify(ready.injections), /intranetDefaults/u)
  await new Promise(resolve => setTimeout(resolve, 5000))
  assert.equal(existsSync(log) ? readFileSync(log, 'utf8') : '', '', 'External connection attempted')
  console.log('PASS: packaged Host cold start, authenticated local frontend, patched model form, zero observed external Node socket attempts')
  child.send({ type: 'shutdown' })
  const result = await Promise.race([exited, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Host shutdown timed out')), 15000) })])
  assert.equal(result.code, 0)
  console.log('PASS: graceful packaged Host shutdown')
} finally {
  clearTimeout(timer)
  if (child.exitCode === null) { child.kill(); await exited }
  rmSync(temporary, { recursive: true, force: true })
}
