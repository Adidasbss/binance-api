'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  Activity,
  BarChart3,
  Zap,
  TrendingUp,
  Wallet,
  ArrowLeftRight,
  CircleDot,
  LayoutDashboard,
  Lock,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const CredentialsPanel = dynamic(
  () => import('@/components/credentials-panel').then((mod) => mod.CredentialsPanel),
  { ssr: false }
)

const navigation = [
  {
    title: 'Dashboard',
    items: [
      { title: 'Home', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Infra',
    items: [
      { title: 'Health', href: '/infra/health', icon: Activity },
      { title: 'Metrics', href: '/infra/metrics', icon: BarChart3 },
    ],
  },
  {
    title: 'Binance',
    items: [
      { title: 'General', href: '/binance/general', icon: Zap },
      { title: 'Market', href: '/binance/market', icon: TrendingUp },
      { title: 'Account', href: '/binance/account', icon: Wallet, private: true },
      { title: 'Trading', href: '/binance/trading', icon: ArrowLeftRight, private: true },
    ],
  },
  {
    title: 'Coinbase',
    items: [
      { title: 'General', href: '/coinbase/general', icon: CircleDot },
      { title: 'Market', href: '/coinbase/market', icon: TrendingUp },
      { title: 'Account', href: '/coinbase/account', icon: Wallet, private: true },
      { title: 'Trading', href: '/coinbase/trading', icon: ArrowLeftRight, private: true },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="size-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-heading text-sm font-semibold text-foreground">CryptoGateway</span>
            <span className="text-[10px] text-muted-foreground">Console</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.title}
                      className={
                        pathname === item.href
                          ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span className="text-sm">{item.title}</span>
                        {item.private && (
                          <Lock className="ml-auto size-3 text-muted-foreground/50" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden p-3">
        <CredentialsPanel />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
