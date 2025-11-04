'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import SectionHeader from '@/components/common/SectionHeader'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type PaginatedUsers, type UserListItem } from '@/lib/api'

const PAGE_SIZE = 50

export default function RegionalAdminUsersPage() {
  const { token, user } = useAuth()
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | string>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const loadUsers = useCallback(async (pageNumber: number, append: boolean) => {
    if (!token || !user?.region_id) return
    setLoading(true)
    setError(null)
    try {
      const response: PaginatedUsers = await apiClient.getUsers(token, {
        region_id: user.region_id,
        page: pageNumber,
        page_size: PAGE_SIZE,
      })

      const resultUsers = response?.users ?? []
      setUsers((prev) => (append ? [...prev, ...resultUsers] : resultUsers))
      setHasMore(resultUsers.length === PAGE_SIZE)
    } catch (e: any) {
      setError(e?.message || 'Failed to load users for region')
    } finally {
      setLoading(false)
    }
  }, [token, user?.region_id])

  useEffect(() => {
    setPage(1)
    setUsers([])
    if (!token || !user?.region_id) return
    loadUsers(1, false)
  }, [token, user?.region_id, refreshIndex, loadUsers])

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>()
    users.forEach((item) => {
      if (item.role_name) roles.add(item.role_name)
    })
    return Array.from(roles).sort()
  }, [users])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter((item) => {
      if (roleFilter !== 'all' && item.role_name !== roleFilter) return false
      if (!term) return true
      return [item.first_name, item.last_name, item.email, item.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    })
  }, [users, roleFilter, search])

  const handleLoadMore = async () => {
    const nextPage = page + 1
    await loadUsers(nextPage, true)
    setPage(nextPage)
  }

  const handleRefresh = () => {
    setRefreshIndex((value) => value + 1)
  }

  return (
    <EnterpriseDashboardLayout role="regional_admin">
      <div className="space-y-8 px-3 pb-10">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/dashboard/regional_admin" />
          <SectionHeader
            title="Regional Directory"
            subtitle="Manage and audit staff access across your hospitals"
            chips={[
              { label: `${users.length} users`, color: 'amber' },
              { label: `Region ${user?.region_id ?? ''}`, color: 'gray' },
            ]}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:max-w-sm">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, or phone"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pl-10 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="all">All roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <span>⟳</span>
                Refresh
              </button>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Updated {new Date().toLocaleString()}</span>
            </div>
          </div>

          {loading && users.length === 0 ? (
            <div className="flex h-56 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
              No users match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Hospital</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Contact</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((item) => (
                    <tr key={item.id} className="hover:bg-orange-50/40">
                      <td className="px-4 py-3 text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {item.first_name} {item.last_name}
                          </span>
                          <span className="text-xs text-gray-400">{item.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{item.role_name?.replace(/_/g, ' ') || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{item.hospital_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex flex-col">
                          <span>{item.phone || '—'}</span>
                          <span className="text-xs text-gray-400">Created {new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          <span className="text-base">{item.is_active ? '●' : '○'}</span>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {item.last_login ? new Date(item.last_login).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasMore && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Loading…' : 'Load more users'}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
