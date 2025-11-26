import { Outlet, createRootRoute, useRouterState, Link } from '@tanstack/react-router'
import { Suspense, lazy, useEffect, useState } from 'react'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Crown, Heart, Home, Sparkles, TrendingUp, User, Bookmark } from 'lucide-react'

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
import { useAuth, type AuthUser } from '@/hooks/use-auth'
import { AuroraText } from '@/components/ui/aurora-text'

const LoginDialog = lazy(() => import('@/components/auth/LoginDialog'))
const SignupDialog = lazy(() => import('@/components/auth/SignupDialog'))

const normalizeUser = (user: any): AuthUser => {
  const isvip: 1 | 0 = user?.isvip === 1 ? 1 : 0
  return {
    uid: String(user?.uid ?? ''),
    username: user?.username,
    email: user?.email,
    isvip,
  }
}

export const Route = createRootRoute({
  component: () => {
    const initialAuth = useAuth()
    const pathname = useRouterState({
      select: (state) => state.location.pathname,
    })
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [auth, setAuth] = useState(initialAuth)
    const [authError, setAuthError] = useState<string | null>(null)
    const [loginOpen, setLoginOpen] = useState(false)
    const [signupOpen, setSignupOpen] = useState(false)
    const [loggingIn, setLoggingIn] = useState(false)
    const [signingUp, setSigningUp] = useState(false)
    const [vipLoading, setVipLoading] = useState(false)
    const [vipError, setVipError] = useState<string | null>(null)

    const persistAuth = (userData: any, token: string) => {
      const normalizedUser = normalizeUser(userData)
      if (!normalizedUser.uid || !token) {
        setAuth(null)
        localStorage.removeItem('resonate_auth')
        return
      }
      const payload = { user: normalizedUser, token }
      setAuth(payload)
      localStorage.setItem('resonate_auth', JSON.stringify(payload))
    }

    const currentUserId = String(auth?.user?.uid ?? '1')

    const navItems = [
      { to: '/', label: 'Search', icon: Home },
      { to: '/recommendations', label: 'Recommendations', icon: Sparkles },
      { to: '/weekly-ranking', label: 'Weekly Ranking', icon: TrendingUp },
      { to: '/users/$uid', label: 'User Profile', icon: User, params: { uid: currentUserId }, matchPrefix: '/users' },
      { to: '/playlists', label: 'My Playlists', icon: User },
      { to: '/playlists/followed', label: 'Followed Playlists', icon: Bookmark, matchPrefix: '/playlists/followed' },
      { to: '/favorites', label: 'Favorites', icon: Heart, matchPrefix: '/favorites' },
    ]

    useEffect(() => {
      const stored = localStorage.getItem('resonate_auth')
      if (!stored) {
        setAuth(null)
        return
      }
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.user?.uid && parsed?.token) {
          const normalizedUser = normalizeUser(parsed.user)
          setAuth({ user: normalizedUser, token: parsed.token })
        } else {
          setAuth(null)
        }
      } catch {
        setAuth(null)
      }
    }, [])

    const handleLogin = async () => {
      setLoggingIn(true)
      setAuthError(null)
      setVipError(null)
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data?.error) {
          setAuthError(typeof data?.error === 'string' ? data.error : 'Login failed')
        } else {
          persistAuth(data.user, data.token)
          setLoginOpen(false)
          setAuthError(null)
          setVipError(null)
          setUsername('')
          setEmail('')
          setPassword('')
        }
      } catch (err: unknown) {
        console.error(err)
        setAuthError('Network error while logging in')
      } finally {
        setLoggingIn(false)
      }
    }

    const handleSignup = async () => {
      setSigningUp(true)
      setAuthError(null)
      setVipError(null)
      try {
        const effectiveUsername = username || email.split('@')[0] || 'user'
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: effectiveUsername, email, password }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data?.error) {
          setAuthError(typeof data?.error === 'string' ? data.error : 'Signup failed')
        } else {
          persistAuth(data.user, data.token)
          setLoginOpen(false)
          setAuthError(null)
          setVipError(null)
          setSignupOpen(false)
          setUsername('')
          setEmail('')
          setPassword('')
        }
      } catch (err: unknown) {
        console.error(err)
        setAuthError('Network error while signing up')
      } finally {
        setSigningUp(false)
      }
    }

    const handleMakeVip = async () => {
      if (!auth?.user?.uid || !auth?.token) {
        setVipError('Log in to upgrade to VIP')
        return
      }
      setVipLoading(true)
      setVipError(null)
      try {
        const res = await fetch(`/api/users/${auth.user.uid}/vip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
          },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data?.error) {
          throw new Error(data?.error || 'Failed to promote to VIP')
        }
        persistAuth({ ...auth.user, isvip: 1 }, auth.token)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to promote to VIP'
        setVipError(message)
      } finally {
        setVipLoading(false)
      }
    }

    const isVip = auth?.user?.isvip === 1

    return (
      <div className="h-dvh w-dvw overscroll-none flex">
        <SidebarProvider className="overscroll-none">
          <Sidebar 
            collapsible="icon" 
            className={`overscroll-none ${
              isVip ? "border-r-2 border-amber-400/40 shadow-lg shadow-amber-500/20" : ""
            }`}
          >
            {isVip && (
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none z-0" />
            )}
            {auth ? (
              <SidebarHeader className={`border-b px-3 py-2 relative ${
                isVip ? "bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border-amber-400/30" : ""
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className={`text-base font-semibold leading-tight ${
                      isVip ? "bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent" : ""
                    }`}>
                      {isVip ? (
                        <AuroraText className="text-base font-bold">Resonate</AuroraText>
                      ) : (
                        "Resonate"
                      )}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium line-clamp-1">
                        {auth.user?.isvip === 1 ? (
                          <AuroraText className="text-sm font-bold">
                            {auth.user?.username || auth.user?.email}
                          </AuroraText>
                        ) : (
                          <span className="text-foreground">{auth.user?.username || auth.user?.email}</span>
                        )}
                      </div>
                      <div className={`truncate ${isVip ? "text-amber-700/80 dark:text-amber-300/80" : ""}`}>
                        {auth.user?.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {auth.user?.isvip === 1 ? (
                      <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-3 py-1 text-[11px] font-bold text-amber-900 shadow-lg shadow-amber-500/50 animate-pulse">
                        <Crown className="size-3 fill-amber-900" />
                        VIP
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                        onClick={handleMakeVip}
                        disabled={vipLoading}
                      >
                        <Crown className="size-4" />
                        {vipLoading ? 'Adding...' : 'Make VIP'}
                      </Button>
                    )}
                    {vipError ? <span className="text-[11px] text-destructive">{vipError}</span> : null}
                  </div>
                </div>
              </SidebarHeader>
            ) : (
              <>
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
                <Dialog
                  open={signupOpen}
                  onOpenChange={(open) => {
                    setSignupOpen(open)
                    if (!open) setAuthError(null)
                  }}
                >
                  <DialogTrigger asChild>
                    <SidebarFooter className="border-t px-3 py-2">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        Sign up
                      </Button>
                    </SidebarFooter>
                  </DialogTrigger>
                  <Suspense fallback={null}>
                    <SignupDialog
                      open={signupOpen}
                      onOpenChange={(open) => {
                        setSignupOpen(open)
                        if (!open) setAuthError(null)
                      }}
                      username={username}
                      email={email}
                      password={password}
                      onUsernameChange={setUsername}
                      onEmailChange={setEmail}
                      onPasswordChange={setPassword}
                      onSubmit={handleSignup}
                      isLoading={signingUp}
                      error={authError}
                    />
                  </Suspense>
                </Dialog>
              </>
            )}
            <SidebarContent className={`overscroll-none relative ${
              isVip ? "bg-gradient-to-b from-amber-500/3 via-transparent to-transparent" : ""
            }`}>
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
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive}
                            className={isVip ? (
                              isActive 
                                ? "bg-gradient-to-r from-amber-400/20 via-yellow-400/10 to-amber-400/20 border-l-2 border-amber-400/50 shadow-sm hover:from-amber-400/30 hover:via-yellow-400/15 hover:to-amber-400/30" 
                                : "hover:bg-amber-400/10 hover:border-l-2 hover:border-amber-400/30 transition-all"
                            ) : ""}
                          >
                            <Link to={item.to} params={item.params}>
                              <Icon className={`size-4 transition-colors ${
                                isVip && isActive 
                                  ? "text-amber-700 dark:text-amber-300" 
                                  : isVip 
                                    ? "text-amber-600/70 dark:text-amber-400/70" 
                                    : ""
                              }`} />
                              <span className={
                                isVip && isActive 
                                  ? "text-amber-900 dark:text-amber-100 font-semibold" 
                                  : isVip 
                                    ? "text-amber-800/80 dark:text-amber-200/80" 
                                    : ""
                              }>
                                {item.label}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className={`border-t px-3 py-2 relative ${
              isVip ? "bg-gradient-to-t from-amber-500/10 via-yellow-500/5 to-transparent border-amber-400/30" : ""
            }`}>
              {auth ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start ${
                    isVip ? "hover:bg-amber-400/20 hover:text-amber-900 dark:hover:text-amber-100" : ""
                  }`}
                  onClick={() => {
                    setAuth(null)
                    setVipError(null)
                    setVipLoading(false)
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
