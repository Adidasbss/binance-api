'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { ApiMeta } from '@/lib/api-client'

interface ApiResultViewerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any
  meta?: ApiMeta
  isLoading?: boolean
}

function StatusBadge({ status }: { status: number }) {
  if (status === 0) return <Badge variant="destructive">Erro de Rede</Badge>
  if (status >= 200 && status < 300) return <Badge className="bg-primary text-primary-foreground">{status}</Badge>
  if (status === 429) return <Badge className="bg-[#f97316] text-[#0c131c]">429 Rate Limited</Badge>
  if (status >= 400) return <Badge variant="destructive">{status}</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

export function ApiResultViewer({ response, meta, isLoading }: ApiResultViewerProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const handleCopy = async () => {
    if (!response) return
    await navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-heading font-medium text-foreground">Resposta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Aguardando resposta...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!response) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-heading font-medium text-foreground">Resposta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma requisicao realizada ainda.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Meta Card */}
      {meta && (
        <Card className="bg-card border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-heading font-medium text-foreground">Meta</CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge status={meta.status} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Latencia:</span>
                <span className="font-mono text-foreground">{meta.latency}ms</span>
              </div>
              {meta.requestId && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">X-Request-Id:</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                    {meta.requestId}
                  </code>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Card */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-heading font-medium text-foreground">Resposta</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" onClick={handleCopy}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expanded && (
          <CardContent className="py-0 pb-3">
            <pre className="max-h-[500px] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs text-foreground leading-relaxed">
              {JSON.stringify(response, null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
