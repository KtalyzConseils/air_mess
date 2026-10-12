const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function run(file, mocks) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`)
    return mocks[name]
  }, process: { env: {} }, __DEV__: true })
  return exports
}

test('only authenticated 401 responses invalidate a session, not network/403/login errors', async () => {
  const events = []
  let reject
  run('api/client.ts', {
    axios: { __esModule: true, default: { create: () => ({ interceptors: {
      request: { use: () => {} }, response: { use: (_, handler) => { reject = handler } },
    } }) } },
    'expo-secure-store': {},
    'react-native': { DeviceEventEmitter: { emit: (...args) => events.push(args) } },
  })
  for (const [status, url, authorization] of [
    [401, '/driver/courses', 'Bearer old'], [403, '/driver/courses', 'Bearer old'],
    [undefined, '/auth/me', 'Bearer old'], [401, '/auth/login', 'Bearer old'], [401, '/auth/me', undefined],
  ]) {
    await reject({ response: status ? { status } : undefined, config: { url, headers: { Authorization: authorization } } }).catch(() => {})
  }
  assert.equal(events.length, 1)
  assert.equal(events[0][1].token, 'old')
})

test('duplicate or stale 401 responses never clear a new session or repeat cleanup', async () => {
  let state
  let deletes = 0
  let stops = 0
  run('stores/authStore.ts', {
    zustand: { create: (init) => { state = init((patch) => Object.assign(state, patch), () => state); return state } },
    'expo-secure-store': { deleteItemAsync: async () => { deletes++ } },
    '../api/client': {}, '../lib/locationTask': { stopLocationTracking: async () => { stops++ } },
  })
  state.token = 'current'
  state.user = { id: 1 }
  await state.expireSession('old')
  assert.equal(state.token, 'current')
  await Promise.all([state.expireSession('current'), state.expireSession('current')])
  assert.equal(state.user, null)
  assert.equal(deletes, 1)
  assert.equal(stops, 1)
  assert.ok(state.sessionMessage)
})
