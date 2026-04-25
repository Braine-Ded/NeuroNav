/*
  storage.js — Data layer shim
  When USE_API = true  → all calls go to the REST API via api.js
  When USE_API = false → falls back to localStorage (offline / dev mode)
*/

const USE_API = true;

// ---------------------------------------------------------------------------
// Locations (map pins)
// ---------------------------------------------------------------------------

async function getPlaces() {
  if (USE_API) return apiGetLocations();
  return JSON.parse(localStorage.getItem("places")) || [];
}

async function addPlace(name, lat, lng) {
  if (USE_API) return apiCreateLocation(name, lat, lng);
  const places = JSON.parse(localStorage.getItem("places")) || [];
  const place = { id: Date.now(), name, lat, lng };
  places.push(place);
  localStorage.setItem("places", JSON.stringify(places));
  return place;
}

// ---------------------------------------------------------------------------
// Reports (conditions submitted about a location)
// ---------------------------------------------------------------------------

async function addReport(locationId, sound, crowd, lighting, time) {
  if (USE_API) return apiAddReport(locationId, sound, crowd, lighting, time);
  const places = JSON.parse(localStorage.getItem("places")) || [];
  const place = places.find(p => p.id == locationId);
  if (place) {
    if (!place.reports) place.reports = [];
    // schema field is "sound" (SoundLevel enum), not "noise"
    const report = { id: Date.now(), sound, crowd, lighting, time, validations: 0 };
    place.reports.push(report);
    localStorage.setItem("places", JSON.stringify(places));
    return report;
  }
  return null;
}

async function getUserReports() {
  if (USE_API) return apiGetUserReports();
  return [];
}

async function getLocationReports(locationId) {
  if (USE_API) return apiGetLocationReports(locationId);
  const places = JSON.parse(localStorage.getItem("places")) || [];
  const place = places.find(p => p.id == locationId);
  return place?.reports || [];
}

async function updateReport(id, fields) {
  if (USE_API) return apiUpdateReport(id, fields);
  return null;
}

async function deleteReport(id) {
  if (USE_API) return apiDeleteReport(id);
  return null;
}

// ---------------------------------------------------------------------------
// Validated (client-side only until backend tracks this per-user)
// ---------------------------------------------------------------------------

function getValidatedKey() {
  const user = getUser();
  const id = user?.id || user?._id || user?.email || "guest";
  return `validatedReports_${id}`;
}

function getValidatedLocal() {
  return JSON.parse(localStorage.getItem(getValidatedKey())) || [];
}

function saveValidatedLocal(ids) {
  localStorage.setItem(getValidatedKey(), JSON.stringify(ids));
}

async function validateReport(reportId) {
  if (USE_API) {
    return apiValidateReport(reportId);
  }
  return null;
}
