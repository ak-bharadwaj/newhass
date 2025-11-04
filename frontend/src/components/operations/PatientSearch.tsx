'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Patient } from '@/lib/api'

interface PatientSearchProps {
  onSelect: (patient: Patient) => void
  onSearch: (query: string) => Promise<Patient[]>
}

export function PatientSearch({ onSelect, onSearch }: PatientSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery)

    if (searchQuery.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    try {
      const patients = await onSearch(searchQuery)
      setResults(patients)
      setShowResults(true)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelect = (patient: Patient) => {
    onSelect(patient)
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, MRN, or phone..."
          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto"
          >
            {results.map((patient, index) => (
              <motion.button
                key={patient.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelect(patient)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span>MRN: {patient.mrn}</span>
                      {patient.phone && (
                        <>
                          <span>•</span>
                          <span>{patient.phone}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{patient.gender}</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
        {showResults && results.length === 0 && !isSearching && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 px-4 py-8 text-center"
          >
            <p className="text-gray-500">No patients found</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
