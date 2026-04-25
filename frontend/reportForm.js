/*
  reportForm.js — shared report form helpers for dashboard/profile edit forms
*/

function wireOptionGroup(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  const buttons = Array.from(group.querySelectorAll(".option-btn, .opt-btn"));
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function setActiveOption(groupId, value) {
  const group = document.getElementById(groupId);
  if (!group) return;
  const buttons = Array.from(group.querySelectorAll(".option-btn, .opt-btn"));
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

function getSelectedOption(groupId) {
  return document.querySelector(`#${groupId} .option-btn.active, #${groupId} .opt-btn.active`)?.dataset.value || "";
}

function initReportModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.addEventListener("click", e => {
    if (e.target === modal) modal.classList.remove("open");
  });

  modal.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", () => modal.classList.remove("open"));
  });
}

function openReportModal(modalId) {
  document.getElementById(modalId)?.classList.add("open");
}

function closeReportModal(modalId) {
  document.getElementById(modalId)?.classList.remove("open");
}
