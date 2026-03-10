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

    // Your JSON is shaped like: { "whiskeys": [ ... ] }
    whiskeyState.all = Array.isArray(data)
      ? data
      : Array.isArray(data.whiskeys)
      ? data.whiskeys
      : [];

    populateFilterOptions(whiskeyState.all);
    renderTagFilters(whiskeyState.all);
    applyFilters();
    bindEvents();
  } catch (error) {
    console.error("Whiskey page failed to initialize:", error);
    renderErrorState("Could not load the whiskey database.");
  }
}

function bindEvents() {
  if (els.search) {
    els.search.addEventListener("input", (event) => {
      whiskeyState.filters.search = event.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  if (els.filterType) {
    els.filterType.addEventListener("change", (event) => {
      whiskeyState.filters.type = event.target.value;
      applyFilters();
    });
  }

  if (els.filterCountry) {
    els.filterCountry.addEventListener("change", (event) => {
      whiskeyState.filters.country = event.target.value;
      applyFilters();
    });
  }

  if (els.filterRegion) {
    els.filterRegion.addEventListener("change", (event) => {
      whiskeyState.filters.region = event.target.value;
      applyFilters();
    });
  }

  if (els.filterProof) {
    els.filterProof.addEventListener("change", (event) => {
      whiskeyState.filters.proof = event.target.value;
      applyFilters();
    });
  }

  if (els.clearFilters) {
    els.clearFilters.addEventListener("click", clearAllFilters);
  }
}

function setLoadingState() {
  if (els.resultsCount) {
    els.resultsCount.textContent = "Loading whiskeys...";
  }

  if (els.results) {
    els.results.innerHTML = `
      <div class="lb-empty lb-card">
        <p>Pouring the whiskey database...</p>
      </div>
    `;
  }
}

function renderErrorState(message) {
  if (els.resultsCount) {
    els.resultsCount.textContent = "0 whiskeys found";
  }

  if (els.results) {
    els.results.innerHTML = `
      <div class="lb-empty lb-card">
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }
}

function clearAllFilters() {
  whiskeyState.filters.search = "";
  whiskeyState.filters.type = "";
  whiskeyState.filters.country = "";
  whiskeyState.filters.region = "";
  whiskeyState.filters.proof = "";
  whiskeyState.filters.tags.clear();

  if (els.search) els.search.value = "";
  if (els.filterType) els.filterType.value = "";
  if (els.filterCountry) els.filterCountry.value = "";
  if (els.filterRegion) els.filterRegion.value = "";
  if (els.filterProof) els.filterProof.value = "";

  renderTagFilters(whiskeyState.all);
  applyFilters();
}

function populateFilterOptions(items) {
  const types = [
    ...new Set(items.map((item) => item.category).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  const countries = [
    ...new Set(items.map((item) => item.origin?.country).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  const regions = [
    ...new Set(items.map((item) => item.origin?.region).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  fillSelect(els.filterType, types);
  fillSelect(els.filterCountry, countries);
  fillSelect(els.filterRegion, regions);
}

function fillSelect(selectEl, values) {
  if (!selectEl) return;

  const firstOption = selectEl.querySelector("option");
  selectEl.innerHTML = "";

  if (firstOption) {
    selectEl.appendChild(firstOption);
  }

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
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
  if (!els.tagFilters) return;

  const tags = getAllTags(items);

  if (!tags.length) {
    els.tagFilters.innerHTML = `<p class="lb-copy">No tags available.</p>`;
    return;
  }

  els.tagFilters.innerHTML = tags
    .map((tag) => {
      const active = whiskeyState.filters.tags.has(tag) ? "is-active" : "";
      return `
        <button
          type="button"
          class="lb-chip ${active}"
          data-tag="${escapeHtml(tag)}"
        >
          ${escapeHtml(tag)}
        </button>
      `;
    })
    .join("");

  els.tagFilters.querySelectorAll("[data-tag]").forEach((button) => {
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
    const allNotes = [
      ...(item.smell_notes || []),
      ...(item.palate_notes || []),
      ...(item.finish_notes || []),
    ];

    const searchBlob = [
      item.name,
      item.brand,
      item.distillery,
      item.category,
      item.origin?.country,
      item.origin?.region,
      item.description,
      item.cask_finish,
      item.mash_bill,
      ...(item.tags || []),
      ...allNotes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || searchBlob.includes(search);
    const matchesType = !type || item.category === type;
    const matchesCountry = !country || item.origin?.country === country;
    const matchesRegion = !region || item.origin?.region === region;
    const matchesProof = matchesProofRange(item.proof, proof);
    const matchesTags =
      tags.size === 0 ||
      [...tags].every(
        (tag) => Array.isArray(item.tags) && item.tags.includes(tag)
      );

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
  if (!els.resultsCount || !els.results) return;

  const count = whiskeyState.filtered.length;
  els.resultsCount.textContent = `${count} whiskey${count === 1 ? "" : "s"} found`;

  if (!count) {
    els.results.innerHTML = `
      <div class="lb-empty lb-card">
        <p>No whiskeys matched your filters.</p>
      </div>
    `;
    return;
  }

  els.results.innerHTML = whiskeyState.filtered
    .map((item) => {
      const tagsHtml = Array.isArray(item.tags)
        ? item.tags
            .map((tag) => `<span class="lb-chip">${escapeHtml(tag)}</span>`)
            .join("")
        : "";

      const allNotes = [
        ...(item.smell_notes || []),
        ...(item.palate_notes || []),
        ...(item.finish_notes || []),
      ];

      const abvDisplay =
        typeof item.abv === "number" ? `${item.abv}%` : item.abv || "";

      const ageDisplay =
        item.aged_years !== null && item.aged_years !== undefined
          ? `${item.aged_years} years`
          : "";

      const imageSrc = item.image
        ? item.image.startsWith("/") ? item.image : `/${item.image}`
        : "";

      const imageHtml = imageSrc
        ? `
          <div class="lb-whiskey-image-wrap">
            <img
              class="lb-whiskey-image"
              src="${escapeHtml(imageSrc)}"
              alt="${escapeHtml(item.name || "Whiskey bottle")}"
              loading="lazy"
              onerror="this.closest('.lb-whiskey-image-wrap')?.remove();"
            />
          </div>
        `
        : "";

      return `
        <article class="lb-card lb-whiskey-card">
          ${imageHtml}

          <div>
            <p class="lb-kicker">${escapeHtml(item.category || "Whiskey")}</p>
            <h2 class="lb-card-title">${escapeHtml(item.name || "Unnamed Whiskey")}</h2>
            <p class="lb-card-subtitle">
              ${escapeHtml(item.brand || item.distillery || "Unknown Distillery")}
            </p>
          </div>

          <div class="lb-meta">
            ${
              item.origin?.country
                ? `<span><strong>Country:</strong> ${escapeHtml(item.origin.country)}</span>`
                : ""
            }
            ${
              item.origin?.region
                ? `<span><strong>Region:</strong> ${escapeHtml(item.origin.region)}</span>`
                : ""
            }
            ${
              item.proof
                ? `<span><strong>Proof:</strong> ${escapeHtml(String(item.proof))}</span>`
                : ""
            }
            ${
              abvDisplay
                ? `<span><strong>ABV:</strong> ${escapeHtml(abvDisplay)}</span>`
                : ""
            }
            ${
              ageDisplay
                ? `<span><strong>Age:</strong> ${escapeHtml(ageDisplay)}</span>`
                : ""
            }
          </div>

          ${
            item.description
              ? `<p class="lb-copy">${escapeHtml(item.description)}</p>`
              : ""
          }

          ${
            item.mash_bill
              ? `<p class="lb-copy"><strong>Mash Bill:</strong> ${escapeHtml(item.mash_bill)}</p>`
              : ""
          }

          ${
            item.cask_finish
              ? `<p class="lb-copy"><strong>Cask Finish:</strong> ${escapeHtml(item.cask_finish)}</p>`
              : ""
          }

          ${
            allNotes.length
              ? `<p class="lb-copy"><strong>Tasting Notes:</strong> ${escapeHtml(
                  allNotes.join(", ")
                )}</p>`
              : ""
          }

          ${
            item.pairing?.notes
              ? `<p class="lb-copy"><strong>Pairing Note:</strong> ${escapeHtml(
                  item.pairing.notes
                )}</p>`
              : ""
          }

          <div class="lb-tag-list">
            ${tagsHtml}
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
