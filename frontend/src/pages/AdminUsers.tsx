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
    <Layout title="Manage Users">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add user'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 max-w-xl space-y-4" aria-label="Create new user">
          <div>
            <label htmlFor="new-user-name" className="block mb-1">Name</label>
            <input id="new-user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full" aria-required="true" />
          </div>
          <div>
            <label htmlFor="new-user-email" className="block mb-1">Email</label>
            <input id="new-user-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full" aria-required="true" />
          </div>
          <div>
            <label htmlFor="new-user-role" className="block mb-1">Role</label>
            <select id="new-user-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="new-user-password" className="block mb-1">Initial password (optional)</label>
            <input
              id="new-user-password"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank to use default"
              className="w-full"
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="text-xs text-black/60 mt-1">User can sign in with Google using this email, or use email + password.</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary">Create user</button>
        </form>
      )}

      <div className="card">
        <table className="table-clean" aria-label="Users list">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Created</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
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
                  <button
                    onClick={() => handleToggle(u)}
                    className="btn-secondary text-xs"
                    aria-label={u.is_active ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                  >
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
