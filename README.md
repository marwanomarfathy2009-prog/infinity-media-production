# Infinity Media Production — site

Static site. No build step, no framework, no dependencies. Upload the folder.

```
index.html            markup + metadata (23 KB)
assets/css/site.css   the design system
assets/js/config.js   ← the only file you edit to add work
assets/js/app.js      behaviour
assets/js/scene.js    3D hero (Three.js, 2.2 MB — loaded conditionally)
assets/fonts/         Archivo ×5, Space Grotesk ×3
assets/img/           logo, social card, hero stills, reel poster, grain
assets/img/work/      ← your film + short posters go here (empty now)
assets/video/         ← your reel and cuts go here
```

Serve over HTTP. Opening `index.html` from the filesystem works, but browsers
block the 3D module over `file://`, so you get the static hero.

---

# WHERE THE REAL WORK GOES

Everything below happens in **`assets/js/config.js`**. Line numbers are current.

## 1 — The 4 films → `config.js` line 78

Replace the four `Film slot N` lines. One object per film, in the order you
want them on the page:

```js
films: [
  { title:"Harbour Light",
    client:"Sea Star Hotels",          // omit the line if you don't have it
    year:"2026",                       // omit the line if you don't have it
    category:"Brand film",
    role:"Direction, camera, post",
    dur:"3:12",
    description:"One or two sentences, shown under the player.",
    poster:"assets/img/work/harbour-light.webp",
    video:"assets/video/harbour-light.mp4" },
  // ...three more
],
```

- `title` is the only required field. Any field you leave out is simply not
  drawn — no empty labels appear.
- **Delete `c1` and `c2`** once you add a `poster`; they only paint the
  holding art. Harmless if left in.
- Films alternate left/right automatically. Odd rows are 16:9, even rows 5:4.
  Do not fight this — supply a wide crop and it will be cropped to fit.

## 2 — The 6 shorts → `config.js` line 69

Same shape, replace the six `Vertical slot N` lines:

```js
shorts: [
  { title:"Sunset Run",
    category:"Short",
    dur:"0:28",
    poster:"assets/img/work/sunset-run.webp",
    video:"assets/video/sunset-run.mp4" },
  // ...five more
],
```

These render as a horizontal swipe rail at 9:16. Six is a good number; more
is fine, the rail just scrolls further.

## 3 — The showreel → `config.js` lines 35–36

```js
reel: {
  src:    "assets/video/reel.mp4",
  poster: "assets/img/reel-poster.webp"
},
```

Overwrite both files, keeping the names, and you don't touch config at all.

- The current `reel.mp4` is a **7-second silent 720p loop** — placeholder.
- The reel autoplays muted and loops. Keep it short (20–40s) and export it
  **1080p, H.264, faststart**, ideally under 8 MB.
- The **sound button hides itself automatically** when the file has no audio
  track. Give the new reel a real audio track and the button comes back on
  its own — nothing to switch on.
- `reel-poster.webp` must be a frame **from the reel** at 1920×1080. It is
  what shows before the video loads, on data-saver, and if the video fails.

## 4 — Poster specs

| Where | Path | Ratio | Size | Format |
|---|---|---|---|---|
| Film cards | `assets/img/work/` | 16:9 (odd rows), 5:4 (even) | ~1600px wide | WebP |
| Short cards | `assets/img/work/` | 9:16 | ~1080px tall | WebP |
| Reel poster | `assets/img/reel-poster.webp` | 16:9 | 1920×1080 | WebP |
| Social card | `assets/img/og.webp` | 1.91:1 | 1200×630 | WebP |

Supply a poster for **every** piece. A poster with no video still works — the
card looks finished and the player says the piece isn't online yet. A piece
with neither still shows its coloured holding art, which is what you see now.

## 5 — Set the domain → `index.html`, near the top

```html
<script>window.SITE_ORIGIN = "https://yourdomain.com";</script>
```

Leave it `""` and the site uses whatever origin it is served from — correct
for most hosts. Set it explicitly only if you serve from a staging mirror and
want canonical/OG pointing at the real domain.

## 6 — Contact form delivery → `config.js` line 18

`web3formsKey: ""` means the form opens the visitor's mail app. Paste a free
key from web3forms.com to make it send email in the background. The form
never claims a message was sent unless it actually was.

## 7 — If contact details change

They appear in **two** places and both must be updated:

- `assets/js/config.js` lines 9–13
- `index.html` — the three `info-row` blocks, the drawer footer, the end card

The copy in `index.html` is what visitors without JavaScript, and crawlers,
actually read. It is deliberate duplication, marked with a comment.

---

## Quick check after you add the work

1. Every new poster/video path in config matches a real file (case-sensitive
   on most servers).
2. Click each card — the player opens, plays, and stops when closed.
3. Look at the page on a phone: films go full-width, shorts stay a swipe rail.
4. No `Film slot` or `Vertical slot` text left anywhere.

## Things worth not breaking

- The 3D hero is skipped entirely on reduced-motion, data-saver, no-WebGL and
  low-power devices. They get the still — a designed state, not a failure.
- The reel and the map load only when scrolled near, and never on data-saver.
- Everything that fades in is released unconditionally if the observer driving
  it fails, so content is never left invisible.
- The 3D camera model is CC BY 4.0 and the footer credit is required.
