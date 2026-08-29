(() => {
'use strict';

const S = window.SITE || {};
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* 56.25rem = 900px. One breakpoint object, referenced by every mobile guard,
   so the CSS media queries and the JS guards can never drift apart. */
const MOBILE_MQ = matchMedia('(max-width:56.25rem)');
const DESKTOP_MQ = matchMedia('(min-width:56.3125rem)');
const isMobile = () => MOBILE_MQ.matches;
const SAVE_DATA_EARLY = !!(navigator.connection && navigator.connection.saveData);
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const raf = fn => requestAnimationFrame(fn);

/* ══════════════════════════════════════════════════════ events
   A hook, not a tracker. Nothing is sent anywhere and no third-party script is
   loaded. Every meaningful interaction fires a DOM event on document and, if a
   dataLayer exists, pushes to it. Attach a real analytics tool later with:
     document.addEventListener('infinity:event', e => send(e.detail));         */
function track(action, detail) {
  const payload = Object.assign({ action }, detail || {});
  try { document.dispatchEvent(new CustomEvent('infinity:event', { detail: payload })); } catch (e) {}
  try { if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({ event: 'infinity' }, payload)); } catch (e) {}
}

/* ══════════════════════════════════════════════════════ observer liveness
   Everything on this page that fades in starts at opacity:0, and an
   IntersectionObserver is what brings it back. That is a fine way to pace a
   page and a terrible single point of failure: if the observer never reports
   - unsupported, disabled, or throttled by the embedding context - the site
   is not "unanimated", it is blank.

   So we ask it one question we already know the answer to. The root element
   is always intersecting; if the callback for it never arrives, the observer
   cannot be trusted and everything it was holding back is released instead. */
const HAS_IO = typeof IntersectionObserver === 'function';
let ioAlive = false;
/* The probe is held in a variable on purpose. An IntersectionObserver with no
   reference anywhere has been collected before delivering its first callback
   in some builds, which made this liveness check report a false negative and
   dropped the whole page into the fallback path. It also observes <body>
   rather than the root element, because observing the implicit root itself is
   an edge case not every engine reports the same way. */
let ioProbe = null;
if (HAS_IO) {
  try {
    ioProbe = new IntersectionObserver(() => {
      ioAlive = true;
      if (ioProbe) { ioProbe.disconnect(); ioProbe = null; }
    });
    ioProbe.observe(document.body);
  } catch (e) { ioProbe = null; }
}
/* Anything the observer would have triggered registers here too, with the
   element that was supposed to trigger it. If the observer turns out to be
   dead we fall back to a throttled scroll check against those elements -
   so the heavy things (a 1.8 MB reel, a third-party map frame) still wait
   until they are nearly on screen instead of all landing at once on load. */
const deferred = [];
const whenSeen = (fn, el, margin) => { deferred.push({ fn, el, margin: margin || 400 }); return fn; };

/* ══════════════════════════════════════════════════════ scroll lock
   Two things can cover the page - the drawer and the player - and either may
   be opened while the other is closing. A counter means the second one to
   close is the one that gives the page back, and the scroll position is
   restored explicitly because iOS forgets it when the body stops scrolling.
   Everything behind the overlay is marked inert, so a screen reader and the
   Tab key both stop at the edge of what is actually on screen. */
/* An element that has just been un-hidden is not always focusable on the same
   tick, and a single requestAnimationFrame is not a promise - a throttled or
   backgrounded tab may not run one for a long time. So we try now, on the next
   frame, and once more shortly after, and stop as soon as focus has actually
   landed inside. Re-trying never steals focus the visitor has moved. */
function focusInto(el, scope) {
  if (!el) return;
  const done = () => scope && scope.contains(document.activeElement) &&
                     document.activeElement !== document.body;
  const go = () => { if (!done()) { try { el.focus({ preventScroll: true }); } catch (e) {} } };
  go();
  requestAnimationFrame(go);
  setTimeout(go, 90);
}

const lockLayers = { n: 0, y: 0 };
const BEHIND = () => [$('main'), $('footer')];
function lockScroll(alsoHeader) {
  if (++lockLayers.n > 1) return;
  lockLayers.y = window.scrollY;
  document.body.classList.add('is-locked');
  const els = BEHIND(); if (alsoHeader) els.push($('#nav'));
  els.forEach(el => el && el.setAttribute('inert', ''));
}
function unlockScroll() {
  if (lockLayers.n === 0 || --lockLayers.n > 0) return;
  document.body.classList.remove('is-locked');
  [...BEHIND(), $('#nav')].forEach(el => el && el.removeAttribute('inert'));
  if (window.scrollY !== lockLayers.y) window.scrollTo(0, lockLayers.y);
}

/* A thrown error in one feature must never take the page down with it. */
addEventListener('load', e => {
  const t = e.target;
  if (t && t.classList && t.classList.contains('is-missing')) t.classList.remove('is-missing');
}, true);
const safe = (label, fn) => { try { return fn(); } catch (err) { console.warn('[infinity] ' + label, err); } };
addEventListener('error', e => {
  /* A missing image or video hides itself rather than showing a broken frame -
     but only once it actually had a source to fail at. The showreel starts
     with no src by design and must not be caught by this. */
  const t = e.target;
  if (!t || t.tagName !== 'IMG') return;          /* a video keeps its poster */
  if (!t.getAttribute('src') && !t.currentSrc) return;
  t.classList.add('is-missing');
}, true);

/* ══════════════════════════════════════════════════════ boot */
const boot = $('#boot'), bootBar = $('#bootBar'), bootPct = $('#bootPct'), bootMsg = $('#bootMsg');
document.body.classList.add('is-booting');
/* Nothing below may leave the page locked. Whatever happens to the scene, the
   curtain comes up. */
setTimeout(() => { try { finishBoot(); } catch (e) {} }, 6000);
let bootValue = 0, bootDone = false;

function setBoot(v, msg) {
  bootValue = Math.max(bootValue, clamp(v, 0, 1));
  bootBar.style.width = (bootValue * 100).toFixed(1) + '%';
  bootPct.textContent = String(Math.round(bootValue * 100)).padStart(2, '0');
  if (bootValue >= 0.999) bootMsg.textContent = 'Ready';
  else if (msg) bootMsg.textContent = msg;
}
function finishBoot() {
  if (bootDone) return;
  bootDone = true;
  setBoot(1, 'Ready');
  setTimeout(() => {
    boot.classList.add('is-done');
    document.body.classList.remove('is-booting');
    document.documentElement.classList.add('is-live');
    $('#heroCopy').classList.add('is-in');
  }, 380);
}
setBoot(0.08, 'Loading');
/* The loader is a curtain, not a gate. It lifts as soon as there is a real
   picture behind it - which is the poster frame, not the 3D scene - so the
   first thing a visitor sees arrives in a few hundred milliseconds instead
   of waiting on a 1.2 MB model. The live scene then fades in over the top.
   The cap below is only a backstop for a stalled network. */
const bootStarted = Date.now();
function liftCurtain() {
  const waited = Date.now() - bootStarted;
  if (waited < 420) return setTimeout(liftCurtain, 420 - waited);  // no flash
  finishBoot();
}
setTimeout(finishBoot, 2000);

/* ══════════════════════════════════════════════════════ cursor */
if (FINE && !RM) {
  const cur = $('#cursor'), dot = $('.cursor-dot', cur), ring = $('.cursor-ring', cur);
  const lab = $('.cursor-label', cur);
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, on = false;

  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    if (!on) { on = true; rx = x; ry = y; cur.classList.add('is-on'); }
  }, { passive: true });
  addEventListener('pointerdown', () => cur.classList.add('is-down'));
  addEventListener('pointerup', () => cur.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));

  (function tick() {
    raf(tick);
    rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
    dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
  })();

  const HOVER = 'a,button,input,textarea,label,[data-cursor],.short,.film,.svc-row';
  document.addEventListener('pointerover', e => {
    const t = e.target.closest(HOVER);
    if (!t) return;
    const label = t.getAttribute('data-cursor')
      || (t.matches('.film,.short') ? 'View' : '')
      || '';
    cur.classList.add('is-hover');
    if (label) { lab.textContent = label; cur.classList.add('is-label'); }
  });
  document.addEventListener('pointerout', e => {
    if (e.target.closest(HOVER) && !e.relatedTarget?.closest?.(HOVER)) {
      cur.classList.remove('is-hover', 'is-label');
    }
  });
}

/* ══════════════════════════════════════════════════════ magnetic buttons */
if (FINE && !RM) {
  $$('[data-magnet]').forEach(el => {
    let raf_ = null;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      if (raf_) return;
      raf_ = raf(() => {
        el.style.transform = `translate(${dx * 9}px, ${dy * 7}px)`;
        raf_ = null;
      });
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ══════════════════════════════════════════════════════ nav */
const nav = $('#nav'), navLinks = $$('#navLinks a'), ink = $('#navInk');
let lastY = scrollY, navHidden = false;

const reelSection = $('#reel');
function navOverReel() {
  const probe = nav.getBoundingClientRect().height * 0.55;
  const r = reelSection.getBoundingClientRect();
  nav.classList.toggle('over-reel', r.top <= probe && r.bottom >= probe);
}
function onNavScroll() {
  const y = scrollY;
  navOverReel();
  nav.classList.toggle('is-stuck', y > 40);
  const down = y > lastY && y > 260;
  if (down !== navHidden && !$('#drawer').classList.contains('is-open')) {
    navHidden = down;
    nav.classList.toggle('is-hidden', down);
  }
  lastY = y;
}
addEventListener('scroll', onNavScroll, { passive: true });
addEventListener('resize', navOverReel);
onNavScroll();

function moveInk(el) {
  if (!el) { ink.classList.remove('is-on'); return; }
  ink.classList.add('is-on');
  ink.style.width = el.offsetWidth + 'px';
  ink.style.transform = `translateX(${el.offsetLeft}px)`;
}
navLinks.forEach(a => a.addEventListener('pointerenter', () => moveInk(a)));
$('#navLinks')?.addEventListener('pointerleave', () => moveInk($('#navLinks a.is-active')));

const sections = ['reel', 'work', 'studio', 'contact']
  .map(id => document.getElementById(id)).filter(Boolean);
const secObs = HAS_IO && new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const id = e.target.id;
    navLinks.forEach(a => {
      const on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    moveInk($('#navLinks a.is-active'));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
if (secObs) sections.forEach(s => secObs.observe(s));

/* drawer */
const burger = $('#burger'), drawer = $('#drawer');
const setDrawer = open => {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  drawer.classList.toggle('is-open', open);
  if (open) {
    lockScroll(false);                       /* the burger stays reachable */
    nav.classList.remove('is-hidden'); nav.classList.remove('over-reel');
    /* the first section link, not the panel itself - a screen reader should
       hear where it has landed, not an anonymous container */
    focusInto($('.drawer-nav a', drawer), drawer);
  } else {
    unlockScroll();
    navOverReel();
    /* the burger is display:none once the viewport is wide enough for the
       full bar, so it cannot always be the place focus goes back to */
    if (drawer.contains(document.activeElement)) returnFocus(burger, drawer);
  }
};
burger.addEventListener('click', () => setDrawer(burger.getAttribute('aria-expanded') !== 'true'));
drawer.addEventListener('click', e => { if (e.target.closest('a')) setDrawer(false); });
const onMQ = (mq, fn) => mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn);
onMQ(matchMedia('(min-width:60.0625rem)'), e => e.matches && setDrawer(false));

/* ══════════════════════════════════════════════════════ contact details */
/* The markup already carries the studio's real contact details, so this
   section overrides them rather than filling a blank. A missing or half-filled
   config now leaves the authored values standing instead of writing
   "undefined" into the one part of the page a client has to be able to use. */
const put = (el, val) => { if (el && val) el.textContent = val; };
const link = (el, val) => { if (el && val) el.href = val; };

$('#yr').textContent = new Date().getFullYear();
const waLink = txt => `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(txt)}`;

const mEmail = $('#mEmail');
put($('.v', mEmail), S.email);
link(mEmail, S.email && 'mailto:' + S.email);
/* mailto only works if the visitor has a mail app set up. Copy the address as
   well, so the row is useful either way. */
mEmail.addEventListener('click', () => {
  try { navigator.clipboard && navigator.clipboard.writeText(S.email); } catch (e) {}
  const v = $('.v', mEmail), was = v.textContent;
  v.textContent = 'Copied to clipboard';
  setTimeout(() => { v.textContent = was; }, 1600);
});
const mTel = $('#mTel');
put($('.v', mTel), S.whatsappDisplay || S.phoneDisplay);
link(mTel, S.whatsapp && waLink('Hi Infinity,'));
put($('#mLoc'), S.location);
put($('#endLoc'), S.location);

const dMail = $('#mDrawerMail'), dTel = $('#mDrawerTel');
put(dMail, S.email); link(dMail, S.email && mEmail.href);
put(dTel, S.whatsappDisplay || S.phoneDisplay); link(dTel, S.whatsapp && mTel.href);
dTel.target = '_blank'; dTel.rel = 'noopener';

if (Object.keys(S.social || {}).length) $('#socialNav').innerHTML = Object.entries(S.social)
  .map(([k, v]) => `<a class="ul" href="${esc(v)}" target="_blank" rel="noopener">${({instagram:'Instagram',tiktok:'TikTok',youtube:'YouTube',facebook:'Facebook',x:'X',linkedin:'LinkedIn'})[k] || (k[0].toUpperCase()+k.slice(1))}</a>`)
  .join('');

/* the structured data must only ever carry links that really exist */
safe('json-ld', () => {
  const ld = document.getElementById('ld-graph');
  if (!ld) return;
  const urls = Object.values(S.social || {}).filter(Boolean);
  if (!urls.length) return;
  const data = JSON.parse(ld.textContent);
  const org = data['@graph'].find(n => String(n['@type']).includes('Organization'));
  if (org) { org.sameAs = urls; ld.textContent = JSON.stringify(data); }
});

if ((S.stats || []).length) $('#statsRow').innerHTML = S.stats
  .map(s => `<div><dt>${esc(s.big)}</dt><dd>${esc(s.small)}</dd></div>`).join('');

/* ══════════════════════════════════════════════════════ work
   Every field below title is optional. Anything the client has not supplied
   yet is simply not rendered - no placeholder text, no invented metadata.
   A piece becomes real by adding `poster` and `video` to it in config.js;
   nothing in this section needs redesigning when that happens.            */
const art = (a, b) =>
  `background:radial-gradient(115% 95% at 28% 8%,${a || '#6d5bd0'}b3,transparent 66%),linear-gradient(158deg,${b || '#141020'},#101015)`;

/* the still that fronts a piece: a real frame if there is one, the tonal
   holding art if there is not. Fixed aspect either way, so nothing shifts. */
const cardMedia = (item, cls, alt) => item.poster
  ? `<img class="${cls}-img" src="${esc(item.poster)}" alt="${esc(alt || '')}"
        loading="lazy" decoding="async">`
  : `<span class="${cls}-art" style="${art(item.c1, item.c2)}"></span>`;

/* "Commercial · 2026 · Nova" - built only from the parts that exist */
const metaLine = item => [item.category || item.kind, item.year, item.client]
  .filter(Boolean).map(esc).join(' · ');

/* ── the work grid ───────────────────────────────────────────────────────
   Every entry in config.js is drawn, in order, whether or not it has media
   yet. A slot without a poster gets the tonal holding art in the same box a
   real still will occupy, so adding `poster` and `video` to an entry later
   swaps the still in without moving a single pixel of the layout.

   Fields below `title` are optional and only drawn when present - no empty
   labels, no invented years, clients or view counts.                      */
const FILMS  = S.films  || [];
const SHORTS = S.shorts || [];

const filmCard = (f, i) => `
<button class="film" type="button" data-kind="film" data-i="${i}" aria-label="Open ${esc(f.title)}">
  <span class="film-idx">${String(i + 1).padStart(2, '0')}</span>
  <span class="film-media">${cardMedia(f, 'film', f.title)}
    ${f.dur ? `<span class="film-dur">${esc(f.dur)}</span>` : ''}</span>
  <span class="film-bar"><b>${esc(f.title)}</b><span class="film-meta">${metaLine(f)}</span></span>
</button>`;

const shortCard = (s, i) => `
<button class="short" type="button" data-kind="short" data-i="${i}" aria-label="Open ${esc(s.title)}">
  <span class="short-media">${cardMedia(s, 'short', s.title)}
    ${s.dur ? `<span class="short-dur">${esc(s.dur)}</span>` : ''}</span>
  <span class="short-cap"><b>${esc(s.title)}</b>${
    metaLine(s) || s.meta ? `<span class="meta">${esc(metaLine(s) || s.meta)}</span>` : ''}</span>
</button>`;

/* A safety net, not the normal view: this only appears if `films` in
   config.js is emptied out entirely. With slots configured - placeholder or
   real - the grid above is what renders. */
const WORK_EMPTY = `
<div class="work-empty">
  <p>Selected films are published here as they are delivered.</p>
  <div>
    <p class="k">In the meantime</p>
    <p>The reel above is the short cut. Ask us for a full piece and we will
       send it over.</p>
    <a class="btn btn-line" href="#contact">Ask for the work
      <svg class="arw" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5"/></svg></a>
  </div>
</div>`;

const filmsRow = $('#filmsRow');
if (FILMS.length) {
  filmsRow.innerHTML = FILMS.map(filmCard).join('');
} else {
  filmsRow.classList.remove('films');
  filmsRow.innerHTML = WORK_EMPTY;
}

/* the shorts rail and its heading travel together - an empty rail under a
   live heading is the placeholder problem in a different shape */
if (SHORTS.length) {
  $('#shortsRow').innerHTML = SHORTS.map(shortCard).join('');
} else {
  ['#shortsHead', '#shortsWrap'].forEach(sel => { const el = $(sel); if (el) el.hidden = true; });
}



$$('[data-rail]').forEach(btn => btn.addEventListener('click', () => {
  const rail = document.getElementById(btn.dataset.rail);
  const card = rail.firstElementChild;
  const step = card ? card.getBoundingClientRect().width + 24 : 400;
  rail.scrollBy({ left: step * Number(btn.dataset.dir), behavior: RM ? 'auto' : 'smooth' });
}));
(function syncRail(id) {
  const rail = document.getElementById(id);
  const [prev, next] = $$(`[data-rail="${id}"]`);
  if (!rail || !prev) return;
  const upd = () => {
    prev.disabled = rail.scrollLeft < 8;
    next.disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 8;
  };
  rail.addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', upd); upd();
})('shortsRow');

/* ══════════════════════════════════════════════════════ lightbox */
const lb = $('#lb'), lbFrame = $('#lbFrame'), lbTitle = $('#lbTitle'),
      lbMeta = $('#lbMeta'), lbInfo = $('#lbInfo');
let lastFocus = null;

function openLB(kind, i) {
  const item = (kind === 'short' ? SHORTS : FILMS)[i];
  if (!item) return;
  lastFocus = document.activeElement;
  track('work_open', { kind, title: item.title });

  lbTitle.textContent = item.title;
  lb.setAttribute('aria-label', item.title + ' — ' +
    (item.category || (kind === 'short' ? 'Short' : 'Film')));
  lbMeta.textContent = item.category || item.kind || (kind === 'short' ? 'Short' : 'Film');
  lbFrame.classList.toggle('is-vertical', kind === 'short');

  if (item.video) {
    lbFrame.innerHTML =
      `<video src="${esc(item.video)}" ${item.poster ? `poster="${esc(item.poster)}"` : ''}
        controls autoplay playsinline preload="metadata"></video>`;
  } else if (item.poster) {
    lbFrame.innerHTML = `<img src="${esc(item.poster)}" alt="${esc(item.title)}" decoding="async">`;
  } else {
    lbFrame.innerHTML =
      `<div class="lb-soon" style="${art(item.c1, item.c2)}">
         <div><p class="eyebrow">${kind === 'short' ? 'Short' : 'Film'}</p>
         <b>${esc(item.title)}</b>
         <p>This piece isn't online yet. Ask us for the file and we'll send it over.</p></div>
       </div>`;
  }

  /* the detail block renders only the fields that have been filled in */
  /* the bar above already carries the category - the block below adds only
     what it does not, and disappears entirely when there is nothing to add */
  const rows = [['Client', item.client], ['Year', item.year], ['Role', item.role]]
    .filter(([, v]) => v);
  lbInfo.innerHTML =
    (rows.length ? `<dl class="lb-facts">${rows
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '') +
    (item.description ? `<p class="lb-desc">${esc(item.description)}</p>` : '');
  lbInfo.hidden = !lbInfo.innerHTML;

  lb.classList.add('is-open');
  lockScroll(true);
  focusInto($('#lbClose'), lb);
}
function closeLB() {
  if (!lb.classList.contains('is-open')) return;
  lb.classList.remove('is-open');
  unlockScroll();
  /* pausing is not enough - an un-emptied <video> keeps its buffer and, on
     some builds, keeps pulling the file. Detach the source, then clear. */
  const v = lbFrame.querySelector('video');
  if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} }
  setTimeout(() => { if (!lb.classList.contains('is-open')) lbFrame.innerHTML = ''; }, 400);
  /* Safari and Firefox do not focus a <button> on a mouse click, so lastFocus
     is often <body> - and calling focus() on that does nothing, which would
     leave focus sitting on the close button of a dialog that is now hidden.
     Put it back on the card if we can, and let it go if we cannot. */
  returnFocus(lastFocus, lb);
}

function returnFocus(target, from) {
  const usable = target && target.isConnected && target !== document.body &&
                 typeof target.focus === 'function' && target.offsetParent !== null;
  if (usable) { try { target.focus({ preventScroll: true }); } catch (e) {} }
  if (from.contains(document.activeElement)) document.activeElement.blur();
}
document.addEventListener('click', e => {
  const card = e.target.closest('[data-kind]');
  if (card) return openLB(card.dataset.kind, Number(card.dataset.i));
  if (e.target.closest('#lbClose') || e.target === lb) closeLB();
});
/* Tab must cycle inside whatever is open, and never escape behind it. */
const FOCUSABLE = 'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])';
function trap(container, e) {
  const items = $$(FOCUSABLE, container).filter(el => el.offsetParent !== null || el === document.activeElement);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!container.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}
addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (lb.classList.contains('is-open')) return closeLB();
    if (drawer.classList.contains('is-open')) return setDrawer(false);
  }
  if (e.key !== 'Tab') return;
  if (lb.classList.contains('is-open')) return trap(lb, e);
  if (drawer.classList.contains('is-open')) return trap(drawer, e);
});

/* ══════════════════════════════════════════════════════ reveals */
const io = HAS_IO ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('is-in');
  io.unobserve(e.target);
}), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;

$$('.sec-head,.studio-top,.svc,.contact-head,.contact-grid,.reel-copy,.stats,.films,.rail,.work-empty')
  .forEach(el => { if (el.closest('[hidden]')) return; el.classList.add('reveal'); io && io.observe(el); });
$$('h1,h2,.display').forEach(h => { if (h.querySelector('.ln') && io) io.observe(h); });

/* the safety net: if the observer never answered, nothing stays hidden */
function releaseEverything() {
  document.documentElement.classList.add('io-fallback');
  /* content first, and all of it - nothing stays invisible */
  $$('.reveal,.ln,.chapter').forEach(el => el.classList.add('is-in'));
  /* media second, and only as it is approached */
  let pending = deferred.slice(), timer = 0;
  const sweep = () => {
    timer = 0;
    pending = pending.filter(d => {
      if (!d.el || !d.el.isConnected) { try { d.fn(); } catch (e) {} return false; }
      const r = d.el.getBoundingClientRect();
      if (r.top > innerHeight + d.margin || r.bottom < -d.margin) return true;
      try { d.fn(); } catch (e) {}
      return false;
    });
    if (!pending.length) removeEventListener('scroll', onScroll);
  };
  /* deliberately a timer and not requestAnimationFrame: this path exists
     precisely for the case where frame callbacks are not being delivered, so
     it must not lean on the thing that already failed. */
  const onScroll = () => { if (!timer) timer = setTimeout(sweep, 100); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  sweep();
}
if (!HAS_IO) releaseEverything();
else addEventListener('load', () => setTimeout(() => {
  if (!ioAlive) { console.warn('[infinity] IntersectionObserver inert - revealing all content'); releaseEverything(); }
}, 1200));

/* ══════════════════════════════════════════════════════ showreel */
const reelVid = $('#reelVid'), reelStage = $('#reelStage');
reelVid.poster = S.reel.poster;
/* the same still sits behind the video, so a failed or undecodable file
   still leaves a finished-looking section rather than black */
if (S.reel.poster) reelStage.style.backgroundImage = `url("${S.reel.poster}")`;
/* The file is fetched when the section is nearly in view, never on first
   paint. On data saver it is not fetched at all - the poster is a real frame
   of the reel, so the section is still finished, just still. */
/* The data-saver test lives inside the loader, not at the call site. There is
   more than one route here - the observer, and the fallback sweep that runs
   when the observer is dead - and a guard on only one of them is not a guard.
   On data saver the poster stays, which is a real frame of the reel, so the
   section is still finished; it just does not move. */
/* On a phone the reel is tap-to-play: the poster is a real frame, so the
   section is finished before a single byte of video moves. autoplay is also
   removed there - it and preload="none" pull in opposite directions, and on
   mobile we want preload to win. */
const reelPlay = $('#reelPlay');
let reelStarted = false;
if (isMobile()) reelVid.removeAttribute('autoplay');

function startReel() {
  reelStarted = true;
  if (!reelVid.getAttribute('src')) {
    /* Assigning src already queues a load. Calling load() as well aborts the
       play() below, which left the first tap sitting on a paused video with
       the play button already hidden. Set the source, then play when there is
       something to play. */
    reelVid.src = S.reel.src;
    reelVid.addEventListener('canplay', () => reelVid.play().catch(() => {}), { once: true });
  }
  reelVid.play().catch(() => {});
  track('reel_play');
}
/* the affordance follows what the video is actually doing, not what we asked
   it to do - so a blocked or failed play leaves the button where it was */
reelVid.addEventListener('playing', () => reelStage.classList.add('is-playing'));
reelVid.addEventListener('pause', () => {
  if (isMobile() && reelVid.currentTime === 0) reelStage.classList.remove('is-playing');
});
if (reelPlay) reelPlay.addEventListener('click', startReel);

const loadReel = whenSeen(() => {
  if (SAVE_DATA_EARLY) return;
  if (isMobile()) return;                 /* mobile waits for a deliberate tap */
  if (reelVid.getAttribute('src')) return;
  reelVid.src = S.reel.src; reelVid.load();
}, reelStage, 500);
if (!SAVE_DATA_EARLY && HAS_IO) {
  new IntersectionObserver((es, obs) => es.forEach(e => {
    if (!e.isIntersecting) return;
    loadReel(); obs.disconnect();
  }), { rootMargin: '500px' }).observe(reelStage);
}

if (HAS_IO) {
  new IntersectionObserver(es => es.forEach(e => {
    if (!reelVid.src) return;
    if (!e.isIntersecting) return reelVid.pause();
    if (isMobile() && !reelStarted) return;   /* never resume what was never started */
    reelVid.play().catch(() => {});
  }), { threshold: 0.12 }).observe(reelStage);
}

/* The showreel currently carries no audio track. Offering an "unmute" button
   over a silent file is a control that lies, so it is removed unless the
   browser can tell us there is really something to hear. Browsers that cannot
   answer keep the button rather than hiding a working one. */
const soundBtn = $('#reelSound'), soundIcon = $('#soundIcon');
reelVid.addEventListener('loadeddata', () => {
  const t = reelVid.audioTracks, wk = reelVid.webkitAudioDecodedByteCount;
  const known = (t && typeof t.length === 'number') || reelVid.mozHasAudio !== undefined
    || wk !== undefined;
  if (!known) return;
  const has = (t && t.length > 0) || reelVid.mozHasAudio === true || wk > 0;
  if (!has) soundBtn.remove();
}, { once: true });
soundBtn.addEventListener('click', () => {
  reelVid.muted = !reelVid.muted;
  soundBtn.setAttribute('aria-label', reelVid.muted ? 'Unmute showreel' : 'Mute showreel');
  soundIcon.innerHTML = reelVid.muted
    ? '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/>'
    : '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/>';
  if (!reelVid.muted) reelVid.play().catch(() => {});
});

/* reel parallax — one transform, driven by scroll, throttled to rAF */
if (!RM) {
  let queued = false;
  const par = () => {
    queued = false;
    const r = reelStage.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    reelVid.style.transform = `scale(1.08) translate3d(0,${(-t * 4).toFixed(2)}%,0)`;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; raf(par); } }, { passive: true });
  par();
}

/* ══════════════════════════════════════════════════════ map (lazy)
   The embed is loaded only when it comes near the viewport, and it is laid
   over a real link - so a blocked or failed frame degrades to something the
   visitor can still use rather than an empty box. */
safe('map', () => {
  const box = $('#mapBox'), link = $('#mapLink');
  if (!box) return;
  if (link) link.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(S.location || '');
  const where = $('#mapWhere');
  if (where && S.location) where.textContent = S.location;
  const mountMap = whenSeen(() => {
    if (box.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.title = 'Infinity studio location';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.src = 'https://www.google.com/maps?q=' + encodeURIComponent(S.location || '') + '&output=embed';
    /* the frame only reveals itself once it has actually loaded, so a blocked
       or failed embed leaves the link underneath visible instead of covering
       it with a broken frame */
    f.addEventListener('load', () => f.classList.add('is-ready'));
    box.appendChild(f);
  }, box, 300);
  if (HAS_IO) {
    new IntersectionObserver((es, obs) => es.forEach(e => {
      if (!e.isIntersecting) return;
      obs.disconnect(); mountMap();
    }), { rootMargin: '300px' }).observe(box);
  }
});

/* ══════════════════════════════════════════════════════ services */
const svc = $('#svc');
$$('.svc-row', svc).forEach(row => {
  row.addEventListener('click', () => {
    const open = row.classList.contains('is-open');
    $$('.svc-row', svc).forEach(r => { r.classList.remove('is-open'); r.setAttribute('aria-expanded', 'false'); });
    if (!open) { row.classList.add('is-open'); row.setAttribute('aria-expanded', 'true'); }
    svc.classList.toggle('is-engaged', !open);
  });
});
if (FINE) {
  svc.addEventListener('pointerenter', () => svc.classList.add('is-engaged'));
  svc.addEventListener('pointerleave', () => {
    if (!$('.svc-row.is-open', svc)) svc.classList.remove('is-engaged');
  });
}

/* ══════════════════════════════════════════════════════ form */
const form = $('#contactForm'), note = $('#formNote'), sendBtn = $('#sendBtn');
const fields = {
  name:    { el: $('#f-name'), box: $('#fld-name'), ok: v => v.trim().length > 1 },
  email:   { el: $('#f-mail'), box: $('#fld-mail'), ok: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) },
  message: { el: $('#f-msg'),  box: $('#fld-msg'),  ok: v => v.trim().length > 4 }
};
/* Production-safety on the client. It is a convenience layer only - the real
   guarantees (sanitising, spam scoring, rate limiting) belong to whatever
   service receives the message. Web3Forms does all three server-side. */
const LIMITS = { name: 80, email: 120, message: 2000 };
fields.name.el.maxLength = LIMITS.name;
fields.email.el.maxLength = LIMITS.email;
fields.message.el.maxLength = LIMITS.message;
let lastSent = 0;

const validate = only => {
  let good = true;
  for (const [k, f] of Object.entries(fields)) {
    if (only && only !== k) continue;
    const valid = f.ok(f.el.value);
    f.box.classList.toggle('is-invalid', !valid);
    f.el.setAttribute('aria-invalid', String(!valid));
    if (!valid) good = false;
  }
  return good;
};
Object.entries(fields).forEach(([k, f]) => {
  f.el.addEventListener('blur', () => validate(k));
  f.el.addEventListener('input', () => { if (f.box.classList.contains('is-invalid')) validate(k); });
});
const compose = () =>
  `New project enquiry for Infinity\n\nName: ${fields.name.el.value.trim()}\n` +
  `Email: ${fields.email.el.value.trim()}\n\n${fields.message.el.value.trim()}`;
const setNote = (msg, cls = '') => {
  note.textContent = msg;
  note.className = 'form-note ' + (msg ? 'is-on ' : '') + cls;
};

$('#waBtn').addEventListener('click', () => {
  if (!validate()) return setNote("Fill in the three fields and we'll open WhatsApp for you.", 'is-bad');
  setNote('Opening WhatsApp…', 'is-ok');
  window.open(waLink(compose()), '_blank', 'noopener');
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  /* a bot fills every field it can see, including the one nobody can */
  if (form.elements.company && form.elements.company.value) return;
  if (Date.now() - lastSent < 20000) return setNote('Just sent - give it a moment before sending another.', 'is-bad');
  if (!validate()) return setNote('Please fix the highlighted fields.', 'is-bad');
  const label = sendBtn.innerHTML;
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spin"></span><span class="lbl">Sending…</span>';
  setNote('');
  try {
    if (S.web3formsKey) {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: S.web3formsKey,
          subject: 'New project enquiry for Infinity',
          from_name: fields.name.el.value.trim(),
          name: fields.name.el.value.trim(),
          email: fields.email.el.value.trim(),
          message: fields.message.el.value.trim()
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'send failed');
      form.reset();
      Object.values(fields).forEach(f => f.box.classList.remove('is-invalid'));
      lastSent = Date.now();
      track('contact_submit', { via: 'web3forms' });
      setNote("Sent. We'll get back to you within one business day.", 'is-ok');
    } else {
      location.href = `mailto:${S.email}?subject=${encodeURIComponent('New project enquiry')}` +
        `&body=${encodeURIComponent(compose())}`;
      track('contact_submit', { via: 'mailto' });
      setNote('Opening your mail app. If nothing happens, use the WhatsApp button.', 'is-ok');
    }
  } catch {
    setNote("Couldn't send that. Try WhatsApp, or email " + S.email + '.', 'is-bad');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = label;
  }
});

/* ══════════════════════════════════════════════════════ event hooks */
document.addEventListener('click', e => {
  const a = e.target.closest('a,button');
  if (!a) return;
  if (a.matches('[href="#contact"],#sendBtn')) track('cta_start_project', { from: a.dataset.at || a.textContent.trim().slice(0, 40) });
  else if (a.closest('#navLinks,.drawer-nav')) track('nav_click', { to: a.getAttribute('href') });
  else if (a.id === 'reelSound') track('reel_sound');
  else if (a.id === 'mTel' || a.id === 'waBtn' || a.id === 'mDrawerTel') track('contact_whatsapp');
  else if (a.id === 'mEmail' || a.id === 'mDrawerMail') track('contact_email');
}, { passive: true });

/* ══════════════════════════════════════════════════════ credits */
const creditToggle = $('#creditToggle'), creditText = $('#credit');
creditToggle.addEventListener('click', () => {
  const open = creditToggle.getAttribute('aria-expanded') === 'true';
  creditToggle.setAttribute('aria-expanded', String(!open));
  creditText.hidden = open;
});

/* ══════════════════════════════════════════════════════ 3D */
/* ── who gets the live scene ────────────────────────────────────────────
   The scene is 2.2 MB of Three.js and geometry. It is worth it on a desktop
   with a GPU and worth nothing at all to someone who asked for less motion,
   turned on data saver, or is holding a four-year-old phone. Each of those
   gets the still instead - which is a finished frame, not a failure state. */
const SAVE_DATA = SAVE_DATA_EARLY;
const LOW_POWER = (() => {
  const mem = navigator.deviceMemory;          // Chromium only; undefined elsewhere
  const cpu = navigator.hardwareConcurrency;
  if (mem !== undefined && mem <= 4) return true;
  if (cpu !== undefined && cpu <= 4 && matchMedia('(pointer:coarse)').matches) return true;
  return false;
})();

const canWebGL = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch { return false; }
})();

const poster = $('#heroPoster');
window.__HP__ = window.__HP__ || "assets/img/hero-poster.webp";
window.__HP_M__ = window.__HP_M__ || "assets/img/hero-poster-mobile.webp";
const narrowMQ = matchMedia('(max-width:56.25rem)');
/* which still is showing is decided in CSS by a media query; this only
   needs to know the URL so it can tell when the image has decoded */
const posterURL = () => `${narrowMQ.matches ? window.__HP_M__ : window.__HP__}`;
/* the poster carries the hero until the live scene is ready, so a slow
   connection never sees a frozen or empty stage */
function showPoster() {
  poster.classList.add('is-on');
  /* lift the loader the moment the still is actually decoded */
  const probe = new Image();
  probe.onload = probe.onerror = liftCurtain;
  probe.src = posterURL();
}
function heroFallback() {
  showPoster();
  document.documentElement.classList.add('static-hero');
  finishBoot();
}

/* The viewport is the first question, not the last. A phone with a fast GPU
   and 8 GB of RAM still has no business downloading 2.2 MB of Three.js for a
   hero that is one screen tall and shows a still image. Below 900px the
   module is never fetched, parsed or run. */
const wantScene = DESKTOP_MQ.matches && canWebGL && !RM && !SAVE_DATA && !LOW_POWER;

if (!wantScene) {
  setBoot(1, 'Ready');
  heroFallback();
} else {
  showPoster();
  const boot3D = mod => {
    /* ---- hero ---- */
    const hero = mod.initHero({
      canvas: $('#gl'),
      onProgress: ev => { if (ev.total) setBoot(0.08 + 0.85 * (ev.loaded / ev.total), 'Loading model'); },
      onReady: () => { setBoot(1); poster.classList.remove('is-on'); finishBoot(); },
      onFail: heroFallback
    });

    /* the pool of light on the stage floor follows the object, like a follow-spot */
    const stage = $('.hero-stage');
    let lastPool = -1;
    hero.onFrame(({ travel }) => {
      if (narrowMQ.matches) return;
      const x = Math.round(68 - travel * 18);
      if (x === lastPool) return;
      lastPool = x;
      stage.style.setProperty('--px', x + '%');
    });

  };
  const fail3D = err => { console.warn('[scene]', err); heroFallback(); };
  if (window.HERO) { try { boot3D(window.HERO); } catch (e) { fail3D(e); } }
  else import(new URL(S.sceneModule || 'assets/js/scene.js', location.href).href)
         .then(boot3D).catch(fail3D);
}

/* hero scroll → fade the copy, drive the progress bar (desktop only) */
const heroCopy = $('#heroCopy'), chapA = $('#chapA'), chapB = $('#chapB'),
      cue = $('#cue'), prog = $('#prog'), heroScroll = $('#heroScroll'),
      heroSticky = $('#heroSticky'), heroPoster = $('#heroPoster');
const segf = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
let heroQueued = false;

/* Everything the desktop handler writes is inline, and inline styles outlive
   a media query. Crossing into mobile has to wipe them or the copy stays
   latched at opacity:0 on the very screen that is supposed to be static. */
function clearHeroInline() {
  [heroCopy, chapA, chapB, cue, prog, heroPoster].forEach(el => {
    if (!el) return;
    el.style.opacity = '';
    el.style.transform = '';
    el.style.pointerEvents = '';
    el.style.width = '';
  });
}

function heroCopyTick() {
  heroQueued = false;
  /* On a phone the hero is a single static screen. This returns before it can
     write one style: the scrub is not hidden, it does not run. */
  if (isMobile()) return;
  const span = heroScroll.offsetHeight - innerHeight;
  const p = span > 0 ? clamp(-heroScroll.getBoundingClientRect().top / span, 0, 1) : 0;
  const out = 1 - segf(p, 0.14, 0.27);
  heroCopy.style.opacity = out;
  heroCopy.style.transform = `translateY(${-(1 - out) * 26}px)`;
  heroCopy.style.pointerEvents = out > 0.5 ? '' : 'none';
  cue.style.opacity = 1 - segf(p, 0.02, 0.12);
  const aOn = segf(p, 0.30, 0.36) * (1 - segf(p, 0.55, 0.61));
  const bOn = segf(p, 0.64, 0.70) * (1 - segf(p, 0.90, 0.97));
  chapA.style.opacity = aOn; chapA.style.transform = `translateY(${(1 - aOn) * 16}px)`;
  chapB.style.opacity = bOn; chapB.style.transform = `translateY(${(1 - bOn) * 16}px)`;
  prog.style.width = (p * 100).toFixed(2) + '%';
}
addEventListener('scroll', () => { if (!heroQueued) { heroQueued = true; raf(heroCopyTick); } }, { passive: true });
addEventListener('resize', heroCopyTick);

/* ══════════════════════════════════════════════════════ mobile hero
   The desktop hero is a 3.2-screen scrub through a WebGL scene. On a phone
   that bought two viewports of blank white and 2.2 MB of JavaScript, so the
   phone gets a different thing entirely: one screen, a still camera, and the
   two chapter beats promoted to real cards below it.                        */

/* ---- 1b. the camera grows on scroll -------------------------------------
   One custom property, written from a rAF-throttled scroll listener and
   consumed by a single transform. No layout-triggering property is touched,
   and the ceiling is enforced twice - once by clamping progress and once by
   clamping the result - because an uncapped scale eventually eats the copy. */
const CAM_MIN = 0.82, CAM_MAX = 1.10;
let camQueued = false;
function camTick() {
  camQueued = false;
  if (!isMobile()) return;
  if (RM) { heroScroll.style.setProperty('--cam', '1'); return; }
  const span = heroSticky.offsetHeight || innerHeight;
  const p = clamp(scrollY / span, 0, 1);
  const s = clamp(CAM_MIN + (CAM_MAX - CAM_MIN) * p, CAM_MIN, CAM_MAX);
  heroScroll.style.setProperty('--cam', s.toFixed(4));
}
addEventListener('scroll', () => { if (!camQueued) { camQueued = true; raf(camTick); } }, { passive: true });

/* ---- 1c. the two beats become cards in normal flow ----------------------
   On desktop they are absolutely positioned inside the sticky viewport; on a
   phone they are full-screen cards after it. That is a real DOM move, and it
   has to be reversible - putting them back before #cue restores the exact
   original order so desktop is untouched. */
function placeChapters() {
  if (!chapA || !chapB || !heroSticky) return;
  if (isMobile()) {
    /* siblings of the hero, ahead of the reel - so .hero really is one
       viewport tall and the cards are two more screens after it */
    if (chapA.parentElement === heroSticky && reelSection && reelSection.parentElement) {
      reelSection.parentElement.insertBefore(chapA, reelSection);
      reelSection.parentElement.insertBefore(chapB, reelSection);
    }
  } else if (chapA.parentElement !== heroSticky) {
    /* back to the exact original order: heroCopy, chapA, chapB, cue */
    heroSticky.insertBefore(chapA, cue);
    heroSticky.insertBefore(chapB, cue);
  }
}

/* a plain fade-in on enter - not scrubbed, so it cannot stall half-drawn */
let chapObs = null;
function watchChapters() {
  if (!HAS_IO || chapObs || !chapA) return;
  chapObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    chapObs.unobserve(e.target);
  }), { threshold: 0.15 });
  [chapA, chapB].forEach(el => el && chapObs.observe(el));
}

function syncHeroMode() {
  clearHeroInline();
  placeChapters();
  if (isMobile()) { watchChapters(); camTick(); }
  else heroScroll.style.removeProperty('--cam');
  heroCopyTick();
}
onMQ(MOBILE_MQ, syncHeroMode);
syncHeroMode();
})();