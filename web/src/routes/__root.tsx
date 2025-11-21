import { Outlet, createRootRoute, useRouterState, Link } from '@tanstack/react-router'
import { Suspense, lazy, useEffect, useState } from 'react'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Home, Star, TrendingUp, User } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const LoginDialog = lazy(() => import('@/components/auth/LoginDialog'))

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

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [auth, setAuth] = useState<{ user: any; token: string } | null>(null)
    const [authError, setAuthError] = useState<string | null>(null)
    const [loginOpen, setLoginOpen] = useState(false)
    const [loggingIn, setLoggingIn] = useState(false)

    useEffect(() => {
      const stored = localStorage.getItem('resonate_auth')
      if (stored) {
        try {
          setAuth(JSON.parse(stored))
        } catch {
          setAuth(null)
        }
      }
    }, [])

    const handleLogin = async () => {
      setLoggingIn(true)
      setAuthError(null)
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setAuthError(typeof data.error === 'string' ? data.error : 'Login failed')
        } else {
          const payload = { user: data.user, token: data.token }
          setAuth(payload)
          localStorage.setItem('resonate_auth', JSON.stringify(payload))
          setLoginOpen(false)
          setAuthError(null)
          setEmail('')
          setPassword('')
        }
      } catch (err: any) {
        setAuthError('Network error while logging in')
      } finally {
        setLoggingIn(false)
      }
    }

    return (
      <div className="h-dvh w-dvw overscroll-none flex">
        <SidebarProvider className="overscroll-none">
          <Sidebar collapsible="icon" className="overscroll-none">
            {auth ? (
              <SidebarHeader className="border-b px-3 py-2">
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold leading-tight">Resonate</span>
                  <div className="text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">
                      {auth.user?.username || auth.user?.email}
                    </div>
                    <div className="truncate">{auth.user?.email}</div>
                  </div>
                </div>
              </SidebarHeader>
            ) : (
              <Dialog
                open={loginOpen}
                onOpenChange={(open) => {
                  setLoginOpen(open)
                  if (!open) setAuthError(null)
                }}
              >
                <DialogTrigger asChild>
                  <SidebarHeader className="cursor-pointer select-none border-b px-3 py-2 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-semibold leading-tight">Resonate</span>
                      <span className="text-xs text-muted-foreground">Click to log in</span>
                    </div>
                  </SidebarHeader>
                </DialogTrigger>
                <Suspense fallback={null}>
                  <LoginDialog
                    open={loginOpen}
                    onOpenChange={(open) => {
                      setLoginOpen(open)
                      if (!open) setAuthError(null)
                    }}
                    email={email}
                    password={password}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onSubmit={handleLogin}
                    isLoading={loggingIn}
                    error={authError}
                  />
                </Suspense>
              </Dialog>
            )}
            <SidebarContent className="overscroll-none">
              <SidebarGroup className="overscroll-none">
                <SidebarGroupContent className="pt-2">
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
            <SidebarFooter className="border-t px-3 py-2">
              {auth ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setAuth(null)
                    localStorage.removeItem('resonate_auth')
                  }}
                >
                  Log out
                </Button>
              ) : (
                <Dialog
                  open={loginOpen}
                  onOpenChange={(open) => {
                    setLoginOpen(open)
                    if (!open) setAuthError(null)
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Log in
                    </Button>
                  </DialogTrigger>
                  <Suspense fallback={null}>
                    <LoginDialog
                      open={loginOpen}
                      onOpenChange={(open) => {
                        setLoginOpen(open)
                        if (!open) setAuthError(null)
                      }}
                      email={email}
                      password={password}
                      onEmailChange={setEmail}
                      onPasswordChange={setPassword}
                      onSubmit={handleLogin}
                      isLoading={loggingIn}
                      error={authError}
                    />
                  </Suspense>
                </Dialog>
              )}
            </SidebarFooter>
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
