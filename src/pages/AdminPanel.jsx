import { adminStats } from '../data'
import ThemeToggle from '../components/ThemeToggle'
import ProtectedRoute from '../components/ProtectedRoute'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function AdminPanel() {
  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Admin panel</p>
          <h1>Manage users, questions, and exam results</h1>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle />
        </div>
      </header>

      <section className="dashboard-grid">
        <div className="panel">
          <h2>Platform overview</h2>
          <div className="stats-row">
            {adminStats.map((item) => (
              <div key={item.label} className="stat-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Recent actions</h2>
          <ul className="stack-list">
            <li className="list-card">New question bank uploaded for Physics</li>
            <li className="list-card">Mock test result review completed</li>
            <li className="list-card">Student account verification pending</li>
          </ul>
        </div>

        <div className="panel">
          <h2>Users</h2>
          <div>
            <UsersList />
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminPanel

function UsersList() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase.from('users').select('*')
      if (error) {
        console.error('Error fetching users:', error.message)
        return
      }
      if (mounted) setUsers(data || [])
    })()
    return () => (mounted = false)
  }, [])

  const promote = async (email) => {
    const { error } = await supabase.from('users').update({ role: 'admin' }).eq('email', email)
    if (error) return alert('Error updating role: ' + error.message)
    setUsers((u) => u.map((x) => (x.email === email ? { ...x, role: 'admin' } : x)))
  }

  return (
    <div>
      {users.length === 0 && <p>No users found.</p>}
      {users.map((u) => (
        <div key={u.email} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, padding: '14px 16px' }}>
          <div>
            <strong>{u.email}</strong>
            <div style={{ color: 'var(--text-secondary)' }}>{u.role}</div>
          </div>
          <div>
            {u.role !== 'admin' && <button className="btn btn-primary" onClick={() => promote(u.email)}>Promote</button>}
          </div>
        </div>
      ))}
    </div>
  )
}
