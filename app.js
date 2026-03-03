// app.js
const root = document.getElementById("app-root");

const routes = {
  home: renderHome,
  database: renderDatabase,
  pairings: renderPairings,
  guides: renderGuides,
};

function setActiveNav(view) {
  document.querySelectorAll(".nav-link").forEach((a) => {
    const isActive = a.dataset.view === view;
    a.classList.toggle("text-brand-text", isActive);
    a.classList.toggle("text-brand-muted", !isActive);
  });
}

function navigate(view, { replace = false } = {}) {
  const fn = routes[view] || routes.home;
  const url = view === "home" ? "/" : `/#/${view}`;
  if (replace) history.replaceState({ view }, "", url);
  else history.pushState({ view }, "", url);

  setActiveNav(view);
  fn();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentViewFromLocation() {
  const hash = location.hash || "";
  const match = hash.match(/^#\/(.+)$/);
  const view = match ? match[1] : "home";
  return routes[view] ? view : "home";
}

// Wire nav clicks
document.addEventListener("click", (e) => {
  const link = e.target.closest(".nav-link");
  if (!link) return;
  e.preventDefault();
  navigate(link.dataset.view);
});

// Handle back/forward
window.addEventListener("popstate", () => {
  const view = currentViewFromLocation();
  setActiveNav(view);
  routes[view]();
});

// Initial render
navigate(currentViewFromLocation(), { replace: true });

// -------------------- Views --------------------

function pageShell({ title, subtitle, content }) {
  return `
    <section class="max-w-7xl mx-auto px-6 w-full pt-12">
      <header class="mb-10">
        <h1 class="font-serif text-4xl md:text-5xl text-brand-text">${title}</h1>
        ${subtitle ? `<p class="mt-3 text-brand-muted max-w-2xl">${subtitle}</p>` : ""}
      </header>
      ${content}
    </section>
  `;
}

function renderHome() {
  root.innerHTML = `
    <section class="max-w-7xl mx-auto px-6 w-full pt-14">
      <div class="rounded-3xl border border-brand-border bg-brand-surface p-8 md:p-12">
        <p class="text-brand-muted text-sm tracking-wide uppercase">Leaf & Barrel</p>
        <h1 class="font-serif text-4xl md:text-6xl mt-3">
          Find the flavor. Log the ritual.
        </h1>
        <p class="text-brand-muted mt-4 max-w-2xl">
          Discover cigars by wrapper, strength, vitola, and tasting notes — then pair them like you meant it.
        </p>

        <div class="mt-8 flex flex-col md:flex-row gap-3">
          <input
            id="global-search"
            class="w-full bg-brand-bg border border-brand-border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-brand-gold/60"
            placeholder="Search cigars, brands, wrappers, flavors…"
          />
          <button
            id="search-cta"
            class="px-6 py-4 rounded-2xl bg-brand-gold text-brand-bg text-sm font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Search
          </button>
        </div>

        <div class="mt-6 flex flex-wrap gap-2">
          ${["Wrapper", "Strength", "Country", "Vitola", "Flavor Tags", "Pairings"].map(chip).join("")}
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-6 mt-10">
        ${featureCard("Staff Picks", "A curated starting point: classics, sleepers, and best-value gems.")}
        ${featureCard("Pairing of the Week", "One cigar + two drinks + the why. Fast, useful, repeatable.")}
        ${featureCard("Guides", "Storage, cutting, lighting, terminology — no snobbery, just clarity.")}
      </div>
    </section>
  `;

  const searchCta = document.getElementById("search-cta");
  searchCta.addEventListener("click", () => navigate("database"));
}

function renderDatabase() {
  // Mock data (replace later with API)
  const cigars = [
    { id: "c1", name: "No. 2 Torpedo", brand: "Montecristo", strength: "Medium", wrapper: "Natural", notes: ["cedar", "cream", "toast"] },
    { id: "c2", name: "Serie V Melanio", brand: "Oliva", strength: "Full", wrapper: "Maduro", notes: ["cocoa", "espresso", "pepper"] },
    { id: "c3", name: "1926 No. 9", brand: "Padron", strength: "Full", wrapper: "Maduro", notes: ["earth", "cocoa", "spice"] },
  ];

  root.innerHTML = pageShell({
    title: "Database",
    subtitle: "Filter by wrapper, strength, vitola, and tasting notes. Built to scale into a full cigar intelligence database.",
    content: `
      <div class="grid lg:grid-cols-12 gap-6">
        <aside class="lg:col-span-3 rounded-3xl border border-brand-border bg-brand-surface p-5 h-fit sticky top-24">
          <h2 class="font-medium mb-4">Filters</h2>
          ${filterGroup("Strength", ["Mild", "Medium", "Full"])}
          ${filterGroup("Wrapper", ["Connecticut", "Habano", "Maduro", "Sumatra"])}
          ${filterGroup("Country", ["Nicaragua", "Dominican", "Honduras", "Cuba"])}
          <button class="mt-4 w-full px-4 py-3 rounded-2xl border border-brand-border hover:border-brand-gold/50 transition-colors text-sm">
            Reset filters
          </button>
        </aside>

        <section class="lg:col-span-9">
          <div class="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-5">
            <input class="w-full md:max-w-md bg-brand-bg border border-brand-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-brand-gold/60"
              placeholder="Search in database…"
            />
            <select class="bg-brand-surface border border-brand-border rounded-2xl px-4 py-3 text-sm">
              <option>Sort: Popular</option>
              <option>Highest Rated</option>
              <option>Most Reviewed</option>
              <option>Newest</option>
            </select>
          </div>

          <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${cigars.map(cigarCard).join("")}
          </div>
        </section>
      </div>
    `,
  });

  root.querySelectorAll("[data-cigar-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cigar = cigars.find((c) => c.id === btn.dataset.cigarId);
      renderCigarDetail(cigar);
    });
  });
}

function renderCigarDetail(cigar) {
  if (!cigar) return;

  root.innerHTML = pageShell({
    title: `${cigar.brand} — ${cigar.name}`,
    subtitle: "Specs, flavor profile, and pairing recommendations (community notes coming next).",
    content: `
      <div class="grid lg:grid-cols-12 gap-6">
        <div class="lg:col-span-5 rounded-3xl border border-brand-border bg-brand-surface p-6">
          <div class="aspect-[4/3] rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted text-sm">
            Cigar photo placeholder
          </div>

          <div class="mt-5 flex flex-wrap gap-2">
            ${badge(cigar.strength)}
            ${badge(cigar.wrapper)}
          </div>

          <div class="mt-6 grid grid-cols-2 gap-3 text-sm">
            ${spec("Wrapper", cigar.wrapper)}
            ${spec("Strength", cigar.strength)}
            ${spec("Origin", "TBD")}
            ${spec("Vitola", "TBD")}
          </div>

          <div class="mt-6 flex gap-3">
            <button class="flex-1 px-4 py-3 rounded-2xl bg-brand-gold text-brand-bg text-sm font-medium hover:bg-brand-gold/90">
              Save to Humidor
            </button>
            <button class="flex-1 px-4 py-3 rounded-2xl border border-brand-border hover:border-brand-gold/50 text-sm">
              Add Tasting Note
            </button>
          </div>
        </div>

        <div class="lg:col-span-7 space-y-6">
          <div class="rounded-3xl border border-brand-border bg-brand-surface p-6">
            <h3 class="font-medium mb-3">Flavor notes</h3>
            <div class="flex flex-wrap gap-2">
              ${cigar.notes.map(tagChip).join("")}
            </div>
            <div class="mt-5 grid md:grid-cols-3 gap-3 text-sm">
              ${stageCard("First third", "TBD")}
              ${stageCard("Second third", "TBD")}
              ${stageCard("Final third", "TBD")}
            </div>
          </div>

          <div class="rounded-3xl border border-brand-border bg-brand-surface p-6">
            <h3 class="font-medium mb-3">Pairing recommendations</h3>
            <div class="grid md:grid-cols-2 gap-3">
              ${pairCard("Rye whiskey", "Pepper + cocoa loves rye spice.")}
              ${pairCard("Espresso", "Dark roast reinforces cocoa/earth without washing it out.")}
              ${pairCard("Aged rum", "Adds caramel sweetness to balance spice.")}
              ${pairCard("Stout", "Roasty body matches a fuller profile.")}
            </div>
          </div>

          <div class="rounded-3xl border border-brand-border bg-brand-surface p-6">
            <h3 class="font-medium mb-2">Community notes</h3>
            <p class="text-brand-muted text-sm">Coming soon: ratings + tasting journals.</p>
          </div>

          <button id="back-to-db" class="text-sm text-brand-muted hover:text-brand-text underline underline-offset-4">
            ← Back to Database
          </button>
        </div>
      </div>
    `,
  });

  document.getElementById("back-to-db").addEventListener("click", () => navigate("database"));
}

function renderPairings() {
  root.innerHTML = pageShell({
    title: "Pairings",
    subtitle: "Choose a drink type and get cigar matches with a plain-English explanation.",
    content: `
      <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        ${featureCard("Whiskey", "Bourbon, rye, scotch — find pairings that don’t overpower the leaf.")}
        ${featureCard("Rum", "Sweetness + oak can elevate spice and cocoa notes.")}
        ${featureCard("Coffee", "Roast level matters. Pair body with body.")}
        ${featureCard("Wine", "A delicate lane — but magic when matched right.")}
        ${featureCard("Beer", "Stouts, porters, and clean lagers: practical pairing.")}
        ${featureCard("Tea", "Underrated: tannins + aromatics play well with mild wrappers.")}
      </div>
    `,
  });
}

function renderGuides() {
  root.innerHTML = pageShell({
    title: "Guides",
    subtitle: "Learn the craft: storage, cutting, lighting, tasting, and the language of wrappers.",
    content: `
      <div class="grid md:grid-cols-2 gap-6">
        ${guideCard("Beginner Basics", "Humidors, RH, and how not to ruin a good stick.")}
        ${guideCard("Wrapper Guide", "Connecticut vs Habano vs Maduro — what it changes.")}
        ${guideCard("Strength & Body", "Why “full” can mean different things.")}
        ${guideCard("How to Taste", "A simple ritual for consistent notes you can trust.")}
      </div>
    `,
  });
}

// -------------------- UI helpers --------------------

function chip(label) {
  return `<button class="px-3 py-2 rounded-full bg-brand-bg border border-brand-border text-xs text-brand-muted hover:text-brand-text hover:border-brand-gold/40 transition-colors">${label}</button>`;
}

function featureCard(title, body) {
  return `
    <div class="rounded-3xl border border-brand-border bg-brand-surface p-6">
      <h3 class="font-medium">${title}</h3>
      <p class="mt-2 text-sm text-brand-muted">${body}</p>
      <div class="mt-4 text-sm text-brand-gold">Explore →</div>
    </div>
  `;
}

function guideCard(title, body) {
  return `
    <div class="rounded-3xl border border-brand-border bg-brand-surface p-6 hover:border-brand-gold/40 transition-colors">
      <h3 class="font-medium">${title}</h3>
      <p class="mt-2 text-sm text-brand-muted">${body}</p>
      <div class="mt-4 text-sm text-brand-gold">Read →</div>
    </div>
  `;
}

function filterGroup(title, items) {
  return `
    <div class="mb-5">
      <h3 class="text-sm font-medium mb-2">${title}</h3>
      <div class="space-y-2">
        ${items
          .map(
            (i) => `
          <label class="flex items-center gap-2 text-sm text-brand-muted">
            <input type="checkbox" class="accent-[${"#D4AF37"}]">
            <span>${i}</span>
          </label>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

function cigarCard(c) {
  return `
    <button data-cigar-id="${c.id}" class="text-left rounded-3xl border border-brand-border bg-brand-surface p-5 hover:border-brand-gold/40 transition-colors">
      <div class="aspect-[4/3] rounded-2xl bg-brand-bg border border-brand-border mb-4"></div>
      <div class="text-xs text-brand-muted">${c.brand}</div>
      <div class="font-medium">${c.name}</div>
      <div class="mt-2 flex flex-wrap gap-2">
        ${badge(c.strength)}
        ${badge(c.wrapper)}
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        ${c.notes.slice(0, 3).map(tagChip).join("")}
      </div>
    </button>
  `;
}

function badge(text) {
  return `<span class="text-[11px] px-2 py-1 rounded-full border border-brand-border text-brand-muted">${text}</span>`;
}

function tagChip(text) {
  return `<span class="text-[11px] px-2 py-1 rounded-full bg-brand-bg border border-brand-border text-brand-muted">${text}</span>`;
}

function spec(label, value) {
  return `
    <div class="rounded-2xl bg-brand-bg border border-brand-border p-3">
      <div class="text-[11px] text-brand-muted">${label}</div>
      <div class="text-sm">${value}</div>
    </div>
  `;
}

function stageCard(title, body) {
  return `
    <div class="rounded-2xl bg-brand-bg border border-brand-border p-4">
      <div class="text-sm font-medium">${title}</div>
      <div class="mt-1 text-sm text-brand-muted">${body}</div>
    </div>
  `;
}

function pairCard(title, body) {
  return `
    <div class="rounded-2xl bg-brand-bg border border-brand-border p-4">
      <div class="text-sm font-medium">${title}</div>
      <div class="mt-1 text-sm text-brand-muted">${body}</div>
    </div>
  `;
}
