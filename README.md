# Trace

**Trace** is a location-based crime awareness and public safety application designed for residents and students around the University of Michigan–Flint and Genesee County.

Inspired by **CrimeRadar**, it provides an interactive map of incidents, filters by crime type, incident details, user reporting, and live-style police scanner call integration via OpenMHz.

This repository was created for the CSC-510 group project.

## Features (Prototype)

- Mock authentication matching the deployed prototype style
- **Geolocation**: centers the map on your current location (falls back to UM-Flint)
- Interactive Leaflet map with severity-colored markers
- Incident list + filters by crime type
- View incident details
- Report an incident (local simulation, placed near your location)
- **OpenMHz integration**: attempts to load recent scanner calls and place approximate pins
- Settings panel with location and API status

## Quick Start

```bash
npx serve .
# or
python -m http.server 8080
```

Open `http://localhost:8080`. Sign in with any email/password (prototype only).

Allow location permission when prompted for the best experience.

## OpenMHz Scanner Integration

The app tries to fetch recent calls from an OpenMHz system:

- Default system: `mpscs81` (MPSCS Washtenaw County – nearby Michigan example)
- Endpoint: `https://api.openmhz.com/{shortName}/calls`
- Calls are mapped to approximate locations around your current map center (radio calls rarely include precise GPS)

**Notes:**
- Genesee County does not currently have a public OpenMHz system. Many local police talkgroups are encrypted.
- Direct browser requests are frequently blocked by CORS or Cloudflare. The app falls back gracefully to sample incidents.
- For reliable production use, add a small backend proxy (Cloudflare Worker, Node, etc.).

Other Michigan systems exist on OpenMHz (Macomb, Berrien, Kalamazoo, Houghton, University of Michigan, etc.). Change `OPENMHZ_SHORTNAME` in `app.js` to experiment.

## Project Background

From the CSC-510 group (Emily Grey, Miah McQuiller, Xzander-Liyon Smith, Michael Kelbert):

- Focus on making public crime/safety information accessible via map + filters.
- Privacy-conscious (approximate locations).
- Initial focus: Flint / UM-Flint.
- Key tasks defined in Phase 4A: report crime, set geoboundary, filter, share alerts, view details, etc.

See the shared Google Drive “CSC-510 Group” folder for full project documents, Figma prototypes, and phase deliverables.

## License

Prototype for educational / course use. Map tiles © OpenStreetMap contributors.
