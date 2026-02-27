'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap } from 'lucide-react'
import { useApiRequest } from '@/hooks/use-api-request'
import { ApiResultViewer } from '@/components/api-result-viewer'
import { RateLimitBanner } from '@/components/rate-limit-banner'

export default function BinanceGeneralPage() {
  const pingApi = useApiRequest()
  const timeApi = useApiRequest()
  const exchangeInfoApi = useApiRequest()

  const [eiSymbol, setEiSymbol] = useState('')
  const [eiSymbols, setEiSymbols] = useState('')
  const [eiPermissions, setEiPermissions] = useState('')
  const [eiNoCache, setEiNoCache] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Binance - General</h1>
        <p className="mt-1 text-sm text-muted-foreground">Endpoints gerais: ping, time, exchange-info</p>
      </div>

      <Tabs defaultValue="ping" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="ping">Ping</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="exchange-info">Exchange Info</TabsTrigger>
        </TabsList>

        {/* Ping */}
        <TabsContent value="ping" className="flex flex-col gap-4 mt-4">
          <RateLimitBanner countdown={pingApi.retryCountdown} />
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">GET /general/ping</code>
                <Button onClick={() => pingApi.execute('/general/ping')} disabled={pingApi.isLoading || pingApi.rateLimited} className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5">
                  <Zap className="size-3.5" />
                  Ping
                </Button>
              </div>
            </CardContent>
          </Card>
          <ApiResultViewer response={pingApi.response} meta={pingApi.meta} isLoading={pingApi.isLoading} />
        </TabsContent>

        {/* Time */}
        <TabsContent value="time" className="flex flex-col gap-4 mt-4">
          <RateLimitBanner countdown={timeApi.retryCountdown} />
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">GET /general/time</code>
                <Button onClick={() => timeApi.execute('/general/time')} disabled={timeApi.isLoading || timeApi.rateLimited} className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5">
                  <Zap className="size-3.5" />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>
          <ApiResultViewer response={timeApi.response} meta={timeApi.meta} isLoading={timeApi.isLoading} />
        </TabsContent>

        {/* Exchange Info */}
        <TabsContent value="exchange-info" className="flex flex-col gap-4 mt-4">
          <RateLimitBanner countdown={exchangeInfoApi.retryCountdown} />
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Symbol (opcional)</Label>
                  <Input className="h-8 bg-muted text-sm" value={eiSymbol} onChange={(e) => setEiSymbol(e.target.value.toUpperCase())} placeholder="BTCUSDT" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Symbols (opcional, separados por virgula)</Label>
                  <Input className="h-8 bg-muted text-sm" value={eiSymbols} onChange={(e) => setEiSymbols(e.target.value.toUpperCase())} placeholder="BTCUSDT,ETHUSDT" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Permissions / Market (opcional)</Label>
                  <Input className="h-8 bg-muted text-sm" value={eiPermissions} onChange={(e) => setEiPermissions(e.target.value)} placeholder="SPOT" />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={eiNoCache} onCheckedChange={setEiNoCache} />
                  <Label className="text-xs text-muted-foreground">noCache</Label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">GET /general/exchange-info</code>
                <Button
                  onClick={() =>
                    exchangeInfoApi.execute('/general/exchange-info', {
                      params: {
                        symbol: eiSymbol || undefined,
                        symbols: eiSymbols || undefined,
                        permissions: eiPermissions || undefined,
                        noCache: eiNoCache ? 'true' : undefined,
                      },
                    })
                  }
                  disabled={exchangeInfoApi.isLoading || exchangeInfoApi.rateLimited}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5"
                >
                  <Zap className="size-3.5" />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>
          <ApiResultViewer response={exchangeInfoApi.response} meta={exchangeInfoApi.meta} isLoading={exchangeInfoApi.isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
