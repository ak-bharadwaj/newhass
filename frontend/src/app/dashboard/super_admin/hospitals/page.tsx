'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import apiClient from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function SuperAdminHospitals() {
  const { token } = useAuth()
  const [hospitals, setHospitals] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    region_id: '',
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    bed_capacity: 0,
    // Optional branding
    logo_url: '',
    primary_color: '#2563eb',
    secondary_color: '#d946ef',
    accent_color: '#f59e0b',
  })

  const [adminForm, setAdminForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    generatePassword: true,
  })

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token) return
      setLoading(true); setError('')
      try {
        const [rh, rs] = await Promise.all([
          apiClient.getHospitals(token).catch(() => []),
          apiClient.getRegions(token).catch(() => []),
        ])
        if (!ignore) {
          setHospitals(rh || [])
          setRegions(rs || [])
        }
      } catch (e) {
        if (!ignore) setError('Failed to load hospitals')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token])

  const filteredHospitals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return hospitals
    return hospitals.filter((h: any) =>
      h.name?.toLowerCase().includes(q) ||
      h.code?.toLowerCase().includes(q) ||
      h.region_name?.toLowerCase().includes(q)
    )
  }, [searchQuery, hospitals])

  const stats = useMemo(() => {
    const totalBeds = hospitals.reduce((sum: number, h: any) => sum + (h.bed_capacity || 0), 0)
    const occupied = hospitals.reduce((sum: number, h: any) => sum + (h.occupied_beds || 0), 0)
    const occupancy = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0
    return {
      total: hospitals.length,
      totalBeds,
      occupancy,
    }
  }, [hospitals])

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let pwd = ''
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
    return pwd
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !form.region_id || !form.name || !form.code) return
    setCreating(true); setError('')
    try {
      // 1) Create hospital
      const hospital = await apiClient.createHospital({
        region_id: form.region_id,
        name: form.name,
        code: form.code,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        bed_capacity: form.bed_capacity || 0,
        logo_url: form.logo_url || undefined,
        primary_color: form.primary_color || undefined,
        secondary_color: form.secondary_color || undefined,
        accent_color: form.accent_color || undefined,
      }, token)

      // 2) Create and assign hospital admin
      const password = adminForm.generatePassword || !adminForm.password
        ? generatePassword()
        : adminForm.password

      // Resolve role_id for 'hospital_admin' dynamically by querying existing users with that role.
      // Backend currently requires role_id; there is no public roles list endpoint. We attempt to
      // discover a representative role_id by fetching any existing user with the target role_name.
      const resolveRoleId = async (roleName: string): Promise<string | null> => {
        try {
          const usersRes = await apiClient.getUsers(token, { role_name: roleName, page: 1, page_size: 1 })
          if (usersRes && (usersRes as any).users && (usersRes as any).users.length > 0) {
            return (usersRes as any).users[0].role_id
          }
          return null
        } catch (err) {
          return null
        }
      }

      const resolvedRoleId = await resolveRoleId('hospital_admin')
      if (!resolvedRoleId) {
        throw new Error('Unable to determine role_id for hospital_admin. Please ensure the role exists on the backend or create the hospital admin role before creating users.')
      }

      await apiClient.createUser({
        email: adminForm.email,
        password,
        first_name: adminForm.first_name,
        last_name: adminForm.last_name,
        phone: adminForm.phone || undefined,
        role_id: resolvedRoleId,
        role_name: 'hospital_admin',
        region_id: form.region_id,
        hospital_id: (hospital as any).id,
        is_active: true,
      } as any, token)

      // Reload list
      const rh = await apiClient.getHospitals(token)
      setHospitals(rh || [])
      setShowCreate(false)
      // Reset forms
      setForm({
        region_id: '', name: '', code: '', address: '', phone: '', email: '', bed_capacity: 0,
        logo_url: '', primary_color: '#2563eb', secondary_color: '#d946ef', accent_color: '#f59e0b'
      })
      setAdminForm({ first_name: '', last_name: '', email: '', phone: '', password: '', generatePassword: true })
    } catch (e: any) {
      setError(e?.message || 'Failed to create hospital and admin')
    } finally {
      setCreating(false)
    }
  }

  return (
    <EnterpriseDashboardLayout role="super_admin">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/super_admin" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2">
            All Hospitals
          </h1>
          <p className="text-gray-600">System-wide hospital directory and creation</p>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Total Hospitals', value: stats.total, color: 'from-red-500 to-pink-500', icon: '🏥' },
            { label: 'Total Beds', value: stats.totalBeds, color: 'from-blue-500 to-indigo-500', icon: '🛏️' },
            { label: 'Avg Occupancy', value: `${stats.occupancy}%`, color: 'from-purple-500 to-pink-500', icon: '📊' },
          ].map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="glass bg-white rounded-2xl border border-gray-100 p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center mb-6">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search hospitals by name, code, or region..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary px-5 py-3 rounded-xl shadow-soft hover:shadow-soft-lg">
            <span className="mr-2">➕</span>
            Create Hospital & Assign Admin
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Hospital</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Region</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Bed Capacity</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Occupied</th>
                </tr>
              </thead>
              <tbody>
                {filteredHospitals.map((h: any, index: number) => (
                  <motion.tr key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">{h.name}</td>
                    <td className="px-6 py-4 text-gray-600">{h.code}</td>
                    <td className="px-6 py-4 text-gray-600">{h.region_name || h.region?.name || '—'}</td>
                    <td className="px-6 py-4">{h.bed_capacity ?? '—'}</td>
                    <td className="px-6 py-4">{h.occupied_beds ?? '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreate(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Create Hospital & Assign Admin</h3>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Region *</label>
                    <select value={form.region_id} onChange={(e) => setForm({ ...form, region_id: e.target.value })} required className="input-modern">
                      <option value="" disabled>Select region</option>
                      {regions.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Hospital Code *</label>
                    <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required className="input-modern" placeholder="NGH" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Hospital Name *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-modern" placeholder="North General Hospital" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-modern" placeholder="123 Main Street, City, State, Zip" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-modern" placeholder="+1 555 123 4567" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-modern" placeholder="contact@hospital.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Bed Capacity *</label>
                    <input type="number" min={0} value={form.bed_capacity} onChange={(e) => setForm({ ...form, bed_capacity: parseInt(e.target.value || '0') })} required className="input-modern" placeholder="100" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Logo URL</label>
                    <input type="url" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="input-modern" placeholder="https://example.com/logo.png" />
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-4">Assign Hospital Admin</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                      <input type="text" value={adminForm.first_name} onChange={(e) => setAdminForm({ ...adminForm, first_name: e.target.value })} required className="input-modern" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                      <input type="text" value={adminForm.last_name} onChange={(e) => setAdminForm({ ...adminForm, last_name: e.target.value })} required className="input-modern" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                      <input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} required className="input-modern" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                      <input type="tel" value={adminForm.phone} onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} className="input-modern" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                      <input type="text" value={adminForm.generatePassword ? 'Auto-generated on create' : adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value, generatePassword: false })} disabled={adminForm.generatePassword} className="input-modern disabled:opacity-50" />
                      <div className="mt-2 flex items-center gap-2">
                        <input id="genpwd" type="checkbox" checked={adminForm.generatePassword} onChange={(e) => setAdminForm({ ...adminForm, generatePassword: e.target.checked })} />
                        <label htmlFor="genpwd" className="text-sm text-gray-600">Generate strong password</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" className="btn-secondary px-5 py-2.5 rounded-xl" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" disabled={creating} className="btn-primary px-5 py-2.5 rounded-xl disabled:opacity-50">{creating ? 'Creating…' : 'Create Hospital & Admin'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
