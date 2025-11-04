'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type PaginatedUsers, type UserListItem } from '@/lib/api'

export default function SuperAdminUsers() {
  const { token } = useAuth()
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        const params: Parameters<typeof apiClient.getUsers>[1] = {}
        if (roleFilter !== 'all') params.role_name = roleFilter
        const res: PaginatedUsers = await apiClient.getUsers(token, params)
        setUsers(res.users || [])
      } catch (e: any) {
        console.error('Failed to load users', e)
        setError(e?.message || 'Failed to load users')
        setUsers([])
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [token, roleFilter])

  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase()
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || (u.role_name || '').toLowerCase() === roleFilter.toLowerCase()
    return matchesSearch && matchesRole
  })

  const stats = {
    total: users.length,
    doctors: users.filter(u => (u.role_name || '').toLowerCase() === 'doctor').length,
    nurses: users.filter(u => (u.role_name || '').toLowerCase() === 'nurse').length,
    staff: users.filter(u => !['doctor','nurse'].includes((u.role_name || '').toLowerCase())).length
  }

  return (
    <EnterpriseDashboardLayout role="super_admin">
      <div className="p-8">
        <BackButton fallbackUrl="/dashboard/super_admin" />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2">
            All Users
          </h1>
          <p className="text-gray-600">Manage all users in the healthcare system</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Users', value: stats.total, color: 'from-red-500 to-pink-500', icon: '👥' },
            { label: 'Doctors', value: stats.doctors, color: 'from-blue-500 to-indigo-500', icon: '👨‍⚕️' },
            { label: 'Nurses', value: stats.nurses, color: 'from-green-500 to-emerald-500', icon: '👩‍⚕️' },
            { label: 'Other Staff', value: stats.staff, color: 'from-purple-500 to-pink-500', icon: '👔' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-3xl`}>
                  {stat.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="pharmacist">Pharmacists</option>
            <option value="lab_tech">Lab Technicians</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">User</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Org</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{user.first_name} {user.last_name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 capitalize">{(user.role_display_name || user.role_name || '').replace('_',' ')}</td>
                    <td className="px-6 py-4">{user.hospital_name || user.region_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                        ACTIVE
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td className="px-6 py-10 text-center text-gray-500" colSpan={4}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}
