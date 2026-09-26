// Test du rendu conditionnel sans charger les modules natifs ni démarrer Expo.
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { runInNewContext } = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const source = readFileSync(join(__dirname, '../src/components/ActiveCourseCard.tsx'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText
const exportsObject = {}
const jsx = (type, props) => ({ type, props })
runInNewContext(compiled, {
  exports: exportsObject,
  require: (name) => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' }
    if (name === 'react') return { useState: (value) => [value, () => {}] }
    if (name === '@tanstack/react-query') return { useQueryClient: () => ({}), useMutation: () => ({ isPending: false }) }
    return new Proxy({}, { get: (_, key) => String(key) })
  },
})
function texts(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(texts).join(' ')
  return node && typeof node === 'object' ? texts(node.props?.children) : ''
}
const course = { id: 1, reference: 'TEST', status: 'picked_up', delivery_fee: 0 }
const render = (overrides) => texts(exportsObject.default({ course: { ...course, ...overrides } }))
const holder = render({ holding_for_transfer: true, pickup_from_previous_driver: true, handover_code: '012345', handover_to: { id: 2, name: 'Livreur attendu test' } })
assert.equal(holder.split('012345').length - 1, 1, 'Le code doit apparaître une seule fois')
assert.match(holder, /Livreur attendu test/)
for (const action of ['SOS', 'Incident', 'Abandonner', 'Confirmer la réception avec le code']) assert.ok(!holder.includes(action), action)
for (const state of [{}, { status: 'returning_to_sender', abandonment_pending: true }, { pickup_from_previous_driver: true }]) {
  const output = render(state)
  for (const action of ['SOS', 'Incident', 'Abandonner']) assert.ok(output.includes(action), action)
  assert.ok(!output.includes('En attente de remise du colis'))
}
assert.match(render({ pickup_from_previous_driver: true }), /Confirmer la réception avec le code/)
assert.match(render({ holding_for_transfer: true }), /Code indisponible/)
const waiting = render({ abandonment_pending: true })
assert.match(waiting, /en attente des opérations/)
for (const action of ['SOS', 'Incident', 'Abandonner', 'Code de remise']) assert.ok(!waiting.includes(action), action)
console.log('Handover view: all assertions passed')
