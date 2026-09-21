import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Link, useNavigate } from 'react-router-dom'
import { isAdminUser } from '../lib/auth'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  const checkAdminAndRedirect = async (_user) => {
    const admin = await isAdminUser()
    if (admin) {
      navigate('/admin')
    } else {
      navigate('/student')
    }
  }

  const handleAuth = async () => {
    setMessage('')
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) {
          setMessage(error.message)
          return
        }
        if (data.user && !data.session) {
          setMessage('Account created! Check your email for confirmation.')
        } else if (data.user) {
          setMessage('Signed up successfully')
          await checkAdminAndRedirect(data.user)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setMessage(error.message)
          return
        }
        setMessage('Signed in successfully')
        if (data.user) {
          await checkAdminAndRedirect(data.user)
        }
      }
    } catch (err) {
      setMessage(err.message || 'An unexpected error occurred')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Authentication</p>
          <h1>{isSignUp ? 'Create an account' : 'Sign in'}</h1>
        </div>
      </header>

      <section className="section">
        <div className="info-card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label style={{ marginTop: 8 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleAuth}>
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
            <button className="btn btn-secondary" onClick={handleSignOut}>
              Sign out
            </button>
          </div>

          {message && <p style={{ marginTop: 12, color: message.includes('successfully') || message.includes('created') ? 'green' : 'red' }}>{message}</p>}

          <p style={{ marginTop: 12 }}>
            <button 
              type="button" 
              className="btn btn-link" 
              onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: 0 }}
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </p>

          <p style={{ marginTop: 12 }}>
            <Link to="/">Back to home</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
