'use client'

import { useSettingsStore } from '@/lib/store'
import { getBaseUrl } from '@/lib/api-client'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RefreshCw, Settings2, Link2 } from 'lucide-react'

export function AppHeader() {
  const { correlationEnabled, correlationId, setCorrelationEnabled, generateCorrelationId, setCorrelationId } = useSettingsStore()

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      <div className="flex items-center gap-2">
        <Link2 className="size-3.5 text-muted-foreground" />
        <code className="text-xs font-mono text-muted-foreground">{getBaseUrl()}</code>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Settings2 className="size-3.5" />
              Correlation ID
              {correlationEnabled && (
                <span className="ml-1 size-1.5 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-card border-border" align="end">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">X-Correlation-Id</Label>
                <Switch checked={correlationEnabled} onCheckedChange={setCorrelationEnabled} />
              </div>
              {correlationEnabled && (
                <div className="flex flex-col gap-2">
                  <Input
                    className="h-8 bg-muted font-mono text-xs"
                    value={correlationId}
                    onChange={(e) => setCorrelationId(e.target.value)}
                    placeholder="UUID"
                  />
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={generateCorrelationId}>
                    Gerar UUID
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={handleReload}>
          <RefreshCw className="size-3.5" />
          Recarregar
        </Button>
      </div>
    </header>
  )
}
