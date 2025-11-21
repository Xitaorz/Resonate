import { Outlet, createRootRoute, useRouterState, Link } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Compass, Home, Star, TrendingUp, User } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from '@/components/ui/sidebar'

export const Route = createRootRoute({
  component: () => {
    const pathname = useRouterState({
      select: (state) => state.location.pathname,
    })

    const navItems = [
      { to: '/', label: 'Search', icon: Home },
      { to: '/ratings', label: 'Ratings', icon: Star },
      { to: '/weekly-ranking', label: 'Weekly Ranking', icon: TrendingUp },
      { to: '/users/$uid', label: 'User Profile', icon: User, params: { uid: '1' }, matchPrefix: '/users' },
      { to: '/playlists', label: 'Playlists', icon: User, matchPrefix: '/playlists' },
    ]

    return (
      <div className='h-dvh w-dvw overscroll-none flex'>
      <SidebarProvider className='overscroll-none'>
        <Sidebar collapsible="icon" className="overscroll-none">
          <SidebarContent className='overscroll-none'>
            <SidebarGroup className='overscroll-none'>
              <SidebarGroupLabel className="flex items-center gap-2 overscroll-none">
                <Compass className="size-4" />
                <span className="truncate">Resonate</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      item.matchPrefix && pathname.startsWith(item.matchPrefix)
                        ? true
                        : pathname === item.to
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.to} params={item.params}>
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="bg-background overscroll-none">
          <div className="h-dvh overscroll-none overflow-scroll">
            <Outlet />
          </div>
          {import.meta.env.DEV ? (
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
          ) : null}
        </SidebarInset>
        </SidebarProvider>
      </div>
    )
  },
})
