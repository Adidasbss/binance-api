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

type CoinbaseAccountEndpoint = 'accounts' | 'account'

export default function CoinbaseAccountPage() {
  const [activeTab, setActiveTab] = useState<CoinbaseAccountEndpoint>('accounts')
  const api = useApiRequest()
  const credentials = useSettingsStore((s) => s.credentials.coinbase)

  const [accountId, setAccountId] = useState('')
  const [limitVal, setLimitVal] = useState('')
  const [cursor, setCursor] = useState('')

  const hasCredentials = Boolean(
    (credentials.apiKey && credentials.apiSecret) || credentials.keyFile
  )

  const handleSubmit = () => {
    if (!hasCredentials) return

    const credFields: Record<string, string> = {}
    if (credentials.apiKey) credFields.api_key = credentials.apiKey
    if (credentials.apiSecret) credFields.api_secret = credentials.apiSecret
    if (credentials.keyFile) credFields.key_file = credentials.keyFile

    switch (activeTab) {
      case 'accounts': {
        const params: Record<string, string | undefined> = {}
        if (limitVal) params.limit = limitVal
        if (cursor) params.cursor = cursor
        api.execute('/coinbase/account/accounts', { params, credentialFields: credFields })
        return
      }
      case 'account': {
        if (!accountId) return
        api.execute('/coinbase/account/account', {
          params: { account_uuid: accountId },
          credentialFields: credFields,
        })
        return
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">Coinbase - Account</h1>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary gap-1">
            <Lock className="size-3" /> Privado
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Consultas de conta Coinbase</p>
      </div>

      {!hasCredentials && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive">Informe as credenciais Coinbase na sidebar para usar endpoints privados.</span>
        </div>
      )}

      <RateLimitBanner countdown={api.retryCountdown} />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as CoinbaseAccountEndpoint); api.reset() }}>
        <TabsList className="bg-muted">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex flex-col gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading font-medium text-foreground">Request</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTab === 'accounts' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Limit (opcional)</Label>
                      <Input className="h-8 bg-muted text-sm" type="number" value={limitVal} onChange={(e) => setLimitVal(e.target.value)} placeholder="49" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Cursor (opcional)</Label>
                      <Input className="h-8 bg-muted text-sm" value={cursor} onChange={(e) => setCursor(e.target.value)} placeholder="Cursor de paginacao" />
                    </div>
                  </>
                )}

                {activeTab === 'account' && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Account UUID / ID (obrigatorio)</Label>
                    <Input className="h-8 bg-muted text-sm" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="uuid-da-conta" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  GET /coinbase/account/{activeTab}
                </code>
                <Button
                  onClick={handleSubmit}
                  disabled={api.isLoading || api.rateLimited || !hasCredentials}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-sm gap-1.5"
                >
                  <Wallet className="size-3.5" />
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
