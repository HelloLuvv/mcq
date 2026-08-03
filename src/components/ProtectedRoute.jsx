import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ProtectedRoute({ children, adminRequired = false }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (!mounted) return
      if (error || !user) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      if (adminRequired) {
        const admin = import.meta.env.VITE_ADMIN_EMAIL
        setAuthorized(admin && user.email && user.email.toLowerCase() === admin.toLowerCase())
      } else {
        setAuthorized(true)
      }
      setLoading(false)
    })()
    return () => (mounted = false)
  }, [adminRequired])

  if (loading) return null
  if (!authorized) return <Navigate to="/auth" replace />
  return children
}
