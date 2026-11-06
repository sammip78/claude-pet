import { atom, read, update } from 'claude-code'
import type { Register, StateDollar } from 'claude-code'

import type { Avatar, Mood } from '../types'
import { SAM } from './sam'

const SCALE = 3
const LONG_TURN_MS = 120_000
// Head and shoulders only: the whole body is too tall for a terminal.
const TERMINAL_PIXEL_ROWS = 24
const WIDTH = 24
const HEIGHT = 38
// Sticker edge, so black hair still shows on a dark background.
const OUTLINE = '#F2F2F2'
const SAVE_AVATAR = 'mcp__pet__save_avatar'

// Every comment the pet can make. The first version sends nothing anywhere.
const LINES = {
  red: 'Tests red. Deep breath.',
  green: 'Back to green.',
  pushed: 'Pushed. No going back.',
  pr: 'PR is up. Good luck out there.',
  long: 'That one took a while.',
  error: 'That did not go well.',
  done: ['Done.', 'Nice one.', 'Another one down.', 'Ship it?'],
}

// Anchored to the start of a command, or `grep vitest` would count as a test run.
const STARTS = String.raw`(?:^|&&|;)\s*`
const TEST_RUN = new RegExp(
  `${STARTS}(?:(?:npx|bunx|pnpm|yarn)\\s+)?(?:vitest|jest|mocha|pytest|playwright\\s+test|(?:npm|pnpm|yarn|bun)\\s+(?:run\\s+)?test|go\\s+test|cargo\\s+test)\\b`,
)
// Agents often hide the exit code (`; echo`, `| tail`), so the summary line counts too.
const FAILED_SUMMARY = /\b[1-9]\d*\s+(?:failed|failing)\b|\bfail\s+[1-9]/i
const GIT_PUSH = new RegExp(`${STARTS}git\\s+push\\b`)
const PR_OPEN = new RegExp(`${STARTS}gh\\s+pr\\s+create\\b`)

const COLOUR = /^#[0-9a-fA-F]{6}$/

const describe = (me: Avatar, m: Mood): string =>
  ({
    idle: `standing in ${me.outfit}`,
    working: 'busy on a laptop',
    happy: 'smiling',
    oops: 'looking worried',
  })[m]

const rowProblem = (row: unknown, palette: object): string | null => {
  if (typeof row !== 'string' || row.length !== WIDTH) {
    return `must be ${WIDTH} characters`
  }

  const stray = [...row].find(
    pixel => pixel !== '.' && !Object.hasOwn(palette, pixel),
  )

  return stray === undefined ? null : `uses "${stray}", which is not in the palette`
}

// The model writes these and they end up inside an SVG, so nothing unchecked gets through.
const avatarProblem = (value: unknown): string | null => {
  const { name, outfit, palette, body, faces } = (value ?? {}) as Partial<
    Record<keyof Avatar, unknown>
  >

  if (typeof name !== 'string' || name.trim() === '' || name.length > 40) {
    return 'name must be 1 to 40 characters'
  }

  if (typeof outfit !== 'string' || outfit.trim() === '' || outfit.length > 60) {
    return 'outfit must be 1 to 60 characters'
  }

  if (typeof palette !== 'object' || palette === null) {
    return 'palette must map single letters to colours'
  }

  const badColour = Object.entries(palette).find(
    ([letter, colour]) =>
      !/^[A-Za-z]$/.test(letter) || typeof colour !== 'string' || !COLOUR.test(colour),
  )

  if (badColour !== undefined) {
    return `palette entry "${badColour[0]}" must be one letter and a #RRGGBB colour`
  }

  if (!Object.hasOwn(palette, 'S')) {
    return 'palette needs S, the skin colour the blink is drawn with'
  }

  if (!Array.isArray(body) || body.length !== HEIGHT) {
    return `body must have ${HEIGHT} rows`
  }

  for (const [y, row] of body.entries()) {
    const problem = rowProblem(row, palette)

    if (problem !== null) {
      return `body row ${y} ${problem}`
    }
  }

  if (typeof faces !== 'object' || faces === null) {
    return 'faces must hold working, happy and oops'
  }

  for (const m of ['working', 'happy', 'oops'] as const) {
    const swaps: unknown = (faces as Record<string, unknown>)[m]

    if (typeof swaps !== 'object' || swaps === null) {
      return `faces.${m} is missing`
    }

    for (const [y, row] of Object.entries(swaps)) {
      if (!/^\d+$/.test(y) || Number(y) >= HEIGHT) {
        return `faces.${m} row ${y} is outside the body`
      }

      const problem = rowProblem(row, palette)

      if (problem !== null) {
        return `faces.${m} row ${y} ${problem}`
      }
    }
  }

  return null
}

const isAvatar = (value: unknown): value is Avatar => avatarProblem(value) === null

const mood = atom({ plugin: 'pet', key: 'mood' } as const, 'idle')
const line = atom({ plugin: 'pet', key: 'line' } as const, null)
const isQuiet = atom({ plugin: 'pet', key: 'isQuiet' } as const, false)
const isRed = atom({ plugin: 'pet', key: 'isRed' } as const, false)
const avatar = atom({ plugin: 'pet', key: 'avatar' } as const, SAM)

const pixels = (me: Avatar, m: Mood): string[] =>
  me.body.map((row, y) => (m === 'idle' ? row : (me.faces[m][y] ?? row)))

const blink = (skin: string | undefined, x: number): string =>
  `<rect x="${x}" y="11" width="2" height="2" fill="${skin}" opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.96;0.99" calcMode="discrete" dur="5s" repeatCount="indefinite"/></rect>`

// A thought bubble beside the head while Claude is on a turn, in the sprite's own pixels.
const CLOUD_LEFT = 21
const CLOUD_WIDTH = 20
const CLOUD = [
  '.......WWWWWW.......',
  '....WWWWWWWWWWWW....',
  '..WWWWWWWWWWWWWWWW..',
  '.WWWWWWWWWWWWWWWWWW.',
  'WWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWWWWW.',
  '..WWWWWWWWWWWWWWWW..',
  '....WWWWWWWWWWWW....',
  '.......WWWWWW.......',
  '....................',
  '..WWW...............',
  '..WWW...............',
  '....................',
  'WW..................',
  'WW..................',
]

const toCloud = (): string => {
  const puffs = CLOUD.flatMap((row, y) =>
    [...row].map((pixel, x) =>
      pixel === 'W' ? `M${CLOUD_LEFT + x} ${y}h1v1h-1z` : '',
    ),
  ).join('')
  const dots = [5, 9, 13]
    .map(
      (x, i) =>
        `<rect x="${CLOUD_LEFT + x}" y="4" width="2" height="2" fill="#34323F"><animate attributeName="opacity" values="0.15;1;0.15" calcMode="discrete" dur="1.2s" begin="${i * 0.3}s" repeatCount="indefinite"/></rect>`,
    )
    .join('')

  return `<g id="cloud"><path fill="#FAFAF8" d="${puffs}"/>${dots}</g>`
}

const artWidth = (m: Mood): number =>
  m === 'working' ? CLOUD_LEFT + CLOUD_WIDTH + 2 : WIDTH + 2

// One path per colour with runs merged, which keeps the markup small.
const toSvg = (me: Avatar, m: Mood): string => {
  const paths = new Map<string, string>()
  let silhouette = ''

  pixels(me, m).forEach((row, y) => {
    for (let x = 0; x < WIDTH; ) {
      const colour = row.charAt(x)
      let end = x + 1

      while (row.charAt(end) === colour) {
        end += 1
      }

      if (colour !== '.') {
        const run = `M${x} ${y}h${end - x}v1h-${end - x}z`
        paths.set(colour, (paths.get(colour) ?? '') + run)
        silhouette += run
      }

      x = end
    }
  })

  const edge = ['-1 0', '1 0', '0 -1', '0 1']
    .map(
      shift =>
        `<path fill="${OUTLINE}" transform="translate(${shift})" d="${silhouette}"/>`,
    )
    .join('')
  const body = [...paths]
    .map(([colour, d]) => `<path fill="${me.palette[colour]}" d="${d}"/>`)
    .join('')
  const eyes =
    m === 'idle' || m === 'working'
      ? blink(me.palette.S, 8) + blink(me.palette.S, 15)
      : ''
  const bob =
    m === 'working'
      ? '<animateTransform attributeName="transform" type="translate" values="0 0;0 1;0 0" calcMode="discrete" dur="0.9s" repeatCount="indefinite"/>'
      : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${artWidth(m)} ${HEIGHT + 3}" shape-rendering="crispEdges"><g>${edge}${body}${eyes}${bob}</g>${m === 'working' ? toCloud() : ''}</svg>`
}

const svgProps = (me: Avatar, m: Mood) => ({
  source: toSvg(me, m),
  alt: `Pixel ${me.name}, ${describe(me, m)}`,
  width: artWidth(m) * SCALE,
  height: (HEIGHT + 3) * SCALE,
  isInteractive: true as const,
})

const DEFAULT_COLOUR = 0x01000000
const UPPER_HALF = 0x2580
const LOWER_HALF = 0x2584

const rgb = (me: Avatar, letter: string): number =>
  Number.parseInt((me.palette[letter] ?? '#000000').slice(1), 16)

// Two pixels to a cell: the half block paints one, the cell behind it the other.
const toCells = (me: Avatar, m: Mood): string => {
  const rows = pixels(me, m).slice(0, TERMINAL_PIXEL_ROWS)
  const words: number[] = []

  for (let y = 0; y < rows.length; y += 2) {
    for (let x = 0; x < WIDTH; x += 1) {
      const top = rows[y]?.charAt(x) ?? '.'
      const bottom = rows[y + 1]?.charAt(x) ?? '.'

      if (top === '.' && bottom === '.') {
        words.push(0x20, DEFAULT_COLOUR, DEFAULT_COLOUR)
      } else if (top === '.') {
        words.push(LOWER_HALF, rgb(me, bottom), DEFAULT_COLOUR)
      } else {
        const behind = bottom === '.' ? DEFAULT_COLOUR : rgb(me, bottom)
        words.push(UPPER_HALF, rgb(me, top), behind)
      }
    }
  }

  // The engine's runtime has toBase64, TypeScript's es2023 lib does not list it.
  const bytes = new Uint8Array(Uint32Array.from(words).buffer) as Uint8Array & {
    toBase64: () => string
  }

  return bytes.toBase64()
}

const say = async (
  $: StateDollar,
  nextMood: Mood,
  text: string | null,
): Promise<void> => {
  await update($, mood, () => nextMood)
  await update($, line, () => text)
}

export const register: Register = on => {
  let finishedTurns = 0

  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'save_avatar',
      description:
        'Saves the pixel pet the /pet skill drew. It shows above the prompt at once and in every new chat.',
      inputSchema: {
        type: 'object',
        properties: {
          avatar: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              outfit: { type: 'string' },
              palette: { type: 'object', additionalProperties: { type: 'string' } },
              body: { type: 'array', items: { type: 'string' } },
              faces: { type: 'object' },
            },
            required: ['name', 'outfit', 'palette', 'body', 'faces'],
          },
        },
        required: ['avatar'],
      },
    })

    const quiet = (await $.store.get('isQuiet')) === true
    await update($, isQuiet, () => quiet)

    const saved = await $.store.get('avatar')

    if (isAvatar(saved)) {
      await update($, avatar, () => saved)
    }

    return next(e)
  })

  on('tool.call', { tool: SAVE_AVATAR }, async ($, e) => {
    const drawn: unknown = (e as { avatar?: unknown }).avatar
    const problem = avatarProblem(drawn)

    if (problem !== null) {
      return { deny: `Not saved: ${problem}.` }
    }

    await $.store.set('avatar', drawn)
    await update($, avatar, () => drawn as Avatar)

    return { result: 'Saved. The pet above the prompt is updated.' }
  })

  // Everything else after /pet belongs to the skill.
  on('command.run', { command: 'pet:pet' }, async ($, e, next) => {
    const wish = e.args.trim()

    if (wish !== 'quiet' && wish !== 'talk') {
      return next(e)
    }

    const quiet = wish === 'quiet'
    await $.store.set('isQuiet', quiet)
    await update($, isQuiet, () => quiet)
    const { name } = await read($, avatar)

    return { text: quiet ? `Pixel ${name} is keeping quiet.` : `Pixel ${name} is talking again.` }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await say($, 'working', null)
    }

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    const hasFailed = ran.deny !== undefined || ran.isError === true

    if (TEST_RUN.test(e.command)) {
      if (hasFailed || FAILED_SUMMARY.test(ran.result?.stdout ?? '')) {
        await update($, isRed, () => true)
        await say($, 'oops', LINES.red)
      } else if (await read($, isRed)) {
        await update($, isRed, () => false)
        await say($, 'working', LINES.green)
      }
    } else if (!hasFailed && GIT_PUSH.test(e.command)) {
      await update($, line, () => LINES.pushed)
    } else if (!hasFailed && PR_OPEN.test(e.command)) {
      await update($, line, () => LINES.pr)
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }

    // The turn began with 'working', so 'oops' here means a test failed this turn.
    const isWorried = (await read($, mood)) === 'oops'

    if (e.reason === 'aborted') {
      await say($, 'idle', null)
    } else if (e.reason !== 'answer') {
      await say($, 'oops', LINES.error)
    } else if (!isWorried) {
      finishedTurns += 1
      const spoken = await read($, line)
      const comment =
        spoken ??
        (e.durationMs > LONG_TURN_MS ? LINES.long : null) ??
        // Every third turn, so it stays a treat rather than noise.
        (finishedTurns % 3 === 0
          ? LINES.done[(finishedTurns / 3) % LINES.done.length] ?? null
          : null)
      await say($, comment === null ? 'idle' : 'happy', comment)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    // Other mods share this strip: keep theirs under the pet instead of replacing it.
    const below = await next(e).catch(() => undefined)
    const current = await read($, mood)
    const me = await read($, avatar)
    const said = (await read($, isQuiet)) ? null : await read($, line)
    const { Box } = $.ui.resolve(e)
    const stack = (pet: NonNullable<typeof below>) =>
      below ? (
        <Box flexDirection="column">
          {pet}
          {below}
        </Box>
      ) : (
        pet
      )

    if (e.surface === 'desktop') {
      const { Svg, Text } = $.ui.resolve(e)

      return stack(
        <Box flexDirection="row" alignItems="flex-end" gap="sm">
          <Svg {...svgProps(me, current)} />
          {said !== null && <Text>{said}</Text>}
        </Box>,
      )
    }

    if (e.surface === 'terminal') {
      const { Raster, Text } = $.ui.resolve(e)

      return stack(
        <Box flexDirection="row" alignItems="flex-end">
          <Raster
            key="pet"
            columns={WIDTH}
            rows={TERMINAL_PIXEL_ROWS / 2}
            cells={toCells(me, current)}
          />
          {said !== null && <Text> {said}</Text>}
        </Box>,
      )
    }

    return below ?? next(e)
  })
}
