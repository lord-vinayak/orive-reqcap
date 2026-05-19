import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import RequirementsLanding from '@/pages/RequirementsLanding'
import RequirementSearch from '@/pages/RequirementSearch'
import RequirementForm from '@/pages/RequirementForm'
import ProposalPage from '@/pages/Proposal'
import AdminUsers from '@/pages/AdminUsers'
import AdminCatalog from '@/pages/AdminCatalog'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Login />} />

      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/requirements" element={<ProtectedRoute><RequirementsLanding /></ProtectedRoute>} />
      <Route path="/requirements/search" element={<ProtectedRoute><RequirementSearch /></ProtectedRoute>} />
      <Route path="/requirements/new" element={<ProtectedRoute><RequirementForm /></ProtectedRoute>} />
      <Route path="/requirements/:id" element={<ProtectedRoute><RequirementForm /></ProtectedRoute>} />
      <Route path="/requirements/:id/proposal" element={<ProtectedRoute><ProposalPage /></ProtectedRoute>} />

      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/catalog" element={<ProtectedRoute adminOnly><AdminCatalog /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
