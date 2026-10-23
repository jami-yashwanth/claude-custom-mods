import { expect, mock, test } from 'claude-code/testing'

import { barColor, meter, severity, shortReset, thinBar } from './register'

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const PANE = {
  component: 'Pane',
  requestId: 'session-usage',
  props: {
    title: 'Session usage',
    isFocused: false,
    bodyColumns: 100,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('band and dashboard show context, limits and tokens on terminal and desktop', async ($, on) => {
  const NOW = Date.parse('2026-10-15T10:00:00Z')
  mock.clock(on, { now: NOW })
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      rateLimits: [],
      context: {
        tokens: 90_000,
        window: 200_000,
        percent: 45,
        breakdown: {
          categories: [
            { name: 'Messages', tokens: 60_000, color: 'claude', isDeferred: false, kind: 'used' },
            { name: 'System tools', tokens: 30_000, color: 'subtle', isDeferred: false, kind: 'used' },
            { name: 'Free space', tokens: 110_000, color: 'inactive', isDeferred: false, kind: 'free' },
          ],
        } as never,
      },
    },
  }))
  on('turn.complete', ($, e) => ({
    text: e.answer,
    usage: {
      input_tokens: 1200,
      output_tokens: 3400,
      cache_read_input_tokens: 50_000,
      cache_creation_input_tokens: 800,
      model: 'claude-opus-5-5',
    },
  }))

  await $.session.measure({
    context: { tokens: 90_000, window: 200_000, percent: 45 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-10-15T12:10:00Z' },
      { kind: 'seven_day', percentUsed: 41, resetsAt: '2026-10-18T10:00:00Z' },
    ],
    cost: { usd: 1.234 },
    changed: ['context', 'rateLimits', 'cost'],
  })
  await $.turn.complete({
    answer: 'done',
    durationMs: 1000,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-usage', surface, ...BAND })
    const text = (await ui.find({ type: 'Box' }))?.text ?? ''
    expect(text).toContain('Context')
    expect(text).toContain('45%')
    expect(text).toContain('5-hour')
    expect(text).toContain('↻ 2h 10m')
    expect(text).toContain('24%')
    expect(text).toContain('Weekly')
    expect(text).toContain('↻ 3d 0h')
    await ui.unmount()

    const pane = await $.ui.mount({ plugin: 'session-usage', surface, ...PANE })
    const body = (await pane.find({ type: 'Box' }))?.text ?? ''
    expect(body).toContain('resets in 2h 10m')
    expect(body).toContain('resets in 3d 0h')
    expect(body).toContain('This session')
    expect(body).toContain('Turns')
    expect(body).toContain('52k')
    expect(body).toContain('Messages')
    expect(body).not.toContain('Free space')
    expect(body).not.toContain('$')
    await pane.unmount()
  }
})

test('severity and meter', () => {
  expect(severity(10)).toBe('success')
  expect(severity(70)).toBe('warning')
  expect(severity(90)).toBe('error')
  expect(meter(50, 8)).toEqual(['▰▰▰▰', '▱▱▱▱'])
})

test('short reset and thin bar', () => {
  const now = Date.parse('2026-10-15T10:00:00Z')
  expect(shortReset('2026-10-15T10:38:00Z', now)).toBe('38m')
  expect(shortReset('2026-10-15T12:10:00Z', now)).toBe('2h 10m')
  expect(shortReset('2026-10-18T10:00:00Z', now)).toBe('3d 0h')
  expect(shortReset(undefined, now)).toBe('')
  expect(thinBar(50, 4)).toEqual(['━━', '──'])
})

test('ocean colours, red from 85%', () => {
  expect(barColor({ label: 'Context', percent: 45 })).toBe('#378ADD')
  expect(barColor({ label: '5-hour', percent: 68 })).toBe('#1D9E75')
  expect(barColor({ label: 'Weekly', percent: 22 })).toBe('#534AB7')
  expect(barColor({ label: 'Weekly', percent: 85 })).toBe('#E24B4A')
})
