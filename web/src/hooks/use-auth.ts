import { useEffect, useState } from 'react'

export type AuthUser = {
  uid: string
  username?: string
  email?: string
  isvip?: 1 | 0
}

export type AuthState = {
  user: AuthUser
  token: string
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('resonate_auth')
    if (!stored) {
      setAuth(null)
      return
    }
    try {
      const parsed = JSON.parse(stored)
      if (parsed?.user?.uid && parsed?.token) {
        setAuth(parsed)
      } else {
        setAuth(null)
      }
    } catch {
      setAuth(null)
    }
  }, [])

  return auth
}
