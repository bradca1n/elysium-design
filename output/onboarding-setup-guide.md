# Getting Started — Claude Code + Figma MCP Setup

A quick guide to get you up and running before Thursday.

---

## 1. Install the prerequisites

### VS Code
Download and install from [code.visualstudio.com](https://code.visualstudio.com/).

### Node.js (v18+)
Node.js is needed for the Figma MCP server and Claude Code.

**Mac:**
1. Open Terminal and install Homebrew (if you don't have it):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Then install Node.js:
   ```bash
   brew install node
   ```

**Windows:**
1. Download the Windows installer (.msi) from [nodejs.org](https://nodejs.org/) — grab the **LTS** version
2. Run the installer, accept the defaults, and click through to finish

**Verify it's working** by opening the terminal in VS Code (`` Ctrl+` `` on Mac, `` Ctrl+` `` on Windows, or **Terminal → New Terminal** from the menu bar) and running:
```bash
node --version
npm --version
```
You should see version numbers for both. If not, restart VS Code and try again.

### Claude Code (CLI)
Install Claude Code globally:
```bash
npm install -g @anthropic-ai/claude-code
```

Then run `claude` in your terminal to authenticate with your Anthropic account. Follow the prompts — it will open a browser window to log you in.

---

## 2. Set up your local project folder

Create a working folder with this structure:

```
your-project/
├── CLAUDE.md            # Instructions for Claude (see section 3)
├── brief-sheets/        # Daily task briefs (see section 4)
├── claude_context/      # Documentation & reference material (see section 5)
├── output/              # Where Claude outputs files (HTML, etc.)
└── skills/              # Reusable prompt workflows (see section 7)
```

Open this folder in VS Code. All your Claude Code sessions will run from here.

---

## 3. CLAUDE.md — Your instruction file

`CLAUDE.md` sits in the root of your project folder. It's the single most important file — Claude reads it automatically at the start of every session.

**What goes in it:**
- A one-liner describing your project
- Rules and constraints Claude must follow
- Which skills to use and when
- Pointers to documentation in `claude_context/`
- Any conventions or workflows you want enforced

Think of it as a persistent brief that shapes how Claude behaves across all your sessions. Start simple — you'll iterate on it over time.

**Example starter:**
```markdown
Project description here. One or two sentences.

## Knowledge Base
All project context lives in `claude_context/`. Read `claude_context/INDEX.md` first.

## Rules
- Always check existing work before creating something new
- Use the skills workflow for non-trivial tasks
```

---

## 4. Brief sheets

Brief sheets live in `brief-sheets/` and are dated folders (e.g., `03-17-26`). They're your daily task sheet — what you want Claude to work on today.

A brief sheet typically includes:
- **Top priorities** — what needs doing
- **Active problems** — context, constraints, what good looks like
- **Work areas** — links to relevant Figma pages/frames
- **Review checklist** — quality gates before calling something done

You fill one out at the start of the day, then point Claude at it. It keeps sessions focused and gives Claude the context it needs without you repeating yourself.

There's a template file in `brief-sheets/` you can copy.

---

## 5. claude_context/ — Your knowledge base

This is a folder for housing documentation that Claude can reference. It's organised into subfolders by topic:

```
claude_context/
├── INDEX.md         # Master index — Claude reads this first
├── product/         # Product overviews, features, user personas
├── domain/          # Business domain knowledge
├── technical/       # Tech stack, frameworks, design tokens
├── patterns/        # Verified patterns and approaches
├── errors/          # Known pitfalls to avoid
├── templates/       # Scaffolds and starter formats
└── reference/       # External references, links, specs
```

**Keep it simple:** Start with an `INDEX.md` that lists what's in each folder, then add documents as you need them. Claude will read the index to find what's relevant to the task at hand.

The goal is to give Claude persistent project knowledge without having to explain things every session.

---

## 6. output/

This is where Claude writes its output files — HTML mockups, generated components, exports, etc. Nothing special, just a clean place to collect deliverables.

---

## 7. Skills — Reusable prompt workflows

Skills are `.md` files that define reusable prompt workflows. When invoked, they expand into a full set of instructions that guide Claude through a specific process.

**Examples of skills:**
- `brainstorming` — explores requirements and design options before building
- `writing-plans` — creates a step-by-step implementation plan
- `frontend-design` — generates production-grade UI code
- `verification-before-completion` — runs checks before claiming work is done

Skills live in the `skills/` folder at your project root. Each skill is a folder containing a `skill.md` file. You invoke them in Claude Code by typing `/skill-name` or Claude will call them automatically when your `CLAUDE.md` tells it to.

You don't need to write any skills to get started — we'll cover that when we meet.

---

## 8. Set up Figma MCP

The Figma MCP server lets Claude read and interact with your Figma files directly.

### Generate a Figma Personal Access Token
1. Open Figma → click your profile icon (top-left) → **Settings**
2. Scroll to **Personal access tokens**
3. Click **Generate new token**, give it a name, copy it

### Configure Claude Code to use it
Create the file `~/.claude/mcp.json` with this content:

```json
{
  "mcpServers": {
    "figma-console": {
      "command": "npx",
      "args": ["-y", "figma-console-mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Replace `YOUR_TOKEN_HERE` with the token you copied.

### Verify it works
Run `claude` from your project folder. You should see the Figma MCP server connect in the startup output. If you see errors, check that Node.js is installed and your token is valid.

---

## 9. Install the Figma Desktop Bridge plugin

The Desktop Bridge is a Figma plugin that lets Claude access your variables and component descriptions directly — no Enterprise plan needed. Brad will share the plugin folder with you.

### Install
1. Open **Figma Desktop** (not the browser version)
2. Go to **Plugins → Development → Import plugin from manifest...**
3. Navigate to the `plugins/desktop-bridge/` folder Brad shares with you and select `manifest.json`
4. Click **Open**

It will appear in your Development plugins list as "Figma Desktop Bridge".

### Use it
1. Open your Figma file
2. Right-click → **Plugins → Development → Figma Desktop Bridge**
3. Wait until the plugin UI shows **"Desktop Bridge active"**
4. Keep it running while you work with Claude — it needs the plugin open to read variables and components

---

## 10. Quick test

Once everything is installed:

1. Open your terminal
2. `cd` into your project folder
3. Run `claude`
4. Try asking: "What Figma files do I have open?" or "Take a screenshot of my current Figma page"

If Claude can talk to Figma, you're good to go.

---

## Summary

| What | Where | Purpose |
|------|-------|---------|
| `CLAUDE.md` | Project root | Persistent instructions for Claude |
| `brief-sheets/` | Project root | Daily task sheets |
| `claude_context/` | Project root | Project documentation & knowledge |
| `output/` | Project root | Claude's output files |
| `skills/` | Project root | Reusable prompt workflows |
| `~/.claude/mcp.json` | Home directory | MCP server config (Figma token) |

That's all you need before Thursday. We'll walk through everything hands-on when we meet.
