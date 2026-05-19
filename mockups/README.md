# mockups/

HTML mockups for the Elysium fund-administration UI. **Read this before reorganising — the flat layout is intentional.**

## Layout

```
mockups/
├── elysium.css            ← shared stylesheet, loaded by every live mockup as ./elysium.css
├── elysium-chrome.js      ← shared chrome/nav script, loaded as ./elysium-chrome.js
├── fonts/                 ← shared @font-face assets
├── *.html                 ← top-level mockups (all siblings of the shared assets)
├── account-creation/      ← project: account creation flow
├── manager-os-deploy/     ← project: Manager OS deploy
├── manager-os-nav/        ← project: Manager OS navigation experiment
├── pilot-program/         ← project: pilot program materials
├── pod-pricing/           ← project: pod pricing
└── redeem-withdraw/       ← project: redeem/withdraw flow scaffold
```

## Why everything sits flat

The top-level `*.html` files form **one navigable app**, not loose deliverables. They:

1. Load `./elysium.css` and `./elysium-chrome.js` as **siblings** — moving any HTML down a level breaks the asset paths.
2. **Cross-link to each other** with `./xxx.html` hrefs across feature areas. Examples:
   - `treasury-cashbook.html` → `./nav-collateral.html`
   - `order-book.html` → `./collateral-treasury.html` AND `./nav-collateral.html`
   - `nav-collateral.html` → `./portfolio-asset-detail.html`, `./venue-reconciliation-log.html`
3. The two outliers (`invite-investor-flow.html`, `share-class-creation.html`) reference `../assets/pod-logo.svg`, which assumes `mockups/` is one level below the repo root.

Grouping them into feature sub-folders (e.g. `treasury/`, `nav/`) without rewriting every `href`/`src` will silently break the prototype. If a partition is ever desired, do it with a search-and-replace pass on every relative link, and verify in a browser before committing.

## Conventions

- New full-screen mockups go at the top level and follow the existing `./elysium.css` + `./elysium-chrome.js` import pattern so they slot into the cross-link web.
- Multi-file experimental projects (jsx, multiple components, or a self-contained sub-app) go in their own sub-folder like `manager-os-nav/`. Those don't need to share `elysium.css`.
- Versioned experiments live as `name-vN/` (see `manager-os-nav-v3/`).
