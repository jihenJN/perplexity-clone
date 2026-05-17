import { useEffect, useState } from "react"

export function useSearchMedia(query, endpoint, resultKey) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query) return

    const controller = new AbortController()
    setLoading(true)

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchInput: query }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Request failed with ${res.status}`))))
      .then((data) => setItems(data?.[resultKey] ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") console.error(`${resultKey} fetch error:`, err)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [endpoint, query, resultKey])

  return { items, loading }
}
