import axios from "axios";

export async function placePhoto(req, res, next) {
  try {
    const ref = req.query.ref || req.query.photoRef;
    const maxwidth = req.query.maxwidth || req.query.maxWidth || 400;
    const API_KEY = process.env.GOOGLE_API_KEY;

    if (!ref) return res.status(400).json({ message: "Missing photo ref (ref)" });
    if (!API_KEY) return res.status(500).json({ message: "Server missing GOOGLE_API_KEY" });

    // Fetch from Google Places Photo API and stream directly to client (no server-side caching)
    const url = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${encodeURIComponent(ref)}&maxwidth=${encodeURIComponent(maxwidth)}&key=${API_KEY}`;

    const response = await axios.get(url, { responseType: "stream" });

    res.setHeader("Content-Type", response.headers["content-type"] || "image/jpeg");
    // Let clients cache as they want; server won't persist images
    res.setHeader("Cache-Control", "public, max-age=3600");
    return response.data.pipe(res);
  } catch (err) {
    // Google may redirect to an image url; if axios followed and returned 200, it's streamed.
    console.error("Photo proxy error:", err.message);
    return res.status(502).json({ message: "Unable to fetch photo" });
  }
}
