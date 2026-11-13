# Trace

**Trace** is a location-based crime awareness and public safety application designed for residents and students around the University of Michigan–Flint and Genesee County.

Inspired by **CrimeRadar**, it provides an interactive map of incidents, filters by crime type, incident details, user reporting, and live-style police scanner call integration.

This repository was created for the CSC-510 group project.

## Features (Prototype)

- Mock authentication matching the deployed prototype style
- **Geolocation**: centers the map on your current location (falls back to UM-Flint)
- **Location-based scanner selection**: picks the most relevant available public system based on where you are
- Interactive Leaflet map with severity-colored markers
- Incident list + filters by crime type
- View incident details
- Report an incident (local simulation, placed near your location)
- Settings panel with location and data-source status

## Quick Start

```bash
npx serve .
# or
python -m http.server 8080
```

Open `http://localhost:8080`. Sign in with any email/password (prototype only). Allow location for the best experience.

## How Crime Radar Gets Its Data (and How Trace Can Match It)

Crime Radar does **not** have special private police access. It aggregates publicly available sources:

- Live radio scanner / dispatch audio feeds
- Public reports and open safety data
- Then uses automated (AI) processing to transcribe, summarize, and map the activity

Trace currently uses the same public philosophy with OpenMHz (and can be extended to Broadcastify Calls or local open data).

### Current limitations for Flint / Detroit
- Many Genesee County and Detroit-area police talkgroups are encrypted.
- OpenMHz has sparse public coverage near you (Washtenaw is the closest reliable system).
- Direct browser calls hit CORS/Cloudflare walls.
- Precise GPS is rare on scanner traffic; locations are approximate.

### Paths to Crime Radar-level access
1. **Broadcastify Calls** (best local option)  
   Genesee County has an active MPSCS ingest node. Broadcastify offers a Client API for approved, locally-scoped apps. Apply at their developer portal if you want real call metadata + audio for Genesee or Wayne.

2. **OpenMHz + proxy**  
   Add a tiny backend (Cloudflare Worker or Node) that fetches `https://api.openmhz.com/{shortName}/calls` and returns it to the frontend. This bypasses CORS.

3. **Local open data / blotters**  
   Flint PD and Genesee Sheriff publish summary stats and FOIA-able records. Real-time geocoded incidents are limited, but daily blotters or CAD exports (when available) can be added.

4. **Full pipeline (advanced)**  
   Record public scanner audio → transcribe (Whisper or similar) → extract locations/codes → geocode → drop pins. This is essentially what Crime Radar and projects like Blotter do.

The prototype already structures incidents so any of these sources can be swapped in.

## Project Background

From the CSC-510 group (Emily Grey, Miah McQuiller, Xzander-Liyon Smith, Michael Kelbert):

- Focus on making public crime/safety information accessible via map + filters.
- Privacy-conscious (approximate locations).
- Initial focus: Flint / UM-Flint.
- Key tasks defined in Phase 4A: report crime, set geoboundary, filter, share alerts, view details, etc.

See the shared Google Drive “CSC-510 Group” folder for full project documents, Figma prototypes, and phase deliverables.

## License

Prototype for educational / course use. Map tiles © OpenStreetMap contributors.
