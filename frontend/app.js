/*
  app.js — UI logic
  All data access goes through storage.js → api.js
*/

let locationx = document.querySelector(".location");
let contribute = document.querySelector(".contribute");
let filter = document.querySelector(".filter");
let navBtn = document.querySelectorAll(".btn");

let inContributeMode = false;
let currentNav = "location";

navBtn.forEach(btn => {
  btn.dataset.nav = btn.classList[1];
  btn.addEventListener("click", () => setActiveNav(btn));
});

function setActiveNav(btn) {
  const navType = btn.dataset.nav;
  currentNav = navType;

  navBtn.forEach(b => {
    b.classList.remove("active");
    b.firstElementChild.classList.remove("active");
  });

  btn.classList.add("active");
  btn.firstElementChild.classList.add("active");

  inContributeMode = (navType === "contribute");
  if (navType !== "location") renderPlaces(places);
}

contribute.addEventListener("click", () => {
  inContributeMode = true;
  flashMessage("Click on map to select location", "#059467");
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let places = [];
let markers = [];
let activeFilters = [];
let searchActive = false;
let validatedPlaces = getValidatedLocal();
let selectedLocationId = null;

const clearBtn = document.getElementById("clearFilterBtn");

function updateClearBtn() {
  const hasFilters = activeFilters.some(f => f !== "");
  const visible = hasFilters || searchActive;
  clearBtn.style.display = visible ? "flex" : "none";
  clearBtn.title = searchActive && hasFilters
    ? "Clear search & filters"
    : searchActive ? "Clear search" : "Clear filters";
}

clearBtn.addEventListener("click", () => {
  activeFilters = [];
  searchActive = false;
  searchBox.value = "";
  removeFilters();
  updateClearBtn();
  renderPlaces(places);
  flashMessage("Cleared", "#ffe900");
});

// ---------------------------------------------------------------------------
// Popup builder
// ---------------------------------------------------------------------------
function formatReportTime(value) {
  if (!value) return "—";
  const raw = String(value).trim();
  const date = new Date(value);
  if (!isNaN(date.valueOf())) {
    const day = date.toLocaleDateString(undefined, { weekday: "short" });
    const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return `${day} ${time}`;
  }
  return raw.length > 5 ? raw.slice(0, 5) : raw;
}

function buildPopupHTML(location, reports) {
  const latest = reports?.[0];
  const reportId = latest ? String(latest._id ?? latest.id ?? "") : "";
  const locId = String(location._id ?? location.id);
  let validationCount = 0;

  if (latest) {
    if (Array.isArray(latest.validations)) {
      validationCount = latest.validations.length;
    } else {
      validationCount = latest.validationCount ?? latest.validations ?? 0;
    }
  }

  const isValidated = reportId && validatedPlaces.includes(reportId);
  const validationText = reportId
    ? validationCount > 0
      ? `Verified by ${validationCount} user${validationCount !== 1 ? "s" : ""}`
      : "Not Verified Yet"
    : "No report available to validate";

  return `
    <div class="sheet-content" data-report-id="${reportId}" data-location-id="${locId}">
      <h3>${location.name}</h3>
      <p>
        ${latest ? `
          Time     : ${formatReportTime(latest.time ?? latest.createdAt)}<br>
          Noise    : ${formatText(latest.sound ?? "")}<br>
          Crowd    : ${formatText(latest.crowd ?? "")}<br>
          Lighting : ${formatText(latest.lighting ?? "")}<br>
        ` : `<em>No reports yet for this location.</em><br>`}
        <span class="validation-summary">${validationText}</span>
      </p>
      ${latest ? `
        <button class="validate-btn" data-report-id="${reportId}" data-location-id="${locId}" ${!reportId || isValidated ? "disabled" : ""}>
          ${isValidated ? "You Confirmed This is True" : "Confirm this is still true"}
        </button>
      ` : `
        <button class="add-report-btn" data-location-id="${locId}">
          Add report
        </button>
      `}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
async function renderPlaces(list) {
  validatedPlaces = getValidatedLocal();
  markers.forEach(m => { if (m) m.remove(); });
  markers = [];

  for (const location of list) {
    const locId = location._id ?? location.id;
    let reports = [];
    try {
      reports = await getLocationReports(locId);
    } catch { /* silent */ }

    const marker = L.marker([location.latitude, location.longitude])
      .addTo(map)
      .bindPopup(buildPopupHTML(location, reports));

    markers.push(marker);
  }
}

map.on("popupopen", () => {
  document.querySelectorAll(".validate-btn, .add-report-btn").forEach(btn => {
    if (btn.classList.contains("validate-btn")) {
      const reportId = String(btn.dataset.reportId);
      if (reportId) {
        apiGetReportValidations(reportId)
          .then(validationData => {
            const validationCount = Array.isArray(validationData?.validations)
              ? validationData.validations.length
              : validationData?.validationCount ?? 0;
            const summary = btn.closest(".sheet-content")?.querySelector(".validation-summary");
            if (summary) {
              summary.textContent = validationCount
                ? `Verified by ${validationCount} user${validationCount !== 1 ? "s" : ""}`
                : "Not Verified Yet";
            }
            if (validatedPlaces.includes(reportId)) {
              btn.disabled = true;
              btn.textContent = "You Confirmed This is True";
            }
          })
          .catch(() => {
            // ignore validation fetch failures in popup render
          });
      }
    }

    btn.onclick = async function () {
      if (this.classList.contains("add-report-btn")) {
        const locationId = String(this.dataset.locationId);
        const location = places.find(p => String(p._id ?? p.id) === locationId);
        if (!location) {
          flashMessage("Location not found", "#dc2626");
          return;
        }

        selectedLocationId = locationId;
        document.querySelector("#placename").value = location.name;
        document.querySelector("#placename").readOnly = true;

        document.querySelector("#formBox").classList.add("active");
        document.querySelector(".form-content").classList.add("active");
        return;
      }

      const reportId = String(this.dataset.reportId);
      if (!reportId) {
        flashMessage("No report available to validate", "#ffe900");
        return;
      }
      if (validatedPlaces.includes(reportId)) {
        flashMessage("Already verified by you", "#ffe900");
        return;
      }

      validatedPlaces.push(reportId);
      saveValidatedLocal(validatedPlaces);

      try {
        await apiValidateReport(reportId);
        const validationData = await apiGetReportValidations(reportId);
        const validationCount = Array.isArray(validationData?.validations)
          ? validationData.validations.length
          : validationData?.validationCount ?? 0;

        flashMessage(`Thanks for confirming (${validationCount} total)`, "#059467");
      } catch (err) {
        console.warn("Could not persist verification to backend:", err);
        flashMessage("Verification saved locally, backend unavailable", "#ffe900");
      }

      renderPlaces(places);
    };
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------
function filterPlaces(filters) {
  if (filters.every(f => f === "")) return places;
  let result = places;
  // Locations themselves don't carry conditions — reports do.
  // Filtering by sound/crowd/lighting on location objects only works when
  // the location has been denormalised (e.g. via LocationSummary). Keep as-is
  // so it works when the backend joins summary data onto location objects.
  if (filters[0]) result = result.filter(p => (p.sound ?? p.noise) === filters[0]);
  if (filters[1]) result = result.filter(p => p.crowd === filters[1]);
  if (filters[2]) result = result.filter(p => p.lighting === filters[2]);
  return result;
}

let formBoxFilter = document.querySelector("#formBoxFilter");
let formContentFilter = document.querySelector(".form-content-filter");

filter.addEventListener("click", () => {
  if (places.length === 0) {
    flashMessage("No Locations Available to Filter", "#ffe900");
  } else {
    setTimeout(() => {
      formBoxFilter.classList.add("active");
      formContentFilter.classList.add("active");
    }, 80);
  }
});

function makeOptionGroupExclusive(nodeList) {
  nodeList.forEach(btn => {
    btn.addEventListener("click", () => {
      nodeList.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

makeOptionGroupExclusive(document.querySelectorAll(".controNoise .option-btn"));
makeOptionGroupExclusive(document.querySelectorAll(".controCrowd .option-btn"));
makeOptionGroupExclusive(document.querySelectorAll(".controLighting .option-btn"));
makeOptionGroupExclusive(document.querySelectorAll("#selectNoise .option-btn"));
makeOptionGroupExclusive(document.querySelectorAll("#selectCrowd .option-btn"));
makeOptionGroupExclusive(document.querySelectorAll("#selectLighting .option-btn"));

function applyFilter() {
  const selNoise    = document.querySelector("#selectNoise .active");
  const selCrowd    = document.querySelector("#selectCrowd .active");
  const selLighting = document.querySelector("#selectLighting .active");

  activeFilters = [
    selNoise?.getAttribute("data-value")    || "",
    selCrowd?.getAttribute("data-value")    || "",
    selLighting?.getAttribute("data-value") || "",
  ];

  formBoxFilter.classList.remove("active");
  formContentFilter.classList.remove("active");
  selNoise?.classList.remove("active");
  selCrowd?.classList.remove("active");
  selLighting?.classList.remove("active");

  updateClearBtn();
  const filtered = filterPlaces(activeFilters);

  if (filtered.length === 0) {
    flashMessage("No Locations Match These Filters", "#ffe900");
  } else {
    renderPlaces(filtered);
    flashMessage("Filters Applied!", "#059467");
  }
}

function removeFilters() {
  document.querySelector("#selectNoise .active")?.classList.remove("active");
  document.querySelector("#selectCrowd .active")?.classList.remove("active");
  document.querySelector("#selectLighting .active")?.classList.remove("active");
}

function removeContros() {
  document.querySelector(".controNoise .active")?.classList.remove("active");
  document.querySelector(".controCrowd .active")?.classList.remove("active");
  document.querySelector(".controLighting .active")?.classList.remove("active");
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
const searchBox = document.querySelector(".search-box");

searchBox.addEventListener("input", () => {
  const q = searchBox.value.trim();
  if (q.length > 0) {
    searchActive = true;
    renderPlaces(places.filter(p => p.name.toLowerCase().includes(q.toLowerCase())));
  } else {
    searchActive = false;
    renderPlaces(places);
  }
  updateClearBtn();
});

searchBox.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    searchBox.value = "";
    searchActive = false;
    renderPlaces(places);
    updateClearBtn();
  }
});

// ---------------------------------------------------------------------------
// Submit — Step 1: create Location, Step 2: create Report
async function createLocation(name, latitude, longitude) {
  const location = await addPlace(name, latitude, longitude);
  if (!location) throw new Error("Location could not be created");
  return location;
}

async function submitReport(locationId, noise, crowd, lighting, time) {
  await addReport(locationId, noise, crowd, lighting, time);
}

// ---------------------------------------------------------------------------
async function submitForm() {
  const formBox     = document.querySelector("#formBox");
  const formContent = document.querySelector(".form-content");
  const submitBtn   = document.querySelector("#submit-btn");

  const name     = document.querySelector("#placename").value.trim();
  const time     = document.querySelector("#timeVisited").value;
  const noise    = document.querySelector(".controNoise .active")?.dataset.value    || "";
  const crowd    = document.querySelector(".controCrowd .active")?.dataset.value    || "";
  const lighting = document.querySelector(".controLighting .active")?.dataset.value || "";

  if (!name || !time || !noise || !crowd || !lighting) {
    flashMessage("Please fill in all fields", "#dc2626");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    let locationId = selectedLocationId;

    if (!locationId) {
      const location = await createLocation(name, selectedLat, selectedLng);
      locationId = location._id ?? location.id;
    }

    // 2. Attach a report (conditions) to that location
    // Field name is "sound" in schema/validator; local var is "noise" (UI label)
    await submitReport(locationId, noise, crowd, lighting, time); // noise → sound in storage.js

    // Refresh
    places = await getPlaces();
    renderPlaces(places);

    removeContros();
    document.querySelector("#placename").value  = "";
    document.querySelector("#placename").readOnly = false;
    document.querySelector("#timeVisited").value = "";
    selectedLocationId = null;

    flashMessage("Report Added!", "#059467");
    formContent.classList.remove("active");
    setTimeout(() => formBox.classList.remove("active"), 300);

    navBtn[1].classList.remove("active");
    navBtn[1].firstElementChild.classList.remove("active");

  } catch (err) {
    flashMessage(err.message || "Submission failed", "#dc2626");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
}

// ---------------------------------------------------------------------------
// Nearby calm places
// ---------------------------------------------------------------------------
locationx.addEventListener("click", showNearbyCalmLocation);

function showNearbyCalmLocation() {
  const nearby = places.filter(p =>
    getDistance(userLat, userLng, p.latitude, p.longitude) <= 20
  );
  const calm = nearby.filter(p =>
    (p.sound ?? p.noise) === "QUIET" && p.crowd === "MOSTLY_EMPTY" && p.lighting === "NATURAL"
  );

  if (calm.length === 0) {
    flashMessage("No Nearby Calm Locations Found", "#ffe900");
  } else {
    renderPlaces(calm);
  }
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function flashMessage(msg, color) {
  const toast = document.querySelector(".toast");
  const isSuccess = color === "#059467";
  const icon = isSuccess ? "fa-circle-check" : "fa-circle-exclamation";
  toast.innerHTML = `
    <i class="fa-solid ${icon}" style="color:${color}; font-size:1rem; margin-right:6px;"></i>
    <span>${msg}</span>
  `;
  toast.style.borderLeftColor = color;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function formatText(value) {
  if (!value) return "—";
  return value.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Close buttons
// ---------------------------------------------------------------------------
const formContent = document.querySelector(".form-content");

document.querySelectorAll(".close-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    removeFilters();
    removeContros();
    formContent.classList.remove("active");
    formContentFilter.classList.remove("active");
    setTimeout(() => {
      document.querySelector("#formBox").classList.remove("active");
      formBoxFilter.classList.remove("active");
    }, 300);
    inContributeMode = false;
    if (typeof tempMark !== "undefined" && tempMark) tempMark.remove();
    selectedLocationId = null;
    document.querySelector("#placename").readOnly = false;
    navBtn[1].classList.remove("active");
    navBtn[1].firstElementChild.classList.remove("active");
    navBtn[2].classList.remove("active");
    navBtn[2].firstElementChild.classList.remove("active");
  });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  try {
    places = await getPlaces();
    renderPlaces(places);
  } catch (err) {
    flashMessage("Could not load locations", "#dc2626");
  }
});
