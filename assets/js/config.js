/* ============================================================
   INFINITY — SITE CONFIG
   This is the only file you need to edit to put real content in.
   Everything below is placeholder except where marked.
   ============================================================ */
window.SITE = {

  /* ---- CONTACT — replace these three with your real details ---- */
  whatsapp: "201016495305",          // international format, NO "+" and no spaces
  email:    "marwanomarfathy2009@gmail.com",
  phoneDisplay: "+20 115 212 1765",  // your normal phone (not shown by default)
  whatsappDisplay: "+20 101 649 5305", // how the WhatsApp number is shown on the page
  location: "Hurghada, Red Sea, Egypt",

  /* Optional: paste a Web3Forms access key (free, web3forms.com) to make the
     form send real email in the background. Leave "" and the form will open
     the visitor's mail app instead. */
  web3formsKey: "",

  /* ---- SOCIAL ---- */
  social: {
    instagram: "https://www.instagram.com/infinity.media.production",
    tiktok:    "https://www.tiktok.com/@maro.omar86"
  },

  /* ---- 3D HERO ----
     Path to the scene module. Leave as-is unless you move the file. */
  sceneModule: "assets/js/scene.js",

  /* ---- SHOWREEL ----
     Replace reel.mp4 with the real showreel. The current file is a silent
     7-second 720p loop; the sound control removes itself when the file has
     no audio track, so a reel with real sound gets the button back. */
  reel: {
    src:    "assets/video/reel.mp4",
    poster: "assets/img/reel-poster.webp"
  },

  /* ---- WORK ----------------------------------------------------------
     Every field except `title` is optional and anything left out simply
     isn't drawn - no empty labels, no placeholder text. Nothing here needs
     redesigning when the real work arrives; you only fill fields in.

       title       the piece
       client      who it was for            (omit until it's real)
       year        "2026"                    (omit until it's real)
       category    "Commercial", "Documentary", "Campaign", "Short film"
       role        "Direction, camera, post"
       dur         "3:12" - the chip on the still
       description one or two sentences shown in the player
       poster      "assets/img/work/nova.webp"       - the still on the card
       video       "assets/video/work/nova.mp4"      - plays in the player
       loop        "assets/video/loop/nova.mp4"      - the silent 3s preview
                   that fades in when a cursor rests on the card. Optional,
                   desktop only, and skipped entirely for reduced-motion.
       c1 / c2     no longer used - a slot with no poster shows one neutral
                   graphite slate defined in site.css, not per-slot colours

     HOW THE SLOTS FILL IN
     Every entry below is drawn on the site, in order, right now. A slot with
     no `poster` shows the graphite holding art in exactly the box a real still
     will occupy - so adding `poster` and `video` swaps the image in without
     moving anything on the page. There is no flag to switch and no layout to
     change; you only fill fields in.

     A slot with no `video` opens the player and says the piece is not online
     yet rather than failing. That message disappears on its own once `video`
     is set.

     The titles and categories below are descriptive placeholders written
     from what is visible in each clip. They are not client names. Replace
     them with the real piece names, and add `client` and `year` only once
     the client has confirmed them. Do not add invented view counts, years,
     clients or awards. */

  shorts: [
    { title:"Club night", category:"Nightlife", dur:"0:20",
      poster:"assets/img/work/club-night.webp",
      loop:"assets/video/loop/club-night.mp4",
      video:"assets/video/work/club-night.mp4" },
    { title:"Beach club", category:"Hospitality", dur:"0:17",
      poster:"assets/img/work/pool-day.webp",
      loop:"assets/video/loop/pool-day.mp4",
      video:"assets/video/work/pool-day.mp4" },
    { title:"Pool session", category:"Event", dur:"0:20",
      poster:"assets/img/work/pool-dj.webp",
      loop:"assets/video/loop/pool-dj.mp4",
      video:"assets/video/work/pool-dj.mp4" },
    { title:"DJ set", category:"Nightlife", dur:"0:20",
      poster:"assets/img/work/bottle-service.webp",
      loop:"assets/video/loop/bottle-service.mp4",
      video:"assets/video/work/bottle-service.mp4" },
    { title:"Club and lounge", category:"Nightlife", dur:"0:20",
      poster:"assets/img/work/club-crowd.webp",
      loop:"assets/video/loop/club-crowd.mp4",
      video:"assets/video/work/club-crowd.mp4" },
    { title:"Stage show", category:"Event", dur:"0:20",
      poster:"assets/img/work/club-red.webp",
      loop:"assets/video/loop/club-red.mp4",
      video:"assets/video/work/club-red.mp4" },
    { title:"Late night", category:"Nightlife", dur:"0:20",
      poster:"assets/img/work/night-show.webp",
      loop:"assets/video/loop/night-show.mp4",
      video:"assets/video/work/night-show.mp4" },
    { title:"Kitchen", category:"Food and drink", dur:"0:17",
      poster:"assets/img/work/food.webp",
      loop:"assets/video/loop/food.mp4",
      video:"assets/video/work/food.mp4" },
    { title:"Neon", category:"Venue", dur:"0:18",
      poster:"assets/img/work/venue.webp",
      loop:"assets/video/loop/venue.mp4",
      video:"assets/video/work/venue.mp4" }
  ],

  films: [
    { title:"Fire show", category:"Event", dur:"0:20",
      poster:"assets/img/work/beach-night.webp",
      loop:"assets/video/loop/beach-night.mp4",
      video:"assets/video/work/beach-night.mp4" }
  ],

  /* ---- STUDIO STATS ---- */
  stats: [
    { big:"4K→8K",      small:"Capture pipeline" },
    { big:"In-house",   small:"Edit · Colour · Sound" },
    { big:"End to end", small:"Concept to delivery" }
  ]
};
