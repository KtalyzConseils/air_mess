const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { runInNewContext } = require('node:vm')
const ts = require('typescript')
const { QueryClient } = require('@tanstack/react-query')
let session = { token: 'session-one', user: { id: 1 }, hydrated: true }
let memo
const clients = []
const exportsObject = {}
const jsx = (type, props) => ({ type, props })
runInNewContext(ts.transpileModule(readFileSync(join(__dirname, '../src/app/_layout.tsx'), 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText, {
  exports: exportsObject,
  require: (name) => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
    if (name === 'react') return {
      useState: (value) => [value, () => {}], useEffect: () => {},
      useMemo: (fn, deps) => {
        if (!memo || memo.token !== deps[0]) memo = { token: deps[0], value: fn() }
        return memo.value
      },
    }
    if (name === '@tanstack/react-query') return {
      QueryClient: class extends QueryClient { constructor() { super(); clients.push(this) } },
    }
    if (name === '../stores/authStore') return { useAuthStore: () => session }
    if (name === '@expo-google-fonts/plus-jakarta-sans') return { useFonts: () => [true] }
    return new Proxy({}, { get: () => () => ({}) })
  },
})
const render = exportsObject.default
render()
const oldClient = clients.at(-1)
oldClient.setQueryData(['my-active'], [{ handover_code: '012345' }])
render()
assert.equal(clients.length, 1, 'Un rendu dans la même session conserve son cache')
session = { ...session, token: null, user: null }
render()
assert.equal(clients.at(-1).getQueryData(['my-active']), undefined)
session = { ...session, token: 'session-two', user: { id: 2 } }
render()
const newClient = clients.at(-1)
assert.equal(newClient.getQueryData(['my-active']), undefined)
oldClient.setQueryData(['my-active'], [{ handover_code: 'late-response' }])
assert.equal(newClient.getQueryData(['my-active']), undefined, 'Une réponse ancienne ne contamine pas le nouveau compte')
newClient.setQueryData(['my-active'], [{ pickup_from_previous_driver: true }])
assert.deepEqual(newClient.getQueryData(['my-active']), [{ pickup_from_previous_driver: true }])
for (const client of clients) client.clear()
console.log('Session cache: all assertions passed')
