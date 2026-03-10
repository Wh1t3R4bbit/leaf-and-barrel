const WHISKEY_DATA_PATH = "/data/whiskey.json";

const whiskeyState = {
  all: [],
  filtered: [],
  filters: {
    search: "",
    type: "",
    country: "",
    region: "",
    proof: "",
    tags: new Set(),
  },
};

const els = {
  search: document.getElementById("whiskey-search"),
  filterType: document.getElementById("filter-type"),
  filterCountry: document.getElementById("filter-country"),
  filterRegion: document.getElementById("filter-region"),
  filterProof: document.getElementById("filter-proof"),
  tagFilters: document.getElementById("tag-filters"),
  clearFilters: document.getElementById("clear-filters"),
  resultsCount: document.getElementById("results-count"),
  results: document.getElementById("whiskey-results"),
};

initWhiskeyPage();

async function initWhiskeyPage() {
  try {
    setLoadingState();

    const response = await fetch(WHISKEY_DATA_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load whiskey data: ${response.status}`);
    }

    const data = await response.json();
    whiskeyState.all = Array.isArray(data) ? data : [];

    populateFilterOptions(whiskeyState.all);
    renderTagFilters(whiskeyState.all);
    applyFilters();
    bindEvents();
  } catch (error) {
    console.error(error);
    renderErrorState("Could not load the whiskey database.");
  }
}

function bindEvents() {
  els.search.addEventListener("input", (event) => {
    whiskeyState.filters.search = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  els.filterType.addEventListener("change", (event) => {
    whiskeyState.filters.type = event.target.value;
    applyFilters();
  });

  els.filterCountry.addEventListener("change", (event) => {
    whiskeyState.filters.country = event.target.value;
    applyFilters();
  });

  els.filterRegion.addEventListener("change", (event) => {
    whiskeyState.filters.region = event.target.value;
    applyFilters();
  });

  els.filterProof.addEventListener("change", (event) => {
    whiskeyState.filters.proof = event.target.value;
    applyFilters();
  });

  els.clearFilters.addEventListener("click", clearAllFilters);
}

function setLoadingState() {
  els.resultsCount.textContent = "Loading whiskeys...";
  els.results.innerHTML = `
    <div class="empty-state">
      <p>Pouring the whiskey database...</p>
    </div>
  `;
}

function renderErrorState(message) {
  els.resultsCount.textContent = "0 whiskeys found";
  els.results.innerHTML = `
    <div class="empty-state error-state">
      <p>${message}</p>
    </div>
  `;
}

function clearAllFilters() {
  whiskeyState.filters.search = "";
  whiskeyState.filters.type = "";
  whiskeyState.filters.country = "";
  whiskeyState.filters.region = "";
  whiskeyState.filters.proof = "";
  whiskeyState.filters.tags.clear();

  els.search.value = "";
  els.filterType.value = "";
  els.filterCountry.value = "";
  els.filterRegion.value = "";
  els.filterProof.value = "";

  applyFilters();
  renderTagFilters(whiskeyState.all);
}

function populateFilterOptions(items) {
  const types = getUniqueValues(items, "type");
  const countries = getUniqueValues(items, "country");
  const regions = getUniqueValues(items, "region");

  fillSelect(els.filterType, types);
  fillSelect(els.filterCountry, countries);
  fillSelect(els.filterRegion, regions);
}

function fillSelect(selectEl, values) {
  const currentFirstOption = selectEl.innerHTML;

  selectEl.innerHTML = currentFirstOption;

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
}

function getUniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function getAllTags(items) {
  const tags = new Set();

  items.forEach((item) => {
    if (Array.isArray(item.tags)) {
      item.tags.forEach((tag) => tags.add(tag));
    }
  });

  return [...tags].sort((a, b) => a.localeCompare(b));
}

function renderTagFilters(items) {
  const tags = getAllTags(items);

  if (!tags.length) {
    els.tagFilters.innerHTML = `<p class="muted">No tags available.</p>`;
    return;
  }

  els.tagFilters.innerHTML = tags
    .map((tag) => {
      const active = whiskeyState.filters.tags.has(tag) ? "active" : "";
      return `
        <button
          type="button"
          class="tag-chip ${active}"
          data-tag="${escapeHtml(tag)}"
        >
          ${escapeHtml(tag)}
        </button>
      `;
    })
    .join("");

  els.tagFilters.querySelectorAll(".tag-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const tag = button.dataset.tag;

      if (whiskeyState.filters.tags.has(tag)) {
        whiskeyState.filters.tags.delete(tag);
      } else {
        whiskeyState.filters.tags.add(tag);
      }

      renderTagFilters(whiskeyState.all);
      applyFilters();
    });
  });
}

function applyFilters() {
  const { search, type, country, region, proof, tags } = whiskeyState.filters;

  whiskeyState.filtered = whiskeyState.all.filter((item) => {
    const searchBlob = [
      item.name,
      item.distillery,
      item.type,
      item.country,
      item.region,
      item.description,
      item.finish,
      ...(item.tags || []),
      ...(item.notes || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || searchBlob.includes(search);
    const matchesType = !type || item.type === type;
    const matchesCountry = !country || item.country === country;
    const matchesRegion = !region || item.region === region;
    const matchesProof = matchesProofRange(item.proof, proof);
    const matchesTags =
      tags.size === 0 ||
      [...tags].every((tag) => Array.isArray(item.tags) && item.tags.includes(tag));

    return (
      matchesSearch &&
      matchesType &&
      matchesCountry &&
      matchesRegion &&
      matchesProof &&
      matchesTags
    );
  });

  renderResults();
}

function matchesProofRange(proofValue, selectedRange) {
  if (!selectedRange) return true;

  const proof = Number(proofValue);
  if (Number.isNaN(proof)) return false;

  switch (selectedRange) {
    case "low":
      return proof < 90;
    case "mid":
      return proof >= 90 && proof <= 100;
    case "high":
      return proof >= 101 && proof <= 115;
    case "cask":
      return proof >= 116;
    default:
      return true;
  }
}

function renderResults() {
  const count = whiskeyState.filtered.length;
  els.resultsCount.textContent = `${count} whiskey${count === 1 ? "" : "s"} found`;

  if (!count) {
    els.results.innerHTML = `
      <div class="empty-state">
        <p>No whiskeys matched your filters.</p>
      </div>
    `;
    return;
  }

  els.results.innerHTML = whiskeyState.filtered
    .map((item) => {
      const tags = Array.isArray(item.tags)
        ? item.tags.map((tag) => `<span class="meta-tag">${escapeHtml(tag)}</span>`).join("")
        : "";

      const notes = Array.isArray(item.notes) && item.notes.length
        ? `<p class="whiskey-notes"><strong>Tasting Notes:</strong> ${escapeHtml(item.notes.join(", "))}</p>`
        : "";

      return `
        <article class="whiskey-card card">
          <div class="whiskey-card-top">
            <p class="whiskey-type">${escapeHtml(item.type || "Whiskey")}</p>
            <h2>${escapeHtml(item.name || "Unnamed Whiskey")}</h2>
            <p class="whiskey-distillery">${escapeHtml(item.distillery || "Unknown Distillery")}</p>
          </div>

          <div class="whiskey-meta">
            ${item.country ? `<span><strong>Country:</strong> ${escapeHtml(item.country)}</span>` : ""}
            ${item.region ? `<span><strong>Region:</strong> ${escapeHtml(item.region)}</span>` : ""}
            ${item.proof ? `<span><strong>Proof:</strong> ${escapeHtml(String(item.proof))}</span>` : ""}
            ${item.abv ? `<span><strong>ABV:</strong> ${escapeHtml(String(item.abv))}</span>` : ""}
          </div>

          ${item.description ? `<p class="whiskey-description">${escapeHtml(item.description)}</p>` : ""}
          ${item.finish ? `<p class="whiskey-finish"><strong>Finish:</strong> ${escapeHtml(item.finish)}</p>` : ""}
          ${notes}

          <div class="whiskey-tags">
            ${tags}
          </div>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
