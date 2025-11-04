'use client'

import { useState, useEffect } from 'react'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/lib/api'

export default function ManagerStaff() {
  const { token, user } = useAuth()
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadStaff()
  }, [token, user?.hospital_id])

  const loadStaff = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getUsers(token)
      // Filter by hospital if user is hospital manager
      const filtered = user?.hospital_id
        ? data.users.filter((u: any) => u.hospital_id === user.hospital_id)
        : data.users
      setStaff(filtered || [])
    } catch (e: any) {
      console.error('Failed to load staff', e)
      setError(e?.message || 'Failed to load staff')
      setStaff([])
    } finally {
      setLoading(false)
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'on_leave': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const filteredStaff = staff.filter(member => {
    const matchesSearch = (member.first_name + ' ' + member.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (member.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || member.role_name === filterRole
    return matchesSearch && matchesRole
  })

  const roleColors: Record<string, string> = {
    doctor: 'text-blue-600 dark:text-blue-400',
    nurse: 'text-green-600 dark:text-green-400',
    pharmacist: 'text-pink-600 dark:text-pink-400',
    lab_tech: 'text-yellow-600 dark:text-yellow-400',
    reception: 'text-cyan-600 dark:text-cyan-400'
  }

  return (
    <EnterpriseDashboardLayout role="manager">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallbackUrl="/dashboard/manager" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage hospital staff and assignments
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
          >
            ➕ Add Staff Member
          </motion.button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Staff</p>
                <p className="text-3xl font-bold mt-1">{staff.length}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Active</p>
                <p className="text-3xl font-bold mt-1">
                  {staff.filter(s => s.status === 'active').length}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">On Leave</p>
                <p className="text-3xl font-bold mt-1">
                  {staff.filter(s => s.status === 'on_leave').length}
                </p>
              </div>
              <div className="text-4xl">🏖️</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Doctors</p>
                <p className="text-3xl font-bold mt-1">
                  {staff.filter(s => s.role === 'doctor').length}
                </p>
              </div>
              <div className="text-4xl">👨‍⚕️</div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="doctor">Doctors</option>
              <option value="nurse">Nurses</option>
              <option value="pharmacist">Pharmacists</option>
              <option value="lab_tech">Lab Technicians</option>
              <option value="reception">Reception</option>
            </select>
          </div>
        </div>

        {/* Staff List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredStaff.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      {((member.first_name || '')[0] || '') + ((member.last_name || '')[0] || '')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {member.first_name} {member.last_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                          {member.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Role</p>
                          <p className={`font-medium capitalize ${roleColors[member.role]}`}>
                            {member.role.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Department</p>
                          <p className="font-medium text-gray-900 dark:text-white">{member.department}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Shift</p>
                          <p className="font-medium text-gray-900 dark:text-white">{member.shift}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Employee ID</p>
                          <p className="font-medium text-gray-900 dark:text-white">{member.employeeId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                        <span>📧 {member.email}</span>
                        <span>📱 {member.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors">
                      Edit
                    </button>
                    <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                      Schedule
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredStaff.length === 0 && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">No staff members found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Add Staff Member</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create a staff member for your hospital. Note: creating users may require higher privileges; if you don't have permission the request will return a helpful error.
            </p>

            <AddStaffForm onClose={() => { setShowAddModal(false); loadStaff() }} token={token} userHospitalId={user?.hospital_id} />
          </motion.div>
        </div>
      )}
    </EnterpriseDashboardLayout>
  )
}

function AddStaffForm({ onClose, token, userHospitalId }: any) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', role: 'nurse', department: '', employeeId: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolveRoleId = async (roleName: string, token?: string) => {
    if (!token) return null
    try {
      const res = await apiClient.getUsers(token, { role_name: roleName, page: 1, page_size: 1 })
      if (res && (res as any).users && (res as any).users.length > 0) return (res as any).users[0].role_id
      return null
    } catch (e) {
      return null
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!token) return setError('Authentication required')
    setCreating(true); setError(null)
    try {
      const roleId = await resolveRoleId(form.role, token)
      if (!roleId) throw new Error('Unable to resolve role_id for selected role')

      await apiClient.createUser({
        email: form.email,
        password: 'TempPass#1234',
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || undefined,
        role_id: roleId,
        role_name: form.role,
        region_id: undefined,
        hospital_id: userHospitalId,
        is_active: true,
      }, token)

      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to create user. You may not have permission to create users; contact a super admin.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-2 bg-red-50 text-red-700 rounded">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input-modern" />
        <input required placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input-modern" />
      </div>
      <input required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-modern" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-modern">
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="pharmacist">Pharmacist</option>
          <option value="lab_tech">Lab Technician</option>
          <option value="reception">Reception</option>
        </select>
        <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input-modern" />
        <input placeholder="Employee ID" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="input-modern" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={creating} className="btn-primary flex-1">{creating ? 'Creating…' : 'Create Staff'}</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}
