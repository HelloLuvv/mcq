import { useEffect, useMemo, useState } from 'react'
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
  }, [selectedExam])

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
            {submitted && (
              <div className="feedback-box">
                <p><strong>Your answer:</strong> {selectedAnswer || 'No answer selected'}</p>
                <p><strong>Correct answer:</strong> {current.answer}</p>
                <p>{current.explanation}</p>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <h2>Mock tests</h2>
          <div className="stack-list">
            {mockTests.map((test) => (
              <div key={test.id} className="list-card">
                <h3>{test.title}</h3>
                <p>{test.duration} • {test.questions} questions</p>
                <span>{test.level}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default StudentPortal
