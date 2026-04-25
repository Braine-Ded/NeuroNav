/*
  dashboard.js — Dashboard page logic
  Depends on api.js being loaded first.
  Shows: greeting, stats (report count, validation count, member since),
  and a paginated list of the user's recent reports with inline edit/delete.
*/

// ── Auth guard ────────────────────────────────────────────────────────────────
if (!localStorage.getItem("token")) {
  window.location.href = "auth.html";
}

// ── State ─────────────────────────────────────────────────────────────────────
let allReports = [];
const MAX_VISIBLE = 5;

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initGreeting();
  initUserInfo();
  await loadDashboardData();
  wireEditModal();
});

// ── Greeting ──────────────────────────────────────────────────────────────────
function initGreeting() {
  const hour = new Date().getHours();
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const user = getUser();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  document.getElementById("greeting-text").textContent =
    `Good ${part}, ${firstName} 👋`;
}

// ── User info in topbar ───────────────────────────────────────────────────────
function initUserInfo() {
  const user = getUser();
  if (!user) return;
  const nameEl = document.getElementById("topbar-name");
  if (nameEl) nameEl.textContent = user.name ?? "";

  if (user.createdAt) {
    const d = new Date(user.createdAt);
    document.getElementById("stat-since").textContent =
      d.toLocaleString("default", { month: "short" });
    document.getElementById("stat-since-year").textContent = d.getFullYear();
  }
}

// ── Load data from API ────────────────────────────────────────────────────────
async function loadDashboardData() {
  try {
    allReports = await apiGetUserReports();
  } catch (err) {
    allReports = [];
    showToast("Could not load reports: " + (err.message ?? "Network error"), "warn");
  }

  document.getElementById("stat-reports").textContent = allReports.length;

  const totalValidations = allReports.reduce(
    (sum, r) => sum + (r.validations ?? r._count?.validations ?? 0),
    0
  );
  document.getElementById("stat-validations").textContent = totalValidations;

  renderReportList(allReports.slice(0, MAX_VISIBLE));
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderReportList(reports) {
  const list = document.getElementById("report-list");

  if (!reports || reports.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <i class="fa-regular fa-map"></i>
        <p>You haven't submitted any reports yet.<br>
           <a href="index.html" style="color:var(--accent);">Explore the map</a> to add your first one.</p>
      </div>`;
    return;
  }

  list.innerHTML = reports.map(r => {
    const id       = r._id ?? r.id;
    const locName  = r.location?.name ?? r.locationName ?? r.locationId ?? "Unknown Location";
    const date     = r.createdAt
      ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—";

    return `
      <div class="report-card" data-id="${id}">
        <div class="report-card-dot"></div>
        <div class="report-card-body">
          <div class="report-card-location">${escHtml(locName)}</div>
          <div class="report-card-date">${date}</div>
          <div class="tag-row">
            <span class="tag tag-sound">🔊 ${fmt(r.sound)}</span>
            <span class="tag tag-crowd">👥 ${fmt(r.crowd)}</span>
            <span class="tag tag-lighting">💡 ${fmt(r.lighting)}</span>
          </div>
        </div>
        <div class="report-card-actions">
          <button class="btn-icon" title="Edit"
            onclick="openEditModal('${id}', '${r.sound}', '${r.crowd}', '${r.lighting}')">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon danger" title="Delete" onclick="deleteReport('${id}', this)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`;
  }).join("");
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteReport(id, btn) {
  if (!confirm("Delete this report?")) return;
  const card = btn.closest(".report-card");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    await apiDeleteReport(id);
    card.style.transition = "opacity 0.25s, transform 0.25s";
    card.style.opacity    = "0";
    card.style.transform  = "translateX(20px)";
    setTimeout(() => card.remove(), 260);
    allReports = allReports.filter(r => (r._id ?? r.id) !== id);
    document.getElementById("stat-reports").textContent = allReports.length;
    showToast("Report deleted", "ok");
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    showToast("Delete failed: " + err.message, "warn");
  }
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function wireEditModal() {
  ["edit-sound", "edit-crowd", "edit-lighting"].forEach(groupId => {
    document.getElementById(groupId).querySelectorAll(".opt-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById(groupId)
          .querySelectorAll(".opt-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  });
  document.getElementById("editModal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeEditModal();
  });
}

function openEditModal(id, sound, crowd, lighting) {
  document.getElementById("edit-report-id").value = id;
  setActive("edit-sound",    sound);
  setActive("edit-crowd",    crowd);
  setActive("edit-lighting", lighting);
  document.getElementById("editModal").classList.add("open");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("open");
}

function setActive(groupId, value) {
  document.getElementById(groupId).querySelectorAll(".opt-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

async function saveEdit() {
  const id       = document.getElementById("edit-report-id").value;
  const sound    = document.querySelector("#edit-sound .active")?.dataset.value;
  const crowd    = document.querySelector("#edit-crowd .active")?.dataset.value;
  const lighting = document.querySelector("#edit-lighting .active")?.dataset.value;

  if (!sound || !crowd || !lighting) {
    showToast("Please select all fields", "warn");
    return;
  }

  const saveBtn = document.getElementById("save-edit-btn");
  saveBtn.disabled    = true;
  saveBtn.textContent = "Saving…";

  try {
    await apiUpdateReport(id, { sound, crowd, lighting });

    const report = allReports.find(r => (r._id ?? r.id) === id);
    if (report) { report.sound = sound; report.crowd = crowd; report.lighting = lighting; }

    const card = document.querySelector(`.report-card[data-id="${id}"]`);
    if (card) {
      card.querySelector(".tag-sound").textContent    = `🔊 ${fmt(sound)}`;
      card.querySelector(".tag-crowd").textContent    = `👥 ${fmt(crowd)}`;
      card.querySelector(".tag-lighting").textContent = `💡 ${fmt(lighting)}`;
      card.querySelector(".btn-icon:not(.danger)").setAttribute(
        "onclick", `openEditModal('${id}', '${sound}', '${crowd}', '${lighting}')`
      );
    }

    closeEditModal();
    showToast("Report updated", "ok");
  } catch (err) {
    showToast("Update failed: " + err.message, "warn");
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = "Save Changes";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(val) {
  if (!val) return "—";
  return val.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function showToast(msg, type = "ok") {
  const toast = document.getElementById("toast");
  const color  = type === "ok" ? "#2d6a4f" : "#e76f51";
  const icon   = type === "ok" ? "fa-circle-check" : "fa-circle-exclamation";
  toast.innerHTML = `<i class="fa-solid ${icon}" style="color:${color}"></i> ${escHtml(msg)}`;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 3200);
}
