const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

type ApiResponseError = string | { message?: string }

async function fetchJsonWithError<T>(res: Response, fallback: string): Promise<T> {
  if (res.ok) {
    return res.json()
  }

  const contentType = res.headers.get("content-type") || ""
  let errorMessage = fallback

  if (contentType.includes("application/json")) {
    try {
      const body = (await res.json()) as ApiResponseError
      if (typeof body === "string") {
        errorMessage = body
      } else if (typeof body?.message === "string") {
        errorMessage = body.message
      }
    } catch {
      // ignore parsing error and fall back to text
    }
  } else {
    try {
      const text = await res.text()
      if (text) {
        errorMessage = text
      }
    } catch {
      // ignore parsing error
    }
  }

  throw new Error(errorMessage)
}

type RecognitionResult = {
  label: string
  category: string
}

export async function recognizeItem(file: File): Promise<RecognitionResult> {
  const formData = new FormData()
  formData.append("image", file)

  const res = await fetch(`${API_BASE}/recognize-item`, {
    method: "POST",
    body: formData,
  })

  return fetchJsonWithError<RecognitionResult>(res, "Recognition failed")
}

export async function estimatePrice(name: string, category: string) {
  const res = await fetch(`${API_BASE}/estimate-price`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, category }),
  })

  return fetchJsonWithError(res, "Price lookup failed")
}
