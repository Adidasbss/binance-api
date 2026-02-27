'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CircleDot } from 'lucide-react'
import { useApiRequest } from '@/hooks/use-api-request'
import { ApiResultViewer } from '@/components/api-result-viewer'
import { RateLimitBanner } from '@/components/rate-limit-banner'

export default function CoinbaseGeneralPage() {
  const pingApi = useApiRequest()
  const timeApi = useApiRequest()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Coinbase - General</h1>
        <p className="mt-1 text-sm text-muted-foreground">Endpoints gerais Coinbase: ping, time</p>
      </div>

      <Tabs defaultValue="ping" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="ping">Ping</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
        </TabsList>

        <TabsContent value="ping" className="flex flex-col gap-4 mt-4">
          <RateLimitBanner countdown={pingApi.retryCountdown} />
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">GET /coinbase/general/ping</code>
                <Button onClick={() => pingApi.execute('/coinbase/general/ping')} disabled={pingApi.isLoading || pingApi.rateLimited} className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5">
                  <CircleDot className="size-3.5" />
                  Ping
                </Button>
              </div>
            </CardContent>
          </Card>
          <ApiResultViewer response={pingApi.response} meta={pingApi.meta} isLoading={pingApi.isLoading} />
        </TabsContent>

        <TabsContent value="time" className="flex flex-col gap-4 mt-4">
          <RateLimitBanner countdown={timeApi.retryCountdown} />
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">GET /coinbase/general/time</code>
                <Button onClick={() => timeApi.execute('/coinbase/general/time')} disabled={timeApi.isLoading || timeApi.rateLimited} className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5">
                  <CircleDot className="size-3.5" />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>
          <ApiResultViewer response={timeApi.response} meta={timeApi.meta} isLoading={timeApi.isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
