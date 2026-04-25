/*
  profile.js — loads real user data + reports from API
*/

// Auth guard
if (!localStorage.getItem("token")) {
  window.location.href = "auth.html";
}

// ---------------------------------------------------------------------------
// Load profile
// ---------------------------------------------------------------------------
async function loadProfile() {
  const user = getUser(); // from api.js (reads localStorage currentUser)

  if (!user) {
    window.location.href = "auth.html";
    return;
  }

  document.getElementById("user-id-display").innerText = `ID: ${user._id ?? user.id ?? "—"}`;
  document.getElementById("profileName").value     = user.name    ?? "";
  document.getElementById("profileEmail").value    = user.email   ?? "";
  document.getElementById("profilePassword").value = "••••••••";  // never display real password
  document.getElementById("sensoryPref").value     = user.defaultPreference ?? "quiet";
  document.getElementById("role-badge").innerText  = `Role: ${user.role ?? "User"}`;
  document.getElementById("member-since").innerText =
    `Member since: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}`;

  // Load user's reports from API
  try {
    const reports = await apiGetUserReports();
    document.getElementById("report-count").innerText = reports.length;
    renderMyReports(reports);
  } catch (err) {
    document.getElementById("report-count").innerText = "—";
    document.getElementById("my-reports-container").innerHTML =
      `<p style="color:#dc2626;">Could not load reports: ${err.message}</p>`;
  }

  initReportModal("editModal");
  wireOptionGroup("edit-sound");
  wireOptionGroup("edit-crowd");
  wireOptionGroup("edit-lighting");
}

// ---------------------------------------------------------------------------
// Render report cards
// ---------------------------------------------------------------------------
function renderMyReports(reports) {
  const container = document.getElementById("my-reports-container");
  container.innerHTML = "";

  if (!reports || reports.length === 0) {
    container.innerHTML = `<p style="color:#6b7280; text-align:center;">You haven't submitted any reports yet.</p>`;
    return;
  }

  container.innerHTML = reports.map(report => {
    const locName = report.locationName ?? report.locationId ?? "Unknown Location";
    const date    = report.createdAt
      ? new Date(report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : report.date ?? "—";

    return `
      <div class="user-card" data-id="${report._id ?? report.id}">
        <div class="card-header" style="border-bottom:none; padding-bottom:0;">
          <h3>${locName}</h3>
          <span style="font-size:0.8rem; color:#6b7280;">${date}</span>
        </div>
        <div class="card-body" style="margin-top:10px;">
          <p style="margin-bottom:8px; display:flex; gap:6px; flex-wrap:wrap;">
            <span class="tag-sound" style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:12px; font-size:0.8rem;">
              🔊 ${capitalize(report.sound ?? "—")}
            </span>
            <span class="tag-crowd" style="background:#dcfce7; color:#166534; padding:3px 8px; border-radius:12px; font-size:0.8rem;">
              👥 ${capitalize(report.crowd ?? "—")}
            </span>
            <span class="tag-lighting" style="background:#fef08a; color:#854d0e; padding:3px 8px; border-radius:12px; font-size:0.8rem;">
              💡 ${capitalize(report.lighting ?? "—")}
            </span>
          </p>
          ${report.note ? `<p style="font-size:0.9rem; margin-top:5px; font-style:italic;">"${report.note}"</p>` : ""}
          <div style="margin-top:10px; display:flex; gap:8px;">
            <button class="btn-secondary" onclick="openEditModal('${report._id ?? report.id}', '${report.sound ?? ""}', '${report.crowd ?? ""}', '${report.lighting ?? ""}')">Edit</button>
            <button class="btn-danger"    onclick="confirmDeleteReport('${report._id ?? report.id}', this)">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function capitalize(str) {
  if (!str) return "—";
  return str.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Delete report
// ---------------------------------------------------------------------------
async function confirmDeleteReport(id, btn) {
  if (!confirm("Delete this report?")) return;
  btn.disabled = true;
  btn.textContent = "Deleting…";
  try {
    await apiDeleteReport(id);
    // remove card from DOM
    btn.closest(".user-card").remove();
    // update count
    const remaining = document.querySelectorAll(".user-card").length;
    document.getElementById("report-count").innerText = remaining;
  } catch (err) {
    alert("Could not delete: " + err.message);
    btn.disabled = false;
    btn.textContent = "Delete";
  }
}

// ---------------------------------------------------------------------------
// Inline edit report
// ---------------------------------------------------------------------------
function openEditModal(id, sound, crowd, lighting) {
  document.getElementById("edit-report-id").value = id;
  setActiveOption("edit-sound", sound);
  setActiveOption("edit-crowd", crowd);
  setActiveOption("edit-lighting", lighting);
  document.getElementById("editModal").classList.add("open");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("open");
}

async function saveEdit() {
  const id       = document.getElementById("edit-report-id").value;
  const sound    = getSelectedOption("edit-sound");
  const crowd    = getSelectedOption("edit-crowd");
  const lighting = getSelectedOption("edit-lighting");

  if (!sound || !crowd || !lighting) {
    alert("Please select all fields");
    return;
  }

  const saveBtn = document.getElementById("save-edit-btn");
  saveBtn.disabled    = true;
  saveBtn.textContent = "Saving…";

  try {
    await apiUpdateReport(id, { sound, crowd, lighting });

    const card = document.querySelector(`.user-card[data-id="${id}"]`);
    if (card) {
      card.querySelector(".tag-sound").textContent    = `🔊 ${capitalize(sound)}`;
      card.querySelector(".tag-crowd").textContent    = `👥 ${capitalize(crowd)}`;
      card.querySelector(".tag-lighting").textContent = `💡 ${capitalize(lighting)}`;
      card.querySelector("button.btn-secondary").setAttribute(
        "onclick", `openEditModal('${id}', '${sound}', '${crowd}', '${lighting}')`
      );
    }

    closeEditModal();
  } catch (err) {
    alert("Could not update: " + err.message);
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = "Save Changes";
  }
}

// ---------------------------------------------------------------------------
// Profile edit / save (name + preference only — password change needs separate endpoint)
// ---------------------------------------------------------------------------
const editBtn  = document.getElementById("editBtn");
const saveBtn  = document.getElementById("saveBtn");
const inputs   = document.querySelectorAll("input[readonly]");
const prefSel  = document.getElementById("sensoryPref");

editBtn.addEventListener("click", () => {
  inputs.forEach(inp => {
    if (inp.id === "profilePassword") return; // don't allow password edit here
    inp.removeAttribute("readonly");
    inp.style.backgroundColor = "#ffffff";
    inp.style.borderColor     = "#4f46e5";
  });
  prefSel.removeAttribute("disabled");
  prefSel.style.borderColor = "#4f46e5";
  editBtn.style.display = "none";
  saveBtn.style.display = "block";
});

saveBtn.addEventListener("click", async () => {
  const newName = document.getElementById("profileName").value.trim();
  const newPref = prefSel.value;

  saveBtn.disabled    = true;
  saveBtn.textContent = "Saving…";

  try {
    // BACKEND NOTE: You'll need a PATCH /auth/me or PUT /users/:id endpoint
    // to persist profile changes. This stores locally for now.
    const user = getUser();
    if (user) {
      user.name              = newName;
      user.defaultPreference = newPref;
      localStorage.setItem("currentUser", JSON.stringify(user));
    }

    inputs.forEach(inp => {
      inp.setAttribute("readonly", true);
      inp.style.backgroundColor = "#f3f4f6";
      inp.style.borderColor     = "#d1d5db";
    });
    prefSel.setAttribute("disabled", true);
    prefSel.style.borderColor = "#d1d5db";
    saveBtn.style.display = "none";
    editBtn.style.display = "block";
    saveBtn.textContent   = "Save";
    saveBtn.disabled      = false;
  } catch (err) {
    alert("Save failed: " + err.message);
    saveBtn.disabled    = false;
    saveBtn.textContent = "Save";
  }
});

// Add minimal button styles if not already in stylesheet
const style = document.createElement("style");
style.textContent = `
  .btn-secondary {
    background: transparent;
    border: 1px solid #d1d5db;
    color: #374151;
    border-radius: 6px;
    padding: 5px 12px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .btn-danger {
    background: transparent;
    border: 1px solid #fca5a5;
    color: #dc2626;
    border-radius: 6px;
    padding: 5px 12px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .btn-danger:hover  { background: #fef2f2; }
  .btn-secondary:hover { background: #f9fafb; }
`;
document.head.appendChild(style);

// ---------------------------------------------------------------------------
// Boot — api.js must be loaded before this script
// ---------------------------------------------------------------------------
loadProfile();
