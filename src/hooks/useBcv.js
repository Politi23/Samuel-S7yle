import { useState, useEffect, useCallback } from 'react'

let _cachedData = null
let _inflightPromise = null

export function useBcv() {
  const [data, setData]       = useState(_cachedData)
  const [loading, setLoading] = useState(!_cachedData)
  const [error, setError]     = useState(null)

  const fetchTasas = useCallback(async (force = false) => {
    if (!force && _cachedData) {
      setData(_cachedData)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    if (force) {
      _cachedData = null
      _inflightPromise = null
    }

    try {
      if (!_inflightPromise) {
        _inflightPromise = fetch(force ? '/api/bcv/tasas?force=1' : '/api/bcv/tasas')
          .then(res => {
            if (!res.ok) throw new Error('Error al conectar con el servidor')
            return res.json()
          })
          .then(json => {
            if (json.error) throw new Error(json.error)
            _cachedData = json
            _inflightPromise = null
            return json
          })
          .catch(err => {
            _inflightPromise = null
            throw err
          })
      }
      const json = await _inflightPromise
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasas() }, [fetchTasas])

  return { data, loading, error, refetch: () => fetchTasas(true) }
}
