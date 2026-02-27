'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, AlertTriangle } from 'lucide-react'
import { useApiRequest } from '@/hooks/use-api-request'
import { ApiResultViewer } from '@/components/api-result-viewer'
import { RateLimitBanner } from '@/components/rate-limit-banner'

export default function MetricsPage() {
  const { response, meta, isLoading, rateLimited, retryCountdown, execute } = useApiRequest()

  const handleFetch = () => {
    execute('/metrics')
  }

  const isDisabled = meta?.status === 404

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Metricas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Metricas do servidor via GET /metrics
        </p>
      </div>

      <RateLimitBanner countdown={retryCountdown} />

      {/* Request */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">GET /metrics</code>
            <Button
              onClick={handleFetch}
              disabled={isLoading || rateLimited}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5"
            >
              <BarChart3 className="size-3.5" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {isDisabled && (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
          <AlertTriangle className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">Metricas desabilitadas no servidor (METRICS_ENABLED=false).</span>
          <Badge variant="secondary" className="text-xs">404</Badge>
        </div>
      )}

      <ApiResultViewer response={response} meta={meta} isLoading={isLoading} />
    </div>
  )
}
