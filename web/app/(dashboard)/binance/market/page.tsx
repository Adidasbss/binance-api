'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp } from 'lucide-react'
import { useApiRequest } from '@/hooks/use-api-request'
import { ApiResultViewer } from '@/components/api-result-viewer'
import { RateLimitBanner } from '@/components/rate-limit-banner'
import { useSettingsStore } from '@/lib/store'

const INTERVALS = ['1s','1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M']

type EndpointKey = 'ticker' | 'order-book' | 'trades' | 'historical-trades' | 'avg-price' | 'book-ticker' | 'agg-trades' | 'klines' | 'ui-klines' | 'rolling-window-ticker' | 'ticker-price' | 'ticker-24h'

export default function BinanceMarketPage() {
  const [activeTab, setActiveTab] = useState<EndpointKey>('ticker')
  const api = useApiRequest()
  const credentials = useSettingsStore((s) => s.credentials.binance)

  // Form state
  const [symbol, setSymbol] = useState('')
  const [symbols, setSymbols] = useState('')
  const [limit, setLimit] = useState('')
  const [fromId, setFromId] = useState('')
  const [klineInterval, setKlineInterval] = useState('1h')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const clearFields = () => {
    setSymbol(''); setSymbols(''); setLimit(''); setFromId('')
    setStartTime(''); setEndTime('')
  }

  const handleSubmit = () => {
    const params: Record<string, string | undefined> = {}

    switch (activeTab) {
      case 'ticker':
        if (!symbol) return
        params.symbol = symbol
        break
      case 'order-book':
        if (!symbol) return
        params.symbol = symbol
        if (limit) params.limit = limit
        break
      case 'trades':
        if (!symbol) return
        params.symbol = symbol
        if (limit) params.limit = limit
        break
      case 'historical-trades':
        if (!symbol) return
        params.symbol = symbol
        if (limit) params.limit = limit
        if (fromId) params.fromId = fromId
        if (credentials.apiKey) params.api_key = credentials.apiKey
        break
      case 'avg-price':
        if (!symbol) return
        params.symbol = symbol
        break
      case 'book-ticker':
        if (symbol) params.symbol = symbol
        break
      case 'agg-trades':
        if (!symbol) return
        params.symbol = symbol
        if (fromId) params.fromId = fromId
        if (startTime) params.startTime = startTime
        if (endTime) params.endTime = endTime
        if (limit) params.limit = limit
        break
      case 'klines':
      case 'ui-klines':
        if (!symbol) return
        params.symbol = symbol
        params.interval = klineInterval
        if (startTime) params.startTime = startTime
        if (endTime) params.endTime = endTime
        if (limit) params.limit = limit
        break
      case 'rolling-window-ticker':
        if (!symbol && !symbols) return
        if (symbol) params.symbol = symbol
        if (symbols) params.symbols = symbols
        break
      case 'ticker-price':
        if (symbol) params.symbol = symbol
        break
      case 'ticker-24h':
        if (symbol) params.symbol = symbol
        break
    }

    api.execute(`/market/${activeTab}`, { params })
  }

  const requiresSymbol = !['book-ticker', 'ticker-price', 'ticker-24h'].includes(activeTab)
  const hasLimit = ['order-book', 'trades', 'historical-trades', 'agg-trades', 'klines', 'ui-klines'].includes(activeTab)
  const hasInterval = ['klines', 'ui-klines'].includes(activeTab)
  const hasFromId = ['historical-trades', 'agg-trades'].includes(activeTab)
  const hasTimeRange = ['agg-trades', 'klines', 'ui-klines'].includes(activeTab)
  const hasSymbols = ['rolling-window-ticker'].includes(activeTab)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Binance - Market</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados publicos de mercado Binance Spot</p>
      </div>

      <RateLimitBanner countdown={api.retryCountdown} />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as EndpointKey); api.reset(); clearFields() }}>
        <div className="overflow-x-auto">
          <TabsList className="bg-muted inline-flex w-auto">
            <TabsTrigger value="ticker" className="text-xs">Ticker</TabsTrigger>
            <TabsTrigger value="order-book" className="text-xs">Order Book</TabsTrigger>
            <TabsTrigger value="trades" className="text-xs">Trades</TabsTrigger>
            <TabsTrigger value="historical-trades" className="text-xs">Historical</TabsTrigger>
            <TabsTrigger value="avg-price" className="text-xs">Avg Price</TabsTrigger>
            <TabsTrigger value="book-ticker" className="text-xs">Book Ticker</TabsTrigger>
            <TabsTrigger value="agg-trades" className="text-xs">Agg Trades</TabsTrigger>
            <TabsTrigger value="klines" className="text-xs">Klines</TabsTrigger>
            <TabsTrigger value="ui-klines" className="text-xs">UI Klines</TabsTrigger>
            <TabsTrigger value="rolling-window-ticker" className="text-xs">Rolling</TabsTrigger>
            <TabsTrigger value="ticker-price" className="text-xs">Price</TabsTrigger>
            <TabsTrigger value="ticker-24h" className="text-xs">24h</TabsTrigger>
          </TabsList>
        </div>

        {/* Unified form */}
        <div className="mt-4 flex flex-col gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Symbol {requiresSymbol ? '(obrigatorio)' : '(opcional)'}
                  </Label>
                  <Input
                    className="h-8 bg-muted text-sm"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="BTCUSDT"
                  />
                </div>

                {hasSymbols && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Symbols (separados por virgula)</Label>
                    <Input className="h-8 bg-muted text-sm" value={symbols} onChange={(e) => setSymbols(e.target.value.toUpperCase())} placeholder="BTCUSDT,ETHUSDT" />
                  </div>
                )}

                {hasLimit && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Limit (opcional)</Label>
                    <Input className="h-8 bg-muted text-sm" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="500" />
                  </div>
                )}

                {hasInterval && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Interval (obrigatorio)</Label>
                    <Select value={klineInterval} onValueChange={setKlineInterval}>
                      <SelectTrigger className="h-8 bg-muted text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {INTERVALS.map((i) => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {hasFromId && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">From ID (opcional)</Label>
                    <Input className="h-8 bg-muted text-sm" value={fromId} onChange={(e) => setFromId(e.target.value)} placeholder="Trade ID" />
                  </div>
                )}

                {hasTimeRange && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Start Time (opcional, ms)</Label>
                      <Input className="h-8 bg-muted text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="Timestamp em ms" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">End Time (opcional, ms)</Label>
                      <Input className="h-8 bg-muted text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="Timestamp em ms" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  GET /market/{activeTab}
                </code>
                <Button
                  onClick={handleSubmit}
                  disabled={api.isLoading || api.rateLimited}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5"
                >
                  <TrendingUp className="size-3.5" />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>

          <ApiResultViewer response={api.response} meta={api.meta} isLoading={api.isLoading} />
        </div>
      </Tabs>
    </div>
  )
}
