const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Run the page's real handlers and RHF validators. The API is always mocked:
// these tests must never create a real account or upload identity documents.
function parse(file) {
  return ts.createSourceFile(file, fs.readFileSync(path.join(__dirname, file), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}
const page = parse('../src/pages/DriverRegisterPage.tsx')
function find(source, predicate) {
  const found = []
  function visit(node) {
    if (predicate(node)) found.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}
function compile(text, context, result) {
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return vm.runInNewContext(`${js}; ${result}`, context)
}
function handler(source, name, context) {
  const node = find(source, (n) => ts.isFunctionDeclaration(n) && n.name?.text === name)[0]
  assert.ok(node, `Missing real handler ${name}`)
  return compile(node.getText(source), context, name)
}
function harness(overrides = {}) {
  const calls = [], navigation = [], errors = [], steps = []
  const context = {
    submitLock: { current: false }, cni: { name: 'identity.pdf' }, cniBack: null,
    photo: null, drivingLicense: null, acceptedTerms: true, activationToken: 'test-activation',
    setServerError: (value) => errors.push(value), setFileError: (value) => errors.push(value),
    setServerFieldErrors: () => {}, setShowTermsError: () => {}, focusForm: () => {},
    setStep: (value) => steps.push(value), t: (key) => key,
    STEP1_FIELDS: ['email', 'phone', 'password'],
    AxiosError: class extends Error { constructor(data) { super('validation'); this.response = { data } } },
    registerDriver: async (payload) => { calls.push(payload); return { token: 'mock-token' } },
    navigate: (...args) => navigation.push(args),
    ...overrides,
  }
  return { run: handler(page, 'onSubmit', context), context, calls, navigation, errors, steps }
}
const values = { vehicle_type: 'moto', cni_type: 'cip', referral_code: 'TEST-REF' }

test('concurrent submits create one application and preserve activation/referral', async () => {
  let finish
  const h = harness()
  h.context.registerDriver = (payload) => {
    h.calls.push(payload)
    return new Promise((resolve) => { finish = resolve })
  }
  const first = h.run(values)
  await h.run(values)
  assert.equal(h.calls.length, 1)
  finish({ token: 'mock-token' })
  await first
  await h.run(values)
  assert.equal(h.calls.length, 1, 'success stays locked until navigation')
  assert.equal(h.calls[0].referral_code, 'TEST-REF')
  assert.equal(h.calls[0].activation_token, 'test-activation')
  assert.equal(h.calls[0].cni_back, null)
  assert.equal(h.calls[0].driving_license, null)
  assert.equal(h.navigation.length, 1)
  assert.equal(h.navigation[0][0], '/register/driver/success')
  assert.equal(h.navigation[0][1].state.registrationToken, 'mock-token')
})

test('a failed request can be retried, with first-step server errors made visible', async () => {
  const h = harness()
  h.context.registerDriver = async () => { throw new h.context.AxiosError({ errors: { email: ['Already used'] } }) }
  await h.run(values)
  assert.equal(h.context.submitLock.current, false)
  assert.deepEqual(h.steps, [1])
  h.context.registerDriver = async (payload) => { h.calls.push(payload); return { token: 'retry-token' } }
  await h.run(values)
  assert.equal(h.calls.length, 1)
  assert.equal(h.navigation.length, 1)
})

test('required documents and consent prevent any API call', async () => {
  for (const [overrides, payload] of [
    [{ cni: null }, values], [{}, { ...values, cni_type: 'cnib' }],
    [{}, { ...values, vehicle_type: 'voiture' }], [{ acceptedTerms: false }, values],
  ]) {
    const h = harness(overrides)
    await h.run(payload)
    assert.equal(h.calls.length, 0)
    assert.equal(h.context.submitLock.current, false)
  }
})

test('step one only advances after validation and never calls the registration API', async () => {
  for (const valid of [false, true]) {
    const h = harness({ trigger: async () => valid })
    await handler(page, 'goToStep2', h.context)()
    assert.equal(h.calls.length, 0)
    assert.deepEqual(h.steps, valid ? [2] : [])
  }
})

test('real field validators reject mismatched passwords, malformed emails and underage dates', () => {
  const nodes = find(page, (n) => ts.isCallExpression(n) && n.expression.getText(page) === 'register')
  function rules(field) {
    const node = nodes.find((n) => n.arguments[0]?.text === field)
    return compile(`const rules = ${node.arguments[1].getText(page)}`, {
      t: (key) => key, getValues: () => 'matching-password', MAX_BIRTH_DATE: '2010-10-05',
    }, 'rules')
  }
  assert.equal(rules('password_confirmation').validate('matching-password'), true)
  assert.notEqual(rules('password_confirmation').validate('different-password'), true)
  assert.equal(rules('email').pattern.value.test('invalid'), false)
  assert.equal(rules('email').pattern.value.test('candidate@example.test'), true)
  assert.equal(rules('birth_date').validate('1990-01-01'), true)
  assert.notEqual(rules('birth_date').validate('2020-01-01'), true)
})

test('file validation rejects oversized PDFs and accepts compressed camera photos once', async () => {
  const source = parse('../src/components/driver/DocumentCapture.tsx')
  const changes = [], errors = []
  const context = {
    allowPdf: true, minDimension: 500, t: (key) => key,
    setLocalError: (error) => errors.push(error), setProcessing: () => {},
    onChange: (file) => changes.push(file),
    getImageDimensions: async () => ({ width: 1000, height: 1000 }),
    compressImage: async () => ({ type: 'image/jpeg', size: 300000 }),
  }
  const select = handler(source, 'handleSelected', context)
  await select({ type: 'application/pdf', size: 6 * 1024 * 1024 })
  assert.equal(changes.length, 0)
  assert.ok(errors.includes('driverRegister.recruitment.fileTooLarge'))
  await select({ type: 'image/jpeg', size: 8 * 1024 * 1024 })
  assert.equal(changes.length, 1)
  assert.equal(changes[0].size, 300000)
  context.allowPdf = false
  await select({ type: 'application/pdf', size: 1024 })
  assert.equal(changes.length, 1)
})
