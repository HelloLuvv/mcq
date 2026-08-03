import { Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import StudentPortal from './pages/StudentPortal'
import AdminPanel from './pages/AdminPanel'
import Auth from './pages/Auth'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student" element={<StudentPortal />} />
        <Route path="/admin" element={<ProtectedRoute adminRequired={true}><AdminPanel /></ProtectedRoute>} />
        <Route path="/auth" element={<Auth />} />
      </Routes>

      <footer className="footer">
        <p>SmartMCQ • Final Year Project Prototype</p>
        <Link to="/">Back to Home</Link>
      </footer>
    </div>
  )
}

export default App
