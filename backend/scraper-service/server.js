const express = require("express");
const cors = require("cors");
const { scrapeTokopediaSearch } = require("../tokopedia-scraper/scrape");

const app = express();
const port = 4050;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "scraper-service" });
});

// Scrape endpoint - runs with headless: false for local GUI
app.get("/api/scrape", async (req, res) => {
  const query = (req.query.q || req.query.query || "").toString().trim();
  const maxItems = Number(req.query.max || req.query.limit || 20);

  if (!query) {
    return res.status(400).json({ error: "Missing query parameter 'q'" });
  }

  const safeMax =
    Number.isFinite(maxItems) && maxItems > 0 ? Math.min(maxItems, 50) : 20;

  try {
    console.log(`Scraping: "${query}" (max ${safeMax} items)`);
    // Run with headless: false since this is local with GUI
    const items = await scrapeTokopediaSearch(query, {
      maxItems: safeMax,
      headless: false,
    });
    const response = { query, count: items.length, items };
    console.log(`Scrape complete: ${items.length} items found`);
    console.log("Response:", JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error("Scraper error:", error.message);
    res.status(500).json({ error: "Scrape failed", detail: error.message });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🔍 Scraper Service listening on http://0.0.0.0:${port}`);
  console.log(`Available at: http://192.168.18.91:${port} (from LAN)`);
});
