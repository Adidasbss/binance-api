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

const GRANULARITIES = ['ONE_MINUTE', 'FIVE_MINUTE', 'FIFTEEN_MINUTE', 'THIRTY_MINUTE', 'ONE_HOUR', 'TWO_HOUR', 'SIX_HOUR', 'ONE_DAY'] as const

type CoinbaseMarketEndpoint = 'products' | 'product' | 'product-book' | 'ticker' | 'candles'

export default function CoinbaseMarketPage() {
  const [activeTab, setActiveTab] = useState<CoinbaseMarketEndpoint>('products')
  const api = useApiRequest()

  const [productId, setProductId] = useState('')
  const [granularity, setGranularity] = useState<string>('ONE_HOUR')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const handleSubmit = () => {
    const params: Record<string, string | undefined> = {}

    switch (activeTab) {
      case 'products':
        api.execute('/coinbase/market/products', { params })
        return
      case 'product':
        if (!productId) return
        params.product_id = productId
        api.execute('/coinbase/market/product', { params })
        return
      case 'product-book':
        if (!productId) return
        params.product_id = productId
        api.execute('/coinbase/market/product-book', { params })
        return
      case 'ticker':
        if (!productId) return
        params.product_id = productId
        api.execute('/coinbase/market/ticker', { params })
        return
      case 'candles':
        if (!productId || !granularity || !start || !end) return
        params.product_id = productId
        params.granularity = granularity
        params.start = start
        params.end = end
        api.execute('/coinbase/market/candles', { params })
        return
    }
  }

  const needsProductId = activeTab !== 'products'
  const needsCandles = activeTab === 'candles'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Coinbase - Market</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados publicos de mercado Coinbase</p>
      </div>

      <RateLimitBanner countdown={api.retryCountdown} />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as CoinbaseMarketEndpoint); api.reset() }}>
        <TabsList className="bg-muted">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="product">Product</TabsTrigger>
          <TabsTrigger value="product-book">Book</TabsTrigger>
          <TabsTrigger value="ticker">Ticker</TabsTrigger>
          <TabsTrigger value="candles">Candles</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex flex-col gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {needsProductId && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Product ID / Symbol (obrigatorio)</Label>
                    <Input className="h-8 bg-muted text-sm" value={productId} onChange={(e) => setProductId(e.target.value.toUpperCase())} placeholder="BTC-USD" />
                  </div>
                )}

                {needsCandles && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Granularity (obrigatorio)</Label>
                      <Select value={granularity} onValueChange={setGranularity}>
                        <SelectTrigger className="h-8 bg-muted text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {GRANULARITIES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Start (obrigatorio, timestamp)</Label>
                      <Input className="h-8 bg-muted text-sm" value={start} onChange={(e) => setStart(e.target.value)} placeholder="2024-01-01T00:00:00Z" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">End (obrigatorio, timestamp)</Label>
                      <Input className="h-8 bg-muted text-sm" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="2024-01-02T00:00:00Z" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  GET /coinbase/market/{activeTab}
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
