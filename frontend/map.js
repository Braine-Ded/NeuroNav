var map = L.map("map", { zoomControl: false });


L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

map.setView([18.996079, 72.850778], 13);

navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError);

window.addEventListener("resize", () => {
  setTimeout(() => map.invalidateSize(), 100);
});

window.addEventListener("orientationchange", () => {
  setTimeout(() => map.invalidateSize(), 100);
});

let userMarker, userCircle;
let selectedLat, selectedLng, tempMark;
let userLat, userLng;

function onGeoSuccess(pos) {
  userLat = pos.coords.latitude;
  userLng = pos.coords.longitude;

  map.setView([userLat, userLng], 13);

  if (userMarker) {
    map.removeLayer(userMarker);
    map.removeLayer(userCircle);
  }

  userMarker = L.circleMarker([userLat, userLng], {
    radius: 8,
    fillColor: "#dc2626",
    color: "#ffffff",
    weight: 2,
    opacity: 1,
    fillOpacity: 1,
  }).addTo(map);

  userCircle = L.circle([userLat, userLng], {
    radius: 100,
    color: "#dc2626",
    fill: false,
    weight: 2,
    opacity: 0.5,
  }).addTo(map);

  userMarker.bindPopup("Your Location");
}

function onGeoError(err) {
  map.setView([18.996079, 72.850778], 13);
  if (err.code !== 2) {
    console.warn("Geolocation error:", err.message);
  }
}

map.on("click", e => {
  if (!inContributeMode) return;

  const formBox = document.querySelector("#formBox");
  const formContent = document.querySelector(".form-content");

  const { lat, lng } = e.latlng;
  selectedLat = lat;
  selectedLng = lng;

  if (tempMark) tempMark.remove();
  tempMark = L.marker([lat, lng]).addTo(map);

  setTimeout(() => {
    formBox.classList.add("active");
    formContent.classList.add("active");
  }, 10);

  inContributeMode = false;
});
