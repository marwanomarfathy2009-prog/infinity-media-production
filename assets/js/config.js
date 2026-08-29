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
       poster      "assets/img/work/nova.webp"  - the still on the card
       video       "assets/video/nova.mp4"      - plays in the player
       c1 / c2     the two tones used as holding art until `poster` exists

     HOW THE SLOTS FILL IN
     Every entry below is drawn on the site, in order, right now. A slot with
     no `poster` shows the c1/c2 holding art in exactly the box a real still
     will occupy - so adding `poster` and `video` swaps the image in without
     moving anything on the page. There is no flag to switch and no layout to
     change; you only fill fields in.

     A slot with no `video` opens the player and says the piece is not online
     yet rather than failing. That message disappears on its own once `video`
     is set.

     Keep the placeholder titles until you have the real ones. Do not add
     invented view counts, years, clients or awards. */

  shorts: [
    { title:"Vertical slot 1", category:"Short", c1:"#6d5bd0", c2:"#171326", poster:null, video:null },
    { title:"Vertical slot 2", category:"Short", c1:"#c8763a", c2:"#241408", poster:null, video:null },
    { title:"Vertical slot 3", category:"Short", c1:"#c4452f", c2:"#24100b", poster:null, video:null },
    { title:"Vertical slot 4", category:"Short", c1:"#8e4b6b", c2:"#1e0e15", poster:null, video:null },
    { title:"Vertical slot 5", category:"Short", c1:"#5b6470", c2:"#14181d", poster:null, video:null },
    { title:"Vertical slot 6", category:"Short", c1:"#2f8f6b", c2:"#0b1c16", poster:null, video:null }
  ],

  films: [
    { title:"Film slot 1", category:"Brand film",  c1:"#6d5bd0", c2:"#141020", poster:null, video:null },
    { title:"Film slot 2", category:"Documentary", c1:"#c8763a", c2:"#1d1109", poster:null, video:null },
    { title:"Film slot 3", category:"Campaign",    c1:"#2f7d92", c2:"#0b1a20", poster:null, video:null },
    { title:"Film slot 4", category:"Short film",  c1:"#8e4b6b", c2:"#1c0d14", poster:null, video:null }
  ],

  /* ---- STUDIO STATS ---- */
  stats: [
    { big:"4K→8K",      small:"Capture pipeline" },
    { big:"In-house",   small:"Edit · Color · Sound" },
    { big:"End to end", small:"Concept to delivery" }
  ]
};
