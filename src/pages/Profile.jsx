import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ThemeToggle from '../components/ThemeToggle'

function Profile() {
  const [attempts, setAttempts] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [stats, setStats] = useState({ total: 0, correct: 0 })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: atts } = await supabase
        .from('attempts')
        .select('*, questions:question_id(id, topic, exam)')
        .eq('supabase_user_id', user.id)
        .order('created_at', { ascending: false })

      const { data: bms } = await supabase
        .from('bookmarks')
        .select('*, questions:question_id(id, topic, exam, question)')
        .eq('supabase_user_id', user.id)

      if (!mounted) return
      setAttempts(atts || [])
      setBookmarks(bms || [])

      const total = (atts || []).length
      const correct = (atts || []).filter((a) => a.correct).length
      setStats({ total, correct })
    })()

    return () => (mounted = false)
  }, [])

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your profile</p>
          <h1>Progress & bookmarks</h1>
        </div>
        <div>
          <ThemeToggle />
        </div>
      </header>

      <section className="panel">
        <h2>Summary</h2>
        <p>Total attempts: {stats.total}</p>
        <p>Correct answers: {stats.correct}</p>
        <p>Accuracy: {stats.total ? Math.round((stats.correct / stats.total) * 100) : 0}%</p>
      </section>

      <section className="panel">
        <h2>Recent attempts</h2>
        <div className="stack-list">
          {attempts.map((a) => (
            <div key={a.id} className="list-card">
              <div><strong>{a.questions?.question || 'Question'}</strong></div>
              <div>{a.questions?.topic} — {a.questions?.exam}</div>
              <div>{a.correct ? 'Correct' : 'Incorrect'} • {new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Bookmarks</h2>
        <div className="stack-list">
          {bookmarks.map((b) => (
            <div key={b.id} className="list-card">
              <div><strong>{b.questions?.question || 'Bookmarked question'}</strong></div>
              <div>{b.questions?.topic} — {b.questions?.exam}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Profile
