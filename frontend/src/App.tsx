import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ScrollToTop } from '@/components/ScrollToTop'
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
import CRMFinancials from '@/pages/crm/CRMFinancials'
import ClientBulkUpload from '@/pages/ClientBulkUpload'
import RequirementsAdd from '@/pages/RequirementsAdd'
import TaskTracker from '@/pages/crm/TaskTracker'
import BatchRegister from '@/pages/BatchRegister'
import IngredientInventory from '@/pages/IngredientInventory'

export default function App() {
  return (
    <>
      {/* Stable live region — announced by Layout on every route change */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" id="page-announcer" />
      <ScrollToTop />
      <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Login />} />

      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/requirements" element={<ProtectedRoute><RequirementsLanding /></ProtectedRoute>} />
      <Route path="/requirements/add" element={<ProtectedRoute><RequirementsAdd /></ProtectedRoute>} />
      <Route path="/requirements/search" element={<ProtectedRoute><RequirementSearch /></ProtectedRoute>} />
      <Route path="/requirements/import" element={<ProtectedRoute><ClientBulkUpload /></ProtectedRoute>} />
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
      <Route path="/crm/financials" element={<ProtectedRoute adminOnly><CRMFinancials /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><TaskTracker /></ProtectedRoute>} />
      <Route path="/batch-register" element={<ProtectedRoute><BatchRegister /></ProtectedRoute>} />
      <Route path="/ingredient-inventory" element={<ProtectedRoute><IngredientInventory /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  )
}
