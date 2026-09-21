import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { practiceQuestions, mockTests, exams } from '../data'
import fetchQuestionsFromOpenTDB from '../lib/fetchQuestions'
import { supabase } from '../lib/supabaseClient'
import nextSRS from '../lib/srs'
import ThemeToggle from '../components/ThemeToggle'

function StudentPortal() {
  // default to first exam that has questions, fall back to exams[0]
  const initialExam = exams.find((ex) => practiceQuestions.some((q) => q.exam === ex)) || exams[0]
  const [selectedExam, setSelectedExam] = useState(initialExam)
  const [questions, setQuestions] = useState(practiceQuestions)
  const [order, setOrder] = useState([])
  const [pointer, setPointer] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [endReached, setEndReached] = useState(false)
  const [userStats, setUserStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [activeSessions, setActiveSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Filter questions by exam and prepare a shuffled non-repeating order
  const filtered = useMemo(() => questions.filter((q) => q.exam === selectedExam), [questions, selectedExam])

  useEffect(() => {
    // shuffle filtered ids
    const ids = filtered.map((q) => q.id)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    setOrder(ids)
    setPointer(0)
    setSelectedAnswer('')
    setSubmitted(false)
  }, [selectedExam, filtered])

  // Fetch user performance stats
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (mounted) setLoadingStats(false); return }

        const [{ data: attempts, count: _attemptsCount }, { data: results, count: _resultsCount }] = await Promise.all([
          supabase.from('attempts').select('question_id, correct, created_at').eq('supabase_user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('mock_test_results').select('score, correct, wrong, unattempted, percentage, test_title, created_at').eq('supabase_user_id', user.id).order('created_at', { ascending: false }),
        ])

        if (!mounted) return

        // Calculate practice stats
        const totalPractice = attempts?.length || 0
        const correctPractice = attempts?.filter(a => a.correct).length || 0
        const practiceAccuracy = totalPractice > 0 ? Math.round((correctPractice / totalPractice) * 1000) / 10 : 0

        // Topic-wise performance
        const topicStats = {}
        attempts?.forEach(a => {
          const q = practiceQuestions.find(pq => pq.id === a.question_id)
          if (q) {
            if (!topicStats[q.topic]) topicStats[q.topic] = { total: 0, correct: 0 }
            topicStats[q.topic].total++
            if (a.correct) topicStats[q.topic].correct++
          }
        })

        // Weak topics (accuracy < 50% and at least 3 attempts)
        const weakTopics = Object.entries(topicStats)
          .filter(([_, v]) => v.total >= 3 && (v.correct / v.total) < 0.5)
          .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
          .slice(0, 5)
          .map(([topic, v]) => ({ topic, accuracy: Math.round((v.correct / v.total) * 100), attempts: v.total }))

        // Strong topics (accuracy > 80% and at least 3 attempts)
        const strongTopics = Object.entries(topicStats)
          .filter(([_, v]) => v.total >= 3 && (v.correct / v.total) > 0.8)
          .sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total))
          .slice(0, 5)
          .map(([topic, v]) => ({ topic, accuracy: Math.round((v.correct / v.total) * 100), attempts: v.total }))

        // Recent mock test results
        const recentMocks = results?.slice(0, 5).map(r => ({
          title: r.test_title,
          score: r.score,
          percentage: r.percentage,
          date: r.created_at,
        })) || []

        // Average mock accuracy
        const avgMockAccuracy = results && results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + parseFloat(r.percentage), 0) / results.length * 10) / 10
          : 0

        setUserStats({
          totalPractice,
          correctPractice,
          practiceAccuracy,
          weakTopics,
          strongTopics,
          recentMocks,
          avgMockAccuracy,
          totalMocks: resultsCount || 0,
        })
      } catch (e) {
        console.error('Failed to load stats:', e.message)
      } finally {
        if (mounted) setLoadingStats(false)
      }
    })()
  }, [selectedExam])

  // Fetch active (unfinished) test sessions
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (mounted) setLoadingSessions(false); return }

        const { data: sessions, error } = await supabase
          .from('test_sessions')
          .select('id, test_id, test_title, question_order, answers, current_index, time_left, duration, started_at, last_updated')
          .eq('supabase_user_id', user.id)
          .eq('completed', false)
          .order('last_updated', { ascending: false })

        if (error) throw error

        if (mounted) {
          const validSessions = (sessions || []).filter(session => {
            const elapsed = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
            const timeLeft = Math.max(0, session.duration - elapsed)
            return timeLeft > 0
          })
          setActiveSessions(validSessions)
        }
      } catch (e) {
        console.error('Failed to load active sessions:', e.message)
      } finally {
        if (mounted) setLoadingSessions(false)
      }
    })()
  }, [])

  const current = questions.find((p) => p.id === order[pointer]) || filtered[0] || null

  const handleSubmit = () => {
    setSubmitted(true)

    ;(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const correct = selectedAnswer === current.answer

        // fetch previous attempt for this user+question
        const { data: prevs } = await supabase
          .from('attempts')
          .select('*')
          .eq('supabase_user_id', user.id)
          .eq('question_id', current.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const prev = (prevs && prevs[0]) || null
        const srs = nextSRS(prev, !!correct)

        await supabase.from('attempts').insert({
          supabase_user_id: user.id,
          question_id: current.id,
          correct,
          time_spent: null,
          ef: srs.ef,
          interval: srs.interval,
          repetition: srs.repetition,
          next_review: srs.next_review,
        })
      } catch (e) {
        console.error('Failed to record attempt', e.message)
      }
    })()
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Student portal</p>
          <h1>Practice MCQs and track your growth</h1>
        </div>
      </header>

      <section className="dashboard-grid">
        <div className="panel">
          <h2>Daily practice</h2>
            <div className="question-card">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 0 }}>Select exam:</label>
              {exams.map((ex) => (
                <button
                  key={ex}
                  className={`btn ${selectedExam === ex ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedExam(ex)}
                >
                  {ex}
                </button>
              ))}
              <button className="btn btn-secondary" onClick={async () => {
                const fresh = await fetchQuestionsFromOpenTDB({ amount: 8, exam: selectedExam })
                if (fresh && fresh.length > 0) {
                  // prepend fresh questions
                  setQuestions((prev) => [...fresh, ...prev])
                  // rebuild order to include new IDs
                  const ids = [...fresh.map((q) => q.id), ...filtered.map((q) => q.id)]
                  // shuffle ids
                  for (let i = ids.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                    ;[ids[i], ids[j]] = [ids[j], ids[i]]
                  }
                  setOrder(ids)
                  setPointer(0)
                }
              }}>Fetch fresh questions</button>
              <div style={{ marginLeft: 'auto' }}>
                <ThemeToggle />
              </div>
            </div>
            {current ? (
              <>
                <p className="question-topic">{current.topic}</p>
                <h3>{current.question}</h3>
                <div className="option-list">
                  {current.options.map((option) => (
                    <button
                      key={option}
                      className={`option-btn ${selectedAnswer === option ? 'selected' : ''}`}
                      onClick={() => setSelectedAnswer(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: 20 }}>
                <p>No practice questions available for <strong>{selectedExam}</strong>.</p>
                <p>Try selecting a different exam.</p>
              </div>
            )}
            {current && (
              <>
                <div className="action-row">
                  <button className="btn btn-primary" onClick={handleSubmit}>Check Answer</button>
                  <button
                    className="btn btn-secondary"
                    disabled={loadingMore}
                    onClick={async () => {
                      setSelectedAnswer('')
                      setSubmitted(false)
                      setEndReached(false)

                      const next = pointer + 1
                      if (next < order.length) {
                        setPointer(next)
                        return
                      }

                      // we've reached the end of the current pool — try to fetch more
                      setLoadingMore(true)
                      try {
                        const fresh = await fetchQuestionsFromOpenTDB({ amount: 8, exam: selectedExam })
                        if (fresh && fresh.length > 0) {
                          setQuestions((prev) => [...prev, ...fresh])
                          const ids = [...order, ...fresh.map((q) => q.id)]
                          for (let i = ids.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1))
                            ;[ids[i], ids[j]] = [ids[j], ids[i]]
                          }
                          setOrder(ids)
                          // advance pointer to the first of the newly added questions
                          setPointer(order.length)
                        } else {
                          setEndReached(true)
                        }
                      } catch (e) {
                        console.error('Failed to fetch more questions', e.message)
                        setEndReached(true)
                      } finally {
                        setLoadingMore(false)
                      }
                    }}
                  >
                    {loadingMore ? 'Loading...' : 'Next Question'}
                  </button>
                </div>
                {submitted && (
                  <div className="feedback-box">
                    <p><strong>Your answer:</strong> {selectedAnswer || 'No answer selected'}</p>
                    <p><strong>Correct answer:</strong> {current.answer}</p>
                    <p>{current.explanation}</p>
                  </div>
                )}
                {endReached && (
                  <div style={{ padding: 12, marginTop: 8 }}>
                    <p>No more questions available for <strong>{selectedExam}</strong>. Try fetching fresh questions.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="panel">
          <h2>Mock tests</h2>
          <div className="stack-list">
            {mockTests.map((test) => (
              <Link key={test.id} to={`/mock-test/${test.id}`} className="list-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3>{test.title}</h3>
                <p>{test.duration} • {test.questions} questions</p>
                <span>{test.level}</span>
              </Link>
            ))}
          </div>
        </div>

        {activeSessions.length > 0 && (
          <div className="panel">
            <h2>Continue Test</h2>
            {loadingSessions ? (
              <p>Loading...</p>
            ) : (
              <div className="stack-list">
                {activeSessions.map((session) => {
                  const elapsed = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
                  const timeLeft = Math.max(0, session.duration - elapsed)
                  const answeredCount = Object.keys(session.answers || {}).length
                  const totalQuestions = session.question_order?.length || 0
                  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0
                  const mins = Math.floor(timeLeft / 60)
                  const secs = timeLeft % 60

                  return (
                    <Link
                      key={session.id}
                      to={`/mock-test/${session.test_id}`}
                      className="list-card continue-test-card"
                      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: 0 }}>{session.test_title}</h3>
                          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {answeredCount}/{totalQuestions} answered • {mins}:{secs.toString().padStart(2, '0')} remaining
                          </p>
                        </div>
                        <span className="pill" style={{ background: 'var(--accent-2-soft)', color: 'var(--accent-2)', borderColor: 'var(--accent-2)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          Resume
                        </span>
                      </div>
                      <div className="progress-bar-container" style={{ height: 6, background: 'var(--surface-border)', borderRadius: 999, overflow: 'hidden' }}>
                        <div className="progress-bar-fill" style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: 999, transition: 'width 0.3s ease' }} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="panel">
          <h2>Performance Dashboard</h2>
          {loadingStats ? (
            <p>Loading your performance...</p>
          ) : userStats ? (
            <>
              <div className="stats-row" style={{ marginBottom: 20 }}>
                <div className="stat-card"><strong>{userStats.practiceAccuracy}%</strong><span>Practice Accuracy</span></div>
                <div className="stat-card"><strong>{userStats.totalPractice}</strong><span>Questions Attempted</span></div>
                <div className="stat-card"><strong>{userStats.correctPractice}</strong><span>Correct Answers</span></div>
                <div className="stat-card"><strong>{userStats.avgMockAccuracy}%</strong><span>Avg Mock Score</span></div>
                <div className="stat-card"><strong>{userStats.totalMocks}</strong><span>Mock Tests Taken</span></div>
              </div>

              {userStats.weakTopics.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ color: 'var(--danger)' }}>⚠ Weak Topics</h3>
                  <div className="pill-list">
                    {userStats.weakTopics.map((t, i) => (
                      <span key={i} className="pill" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                        {t.topic} ({t.accuracy}% • {t.attempts} attempts)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {userStats.strongTopics.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ color: 'var(--success)' }}>✓ Strong Topics</h3>
                  <div className="pill-list">
                    {userStats.strongTopics.map((t, i) => (
                      <span key={i} className="pill" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                        {t.topic} ({t.accuracy}% • {t.attempts} attempts)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {userStats.recentMocks.length > 0 && (
                <div>
                  <h3>Recent Mock Tests</h3>
                  <div className="stack-list">
                    {userStats.recentMocks.map((m, i) => (
                      <div key={i} className="list-card" style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{m.title}</strong>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Score: {m.score} • {m.percentage}%</div>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {new Date(m.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {userStats.totalPractice === 0 && userStats.totalMocks === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  <p>No performance data yet.</p>
                  <p>Start practicing or take a mock test to see your stats!</p>
                </div>
              )}
            </>
          ) : (
            <p>Unable to load performance data.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default StudentPortal
