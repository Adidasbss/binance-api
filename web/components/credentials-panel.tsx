'use client'

import { useState } from 'react'
import { useSettingsStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff, AlertTriangle, Trash2 } from 'lucide-react'

export function CredentialsPanel() {
  const { credentials, setCredentials, clearCredentials } = useSettingsStore()
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  const toggle = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-sm font-medium text-foreground">Credenciais</CardTitle>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={clearCredentials}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-[#f97316]/10 px-2.5 py-1.5">
          <AlertTriangle className="size-3.5 text-[#f97316] shrink-0" />
          <span className="text-xs text-[#f97316]">Nao use credenciais reais em producao no browser.</span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="basic" className="text-xs">Basic Auth</TabsTrigger>
            <TabsTrigger value="binance" className="text-xs">Binance</TabsTrigger>
            <TabsTrigger value="coinbase" className="text-xs">Coinbase</TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Username</Label>
              <Input
                className="h-8 bg-muted text-sm"
                value={credentials.basicAuth.username}
                onChange={(e) => setCredentials('basicAuth', { ...credentials.basicAuth, username: e.target.value })}
                placeholder="admin"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Password</Label>
              <div className="flex gap-1.5">
                <Input
                  className="h-8 bg-muted text-sm flex-1"
                  type={showPasswords['basic-pw'] ? 'text' : 'password'}
                  value={credentials.basicAuth.password}
                  onChange={(e) => setCredentials('basicAuth', { ...credentials.basicAuth, password: e.target.value })}
                  placeholder="********"
                />
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => toggle('basic-pw')}>
                  {showPasswords['basic-pw'] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>
            {credentials.basicAuth.username && <Badge variant="outline" className="w-fit text-xs text-primary border-primary/30">Ativo</Badge>}
          </TabsContent>
          <TabsContent value="binance" className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">API Key</Label>
              <Input
                className="h-8 bg-muted text-sm"
                type={showPasswords['bn-key'] ? 'text' : 'password'}
                value={credentials.binance.apiKey}
                onChange={(e) => setCredentials('binance', { ...credentials.binance, apiKey: e.target.value })}
                placeholder="Binance API Key"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Secret Key</Label>
              <div className="flex gap-1.5">
                <Input
                  className="h-8 bg-muted text-sm flex-1"
                  type={showPasswords['bn-secret'] ? 'text' : 'password'}
                  value={credentials.binance.secretKey}
                  onChange={(e) => setCredentials('binance', { ...credentials.binance, secretKey: e.target.value })}
                  placeholder="Binance Secret Key"
                />
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => toggle('bn-secret')}>
                  {showPasswords['bn-secret'] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>
            {credentials.binance.apiKey && <Badge variant="outline" className="w-fit text-xs text-primary border-primary/30">Configurado</Badge>}
          </TabsContent>
          <TabsContent value="coinbase" className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">API Key</Label>
              <Input
                className="h-8 bg-muted text-sm"
                type={showPasswords['cb-key'] ? 'text' : 'password'}
                value={credentials.coinbase.apiKey}
                onChange={(e) => setCredentials('coinbase', { ...credentials.coinbase, apiKey: e.target.value })}
                placeholder="Coinbase API Key"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">API Secret</Label>
              <div className="flex gap-1.5">
                <Input
                  className="h-8 bg-muted text-sm flex-1"
                  type={showPasswords['cb-secret'] ? 'text' : 'password'}
                  value={credentials.coinbase.apiSecret}
                  onChange={(e) => setCredentials('coinbase', { ...credentials.coinbase, apiSecret: e.target.value })}
                  placeholder="Coinbase API Secret"
                />
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => toggle('cb-secret')}>
                  {showPasswords['cb-secret'] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Key File (opcional)</Label>
              <Input
                className="h-8 bg-muted text-sm"
                value={credentials.coinbase.keyFile}
                onChange={(e) => setCredentials('coinbase', { ...credentials.coinbase, keyFile: e.target.value })}
                placeholder="Caminho ou conteudo do key file"
              />
            </div>
            {credentials.coinbase.apiKey && <Badge variant="outline" className="w-fit text-xs text-primary border-primary/30">Configurado</Badge>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
