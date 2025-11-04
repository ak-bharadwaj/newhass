'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import apiClient, { type Patient, type CreatePatientData } from '@/lib/api';

export default function ManagerPatientsPage() {
  const { token, user } = useAuth();
  const [mode, setMode] = useState<'search' | 'create'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newPatientData, setNewPatientData] = useState<CreatePatientData>({
    hospital_id: user?.hospital_id?.toString() || '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
    contact_number: '',
    email: '',
    address: '',
    emergency_contact: '',
    blood_group: '',
  });

  // State for linking existing patient by global ID
  const [globalIdInput, setGlobalIdInput] = useState('');
  const [useExistingId, setUseExistingId] = useState(false);
  const [searchingGlobalId, setSearchingGlobalId] = useState(false);

  const handleSearch = async () => {
    if (!token || !searchQuery.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await apiClient.searchPatientGlobal(searchQuery, 'auto', token);
      const resultsArray: Patient[] = Array.isArray(result)
        ? (result as unknown as Patient[])
        : (result ? [result as unknown as Patient] : []);
      setSearchResults(resultsArray);
      if (resultsArray.length === 0) {
        setError('No patients found matching your search');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchGlobalId = async () => {
    if (!token || !globalIdInput.trim()) return;
    
    setSearchingGlobalId(true);
    setError('');
    try {
      // Search by patient ID or MRN
      const result = await apiClient.searchPatientGlobal(globalIdInput, 'mrn', token);
      if (result) {
        setSuccess(`Found existing patient: ${result.first_name} ${result.last_name}`);
        // Pre-fill form with found patient data
        setNewPatientData({
          ...newPatientData,
          first_name: result.first_name || '',
          last_name: result.last_name || '',
          email: result.email || '',
        });
        setUseExistingId(true);
      } else {
        setError('No patient found with this ID. A new ID will be generated.');
        setUseExistingId(false);
      }
    } catch (err: any) {
      setError('Patient ID not found. A new ID will be generated.');
      setUseExistingId(false);
    } finally {
      setSearchingGlobalId(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const createdPatient = await apiClient.createPatient(newPatientData, token);
      setSuccess(`Patient created successfully! MRN: ${createdPatient.mrn}`);
      setSelectedPatient(createdPatient);
      
      // Reset form
      setNewPatientData({
        hospital_id: user?.hospital_id?.toString() || '',
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'male',
        contact_number: '',
        email: '',
        address: '',
        emergency_contact: '',
        blood_group: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-600 bg-clip-text text-transparent mb-2"
        >
          Patient Management
        </motion.h1>
        <p className="text-gray-600">Create new patient records or link to existing patients</p>
      </div>

      {/* Mode Selector */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setMode('create')}
          className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
            mode === 'create'
              ? 'bg-primary-600 text-white shadow-glow'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Patient
        </button>
        <button
          onClick={() => setMode('search')}
          className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
            mode === 'search'
              ? 'bg-primary-600 text-white shadow-glow'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Link Existing Patient
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'create' ? (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="card-modern p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              Create New Patient Record
            </h2>

            {/* Global ID Option */}
            <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Link Existing Global Patient ID</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    If this patient has an existing global ID from another facility, enter it here. Otherwise, a new ID will be auto-generated.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={globalIdInput}
                      onChange={(e) => setGlobalIdInput(e.target.value)}
                      placeholder="Enter Global Patient ID or MRN"
                      className="flex-1 px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleSearchGlobalId}
                      disabled={searchingGlobalId || !globalIdInput.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                    >
                      {searchingGlobalId ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Searching...
                        </div>
                      ) : (
                        'Verify ID'
                      )}
                    </button>
                  </div>
                  {useExistingId && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Existing patient found! Their information will be linked.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                    <input
                      type="text"
                      value={newPatientData.first_name}
                      onChange={(e) => setNewPatientData({ ...newPatientData, first_name: e.target.value })}
                      required
                      className="input-modern"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={newPatientData.last_name}
                      onChange={(e) => setNewPatientData({ ...newPatientData, last_name: e.target.value })}
                      required
                      className="input-modern"
                      placeholder="Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                    <input
                      type="date"
                      value={newPatientData.date_of_birth}
                      onChange={(e) => setNewPatientData({ ...newPatientData, date_of_birth: e.target.value })}
                      required
                      className="input-modern"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                    <select
                      value={newPatientData.gender}
                      onChange={(e) =>
                        setNewPatientData({
                          ...newPatientData,
                          gender: e.target.value as 'male' | 'female' | 'other',
                        })
                      }
                      required
                      className="input-modern"
                    >
                      <option value="">Select gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                    <select
                      value={newPatientData.blood_group}
                      onChange={(e) => setNewPatientData({ ...newPatientData, blood_group: e.target.value })}
                      className="input-modern"
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                    <input
                      type="tel"
                      value={newPatientData.contact_number}
                      onChange={(e) => setNewPatientData({ ...newPatientData, contact_number: e.target.value })}
                      required
                      className="input-modern"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      value={newPatientData.email}
                      onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                      required
                      className="input-modern"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                    <input
                      type="text"
                      value={newPatientData.address}
                      onChange={(e) => setNewPatientData({ ...newPatientData, address: e.target.value })}
                      required
                      className="input-modern"
                      placeholder="123 Main St, City, State, ZIP"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact *</label>
                    <input
                      type="text"
                      value={newPatientData.emergency_contact}
                      onChange={(e) => setNewPatientData({ ...newPatientData, emergency_contact: e.target.value })}
                      required
                      className="input-modern"
                      placeholder="Name: Jane Doe, Phone: +1 (555) 987-6543"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-xl flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Patient...' : 'Create Patient Record'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="search"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card-modern p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              Search Existing Patients
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Name, MRN, or Email
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter patient name, MRN, or email..."
                  className="input-modern flex-1"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !searchQuery.trim()}
                  className="btn-primary px-8 disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl flex items-center gap-3 mb-6">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((patient) => (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 border-2 border-gray-200 hover:border-primary-500 rounded-xl transition-all cursor-pointer group"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                          {patient.first_name[0]}{patient.last_name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary-600 transition-colors">
                            {patient.first_name} {patient.last_name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                              MRN: {patient.mrn}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {patient.email}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {patient.contact_number}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-primary-50 text-primary-600 rounded-lg font-semibold group-hover:bg-primary-600 group-hover:text-white transition-all">
                        Select
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Patient Display */}
      {selectedPatient && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 card-modern p-6 bg-gradient-to-r from-success-50 to-primary-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Selected Patient</h3>
              <p className="text-2xl font-bold text-primary-600">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </p>
              <p className="text-sm text-gray-600 mt-1">MRN: {selectedPatient.mrn}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedPatient(null)}
                className="btn-secondary"
              >
                Clear Selection
              </button>
              <Link href={`/dashboard/manager/patients/${selectedPatient.id}`} className="btn-primary">
                View Full Record
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
