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
    subtitle: "PoC pairing library (loaded from JSON). Images can be added later.",
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

function renderLearnAnatomy() {
  root.innerHTML = shell({
    title: "Cigar Anatomy",
    subtitle: "The three core components of every premium cigar.",
    content: `
      <div class="max-w-3xl space-y-6">
        ${learnSection("Wrapper", [
          "The outer leaf — chosen for appearance, burn, and aroma.",
          "Often a major contributor to the cigar’s overall character.",
          "Examples: Connecticut, Habano, Maduro, Oscuro."
        ])}

        ${learnSection("Binder", [
          "The structural leaf beneath the wrapper.",
          "Holds the filler together and helps the cigar burn evenly.",
          "Usually contributes less flavor than the wrapper/filler."
        ])}

        ${learnSection("Filler", [
          "The internal blend that drives complexity and strength.",
          "Premium cigars typically use long-filler leaves.",
          "Origin mix + aging = the cigar’s signature profile."
        ])}

        <a class="text-sm text-brand-gold hover:underline" href="#/learn">← Back to Learn</a>
      </div>
    `,
  });
}

function renderLearnWrappers() {
  root.innerHTML = shell({
    title: "Wrapper Types",
    subtitle: "Wrapper color and fermentation shape sweetness, spice, and overall feel.",
    content: `
      <div class="max-w-3xl space-y-6">
        ${learnSection("Connecticut", [
          "Typically lighter and smoother.",
          "Common notes: cream, nuts, light cedar.",
          "Great for mild-to-medium profiles."
        ])}

        ${learnSection("Habano", [
          "Often richer, spicier, and more assertive.",
          "Common notes: cedar, leather, spice, earth.",
          "Frequently medium-to-full."
        ])}

        ${learnSection("Maduro", [
          "Darker leaf from extended fermentation.",
          "Common notes: cocoa, espresso, dark sweetness.",
          "Can be medium to full, depending on filler."
        ])}

        ${learnSection("Oscuro", [
          "Very dark — bold, deep flavors.",
          "Often paired with stronger blends.",
          "Expect intensity and richness."
        ])}

        <a class="text-sm text-brand-gold hover:underline" href="#/learn">← Back to Learn</a>
      </div>
    `,
  });
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
