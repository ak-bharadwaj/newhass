'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  ShieldAlert,
  Info
} from 'lucide-react';
import { MedicationSuggestion, PrescriptionSuggestionResponse } from '@/lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  suggestions: PrescriptionSuggestionResponse | null;
  onSelectSuggestion: (suggestion: MedicationSuggestion) => void;
  loading: boolean;
}

export function PrescriptionSuggestionModal({
  isOpen,
  onClose,
  suggestions,
  onSelectSuggestion,
  loading,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'medium':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'low':
        return 'text-success-600 bg-success-50 border-success-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getEvidenceIcon = (level: string) => {
    switch (level) {
      case 'strong':
        return <CheckCircle className="w-4 h-4 text-success-600" />;
      case 'moderate':
        return <TrendingUp className="w-4 h-4 text-warning-600" />;
      case 'limited':
        return <Info className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary-50 to-secondary-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI Prescription Suggestions</h2>
                <p className="text-sm text-gray-600">
                  {suggestions?.ai_powered ? 'Powered by Gemini 2.5 Flash' : 'Based on patient conditions'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg hover:bg-white/50 flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Analyzing patient conditions...</p>
                <p className="text-sm text-gray-500">AI is generating personalized suggestions</p>
              </div>
            ) : suggestions && suggestions.suggestions.length > 0 ? (
              <div className="space-y-6">
                {/* General Recommendations */}
                {suggestions.general_recommendations && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">General Recommendations</h3>
                    <p className="text-blue-800">{suggestions.general_recommendations}</p>
                  </div>
                )}

                {/* Warnings */}
                {suggestions.warnings && suggestions.warnings.length > 0 && (
                  <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-warning-900 mb-2">Important Warnings</h3>
                        <ul className="space-y-1">
                          {suggestions.warnings.map((warning, idx) => (
                            <li key={idx} className="text-sm text-warning-800">• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drug Interactions */}
                {suggestions.drug_interactions && suggestions.drug_interactions.length > 0 && (
                  <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-error-900 mb-2">Potential Drug Interactions</h3>
                        <ul className="space-y-1">
                          {suggestions.drug_interactions.map((interaction, idx) => (
                            <li key={idx} className="text-sm text-error-800">• {interaction}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Medication Suggestions */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Suggested Medications</h3>
                  {suggestions.suggestions.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedIndex === index
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-400 bg-white'
                      }`}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-bold text-gray-900">
                              {suggestion.medication_name}
                            </h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(suggestion.priority)}`}>
                              {suggestion.priority} priority
                            </span>
                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100">
                              {getEvidenceIcon(suggestion.evidence_level)}
                              {suggestion.evidence_level} evidence
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 font-medium">
                            {suggestion.dosage} • {suggestion.frequency} • {suggestion.route}
                            {suggestion.duration_days && (
                              <span className="ml-2 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {suggestion.duration_days} days
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold text-gray-700">Indication:</span>{' '}
                          <span className="text-gray-600">{suggestion.indication}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Rationale:</span>{' '}
                          <span className="text-gray-600">{suggestion.rationale}</span>
                        </div>

                        {suggestion.special_instructions && (
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <span className="font-semibold text-blue-900">Special Instructions:</span>{' '}
                            <span className="text-blue-800">{suggestion.special_instructions}</span>
                          </div>
                        )}

                        {suggestion.contraindications && suggestion.contraindications.length > 0 && (
                          <div className="p-2 bg-error-50 rounded-lg">
                            <span className="font-semibold text-error-900">Contraindications:</span>
                            <ul className="mt-1 space-y-1">
                              {suggestion.contraindications.map((contra, idx) => (
                                <li key={idx} className="text-error-800">• {contra}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {suggestion.monitoring_required && (
                          <div className="p-2 bg-warning-50 rounded-lg">
                            <span className="font-semibold text-warning-900">Monitoring Required:</span>{' '}
                            <span className="text-warning-800">{suggestion.monitoring_required}</span>
                          </div>
                        )}
                      </div>

                      {selectedIndex === index && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 pt-4 border-t"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSuggestion(suggestion);
                            }}
                            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                          >
                            Use This Medication
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Info className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-600">No suggestions available</p>
                <p className="text-sm text-gray-500">AI could not generate suggestions for this patient</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <p className="text-sm text-gray-600">
              These are AI-powered suggestions. Final prescription decision is yours.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
