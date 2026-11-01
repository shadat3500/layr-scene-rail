(() => {
  "use strict";

  // ── catalogue ──────────────────────────────────────────────
  const IMG = (c, v) => `assets/img/parka-${c}-${v}.webp`;
  const PRODUCTS = {
    black: { name: "Arctic Parka", price: 199 },
    navy: { name: "Navy Parka", price: 199 },
    forest: { name: "Forest Parka", price: 199 },
    grey: { name: "Stone Parka", price: 199 },
    sand: { name: "Sand Parka", price: 199 },
  };
  Object.keys(PRODUCTS).forEach((k) => Object.assign(PRODUCTS[k], { id: k, side: IMG(k, "side"), front: IMG(k, "front"), back: IMG(k, "back") }));
  // order of pieces on the rail (15 = the "NN / 15" counter)
  const RAIL = ["navy", "grey", "black", "sand", "forest", "black", "grey", "navy", "grey", "sand", "forest", "black", "sand", "navy", "grey"];
  const money = (n) => "$" + n.toFixed(2);

  // preload every view so hover flips never flash
  Object.values(PRODUCTS).forEach((p) => [p.side, p.front, p.back].forEach((s) => { const i = new Image(); i.src = s; }));

  const $ = (s) => document.querySelector(s);
  const stage = $("#stage"), zone = $("#railZone"), itemsEl = $("#items");
  const railPath = $("#railPath"), railShadow = $("#railShadow"), railShine = $("#railShine");
  const isTouch = matchMedia("(hover: none)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── geometry ───────────────────────────────────────────────
  let W = 0, Hs = 0, H = 0, S = 0, L = 0, yEnd = 0, sag = 0;
  const railY = (x) => { const t = x / W; return yEnd + 4 * sag * t * (1 - t); };

  function layout() {
    W = stage.clientWidth; Hs = stage.clientHeight;
    const mobile = W < 860;
    H = Math.max(160, Math.min(mobile ? Hs * 0.34 : Hs * 0.33, 340));
    S = H * (mobile ? 0.56 : 0.47);
    yEnd = Hs * (mobile ? 0.335 : 0.315);
    sag = Hs * (mobile ? 0.06 : 0.07);
    const ext = 60; // rail runs past both edges
    const d = `M ${-ext} ${railY(-ext)} Q ${W / 2} ${yEnd + 2 * sag} ${W + ext} ${railY(W + ext)}`;
    railPath.setAttribute("d", d);
    railShadow.setAttribute("d", d);
    railShadow.setAttribute("transform", "translate(0 7)");
    railShine.setAttribute("d", d);
    railShine.setAttribute("transform", "translate(0 -2.4)");
    buildItems();
  }

  // ── rail items ─────────────────────────────────────────────
  let items = [];
  const HOOK = `<svg class="hook" viewBox="0 0 22 46" fill="none"><path d="M11 46V21c0-9-9-10-8.5-3" stroke="#77787c" stroke-width="1.6" stroke-linecap="round"/><path d="M8.5 44h5" stroke="#5a3a26" stroke-width="3" stroke-linecap="round"/></svg>`;

  function buildItems() {
    const n = Math.max(RAIL.length, Math.ceil((W + 3 * S) / S));
    if (items.length === n) { items.forEach(sizeItem); L = n * S; return; }
    itemsEl.innerHTML = "";
    items = [];
    for (let i = 0; i < n; i++) {
      const key = RAIL[i % RAIL.length];
      const p = PRODUCTS[key];
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `${HOOK}<div class="tag">$${p.price}</div><div class="garment"><div class="flip"><img alt="${p.name}" src="${p.side}"></div></div>`;
      itemsEl.appendChild(el);
      const it = { i, key, p, el, g: el.querySelector(".garment"), flip: el.querySelector(".flip"), img: el.querySelector("img"), spread: 0, front: false, anim: null };
      items.push(it);
      sizeItem(it);
      bindItem(it);
    }
    L = n * S;
  }
  function sizeItem(it) {
    it.g.style.height = H + "px";
    it.g.style.top = "28px";
  }

  // ── motion state ───────────────────────────────────────────
  let offset = 0, vel = 0, baseSpeed = reduce ? 0 : -24, hovered = null, paused = false, t0 = performance.now(), last = t0;
  let dragging = false, dragX = 0, dragMoved = 0, dragVel = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    const target = paused || hovered ? 0 : baseSpeed;
    if (!dragging) { vel += (target - vel) * Math.min(1, dt * (hovered ? 6 : 1.6)); offset += vel * dt; }

    const hx = hovered ? posOf(hovered) : null;
    const push = H * 0.42;
    for (const it of items) {
      const x0 = posOf(it);
      let want = 0;
      if (hovered && it !== hovered) {
        const d = x0 - hx;
        want = Math.sign(d) * push * Math.exp(-Math.abs(d) / (S * 3.2));
      }
      it.spread += (want - it.spread) * Math.min(1, dt * 9);
      const x = x0 + it.spread;
      const y = railY(x);
      const swing = reduce ? 0 : Math.sin(t * 1.15 + it.i * 1.7) * 0.7 - Math.max(-5, Math.min(5, vel * 0.05));
      it.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(it === hovered ? swing * 0.25 : swing).toFixed(3)}deg)`;
      it.el.style.zIndex = it === hovered ? 50 : 10 + (it.i % 3);
    }
    // progress indicator
    const frac = (((-offset % L) + L) % L) / L;
    $("#progressBar").style.transform = `translateX(${(frac * 66.67).toFixed(2)}%)`;
    requestAnimationFrame(frame);
  }
  const posOf = (it) => (((it.i * S + offset) % L) + L) % L - S * 1.2;

  // ── hover / turn ───────────────────────────────────────────
  function turn(it, toFront) {
    if (it.front === toFront) return;
    it.front = toFront;
    if (it.anim) it.anim.cancel();
    const src = toFront ? it.p.front : it.p.side;
    const big = toFront ? 1.14 : 1;
    if (reduce) { it.img.src = src; it.flip.style.transform = `scale(${big})`; return; }
    const from = getComputedStyle(it.flip).transform;
    const a = it.flip.animate([{ transform: from === "none" ? "scale(1)" : from }, { transform: `scaleX(0.04) scaleY(${(big + 1) / 2})` }], { duration: 150, easing: "cubic-bezier(.55,0,.8,.4)", fill: "forwards" });
    it.anim = a;
    a.onfinish = () => {
      if (it.anim !== a) return;
      it.img.src = src;
      const b = it.flip.animate([{ transform: `scaleX(0.04) scaleY(${(big + 1) / 2})` }, { transform: `scale(${big * 1.03})`, offset: 0.7 }, { transform: `scale(${big})` }], { duration: 380, easing: "cubic-bezier(.2,.9,.3,1)", fill: "forwards" });
      it.anim = b;
    };
  }

  function setHovered(it) {
    if (hovered === it) return;
    if (hovered) turn(hovered, false);
    hovered = it;
    if (it) { turn(it, true); showPicked(it.p); } else showPicked(null);
  }

  const picked = $("#picked");
  let pickTimer = 0;
  function showPicked(p) {
    picked.classList.add("swap");
    clearTimeout(pickTimer);
    pickTimer = setTimeout(() => {
      $("#hint").style.display = p ? "none" : "";
      $("#pName").textContent = p ? p.name : "";
      $("#pPrice").textContent = p ? money(p.price) : "";
      picked.classList.remove("swap");
    }, 160);
  }

  function bindItem(it) {
    if (!isTouch) {
      it.g.addEventListener("pointerenter", () => !dragging && setHovered(it));
      it.g.addEventListener("pointerleave", () => { if (hovered === it) setHovered(null); });
    }
    it.g.addEventListener("click", (e) => {
      if (dragMoved > 6) return;
      e.stopPropagation();
      if (isTouch && hovered !== it) { setHovered(it); return; } // first tap turns it
      openProduct(it.key, it.img, it.i % RAIL.length);
    });
  }
  zone.addEventListener("click", () => { if (isTouch) setHovered(null); });

  // ── drag / swipe the rail ──────────────────────────────────
  zone.addEventListener("pointerdown", (e) => {
    dragging = true; dragX = e.clientX; dragMoved = 0; dragVel = 0;
    zone.classList.add("dragging");
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragX; dragX = e.clientX;
    dragMoved += Math.abs(dx);
    if (dragMoved > 6 && hovered && !isTouch) setHovered(null);
    offset += dx; dragVel = dx * 60;
  });
  window.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false; zone.classList.remove("dragging");
    if (dragMoved > 6) vel = Math.max(-1400, Math.min(1400, dragVel));
    setTimeout(() => (dragMoved = 0), 0);
  });

  // ── product view ───────────────────────────────────────────
  const pv = $("#pv"), pvImg = $("#pvImg"), addBtn = $("#addBtn");
  let current = null, currentView = "front", size = "S";

  function openProduct(key, fromImg, idx) {
    const p = PRODUCTS[key];
    current = p; currentView = "front";
    paused = true;
    pvImg.src = p.front; pvImg.alt = p.name;
    $("#pvCount").textContent = String((idx ?? RAIL.indexOf(key)) + 1).padStart(2, "0") + " / " + String(RAIL.length).padStart(2, "0");
    $("#pvName").textContent = p.name;
    $("#pvPrice").textContent = money(p.price);
    $("#pvFootName").textContent = p.name;
    document.querySelectorAll(".pv-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.view === "front"));
    resetAdd();
    pv.classList.add("show");
    pv.classList.remove("ready");
    const go = () => {
      const to = pvImg.getBoundingClientRect();
      pv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: "ease-out" });
      const wire = pv.querySelector(".wire");
      wire.animate([{ opacity: 0, transform: "scaleY(0)" }, { opacity: 1, transform: "scaleY(1)" }], { duration: 500, delay: 380, easing: "cubic-bezier(.2,.9,.3,1)", fill: "backwards" }).ready.then(() => (wire.style.transformOrigin = "50% 0"));
      if (fromImg && !reduce) {
        const f = fromImg.getBoundingClientRect();
        const sx = f.height / to.height;
        const dx = f.left + f.width / 2 - (to.left + to.width / 2);
        const dy = f.top - to.top;
        pvImg.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx})`, transformOrigin: "50% 0" }, { transform: "none", transformOrigin: "50% 0" }], { duration: 720, easing: "cubic-bezier(.2,.8,.2,1)" });
        fromImg.style.visibility = "hidden";
        setTimeout(() => (fromImg.style.visibility = ""), 760);
      } else {
        pvImg.animate([{ opacity: 0, transform: "translateY(24px) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
      requestAnimationFrame(() => pv.classList.add("ready"));
    };
    if (pvImg.complete && pvImg.naturalHeight) go(); else pvImg.onload = () => { pvImg.onload = null; go(); };
  }

  function closeProduct(cb) {
    if (!pv.classList.contains("show")) { cb && cb(); return; }
    const a = pv.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-in" });
    pvImg.animate([{ transform: "none" }, { transform: "translateY(10px) scale(.97)" }], { duration: 300, easing: "ease-in" });
    a.onfinish = () => { pv.classList.remove("show", "ready"); paused = document.body.classList.contains("cart-open"); cb && cb(); };
    if (hovered) setHovered(null);
  }
  $("#pvClose").addEventListener("click", () => closeProduct());

  document.querySelectorAll(".pv-tabs button").forEach((b) => b.addEventListener("click", () => {
    if (!current || b.dataset.view === currentView) return;
    currentView = b.dataset.view;
    document.querySelectorAll(".pv-tabs button").forEach((x) => x.classList.toggle("on", x === b));
    const a = pvImg.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0.02)" }], { duration: 170, easing: "cubic-bezier(.55,0,.8,.4)" });
    a.onfinish = () => { pvImg.src = current[currentView]; pvImg.animate([{ transform: "scaleX(0.02)" }, { transform: "scaleX(1)" }], { duration: 320, easing: "cubic-bezier(.2,.9,.3,1)" }); };
  }));

  $("#sizes").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    size = b.textContent.trim();
    document.querySelectorAll("#sizes button").forEach((x) => x.classList.toggle("on", x === b));
  });

  function resetAdd() {
    addBtn.classList.remove("loading", "done");
    $("#addLabel").textContent = "Add to cart";
    $("#viewCart").classList.remove("show");
  }

  addBtn.addEventListener("click", () => {
    if (!current || addBtn.classList.contains("loading")) return;
    const p = current, s = size;
    addBtn.classList.add("loading");
    setTimeout(() => {
      addBtn.classList.remove("loading");
      addBtn.classList.add("done");
      $("#addLabel").textContent = "Added to cart";
      $("#viewCart").classList.add("show");
      flyToBag(p, () => {
        addLine(p, s);
        setTimeout(() => closeProduct(() => openCart()), 650);
      });
    }, 900);
  });
  $("#viewCart").addEventListener("click", (e) => { e.preventDefault(); closeProduct(() => openCart()); });

  function flyToBag(p, done) {
    const from = pvImg.getBoundingClientRect();
    const bag = $("#bagBtn").getBoundingClientRect();
    const fl = document.createElement("img");
    fl.className = "flyer"; fl.src = p.front;
    const h0 = Math.min(from.height * 0.45, 260);
    const w0 = h0 * (pvImg.naturalWidth / pvImg.naturalHeight || 0.72);
    Object.assign(fl.style, { left: from.left + from.width / 2 - w0 / 2 + "px", top: from.top + from.height * 0.25 + "px", width: w0 + "px", height: h0 + "px" });
    document.body.appendChild(fl);
    const ex = bag.left + bag.width / 2 - (from.left + from.width / 2);
    const ey = bag.top + bag.height / 2 - (from.top + from.height * 0.25 + h0 / 2);
    const k = 26 / h0;
    const a = fl.animate([
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${ex * 0.55}px, ${ey * 0.35 - 80}px) scale(${(1 + k) / 2.2}) rotate(-8deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${ex}px, ${ey}px) scale(${k}) rotate(0deg)`, opacity: 0.85 },
    ], { duration: reduce ? 1 : 820, easing: "cubic-bezier(.45,.05,.35,1)" });
    a.onfinish = () => { fl.remove(); done(); };
  }

  // ── cart ───────────────────────────────────────────────────
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("layr-cart") || "[]").filter((l) => PRODUCTS[l.id]); } catch (e) { cart = []; }
  const save = () => { try { localStorage.setItem("layr-cart", JSON.stringify(cart)); } catch (e) { /* storage unavailable */ } };

  function addLine(p, s) {
    const l = cart.find((x) => x.id === p.id && x.size === s);
    if (l) l.qty++; else cart.unshift({ id: p.id, size: s, qty: 1 });
    save(); renderCart(true);
  }

  function renderCart(bump) {
    const count = cart.reduce((n, l) => n + l.qty, 0);
    const badge = $("#badge");
    badge.textContent = count;
    badge.style.display = count ? "" : "none";
    if (bump) { badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump"); }
    $("#dCount").textContent = count;
    const list = $("#dList");
    if (!cart.length) list.innerHTML = `<div class="d-empty">Your cart is empty.</div>`;
    else list.innerHTML = cart.map((l, i) => {
      const p = PRODUCTS[l.id];
      return `<div class="line" data-i="${i}"><img src="${p.front}" alt=""><div><div class="l-name">${p.name}</div><div class="l-meta">${l.size}<br>${money(p.price)}</div>
        <div class="l-ctrl"><div class="stepper"><button data-act="dec" aria-label="Decrease">−</button><span>${l.qty}</span><button data-act="inc" aria-label="Increase">+</button></div>
        <button class="trash" data-act="del" aria-label="Remove"><svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 1.5h5l.5 1.5H14v1.6H2V3h3zM3.3 5.6h9.4l-.7 8.9H4z"/></svg></button></div></div>
        <div class="l-total">${money(p.price * l.qty)}</div></div>`;
    }).join("");
    $("#dTotal").textContent = money(cart.reduce((n, l) => n + PRODUCTS[l.id].price * l.qty, 0)) + " USD";
  }
  $("#dList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const i = +b.closest(".line").dataset.i, l = cart[i];
    if (b.dataset.act === "inc") l.qty++;
    if (b.dataset.act === "dec") l.qty = Math.max(1, l.qty - 1);
    if (b.dataset.act === "del") cart.splice(i, 1);
    save(); renderCart(false);
  });

  function openCart() { document.body.classList.add("cart-open"); paused = true; }
  function closeCart() { document.body.classList.remove("cart-open"); paused = pv.classList.contains("show"); }
  $("#bagBtn").addEventListener("click", () => (document.body.classList.contains("cart-open") ? closeCart() : openCart()));
  $("#dClose").addEventListener("click", closeCart);
  $("#discToggle").addEventListener("click", () => {
    const open = $("#discBox").classList.toggle("show");
    $("#discToggle").textContent = open ? "−" : "+";
  });
  $("#discBox").addEventListener("submit", (e) => { e.preventDefault(); $("#discNote").classList.add("show"); });
  $("#checkout").addEventListener("click", () => $("#coNote").classList.add("show"));

  // ── search ─────────────────────────────────────────────────
  const search = $("#search"), sInput = $("#searchInput"), sRes = $("#searchResults");
  function runSearch() {
    const q = sInput.value.trim().toLowerCase();
    const hits = Object.values(PRODUCTS).filter((p) => !q || p.name.toLowerCase().includes(q) || p.id.includes(q));
    sRes.innerHTML = hits.length
      ? hits.map((p) => `<button data-k="${p.id}"><img src="${p.front}" alt="">${p.name}<span style="margin-left:auto;color:#707072">${money(p.price)}</span></button>`).join("")
      : `<div class="empty">No pieces match “${sInput.value.replace(/[<>&]/g, "")}”.</div>`;
    sRes.classList.add("show");
  }
  sInput.addEventListener("focus", () => { search.classList.add("open"); runSearch(); });
  sInput.addEventListener("input", runSearch);
  sInput.addEventListener("blur", () => setTimeout(() => { search.classList.remove("open"); sRes.classList.remove("show"); }, 180));
  sRes.addEventListener("mousedown", (e) => {
    const b = e.target.closest("button[data-k]"); if (!b) return;
    e.preventDefault(); sInput.blur(); sInput.value = "";
    openProduct(b.dataset.k, null);
  });

  // ── mobile menu (also hosts search on phones) ───────────────
  const sheet = $("#sheet");
  const mWrap = document.createElement("div");
  mWrap.innerHTML = `<input id="mInput" placeholder="Search" style="width:100%;height:44px;border-radius:999px;border:0;background:#f5f5f5;padding:0 18px;font:inherit;font-size:16px;margin:6px 0 10px"><div id="mRes"></div>`;
  sheet.insertBefore(mWrap, sheet.children[1]);
  const mInput = mWrap.querySelector("#mInput"), mRes = mWrap.querySelector("#mRes");
  mInput.addEventListener("input", () => {
    const q = mInput.value.trim().toLowerCase();
    mRes.innerHTML = q ? Object.values(PRODUCTS).filter((p) => p.name.toLowerCase().includes(q)).map((p) =>
      `<button data-k="${p.id}" style="display:flex;align-items:center;gap:12px;width:100%;padding:8px 0;font-size:16px;font-weight:500"><img src="${p.front}" alt="" style="width:34px;height:44px;object-fit:contain">${p.name}</button>`).join("") : "";
  });
  mRes.addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; document.body.classList.remove("menu-open"); openProduct(b.dataset.k, null); });
  $("#menuBtn").addEventListener("click", () => document.body.classList.add("menu-open"));
  $("#mSearch").addEventListener("click", () => { document.body.classList.add("menu-open"); setTimeout(() => mInput.focus(), 350); });
  $("#sheetClose").addEventListener("click", () => document.body.classList.remove("menu-open"));

  // ── scenes: studio (white) / outdoor (mountain) ─────────────
  function buildScene() {
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const trees = (y0, hMin, hMax, color, step) => {
      let d = "", x = -40;
      while (x < 1680) {
        const w = step * (0.7 + rnd() * 0.6), h = hMin + rnd() * (hMax - hMin), y = y0 + rnd() * 10;
        d += `M${x.toFixed(1)} ${y.toFixed(1)} L${(x + w / 2).toFixed(1)} ${(y - h).toFixed(1)} L${(x + w).toFixed(1)} ${y.toFixed(1)} Z `;
        x += w * 0.55;
      }
      return `<path d="${d}" fill="${color}"/>`;
    };
    $("#scene").innerHTML = `<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d92ab"/><stop offset="0.38" stop-color="#a9b7c6"/><stop offset="0.55" stop-color="#cdd5dc"/></linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b9a3c"/><stop offset="0.3" stop-color="#3f8a29"/><stop offset="0.7" stop-color="#2e7820"/><stop offset="1" stop-color="#1d5a16"/></linearGradient>
        <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8edf1" stop-opacity="0"/><stop offset="0.5" stop-color="#e8edf1" stop-opacity="0.55"/><stop offset="1" stop-color="#e8edf1" stop-opacity="0"/></linearGradient>
        <radialGradient id="vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></radialGradient>
        <filter id="b6"><feGaussianBlur stdDeviation="6"/></filter><filter id="b3"><feGaussianBlur stdDeviation="3"/></filter><filter id="b2"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <rect width="1600" height="1000" fill="url(#sky)"/>
      <g filter="url(#b6)" opacity="0.28"><ellipse cx="300" cy="150" rx="320" ry="60" fill="#eef2f5"/><ellipse cx="1200" cy="110" rx="380" ry="70" fill="#e4e9ee"/><ellipse cx="800" cy="260" rx="500" ry="50" fill="#dfe5ea"/></g>
      <path filter="url(#b3)" fill="#6d829c" d="M0 470 L120 400 L210 430 L330 330 L430 400 L520 360 L640 290 L760 380 L860 340 L980 400 L1100 310 L1230 380 L1340 330 L1460 400 L1600 360 L1600 560 L0 560Z"/>
      <path filter="url(#b3)" fill="#566c86" d="M0 520 L150 450 L260 480 L400 410 L520 470 L700 420 L820 470 L950 430 L1080 480 L1220 420 L1380 470 L1500 440 L1600 470 L1600 600 L0 600Z"/>
      <rect y="470" width="1600" height="160" fill="url(#mist)"/>
      <g filter="url(#b2)">${trees(640, 50, 110, "#2a4233", 26)}${trees(668, 40, 90, "#1b3024", 22)}</g>
      <path fill="url(#grass)" d="M0 650 Q400 630 800 655 T1600 640 L1600 1000 L0 1000Z"/>
      <g filter="url(#b6)" opacity="0.35"><ellipse cx="420" cy="760" rx="380" ry="40" fill="#8fd062"/><ellipse cx="1180" cy="820" rx="420" ry="50" fill="#7cc252"/></g>
      <path filter="url(#b2)" fill="#c9ccb9" opacity="0.85" d="M1180 652 C1230 700 1190 740 1260 790 C1330 840 1300 900 1380 1000 L1330 1000 C1270 910 1290 850 1225 800 C1160 750 1200 705 1165 655Z"/>
      <rect width="1600" height="1000" fill="url(#vig)"/>
    </svg>`;
  }

  function setScene(outdoor) {
    document.body.classList.toggle("outdoor", outdoor);
    if (outdoor && !$("#scene").firstChild) buildScene();
  }
  const toggleScene = (e) => {
    e.preventDefault();
    const out = !document.body.classList.contains("outdoor");
    setScene(out);
    try { history.replaceState(null, "", out ? "#outdoor" : "#studio"); } catch (err) { location.hash = out ? "outdoor" : "studio"; }
    document.body.classList.remove("menu-open");
  };
  $("#sceneLink").addEventListener("click", toggleScene);
  $("#sheetScene").addEventListener("click", toggleScene);
  window.addEventListener("hashchange", () => setScene(location.hash === "#outdoor"));
  setScene(location.hash === "#outdoor");

  // ── global keys ────────────────────────────────────────────
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (pv.classList.contains("show")) closeProduct();
    else if (document.body.classList.contains("cart-open")) closeCart();
    else document.body.classList.remove("menu-open");
  });
  document.querySelectorAll('a[href="#"]').forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));

  if (isTouch) $("#hint").textContent = "Tap a piece to turn it · tap again to look closer";

  // ── boot ───────────────────────────────────────────────────
  new ResizeObserver(layout).observe(stage);
  layout();
  renderCart(false);
  requestAnimationFrame(frame);
})();
