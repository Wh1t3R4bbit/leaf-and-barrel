// app.js — Leaf & Barrel (JSON-backed PoC)
const root = document.getElementById("app-root");

const DATA_PATHS = {
  cigars: "/data/cigars.json",
  whiskeys: "/data/whiskey.json",
  rums: "/data/rum.json",
  wines: "/data/wine.json",
};

const state = {
  data: { cigars: [], whiskeys: [], rums: [], wines: [] },
  loading: true,
  error: null,

  // Database UI state
  db: {
    query: "",
    strength: new Set(),
    wrapper: new Set(),
    shape: new Set(),
    origin: new Set(),
    tags: new Set(),
    selectedId: null,
  },
};

// -------------------- Router --------------------
const routes = {
  home: renderHome,
  database: renderDatabase,
  pairings: renderPairings,
  learn: renderLearn,
  "learn/anatomy": renderLearnAnatomy,
  "learn/wrappers": renderLearnWrappers,
  "learn/shapes": renderLearnShapes,
};

function viewFromHash() {
  const h = location.hash || "#/";
  const m = h.match(/^#\/(.*)$/);
  const view = (m && m[1]) ? m[1] : "";
  return view === "" ? "home" : (routes[view] ? view : "home");
}

function setActiveNav(view) {
  const top = view.includes("/") ? view.split("/")[0] : view;
  document.querySelectorAll(".nav-link").forEach((a) => {
    const active = a.dataset.view === top;
    a.classList.toggle("text-brand-text", active);
    a.classList.toggle("text-brand-muted", !active);
  });
}

function navigate(view) {
  location.hash = view === "home" ? "#/" : `#/${view}`;
}

window.addEventListener("hashchange", () => appRender());
window.addEventListener("DOMContentLoaded", () => init());

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

// -------------------- Data Loading --------------------
async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return res.json();
}

async function init() {
  try {
    state.loading = true;
    state.error = null;

    const [cigars, whiskeys, rums, wines] = await Promise.all([
      fetchJson(DATA_PATHS.cigars),
      fetchJson(DATA_PATHS.whiskeys),
      fetchJson(DATA_PATHS.rums),
      fetchJson(DATA_PATHS.wines),
    ]);

    state.data.cigars = (cigars.cigars || []).filter(x => x && x.active !== false);
    state.data.whiskeys = (whiskeys.whiskeys || []).filter(x => x && x.active !== false);
    state.data.rums = (rums.rums || []).filter(x => x && x.active !== false);
    state.data.wines = (wines.wines || []).filter(x => x && x.active !== false);

    state.loading = false;
    appRender();

  } catch (e) {
    state.loading = false;
    state.error = e?.message || String(e);
    appRender();
  }

  // Top nav search button -> database
  const openSearch = document.getElementById("open-search");
  if (openSearch) openSearch.addEventListener("click", () => navigate("database"));
}

function appRender() {
  const view = viewFromHash();
  setActiveNav(view);

  if (state.loading) {
    root.innerHTML = shell({
      title: "Loading…",
      subtitle: "Fetching JSON data from /data",
      content: loadingBlock(),
    });
    refreshIcons();
    return;
  }

  if (state.error) {
    root.innerHTML = shell({
      title: "Data Load Error",
      subtitle: "Your site is running, but the JSON files didn’t load.",
      content: errorBlock(state.error),
    });
    refreshIcons();
    return;
  }

  routes[view]();
  refreshIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// -------------------- Layout helpers --------------------
function shell({ title, subtitle, content }) {
  return `
    <section class="max-w-7xl mx-auto px-6 pt-12 lb-fade-in">
      <header class="mb-10">
        <h1 class="font-serif text-4xl md:text-5xl">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="mt-3 text-brand-muted max-w-2xl">${escapeHtml(subtitle)}</p>` : ""}
      </header>
      ${content}
    </section>
  `;
}

function loadingBlock() {
  return `
    <div class="lb-card p-6">
      <div class="flex items-center gap-3 text-brand-muted">
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
        <span>Loading data…</span>
      </div>
      <p class="mt-4 text-sm text-brand-muted">
        Expected files:
        <span class="lb-code">/data/cigars.json</span>,
        <span class="lb-code">/data/whiskey.json</span>,
        <span class="lb-code">/data/rum.json</span>,
        <span class="lb-code">/data/wine.json</span>
      </p>
    </div>
  `;
}

function errorBlock(msg) {
  return `
    <div class="lb-card p-6">
      <p class="text-brand-danger font-medium">Error:</p>
      <p class="mt-2 text-sm text-brand-muted lb-code">${escapeHtml(msg)}</p>

      <div class="mt-6 text-sm text-brand-muted">
        <p class="font-medium text-brand-text mb-2">Fix checklist:</p>
        <ol class="list-decimal ml-5 space-y-1">
          <li>Ensure the JSON files are in <span class="lb-code">/data</span> at repo root</li>
          <li>Names must match exactly: <span class="lb-code">cigars.json</span>, <span class="lb-code">whiskey.json</span>, <span class="lb-code">rum.json</span>, <span class="lb-code">wine.json</span></li>
          <li>JSON must be valid (no missing commas)</li>
        </ol>
      </div>
    </div>
  `;
}

function card(title, subtitle, bodyHtml) {
  return `
    <div class="lb-card p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-medium">${escapeHtml(title)}</h3>
          ${subtitle ? `<p class="text-sm text-brand-muted mt-1">${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      ${bodyHtml ? `<div class="mt-4">${bodyHtml}</div>` : ""}
    </div>
  `;
}

function chip(text) {
  return `<span class="lb-chip">${escapeHtml(text)}</span>`;
}

function badge(text) {
  return `<span class="lb-badge">${escapeHtml(text)}</span>`;
}

function imgBox(src, alt) {
  // Placeholder: uses image if user later adds it; otherwise shows fallback.
  const safeAlt = escapeHtml(alt || "Image");
  const safeSrc = src ? escapeAttr(src) : "";
  return `
    <div class="rounded-2xl border border-brand-border bg-brand-bg overflow-hidden aspect-[4/3] flex items-center justify-center">
      ${safeSrc ? `<img src="${safeSrc}" alt="${safeAlt}" class="w-full h-full object-cover" onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;text-brand-muted text-sm&quot;>Image placeholder</div>';">`
                : `<div class="text-brand-muted text-sm">Image placeholder</div>`}
    </div>
  `;
}

// -------------------- Pages --------------------
function renderHome() {
  root.innerHTML = `
    <section class="max-w-7xl mx-auto px-6 pt-12 lb-fade-in">
      <div class="lb-hero rounded-3xl p-8 md:p-12">
        <p class="text-brand-muted text-sm tracking-wide uppercase">Leaf & Barrel</p>
        <h1 class="font-serif text-4xl md:text-6xl mt-3">
          Find the flavor. Log the ritual.
        </h1>
        <p class="text-brand-muted mt-4 max-w-2xl">
          A PoC cigar database powered by JSON — built for tasting notes, specs, and pairing logic.
        </p>

        <div class="mt-8 flex flex-col md:flex-row gap-3">
          <input id="home-q"
            class="w-full bg-brand-bg border border-brand-border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-brand-gold/60"
            placeholder="Search cigars, brands, wrappers, tasting notes…"
          />
          <button id="home-go"
            class="px-6 py-4 rounded-2xl bg-brand-gold text-brand-bg text-sm font-semibold hover:bg-brand-gold/90 transition-colors">
            Explore
          </button>
        </div>

        <div class="mt-6 flex flex-wrap gap-2">
          ${["Wrapper", "Strength", "Shape", "Origin", "Tasting Notes", "Pairings"].map(chip).join("")}
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-6 mt-10">
        ${card("Database", "Browse cigars from /data/cigars.json", `<a class="text-sm text-brand-gold hover:underline" href="#/database">Open →</a>`)}
        ${card("Pairings", "Whiskey, rum & wine datasets loaded from JSON", `<a class="text-sm text-brand-gold hover:underline" href="#/pairings">Open →</a>`)}
        ${card("Learn", "A clean knowledge hub you can expand over time", `<a class="text-sm text-brand-gold hover:underline" href="#/learn">Open →</a>`)}
      </div>
    </section>
  `;

  document.getElementById("home-go").addEventListener("click", () => {
    state.db.query = (document.getElementById("home-q").value || "").trim();
    navigate("database");
  });
}

function renderDatabase() {
  const all = state.data.cigars.slice();

  // Build filter options from data
  const strengths = unique(all.map(c => c.strength).filter(Boolean));
  const wrappers = unique(all.map(c => c.wrapper).filter(Boolean));
  const shapes = unique(all.map(c => c.shape).filter(Boolean));
  const origins = unique(all.map(c => c.origin).filter(Boolean));

  // Apply filters
  const filtered = all.filter((c) => {
    if (state.db.query) {
      const q = state.db.query.toLowerCase();
      const hay = [
        c.name, c.origin, c.factory, c.wrapper, c.binder,
        ...(c.filler || []),
        ...(c.tags || []),
        ...(c.flavor_notes || []),
        ...(c.smell_notes || [])
      ].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (state.db.strength.size && !state.db.strength.has(c.strength)) return false;
    if (state.db.wrapper.size && !state.db.wrapper.has(c.wrapper)) return false;
    if (state.db.shape.size && !state.db.shape.has(c.shape)) return false;
    if (state.db.origin.size && !state.db.origin.has(c.origin)) return false;
    return true;
  });

  root.innerHTML = shell({
    title: "Database",
    subtitle: `Showing ${filtered.length} of ${all.length} cigars`,
    content: `
      <div class="grid lg:grid-cols-12 gap-6">
        <aside class="lg:col-span-3 lb-card p-5 h-fit sticky top-24">
          <div class="flex items-center justify-between">
            <h2 class="font-medium">Filters</h2>
            <button id="reset-filters" class="text-xs text-brand-muted hover:text-brand-text">Reset</button>
          </div>

          <div class="mt-4">
            <label class="text-xs text-brand-muted">Search</label>
            <input id="db-q"
              class="mt-2 w-full bg-brand-bg border border-brand-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-brand-gold/60"
              placeholder="Name, wrapper, notes…"
              value="${escapeAttr(state.db.query)}"
            />
          </div>

          ${filterBlock("Strength", "strength", strengths)}
          ${filterBlock("Wrapper", "wrapper", wrappers)}
          ${filterBlock("Shape", "shape", shapes)}
          ${filterBlock("Origin", "origin", origins)}
        </aside>

        <section class="lg:col-span-9">
          <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${filtered.map(cigarCard).join("") || `<div class="text-brand-muted">No matches.</div>`}
          </div>
        </section>
      </div>
    `,
  });

  // Wire events
  document.getElementById("db-q").addEventListener("input", (e) => {
    state.db.query = e.target.value;
    renderDatabase(); refreshIcons();
  });

  document.getElementById("reset-filters").addEventListener("click", () => {
    state.db.query = "";
    state.db.strength.clear();
    state.db.wrapper.clear();
    state.db.shape.clear();
    state.db.origin.clear();
    renderDatabase(); refreshIcons();
  });

  root.querySelectorAll("input[data-filter]").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const key = e.target.dataset.filter;
      const val = e.target.value;
      const set = state.db[key];
      if (e.target.checked) set.add(val);
      else set.delete(val);
      renderDatabase(); refreshIcons();
    });
  });

  root.querySelectorAll("[data-cigar-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.db.selectedId = btn.dataset.cigarId;
      renderCigarDetail();
      refreshIcons();
    });
  });
}

function renderCigarDetail() {
  const c = state.data.cigars.find(x => x.id === state.db.selectedId);
  if (!c) return navigate("database");

  const size = c.size ? `${c.size.length_in}" × ${c.size.ring_gauge}` : "—";
  const filler = (c.filler || []).join(", ") || "—";
  const notes = (c.flavor_notes || c.smell_notes || []).slice(0, 10);

  root.innerHTML = shell({
    title: c.name,
    subtitle: `${c.origin || "—"} • ${c.shape || "—"} • ${c.strength || "—"}`,
    content: `
      <div class="grid lg:grid-cols-12 gap-6">
        <div class="lg:col-span-5 lb-card p-6">
          ${imgBox(c.image, c.name)}
          <div class="mt-4 flex flex-wrap gap-2">
            ${c.wrapper ? badge(c.wrapper) : ""}
            ${c.shape ? badge(c.shape) : ""}
            ${c.strength ? badge(c.strength) : ""}
          </div>

          <div class="mt-6 grid grid-cols-2 gap-3 text-sm">
            ${spec("Size", size)}
            ${spec("Factory", c.factory || "—")}
            ${spec("Binder", c.binder || "—")}
            ${spec("Filler", filler)}
          </div>

          <div class="mt-6">
            <button id="back-db" class="text-sm text-brand-gold hover:underline">← Back to Database</button>
          </div>
        </div>

        <div class="lg:col-span-7 space-y-6">
          <div class="lb-card p-6">
            <h3 class="font-medium">Description</h3>
            <p class="text-sm text-brand-muted mt-3">${escapeHtml(c.description || "—")}</p>
          </div>

          <div class="lb-card p-6">
            <h3 class="font-medium">Tasting notes</h3>
            <div class="mt-3 flex flex-wrap gap-2">
              ${notes.length ? notes.map(chip).join("") : `<span class="text-sm text-brand-muted">—</span>`}
            </div>
          </div>

          <div class="lb-card p-6">
            <h3 class="font-medium">Pairing ideas (from cigar JSON)</h3>
            <div class="mt-3 grid md:grid-cols-2 gap-3 text-sm">
              ${pairList("Wine", c.pairing?.wine)}
              ${pairList("Whiskey", c.pairing?.whiskey)}
              ${pairList("Rum", c.pairing?.rum)}
              ${pairList("Coffee", c.pairing?.coffee)}
            </div>
          </div>
        </div>
      </div>
    `,
  });

  document.getElementById("back-db").addEventListener("click", () => {
    state.db.selectedId = null;
    navigate("database");
  });
}

function renderPairings() {
  const whiskeys = state.data.whiskeys;
  const rums = state.data.rums;
  const wines = state.data.wines;

  root.innerHTML = shell({
    title: "Pairings",
    subtitle: "PoC pairing library (loaded from DB). #Images will be added later.",
    content: `
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lb-card p-6">
          <div class="flex items-center gap-3">
            <i data-lucide="glass-whiskey" class="w-5 h-5 text-brand-gold"></i>
            <h3 class="font-medium">Whiskey</h3>
          </div>
          <div class="mt-4 space-y-3">
            ${whiskeys.map(x => pairingItem(x.name, x.description, x.image)).join("")}
          </div>
        </div>

        <div class="lb-card p-6">
          <div class="flex items-center gap-3">
            <i data-lucide="flame" class="w-5 h-5 text-brand-gold"></i>
            <h3 class="font-medium">Rum</h3>
          </div>
          <div class="mt-4 space-y-3">
            ${rums.map(x => pairingItem(x.name, x.description, x.image)).join("")}
          </div>
        </div>

        <div class="lb-card p-6">
          <div class="flex items-center gap-3">
            <i data-lucide="wine" class="w-5 h-5 text-brand-gold"></i>
            <h3 class="font-medium">Wine</h3>
          </div>
          <div class="mt-4 space-y-3">
            ${wines.map(x => pairingItem(x.name, x.description, x.image)).join("")}
          </div>
        </div>
      </div>
    `,
  });
}

function renderLearn() {
  root.innerHTML = shell({
    title: "Learn About Cigars",
    subtitle: "A clean knowledge hub you can expand into a full cigar encyclopedia.",
    content: `
      <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        ${learnCard("Cigar Anatomy", "Understand wrapper, binder and filler", "#/learn/anatomy", "layers")}
        ${learnCard("Wrapper Types", "Explore Connecticut, Habano, Maduro", "#/learn/wrappers", "leaf")}
        ${learnCard("Shapes & Sizes", "Robusto, Toro, Churchill explained", "#/learn/shapes", "ruler")}
        ${learnCard("Strength & Flavor", "How body and nicotine differ", "#/learn/strength", "flame")}
        ${learnCard("How Cigars Are Made", "From seed to humidor", "#/learn/making", "factory")}
      </div>

      <div class="mt-10 lb-card p-6 max-w-3xl">
        <p class="text-sm text-brand-muted">
          Right now this is a PoC: Anatomy + Wrapper Types are live. The rest can be added whenever you’re ready.
        </p>
      </div>
    `,
  });
}

//--------New developed Learn Anartomy Section
function renderLearnAnatomy() {
  root.innerHTML = shell({
    title: "Cigar Anatomy",
    subtitle: "A practical breakdown of what a cigar is made of — and why each part changes the smoke.",
    content: `
      <div class="max-w-4xl space-y-6">

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">At a glance</h2>
          <p class="text-sm text-brand-muted mt-3">
            Every premium cigar is built from three core tobacco components —
            <span class="text-brand-text">wrapper</span>, <span class="text-brand-text">binder</span>, and <span class="text-brand-text">filler</span>.
            On top of that, the cigar has physical features (cap, head, foot, seam) that influence the
            <span class="text-brand-text">draw</span>, <span class="text-brand-text">burn</span>, and overall experience.
          </p>

          <div class="mt-4 grid md:grid-cols-3 gap-3 text-sm">
            ${learnFact("Wrapper", "Flavor & aroma influence, burn quality, appearance")}
            ${learnFact("Binder", "Structure, burn stability, supports the blend")}
            ${learnFact("Filler", "Strength, complexity, core flavor profile")}
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Simple anatomy map</h2>
          <p class="text-sm text-brand-muted mt-3">
            (Text diagram for now — you can swap in an image later.)
          </p>

          <div class="mt-4 rounded-2xl border border-brand-border bg-brand-bg p-5 text-sm text-brand-muted leading-relaxed">
            <div class="font-medium text-brand-text">Head / Cap</div>
            <div>• Where you cut. Cap is the small “patch” leaf that seals the wrapper.</div>
            <div class="mt-3 font-medium text-brand-text">Body</div>
            <div>• The main length of the cigar. Wrapper + binder around the filler.</div>
            <div class="mt-3 font-medium text-brand-text">Foot</div>
            <div>• The open end you light. Exposes filler directly at first light.</div>
            <div class="mt-3 font-medium text-brand-text">Seam</div>
            <div>• The spiral line where the wrapper overlaps.</div>
            <div class="mt-3 font-medium text-brand-text">Shoulder</div>
            <div>• The curved area under the cap near the head (important for clean cuts).</div>
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Wrapper</h2>
          <p class="text-sm text-brand-muted mt-3">
            The wrapper is the outermost leaf. It’s selected for appearance, elasticity, and burn quality —
            but it also plays a major role in aroma and perceived flavor.
          </p>

          <div class="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            ${learnBulletBox("What it influences", [
              "Aroma (especially on the cold draw and first third)",
              "Burn evenness and ash integrity",
              "Sweetness/spice notes depending on fermentation and leaf type"
            ])}
            ${learnBulletBox("Common misconceptions", [
              "Dark wrapper does not automatically mean stronger nicotine",
              "Light wrapper doesn’t always mean “no flavor”",
              "Color is affected by fermentation/aging, not just strength"
            ])}
          </div>

          <div class="mt-4 rounded-2xl border border-brand-border bg-brand-bg p-4 text-sm text-brand-muted">
            <span class="text-brand-text font-medium">Pro tip:</span>
            If the wrapper feels overly dry or has many cracks/tears, the cigar may burn hot or uneven.
            If it feels slightly oily and supple, it often burns slower and smoother.
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Binder</h2>
          <p class="text-sm text-brand-muted mt-3">
            The binder leaf sits underneath the wrapper and holds the filler together.
            Most of the time it plays a supporting role, but a strong binder can absolutely add spice or earthiness.
          </p>

          <div class="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            ${learnBulletBox("Why it matters", [
              "Helps control burn rate",
              "Adds structural integrity (prevents unraveling)",
              "Can contribute secondary flavor (often earth/spice)"
            ])}
            ${learnBulletBox("What to look for", [
              "If a cigar tunnels/canoes a lot, the binder/filler combustion may be uneven",
              "If the cigar feels soft and airy, the bunching (filler + binder) may be loose",
              "If it feels rock hard, draw may be tight"
            ])}
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Filler</h2>
          <p class="text-sm text-brand-muted mt-3">
            The filler is the internal blend — the main driver of strength, complexity, and how flavors evolve through the thirds.
            Premium cigars often use <span class="text-brand-text">long filler</span> (whole leaves),
            while budget cigars may use <span class="text-brand-text">short filler</span> (chopped tobacco).
          </p>

          <div class="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            ${learnBulletBox("Long filler vs short filler", [
              "Long filler: better airflow, more consistent burn, more complexity",
              "Short filler: can burn faster, may taste flatter, more prone to bitterness if overheated",
              "Hand-rolled long filler is typical for premium cigars"
            ])}
            ${learnBulletBox("Strength & complexity", [
              "Nicotine impact is mostly filler-driven",
              "Blending different origins creates layered flavors",
              "Aging reduces harshness and adds smoothness"
            ])}
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Cap, head, foot, and your cut</h2>
          <p class="text-sm text-brand-muted mt-3">
            The cut affects draw more than most people realize. Too shallow and it’s tight; too aggressive and the wrapper can unravel.
          </p>

          <div class="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            ${learnBulletBox("Cap & shoulder", [
              "Cap is the small piece that seals the wrapper at the head",
              "Shoulder is the curved portion below the cap",
              "Cut just above the shoulder for a clean draw"
            ])}
            ${learnBulletBox("Foot", [
              "Foot exposes filler directly — first light can be stronger/peppery",
              "Toasting slowly reduces harshness",
              "If it tastes bitter early, slow down and avoid overheating"
            ])}
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Quick glossary</h2>
          <div class="mt-4 grid md:grid-cols-2 gap-3 text-sm">
            ${learnGloss("Draw", "How easily air moves through the cigar when you puff.")}
            ${learnGloss("Burn line", "The ring where the cigar is actively combusting.")}
            ${learnGloss("Canoeing", "One side burns faster than the other (often from wind or uneven combustion).")}
            ${learnGloss("Tunneling", "Center burns faster than the wrapper (can be humidity or construction).")}
            ${learnGloss("Bunch", "The filler leaves bundled together before binder/wrapper are applied.")}
            ${learnGloss("Retrohale", "Letting smoke exit through the nose for extra aroma perception.")}
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">What to notice while smoking</h2>
          <div class="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            ${learnBulletBox("Construction checks", [
              "Even burn line (minor waves are normal)",
              "Consistent draw (not too tight, not too open)",
              "Smoke output feels steady, not thin or hot"
            ])}
            ${learnBulletBox("Taste checks", [
              "First third often shows wrapper + toasted filler",
              "Second third is where the blend usually “settles”",
              "Final third can intensify — slow down to avoid bitterness"
            ])}
          </div>

          <div class="mt-4 flex flex-wrap gap-3">
            <a href="#/learn" class="text-sm text-brand-gold hover:underline">← Back to Learn</a>
            <span class="text-brand-muted text-sm">•</span>
            <a href="#/database" class="text-sm text-brand-gold hover:underline">Explore cigars in the Database →</a>
          </div>
        </div>

      </div>
    `,
  });
}

// ---- small helpers used by the anatomy page ----
function learnFact(title, desc) {
  return `
    <div class="rounded-2xl border border-brand-border bg-brand-bg p-4">
      <div class="text-sm font-medium text-brand-text">${escapeHtml(title)}</div>
      <div class="mt-1 text-xs text-brand-muted">${escapeHtml(desc)}</div>
    </div>
  `;
}

function learnBulletBox(title, bullets) {
  return `
    <div class="rounded-2xl border border-brand-border bg-brand-bg p-4">
      <div class="text-sm font-medium text-brand-text">${escapeHtml(title)}</div>
      <ul class="mt-2 space-y-1 text-xs text-brand-muted">
        ${bullets.map(b => `<li>• ${escapeHtml(b)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function learnGloss(term, definition) {
  return `
    <div class="rounded-2xl border border-brand-border bg-brand-bg p-4">
      <div class="text-sm font-medium text-brand-text">${escapeHtml(term)}</div>
      <div class="mt-1 text-xs text-brand-muted">${escapeHtml(definition)}</div>
    </div>
  `;
}
//------------END of Learn Anatomy---------


//---------New Learn Wrapper Section-------------------------------
function wrapperProfile({ name, vibe, notes, body, bestFor }) {
  return `
    <div class="rounded-2xl border border-brand-border bg-brand-bg p-5">
      
      <div class="flex justify-between items-start">
        <div>
          <div class="text-sm font-medium text-brand-text">${escapeHtml(name)}</div>
          <div class="text-xs text-brand-muted mt-1">${escapeHtml(vibe)}</div>
        </div>

        <div class="text-xs border border-brand-border px-2 py-1 rounded-full text-brand-muted">
          ${escapeHtml(body)}
        </div>
      </div>

      <div class="mt-3 text-xs text-brand-muted">
        <span class="text-brand-text font-medium">Common notes:</span>
        ${notes.map(n => `<span class="inline-block ml-2">${chip(n)}</span>`).join("")}
      </div>

      <div class="mt-3 text-xs text-brand-muted">
        <span class="text-brand-text font-medium">Best for:</span>
        ${escapeHtml(bestFor)}
      </div>

    </div>
  `;
}
function renderLearnWrappers() {
  root.innerHTML = shell({
    title: "Wrapper Types",
    subtitle: "Wrapper influences aroma, sweetness/spice perception, and burn — but it’s not the whole story.",
    content: `
      <div class="max-w-4xl space-y-6">

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">What a wrapper really does</h2>
          <p class="text-sm text-brand-muted mt-3">
            The wrapper is the outer leaf of the cigar — the part your palate meets first and your nose registers most.
            It can shape <span class="text-brand-text">aroma</span>, <span class="text-brand-text">burn quality</span>, and how flavors feel
            (sweetness, spice, “creaminess”), but the cigar’s
            <span class="text-brand-text">strength (nicotine)</span> is usually driven by the filler.
          </p>

          <div class="mt-4 grid md:grid-cols-3 gap-3 text-sm">
            ${learnFact("Aroma impact", "Wrapper heavily influences what you smell (and taste).")}
            ${learnFact("Combustion & burn", "Oiliness + thickness can change burn rate and temperature.")}
            ${learnFact("Perception", "Color suggests fermentation/aging, not automatic strength.")}
          </div>

          <div class="mt-4 rounded-2xl border border-brand-border bg-brand-bg p-4 text-sm text-brand-muted">
            <span class="text-brand-text font-medium">Reality check:</span>
            A dark wrapper can be “sweet” without being “strong,” and a light wrapper can still ride on a powerful filler blend.
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Color vs strength (the common myth)</h2>
          <div class="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            ${learnBulletBox("What color often indicates", [
              "How long the leaf was fermented (darker can mean longer fermentation)",
              "Potential sweetness (darker fermentation can deepen natural sugars)",
              "A different flavor style (not automatically “stronger”)"
            ])}
            ${learnBulletBox("What strength depends on more", [
              "Filler tobaccos (ligero content, primings, blend choices)",
              "How fast you smoke (overheating makes anything taste harsh)",
              "Age of the cigar (aging can smooth sharp edges)"
            ])}
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Core wrapper families</h2>
          <p class="text-sm text-brand-muted mt-3">
            Below are the wrappers you’ll see most often in shops. Think of these as “flavor lanes.”
            Individual cigars can still vary based on binder/filler and fermentation.
          </p>

          <div class="mt-5 space-y-4">
            ${wrapperProfile({
              name: "Connecticut (Shade)",
              vibe: "Smooth, creamy, approachable",
              notes: ["cream", "nuts", "light cedar", "toast"],
              body: "Mild to Medium",
              bestFor: "Morning/coffee pairings, beginners, low bite"
            })}

            ${wrapperProfile({
              name: "Habano",
              vibe: "Spice-forward, classic cigar punch",
              notes: ["cedar", "leather", "pepper", "earth"],
              body: "Medium to Full",
              bestFor: "Those who like spice + structure, whiskey pairings"
            })}

            ${wrapperProfile({
              name: "Corojo",
              vibe: "Aromatic spice + toasted sweetness",
              notes: ["warm spice", "cedar", "toast", "light sweetness"],
              body: "Medium to Full",
              bestFor: "Complexity without going “dark and heavy”"
            })}

            ${wrapperProfile({
              name: "Sumatra",
              vibe: "Balanced, often slightly sweet + earthy",
              notes: ["earth", "sweet wood", "spice", "tea-like tannin"],
              body: "Mild to Medium-Full",
              bestFor: "All-day smokes, balanced blends"
            })}

            ${wrapperProfile({
              name: "Cameroon",
              vibe: "Fragrant, sweet-spicy, unique",
              notes: ["sweet cedar", "baking spice", "nuts", "dry cocoa"],
              body: "Mild to Medium",
              bestFor: "Elegant cigars; great with coffee or rum"
            })}

            ${wrapperProfile({
              name: "Broadleaf (usually Maduro)",
              vibe: "Thick, bold, naturally sweet",
              notes: ["dark cocoa", "molasses", "earth", "espresso"],
              body: "Medium-Full to Full",
              bestFor: "Rich night smokes, stout/rum/rye pairings"
            })}

            ${wrapperProfile({
              name: "San Andrés (Mexico)",
              vibe: "Dark, earthy, chocolatey, dense",
              notes: ["earth", "cocoa", "espresso", "pepper"],
              body: "Medium-Full to Full",
              bestFor: "Big flavor; loves aged rum + espresso"
            })}
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Maduro vs Oscuro (quick clarity)</h2>
          <p class="text-sm text-brand-muted mt-3">
            These terms often describe how the wrapper looks and how it was processed.
            They’re not universal standards across all brands, but here’s the practical takeaway:
          </p>

          <div class="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            ${learnBulletBox("Maduro", [
              "Darker wrapper from extended fermentation/processing",
              "Often sweeter: cocoa/coffee/dark sugar",
              "Can be medium to full depending on filler"
            ])}
            ${learnBulletBox("Oscuro", [
              "Very dark wrapper (often even more fermented / darker leaf selection)",
              "Often richer/bolder tasting",
              "Can burn slower due to thicker/oilier leaf"
            ])}
          </div>

          <div class="mt-4 rounded-2xl border border-brand-border bg-brand-bg p-4 text-sm text-brand-muted">
            <span class="text-brand-text font-medium">Pro tip:</span>
            If a dark wrapper cigar tastes bitter, slow down. Bitterness is often heat, not “the wrapper being harsh.”
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">How to choose a wrapper (fast guide)</h2>
          <div class="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            ${learnBulletBox("If you want…", [
              "Creamy + smooth → Connecticut",
              "Classic spice + structure → Habano / Corojo",
              "Balanced sweetness → Sumatra / Cameroon",
              "Dark chocolate + espresso → Broadleaf / San Andrés"
            ])}
            ${learnBulletBox("If you’re pairing with…", [
              "Coffee → Connecticut, Cameroon, Maduro",
              "Bourbon/Rye → Habano, Broadleaf, San Andrés",
              "Aged Rum → Maduro, San Andrés, Cameroon",
              "Red Wine → Maduro/Broadleaf (careful with very tannic wines)"
            ])}
          </div>

          <div class="mt-5 flex flex-wrap gap-3">
            <a href="#/learn" class="text-sm text-brand-gold hover:underline">← Back to Learn</a>
            <span class="text-brand-muted text-sm">•</span>
            <a href="#/database" class="text-sm text-brand-gold hover:underline">Explore cigars by wrapper in the Database →</a>
          </div>
        </div>

      </div>
    `,
  });
}
//----------End of Improved Learn Wrapper Section----------------
//----------------New Shapes Section---------------------
function renderLearnShapes() {
  root.innerHTML = shell({
    title: "Shapes & Sizes (Vitolas)",
    subtitle: "How length and ring gauge change flavor, heat, and burn — plus the shapes you’ll see most often.",
    content: `
      <div class="max-w-4xl space-y-6">

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Key terms (in plain English)</h2>

          <div class="mt-4 grid md:grid-cols-2 gap-3 text-sm">
            ${learnGloss("Vitola", "The cigar’s shape + size category (e.g., Robusto, Toro, Churchill).")}
            ${learnGloss("Length", "Measured in inches. Longer cigars typically take more time and can develop more slowly.")}
            ${learnGloss("Ring Gauge", "The cigar’s diameter. Measured in 64ths of an inch (e.g., 50 = 50/64”).")}
            ${learnGloss("Parejo vs Figurado", "Parejo = straight sides. Figurado = shaped (tapered/bulged).")}
          </div>

          <div class="mt-4 rounded-2xl border border-brand-border bg-brand-bg p-4 text-sm text-brand-muted">
            <span class="text-brand-text font-medium">Quick math:</span>
            Ring gauge 50 = 50/64 inch ≈ 0.78". Bigger ring gauge = thicker cigar.
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">How size changes the experience</h2>

          <div class="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            ${learnBulletBox("Thicker cigars (higher ring gauge) often", [
              "Burn a bit cooler (more tobacco mass, slower heat build-up)",
              "Highlight the filler blend (less wrapper influence per puff)",
              "Feel smoother, especially if smoked slowly"
            ])}

            ${learnBulletBox("Thinner cigars (lower ring gauge) often", [
              "Taste more wrapper-forward (wrapper is a larger % of the smoke)",
              "Feel more concentrated and intense",
              "Can overheat faster if you puff too quickly"
            ])}
          </div>

          <div class="mt-4 rounded-2xl border border-brand-border bg-brand-bg p-4 text-sm text-brand-muted">
            <span class="text-brand-text font-medium">Practical tip:</span>
            If a cigar tastes bitter, it’s often heat. Slow your cadence first before blaming the blend.
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Parejo (straight-sided) classics</h2>
          <p class="text-sm text-brand-muted mt-3">
            Parejos are the most common and most consistent shapes. Great for learning because burn behavior is predictable.
          </p>

          <div class="mt-5 grid md:grid-cols-2 gap-4 text-sm">
            ${vitolaCard("Robusto", `~5" × 50`, "Short, satisfying, and popular. Great for 45–75 minutes.", [
              "Balanced wrapper/filler influence",
              "Easy to smoke without overheating",
              "A go-to “baseline” vitola"
            ])}

            ${vitolaCard("Toro", `~6" × 52`, "More time and evolution than a Robusto. Very common.", [
              "Often smoother than thinner sizes",
              "Better for noticing transitions",
              "Great with whiskey or rum"
            ])}

            ${vitolaCard("Churchill", `~7" × 48`, "Long session cigar with slow development.", [
              "Can evolve more gradually",
              "Great when you want a long, steady smoke",
              "Needs patience and slow cadence"
            ])}

            ${vitolaCard("Corona", `~5.5" × 42`, "Classic size that can feel more focused and wrapper-driven.", [
              "Often more “concentrated” flavor",
              "Can burn faster/hotter if rushed",
              "Great for tasting wrapper character"
            ])}
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Figurado (shaped) favorites</h2>
          <p class="text-sm text-brand-muted mt-3">
            Figurados are shaped cigars. They can be incredibly rewarding, but they’re a bit more sensitive to lighting and technique.
          </p>

          <div class="mt-5 grid md:grid-cols-2 gap-4 text-sm">
            ${vitolaCard("Torpedo", `~6" × 52 (varies)`, "Pointed head concentrates smoke and can intensify flavor.", [
              "Cut carefully (don’t overcut)",
              "Great for concentrated draws",
              "Feels more “focused” than a Toro"
            ])}

            ${vitolaCard("Belicoso", `~5.5" × 52 (varies)`, "A softer taper than a torpedo. Forgiving but still focused.", [
              "Easy to cut in stages",
              "Often a great “upgrade” from Toro",
              "Good balance of comfort + concentration"
            ])}

            ${vitolaCard("Perfecto", `varies`, "Tapered at both ends. Can start strong and then settle.", [
              "Toast slowly for best start",
              "Construction quality matters",
              "Often very complex when well-made"
            ])}

            ${vitolaCard("Salomon", `~6.5–7.5” × big`, "Large, dramatic, slow-burning figurado.", [
              "Long, evolving smoke",
              "Best for special occasions",
              "Requires slow cadence"
            ])}
          </div>
        </div>

        <div class="lb-card p-6">
          <h2 class="font-serif text-2xl text-brand-gold">Choosing the right size (fast guide)</h2>

          <div class="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            ${learnBulletBox("Pick a Robusto if…", [
              "You want a reliable, balanced experience",
              "You’re learning a new brand/blend",
              "You want a 1-hour-ish session"
            ])}

            ${learnBulletBox("Pick a Toro/Churchill if…", [
              "You want slower evolution and more transitions",
              "You’ll be smoking longer and relaxing",
              "You prefer a slightly cooler, smoother feel"
            ])}

            ${learnBulletBox("Pick a Corona/Lancero if…", [
              "You want wrapper-forward flavor",
              "You enjoy more intensity and focus",
              "You’re comfortable with a slower cadence (to avoid heat)"
            ])}

            ${learnBulletBox("Pick a Figurado if…", [
              "You want something special/complex",
              "You’re okay with needing a careful light and cut",
              "You like concentrated draws and evolving structure"
            ])}
          </div>

          <div class="mt-5 flex flex-wrap gap-3">
            <a href="#/learn" class="text-sm text-brand-gold hover:underline">← Back to Learn</a>
            <span class="text-brand-muted text-sm">•</span>
            <a href="#/database" class="text-sm text-brand-gold hover:underline">Explore cigars by shape in the Database →</a>
          </div>
        </div>

      </div>
    `,
  });
}
//------------------End of Shapes Section-------------------------
function vitolaCard(name, size, summary, bullets) {
  return `
    <div class="rounded-2xl border border-brand-border bg-brand-bg p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-sm font-medium text-brand-text">${escapeHtml(name)}</div>
          <div class="text-xs text-brand-muted mt-1">${escapeHtml(summary)}</div>
        </div>
        <div class="text-xs border border-brand-border px-2 py-1 rounded-full text-brand-muted">
          ${escapeHtml(size)}
        </div>
      </div>

      <ul class="mt-3 space-y-1 text-xs text-brand-muted">
        ${bullets.map(b => `<li>• ${escapeHtml(b)}</li>`).join("")}
      </ul>
    </div>
  `;
}
// -------------------- UI blocks --------------------
function filterBlock(title, key, items) {
  if (!items.length) return "";
  const set = state.db[key];

  return `
    <div class="mt-5">
      <h3 class="text-sm font-medium">${escapeHtml(title)}</h3>
      <div class="mt-3 space-y-2">
        ${items.map((v) => {
          const checked = set.has(v) ? "checked" : "";
          return `
            <label class="flex items-center gap-2 text-sm text-brand-muted">
              <input ${checked} data-filter="${escapeAttr(key)}" value="${escapeAttr(v)}" type="checkbox" class="accent-[#D4AF37]">
              <span>${escapeHtml(v)}</span>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function cigarCard(c) {
  const title = `${c.name}`;
  const sub = `${c.origin || "—"} • ${c.shape || "—"}`;
  const tags = (c.tags || []).slice(0, 4);

  return `
    <button data-cigar-id="${escapeAttr(c.id)}" class="lb-card p-5 text-left">
      ${imgBox(c.image, c.name)}
      <div class="mt-4 text-xs text-brand-muted">${escapeHtml(sub)}</div>
      <div class="mt-1 font-medium">${escapeHtml(title)}</div>
      <div class="mt-3 flex flex-wrap gap-2">
        ${c.strength ? badge(c.strength) : ""}
        ${c.wrapper ? badge(c.wrapper) : ""}
        ${c.shape ? badge(c.shape) : ""}
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        ${tags.map(chip).join("")}
      </div>
    </button>
  `;
}

function pairingItem(title, desc, image) {
  return `
    <div class="rounded-2xl border border-brand-border bg-brand-bg p-4">
      <div class="flex items-start gap-3">
        <div class="w-12 shrink-0">${imgBox(image, title)}</div>
        <div>
          <div class="text-sm font-medium">${escapeHtml(title)}</div>
          <div class="text-xs text-brand-muted mt-1">${escapeHtml(desc || "")}</div>
        </div>
      </div>
    </div>
  `;
}

function learnCard(title, desc, href, icon) {
  return `
    <a href="${escapeAttr(href)}" class="lb-card p-6 block">
      <div class="flex items-center gap-3">
        <i data-lucide="${escapeAttr(icon)}" class="w-5 h-5 text-brand-gold"></i>
        <h3 class="font-medium text-lg">${escapeHtml(title)}</h3>
      </div>
      <p class="text-sm text-brand-muted mt-3">${escapeHtml(desc)}</p>
      <div class="text-sm text-brand-gold mt-4">Open →</div>
    </a>
  `;
}

function learnSection(title, bullets) {
  return `
    <div class="lb-card p-6">
      <h2 class="font-serif text-2xl text-brand-gold">${escapeHtml(title)}</h2>
      <ul class="mt-3 space-y-2 text-sm text-brand-muted">
        ${bullets.map(b => `<li>• ${escapeHtml(b)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function spec(label, value) {
  return `
    <div class="rounded-2xl bg-brand-bg border border-brand-border p-3">
      <div class="text-[11px] text-brand-muted">${escapeHtml(label)}</div>
      <div class="text-sm">${escapeHtml(value)}</div>
    </div>
  `;
}

function pairList(label, arr) {
  const items = Array.isArray(arr) ? arr : [];
  return `
    <div class="rounded-2xl bg-brand-bg border border-brand-border p-4">
      <div class="text-xs text-brand-muted">${escapeHtml(label)}</div>
      <div class="mt-2 text-sm">
        ${items.length ? items.map(x => `<div>• ${escapeHtml(x)}</div>`).join("") : `<span class="text-brand-muted">—</span>`}
      </div>
    </div>
  `;
}

// -------------------- Utils --------------------
function unique(arr) {
  return [...new Set(arr)].sort((a,b) => String(a).localeCompare(String(b)));
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s); }
