import axios from "axios";

export async function safeFetch(url, opts = {}) {
  try {
    // support axios.post via opts.method & opts.data
    if (opts && opts.method && opts.method.toUpperCase() === "POST") {
      const res = await axios.post(url, opts.data, { headers: opts.headers || { "Content-Type":"application/json" } });
      return res.data;
    }
    const res = await axios.get(url, { params: opts.params, headers: opts.headers });
    return res.data;
  } catch (err) {
    console.error("safeFetch error:", err.message || err);
    return null;
  }
}
