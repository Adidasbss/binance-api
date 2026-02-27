'use client'

import { AlertTriangle } from 'lucide-react'

interface RateLimitBannerProps {
  countdown: number
}

export function RateLimitBanner({ countdown }: RateLimitBannerProps) {
  if (countdown <= 0) return null

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 px-4 py-3 text-sm">
      <AlertTriangle className="size-4 text-[#f97316] shrink-0" />
      <span className="text-[#f97316]">
        Rate limited. Tente novamente em{' '}
        <span className="font-mono font-bold">{countdown}s</span>
      </span>
    </div>
  )
}
