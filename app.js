// Trace App – Geolocation-based crime awareness + OpenMHz scanner integration
// Inspired by CrimeRadar. Centers on user location; pulls live-style calls from OpenMHz when available.

const UM_FLINT = [43.0126, -83.7125];

// Default OpenMHz system (Washtenaw County MPSCS – nearby Michigan example).
// Genesee County does not currently have a public OpenMHz system; many LE talkgroups are encrypted.
// Change OPENMHZ_SHORTNAME to another system shortName from https://openmhz.com/systems if desired.
const OPENMHZ_SHORTNAME = "mpscs81";
const OPENMHZ_API = `https://api.openmhz.com/${OPENMHZ_SHORTNAME}/calls`;

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
let currentCenter = UM_FLINT;
let incidents = [...SAMPLE_INCIDENTS];

document.addEventListener("DOMContentLoaded", () => {
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

  document.getElementById("filterBtn").addEventListener("click", () => {
    document.getElementById("filterPanel").classList.toggle("hidden");
  });
  document.getElementById("clearFilters").addEventListener("click", () => {
    activeFilters = new Set(CRIME_TYPES);
    renderFilters();
    renderIncidents();
  });

  document.getElementById("reportBtn").addEventListener("click", openReportModal);
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
}

function initMap() {
  if (map) return;
  map = L.map("map").setView(UM_FLINT, 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Try geolocation first
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentCenter = [pos.coords.latitude, pos.coords.longitude];
        map.setView(currentCenter, 14);
        updateLocationLabel("Your location");
        L.circleMarker(currentCenter, {
          radius: 8,
          fillColor: "#B7E445",
          color: "#20262E",
          weight: 2,
          fillOpacity: 0.9
        }).addTo(map).bindPopup("<b>You are here</b>");
        loadOpenMHzCalls();
      },
      (err) => {
        console.warn("Geolocation denied or failed:", err.message);
        updateLocationLabel("UM-Flint (fallback)");
        L.marker(UM_FLINT).addTo(map).bindPopup("<b>University of Michigan–Flint</b><br>Campus center");
        loadOpenMHzCalls();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  } else {
    updateLocationLabel("UM-Flint (no geolocation)");
    L.marker(UM_FLINT).addTo(map).bindPopup("<b>University of Michigan–Flint</b><br>Campus center");
    loadOpenMHzCalls();
  }

  // Initial markers from sample data
  incidents.forEach(addMarker);
  renderIncidents();
}

function updateLocationLabel(text) {
  const el = document.querySelector("header p.text-xs");
  if (el) el.textContent = text;
}

function addMarker(inc) {
  const color = inc.severity === "high" ? "#F0A23A" : inc.severity === "medium" ? "#F0A23A" : "#B7E445";
  const marker = L.circleMarker([inc.lat, inc.lng], {
    radius: 10,
    fillColor: color,
    color: "#20262E",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.85
  }).addTo(map);

  marker.bindPopup(`
    <strong>${inc.type}</strong><br>
    ${new Date(inc.time).toLocaleString()}<br>
    ${inc.description}<br>
    <small>Source: ${inc.source}</small><br>
    <button onclick="showDetails(${inc.id})" class="mt-1 text-[#B7E445] text-sm">View Details</button>
  `);
  marker.incident = inc;
  markers.push(marker);
}

function renderIncidents() {
  const list = document.getElementById("incidentList");
  list.innerHTML = "";
  const filtered = incidents.filter(i => activeFilters.has(i.type));
  filtered.sort((a, b) => new Date(b.time) - new Date(a.time));

  filtered.forEach(inc => {
    const el = document.createElement("div");
    el.className = "p-3 rounded-lg bg-[#2a323c]/80 hover:bg-[#323a45] cursor-pointer border border-[#687586]/40 incident-card";
    el.innerHTML = `
      <div class="flex justify-between items-start">
        <span class="font-medium text-sm">${inc.type}</span>
        <span class="text-xs text-[#687586]">${new Date(inc.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
      <p class="text-xs text-[#F4F6F8]/80 mt-1 line-clamp-2">${inc.description}</p>
      <p class="text-xs text-[#687586] mt-1">${inc.source}</p>
    `;
    el.onclick = () => {
      map.setView([inc.lat, inc.lng], 16);
      showDetails(inc.id);
    };
    list.appendChild(el);
  });

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
    label.innerHTML = `<input type="checkbox" ${checked ? "checked" : ""} class="rounded accent-[#B7E445]"> ${type}`;
    label.querySelector("input").onchange = (e) => {
      if (e.target.checked) activeFilters.add(type);
      else activeFilters.delete(type);
      renderIncidents();
    };
    container.appendChild(label);
  });
}

function showDetails(id) {
  const inc = incidents.find(i => i.id === id);
  if (!inc) return;
  document.getElementById("modalTitle").textContent = inc.type;
  document.getElementById("modalBody").innerHTML = `
    <p class="text-sm text-[#F4F6F8]/90 mb-2">${inc.description}</p>
    <p class="text-xs"><strong>Time:</strong> ${new Date(inc.time).toLocaleString()}</p>
    <p class="text-xs"><strong>Location:</strong> Approximate (near current view)</p>
    <p class="text-xs"><strong>Source:</strong> ${inc.source}</p>
    <p class="text-xs mt-2 text-[#687586]">Scanner calls rarely include precise GPS. Location is approximated around your current map center for privacy and practicality.</p>
    <button class="mt-3 text-sm text-[#B7E445]" onclick="alert('Share feature simulated')">Share Alert</button>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

async function loadOpenMHzCalls() {
  const statusEl = document.querySelector("header p.text-xs");
  if (statusEl) statusEl.textContent = "Loading scanner calls…";

  try {
    const res = await fetch(OPENMHZ_API, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const calls = data.calls || data || [];

    // Map recent calls to approximate incidents near current center
    const recent = calls.slice(0, 8);
    recent.forEach((call, idx) => {
      const offsetLat = (Math.random() - 0.5) * 0.04;
      const offsetLng = (Math.random() - 0.5) * 0.04;
      const type = guessTypeFromTalkgroup(call.talkgroupNum || call.talkgroup || "");
      const newInc = {
        id: `omhz-${call._id || Date.now() + idx}`,
        type,
        lat: currentCenter[0] + offsetLat,
        lng: currentCenter[1] + offsetLng,
        time: call.time || new Date().toISOString(),
        description: `Scanner call (talkgroup ${call.talkgroupNum || "unknown"}). Duration ${call.len || "?"}s.`,
        source: "OpenMHz",
        severity: type === "Shooting" || type === "Robbery" ? "high" : "medium"
      };
      incidents.unshift(newInc);
      addMarker(newInc);
    });

    renderIncidents();
    if (statusEl) statusEl.textContent = `Scanner: ${recent.length} calls from ${OPENMHZ_SHORTNAME}`;
  } catch (err) {
    console.warn("OpenMHz fetch failed (CORS or no system):", err);
    if (statusEl) statusEl.textContent = "Scanner unavailable (CORS / no public Genesee feed)";
    // Keep sample data; optionally notify
  }
}

function guessTypeFromTalkgroup(tg) {
  const t = String(tg).toLowerCase();
  if (t.includes("shoot") || t.includes("shots") || t.includes("gun")) return "Shooting";
  if (t.includes("rob") || t.includes("theft")) return "Robbery";
  if (t.includes("assault") || t.includes("fight")) return "Assault";
  return "Other";
}

function openReportModal() {
  document.getElementById("modalTitle").textContent = "Report an Incident";
  document.getElementById("modalBody").innerHTML = `
    <select id="reportType" class="w-full mb-3 px-3 py-2 bg-[#2a323c] rounded-lg border border-[#687586]/40">
      ${CRIME_TYPES.map(t => `<option>${t}</option>`).join("")}
    </select>
    <textarea id="reportDesc" placeholder="Describe what you observed..." class="w-full mb-3 px-3 py-2 bg-[#2a323c] rounded-lg h-24 border border-[#687586]/40"></textarea>
    <button id="submitReport" class="w-full bg-[#B7E445] hover:bg-[#c5ed6a] text-[#20262E] py-2 rounded-lg font-medium">Submit Report</button>
    <p class="text-xs text-[#687586] mt-2">Reports are local-only in this prototype.</p>
  `;
  document.getElementById("modal").classList.remove("hidden");
  document.getElementById("submitReport").onclick = () => {
    const type = document.getElementById("reportType").value;
    const desc = document.getElementById("reportDesc").value || "User-reported incident";
    const newInc = {
      id: Date.now(),
      type,
      lat: currentCenter[0] + (Math.random()-0.5)*0.02,
      lng: currentCenter[1] + (Math.random()-0.5)*0.02,
      time: new Date().toISOString(),
      description: desc,
      source: "User Report",
      severity: "medium"
    };
    incidents.unshift(newInc);
    addMarker(newInc);
    renderIncidents();
    document.getElementById("modal").classList.add("hidden");
    alert("Report submitted (simulated). Pin added near your location.");
  };
}

function openSettingsModal() {
  document.getElementById("modalTitle").textContent = "Settings";
  document.getElementById("modalBody").innerHTML = `
    <div class="space-y-3 text-sm">
      <p><strong>Map center:</strong> ${currentCenter.map(n => n.toFixed(4)).join(", ")} (geolocation or fallback)</p>
      <p><strong>OpenMHz system:</strong> ${OPENMHZ_SHORTNAME} (Washtenaw County example)<br>
      Genesee County has no public OpenMHz system yet. Many police talkgroups are encrypted.</p>
      <p class="text-[#687586]">Endpoint: <code class="text-xs">${OPENMHZ_API}</code></p>
      <p class="text-xs text-[#687586]">Direct browser calls are often blocked by CORS/Cloudflare. A small proxy is needed for reliable production use. Sample incidents remain available.</p>
    </div>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

window.showDetails = showDetails;
