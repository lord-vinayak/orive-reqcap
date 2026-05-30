import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import RequirementsLanding from '@/pages/RequirementsLanding'
import RequirementSearch from '@/pages/RequirementSearch'
import RequirementForm from '@/pages/RequirementForm'
import ProposalPage from '@/pages/Proposal'
import RequirementView from '@/pages/RequirementView'
import AdminUsers from '@/pages/AdminUsers'
import AdminCatalog from '@/pages/AdminCatalog'

// CRM pages
import CRMDashboard from '@/pages/crm/CRMDashboard'
import CRMClientList from '@/pages/crm/CRMClientList'
import CRMClientCreate from '@/pages/crm/CRMClientCreate'
import CRMClientDetail from '@/pages/crm/CRMClientDetail'
import CRMProjectList from '@/pages/crm/CRMProjectList'
import CRMProjectDetail from '@/pages/crm/CRMProjectDetail'
import CRMMasterData from '@/pages/crm/CRMMasterData'
import CRMProjectCreate from '@/pages/crm/CRMProjectCreate'

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
      <Route path="/requirements/:id/view" element={<ProtectedRoute><RequirementView /></ProtectedRoute>} />
      <Route path="/requirements/:id/proposal" element={<ProtectedRoute><ProposalPage /></ProtectedRoute>} />

      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/catalog" element={<ProtectedRoute adminOnly><AdminCatalog /></ProtectedRoute>} />

      {/* CRM routes */}
      <Route path="/crm" element={<Navigate to="/crm/dashboard" replace />} />
      <Route path="/crm/dashboard" element={<ProtectedRoute><CRMDashboard /></ProtectedRoute>} />
      <Route path="/crm/clients" element={<ProtectedRoute><CRMClientList /></ProtectedRoute>} />
      <Route path="/crm/clients/new" element={<ProtectedRoute><CRMClientCreate /></ProtectedRoute>} />
      <Route path="/crm/clients/:phoneNo" element={<ProtectedRoute><CRMClientDetail /></ProtectedRoute>} />
      <Route path="/crm/projects" element={<ProtectedRoute><CRMProjectList /></ProtectedRoute>} />
      <Route path="/crm/projects/new" element={<ProtectedRoute><CRMProjectCreate /></ProtectedRoute>} />
      <Route path="/crm/projects/:id" element={<ProtectedRoute><CRMProjectDetail /></ProtectedRoute>} />
      <Route path="/crm/master-data" element={<ProtectedRoute><CRMMasterData /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
