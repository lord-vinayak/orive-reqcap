import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { userService } from '@/services'
import type { User } from '@/types'

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', role: 'user', password: '' })
  const [error, setError] = useState('')

  const load = async () => {
    const res = await userService.list()
    setUsers(Array.isArray(res) ? res : res.results)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await userService.create(form as any)
      setForm({ email: '', name: '', role: 'user', password: '' })
      setShowForm(false)
      load()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Create failed')
    }
  }

  const handleToggle = async (u: User) => {
    await userService.update(u.id, { is_active: !u.is_active })
    load()
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add user'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 max-w-xl space-y-4">
          <div>
            <label className="block mb-1">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full" />
          </div>
          <div>
            <label className="block mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full" />
          </div>
          <div>
            <label className="block mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Initial password (optional)</label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank to use default"
              className="w-full"
            />
            <p className="text-xs text-black/50 mt-1">User can sign in with Google using this email, or use email + password.</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className="btn-primary">Create user</button>
        </form>
      )}

      <div className="card">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className="badge">{u.role}</span></td>
                <td>{u.is_active ? 'Active' : 'Inactive'}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleToggle(u)} className="btn-secondary text-xs">
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
