type ScrapeItem = {
  price?: number | null
  soldCount?: number | null
}

export function calculateBestPrice(scrapeResults: ScrapeItem[]): number | null {
  if (!scrapeResults || scrapeResults.length === 0) return null

  const validItems = scrapeResults.filter(
    (item) => item.price !== undefined && item.price !== null && Number.isFinite(item.price) && item.price > 0
  )

  if (validItems.length === 0) return null

  const sorted = [...validItems].sort((a, b) => (a.price as number) - (b.price as number))

  const withWeight = sorted.map((item) => ({
    price: item.price as number,
    weight: ((item.soldCount as number) || 0) + 1,
  }))

  const totalWeight = withWeight.reduce((sum, item) => sum + item.weight, 0)
  const halfWeight = totalWeight / 2

  let cumWeight = 0
  for (const item of withWeight) {
    cumWeight += item.weight
    if (cumWeight >= halfWeight) {
      return item.price
    }
  }

  return sorted[Math.floor(sorted.length / 2)].price as number
}

type FetchMarketPriceParams = {
  name: string
  category?: string
  max?: number
  apiBase?: string
}

export async function fetchMarketPrice({
  name,
  category = "",
  max = 10,
  apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000",
}: FetchMarketPriceParams): Promise<number | null> {
  const base = apiBase.replace(/\/$/, "")

  const queries: string[] = []
  const primary = `${name} ${category}`.trim()
  if (primary) queries.push(primary)
  if (name) queries.push(name)

  // Add a simplified tokenized name query (remove punctuation, collapse spaces)
  const simpleName = String(name)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (simpleName && simpleName !== name) queries.push(simpleName)

  for (const q of queries) {
    const url = `${base}/api/scrape?q=${encodeURIComponent(q)}&max=${max}`
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      const items = Array.isArray(data.items) ? data.items : []

      const tokens = String(name)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2)

      const matchesTitle = (title?: string) => {
        if (!title || tokens.length === 0) return false
        const tl = title.toLowerCase()
        // require at least 2 tokens to match if available, otherwise 1
        let matchCount = 0
        for (const t of tokens) {
          if (tl.includes(t)) matchCount++
        }
        const threshold = tokens.length >= 3 ? 2 : 1
        return matchCount >= threshold
      }

      const filtered = items.filter((it: any) => {
        const title = typeof it.title === "string" ? it.title : ""
        const lower = title.toLowerCase()
        const blocked = ["produk toko", "pencarian terkait", "iklan", "promo", "voucher", "kupon"]
        if (blocked.some((w) => lower.includes(w))) return false
        return matchesTitle(title)
      })

      const best = calculateBestPrice(filtered.length > 0 ? filtered : items)
      if (best !== null) return best
    } catch {
      // try next fallback
    }
  }

  return null
}
