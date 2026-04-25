/*
  api.js — Central API client
  All network calls go through here. Swap BASE_URL when deploying.
*/

const BASE_URL = "http://localhost:5000";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getToken() {
  return localStorage.getItem("token");
}

function saveToken(token) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");
}

function saveUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch {
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // sends the httpOnly cookie too if backend sets one
  });

  // 401 anywhere → session expired, redirect to auth
  if (res.status === 401) {
    clearToken();
    console.warn("Unauthorized - redirecting to login");
    // window.location.href = "auth.html";
    throw new Error("Unauthorized");
  }

  const data = await res.json();

  if (!res.ok) {
    // surface backend error message if present
    throw new Error(data?.message || `Request failed: ${res.status}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function apiLogin(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  // expected: { status, token, data: { user } }
  if (data.token) saveToken(data.token);
  if (data.data?.user) saveUser(data.data.user);
  console.log("Logged in user:", data.data?.user);
  return data;
}

async function apiRegister(name, email, password) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  if (data.token) saveToken(data.token);
  if (data.data?.user) saveUser(data.data.user);
  console.log("Registered user:", data.data?.user);
  return data;
}

async function apiLogout() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // ignore network errors on logout
  } finally {
    clearToken();
    window.location.href = "auth.html";
    console.log("Logged out");
  }
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

async function apiGetLocations() {
  const data = await apiFetch("/locations/");
  // expected: { status, data: { locations: [...] } }  OR  { status, data: [...] }
  console.log("Fetched locations:", data.data?.locations ?? data.data);
  return data.data?.locations ?? data.data ?? [];
}

async function apiGetLocationById(id) {
  const data = await apiFetch(`/locations/id/${id}`);
  return data.data?.location ?? data.data ?? null;
}

async function apiCreateLocation(name, latitude, longitude) {
  const data = await apiFetch("/locations/", {
    method: "POST",
    body: JSON.stringify({ name, latitude, longitude }),
  });
  // BACKEND NOTE: POST /locations/ must return the created location with its _id / id field
  // expected: { status, data: { location: { id, name, lat, lng, ... } } }
  return data.data?.location ?? data.data ?? null;
}


// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

async function apiAddReport(locationId, sound, crowd, lighting, time) {
  const data = await apiFetch("/reports/", {
    method: "POST",
    body: JSON.stringify({ locationId, sound, crowd, lighting }),
  });
  // expected: { status, data: { report: { ... } } }
  return data.data?.report ?? data.data ?? null;
}

async function apiGetUserReports() {
  const data = await apiFetch("/reports/");
  return data.data?.reports ?? data.data ?? [];
}

async function apiGetLocationReports(locationId) {
  const data = await apiFetch(`/reports/location/${locationId}`);
  const reports = data.data?.reports ?? data.data ?? [];

  if (Array.isArray(reports)) {
    return reports.map(report => {
      if (report && report.createdAt !== undefined && report.time === undefined) {
        return { ...report, time: report.createdAt };
      }
      return report;
    });
  }

  if (reports && typeof reports === "object" && reports.createdAt !== undefined) {
    return { ...reports, time: reports.createdAt };
  }

  return reports;
}

async function apiUpdateReport(id, fields) {
  const data = await apiFetch(`/reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(fields),
  });
  return data.data?.report ?? data.data ?? null;
}

async function apiDeleteReport(id) {
  const data = await apiFetch(`/reports/${id}`, { method: "DELETE" });
  return data;
}

async function apiValidateReport(reportId) {
  const data = await apiFetch(`/reports/validate/${reportId}`, {
    method: "POST",
  });
  return data;
}

async function apiGetReportValidations(reportId) {
  const data = await apiFetch(`/reports/validate/${reportId}`, {
    method: "GET",
  });

  // expected response: { status, data: { reportId, validations: [...], validationCount } }
  return data.data ?? data ?? null;
}
