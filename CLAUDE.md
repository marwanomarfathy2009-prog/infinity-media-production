# Infinity — Media Production Studio

Static marketing site for a media production studio in Hurghada, Red Sea,
Egypt. Deployed on Vercel from `main` — every push to `main` goes live.

## Stack — do not change any of this

- Plain HTML, CSS and JavaScript. No framework, no bundler, no build step.
- **No new dependencies.** If something needs a library, say so and stop —
  do not add one.
- `index.html`, `assets/css/site.css`, `assets/js/app.js`,
  `assets/js/config.js`, `assets/js/scene.js` (2.2 MB WebGL bundle with the
  Canon AT-1 model embedded), `assets/img/hero-seq/` (scroll sequence).
- Keep the existing file structure and the existing class naming in
  `site.css`. Do not reorganise or rename to taste.

## The two hero paths

Desktop (>900px) runs the WebGL scene from `scene.js`: a scroll-scrubbed
3D camera that disassembles and reassembles.

Mobile (<=900px) never fetches `scene.js` at all. It gets one screen of
type, then `#heroCam` — a canvas that scrubs a pre-rendered frame
sequence of that same 3D scene. This split is deliberate and load-bearing:
2.2 MB of WebGL on a phone is what broke the site before. `scene.js` must
stay at **0 requests on mobile**.

`wantScene` in `app.js` also requires WebGL2, no reduced-motion, no
save-data and enough reported RAM. Any of those failing falls back to the
static poster. That fallback is correct behaviour — do not "fix" it.

## Rules that keep getting broken

- **Desktop is frozen.** Mobile work must leave desktop pixel-identical.
  Prove it with a numeric layout dump against the previous commit, not by
  eyeballing it.
- Mobile changes go inside a mobile media query or behind a mobile runtime
  guard. Never a bare rule that leaks upward.
- Prefer `svh` over `vh`.
- Respect `prefers-reduced-motion` on every animation.
- No layout-triggering properties in scroll handlers. rAF-throttle them and
  write CSS custom properties.
- **No invented content.** No fake testimonials, client names, logos,
  statistics, awards, view counts or project results. The work slots in
  `config.js` are placeholders on purpose — real footage has not arrived.
  Leave them alone.
- No em dashes or decorative rule lines in site copy.
- One visual language across the whole site: light, editorial, cinematic.
  The only dark surfaces are the showreel, film stills and the video
  player. Do not alternate light and dark sections.
- No generic AI-template look: no glassmorphism, no random glowing
  elements, no visual clutter.

## Verification standard

Claims about this site are made with measurements, not assumptions.
Before calling any mobile change done, check at 360x780, 375x812 and
414x896:

1. No blank viewport anywhere in the scroll — verify with block coverage,
   not by looking.
2. `document.documentElement.className` contains no `boot-timeout` and no
   `io-fallback`.
3. `scene.js` is 0 requests on mobile.
4. Desktop at 1440x900 is unchanged, including the hero scrub at multiple
   scroll positions.

Note: rendering is suspended when the preview pane is occluded, which
makes rAF and IntersectionObserver look broken when they are fine. Force
frames with real input or screenshots before concluding anything is dead.

## Working style

- Small, separately revertible commits with clear messages.
- Preserve working systems — the 3D hero, the full-width reel, Films and
  Shorts, Studio, the assembly experience, navigation and brand identity.
  Refine them; do not redesign them.
- Flag what you could not verify rather than implying you did.

## Contact details used on the site

WhatsApp 01016495305 · phone +20 115 212 1765 ·
marwanomarfathy2009@gmail.com · instagram.com/infinity.media.production ·
tiktok.com/@maro.omar86 · no YouTube.
