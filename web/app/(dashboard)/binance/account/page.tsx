'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Wallet, Lock, AlertTriangle } from 'lucide-react'
import { useApiRequest } from '@/hooks/use-api-request'
import { ApiResultViewer } from '@/components/api-result-viewer'
import { RateLimitBanner } from '@/components/rate-limit-banner'
import { useSettingsStore } from '@/lib/store'

type AccountEndpoint = 'info' | 'open-orders' | 'order-history' | 'balance' | 'my-trades' | 'account-status' | 'api-trading-status' | 'capital-config' | 'dust-transfer' | 'asset-dividend' | 'convert-transferable' | 'p2p-orders'

export default function BinanceAccountPage() {
  const [activeTab, setActiveTab] = useState<AccountEndpoint>('info')
  const api = useApiRequest()
  const postApi = useApiRequest({ method: 'POST' })
  const credentials = useSettingsStore((s) => s.credentials.binance)

  const [symbol, setSymbol] = useState('')
  const [asset, setAsset] = useState('')
  const [limit, setLimit] = useState('')
  const [dustAssets, setDustAssets] = useState('')
  const [fromAsset, setFromAsset] = useState('')
  const [toAsset, setToAsset] = useState('')

  const credFields: Record<string, string> = {}
  if (credentials.apiKey) credFields.api_key = credentials.apiKey
  if (credentials.secretKey) credFields.secret_key = credentials.secretKey
  const hasCredentials = Boolean(credFields.api_key && credFields.secret_key)

  const handleSubmit = () => {
    if (!hasCredentials) return

    const params: Record<string, string | undefined> = {}

    switch (activeTab) {
      case 'info':
        api.execute('/account/info', { params, credentialFields: credFields })
        return
      case 'open-orders':
        if (symbol) params.symbol = symbol
        api.execute('/account/open-orders', { params, credentialFields: credFields })
        return
      case 'order-history':
        if (!symbol) return
        params.symbol = symbol
        if (limit) params.limit = limit
        api.execute('/account/order-history', { params, credentialFields: credFields })
        return
      case 'balance':
        if (!asset) return
        params.asset = asset
        api.execute('/account/balance', { params, credentialFields: credFields })
        return
      case 'my-trades':
        if (!symbol) return
        params.symbol = symbol
        if (limit) params.limit = limit
        api.execute('/account/my-trades', { params, credentialFields: credFields })
        return
      case 'account-status':
        api.execute('/account/account-status', { params, credentialFields: credFields })
        return
      case 'api-trading-status':
        api.execute('/account/api-trading-status', { params, credentialFields: credFields })
        return
      case 'capital-config':
        api.execute('/account/capital-config', { params, credentialFields: credFields })
        return
      case 'dust-transfer':
        if (!dustAssets) return
        postApi.execute('/account/dust-transfer', {
          body: { api_key: credentials.apiKey, secret_key: credentials.secretKey, assets: dustAssets },
        })
        return
      case 'asset-dividend':
        api.execute('/account/asset-dividend', { params, credentialFields: credFields })
        return
      case 'convert-transferable':
        if (!fromAsset || !toAsset) return
        params.fromAsset = fromAsset
        params.toAsset = toAsset
        api.execute('/account/convert-transferable', { params, credentialFields: credFields })
        return
      case 'p2p-orders':
        api.execute('/account/p2p-orders', { params, credentialFields: credFields })
        return
    }
  }

  const currentApi = activeTab === 'dust-transfer' ? postApi : api

  const needsCreds = true

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">Binance - Account</h1>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary gap-1">
            <Lock className="size-3" /> Privado
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Consultas de conta (requerem credenciais)</p>
      </div>

      {needsCreds && !hasCredentials && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive">Informe as credenciais Binance na sidebar para usar endpoints privados.</span>
        </div>
      )}

      <RateLimitBanner countdown={currentApi.retryCountdown} />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as AccountEndpoint); api.reset(); postApi.reset() }}>
        <div className="overflow-x-auto">
          <TabsList className="bg-muted inline-flex w-auto">
            <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
            <TabsTrigger value="open-orders" className="text-xs">Open Orders</TabsTrigger>
            <TabsTrigger value="order-history" className="text-xs">Order History</TabsTrigger>
            <TabsTrigger value="balance" className="text-xs">Balance</TabsTrigger>
            <TabsTrigger value="my-trades" className="text-xs">My Trades</TabsTrigger>
            <TabsTrigger value="account-status" className="text-xs">Status</TabsTrigger>
            <TabsTrigger value="api-trading-status" className="text-xs">Trading Status</TabsTrigger>
            <TabsTrigger value="capital-config" className="text-xs">Capital</TabsTrigger>
            <TabsTrigger value="dust-transfer" className="text-xs">Dust</TabsTrigger>
            <TabsTrigger value="asset-dividend" className="text-xs">Dividends</TabsTrigger>
            <TabsTrigger value="convert-transferable" className="text-xs">Convert</TabsTrigger>
            <TabsTrigger value="p2p-orders" className="text-xs">P2P</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {['open-orders', 'order-history', 'my-trades'].includes(activeTab) && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Symbol {activeTab === 'open-orders' ? '(opcional)' : '(obrigatorio)'}
                    </Label>
                    <Input className="h-8 bg-muted text-sm" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="BTCUSDT" />
                  </div>
                )}

                {activeTab === 'balance' && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Asset (obrigatorio)</Label>
                    <Input className="h-8 bg-muted text-sm" value={asset} onChange={(e) => setAsset(e.target.value.toUpperCase())} placeholder="BTC" />
                  </div>
                )}

                {['order-history', 'my-trades'].includes(activeTab) && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Limit (opcional)</Label>
                    <Input className="h-8 bg-muted text-sm" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="500" />
                  </div>
                )}

                {activeTab === 'dust-transfer' && (
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Assets (obrigatorio, separados por virgula)</Label>
                    <Input className="h-8 bg-muted text-sm" value={dustAssets} onChange={(e) => setDustAssets(e.target.value.toUpperCase())} placeholder="ETH,LTC,TRX" />
                  </div>
                )}

                {activeTab === 'convert-transferable' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">From Asset (obrigatorio)</Label>
                      <Input className="h-8 bg-muted text-sm" value={fromAsset} onChange={(e) => setFromAsset(e.target.value.toUpperCase())} placeholder="BTC" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">To Asset (obrigatorio)</Label>
                      <Input className="h-8 bg-muted text-sm" value={toAsset} onChange={(e) => setToAsset(e.target.value.toUpperCase())} placeholder="USDT" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  {activeTab === 'dust-transfer' ? 'POST' : 'GET'} /account/{activeTab}
                </code>
                <Button
                  onClick={handleSubmit}
                  disabled={currentApi.isLoading || currentApi.rateLimited || (needsCreds && !hasCredentials)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5"
                >
                  <Wallet className="size-3.5" />
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
