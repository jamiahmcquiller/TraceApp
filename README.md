# Trace

**Trace** is a location-based crime awareness and public safety application designed for residents and students around the University of Michigan–Flint and Genesee County.

Inspired by **CrimeRadar**, it provides an interactive map of incidents, filters by crime type, incident details, user reporting, and a structure ready for live police scanner / dispatch call data.

This repository was created for the CSC-510 group project.

## Features (Prototype)

- Mock authentication matching the deployed prototype style
- Interactive Leaflet map centered on UM-Flint
- Incident list + map markers with severity colors
- Filters by crime type (Shooting, Robbery, Assault, Theft, etc.)
- View incident details
- Report an incident (local simulation)
- Settings / notifications placeholder
- Ready for OpenMHz-style scanner call API integration

## Quick Start

```bash
# Serve locally (any static server)
npx serve .
# or
python -m http.server 8080
```

Open `http://localhost:8080` (or the port shown).

Sign in with any email/password (prototype only).

## Connecting Real Police Scanner / Call Data

Trace is structured to ingest call metadata similar to open-source scanner platforms:

- **OpenMHz** (open source: [openmhz/trunk-server](https://github.com/openmhz/trunk-server))  
  Public API pattern: `https://api.openmhz.com/{shortName}/calls`  
  (Note: Cloudflare protection may require a backend proxy.)

- **Broadcastify Calls** – managed ingest for P25 systems (Genesee County has nodes on Michigan’s MPSCS).

- Local open data / police blotters for historical incidents.

To integrate:
1. Add a small backend proxy (Node/Express, Cloudflare Worker, etc.) that fetches from the scanner API.
2. Map the returned call objects to the incident format used in `app.js` (`type`, `lat`/`lng` if available, `time`, `description`, `source`).
3. Replace or merge with `SAMPLE_INCIDENTS`.

## Project Background

From the CSC-510 group (Emily Grey, Miah McQuiller, Xzander-Liyon Smith, Michael Kelbert):

- Focus on making public crime/safety information accessible via map + filters.
- Privacy-conscious (approximate locations).
- Initial focus: Flint / UM-Flint.
- Key tasks defined in Phase 4A: report crime, set geoboundary, filter, share alerts, view details, etc.

See the shared Google Drive “CSC-510 Group” folder for full project documents, Figma prototypes, and phase deliverables.

## License

Prototype for educational / course use. Map tiles © OpenStreetMap contributors.
