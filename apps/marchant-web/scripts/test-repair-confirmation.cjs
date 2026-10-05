const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Execute the actual page handlers with mocked API boundaries: no financial writes.
const source = ts.createSourceFile('page.tsx', fs.readFileSync(path.join(__dirname,
  '../src/pages/admin/AdminReconciliationPage.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const functions = []
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ['handleApplySandboxRepair', 'closeConfirmation'].includes(node.name?.text)) functions.push(node.getText(source))
  ts.forEachChild(node, visit)
}
visit(source)
function harness() {
  const calls = []
  const context = {
    repairLock: { current: false }, confirmationResolver: { current: null },
    data: { sandbox_audit: { snapshot_token: 'original' } },
    setConfirmation: () => {}, setEnteredCode: () => {}, setCodeError: () => {},
    setIsRepairing: () => {}, setRepairMessage: () => {}, t: (key) => key,
    formatFcfa: String, AxiosError: class extends Error {},
    prepareSandboxRepair: async () => { calls.push('prepare'); return {
      confirmation_code: '123456', plan: { snapshot_token: 'prepared', correction_ready: true, user_adjustments: [], driver_adjustments: [] },
    } },
    applySandboxRepair: async (...args) => { calls.push(args); return { message: 'ok' } },
    refetch: async () => {},
  }
  const js = ts.transpileModule(functions.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const handlers = vm.runInNewContext(`${js}; ({ run: handleApplySandboxRepair, close: closeConfirmation })`, context)
  return { ...handlers, context, calls }
}
test('double clicks prepare and apply only once, using the prepared snapshot', async () => {
  const h = harness()
  const pending = h.run()
  await h.run()
  h.context.data.sandbox_audit.snapshot_token = 'changed'
  h.close('123456')
  h.close('123456')
  await pending
  assert.deepEqual(h.calls, ['prepare', ['prepared', '123456']])
  assert.equal(h.context.repairLock.current, false)
})
test('cancel and incorrect code never apply a financial correction', async () => {
  for (const code of [null, 'wrong']) {
    const h = harness()
    const pending = h.run()
    await new Promise((resolve) => setImmediate(resolve))
    h.close(code)
    await pending
    assert.deepEqual(h.calls, ['prepare'])
    assert.equal(h.context.repairLock.current, false)
  }
})
