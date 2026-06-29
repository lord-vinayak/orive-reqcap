import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { Plus, Search, Upload } from 'lucide-react'
 

export default function RequirementsLanding() {
  const navigate = useNavigate()
  return (
    <Layout title="Requirements">
      <div className="max-w-3xl mx-auto pt-8">
        <h1 className="text-3xl font-semibold text-black dark:text-slate-100 mb-2">Requirements</h1>
        <p className="text-black/60 dark:text-slate-300 mb-10">Create a new requirement or update an existing one.</p>

        <div className="grid sm:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/requirements/new')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/requirements/new'); } }}
            role="button"
            tabIndex={0}
            className="card text-left hover:border-mustard transition-colors group cursor-pointer"
            aria-label="Capture a new client requirement"
          >
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700"><Plus /></span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Capture New Requirement</h2>
            <p className="text-sm text-black/70 dark:text-slate-300">Start a fresh requirement for a client.</p>
          </div>

          <div
            onClick={() => navigate('/requirements/search')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/requirements/search'); } }}
            role="button"
            tabIndex={0}
            className="card text-left hover:border-mustard transition-colors group cursor-pointer"
            aria-label="Search and edit an existing requirement"
          >
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700"><Search /></span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Update Existing Requirement</h2>
            <p className="text-sm text-black/70 dark:text-slate-300">Search by client phone number.</p>
          </div>

          <div
            onClick={() => navigate('/requirements/import')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/requirements/import'); } }}
            role="button"
            tabIndex={0}
            className="card text-left hover:border-mustard transition-colors group cursor-pointer"
            aria-label="Import clients from an Excel spreadsheet"
          >
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700"><Upload /></span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Import Clients from Excel</h2>
            <p className="text-sm text-black/70 dark:text-slate-300">Import multiple clients from an Excel spreadsheet.</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
