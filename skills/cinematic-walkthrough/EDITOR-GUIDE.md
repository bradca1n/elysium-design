# Cinematic UI Walkthroughs — A Guide for Video Editors

This guide is for you, the video editor, when you want a new product walkthrough video and you're going to ask Claude Code (an AI coding assistant) to build it for you. You don't need to know how to code — you do need to know what you want.

The output you'll get: a frame-perfect MP4 + ProRes 422 HQ at 1920×1080 60fps, typically 12–18 seconds long, captured from a real running product mockup with scripted camera moves, cursor moves, and interactions.

---

## TL;DR — the 30-second version

1. Open the project in Claude Code.
2. Type: **"I want a new cinematic walkthrough using the cinematic-walkthrough skill."**
3. Claude will ask you motion questions one at a time. Answer them honestly even if you're not sure — "I don't know, what do you recommend?" is a valid answer.
4. Claude will build in phases and share a live link with you (`*.raw.githack.com`) after each phase. **Watch it. Give feedback.**
5. When you sign off on the live link, Claude will run the final 60fps capture and put the MP4 + ProRes files in `elysium-design/output/`.

---

## Before you start — three things you need ready

### 1. The page or screen you want to animate
Tell Claude which page of the product. e.g. "the Overview screen of Manager OS", "the share class details page", "the order book view". Be specific.

### 2. The hero moment
What's the **one thing** you're selling? Examples:
- "Creating a new share class from scratch"
- "Watching NAV update in real time"
- "Switching between funds"

A 15-second video tells **one story**. If you have three stories, you want three videos.

### 3. The ending shot
What does success look like? "A green check appears", "the new class shows up in the list", "the chart redraws with the new range highlighted". This is the frame the viewer should remember.

---

## How to talk to Claude Code

Claude works best when you:
- **Treat it like a colleague who hasn't seen the project before.** Be explicit about what you want, even if it feels obvious.
- **Iterate visually.** It will share preview frames (screenshots) and live links. Look at them. Tell it specifically what's wrong: "the cursor is too far left of the button", "this beat is too slow", "the chart isn't visible at this point".
- **Don't try to be precise about durations upfront.** Say "punchier" or "more cinematic" — Claude will translate that into seconds and easings.
- **Use real time references.** "0.5 seconds longer", "remove this 1-second pause" beats "make it feel better."

### Good prompts

> "I want a cinematic walkthrough of the Share Register screen showing an investor onboarding from KYC pending to verified. Hero moment is the badge turning green. About 12 seconds. Cinematic pace, not punchy. Dark mode. End on the green badge."

> "Replace the cursor-click-to-open-sheet sequence with the sheet sliding in from the right, no cursor. Faster — about 1 second total instead of 2."

> "The chart zoom-in feels too aggressive. Try expo.inOut easing and 1.2 seconds duration instead of the current 0.7."

> "Use this font for the page title: assets/SerrifCondensed-Light.woff. Apply it just to the H1, not body text."

### Less good prompts (Claude will ask follow-ups)

> "Make a cool video of the dashboard." — too vague. What page? What action? What success state?

> "Speed it up by 2x." — speed up what? The whole video? Just the camera moves? Just the typing?

> "It looks bad." — Claude needs specifics. Bad how? Too slow? Too fast? Camera in the wrong place?

---

## The motion questions Claude will ask

These come up at the start of every new cinematic. Answer them as best you can; "default" or "your recommendation" works fine for any of them.

| Question | What it means | Default if you don't know |
|---|---|---|
| Resolution | How big the video is in pixels | 1920×1080 |
| Frame rate | Smoothness | 60fps |
| Duration | How long, total | 12-18s |
| Format | What file types | Both MP4 + ProRes |
| Loop seamlessly? | Does it need to play in a loop without a visible cut? | Yes for hero web reels, no for product demos |
| Pacing | Cinematic (slow, generous holds) or punchy (fast, snappy)? | Cinematic for marketing, punchy for sales decks |
| Force dark or light mode? | Locks the theme so the user's preference doesn't bleed in | Dark (looks better in most marketing contexts) |

Then, for each beat in your video:
- What's the camera doing? (wide / push in / pan / pull back)
- Is the cursor visible? Is there a click?
- Are fields/text revealing? Typewriter style or instant?
- What dims to 20% opacity? What stays at 100%?

You don't need to answer all of these upfront — Claude will ask beat-by-beat as it builds.

---

## The review loop

Claude builds incrementally. After most changes, it will either:

**(a) Send you a screenshot strip.** A handful of representative frames from across the timeline. Quick to scan. Use this for camera-position and framing feedback.

**(b) Share a live URL.** Looks like `https://raw.githack.com/yourname/elysium-design/cinematic-preview/...?cine=1`. Opens in your browser. Plays the cinematic in real time on loop. Use this for pacing, easing, and overall feel feedback.

After the live link, give feedback in plain language. Things you can ask for:

- "The transition between X and Y feels rushed." → Claude adjusts timing.
- "Field-name should hold for longer before the camera moves on." → Claude extends the hold.
- "The cursor should pulse when it clicks." → Claude adds a click-pulse animation.
- "The confirmation should fade in faster." → Claude adjusts the fade duration.
- "I don't want to see the menu items in the sidebar — they're distracting." → Claude dims or hides them.
- "Show the form fields populating top-to-bottom in order." → Claude rebuilds the typewriter sequence.

You can also pull up the live URL on your phone, on a TV, in a Loom recording you share with stakeholders — it's a real shareable URL.

---

## When to call it done and capture

When the live URL looks right, say **"capture the final video"** or **"run the full capture"**. Claude will:

1. Run a frame-by-frame capture (~2-3 minutes wall-clock for a 16s video).
2. Encode the frames to MP4 + ProRes via ffmpeg (~1-2 minutes).
3. Place the files in `elysium-design/output/`:
   - `manager-os-cinematic.mp4` — 1920×1080, ~3-5MB, H.264 (Slack/web/embed)
   - `manager-os-cinematic.mov` — 1920×1080, ~240MB, ProRes 422 HQ (your editorial timeline)
   - `manager-os-cinematic-3840.mov` — 3840×2160, ~680MB, ProRes 422 HQ (4K source for re-crops or stills)

The 3840 version is your master. The 1080 ProRes is what you drop into Final Cut / Premiere / Resolve. The MP4 is what you Slack to stakeholders.

---

## What Claude can't do (yet)

- **Audio.** Cinematics are silent. Add your own score / sound design in your NLE.
- **Live screen recordings.** This pipeline only animates the existing product mockup. If you want a real demo with a person clicking around, use Loom / QuickTime.
- **Brand-new screens that don't exist in the product yet.** Claude animates what's there. If you need a new screen first, ask Claude to design that first as a separate task before requesting the cinematic.
- **Stock footage / overlays / titles.** Add those in your NLE after the export.

---

## Common things to watch for in the review

These bite every cinematic if not caught early. When you watch the live link, specifically check:

- **Text crispness.** Through camera zooms, text should stay sharp — no jagged pixels. If you see jaggy text, tell Claude "text is pixelated through the zoom". (Fix: capture at higher resolution and downscale.)
- **Cursor lands on the button.** When the cursor clicks something, it should land *on* the button, not 20px to the left. Easy thing to miss; common bug.
- **Form fields show real values.** If your form has 12 fields and only 5 of them are populated, the 7 empty ones look broken on camera. Tell Claude "populate the other fields with realistic dummy values".
- **The bottom of long forms isn't cut off.** Scroll-fold bugs are common with sheets/modals — content below the scroll fold doesn't render in the camera frame. Tell Claude "the fields below the minimum investment aren't showing".
- **Loop seam.** Does the last frame match the first? If you can see a "jump" when it loops, the t=0 cleanup is missing a state reset.
- **Lottie / micro-animations.** If the cinematic has a Lottie (e.g., success check), it should reach the same frame on every loop iteration. Drift = bug.

---

## A complete example session

> **You:** I want a new cinematic walkthrough using the cinematic-walkthrough skill. Page is the share class detail view. Hero moment is editing the management fee and seeing the projected NAV impact update. About 15 seconds, cinematic pace, dark mode.

> **Claude:** Got it. Before I start: do you want the loop to be seamless (so the live preview can play continuously), or is this a one-shot for a sales deck where the loop seam doesn't matter?

> **You:** Seamless, this is for the homepage.

> **Claude:** And the ending shot — what's the frame the viewer should remember? The updated NAV number with the highlight, or the full screen with the edit panel closed?

> **You:** The updated NAV with the highlight. Hold on it for a beat before looping.

> **Claude:** Great. I'll start with: (1) wide establishing of the detail view, (2) zoom into the fee input, (3) cursor edits the value, (4) projected NAV pulses with new value, (5) hold on NAV. Sound right?

> **You:** Yes. Make the NAV pulse a quick scale-up with a green glow, not just a number change.

> **Claude:** Roger. Building. I'll send a screenshot strip after the camera moves are in place.

…[Claude builds, sends preview frames, shares live URL]…

> **You:** The fee input zoom is fine but the cursor moves to it too fast. And the NAV pulse should be more subtle — current scale is too much.

> **Claude:** Slowed the cursor approach to 0.8s, reduced NAV pulse to a 1.05× scale with the green glow over 0.3s. New live link is up — refresh.

…[You watch the new version, sign off]…

> **You:** Looks great. Run the final capture.

> **Claude:** Capturing 900 frames at 60fps, ~3 minutes. Will report when MP4 + ProRes are in elysium-design/output/.

…[3 minutes later]…

> **Claude:** Done. Files at elysium-design/output/manager-os-cinematic.mp4 (4.1MB), .mov (236MB), -3840.mov (672MB). 15.0s exact, 60fps.

---

## Troubleshooting

| Symptom | Likely cause | What to tell Claude |
|---|---|---|
| Video looks like static screens, no easing | Frame capture is broken | "The captured video looks like it's skipping frames — easings aren't interpolating" |
| Text is pixelated through camera zooms | Capture resolution too low | "Text isn't sharp through the zoom" |
| Form fields are empty | Missing instant-fill | "Populate the form with realistic dummy data" |
| Bottom of form is cut off in camera | Scroll fold bug | "Fields below X aren't showing in the frame" |
| Cursor lands left/right of the button | Camera math drift | "The cursor isn't aligned to the button" |
| Loop seam is visible | Missing t=0 cleanup | "The video doesn't loop seamlessly — visible jump" |
| Pacing feels off | Easing / duration tuning | "[Specific section] feels too slow / fast" |
| MP4 is huge (>20MB) | Encoder settings too rich | "MP4 is too large for Slack" |

---

## Bonus: making future videos faster

Once you've nailed a cinematic, the bundle (`mockups/manager-os-nav/manager-os-nav-bundle.html`) has the cinematic infrastructure baked in. To make a NEW cinematic from a similar starting point:

> "I want to make a new cinematic based on the existing Manager OS cinematic. Keep the camera setup, cursor, capture pipeline. Change the choreography to instead show: …"

Claude will reuse the helpers and just rewrite `buildTimeline()`. Much faster than a from-scratch build.
