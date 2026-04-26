type ScrapeItem = {
  price?: number | null
  soldCount?: number | null
}

export type MarketPriceData = {
  bestPrice: number | null
  items: ScrapeItem[]
  averageSoldCount: number
  totalListings: number
}

/**
 * Calculate how easy it is to sell an item based on price and market demand
 * Returns a score from 0-100:
 * - 80-100: Very Easy to Sell
 * - 60-79: Easy to Sell
 * - 40-59: Moderate
 * - 20-39: Hard to Sell
 * - 0-19: Very Hard to Sell
 */
export function calculateSellability(price: number, scrapeData: ScrapeItem[]): number {
  if (!scrapeData || scrapeData.length === 0) return 50 // neutral if no data

  const validItems = scrapeData.filter(
    (item) => item.price && item.price > 0 && item.soldCount !== undefined && item.soldCount !== null
  )

  if (validItems.length === 0) return 50

  // Calculate average sold count (demand indicator)
  const totalSold = validItems.reduce((sum, item) => sum + (item.soldCount || 0), 0)
  const avgSold = totalSold / validItems.length

  // Find price percentile in the market
  const prices = validItems.map(item => item.price as number).sort((a, b) => a - b)
  const pricePosition = prices.filter(p => p <= price).length / prices.length

  // Demand score: based on average sold count (more loose thresholds)
  // Medium demand (>100 avg sold) = 100, Low demand (<5 avg sold) = 0
  // Using logarithmic scale for better distribution
  const demandScore = Math.min(100, Math.log(avgSold + 1) * 20)

  // Price competitiveness: lower price relative to market = higher score
  // Using a smoother curve instead of linear
  const priceScore = Math.pow(1 - pricePosition, 1.5) * 100

  // Weight: 50% demand, 50% price competitiveness (more balanced)
  const sellabilityScore = (demandScore * 0.5) + (priceScore * 0.5)

  return Math.round(Math.max(0, Math.min(100, sellabilityScore)))
}

export function getSellabilityLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: "Very Easy", color: "#22c55e" } // green
  if (score >= 60) return { text: "Easy", color: "#84cc16" } // lime
  if (score >= 40) return { text: "Moderate", color: "#f59e0b" } // amber
  if (score >= 20) return { text: "Hard", color: "#f97316" } // orange
  return { text: "Very Hard", color: "#ef4444" } // red
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
}: FetchMarketPriceParams): Promise<MarketPriceData | null> {
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

  // Collect results from ALL queries (not just first successful one)
  const allCollectedItems: Array<{ title?: string; price?: number; url?: string; soldCount?: number }> = []
  const seenUrls = new Set<string>()

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

  // Try all queries and collect unique items
  for (const q of queries) {
    const url = `${base}/api/scrape?q=${encodeURIComponent(q)}&max=${max}`
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      const items = Array.isArray(data.items) ? data.items : []

      const filtered = items.filter((it: any) => {
        if (seenUrls.has(it.url)) return false // Skip duplicates
        const title = typeof it.title === "string" ? it.title : ""
        const lower = title.toLowerCase()
        const blocked = ["produk toko", "pencarian terkait", "iklan", "promo", "voucher", "kupon"]
        if (blocked.some((w) => lower.includes(w))) return false
        return matchesTitle(title)
      })

      for (const item of filtered) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url)
          allCollectedItems.push(item)
        }
      }
    } catch {
      // try next query
    }
  }

  // Calculate best price and statistics from all collected items
  if (allCollectedItems.length > 0) {
    const best = calculateBestPrice(allCollectedItems)
    
    if (best !== null) {
      // Calculate average sold count across all items with valid soldCount data
      const validItems = allCollectedItems.filter(
        (item: any) => item.soldCount !== undefined && item.soldCount !== null
      )
      const totalSold = validItems.reduce((sum: number, item: any) => sum + (item.soldCount || 0), 0)
      const avgSold = validItems.length > 0 ? totalSold / validItems.length : 0

      return {
        bestPrice: best,
        items: allCollectedItems,
        averageSoldCount: Math.round(avgSold),
        totalListings: allCollectedItems.length
      }
    }
  }

  return null
}
