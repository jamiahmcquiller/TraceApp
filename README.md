# Trace

**Trace** is a location-based crime awareness and public safety application designed for residents and students around the University of Michigan–Flint and Genesee County.

Inspired by **CrimeRadar**, it provides an interactive map of incidents, filters by crime type, incident details, user reporting, and live-style police scanner call integration via OpenMHz.

This repository was created for the CSC-510 group project.

## Features (Prototype)

- Mock authentication matching the deployed prototype style
- **Geolocation**: centers the map on your current location (falls back to UM-Flint)
- **Location-based OpenMHz**: automatically selects the most relevant available scanner system based on where you are (Flint area, Detroit metro, etc.)
- Interactive Leaflet map with severity-colored markers
- Incident list + filters by crime type
- View incident details
- Report an incident (local simulation, placed near your location)
- Settings panel with location and active system status

## Quick Start

```bash
npx serve .
# or
python -m http.server 8080
```

Open `http://localhost:8080`. Sign in with any email/password (prototype only).

Allow location permission when prompted. The map and scanner system will adapt to your position.

## OpenMHz Scanner Integration

The app selects an OpenMHz system based on your location and tries to load recent calls:

- Flint / Genesee area → Washtenaw County fallback (`mpscs81`) — no public Genesee system exists
- Detroit metro → Washtenaw County fallback (closest public system; no dedicated Detroit/Wayne OpenMHz feed currently)
- Other locations → closest known system (Washtenaw, Houghton, etc.)

Calls are mapped to approximate locations around your current map center (radio calls rarely include precise GPS).

**Notes:**
- Many police talkgroups in Genesee County and the Detroit area are encrypted.
- Direct browser requests are frequently blocked by CORS or Cloudflare. The app falls back gracefully to sample incidents.
- For reliable production use, add a small backend proxy (Cloudflare Worker, Node, etc.).
- More systems can be added to the `OPENMHZ_SYSTEMS` array in `app.js` as they become available on OpenMHz.

## Project Background

From the CSC-510 group (Emily Grey, Miah McQuiller, Xzander-Liyon Smith, Michael Kelbert):

- Focus on making public crime/safety information accessible via map + filters.
- Privacy-conscious (approximate locations).
- Initial focus: Flint / UM-Flint.
- Key tasks defined in Phase 4A: report crime, set geoboundary, filter, share alerts, view details, etc.

See the shared Google Drive “CSC-510 Group” folder for full project documents, Figma prototypes, and phase deliverables.

## License

Prototype for educational / course use. Map tiles © OpenStreetMap contributors.
