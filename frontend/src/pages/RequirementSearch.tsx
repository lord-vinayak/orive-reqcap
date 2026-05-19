import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { clientService, requirementService } from '@/services'
import type { Client, Requirement } from '@/types'

export default function RequirementSearch() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [client, setClient] = useState<Client | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true); setClient(null); setRequirements([])
    try {
      const c = await clientService.get(phone.trim())
      setClient(c)
      const result = await requirementService.listForClient(phone.trim())
      const list = Array.isArray(result) ? result : result.results
      setRequirements(list)
      if (list.length === 0) {
        setError('No requirements yet for this client.')
      }
    } catch (err: any) {
      setError(err.response?.status === 404
        ? 'No client found with this phone number.'
        : 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-6">Edit Old Requirement</h1>

      <form onSubmit={handleSearch} className="card max-w-xl mb-6">
        <label htmlFor="phone" className="block mb-2">Client Phone Number</label>
        <div className="flex gap-2">
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            required
            className="flex-1"
            aria-required="true"
          />
          <button type="submit" disabled={loading || !phone} className="btn-primary">
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700 mt-3">{error}</p>}
      </form>

      {client && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-2">{client.name}</h2>
          <div className="text-sm text-black/70 space-y-1">
            <div>Phone: {client.phone_no}</div>
            {client.company_name && <div>Company: {client.company_name}</div>}
            {client.poc_name && <div>POC: {client.poc_name}</div>}
          </div>
        </div>
      )}

      {requirements.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Requirements ({requirements.length})</h3>
          <table className="table-clean">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th># Products</th>
                <th>Last updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td><span className="badge">{r.status}</span></td>
                  <td>{r.no_of_products ?? '—'}</td>
                  <td>{new Date(r.updated_at).toLocaleString()}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/requirements/${r.id}`)}
                      className="btn-secondary text-sm"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
