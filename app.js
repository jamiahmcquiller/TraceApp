// Trace App – Crime Awareness for Flint / UM-Flint
// Inspired by CrimeRadar. Connects to public scanner-style data (OpenMHz-compatible structure).
// Mock auth + sample incidents for prototype. Real API integration ready.

const UM_FLINT = [43.0126, -83.7125];

const SAMPLE_INCIDENTS = [
  { id: 1, type: "Shooting", lat: 43.015, lng: -83.70, time: "2026-11-13T14:22:00Z", description: "Shots fired reported near campus area. Units responding.", source: "Scanner Feed", severity: "high" },
  { id: 2, type: "Robbery", lat: 43.008, lng: -83.72, time: "2026-11-13T13:45:00Z", description: "Armed robbery at convenience store on University Ave.", source: "Official Report", severity: "high" },
  { id: 3, type: "Assault", lat: 43.018, lng: -83.705, time: "2026-11-13T12:10:00Z", description: "Assault reported outside residence hall.", source: "User Report", severity: "medium" },
  { id: 4, type: "Theft", lat: 43.010, lng: -83.718, time: "2026-11-13T11:30:00Z", description: "Vehicle break-in in parking structure.", source: "Scanner Feed", severity: "low" },
  { id: 5, type: "Vandalism", lat: 43.005, lng: -83.715, time: "2026-11-13T10:15:00Z", description: "Graffiti and property damage near downtown.", source: "Official Report", severity: "low" },
  { id: 6, type: "Shooting", lat: 43.020, lng: -83.695, time: "2026-11-12T22:40:00Z", description: "Earlier shots fired call. Scene secured.", source: "Scanner Feed", severity: "high" },
];

const CRIME_TYPES = ["Shooting", "Robbery", "Assault", "Theft", "Vandalism", "Burglary", "Other"];

let map, markers = [], activeFilters = new Set(CRIME_TYPES), user = null;

document.addEventListener("DOMContentLoaded", () => {
  // Auth
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    user = { email: document.getElementById("email").value };
    showApp();
  });
  document.getElementById("showCreate").addEventListener("click", () => alert("Account creation is simulated in this prototype."));
  document.getElementById("logoutBtn").addEventListener("click", () => {
    user = null;
    document.getElementById("app").classList.add("hidden");
    document.getElementById("authScreen").classList.remove("hidden");
  });

  // Filters
  document.getElementById("filterBtn").addEventListener("click", () => {
    document.getElementById("filterPanel").classList.toggle("hidden");
  });
  document.getElementById("clearFilters").addEventListener("click", () => {
    activeFilters = new Set(CRIME_TYPES);
    renderFilters();
    renderIncidents();
  });

  // Report
  document.getElementById("reportBtn").addEventListener("click", openReportModal);

  // Settings
  document.getElementById("settingsBtn").addEventListener("click", openSettingsModal);

  document.getElementById("modalClose").addEventListener("click", () => {
    document.getElementById("modal").classList.add("hidden");
  });

  renderFilters();
});

function showApp() {
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  initMap();
  renderIncidents();
}

function initMap() {
  if (map) return;
  map = L.map("map").setView(UM_FLINT, 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Campus marker
  L.marker(UM_FLINT).addTo(map)
    .bindPopup("<b>University of Michigan–Flint</b><br>Campus center");

  SAMPLE_INCIDENTS.forEach(addMarker);
}

function addMarker(inc) {
  const color = inc.severity === "high" ? "red" : inc.severity === "medium" ? "orange" : "yellow";
  const marker = L.circleMarker([inc.lat, inc.lng], {
    radius: 10,
    fillColor: color,
    color: "#fff",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8
  }).addTo(map);

  marker.bindPopup(`
    <strong>${inc.type}</strong><br>
    ${new Date(inc.time).toLocaleString()}<br>
    ${inc.description}<br>
    <small>Source: ${inc.source}</small><br>
    <button onclick="showDetails(${inc.id})" class="mt-1 text-red-400 text-sm">View Details</button>
  `);
  marker.incident = inc;
  markers.push(marker);
}

function renderIncidents() {
  const list = document.getElementById("incidentList");
  list.innerHTML = "";
  const filtered = SAMPLE_INCIDENTS.filter(i => activeFilters.has(i.type));
  filtered.sort((a,b) => new Date(b.time) - new Date(a.time));

  filtered.forEach(inc => {
    const el = document.createElement("div");
    el.className = "p-3 rounded-lg bg-slate-700/60 hover:bg-slate-700 cursor-pointer border border-slate-600";
    el.innerHTML = `
      <div class="flex justify-between items-start">
        <span class="font-medium text-sm">${inc.type}</span>
        <span class="text-xs text-slate-400">${new Date(inc.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
      <p class="text-xs text-slate-300 mt-1 line-clamp-2">${inc.description}</p>
      <p class="text-xs text-slate-500 mt-1">${inc.source}</p>
    `;
    el.onclick = () => {
      map.setView([inc.lat, inc.lng], 16);
      showDetails(inc.id);
    };
    list.appendChild(el);
  });

  // Update markers visibility
  markers.forEach(m => {
    if (activeFilters.has(m.incident.type)) m.addTo(map);
    else map.removeLayer(m);
  });
}

function renderFilters() {
  const container = document.getElementById("filterOptions");
  container.innerHTML = "";
  CRIME_TYPES.forEach(type => {
    const label = document.createElement("label");
    label.className = "flex items-center gap-2 cursor-pointer";
    const checked = activeFilters.has(type);
    label.innerHTML = `<input type="checkbox" ${checked ? "checked" : ""} class="rounded"> ${type}`;
    label.querySelector("input").onchange = (e) => {
      if (e.target.checked) activeFilters.add(type);
      else activeFilters.delete(type);
      renderIncidents();
    };
    container.appendChild(label);
  });
}

function showDetails(id) {
  const inc = SAMPLE_INCIDENTS.find(i => i.id === id);
  if (!inc) return;
  document.getElementById("modalTitle").textContent = inc.type;
  document.getElementById("modalBody").innerHTML = `
    <p class="text-sm text-slate-300 mb-2">${inc.description}</p>
    <p class="text-xs"><strong>Time:</strong> ${new Date(inc.time).toLocaleString()}</p>
    <p class="text-xs"><strong>Location:</strong> Near UM-Flint / Genesee County</p>
    <p class="text-xs"><strong>Source:</strong> ${inc.source}</p>
    <p class="text-xs mt-2 text-slate-400">Approximate location shown for privacy. Connect real OpenMHz or local open data feeds for live calls.</p>
    <button class="mt-3 text-sm text-red-400" onclick="alert('Share feature simulated – see Phase 4A tasks')">Share Alert</button>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

function openReportModal() {
  document.getElementById("modalTitle").textContent = "Report an Incident";
  document.getElementById("modalBody").innerHTML = `
    <select id="reportType" class="w-full mb-3 px-3 py-2 bg-slate-700 rounded-lg">
      ${CRIME_TYPES.map(t => `<option>${t}</option>`).join("")}
    </select>
    <textarea id="reportDesc" placeholder="Describe what you observed..." class="w-full mb-3 px-3 py-2 bg-slate-700 rounded-lg h-24"></textarea>
    <button id="submitReport" class="w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg">Submit Report</button>
    <p class="text-xs text-slate-500 mt-2">Reports are local-only in this prototype. In production they would be moderated and optionally shared with official channels.</p>
  `;
  document.getElementById("modal").classList.remove("hidden");
  document.getElementById("submitReport").onclick = () => {
    const type = document.getElementById("reportType").value;
    const desc = document.getElementById("reportDesc").value || "User-reported incident";
    const newInc = {
      id: Date.now(),
      type,
      lat: UM_FLINT[0] + (Math.random()-0.5)*0.02,
      lng: UM_FLINT[1] + (Math.random()-0.5)*0.02,
      time: new Date().toISOString(),
      description: desc,
      source: "User Report",
      severity: "medium"
    };
    SAMPLE_INCIDENTS.unshift(newInc);
    addMarker(newInc);
    renderIncidents();
    document.getElementById("modal").classList.add("hidden");
    alert("Report submitted (simulated). Pin added to map.");
  };
}

function openSettingsModal() {
  document.getElementById("modalTitle").textContent = "Settings";
  document.getElementById("modalBody").innerHTML = `
    <div class="space-y-3 text-sm">
      <p><strong>Saved Location:</strong> University of Michigan–Flint / Flint, MI</p>
      <p><strong>Notifications:</strong> Simulated – enable alerts for shooting/robbery near campus.</p>
      <p class="text-slate-400">API Status: Ready for OpenMHz / public scanner feeds.<br>
      Example endpoint: <code class="text-xs">https://api.openmhz.com/{shortName}/calls</code></p>
      <p class="text-xs text-slate-500">See README for connecting real police scanner call data (OpenMHz, Broadcastify Calls, or local open data).</p>
    </div>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

// Global for popup buttons
window.showDetails = showDetails;