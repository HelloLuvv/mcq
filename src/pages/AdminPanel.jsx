import { adminStats } from '../data'
import ThemeToggle from '../components/ThemeToggle'
import ProtectedRoute from '../components/ProtectedRoute'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { practiceQuestions, mockTests } from '../data'

function AdminPanel() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuestions: practiceQuestions.length,
    totalMockTests: mockTests.length,
    totalAttempts: 0,
    totalMockResults: 0,
    avgAccuracy: 0,
  })
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Fetch users
        const { data: usersData, error: usersError } = await supabase.from('users').select('*')
        if (!usersError && mounted) setUsers(usersData || [])

        // Fetch counts
        const [{ count: attemptsCount }, { count: resultsCount }] = await Promise.all([
          supabase.from('attempts').select('*', { count: 'exact', head: true }),
          supabase.from('mock_test_results').select('*', { count: 'exact', head: true }),
        ])

        if (mounted) {
          setStats(prev => ({
            ...prev,
            totalUsers: usersData?.length || 0,
            totalAttempts: attemptsCount || 0,
            totalMockResults: resultsCount || 0,
          }))

          // Calculate average accuracy from mock test results
          const { data: results } = await supabase.from('mock_test_results').select('percentage')
          if (results && results.length > 0) {
            const avg = results.reduce((sum, r) => sum + parseFloat(r.percentage), 0) / results.length
            setStats(prev => ({ ...prev, avgAccuracy: Math.round(avg * 10) / 10 }))
          }
        }
      } catch (e) {
        console.error('Admin panel load error:', e.message)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => (mounted = false)
  }, [])

  const promote = async (email) => {
    const { error } = await supabase.from('users').update({ role: 'admin' }).eq('email', email)
    if (error) return alert('Error updating role: ' + error.message)
    setUsers((u) => u.map((x) => (x.email === email ? { ...x, role: 'admin' } : x)))
  }

  if (loading) return <div className="page-shell"><p>Loading admin panel...</p></div>

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
          <h2>Platform Overview</h2>
          <div className="stats-row">
            <div className="stat-card"><strong>{stats.totalUsers}</strong><span>Total Students</span></div>
            <div className="stat-card"><strong>{stats.totalQuestions}</strong><span>Questions</span></div>
            <div className="stat-card"><strong>{stats.totalMockTests}</strong><span>Mock Tests</span></div>
            <div className="stat-card"><strong>{stats.totalAttempts}</strong><span>Practice Attempts</span></div>
            <div className="stat-card"><strong>{stats.totalMockResults}</strong><span>Mock Test Results</span></div>
            <div className="stat-card"><strong>{stats.avgAccuracy}%</strong><span>Avg Accuracy</span></div>
          </div>
        </div>

        <div className="panel">
          <h2>Recent Activity</h2>
          <ul className="stack-list">
            <li className="list-card">New question bank uploaded for Physics</li>
            <li className="list-card">Mock test result review completed</li>
            <li className="list-card">Student account verification pending</li>
          </ul>
        </div>

        <div className="panel">
          <h2>Users Management</h2>
          <div>
            {users.length === 0 && <p>No users found.</p>}
            {users.map((u) => (
              <div key={u.email} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, padding: '14px 16px' }}>
                <div>
                  <strong>{u.email}</strong>
                  <div style={{ color: 'var(--text-secondary)' }}>{u.role} {u.supabase_id && `• ${u.supabase_id.slice(0,8)}`}</div>
                </div>
                <div>
                  {u.role !== 'admin' && <button className="btn btn-primary" onClick={() => promote(u.email)}>Promote to Admin</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminPanel
