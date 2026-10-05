const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { QueryClient } = require('@tanstack/react-query')

// Evaluate the actual event handler from the layout against a real query cache.
function completionHandler(queryClient, navigations) {
  const source = ts.createSourceFile('layout.tsx', fs.readFileSync(
    path.join(__dirname, '../src/app/_layout.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const handlers = []
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'addListener'
      && node.arguments[0]?.text === 'airmess-course-action-completed') handlers.push(node.arguments[1])
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.equal(handlers.length, 1, 'There must be one global completion handler')
  const js = ts.transpileModule(`const handle = ${handlers[0].getText(source)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return vm.runInNewContext(`${js}\nhandle`, {
    queryClient, setPendingCourseId: () => {},
    router: { dismissTo: (route) => navigations.push(route) },
  })
}

test('refusal removes only its course before navigation and cancels a stale fetch', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  const courses = [{ id: 1, status: 'assigned' }, { id: 2, status: 'assigned' }]
  client.setQueryData(['my-active'], courses)
  let release
  const pending = client.fetchQuery({ queryKey: ['my-active'], queryFn: () => new Promise((resolve) => { release = resolve }) }).catch(() => {})
  const navigations = []
  const handle = completionHandler(client, navigations)
  handle({ courseId: 1, action: 'decline' })
  assert.deepEqual(client.getQueryData(['my-active']).map((course) => course.id), [2])
  release(courses)
  await pending
  assert.deepEqual(client.getQueryData(['my-active']).map((course) => course.id), [2])
  assert.equal(navigations.length, 0)
  client.clear()
})

test('normal acceptance keeps the assigned course accessible and navigates once', () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  client.setQueryData(['my-active'], [{ id: 1, status: 'assigned' }])
  const navigations = []
  completionHandler(client, navigations)({ courseId: 1, action: 'accept' })
  assert.equal(client.getQueryData(['my-active'])[0].status, 'assigned')
  assert.deepEqual(navigations, ['/(tabs)'])
  client.clear()
})

// Execute the production coordinator with native boundaries replaced by local fakes.
function harness(overrides = {}) {
  const storage = new Map()
  const events = []
  const cancelled = []
  const calls = []
  const notifications = []
  const channels = []
  const api = {
    acceptCourse: async (id) => calls.push(['accept', id]),
    declineCourse: async (id) => calls.push(['decline', id]),
    declineReassignment: async (id) => calls.push(['decline-reassignment', id]),
    fetchMyActiveCourses: async () => [{ id: 1, status: 'assigned' }],
    transition: async (...args) => calls.push(['transition', ...args]),
    ...overrides,
  }
  const native = {
    cancelNotification: async (id) => cancelled.push(id),
    createChannel: async (channel) => channels.push(channel),
    displayNotification: async (notification) => notifications.push(notification),
  }
  const deps = {
    'expo-secure-store': {
      getItemAsync: async (key) => storage.get(key) ?? null,
      setItemAsync: async (key, value) => storage.set(key, value),
      deleteItemAsync: async (key) => storage.delete(key),
    },
    'react-native': {
      AppState: { currentState: 'active' },
      DeviceEventEmitter: { emit: (...args) => events.push(args) },
    },
    './notifeeSafe': { __esModule: true, default: native, AndroidImportance: { HIGH: 4 }, AndroidCategory: { CALL: 'call' }, AndroidVisibility: { PUBLIC: 1 }, EventType: { ACTION_PRESS: 2 } },
    './notifications': { IS_EXPO_GO: true },
    '../api/driver': api,
    '../api/notifications': { acknowledgePushReceipt: async () => {} },
  }
  const filename = path.join(__dirname, '../src/lib/registerBackgroundNotifications.ts')
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, require: (name) => {
    assert.ok(name in deps, `Unexpected dependency: ${name}`)
    return deps[name]
  }, console, Date, Map, Promise })
  return { coordinator: exports, events, cancelled, calls, storage, notifications, channels }
}

test('simultaneous screen and notification responses execute acceptance only once', async () => {
  const h = harness()
  const first = h.coordinator.respondToIncomingCourse(1, 'accept')
  const second = h.coordinator.respondToIncomingCourse(1, 'accept')
  assert.equal(first, second)
  await Promise.all([first, second])
  assert.deepEqual(h.calls, [['accept', 1]])
  assert.equal(h.events.filter(([name]) => name === 'airmess-course-action-completed').length, 1)
})

test('reassignment starts pickup exactly once without calling normal acceptance', async () => {
  const h = harness()
  await Promise.all([
    h.coordinator.respondToIncomingCourse(1, 'accept', true),
    h.coordinator.respondToIncomingCourse(1, 'accept', true),
  ])
  assert.deepEqual(h.calls, [['transition', 1, 'start_to_pickup']])
})

test('reassignment already started does not repeat the transition', async () => {
  const h = harness({ fetchMyActiveCourses: async () => [{ id: 1, status: 'driver_to_pickup' }] })
  await h.coordinator.respondToIncomingCourse(1, 'accept', true)
  assert.equal(h.calls.length, 0)
})

test('parcel transfer is informational and never starts pickup', async () => {
  const h = harness({ fetchMyActiveCourses: async () => [{ id: 1, status: 'picked_up', pickup_from_previous_driver: true }] })
  assert.equal(h.coordinator.isCallType('course.assigned_transfer'), false)
  await h.coordinator.respondToIncomingCourse(1, 'accept', true)
  assert.equal(h.calls.length, 0)
  assert.ok(h.events.some(([name]) => name === 'airmess-course-unavailable'))
})

test('accepting another notification stops the current call and clears pending alerts', async () => {
  const h = harness()
  h.coordinator.setActiveIncomingCourse(2)
  await h.coordinator.enqueueCourseFromPush({ type: 'course.offered', course_id: 2 })
  await h.coordinator.respondToIncomingCourse(1, 'accept')
  assert.ok(h.events.some(([name, data]) => name === h.coordinator.COURSE_ALERT_STOP && data.courseId === 2))
  assert.equal(h.coordinator.getActiveIncomingCourse(), null)
  assert.equal((await h.coordinator.getRingQueue()).length, 0)
  assert.ok(h.cancelled.includes('incoming-course-2'))
})

test('unavailable offer removes its ringing notification without completing acceptance', async () => {
  const h = harness({ acceptCourse: async () => { throw { response: { status: 409 } } }, fetchMyActiveCourses: async () => [] })
  await h.coordinator.respondToIncomingCourse(1, 'accept')
  assert.ok(h.events.some(([name]) => name === 'airmess-course-unavailable'))
  assert.ok(!h.events.some(([name]) => name === 'airmess-course-action-completed'))
})

test('failed action releases the lock so the driver can retry', async () => {
  let attempts = 0
  const h = harness({ acceptCourse: async () => { if (++attempts === 1) throw Error('offline') }, fetchMyActiveCourses: async () => [] })
  await assert.rejects(h.coordinator.respondToIncomingCourse(1, 'accept'))
  await h.coordinator.respondToIncomingCourse(1, 'accept')
  assert.equal(attempts, 2)
})

test('duplicate declines use one request and reassignment uses its own endpoint', async () => {
  for (const reassigned of [false, true]) {
    const h = harness()
    await Promise.all([
      h.coordinator.respondToIncomingCourse(1, 'decline', reassigned),
      h.coordinator.respondToIncomingCourse(1, 'decline', reassigned),
    ])
    assert.deepEqual(h.calls, [[reassigned ? 'decline-reassignment' : 'decline', 1]])
  }
})

test('pruning the ringing offer cancels both notification forms and emits stop', async () => {
  const h = harness()
  h.storage.set('airmess_ringing', JSON.stringify({ course_id: 1, ts: Date.now() }))
  await h.coordinator.dismissUnavailableCourse(1)
  assert.ok(h.cancelled.includes('incoming-course-alert'))
  assert.ok(h.cancelled.includes('incoming-course-1'))
  assert.ok(h.events.some(([name]) => name === h.coordinator.COURSE_ALERT_STOP))
  assert.equal(h.storage.has('airmess_ringing'), false)
})

test('first foreground offer opens a call; subsequent offers keep the reference notification sound', async () => {
  const h = harness()
  await h.coordinator.showIncomingCourseNotification({ type: 'course.offered', course_id: 1 })
  assert.equal(h.notifications.length, 0)
  assert.equal(h.events.filter(([name]) => name === 'airmess-incoming-course').length, 1)
  h.coordinator.setActiveIncomingCourse(1)
  await h.coordinator.showIncomingCourseNotification({ type: 'course.offered', course_id: 2 })
  assert.equal(h.notifications.length, 1)
  assert.equal(h.channels[0].sound, 'new_course_ring')
  assert.equal(h.channels[0].id, 'incoming-call-v2')
  assert.equal(h.notifications[0].android.channelId, h.channels[0].id)
  assert.equal(h.notifications[0].android.sound, 'new_course_ring')
  assert.equal(h.notifications[0].android.actions.length, 2)
  assert.equal(h.notifications[0].android.fullScreenAction, undefined)
  h.coordinator.releaseActiveIncomingCourse(2)
  assert.equal(h.coordinator.getActiveIncomingCourse(), 1)
})
