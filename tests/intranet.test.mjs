import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { intranetProfilePatches } from '../deepseek-harness/packages/boot/app-boot/src/intranet-defaults.ts'
import { customProviderDefaults, normalizeCompatibleBaseURL } from '../deepseek-harness/packages/client/ui-settings-models/src/client/intranet-defaults.ts'
import { compatibleApiKey } from '../deepseek-harness/packages/llm/llm-pi-ai/src/intranet-key.ts'
import { desktopExternalNetworkAllowed } from '../deepseek-harness/apps/desktop/src/intranet-policy.ts'

test('intranet disables network providers even inside nested preset groups, without changing file tools', () => {
  const rows = [
    { id: 'external', name: '@deepseek-ai/dsh-session-log-deepseek', disabled: false },
    { id: 'key', name: '@deepseek-ai/dsh-llm-deepseek-api-key' },
    { id: 'account', name: '@deepseek-ai/dsh-deepseek-account' },
    { id: 'preset', name: '@deepseek-ai/dsh-agent-preset', config: { id: 'custom', plugins: [
      { id: 'network-group', name: 'cordis:group', group: true, config: [
        { id: 'web-renamed', name: '@deepseek-ai/dsh-tool-web', disabled: false },
        { id: 'files', name: '@deepseek-ai/dsh-tool-fs', config: { read: true } },
      ] },
    ] } },
  ]
  const before = structuredClone(rows)
  const patches = intranetProfilePatches(rows)
  for (const id of ['external', 'key', 'account']) assert.equal(patches.find(p => p.id === id).disabled, true)
  const nested = patches.find(p => p.id === 'preset').config.plugins[0].config
  assert.equal(nested[0].disabled, true)
  assert.deepEqual(nested[1], rows[3].config.plugins[0].config[1])
  assert.deepEqual(rows, before)
})

test('safe custom model adapter and existing user selections survive offline policy', () => {
  const rows = [
    { id: 'adapter', name: '@deepseek-ai/dsh-llm-pi-ai' },
    { id: 'default', name: '@deepseek-ai/dsh-agent-default-model', config: { provider: 'deepseek-official', model: 'deepseek-flash' } },
    { id: 'mine', name: '@deepseek-ai/dsh-agent-default-model', config: { provider: 'company', model: 'custom' } },
  ]
  const patches = intranetProfilePatches(rows)
  assert.equal(patches.find(p => p.id === 'adapter'), undefined)
  assert.deepEqual(patches.find(p => p.id === 'default').config, { provider: 'intranet-deepseek', model: 'ds' })
  assert.equal(patches.find(p => p.id === 'mine'), undefined)
})

test('custom API defaults use ds and Chat Completions without requiring a URL or live discovery', () => {
  const draft = customProviderDefaults([], ['anthropic-messages', 'openai-completions'])
  assert.equal(draft.route, 'intranet-deepseek')
  assert.equal(draft.protocol, 'openai-completions')
  assert.deepEqual(draft.models, [{ id: 'ds' }])
  assert.equal(customProviderDefaults(['intranet-deepseek'], ['openai-completions']).route, '')
})

test('normalizes origin, custom prefix and full completion URL without losing the gateway prefix', () => {
  for (const [source, expected] of [
    ['http://10.2.3.4:8000', 'http://10.2.3.4:8000/v1'],
    ['http://model.intra/v1/', 'http://model.intra/v1'],
    ['https://model.intra/company/openai/chat/completions', 'https://model.intra/company/openai'],
    ['https://model.intra/company/openai/', 'https://model.intra/company/openai'],
    ['http://model.intra/chat/completions', 'http://model.intra'],
  ]) assert.equal(normalizeCompatibleBaseURL(source, 'openai-completions'), expected)
  assert.equal(normalizeCompatibleBaseURL('https://model.intra', 'anthropic-messages'), 'https://model.intra')
  for (const value of ['ftp://host', 'http://user:secret@host', 'https://host/?key=secret']) {
    assert.throws(() => normalizeCompatibleBaseURL(value, 'openai-completions'))
  }
})

test('actual plugin manager and marketplace package paths stay disabled', () => {
  for (const name of ['@deepseek-ai/dsh-plugin-manager/tools', '@deepseek-ai/dsh-plugin-market', '@deepseek-ai/dsh-plugin-market/tools']) {
    const patch = intranetProfilePatches([{ id: 'test', name }])[0]
    assert.equal(patch?.disabled, true, name)
  }
})

test('keyless custom OpenAI requests have an SDK placeholder while real keys always win', () => {
  assert.equal(compatibleApiKey('openai-completions', undefined, false), 'intranet-no-auth')
  assert.equal(compatibleApiKey('openai-completions', 'real-key', true), 'real-key')
  assert.equal(compatibleApiKey('anthropic-messages', undefined, false), undefined)
  assert.equal(compatibleApiKey('openai-completions', undefined, true), undefined)
  assert.equal(compatibleApiKey('openai-completions', undefined, false, false), undefined)
})

test('desktop external requests require explicit opt-in, including when a feed is set', () => {
  assert.equal(desktopExternalNetworkAllowed({}), false)
  assert.equal(desktopExternalNetworkAllowed({ DSH_ALLOW_EXTERNAL_NETWORK: '0' }), false)
  assert.equal(desktopExternalNetworkAllowed({ DSH_WIN7_UPDATE_URL: 'https://github.com/example' }), false)
  assert.equal(desktopExternalNetworkAllowed({ DSH_ALLOW_EXTERNAL_NETWORK: '1' }), true)
})

test('project records community sources and has no official write destination', () => {
  const lock = JSON.parse(readFileSync(new URL('../sources.lock.json', import.meta.url)))
  assert.equal(lock.harness.commit, '4ceb42e98f22b9c11778e12f4349faec2d3b6604')
  assert.equal(lock.project_repository, 'https://github.com/Sebastian6848/DeepSeek-Harness-in-Win7.git')
})
