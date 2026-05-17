import { useEffect, useState } from "react"

export function useSearchMedia(query, endpoint, resultKey) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!query) return

    const controller = new AbortController()
    setLoading(true)
    setError("")

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchInput: query }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `Request failed with ${res.status}`)
        return data
      })
      .then((data) => setItems(data?.[resultKey] ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setItems([])
          setError(err.message)
          console.warn(`${resultKey} fetch skipped:`, err.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [endpoint, query, resultKey])

  return { items, loading, error }
}
