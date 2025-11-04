'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  ShieldCheck,
  AlertOctagon,
  Lightbulb
} from 'lucide-react';
import { PrescriptionValidationResponse } from '@/lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  validation: PrescriptionValidationResponse | null;
  onApprove: () => void;
  onModify: (alternative: any) => void;
  loading: boolean;
}

export function PrescriptionValidationModal({
  isOpen,
  onClose,
  validation,
  onApprove,
  onModify,
  loading,
}: Props) {
  if (!isOpen) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-error-600';
      case 'high':
        return 'bg-warning-600';
      case 'moderate':
        return 'bg-warning-400';
      case 'low':
        return 'bg-blue-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="w-5 h-5" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'moderate':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'approve':
        return (
          <span className="px-3 py-1 bg-success-100 text-success-800 rounded-full text-sm font-medium flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Approved
          </span>
        );
      case 'modify':
        return (
          <span className="px-3 py-1 bg-warning-100 text-warning-800 rounded-full text-sm font-medium flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Needs Modification
          </span>
        );
      case 'reject':
        return (
          <span className="px-3 py-1 bg-error-100 text-error-800 rounded-full text-sm font-medium flex items-center gap-1">
            <XCircle className="w-4 h-4" /> Not Recommended
          </span>
        );
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
          <div className={`flex items-center justify-between p-6 border-b ${
            validation?.valid
              ? 'bg-gradient-to-r from-success-50 to-green-50'
              : 'bg-gradient-to-r from-warning-50 to-error-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                validation?.valid ? 'bg-success-600' : 'bg-warning-600'
              }`}>
                {validation?.valid ? (
                  <ShieldCheck className="w-6 h-6 text-white" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Prescription Validation</h2>
                <p className="text-sm text-gray-600">
                  {validation?.ai_powered ? 'AI-powered analysis by Gemini 2.5 Flash' : 'Automated validation'}
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
                <p className="mt-4 text-gray-600">Validating prescription...</p>
                <p className="text-sm text-gray-500">Checking for interactions and alternatives</p>
              </div>
            ) : validation ? (
              <div className="space-y-6">
                {/* Validation Summary */}
                <div className="p-4 border-2 rounded-xl bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900">Validation Summary</h3>
                    {getRecommendationBadge(validation.approval_recommendation)}
                  </div>

                  {validation.prescription && (
                    <div className="mb-3 p-3 bg-white rounded-lg">
                      <p className="font-semibold text-gray-700">Prescription:</p>
                      <p className="text-gray-900">
                        {validation.prescription.medication} {validation.prescription.dosage} •{' '}
                        {validation.prescription.frequency} • {validation.prescription.route}
                      </p>
                    </div>
                  )}

                  <p className="text-gray-700">{validation.summary}</p>

                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Appropriateness Score:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              validation.appropriateness_score >= 80
                                ? 'bg-success-600'
                                : validation.appropriateness_score >= 60
                                ? 'bg-warning-600'
                                : 'bg-error-600'
                            }`}
                            style={{ width: `${validation.appropriateness_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {validation.appropriateness_score}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {validation.issues && validation.issues.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Issues Identified</h3>
                    {validation.issues.map((issue, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 border-l-4 rounded-lg ${
                          issue.severity === 'critical'
                            ? 'border-error-600 bg-error-50'
                            : issue.severity === 'high'
                            ? 'border-warning-600 bg-warning-50'
                            : 'border-blue-600 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1 rounded ${getSeverityColor(issue.severity)} text-white`}>
                            {getSeverityIcon(issue.severity)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-bold ${
                                issue.severity === 'critical' ? 'text-error-900' :
                                issue.severity === 'high' ? 'text-warning-900' :
                                'text-blue-900'
                              }`}>
                                {issue.severity.toUpperCase()} - {issue.type.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-700 mb-2">{issue.description}</p>
                            <div className="p-2 bg-white rounded">
                              <p className="text-sm font-semibold text-gray-700">Recommendation:</p>
                              <p className="text-sm text-gray-600">{issue.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {validation.warnings && validation.warnings.length > 0 && (
                  <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                    <h3 className="font-semibold text-warning-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Warnings
                    </h3>
                    <ul className="space-y-1">
                      {validation.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-warning-800">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alternative Medications */}
                {validation.alternatives && validation.alternatives.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-warning-600" />
                      Better Alternatives Available
                    </h3>
                    {validation.alternatives.map((alternative, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 border-2 border-success-200 bg-success-50 rounded-xl"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-lg font-bold text-gray-900">
                                {alternative.medication_name}
                              </h4>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                alternative.priority === 'high'
                                  ? 'bg-success-200 text-success-800'
                                  : 'bg-gray-200 text-gray-700'
                              }`}>
                                {alternative.priority} priority
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 font-medium">
                              {alternative.dosage} • {alternative.frequency} • {alternative.route}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="p-2 bg-white rounded-lg">
                            <span className="font-semibold text-success-900">Advantage:</span>{' '}
                            <span className="text-success-800">{alternative.advantage}</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg">
                            <span className="font-semibold text-gray-700">Evidence:</span>{' '}
                            <span className="text-gray-600">{alternative.evidence}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => onModify(alternative)}
                          className="mt-3 w-full px-4 py-2 bg-success-600 text-white rounded-lg font-medium hover:bg-success-700 transition-colors"
                        >
                          Use This Alternative
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <p className="text-sm text-gray-600">
              Final decision rests with you. AI provides guidance only.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {validation?.valid && validation.approval_recommendation === 'approve' && (
                <button
                  onClick={onApprove}
                  className="px-6 py-2 bg-success-600 text-white rounded-lg font-medium hover:bg-success-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve & Submit
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
