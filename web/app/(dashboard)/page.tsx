'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, TrendingUp, CircleDot, Zap, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { useApiRequest } from '@/hooks/use-api-request'
import { useEffect } from 'react'
import { getBaseUrl } from '@/lib/api-client'

const sections = [
  {
    title: 'Infra',
    description: 'Saude do servidor e metricas',
    href: '/infra/health',
    icon: Activity,
    color: 'text-[#22d3ee]',
    bg: 'bg-[#22d3ee]/10',
  },
  {
    title: 'Binance',
    description: 'Spot API: mercado, conta e trading',
    href: '/binance/general',
    icon: TrendingUp,
    color: 'text-[#f0b90b]',
    bg: 'bg-[#f0b90b]/10',
  },
  {
    title: 'Coinbase',
    description: 'API: mercado, conta e trading',
    href: '/coinbase/general',
    icon: CircleDot,
    color: 'text-[#0052ff]',
    bg: 'bg-[#0052ff]/10',
  },
]

export default function HomePage() {
  const { response, isLoading, execute } = useApiRequest()

  useEffect(() => {
    execute('/health')
  }, [execute])

  const storageWritable = (response as unknown as { storage_writable?: boolean } | undefined)?.storage_writable
  const isHealthy =
    response?.success === true &&
    storageWritable === true

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">CryptoGateway Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Painel de controle para API Gateway - Binance & Coinbase
        </p>
      </div>

      {/* Status bar */}
      <Card className="bg-card border-border">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <span className="text-sm text-muted-foreground">Base URL:</span>
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">{getBaseUrl()}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Health:</span>
            {isLoading ? (
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : isHealthy ? (
              <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                <CheckCircle2 className="size-3" /> OK
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="size-3" /> Offline
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="group bg-card border-border transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${section.bg}`}>
                    <section.icon className={`size-5 ${section.color}`} />
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <CardTitle className="font-heading text-lg font-semibold text-foreground mt-3">
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
