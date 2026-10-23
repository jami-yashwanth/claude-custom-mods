# session-usage

Shows how much of your session budget you've used, right above the prompt.

## Usage band (above the prompt)

- **Context**: how full the context window is, with the token count
- **5-hour** and **Weekly** limits: percent used and time until reset
- Bars turn red at 85%
- `⋯` opens the details pane, `✕` hides the band

## Details pane

Run `/session-usage` (or press `⋯`) to open it. It shows:

- Each gauge with its full reset time
- This session: turns, tokens in and out, cache hit rate
- Context fill over time, with a line at 85%
- What's in context, broken down by category

It works in both the terminal and the desktop app. The desktop app gets SVG bars and charts, and the terminal gets text bars and a sparkline.

## Files

- `.claude-plugin/plugin.json`: manifest
- `hooks/register.tsx`: the mod
- `hooks/register.test.ts`: tests
- `types/index.d.ts`: state types
