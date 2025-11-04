'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient, MedicationSuggestion, PrescriptionSuggestionResponse, PrescriptionValidationResponse } from '@/lib/api';
import { PrescriptionSuggestionModal } from './PrescriptionSuggestionModal';
import { PrescriptionValidationModal } from './PrescriptionValidationModal';
import toast from 'react-hot-toast';

interface Props {
  patientId: string;
  visitId: string;
  chiefComplaint?: string;
  onSuccess?: () => void;
}

export function AIPrescriptionForm({ patientId, visitId, chiefComplaint, onSuccess }: Props) {
  const { token } = useAuth();

  // Form state
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [route, setRoute] = useState('oral');
  const [durationDays, setDurationDays] = useState('');
  const [instructions, setInstructions] = useState('');

  // Modal state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Data state
  const [suggestions, setSuggestions] = useState<PrescriptionSuggestionResponse | null>(null);
  const [validation, setValidation] = useState<PrescriptionValidationResponse | null>(null);

  // Loading state
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingValidation, setLoadingValidation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get AI Suggestions
  const handleGetSuggestions = async () => {
    if (!token) return;

    setLoadingSuggestions(true);
    setShowSuggestions(true);

    try {
      const response = await apiClient.suggestPrescriptions(
        patientId,
        token,
        chiefComplaint
      );
      setSuggestions(response);
    } catch (error: any) {
      toast.error(error.message || 'Failed to get AI suggestions');
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Select suggestion
  const handleSelectSuggestion = (suggestion: MedicationSuggestion) => {
    setMedicationName(suggestion.medication_name);
    setDosage(suggestion.dosage);
    setFrequency(suggestion.frequency);
    setRoute(suggestion.route);
    setDurationDays(suggestion.duration_days.toString());
    if (suggestion.special_instructions) {
      setInstructions(suggestion.special_instructions);
    }
    setShowSuggestions(false);
    toast.success('Medication details filled from AI suggestion');
  };

  // Validate prescription
  const handleValidate = async () => {
    if (!token || !medicationName || !dosage || !frequency || !route) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoadingValidation(true);
    setShowValidation(true);

    try {
      const response = await apiClient.validatePrescription(
        patientId,
        medicationName,
        dosage,
        frequency,
        route,
        token,
        durationDays ? parseInt(durationDays) : undefined
      );
      setValidation(response);

      // Show toast based on validation
      if (response.approval_recommendation === 'approve') {
        toast.success('Prescription validated successfully!');
      } else if (response.approval_recommendation === 'modify') {
        toast('Better alternatives available', { icon: '💡' });
      } else {
        toast.error('Prescription not recommended');
      }
    } catch (error: any) {
      toast.error(error.message || 'Validation failed');
      setShowValidation(false);
    } finally {
      setLoadingValidation(false);
    }
  };

  // Apply alternative
  const handleModify = (alternative: any) => {
    setMedicationName(alternative.medication_name);
    setDosage(alternative.dosage);
    setFrequency(alternative.frequency);
    setRoute(alternative.route);
    setShowValidation(false);
    toast.success('Using alternative medication');
  };

  // Submit prescription
  const handleSubmit = async () => {
    if (!token) return;

    setSubmitting(true);

    try {
      await apiClient.createPrescription(
        {
          patient_id: patientId,
          visit_id: visitId,
          medication_name: medicationName,
          dosage,
          frequency,
          route,
          duration_days: durationDays ? parseInt(durationDays) : undefined,
          start_date: new Date().toISOString().split('T')[0],
          instructions,
        },
        token
      );

      toast.success('Prescription created successfully!');

      // Reset form
      setMedicationName('');
      setDosage('');
      setFrequency('');
      setRoute('oral');
      setDurationDays('');
      setInstructions('');
      setValidation(null);
      setShowValidation(false);

      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Create Prescription</h3>
          <button
            onClick={handleGetSuggestions}
            disabled={loadingSuggestions}
            className="px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            {loadingSuggestions ? 'Getting Suggestions...' : 'Get AI Suggestions'}
          </button>
        </div>

        <div className="space-y-4">
          {/* Medication Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Medication Name *
            </label>
            <input
              type="text"
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              placeholder="e.g., Amoxicillin"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Dosage & Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Dosage *
              </label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g., 500mg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Frequency *
              </label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="e.g., Twice daily"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Route & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Route *
              </label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="oral">Oral</option>
                <option value="IV">IV</option>
                <option value="IM">IM</option>
                <option value="subcutaneous">Subcutaneous</option>
                <option value="topical">Topical</option>
                <option value="inhalation">Inhalation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Duration (days)
              </label>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="e.g., 7"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Special Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any special instructions for the patient..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleValidate}
              disabled={!medicationName || !dosage || !frequency || loadingValidation}
              className="flex-1 px-6 py-3 bg-warning-600 text-white rounded-lg font-medium hover:bg-warning-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingValidation ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Validate with AI
                </>
              )}
            </button>

            <button
              onClick={handleSubmit}
              disabled={!medicationName || !dosage || !frequency || submitting}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Create Prescription
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            💡 Tip: Get AI suggestions before writing, then validate for safety checks
          </p>
        </div>
      </motion.div>

      {/* Suggestion Modal */}
      <PrescriptionSuggestionModal
        isOpen={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        suggestions={suggestions}
        onSelectSuggestion={handleSelectSuggestion}
        loading={loadingSuggestions}
      />

      {/* Validation Modal */}
      <PrescriptionValidationModal
        isOpen={showValidation}
        onClose={() => setShowValidation(false)}
        validation={validation}
        onApprove={handleSubmit}
        onModify={handleModify}
        loading={loadingValidation}
      />
    </>
  );
}
