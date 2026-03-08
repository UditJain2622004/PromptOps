import { useCallback, useEffect, useRef, useState } from 'react'

export function useApi<T>(fetcher: () => Promise<T>, deps: readonly unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)

  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetcherRef.current()
      setData(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void execute().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return {
    data,
    loading,
    error,
    refetch: execute,
    setData,
  }
}
