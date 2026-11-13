# Broadcastify Calls Client API – Application Template for Trace

Use this when applying at https://bcfy.io/dev/apply/ (requires a free Broadcastify / RadioReference account).

## Suggested Application Text

**Project name:** Trace – Local Public Safety Awareness (Flint / Genesee County, MI)

**What are you building?**
Trace is a location-based crime awareness web app for residents and students around the University of Michigan–Flint and Genesee County. It displays an interactive map of public safety incidents, filters by type, and shows approximate locations derived from publicly available scanner/dispatch activity.

**Geographic / subject scope (important):**
- Primary: Genesee County, Michigan (ctid 1251) and the Flint metro area
- Secondary / travel: nearby SE Michigan (Wayne, Oakland, Macomb, Washtenaw) when the user is in those areas
- This is a **locally scoped** educational / community awareness tool, not a nationwide or multi-state scanner directory.

**How users will use it:**
- Users open the web app and allow location (or it defaults to UM-Flint).
- The app selects the relevant Broadcastify Calls coverage for that county.
- Recent calls are listed and plotted as approximate map pins (locations are approximate; scanner traffic rarely has precise GPS).
- Users can filter by incident type, view details, and (optionally) listen to public call audio when available.

**Why you need the Calls Client API:**
To pull recent call metadata (talkgroup, timestamp, duration) for Genesee County and nearby systems so the map can show real public-safety activity instead of sample data. Audio playback is optional and only for publicly allowed groups.

**Intended users:**
Local residents, UM-Flint students, and the CSC-510 course project team. Not a commercial consumer product.

**Notes:**
- We understand access is metered / prepaid and reviewed.
- We will only request data for the counties relevant to the user’s current location.
- All data will be clearly labeled as non-official / public scanner-derived.

---

After approval you will receive a developer key. Integrate it server-side (never in the browser). The Cloudflare Worker proxy pattern already in this repo can be extended to call the Broadcastify API with the key.
