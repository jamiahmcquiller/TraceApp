// Trace App – Location-based crime awareness + dynamic OpenMHz
// Centers on user location and selects the closest available OpenMHz system.
// Data model matches Crime Radar style (public scanner + approximate mapping).

const UM_FLINT = [43.0126, -83.7125];

// Optional: set this to your deployed Cloudflare Worker URL to bypass CORS.
// Example: "https://trace-openmhz-proxy.your-name.workers.dev"
// Leave empty to try direct (will usually fail due to CORS).
const PROXY_URL = ""; // e.g. "https://trace-proxy.workers.dev"

const OPENMHZ_SYSTEMS = [
  { shortName: "mpscs81", name: "MPSCS Washtenaw County", lat: 42.28, lng: -83.74, note: "Ann Arbor / SE Michigan" },
  { shortName: "hocops", name: "Houghton County PoliceFireEMS", lat: 47.12, lng: -88.57, note: "Upper Peninsula" },
];

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
let activeSystem = OPENMHZ_SYSTEMS[0];

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

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function selectSystemForLocation(lat, lng) {
  if (lat > 42.8 && lat < 43.3 && lng > -84.1 && lng < -83.3) {
    return { ...OPENMHZ_SYSTEMS[0], name: "Washtenaw (Flint-area fallback)", note: "No public Genesee OpenMHz system" };
  }
  if (lat > 42.1 && lat < 42.6 && lng > -83.4 && lng < -82.7) {
    return { ...OPENMHZ_SYSTEMS[0], name: "Washtenaw (Detroit-metro fallback)", note: "Closest public system to Detroit" };
  }
  let best = OPENMHZ_SYSTEMS[0];
  let bestDist = Infinity;
  for (const sys of OPENMHZ_SYSTEMS) {
    const d = haversineKm(lat, lng, sys.lat, sys.lng);
    if (d < bestDist) {
      bestDist = d;
      best = sys;
    }
  }
  return best;
}

function initMap() {
  if (map) return;
  map = L.map("map").setView(UM_FLINT, 14);

  // Fix OSM 403: OpenStreetMap now requires a valid Referer header
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    referrerPolicy: "strict-origin-when-cross-origin",
    maxZoom: 19
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentCenter = [pos.coords.latitude, pos.coords.longitude];
        activeSystem = selectSystemForLocation(currentCenter[0], currentCenter[1]);
        map.setView(currentCenter, 14);
        updateLocationLabel(`${activeSystem.name}`);
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
        activeSystem = selectSystemForLocation(UM_FLINT[0], UM_FLINT[1]);
        updateLocationLabel(`UM-Flint • ${activeSystem.name}`);
        L.marker(UM_FLINT).addTo(map).bindPopup("<b>University of Michigan–Flint</b><br>Campus center");
        loadOpenMHzCalls();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  } else {
    activeSystem = selectSystemForLocation(UM_FLINT[0], UM_FLINT[1]);
    updateLocationLabel(`UM-Flint • ${activeSystem.name}`);
    L.marker(UM_FLINT).addTo(map).bindPopup("<b>University of Michigan–Flint</b><br>Campus center");
    loadOpenMHzCalls();
  }

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
    <p class="text-xs mt-2 text-[#687586]">Not an official report. Based on public scanner-style data (like Crime Radar). Verify with official sources. Locations are approximate.</p>
    <button class="mt-3 text-sm text-[#B7E445]" onclick="alert('Share feature simulated')">Share Alert</button>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

function buildCallDescription(call) {
  const tg = call.talkgroupNum || call.talkgroup || "unknown";
  const len = call.len || call.duration || "?";
  const type = guessTypeFromTalkgroup(tg);
  const templates = [
    `Recent ${type.toLowerCase()} related scanner traffic on talkgroup ${tg} (${len}s).`,
    `Dispatch activity recorded on talkgroup ${tg}. Duration ${len} seconds.`,
    `Public safety call (talkgroup ${tg}) – possible ${type.toLowerCase()} activity.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

async function loadOpenMHzCalls() {
  const statusEl = document.querySelector("header p.text-xs");
  if (statusEl) statusEl.textContent = `Loading recent calls from ${activeSystem.name}…`;

  const direct = `https://api.openmhz.com/${activeSystem.shortName}/calls`;
  const api = PROXY_URL
    ? `${PROXY_URL.replace(/\/$/, "")}?shortName=${encodeURIComponent(activeSystem.shortName)}`
    : direct;

  try {
    const res = await fetch(api, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const calls = data.calls || data || [];

    // Take the most recent calls and turn them into incidents near the user
    const recent = calls.slice(0, 12);
    let added = 0;
    recent.forEach((call, idx) => {
      // Skip if we already have a similar ID
      const id = `omhz-${call._id || call.id || Date.now() + idx}`;
      if (incidents.some(i => i.id === id)) return;

      const offsetLat = (Math.random() - 0.5) * 0.035;
      const offsetLng = (Math.random() - 0.5) * 0.035;
      const type = guessTypeFromTalkgroup(call.talkgroupNum || call.talkgroup || "");
      const newInc = {
        id,
        type,
        lat: currentCenter[0] + offsetLat,
        lng: currentCenter[1] + offsetLng,
        time: call.time || new Date().toISOString(),
        description: buildCallDescription(call),
        source: `OpenMHz (${activeSystem.shortName})`,
        severity: type === "Shooting" || type === "Robbery" ? "high" : "medium"
      };
      incidents.unshift(newInc);
      addMarker(newInc);
      added++;
    });

    renderIncidents();
    if (statusEl) {
      statusEl.textContent = added
        ? `${added} recent call-based incidents • ${activeSystem.name}`
        : `No new calls • ${activeSystem.name}`;
    }
  } catch (err) {
    console.warn("OpenMHz fetch failed:", err);
    if (statusEl) {
      statusEl.textContent = PROXY_URL
        ? `${activeSystem.name} proxy error`
        : `${activeSystem.name} unavailable (CORS – set PROXY_URL)`;
    }
  }
}

function guessTypeFromTalkgroup(tg) {
  const t = String(tg).toLowerCase();
  if (t.includes("shoot") || t.includes("shots") || t.includes("gun") || t.includes("weapon")) return "Shooting";
  if (t.includes("rob") || t.includes("theft") || t.includes("burglar")) return "Robbery";
  if (t.includes("assault") || t.includes("fight") || t.includes("battery")) return "Assault";
  if (t.includes("fire") || t.includes("ems") || t.includes("medical")) return "Other";
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
  document.getElementById("modalTitle").textContent = "Settings & Data Sources";
  document.getElementById("modalBody").innerHTML = `
    <div class="space-y-3 text-sm">
      <p><strong>Map center:</strong> ${currentCenter.map(n => n.toFixed(4)).join(", ")}</p>
      <p><strong>Active system:</strong> ${activeSystem.name} (${activeSystem.shortName})<br>
      ${activeSystem.note || ""}</p>
      <p class="text-[#687586]">Proxy: <code class="text-xs">${PROXY_URL || "(none – direct / CORS limited)"}</code></p>
      <hr class="border-[#687586]/40">
      <p class="text-xs"><strong>Recent incidents</strong> are generated from incoming scanner calls when the proxy (or direct fetch) succeeds. Locations stay approximate.</p>
      <p class="text-xs"><strong>Crime Radar-style access:</strong> Public scanner audio + automated summaries (not official police data). See README and broadcastify-application-template.md for next steps.</p>
    </div>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

window.showDetails = showDetails;
