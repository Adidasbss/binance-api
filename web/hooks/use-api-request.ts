'use client'

import { useState, useCallback } from 'react'
import { apiClient, type ApiResult, type ApiMeta } from '@/lib/api-client'

type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'

interface UseApiRequestOptions {
  method?: HttpMethod
}

export function useApiRequest<T = unknown>(options: UseApiRequestOptions = {}) {
  const [data, setData] = useState<ApiResult<T> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState(0)

  const execute = useCallback(
    async (
      endpoint: string,
      requestOptions: {
        params?: Record<string, string | number | boolean | undefined>
        body?: Record<string, unknown>
        credentialFields?: Record<string, string>
      } = {}
    ) => {
      if (rateLimited) return

      setIsLoading(true)
      try {
        const result = await apiClient<T>(endpoint, {
          method: options.method || 'GET',
          ...requestOptions,
        })

        setData(result)

        // Handle rate limiting
        if (result.meta.status === 429 && result.meta.retryAfter) {
          setRateLimited(true)
          setRetryCountdown(result.meta.retryAfter)

          const interval = setInterval(() => {
            setRetryCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval)
                setRateLimited(false)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }

        return result
      } finally {
        setIsLoading(false)
      }
    },
    [options.method, rateLimited]
  )

  const reset = useCallback(() => {
    setData(null)
    setIsLoading(false)
  }, [])

  return {
    data,
    meta: data?.meta as ApiMeta | undefined,
    response: data?.response,
    isLoading,
    rateLimited,
    retryCountdown,
    execute,
    reset,
  }
}
