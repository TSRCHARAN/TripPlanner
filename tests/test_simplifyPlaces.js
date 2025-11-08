import assert from "node:assert/strict";
import { simplifyPlaces } from "../services/tripPlannerService.js";

function run() {
  const mock = [
    {
      place_id: "pid123",
      name: "Sample Place",
      rating: 4.2,
      user_ratings_total: 120,
      formatted_address: "1 Test St",
      geometry: { location: { lat: 12.34, lng: 56.78 } },
      formatted_phone_number: "+91-1234567890",
      website: "https://example.com",
      opening_hours: { open_now: true, weekday_text: ["Mon: Open"] },
      types: ["tourist_attraction"],
      price_level: 2,
      photos: [ { photo_reference: "PHOTO123", width: 800, height: 600 } ]
    }
  ];

  const out = simplifyPlaces(mock);
  assert.ok(Array.isArray(out), "should return array");
  const item = out[0];
  assert.strictEqual(item.id, "pid123");
  assert.strictEqual(item.name, "Sample Place");
  assert.strictEqual(item.location.lat, 12.34);
  assert.strictEqual(item.location.lon, 56.78);
  assert.ok(item.thumbnail && item.thumbnail.includes("/api/place-photo"), "thumbnail path should be present");
  assert.strictEqual(item.photos, undefined, "photos array should not be returned in the simplified output");
  assert.strictEqual(item.photosAvailable, true);
  assert.strictEqual(item.photoCount, 1);
  assert.ok(Array.isArray(item.rawTypes) && item.rawTypes.includes("tourist_attraction"));
  assert.strictEqual(item.category, "Attraction");
  assert.strictEqual(item.categoryKey, "tourist_attraction");
  assert.ok(item.opening_hours && item.opening_hours.open_now === true, "opening_hours.open_now should be true");
  assert.strictEqual(item.phone, "+91-1234567890");
  assert.strictEqual(item.website, "https://example.com");

  console.log("simplifyPlaces test passed");
}

run();
