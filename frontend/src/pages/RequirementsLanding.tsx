import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { Plus, Search, Upload } from 'lucide-react'
 

export default function RequirementsLanding() {
  const navigate = useNavigate()
  return (
    <Layout title="Requirements">
      <div className="max-w-3xl mx-auto pt-8">
        <h1 className="text-3xl font-semibold text-black dark:text-slate-100 mb-2">Requirements</h1>
        <p className="text-black/60 dark:text-slate-400 mb-10">Capture a new requirement or edit an existing one.</p>

        <div className="grid sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/requirements/new')}
            className="card text-left hover:border-mustard/60 hover:-translate-y-1 hover:shadow-lg hover:shadow-mustard/5 dark:hover:shadow-mustard/10 transition-all duration-300 group"
          >
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700"><Plus /></span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Capture New Requirement</h2>
            <p className="text-sm text-black/60 dark:text-slate-400">Start a fresh requirement for a client.</p>
          </button>

          <button
            onClick={() => navigate('/requirements/search')}
            className="card text-left hover:border-mustard/60 hover:-translate-y-1 hover:shadow-lg hover:shadow-mustard/5 dark:hover:shadow-mustard/10 transition-all duration-300 group"
          >
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700"><Search /></span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Edit Old Requirement</h2>
            <p className="text-sm text-black/60 dark:text-slate-400">Search by client phone number.</p>
          </button>

          <button
            onClick={() => navigate('/requirements/import')}
            className="card text-left hover:border-mustard/60 hover:-translate-y-1 hover:shadow-lg hover:shadow-mustard/5 dark:hover:shadow-mustard/10 transition-all duration-300 group"
          >
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700"><Upload /></span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Import Clients from Excel</h2>
            <p className="text-sm text-black/60 dark:text-slate-400">Bulk-add clients from a spreadsheet.</p>
          </button>
        </div>
      </div>
    </Layout>
  )
}
