'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity } from 'lucide-react'
import { useApiRequest } from '@/hooks/use-api-request'
import { ApiResultViewer } from '@/components/api-result-viewer'
import { RateLimitBanner } from '@/components/rate-limit-banner'

export default function HealthPage() {
  const { response, meta, isLoading, rateLimited, retryCountdown, execute } = useApiRequest()

  const handleCheck = () => {
    execute('/health')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Health Check</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verificar saude do servidor via GET /health
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
            <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">GET /health</code>
            <Button
              onClick={handleCheck}
              disabled={isLoading || rateLimited}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5"
            >
              <Activity className="size-3.5" />
              Verificar
            </Button>
          </div>
        </CardContent>
      </Card>

      <ApiResultViewer response={response} meta={meta} isLoading={isLoading} />
    </div>
  )
}
