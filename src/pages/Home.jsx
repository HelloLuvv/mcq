import { Link } from 'react-router-dom'
import { exams, features, stats } from '../data'
import ThemeToggle from '../components/ThemeToggle'
import { useEffect, useState } from 'react'
import { isAdminUser } from '../lib/auth'

function Home() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const admin = await isAdminUser()
        if (mounted) setIsAdmin(!!admin)
      } catch (e) {
        console.error('Error checking admin:', e.message)
      }
    })()
    return () => (mounted = false)
  }, [])
  return (
    <div className="app-shell">
      <header className="hero-section">
        <nav className="topbar">
          <div className="brand">SmartMCQ</div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#exams">Exams</a>
            <Link to="/student">Student Portal</Link>
            {isAdmin && <Link to="/admin">Admin Panel</Link>}
            <Link to="/auth">Login</Link>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">AI-powered exam preparation portal</p>
            <h1>Prepare smarter for school, college, and competitive exams.</h1>
            <p className="hero-text">
              Practice topic-wise MCQs, solve previous year questions, attempt mock tests,
              and review detailed insights in one secure platform.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/student">Start Practicing</Link>
              <Link className="btn btn-secondary" to="/admin">View Admin Panel</Link>
            </div>
            <div className="stats-row">
              {stats.map((item) => (
                <div key={item.label} className="stat-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-card">
            <div className="card-chip">Live performance</div>
            <h3>Weekly progress snapshot</h3>
            <ul>
              <li>Physics accuracy: 88%</li>
              <li>Math mock test: 78/100</li>
              <li>Bookmarks saved: 126</li>
            </ul>
            <div className="mini-chart">
              <span style={{ height: '68%' }} />
              <span style={{ height: '82%' }} />
              <span style={{ height: '74%' }} />
              <span style={{ height: '92%' }} />
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="section" id="features">
          <div className="section-heading">
            <p className="eyebrow">Why students love it</p>
            <h2>Everything you need to master MCQs and stay exam-ready.</h2>
          </div>
          <div className="cards-grid">
            {features.map((feature) => (
              <article key={feature.title} className="info-card">
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="exams">
          <div className="section-heading">
            <p className="eyebrow">Exam coverage</p>
            <h2>Prepare for top competitive exams with curated question banks.</h2>
          </div>
          <div className="pill-list">
            {exams.map((exam) => (
              <span key={exam} className="pill">{exam}</span>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Home
