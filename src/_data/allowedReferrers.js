// The referrer allow list that keeps private Home Assistant and ESPHome URLs
// out of our analytics. Downloaded on every build and exposed to templates as
// `allowedReferrers`.
//
// This never fails the build: if the download or the payload is bad we use an
// empty list, which makes the analytics snippet replace every referrer.

const SOURCE_URL = "https://www.openhomefoundation.org/allowed-referrers.json";

module.exports = async function () {
  try {
    const response = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "improv-wifi-website-build" },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.some((entry) => typeof entry !== "string")) {
      throw new Error("payload is not an array of strings");
    }

    const referrers = payload
      .map((entry) => entry.trim().toLowerCase().replace(/\.$/, ""))
      .filter((entry) => entry.length > 0);
    console.log(`[allowed-referrers] loaded ${referrers.length} domains`);
    return referrers;
  } catch (err) {
    console.warn(`[allowed-referrers] ${err.message}, using an empty list`);
    return [];
  }
};
