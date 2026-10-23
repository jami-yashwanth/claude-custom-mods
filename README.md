# claude-custom-mods

My custom mods for Claude Code, one folder per mod.

| Mod | What it does |
|---|---|
| [session-usage](session-usage/) | Shows session usage above the prompt: context fill, 5h/7d limits, tokens, plus a details pane |

## Installing a mod

Copy a mod's folder into `~/.claude/mods/`, then start a new Claude Code session:

```bash
git clone https://github.com/jami-yashwanth/claude-custom-mods.git
cp -R claude-custom-mods/session-usage ~/.claude/mods/
```
