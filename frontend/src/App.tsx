import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/common/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'
import NotFound from './pages/NotFound'
import EditorPage from './pages/EditorPage'
import PublicProject from './pages/PublicProject'

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/editor/:projectId" element={<EditorPage />} />
        <Route path="/editor" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="/p/:slug" element={<PublicProject />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
