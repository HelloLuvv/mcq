import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { isAdminUser } from '../lib/auth'

export default function ProtectedRoute({ children, adminRequired = false }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!mounted) return
        if (error || !user) {
          setAuthorized(false)
          setLoading(false)
          return
        }
        if (adminRequired) {
          setAuthorized(await isAdminUser())
        } else {
          setAuthorized(true)
        }
        setLoading(false)
      } catch (e) {
        console.error('Auth check failed:', e)
        if (mounted) {
          setAuthorized(false)
          setLoading(false)
        }
      }
    })()
    return () => (mounted = false)
  }, [adminRequired])

  if (loading) {
    return (
      <div className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }
  if (!authorized) return <Navigate to="/auth" replace />
  return children
}
