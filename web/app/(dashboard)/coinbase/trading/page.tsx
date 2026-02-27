'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftRight, Lock, AlertTriangle } from 'lucide-react'
import { useApiRequest } from '@/hooks/use-api-request'
import { ApiResultViewer } from '@/components/api-result-viewer'
import { RateLimitBanner } from '@/components/rate-limit-banner'
import { useSettingsStore } from '@/lib/store'

const CB_ORDER_SIDES = ['BUY', 'SELL'] as const

type CoinbaseTradingEndpoint = 'create-order' | 'cancel-order' | 'get-order' | 'list-orders'

export default function CoinbaseTradingPage() {
  const [activeTab, setActiveTab] = useState<CoinbaseTradingEndpoint>('create-order')
  const postApi = useApiRequest({ method: 'POST' })
  const getApi = useApiRequest()
  const credentials = useSettingsStore((s) => s.credentials.coinbase)

  const [productId, setProductId] = useState('')
  const [side, setSide] = useState<string>('BUY')
  const [orderType, setOrderType] = useState('MARKET')
  const [size, setSize] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [orderId, setOrderId] = useState('')
  const [orderStatus, setOrderStatus] = useState('')

  const hasCredentials = Boolean(
    (credentials.apiKey && credentials.apiSecret) || credentials.keyFile
  )

  const getCredFields = (): Record<string, string> => {
    const fields: Record<string, string> = {}
    if (credentials.apiKey) fields.api_key = credentials.apiKey
    if (credentials.apiSecret) fields.api_secret = credentials.apiSecret
    if (credentials.keyFile) fields.key_file = credentials.keyFile
    return fields
  }

  const handleSubmit = () => {
    if (!hasCredentials) return

    switch (activeTab) {
      case 'create-order': {
        if (!productId || !side || !size) return
        if (orderType === 'LIMIT' && !limitPrice) return
        const body: Record<string, unknown> = {
          ...getCredFields(),
          product_id: productId,
          side,
          type: orderType,
        }
        body.base_size = size
        if (orderType === 'LIMIT') body.limit_price = limitPrice
        postApi.execute('/coinbase/trading/create-order', { body })
        return
      }
      case 'cancel-order': {
        if (!orderId) return
        postApi.execute('/coinbase/trading/cancel-order', {
          body: { ...getCredFields(), order_id: orderId },
        })
        return
      }
      case 'get-order': {
        if (!orderId) return
        getApi.execute('/coinbase/trading/get-order', {
          params: { order_id: orderId },
          credentialFields: getCredFields(),
        })
        return
      }
      case 'list-orders': {
        const params: Record<string, string | undefined> = {}
        if (orderStatus) params.order_status = orderStatus
        if (productId) params.product_ids = productId
        getApi.execute('/coinbase/trading/list-orders', {
          params,
          credentialFields: getCredFields(),
        })
        return
      }
    }
  }

  const currentApi = ['create-order', 'cancel-order'].includes(activeTab) ? postApi : getApi

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">Coinbase - Trading</h1>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary gap-1">
            <Lock className="size-3" /> Privado
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Operacoes de trading Coinbase</p>
      </div>

      {!hasCredentials && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive">Informe as credenciais Coinbase na sidebar para usar endpoints de trading.</span>
        </div>
      )}

      <RateLimitBanner countdown={currentApi.retryCountdown} />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as CoinbaseTradingEndpoint); postApi.reset(); getApi.reset() }}>
        <TabsList className="bg-muted">
          <TabsTrigger value="create-order">Create</TabsTrigger>
          <TabsTrigger value="cancel-order">Cancel</TabsTrigger>
          <TabsTrigger value="get-order">Get Order</TabsTrigger>
          <TabsTrigger value="list-orders">List Orders</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex flex-col gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTab === 'create-order' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Product ID (obrigatorio)</Label>
                      <Input className="h-8 bg-muted text-sm" value={productId} onChange={(e) => setProductId(e.target.value.toUpperCase())} placeholder="BTC-USD" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Side</Label>
                      <Select value={side} onValueChange={setSide}>
                        <SelectTrigger className="h-8 bg-muted text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {CB_ORDER_SIDES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <Select value={orderType} onValueChange={setOrderType}>
                        <SelectTrigger className="h-8 bg-muted text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="MARKET">MARKET</SelectItem>
                          <SelectItem value="LIMIT">LIMIT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Size (obrigatorio)</Label>
                      <Input className="h-8 bg-muted text-sm" value={size} onChange={(e) => setSize(e.target.value)} placeholder="0.001" />
                    </div>
                    {orderType === 'LIMIT' && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Limit Price</Label>
                        <Input className="h-8 bg-muted text-sm" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="50000.00" />
                      </div>
                    )}
                  </>
                )}

                {(activeTab === 'cancel-order' || activeTab === 'get-order') && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Order ID (obrigatorio)</Label>
                    <Input className="h-8 bg-muted text-sm" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="order-uuid" />
                  </div>
                )}

                {activeTab === 'list-orders' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Product ID (opcional)</Label>
                      <Input className="h-8 bg-muted text-sm" value={productId} onChange={(e) => setProductId(e.target.value.toUpperCase())} placeholder="BTC-USD" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Order Status (opcional)</Label>
                      <Select value={orderStatus} onValueChange={setOrderStatus}>
                        <SelectTrigger className="h-8 bg-muted text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="OPEN">OPEN</SelectItem>
                          <SelectItem value="FILLED">FILLED</SelectItem>
                          <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                          <SelectItem value="PENDING">PENDING</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  {['create-order', 'cancel-order'].includes(activeTab) ? 'POST' : 'GET'}{' '}
                  /coinbase/trading/{activeTab}
                </code>
                <Button
                  onClick={handleSubmit}
                  disabled={currentApi.isLoading || currentApi.rateLimited || !hasCredentials}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5"
                >
                  <ArrowLeftRight className="size-3.5" />
                  Executar
                </Button>
              </div>
            </CardContent>
          </Card>

          <ApiResultViewer response={currentApi.response} meta={currentApi.meta} isLoading={currentApi.isLoading} />
        </div>
      </Tabs>
    </div>
  )
}
