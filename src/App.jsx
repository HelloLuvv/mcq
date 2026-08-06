import { Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import StudentPortal from './pages/StudentPortal'
import AdminPanel from './pages/AdminPanel'
import Auth from './pages/Auth'
import MockTest from './pages/MockTest'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student" element={<StudentPortal />} />
        <Route path="/admin" element={<ProtectedRoute adminRequired={true}><AdminPanel /></ProtectedRoute>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/mock-test/:testId" element={<ProtectedRoute><MockTest /></ProtectedRoute>} />
      </Routes>

      <footer className="footer">
        <p>SmartMCQ</p>
        <Link to="/">Back to Home</Link>
      </footer>
    </div>
  )
}

export default App
