import { supabase } from './supabaseClient'

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function isAdminUser() {
  const user = await getCurrentUser()
  if (!user || !user.email) return false

  // Check env variable (for first admin / fallback)
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
  if (adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase()) {
    return true
  }

  // Check database for admin role
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email.toLowerCase())
      .single()
    return data?.role === 'admin'
  } catch {
    return false
  }
}
