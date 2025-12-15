const express = require("express");
const cors = require("cors");
const multer = require("multer");
const app = express();
const port = 3000;

// URL of local scraper service (runs with headless: false on user's machine)
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || "http://localhost:3001";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Route to upload item image
app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Convert buffer to base64 data URL
    const base64Image = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    res.json({
      success: true,
      imageUrl: dataUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Example route for image analysis (if needed later)
app.post("/api/analyze-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Placeholder for image analysis logic
    // const result = await analyzeImage(req.file.buffer)

    res.json({
      label: "Sample Item",
      category: "Other",
      keywords: [],
      confidence: 0.5,
      needsManualInput: true,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Scrape Tokopedia search results via local scraper service
app.get("/api/scrape", async (req, res) => {
  const query = (req.query.q || req.query.query || "").toString().trim();
  const maxItems = Number(req.query.max || req.query.limit || 20);

  if (!query) {
    return res.status(400).json({ error: "Missing query parameter 'q'" });
  }

  const safeMax =
    Number.isFinite(maxItems) && maxItems > 0 ? Math.min(maxItems, 50) : 20;

  try {
    // Forward request to local scraper service
    const url = `${SCRAPER_SERVICE_URL}/api/scrape?q=${encodeURIComponent(query)}&max=${safeMax}`;
    console.log(`Forwarding scrape request to: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Scraper service error: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Scraper response:", JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error("Scrape API error:", error.message);
    res.status(500).json({ 
      error: "Scrape failed", 
      detail: error.message,
      hint: "Make sure the scraper service is running on port 3001: node backend/scraper-service/server.js"
    });
  }
});

app.get("/", (req, res) => {
  res.send("3001 mas, bukan 3000");
});

app.listen(port, () => {
  console.log(`Backend API listening on port ${port}`);
});
