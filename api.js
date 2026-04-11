const API_BASE = 'http://localhost:3000/api';

function loadReports(callback) {
  fetch(`${API_BASE}/reports`)
    .then(response => response.json())
    .then(reports => callback(reports))
    .catch(error => console.error('Error loading reports:', error));
}

function saveReport(data, callback) {
  fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  .then(response => response.json())
  .then(result => callback(result))
  .catch(error => console.error('Error saving report:', error));
}