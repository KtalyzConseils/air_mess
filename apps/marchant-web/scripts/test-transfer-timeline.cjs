const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { runInNewContext } = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const output = {}
const code = ts.transpileModule(readFileSync(join(__dirname, '../src/components/Timeline.tsx'), 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText
runInNewContext(code, { exports: output, require: (name) => name === 'react-i18next' ? {
  useTranslation: () => ({ i18n: { language: 'fr' }, t: (key, fallback) => key === 'courseStatus.picked_up' ? 'Colis récupéré' : fallback || key }),
} : require(name) })
const base = { to_status: 'picked_up', created_at: '2026-09-26T10:00:00Z', changed_by: null, reason: null }
const items = [
  { ...base, id: 1, metadata: null },
  { ...base, id: 2, metadata: { pickup_from_previous_driver: true } },
  { ...base, id: 3, metadata: { transfer_confirmed: true } },
]
const html = renderToStaticMarkup(React.createElement(output.default, { items }))
assert.equal((html.match(/Colis transféré au nouveau livreur/g) || []).length, 1)
assert.equal((html.match(/Colis récupéré/g) || []).length, 2)
assert.ok(html.indexOf('Colis récupéré') < html.indexOf('Colis transféré'))
assert.ok(html.lastIndexOf('Colis récupéré') > html.indexOf('Colis transféré'))
assert.equal((html.match(/<li /g) || []).length, 3)
console.log('Transfer timeline: all assertions passed')
