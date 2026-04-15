# Modal & Sheet Base Components — Slot Architecture

**Date:** 2026-03-17
**Project:** Elysium Product Demo
**Status:** Approved

## Problem

Modal and Sheet components currently exist as standalone frames without a shared base. Updating chrome (header, footer, overlay) requires touching every instance. Content is baked into each frame rather than swappable.

## Solution

Build 4 base components using Figma's slots feature. Each base owns its chrome; body content plugs in as a separate swappable component.

## Components

| Component | Platform | Behaviour |
|-----------|----------|-----------|
| Modal / Bottom Sheet | Mobile (iPhone 16: 393×852) | Slides up from bottom, partial height, content determines height |
| Modal / Centred | Desktop | Centred overlay, responsive width |
| Sheet / Full Screen | Mobile (iPhone 16: 393×852) | Full-screen slide-up with back/close at top |
| Sheet / Side Panel | Desktop | 660px right-side panel |

## Shared Chrome

All 4 components share:

- **Header:** Title text (left-aligned) + close/dismiss icon (right-aligned)
- **Footer:** Cancel (Outline button) + Confirm (Primary button) — global Button component instances
- **Overlay/scrim:** Semi-transparent backdrop (on desktop Modal and desktop Sheet)
- **Body slot:** Swappable content region with built-in `space/24` padding and vertical scroll on overflow

## Slot Architecture

- Body is a Figma **slot** — a named content region that accepts any component
- Slot content components are built separately (e.g., "Share Class Creation Form", "Confirm Action Content")
- Base components own all chrome; slot content only handles internal layout
- Existing Share Class creation form becomes the first slot content component

## Token Binding

All values bound to design tokens:

- **Spacing:** `space/8`, `space/16`, `space/24` for padding and gaps
- **Radius:** `radius/xl` (16px) for modal corners, `radius/0` for full-screen sheet
- **Colors:** `bg/surface` for container, `bg/overlay` for scrim, `text/primary` for title, `icon/secondary` for close icon
- **Border:** `border/width/thin` where applicable
- **Typography:** Existing heading token for title

## Reference

- Existing sheet components at node `158:3399` used as chrome reference
- Existing Share Class creation side sheet (660px) defines the desktop Sheet panel width
- Global Button component used for footer actions

## Build Location

All new components on **Base Components** page (node `12:6504`), in a new horizontal section "Modal & Sheet".

## Out of Scope

- Animation/transition specs (handled in code)
- Specific slot content components beyond the initial Share Class form extraction
