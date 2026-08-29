# Mobile rebuild brief — infinity-media-production

Scope: **mobile only (max-width: 900px)**. Do not change desktop behaviour, layout, or the
desktop WebGL hero in any way. Every change below must be inside a mobile media query or
behind a mobile runtime guard.

Live URL: https://infinity-media-production.vercel.app/
Files in play: `index.html`, `assets/css/site.css`, `assets/js/app.js`, `assets/js/config.js`

---

## Measured evidence (taken on a real 375x812 viewport)

Do not skip this section — it is why the work is being asked for.

1. `#heroScroll` is **1786px tall** on mobile = 2.2 viewports.
2. Sampling scroll positions 300 / 600 / 900 / 1400 / 1700 inside that hero, the computed
   opacity of `#heroCopy`, `#chapA`, `#chapB` and `#heroPoster` is **`0` at every single one**.
   `#chapA` sits in the viewport at `top: 87px` with `opacity: 0`. The result is roughly
   **1200px of blank white** between the first screen and the reel. This is the single worst
   thing about the site on a phone.
3. `document.documentElement.className` on mobile is:
   `js is-live io-fallback boot-timeout`
   `boot-timeout` is the **5-second failsafe** in `index.html` — it fired, meaning `app.js`
   never completed its own boot sequence. `io-fallback` means the IntersectionObserver path
   also bailed out.
4. `#gl` canvas backing store is **750x1624** (DPR 2 = 1.2M pixels of realtime WebGL), and
   `assets/js/scene.js` is **2.2 MB** — more than half the total site weight — and it is being
   loaded and run on phones.
5. `#reel` is **469px tall** on mobile = 0.58 of a viewport. The showreel is smaller than the
   screen. `#reelVid.currentSrc` is empty — no source is loaded.
6. Hero `.display` computes to `font-size: 41.6px` with `line-height: 38.688px`. The
   line-height is **smaller than the font-size** (ratio 0.93), so lines collide.
   `.eyebrow` computes to `10.56px`.
7. `#mapBox` is **126px tall** on mobile.
8. No horizontal overflow (`scrollWidth == innerWidth == 375`) and `#burger` is 44x44 —
   both already correct, leave them alone.

---

## Task 1 — Kill the sticky scroll hero on mobile (highest priority)

Below 900px the hero must become **one single viewport**, not a 2.2-viewport scroll-scrubbed
sticky sequence.

- `#heroScroll` height: `100svh` (use `svh`, not `vh`, so mobile browser chrome doesn't
  cause a jump). `#heroSticky` becomes `position: static`.
- Hide `#gl` entirely (`display: none`).
- Show `#heroPoster` at `opacity: 1` using `assets/img/hero-poster-mobile.webp`, positioned in
  the **bottom two thirds** of the screen, `background-size: contain`,
  `background-position: center bottom`.
- `#heroCopy` is pinned in the **top third**, `opacity: 1`, and never animates away.
- In `app.js`, every scroll-progress handler that writes opacity/transform to `#heroCopy`,
  `#chapA`, `#chapB`, `#heroPoster`, `#prog` or `#cue` must **early-return on mobile**. Do not
  merely hide the elements — the handlers themselves must not run.

### Task 1b — The camera grows on scroll (this is the effect the client asked for)

Replace the WebGL scrubbing with one cheap transform on the static poster:

- `transform-origin: 50% 100%` — scale from the **bottom edge**, so growth pushes the camera
  body down and out of frame rather than up into the headline.
- Map hero scroll progress `0 -> 1` onto `scale(0.82) -> scale(1.10)`.
- **Hard-cap at `scale(1.10)`.** Unbounded scale eventually collides with the copy. The cap is
  not optional.
- Drive it with a single `rAF`-throttled scroll listener writing one CSS custom property
  (`--cam`), consumed as `transform: scale(var(--cam))`. No layout-triggering properties.
- Add a soft fade strip (`linear-gradient` from the page background to transparent, ~84px tall)
  sitting between the camera layer and the copy layer, so at maximum scale the two never
  visually collide.
- Wrap the whole effect in `@media (prefers-reduced-motion: reduce)` — pin it at `scale(1)`.

### Task 1c — The two chapter beats become real cards

`#chapA` and `#chapB` currently never appear on mobile. Convert each into its own **full-bleed
dark card, min-height 90svh**, stacked normally in flow after the hero:

- Background: `hero-poster-mobile.webp`, grayscale, darkened (brightness ~0.5), with a
  top-to-bottom scrim.
- Copy anchored bottom-left, 20px gutters, white.
- Reveal with a simple IntersectionObserver fade-in-on-enter. Not scroll-scrubbed.
- Content stays exactly as authored: "Every part, deliberate." / "Then it all clicks."

This is what replaces the blank void.

---

## Task 2 — Do not load the 3D scene on mobile

`scene.js` (2.2 MB) must not be fetched, parsed or executed on phones.

- Load it **dynamically** (`import()` / injected `<script>`) only when
  `window.matchMedia('(min-width: 56.3125rem)').matches` is true **and** WebGL is available.
- Verify after the change that `boot-timeout` no longer appears on
  `document.documentElement.className` on a 375px viewport. That class is the pass/fail test
  for this task.
- While you are there, find out why `io-fallback` engages on mobile and fix the underlying
  IntersectionObserver setup rather than relying on the fallback.

---

## Task 3 — Full-bleed reel

- `#reel` on mobile: `min-height: 85svh`, full-bleed edge to edge.
- Centre a circular play affordance; keep the existing sound toggle top-right.
- Headline and eyebrow anchored bottom-left, matching the chapter cards.
- Fix the video element: it currently has both `preload="none"` and `autoplay`, which conflict,
  and no source is loaded. On mobile, show `reel-poster.webp` and load `reel.mp4` on tap
  (do not autoplay a 1.8 MB video on a phone connection).

---

## Task 4 — Typography and spacing pass (mobile only)

- Hero `.display`: `line-height: 1.05` minimum. It is currently 0.93 — lines overlap.
- `.eyebrow`: floor at `12px`. Currently 10.56px.
- Remove the secondary "Watch the reel" button from the hero on mobile. Two stacked
  full-width buttons of near-equal weight destroy the hierarchy, and it is the element
  currently colliding with the camera. The reel gets its own full screen shortly after.
- `#mapBox`: either give it a real 4:3 aspect ratio or remove it on mobile and keep only the
  "Open in Google Maps" link. A 126px strip reads as a rendering bug.
- `.svc-row` accordions: make the `+` affordance clearly visible. Right now nothing signals
  that the rows open, so on mobile they are never discovered.

---

## Constraints

- Mobile-only. Prove desktop is untouched before you finish.
- No new dependencies, no framework, no build step. This is a static site deployed on Vercel.
- Keep the existing file structure and the existing class naming conventions in `site.css`.
- Prefer `svh` over `vh` throughout the mobile work.
- Respect `prefers-reduced-motion` on every animation you add.
- Do not touch `config.js` content or the placeholder work items — real projects are not
  configured yet and that is expected.

## Definition of done

Load the site at 375x812 and confirm:

1. No blank screen anywhere in the scroll. Every viewport has intentional content.
2. `document.documentElement.className` does **not** contain `boot-timeout`.
3. `scene.js` does not appear in the network waterfall.
4. Both chapter beats are visible and legible.
5. The reel fills the screen.
6. Hero text is never covered by the camera at any scroll position, including maximum scale.
7. Desktop at 1440px is pixel-identical to what shipped.
