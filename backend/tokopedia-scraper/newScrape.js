const { chromium } = require("playwright");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function scrapeTokopediaSearch(query, options = {}) {
  const {
    maxItems = 20,
    headless = false,
    scrollAttempts = 6,
    scrollDelayMs = 1200,
  } = options;

  const browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 50,
  });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 768 },
    locale: "id-ID",
    extraHTTPHeaders: {
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(30000);

  const url = `https://www.tokopedia.com/search?q=${encodeURIComponent(query)}`;
  console.log("Opening:", url);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Human interaction
    await page.waitForTimeout(1500);
    await page.mouse.move(200, 200);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(1500);

    const collected = [];
    const seen = new Set();

    for (let i = 0; i < scrollAttempts && collected.length < maxItems; i++) {
      console.log(`Scroll attempt ${i + 1}/${scrollAttempts}`);

      const items = await page.evaluate(() => {
        const normalizeNumber = (text) => {
          if (!text) return null;
          const digits = text.replace(/[^\d]/g, "");
          return digits ? Number(digits) : null;
        };

        const normalizeSold = (text) => {
          if (!text) return null;
          const lower = text.toLowerCase();
          // Handles: "Terjual 123", "Terjual 1,2rb", "Terjual 1rb+", "Terjual 3 jt"
          const match = lower.match(/terjual[^\d]*([\d.,]+)\s*(rb|jt)?/);
          if (!match) return null;
          const digits = match[1].replace(/[^\d]/g, "");
          if (!digits) return null;
          const unit = match[2];
          let n = Number(digits);
          if (!Number.isFinite(n)) return null;
          if (unit === "rb") n *= 1000;
          if (unit === "jt") n *= 1_000_000;
          return n;
        };

        const results = [];

        // Find ALL elements containing price-like text
        const priceNodes = Array.from(document.querySelectorAll("*")).filter(
          (el) =>
            el.innerText &&
            el.innerText.includes("Rp") &&
            el.innerText.match(/Rp\s?[\d\.]+/)
        );

        const promoWords = [
          "gratis",
          "ongkir",
          "promo",
          "filter",
          "%",
          "voucher",
          "kupon",
        ];
        const isPromoText = (text) => {
          const lower = text.toLowerCase();
          return promoWords.some((w) => lower.includes(w));
        };

        for (const node of priceNodes) {
          // Walk up the DOM to find a reasonable container
          let container = node;
          for (let i = 0; i < 6; i++) {
            if (!container.parentElement) break;
            container = container.parentElement;
          }

          const text = container.innerText;
          const priceMatch = text.match(/Rp\s?[\d\.]+/);
          if (!priceMatch) continue;

          const link = container.querySelector("a[href]")?.href || null;
          if (!link) continue;
          // skip non-product links
          if (!link.includes("tokopedia.com")) continue;

          const title = text.split("\n")[0]?.trim() || null;
          if (!title) continue;
          if (title.length < 3 || title.length > 200) continue;
          if (isPromoText(title)) continue;

          const soldCount = normalizeSold(text);

          results.push({
            title,
            price: normalizeNumber(priceMatch[0]),
            url: link,
            soldCount,
          });
        }

        return results;
      });

      console.log("Raw extracted items:", items.length);
      if (items.length > 0) {
        console.log("Sample item:", items[0]);
      }

      console.log(`Found ${items.length} raw items this scroll`);

      for (const item of items) {
        if (!seen.has(item.url) && collected.length < maxItems) {
          seen.add(item.url);
          collected.push(item);
        }
      }

      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(scrollDelayMs);
    }

    // ALWAYS dump debug info
    const html = await page.content();
    console.log("HTML length:", html.length);

    if (collected.length === 0) {
      await page.screenshot({ path: "debug.png", fullPage: true });
      console.warn("No items collected. Screenshot saved as debug.png");
    }

    return collected;
  } catch (err) {
    console.error("Scrape error:", err.message);

    try {
      await page.screenshot({ path: "error.png", fullPage: true });
      console.error("Saved error.png");
    } catch {}

    throw err;
  } finally {
    await browser.close();
  }
}

// CLI runner
if (require.main === module) {
  const query = process.argv[2] || "iphone 12";
  const max = Number(process.argv[3]) || 20;

  scrapeTokopediaSearch(query, { maxItems: max })
    .then((items) => {
      console.log("\nRESULT:");
      console.log(JSON.stringify(items, null, 2));
    })
    .catch(() => process.exit(1));
}

module.exports = { scrapeTokopediaSearch };
