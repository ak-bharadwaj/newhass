'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import apiClient, { type UserListItem, type CreateUserData } from '@/lib/api';
import { Modal } from '@/components/dashboard/Modal';
import { FeedbackButton } from '@/components/common/FeedbackButton';
import { promiseFeedback } from '@/lib/activityFeedback';

export default function AdminUsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserListItem | null>(null);

  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role_name: 'doctor',
    hospital_id: user?.hospital_id?.toString() || '1',
    role_id: '', // Will be set when role_name is selected
  });

  const roles = [
    { value: 'doctor', label: 'Doctor', icon: '🩺' },
    { value: 'nurse', label: 'Nurse', icon: '💉' },
    { value: 'pharmacist', label: 'Pharmacist', icon: '💊' },
    { value: 'lab_technician', label: 'Lab Technician', icon: '🔬' },
    { value: 'radiologist', label: 'Radiologist', icon: '📡' },
    { value: 'receptionist', label: 'Receptionist', icon: '📋' },
    { value: 'manager', label: 'Manager', icon: '👔' },
    { value: 'hospital_admin', label: 'Hospital Admin', icon: '⚙️' },
    { value: 'regional_admin', label: 'Regional Admin', icon: '🏛️' },
  ];

  useEffect(() => {
    loadUsers();
  }, [token]);

  const loadUsers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await apiClient.getUsers(token);
      setUsers(data.users || data); // Handle both PaginatedUsers and UserListItem[]
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setError('');
    try {
      await apiClient.createUser(formData, token);
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingUser) return;
    
    setError('');
    try {
      const { password, ...updateData } = formData;
      await apiClient.updateUser(
        editingUser.id.toString(),
        password ? formData : updateData,
        token
      );
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user');
    }
  };

  const requestDelete = (u: UserListItem) => {
    setUserToDelete(u);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!token || !userToDelete) return;
    await promiseFeedback(apiClient.deleteUser(userToDelete.id.toString(), token), {
      loading: 'Deleting user...',
      success: 'User deleted',
      error: 'Failed to delete user',
    });
    setShowDeleteModal(false);
    setUserToDelete(null);
    loadUsers();
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role_name: 'doctor',
      hospital_id: user?.hospital_id?.toString() || '1',
      role_id: '',
    });
    setError('');
  };

  const openEditModal = (editUser: UserListItem) => {
    setEditingUser(editUser);
    setFormData({
      email: editUser.email,
      password: '',
      first_name: editUser.first_name,
      last_name: editUser.last_name,
      role_name: editUser.role_name,
      hospital_id: editUser.hospital_id?.toString() || '1',
      role_id: editUser.role_id,
    });
    setShowCreateModal(true);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !filterRole || u.role_name === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-600 bg-clip-text text-transparent mb-2"
        >
          User Management
        </motion.h1>
        <p className="text-gray-600">Create and manage system users and roles</p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-modern"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="input-modern sm:w-48"
        >
          <option value="">All Roles</option>
          {roles.map(role => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
        <button
          onClick={() => {
            resetForm();
            setEditingUser(null);
            setShowCreateModal(true);
          }}
          className="btn-primary whitespace-nowrap"
        >
          <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 mt-4">Loading users...</p>
        </div>
      ) : (
        <div className="card-modern overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-semibold">
                          {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-gray-500">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-semibold">
                        {roles.find(r => r.value === user.role_name)?.icon} {user.role_display_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                        user.is_active ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-success-500' : 'bg-gray-400'}`}></span>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-primary-50 rounded-lg transition-colors text-primary-600"
                          title="Edit user"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => requestDelete(user)}
                          className="p-2 hover:bg-error-50 rounded-lg transition-colors text-error-600"
                          title="Delete user"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600 font-medium">No users found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowCreateModal(false);
              setEditingUser(null);
              resetForm();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-soft-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingUser ? 'Edit User' : 'Create New User'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editingUser ? 'Update user information and role' : 'Add a new user to the system'}
                </p>
              </div>

              <form onSubmit={editingUser ? handleUpdate : handleCreate} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                      className="input-modern"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                      className="input-modern"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
              {/* Delete User Modal - outside table to avoid layout issues */}
              <Modal
                isOpen={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                title="Delete User"
                size="sm"
                footer={
                  <>
                    <FeedbackButton onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }} variant="ghost">Cancel</FeedbackButton>
                    <FeedbackButton onClickAsync={confirmDelete} loadingText="Deleting..." successText="Deleted!" variant="primary">Delete</FeedbackButton>
                  </>
                }
              >
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    Are you sure you want to delete {userToDelete?.first_name} {userToDelete?.last_name} ({userToDelete?.email})?
                  </p>
                  <p className="text-xs text-red-600">This action cannot be undone.</p>
                </div>
              </Modal>

              {/* Create/Edit Modal */}
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="input-modern"
                    placeholder="john.doe@hospital.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    className="input-modern"
                    placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Role *</label>
                  <select
                    value={formData.role_name}
                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    required
                    className="input-modern"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.icon} {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
