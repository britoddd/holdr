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
          const cleaned = lower.replace(/\+/g, "");

          const toNumber = (numStr, unit) => {
            if (!numStr) return null;
            const normalized = numStr.replace(/\./g, "").replace(",", ".");
            const n = parseFloat(normalized);
            if (!Number.isFinite(n)) return null;
            if (unit === "rb" || (!unit && /,/.test(numStr))) return Math.round(n * 1000);
            if (unit === "jt") return Math.round(n * 1_000_000);
            return Math.round(n);
          };

          // Pattern A: "Terjual 1,2rb" or "Terjual 40"
          let match = cleaned.match(/terjual[^\d]*([\d.,]+)\s*(rb|jt)?/);
          if (match) return toNumber(match[1], match[2]);

          // Pattern B: "40 terjual" or "1,2rb terjual"
          match = cleaned.match(/([\d.,]+)\s*(rb|jt)?\s*terjual/);
          if (match) return toNumber(match[1], match[2]);

          // Pattern C: number + rb/jt anywhere
          match = cleaned.match(/([\d.,]+)\s*(rb|jt)\b/);
          if (match) return toNumber(match[1], match[2]);

          return null;
        };

        const NAME_SELECTOR = '[class*="+tnoqZhn89+NHUA43BpiJg=="]';
        const SOLD_SELECTOR = '[class*="u6SfjDD2WiBlNW7zHmzRhQ=="]';
        const PRICE_SELECTORS = [
          '[class*="urMOIDHH7I0Iy1Dv2oFaNw=="]',
          '[class*="YZHqvX+8TVU2YltRC9S+oA=="]',
        ];

        const ensureContainer = (node, up = 8) => {
          let el = node;
          for (let i = 0; i < up && el?.parentElement; i++) {
            el = el.parentElement;
            const hasLink = el.querySelector('a[href*="tokopedia.com"]');
            const hasPrice = PRICE_SELECTORS.some((sel) => el.querySelector(sel));
            if (hasLink && hasPrice) break;
          }
          return el || node;
        };

        const findSoldText = (start) => {
          let el = start;
          for (let i = 0; i < 8 && el; i++) {
            const node = el.querySelector(SOLD_SELECTOR);
            if (node?.innerText) return node.innerText;
            const txt = el.innerText || '';
            if (/terjual/i.test(txt)) return txt;
            el = el.parentElement;
          }
          return null;
        };

        const toArray = (nodeList) => Array.from(nodeList || []);

        const nameNodes = toArray(document.querySelectorAll(NAME_SELECTOR));
        const results = [];
        const seen = new Set();

        for (const nameNode of nameNodes) {
          const container = ensureContainer(nameNode);
          const title = (nameNode.innerText || '').trim();
          if (!title || title.length < 3 || title.length > 200) continue;
          const titleLower = title.toLowerCase();
          const blockedWords = [
            'produk toko',
            'pencarian terkait',
            'iklan',
            'promo',
            'voucher',
            'kupon',
          ];
          if (blockedWords.some((w) => titleLower.includes(w))) continue;

          const link = container.querySelector('a[href*="tokopedia.com"]')?.href || null;
          if (!link || seen.has(link)) continue;

          let priceText = null;
          for (const sel of PRICE_SELECTORS) {
            const priceNode = container.querySelector(sel);
            if (priceNode?.innerText) {
              priceText = priceNode.innerText;
              break;
            }
          }

          if (!priceText) {
            const match = (container.innerText || '').match(/Rp\s?[\d\.]+/);
            priceText = match ? match[0] : null;
          }

          const price = priceText ? normalizeNumber(priceText) : null;
          if (!price || !Number.isFinite(price)) continue;

          const soldText = findSoldText(container);
          const soldCount = soldText ? normalizeSold(soldText) : null;

          results.push({ title, price, url: link, soldCount });
          seen.add(link);
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
