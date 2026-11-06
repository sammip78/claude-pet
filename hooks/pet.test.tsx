import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

const BAND = {
  plugin: 'pet',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
} as const

const SAVE = 'mcp__pet__save_avatar'

const ROW = '.'.repeat(24)
const MINE = {
  name: 'Ada',
  outfit: 'a blue hoodie',
  palette: { S: '#E0B090', B: '#123456' },
  body: Array.from({ length: 38 }, (_, y) => (y === 0 ? 'B'.repeat(24) : ROW)),
  faces: { working: {}, happy: { 3: 'S'.repeat(24) }, oops: {} },
}

const alt = async (ui: { find: (q: { type: 'Svg' }) => Promise<unknown> }) =>
  JSON.stringify(await ui.find({ type: 'Svg' }))

test('the desktop draws the character, the terminal its head and shoulders', async $ => {
  const desktop = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await alt(desktop)).toContain('Pixel Sam, standing in a red number 7 shirt')
  expect(await alt(desktop)).not.toContain('cloud')
  await desktop.unmount()

  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await terminal.find({ type: 'Raster' })).toBeDefined()
  await terminal.unmount()
})

test('a failed test run worries it, and passing again cheers it up', async ($, on) => {
  let isError: true | undefined = true
  on('tool.call', () => (isError ? { result: {}, isError } : { result: {} }))

  await $.tool.call({ tool: 'Bash', command: 'cd ui && npx vitest run' })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Tests red. Deep breath.')
  expect(await alt(ui)).toContain('looking worried')
  await ui.unmount()

  isError = undefined
  await $.tool.call({ tool: 'Bash', command: 'npx vitest run' })
  const after = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await after.find({ type: 'Text' }))?.text).toBe('Back to green.')
  await after.unmount()
})

test('a search that finds nothing is not a failed test run', async ($, on) => {
  on('tool.call', () => ({ result: {}, isError: true }))

  await $.tool.call({ tool: 'Bash', command: 'grep -r vitest src' })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text' })).toBeUndefined()
  await ui.unmount()
})

test('it looks busy during a turn, and a subagent does not end that', async ($, on) => {
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))

  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({
    answer: '',
    durationMs: 1,
    isAborted: false,
    turnId: 'a1',
    agentId: 'sub',
    reason: 'answer',
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await alt(ui)).toContain('busy on a laptop')
  expect(await alt(ui)).toContain('cloud')
  await ui.unmount()
})

test('/pet quiet hides the comments and remembers it', async ($, on) => {
  const stored: Record<string, unknown> = {}
  on('store.set', (_, e) => {
    stored[e.key] = e.value

    return { value: undefined }
  })
  on('tool.call', () => ({ result: {}, isError: true }))

  await $.tool.call({ tool: 'Bash', command: 'npx vitest run' })
  await $.command.run({
    command: 'pet:pet',
    args: 'quiet',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
  expect(stored.isQuiet).toBe(true)

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text' })).toBeUndefined()
  await ui.unmount()
})

test('a failure from an earlier turn does not keep nagging', async ($, on) => {
  on('tool.call', () => ({ result: {}, isError: true }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  const end = {
    answer: '',
    durationMs: 1,
    isAborted: false,
    reason: 'answer',
  } as const

  await $.turn.start({ text: 'one', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npx vitest run' })
  await $.turn.complete({ ...end, turnId: 't1' })
  await $.turn.start({ text: 'two', turnId: 't2' })
  await $.turn.complete({ ...end, turnId: 't2' })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await alt(ui)).toContain('standing in a red number 7 shirt')
  expect(await ui.find({ type: 'Text' })).toBeUndefined()
  await ui.unmount()
})

test('another mod in the strip stays, under the pet', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>other band</Text>
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await alt(ui)).toContain('Pixel Sam')
  expect(await ui.find({ type: 'Text', text: /other band/ })).toBeDefined()
  await ui.unmount()
})

test('a failed test run still worries it when the exit code is hidden', async ($, on) => {
  on('tool.call', () => ({ result: { stdout: 'ℹ pass 0\nℹ fail 1\nexit=1\n' } }))

  await $.tool.call({ tool: 'Bash', command: 'npm test; echo "exit=$?"' })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await alt(ui)).toContain('looking worried')
  await ui.unmount()
})

test('a passing run that mentions zero failures stays calm', async ($, on) => {
  on('tool.call', () => ({ result: { stdout: 'Tests  3 passed, 0 failed\n' } }))

  await $.tool.call({ tool: 'Bash', command: 'npm test | tail -5' })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await alt(ui)).not.toContain('looking worried')
  await ui.unmount()
})

const startSession = async (
  $: Parameters<TestBody>[0],
  on: Parameters<TestBody>[1],
  saved: unknown,
) => {
  on('tool.register', (_, e) => ({ value: { tool: `mcp__pet__${e.name}` } }))
  on('store.get', (_, e) => ({ value: e.key === 'avatar' ? saved : undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
}

test('a saved avatar replaces the default pet at once', async ($, on) => {
  const stored: Record<string, unknown> = {}
  on('store.set', (_, e) => {
    stored[e.key] = e.value

    return { value: undefined }
  })

  const saved = await $.tool.call({ tool: SAVE, avatar: MINE })
  expect(saved.deny).toBeUndefined()
  expect(stored.avatar).toEqual(MINE)

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await alt(ui)).toContain('Pixel Ada, standing in a blue hoodie')
  expect(await alt(ui)).not.toContain('Sam')
  await ui.unmount()
})

test('a saved avatar is back in the next chat', async ($, on) => {
  await startSession($, on, MINE)

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await alt(ui)).toContain('Pixel Ada')
  await ui.unmount()
})

test('a broken saved avatar falls back to the default pet', async ($, on) => {
  await startSession($, on, { ...MINE, body: ['nope'] })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await alt(ui)).toContain('Pixel Sam')
  await ui.unmount()
})

for (const [why, avatar, says] of [
  ['a short row', { ...MINE, body: ['SS', ...MINE.body.slice(1)] }, 'body row 0'],
  ['a missing row', { ...MINE, body: MINE.body.slice(1) }, '38 rows'],
  ['an unknown letter', { ...MINE, body: ['Z'.repeat(24), ...MINE.body.slice(1)] }, '"Z"'],
  ['markup in a colour', { ...MINE, palette: { ...MINE.palette, B: '"/><script>' } }, 'palette entry "B"'],
  ['no skin colour', { ...MINE, palette: { B: '#123456' }, faces: { working: {}, happy: {}, oops: {} } }, 'needs S'],
  ['a bad mood row', { ...MINE, faces: { ...MINE.faces, oops: { 3: 'S' } } }, 'faces.oops row 3'],
  ['a row past the end', { ...MINE, faces: { ...MINE.faces, oops: { 38: ROW } } }, 'outside the body'],
  ['no mood rows', { ...MINE, faces: { working: {}, happy: {} } }, 'faces.oops'],
  ['no name', { ...MINE, name: ' ' }, 'name must'],
] as const) {
  test(`${why} is refused and the old pet stays`, async ($, on) => {
    const stored: Record<string, unknown> = {}
    on('store.set', (_, e) => {
      stored[e.key] = e.value

      return { value: undefined }
    })

    const saved = await $.tool.call({ tool: SAVE, avatar })
    expect(saved.deny).toContain(says)
    expect(stored.avatar).toBeUndefined()

    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    expect(await alt(ui)).toContain('Pixel Sam')
    await ui.unmount()
  })
}

test('/pet talk is answered here, and anything else goes on to the skill', async ($, on) => {
  const reached: string[] = []
  on('store.set', () => ({ value: undefined }))
  on('command.run', (_, e) => {
    reached.push(e.args)

    return { text: 'skill' }
  })
  const run = (args: string) =>
    $.command.run({
      command: 'pet:pet',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })

  expect((await run('talk')).text).toBe('Pixel Sam is talking again.')
  expect(reached).toEqual([])
  await run('~/me.jpg')
  expect(reached).toEqual(['~/me.jpg'])
})
