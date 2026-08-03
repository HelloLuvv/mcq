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
  const admin = import.meta.env.VITE_ADMIN_EMAIL
  if (!admin) return false
  return user.email.toLowerCase() === admin.toLowerCase()
}
