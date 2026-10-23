# claude-custom-mods

My custom mods for Claude Code, one folder per mod.

| Mod | What it does |
|---|---|
| [session-usage](session-usage/) | Shows session usage above the prompt: context fill, 5h/7d limits, tokens, plus a details pane |

## Installing a mod

This repo is a plugin marketplace. At the prompt of a terminal Claude Code session:

```
/plugin install session-usage --marketplace jami-yashwanth/claude-custom-mods
```

Answer `y` to add the marketplace, then pick the user scope. The mod is active right away, and in every session after.

From a shell:

```bash
claude plugin install session-usage --marketplace jami-yashwanth/claude-custom-mods
```

In the desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `jami-yashwanth/claude-custom-mods`, then **Add plugin**.

To update later: `claude plugin update session-usage`.

## Developing a mod

Load a mod straight from its folder, with hot reload on save:

```bash
claude --plugin-dir ./session-usage
```

Validate and test before pushing:

```bash
claude plugin validate session-usage
claude plugin test session-usage
```
