window.map = L.map('map', {
  zoomControl: false,
});
map.setView([18.996079, 72.850778], 13);

L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

navigator.geolocation.getCurrentPosition(success, error);
// navigator.geolocation.watchPosition(success, error, {
//   enableHighAccuracy: false,
//   maximumAge: 10000,
//   timeout: 5000
// });

let marker, circle, zoomed;
let selectedLat, selectedLng;

function success(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const accuracy = pos.coords.accuracy;

  if (marker) {
    map.removeLayer(marker);
    map.removeLayer(circle);
  }

  marker = L.marker([lat, lng]).addTo(map);
  circle = L.circle([lat, lng], { radius: accuracy }).addTo(map);

  // zoom to fit the circle bounds only on the first location retrieval
  if (!zoomed){
    zoomed = map.fitBounds(circle.getBounds());
  }

  // make sure map is centered on user location
  map.setView([lat, lng]);
}

function error(err) {
  if (err.code === 1) {
    alert("Please allow location access to use this app.");
  } else {
    alert("Unable to retrieve your location.");
  }
}

let inContributeMode = false;
let controBtn = document.querySelector(".contribute");
let form = document.querySelector("#formBox");

controBtn.addEventListener("click", () => {
  inContributeMode = true;
  alert("Click on map to select location");
});


map.on("click", function (e) {
  if (!inContributeMode) return;

  setTimeout(() => {
    form.classList.add("active");
  }, 800);

  const { lat, lng } = e.latlng;
  console.log(lat + " " + lng);
  selectedLat = lat;
  selectedLng = lng;

  if (marker) {
    map.removeLayer(marker);
    map.removeLayer(circle);
  }

  marker = L.marker([lat, lng])
    .addTo(map);

  inContributeMode = false;
});

function submitForm() {
  const name = document.querySelector("#placename").value;
  const noise = document.querySelector("#noise").value;

  const data = {
    name,
    noise,
    lat: selectedLat,
    lng: selectedLng
  };

  saveReport(data, (result) => {
    console.log('Report saved:', result);
    alert("Report Added!");
    form.classList.remove("active");
    loadReportsAndDisplay();
  });
}

function loadReportsAndDisplay() {
  loadReports((reports) => {
    // Clear existing report markers (keep user location if any)
    // For simplicity, remove all markers except current user marker
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer !== marker) {
        map.removeLayer(layer);
      }
    });

    reports.forEach(report => {
      L.marker([report.lat, report.lng])
        .addTo(map)
        .bindPopup(`<b>${report.name}</b><br>Noise: ${report.noise}`);
    });
  });
}

// Load reports on page load
loadReportsAndDisplay();















/* const map = L.map('map').setView([19.033, 73.029], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
maxZoom: 19,
}).addTo(map);

L.marker([19.033, 73.029])
.addTo(map)
.bindPopup("Marker working")
.openPopup();

L.circle([19.033, 73.029], {
radius: 500
}).addTo(map); */