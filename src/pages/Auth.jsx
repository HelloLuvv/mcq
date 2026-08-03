import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Link, useNavigate } from 'react-router-dom'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const signUp = async () => {
    setMessage('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Check your email for confirmation (if enabled).')
  }

  const signIn = async () => {
    setMessage('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else {
      setMessage('Signed in successfully')
      navigate('/student')
    }
  }

  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Authentication</p>
          <h1>Sign in or create an account</h1>
        </div>
      </header>

      <section className="section">
        <div className="info-card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label style={{ marginTop: 8 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={signIn}>Sign in</button>
            <button className="btn btn-secondary" onClick={signUp}>Create account</button>
            <button className="btn btn-secondary" onClick={handleSignOut}>Sign out</button>
          </div>

          {message && <p style={{ marginTop: 12 }}>{message}</p>}

          <p style={{ marginTop: 12 }}>
            <Link to="/">Back to home</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
