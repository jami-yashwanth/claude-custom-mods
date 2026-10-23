import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMeasureInput, SessionUsage } from 'claude-code'

import type { Category, Limit, Tokens, Usage } from '../types'

const PANE = 'session-usage'
const NO_TOKENS: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const usage = atom({ plugin: 'session-usage', key: 'usage' } as const, null)
const tokens = atom({ plugin: 'session-usage', key: 'tokens' } as const, NO_TOKENS)
const turns = atom({ plugin: 'session-usage', key: 'turns' } as const, 0)
const history = atom({ plugin: 'session-usage', key: 'history' } as const, [])
const categories = atom({ plugin: 'session-usage', key: 'categories' } as const, [])
const isHidden = atom({ plugin: 'session-usage', key: 'isHidden' } as const, false)

const LIMIT_NAMES: Record<string, string> = { five_hour: '5-hour', seven_day: 'Weekly', spend_limit: 'Spend' }
const PALETTE = ['#378ADD', '#1D9E75', '#534AB7', '#85B7EB', '#5DCAA5', '#AFA9EC', '#185FA5']
const TRACK = '#8b949e'
const OCEAN: Record<string, string> = { Context: '#378ADD', '5-hour': '#1D9E75', Weekly: '#534AB7' }
const HOT = '#E24B4A'
const SPARKS = '▁▂▃▄▅▆▇█'

const toUsage = ({ context, rateLimits }: SessionUsage | SessionMeasureInput): Usage => ({
  ...(context.tokens === undefined ? {} : { contextTokens: context.tokens }),
  contextWindow: context.window,
  ...(context.percent === undefined ? {} : { contextPercent: context.percent }),
  limits: rateLimits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, ...(resetsAt ? { resetsAt } : {}) })),
})

export const formatTokens = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

export const formatReset = (resetsAt: string | undefined, now: number): string => {
  if (!resetsAt) return ''
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days > 0) return `resets in ${days}d ${hours}h`
  return hours > 0 ? `resets in ${hours}h ${minutes % 60}m` : `resets in ${minutes}m`
}

export const shortReset = (resetsAt: string | undefined, now: number): string => {
  if (!resetsAt) return ''
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days > 0) return `${days}d ${hours}h`
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

export const thinBar = (percent: number, cells: number): [string, string] => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * cells)
  return ['━'.repeat(filled), '─'.repeat(cells - filled)]
}

const slimBar = (percent: number, hex: string, w = 170): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="6" viewBox="0 0 ${w} 6"><rect width="${w}" height="6" rx="3" fill="${TRACK}" fill-opacity="0.25"/><rect width="${((Math.min(100, Math.max(0, percent)) / 100) * w).toFixed(1)}" height="6" rx="3" fill="${hex}"/></svg>`

export const severity = (percent: number): 'success' | 'warning' | 'error' =>
  percent >= 85 ? 'error' : percent >= 60 ? 'warning' : 'success'

export const meter = (percent: number, cells: number): [string, string] => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * cells)
  return ['▰'.repeat(filled), '▱'.repeat(cells - filled)]
}

export const sparkline = (values: number[]): string =>
  values.map(v => SPARKS[Math.min(SPARKS.length - 1, Math.floor((v / 100) * SPARKS.length))]).join('')

const openPane = ($: EngineInterface) => $.ui.open({ id: PANE, title: 'Session usage' })

const trend = (values: number[]): string => {
  const w = 360
  const h = 72
  const pad = 4
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0
  const y = (v: number) => h - pad - (Math.min(100, v) / 100) * (h - pad * 2)
  const pts = values.map((v, i) => `${(pad + i * step).toFixed(1)},${y(v).toFixed(1)}`)
  const last = values[values.length - 1] ?? 0
  const hex = last >= 85 ? HOT : OCEAN.Context
  const lastPt = pts[pts.length - 1]?.split(',') ?? ['0', '0']
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<line x1="${pad}" y1="${y(85).toFixed(1)}" x2="${w - pad}" y2="${y(85).toFixed(1)}" stroke="${HOT}" stroke-opacity="0.5" stroke-dasharray="3 4"/>
<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="${TRACK}" stroke-opacity="0.25"/>
<polyline points="${pts.join(' ')}" fill="none" stroke="${hex}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="3.5" fill="${hex}"/>
</svg>`
}

const stack = (cats: Category[], window: number): string => {
  const w = 360
  const h = 12
  let x = 0
  const segs = cats.map((c, i) => {
    const sw = Math.max(1.5, (c.tokens / window) * w)
    const rect = `<rect x="${x.toFixed(1)}" y="0" width="${sw.toFixed(1)}" height="${h}" fill="${PALETTE[i % PALETTE.length]}"/>`
    x += sw + 1.5
    return rect
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><clipPath id="r"><rect width="${w}" height="${h}" rx="6"/></clipPath></defs>
<g clip-path="url(#r)"><rect width="${w}" height="${h}" fill="${TRACK}" fill-opacity="0.18"/>${segs.join('')}</g>
</svg>`
}

type Gauge = { label: string; percent: number; detail: string; hint: string }

export const barColor = (g: Pick<Gauge, 'label' | 'percent'>): string =>
  g.percent >= 85 ? HOT : (OCEAN[g.label] ?? OCEAN.Context ?? HOT)

const gaugesOf = (u: Usage, now: number): Gauge[] => [
  ...(u.contextPercent === undefined
    ? []
    : [
        {
          label: 'Context',
          percent: u.contextPercent,
          detail: `${formatTokens(u.contextTokens ?? 0)} of ${formatTokens(u.contextWindow)}`,
          hint: formatTokens(u.contextTokens ?? 0),
        },
      ]),
  ...u.limits.map(l => ({
    label: LIMIT_NAMES[l.kind] ?? l.kind,
    percent: l.percentUsed,
    detail: formatReset(l.resetsAt, now),
    hint: l.resetsAt ? `↻ ${shortReset(l.resetsAt, now)}` : '',
  })),
]

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'session-usage',
      description: 'Reopen the session usage dashboard and show the usage band',
    })
    const current = toUsage(await $.session.usage())
    await update($, usage, () => current)

    return next(e)
  })

  on('command.run', { command: 'session-usage' }, async $ => {
    await update($, isHidden, () => false)
    await openPane($)

    return { text: 'Session usage dashboard opened.' }
  })

  on('session.measure', async ($, e, next) => {
    const current = toUsage(e)
    await update($, usage, () => current)
    if (e.changed.includes('context') && current.contextPercent !== undefined) {
      const percent = current.contextPercent
      await update($, history, list => [...list, percent].slice(-60))
      const { context } = await $.session.usage({ breakdown: 'summary' })
      const used = (context.breakdown?.categories ?? [])
        .filter(c => c.kind === 'used' && c.tokens > 0)
        .sort((a, b) => b.tokens - a.tokens)
        .map(({ name, tokens: n }) => ({ name, tokens: n }))
      await update($, categories, () => used)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    const u = done.usage
    if (u && e.agentId === undefined) {
      await update($, turns, n => n + 1)
    }
    if (u) {
      await update($, tokens, t => ({
        input: t.input + u.input_tokens,
        output: t.output + u.output_tokens,
        cacheRead: t.cacheRead + u.cache_read_input_tokens,
        cacheWrite: t.cacheWrite + u.cache_creation_input_tokens,
      }))
    }

    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, usage)
    if (e.props.hasSurvey || current === null || (await read($, isHidden))) {
      return next(e)
    }

    const { Box, Text, Button } = $.ui.resolve(e)
    const now = await $.clock.now()
    const gauges = gaugesOf(current, now)
    const Svg = e.surface === 'desktop' ? $.ui.resolve(e).Svg : undefined

    const cell = (g: Gauge) => {
      const hex = barColor(g)
      const isHot = g.percent >= 85
      const [filled, empty] = thinBar(g.percent, 24)
      return (
        <Box flexDirection="column" width={26}>
          <Box justifyContent="space-between">
            <Text dimColor>{g.label}</Text>
            <Text>
              {g.hint ? <Text color="subtle">{`${g.hint} · `}</Text> : null}
              <Text bold {...(isHot ? { color: hex } : {})}>{`${Math.round(g.percent)}%`}</Text>
            </Text>
          </Box>
          {Svg ? (
            <Svg source={slimBar(g.percent, hex)} alt={`${g.label}: ${g.percent}% used`} width={170} height={6} />
          ) : (
            <Text>
              <Text color={hex}>{filled}</Text>
              <Text color="subtle">{empty}</Text>
            </Text>
          )}
        </Box>
      )
    }

    return (
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" columnGap={2} paddingX={1}>
        <Box flexDirection="row" columnGap={3} alignItems="center">
          {gauges.length > 0 ? gauges.map(cell) : <Text dimColor>Usage appears after the first reply</Text>}
        </Box>
        <Box gap={2} alignItems="center" flexShrink={1}>
          <Button key="details" label="⋯" plain dimColor onPress={() => openPane($)} />
          <Button key="hide" label="✕" plain dimColor onPress={() => update($, isHidden, () => true)} />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const Svg = e.surface === 'desktop' ? $.ui.resolve(e).Svg : undefined
    const current = await read($, usage)
    if (current === null) {
      return <Text dimColor>Waiting for the first reply…</Text>
    }

    const now = await $.clock.now()
    const t = await read($, tokens)
    const turnCount = await read($, turns)
    const trendValues = await read($, history)
    const cats = await read($, categories)
    const totalIn = t.input + t.cacheRead + t.cacheWrite
    const cacheHit = totalIn > 0 ? Math.round((t.cacheRead / totalIn) * 100) : 0

    const section = (title: string, hint?: string) => (
      <Box flexDirection="row" gap={1} alignItems="center">
        <Text bold>{title}</Text>
        {hint ? <Text dimColor>{hint}</Text> : null}
      </Box>
    )

    const card = (g: Gauge) => {
      const hex = barColor(g)
      const isHot = g.percent >= 85
      const [filled, empty] = thinBar(g.percent, 40)
      return (
        <Box flexDirection="column">
          <Box justifyContent="space-between">
            <Text dimColor>{g.label}</Text>
            <Text>
              {g.detail ? <Text color="subtle">{`${g.detail} · `}</Text> : null}
              <Text bold {...(isHot ? { color: hex } : {})}>{`${Math.round(g.percent)}%`}</Text>
            </Text>
          </Box>
          {Svg ? (
            <Svg source={slimBar(g.percent, hex, 360)} alt={`${g.label}: ${g.percent}% used`} width={360} height={6} />
          ) : (
            <Text>
              <Text color={hex}>{filled}</Text>
              <Text color="subtle">{empty}</Text>
            </Text>
          )}
        </Box>
      )
    }

    const stat = (label: string, value: string) => (
      <Box flexDirection="column" minWidth={12}>
        <Text bold>{value}</Text>
        <Text dimColor>{label}</Text>
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1} paddingX={1} paddingY={1}>
        <Box flexDirection="column" gap={1}>
          {gaugesOf(current, now).map(card)}
        </Box>

        <Box flexDirection="column" gap={1}>
          {section('This session')}
          <Box flexDirection="row" flexWrap="wrap" columnGap={3} rowGap={1}>
            {stat('Turns', `${turnCount}`)}
            {stat('Tokens in', formatTokens(totalIn))}
            {stat('Tokens out', formatTokens(t.output))}
            {stat('Cache hit', `${cacheHit}%`)}
          </Box>
        </Box>

        {trendValues.length > 1 ? (
          <Box flexDirection="column" gap={1}>
            {section('Context over time', '· red line marks 85%')}
            {Svg ? (
              <Svg source={trend(trendValues)} alt="Context fill after each reply" width={360} height={72} />
            ) : (
              <Text color={(trendValues[trendValues.length - 1] ?? 0) >= 85 ? HOT : OCEAN.Context}>{sparkline(trendValues)}</Text>
            )}
          </Box>
        ) : null}

        {cats.length > 0 ? (
          <Box flexDirection="column" gap={1}>
            {section("What's in context", `· ${formatTokens(current.contextWindow)} window`)}
            {Svg ? <Svg source={stack(cats, current.contextWindow)} alt="Context window by category" width={360} height={12} /> : null}
            <Box flexDirection="column">
              {cats.map((c, i) => (
                <Box flexDirection="row" gap={1}>
                  <Text color={PALETTE[i % PALETTE.length]}>●</Text>
                  <Box width={24}>
                    <Text wrap="truncate">{c.name}</Text>
                  </Box>
                  <Text dimColor>{formatTokens(c.tokens)}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>
    )
  })
}
