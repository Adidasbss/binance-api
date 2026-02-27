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

const ORDER_SIDES = ['BUY', 'SELL'] as const
const ORDER_TYPES = ['LIMIT', 'MARKET', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT', 'LIMIT_MAKER'] as const
const TIME_IN_FORCE = ['GTC', 'IOC', 'FOK'] as const
const CANCEL_REPLACE_MODES = ['STOP_ON_FAILURE', 'ALLOW_FAILURE'] as const

type TradingEndpoint = 'create-order' | 'cancel-order' | 'test-order' | 'query-order' | 'cancel-open-orders' | 'create-oco' | 'list-oco' | 'cancel-oco' | 'order-rate-limit' | 'commission-rate' | 'cancel-replace'

export default function BinanceTradingPage() {
  const [activeTab, setActiveTab] = useState<TradingEndpoint>('create-order')
  const postApi = useApiRequest({ method: 'POST' })
  const deleteApi = useApiRequest({ method: 'DELETE' })
  const getApi = useApiRequest()
  const credentials = useSettingsStore((s) => s.credentials.binance)

  // Order form
  const [symbol, setSymbol] = useState('')
  const [side, setSide] = useState<string>('BUY')
  const [type, setType] = useState<string>('LIMIT')
  const [quantity, setQuantity] = useState('')
  const [quoteOrderQty, setQuoteOrderQty] = useState('')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [timeInForce, setTimeInForce] = useState<string>('GTC')
  const [orderId, setOrderId] = useState('')
  const [orderListId, setOrderListId] = useState('')
  const [listClientOrderId, setListClientOrderId] = useState('')
  const [cancelReplaceMode, setCancelReplaceMode] = useState<string>('STOP_ON_FAILURE')

  // OCO fields
  const [ocoStopPrice, setOcoStopPrice] = useState('')
  const [ocoStopLimitPrice, setOcoStopLimitPrice] = useState('')
  const [ocoPrice, setOcoPrice] = useState('')

  const hasCredentials = credentials.apiKey && credentials.secretKey
  const credFields = { api_key: credentials.apiKey, secret_key: credentials.secretKey }

  const handleSubmit = () => {
    if (!hasCredentials) return

    switch (activeTab) {
      case 'create-order':
      case 'test-order': {
        if (!symbol || !side || !type) return
        const body: Record<string, unknown> = {
          ...credFields,
          symbol,
          side,
          type,
        }
        if (type === 'MARKET') {
          if (quantity) body.quantity = quantity
          else if (quoteOrderQty) body.quoteOrderQty = quoteOrderQty
          else return
        } else if (type === 'LIMIT' || type === 'STOP_LOSS_LIMIT' || type === 'TAKE_PROFIT_LIMIT' || type === 'LIMIT_MAKER') {
          if (!quantity || !price) return
          body.quantity = quantity
          body.price = price
          if (type !== 'LIMIT_MAKER') body.timeInForce = timeInForce
        } else if (type === 'STOP_LOSS' || type === 'TAKE_PROFIT') {
          if (!quantity || !stopPrice) return
          body.quantity = quantity
          body.stopPrice = stopPrice
        }
        if ((type === 'STOP_LOSS_LIMIT' || type === 'TAKE_PROFIT_LIMIT') && stopPrice) {
          body.stopPrice = stopPrice
        }
        const endpoint = activeTab === 'test-order' ? '/trading/test-order' : '/trading/create-order'
        postApi.execute(endpoint, { body })
        return
      }
      case 'cancel-order': {
        if (!symbol || !orderId) return
        deleteApi.execute('/trading/cancel-order', {
          params: { symbol, orderId, ...credFields },
        })
        return
      }
      case 'query-order': {
        if (!symbol || !orderId) return
        getApi.execute('/trading/query-order', {
          params: { symbol, orderId, ...credFields },
        })
        return
      }
      case 'cancel-open-orders': {
        if (!symbol) return
        deleteApi.execute('/trading/cancel-open-orders', {
          params: { symbol, ...credFields },
        })
        return
      }
      case 'create-oco': {
        if (!symbol || !side || !quantity || !ocoPrice || !ocoStopPrice) return
        postApi.execute('/trading/create-oco', {
          body: {
            ...credFields,
            symbol, side, quantity,
            price: ocoPrice,
            stopPrice: ocoStopPrice,
            ...(ocoStopLimitPrice ? { stopLimitPrice: ocoStopLimitPrice, stopLimitTimeInForce: timeInForce } : {}),
          },
        })
        return
      }
      case 'list-oco':
        getApi.execute('/trading/list-oco', { params: credFields })
        return
      case 'cancel-oco': {
        if (!orderListId && !listClientOrderId) return
        deleteApi.execute('/trading/cancel-oco', {
          params: {
            ...(orderListId ? { orderListId } : {}),
            ...(listClientOrderId ? { listClientOrderId } : {}),
            symbol,
            ...credFields,
          },
        })
        return
      }
      case 'order-rate-limit':
        getApi.execute('/trading/order-rate-limit', { params: credFields })
        return
      case 'commission-rate':
        if (!symbol) return
        getApi.execute('/trading/commission-rate', { params: { symbol, ...credFields } })
        return
      case 'cancel-replace': {
        if (!symbol || !side || !type || !cancelReplaceMode) return
        const body: Record<string, unknown> = {
          ...credFields,
          symbol, side, type,
          cancelReplaceMode,
        }
        if (orderId) body.cancelOrderId = orderId
        if (quantity) body.quantity = quantity
        if (price) body.price = price
        if (stopPrice) body.stopPrice = stopPrice
        if (timeInForce) body.timeInForce = timeInForce
        postApi.execute('/trading/cancel-replace', { body })
        return
      }
    }
  }

  const currentApi = (() => {
    switch (activeTab) {
      case 'create-order': case 'test-order': case 'create-oco': case 'cancel-replace': return postApi
      case 'cancel-order': case 'cancel-open-orders': case 'cancel-oco': return deleteApi
      default: return getApi
    }
  })()

  const showOrderForm = ['create-order', 'test-order', 'cancel-replace'].includes(activeTab)
  const showCancelForm = ['cancel-order'].includes(activeTab)
  const showQueryForm = ['query-order'].includes(activeTab)
  const showSymbolOnly = ['cancel-open-orders', 'commission-rate'].includes(activeTab)
  const showOcoForm = activeTab === 'create-oco'
  const showCancelOco = activeTab === 'cancel-oco'
  const showNoFields = ['list-oco', 'order-rate-limit'].includes(activeTab)

  const needsPrice = type === 'LIMIT' || type === 'STOP_LOSS_LIMIT' || type === 'TAKE_PROFIT_LIMIT' || type === 'LIMIT_MAKER'
  const needsStopPrice = type === 'STOP_LOSS' || type === 'STOP_LOSS_LIMIT' || type === 'TAKE_PROFIT' || type === 'TAKE_PROFIT_LIMIT'
  const needsTIF = type === 'LIMIT' || type === 'STOP_LOSS_LIMIT' || type === 'TAKE_PROFIT_LIMIT'
  const isMarket = type === 'MARKET'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">Binance - Trading</h1>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary gap-1">
            <Lock className="size-3" /> Privado
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Operacoes de trading Binance Spot</p>
      </div>

      {!hasCredentials && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive">Informe as credenciais Binance na sidebar para usar endpoints de trading.</span>
        </div>
      )}

      <RateLimitBanner countdown={currentApi.retryCountdown} />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TradingEndpoint); postApi.reset(); deleteApi.reset(); getApi.reset() }}>
        <div className="overflow-x-auto">
          <TabsList className="bg-muted inline-flex w-auto">
            <TabsTrigger value="create-order" className="text-xs">Create</TabsTrigger>
            <TabsTrigger value="test-order" className="text-xs">Test</TabsTrigger>
            <TabsTrigger value="cancel-order" className="text-xs">Cancel</TabsTrigger>
            <TabsTrigger value="query-order" className="text-xs">Query</TabsTrigger>
            <TabsTrigger value="cancel-open-orders" className="text-xs">Cancel All</TabsTrigger>
            <TabsTrigger value="create-oco" className="text-xs">OCO</TabsTrigger>
            <TabsTrigger value="list-oco" className="text-xs">List OCO</TabsTrigger>
            <TabsTrigger value="cancel-oco" className="text-xs">Cancel OCO</TabsTrigger>
            <TabsTrigger value="order-rate-limit" className="text-xs">Rate Limit</TabsTrigger>
            <TabsTrigger value="commission-rate" className="text-xs">Commission</TabsTrigger>
            <TabsTrigger value="cancel-replace" className="text-xs">Cancel/Replace</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Common Symbol field */}
                {(showOrderForm || showCancelForm || showQueryForm || showSymbolOnly || showOcoForm || showCancelOco) && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Symbol (obrigatorio)</Label>
                    <Input className="h-8 bg-muted text-sm" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="BTCUSDT" />
                  </div>
                )}

                {/* Order form fields */}
                {showOrderForm && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Side</Label>
                      <Select value={side} onValueChange={setSide}>
                        <SelectTrigger className="h-8 bg-muted text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {ORDER_SIDES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="h-8 bg-muted text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {ORDER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {!isMarket && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input className="h-8 bg-muted text-sm" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.001" />
                      </div>
                    )}
                    {isMarket && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">Quantity (ou quoteOrderQty)</Label>
                          <Input className="h-8 bg-muted text-sm" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.001" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">Quote Order Qty (ou quantity)</Label>
                          <Input className="h-8 bg-muted text-sm" value={quoteOrderQty} onChange={(e) => setQuoteOrderQty(e.target.value)} placeholder="100" />
                        </div>
                      </>
                    )}
                    {needsPrice && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Price</Label>
                        <Input className="h-8 bg-muted text-sm" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50000.00" />
                      </div>
                    )}
                    {needsStopPrice && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Stop Price</Label>
                        <Input className="h-8 bg-muted text-sm" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} placeholder="49000.00" />
                      </div>
                    )}
                    {needsTIF && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Time in Force</Label>
                        <Select value={timeInForce} onValueChange={setTimeInForce}>
                          <SelectTrigger className="h-8 bg-muted text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {TIME_IN_FORCE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {activeTab === 'cancel-replace' && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">Cancel Replace Mode</Label>
                          <Select value={cancelReplaceMode} onValueChange={setCancelReplaceMode}>
                            <SelectTrigger className="h-8 bg-muted text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              {CANCEL_REPLACE_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">Cancel Order ID</Label>
                          <Input className="h-8 bg-muted text-sm" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="12345" />
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Cancel / Query order fields */}
                {(showCancelForm || showQueryForm) && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Order ID (obrigatorio)</Label>
                    <Input className="h-8 bg-muted text-sm" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="12345" />
                  </div>
                )}

                {/* OCO form */}
                {showOcoForm && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Side</Label>
                      <Select value={side} onValueChange={setSide}>
                        <SelectTrigger className="h-8 bg-muted text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {ORDER_SIDES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input className="h-8 bg-muted text-sm" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.001" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Price (limit leg)</Label>
                      <Input className="h-8 bg-muted text-sm" value={ocoPrice} onChange={(e) => setOcoPrice(e.target.value)} placeholder="52000.00" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Stop Price</Label>
                      <Input className="h-8 bg-muted text-sm" value={ocoStopPrice} onChange={(e) => setOcoStopPrice(e.target.value)} placeholder="49000.00" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Stop Limit Price (opcional)</Label>
                      <Input className="h-8 bg-muted text-sm" value={ocoStopLimitPrice} onChange={(e) => setOcoStopLimitPrice(e.target.value)} placeholder="48500.00" />
                    </div>
                  </>
                )}

                {/* Cancel OCO */}
                {showCancelOco && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Order List ID</Label>
                      <Input className="h-8 bg-muted text-sm" value={orderListId} onChange={(e) => setOrderListId(e.target.value)} placeholder="123" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">List Client Order ID</Label>
                      <Input className="h-8 bg-muted text-sm" value={listClientOrderId} onChange={(e) => setListClientOrderId(e.target.value)} placeholder="myOco1" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  {['create-order', 'test-order', 'create-oco', 'cancel-replace'].includes(activeTab) ? 'POST' : ['cancel-order', 'cancel-open-orders', 'cancel-oco'].includes(activeTab) ? 'DELETE' : 'GET'}{' '}
                  /trading/{activeTab}
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
