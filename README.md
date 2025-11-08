# TripPlanner (backend)

Small Express backend that exposes APIs to plan trips (train/bus) and suggest activities at hubs and destinations using Google Places/Distance APIs.

Quick start

1. Copy environment variables:

   - create a `.env` file from `.env.example` and set `GOOGLE_API_KEY`.

2. Install and run:

   ```powershell
   npm install
   npm run dev
   ```

3. Health check:

   GET http://localhost:3000/api/health

Important endpoints

- POST /api/plan-trip-auto — planner that chooses best transport and builds trip (onward + optional return). Request body: preferences including `fromLocation`, `toLocation`, `startDate`, etc.
- POST /api/plan-trip-with-transport — provide `transportChoice` and `prefs` to build hub/destination activities.
- POST /api/get-transport-options — returns possible transport options for given `start` and `destination`.
- POST /api/get-nearest-hub — provide `{ location: "Place name" }` or `{ location: { lat, lon } }` and optional `mode` (`train` or `bus`) to get nearest hubs.

Notes

- The app expects a Google API key (`GOOGLE_API_KEY`) with access to Geocoding, Places and Distance Matrix APIs.
- The project uses local CSV/JSON data in `data/` for station/bus lists.
- For deployment as serverless, `serverless-http` is already present but the handler export in `server.js` is commented.

Development

- Run the basic test: `npm test` (runs a small unit test for `generateTripSummary`).
