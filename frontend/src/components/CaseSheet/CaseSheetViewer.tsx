'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface CaseSheetViewerProps {
    caseSheet: any;
    patientInfo?: any;
    onEdit?: () => void;
    onPrint?: () => void;
}

export default function CaseSheetViewer({ caseSheet, patientInfo, onEdit, onPrint }: CaseSheetViewerProps) {
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📋' },
        { id: 'examination', label: 'Examination', icon: '🩺' },
        { id: 'diagnosis', label: 'Diagnosis & Tests', icon: '🔬' },
        { id: 'treatment', label: 'Treatment', icon: '💊' },
        { id: 'progress', label: 'Progress Notes', icon: '📝' },
        { id: 'discharge', label: 'Discharge', icon: '🚪' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-white">Case Sheet</h1>
                            <span className="px-3 py-1 bg-blue-600/30 rounded-full text-blue-300 text-sm font-medium">
                                {caseSheet.case_number}
                            </span>
                        </div>
                        {patientInfo && (
                            <div className="text-gray-300 space-y-1">
                                <p className="text-lg font-medium">{patientInfo.full_name}</p>
                                <p className="text-sm">
                                    Age: {patientInfo.age} | Gender: {patientInfo.gender} | MRN: {patientInfo.mrn}
                                </p>
                            </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                            <span>📅 Admitted: {new Date(caseSheet.admission_date).toLocaleString()}</span>
                            {caseSheet.discharge_date && (
                                <span>🚪 Discharged: {new Date(caseSheet.discharge_date).toLocaleString()}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all"
                            >
                                ✏️ Edit
                            </button>
                        )}
                        {onPrint && (
                            <button
                                onClick={onPrint}
                                className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
                            >
                                🖨️ Print
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                    >
                        <span className="text-xl">{tab.icon}</span>
                        <span className="font-medium">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {activeTab === 'overview' && <OverviewTab caseSheet={caseSheet} />}
                {activeTab === 'examination' && <ExaminationTab caseSheet={caseSheet} />}
                {activeTab === 'diagnosis' && <DiagnosisTab caseSheet={caseSheet} />}
                {activeTab === 'treatment' && <TreatmentTab caseSheet={caseSheet} />}
                {activeTab === 'progress' && <ProgressTab caseSheet={caseSheet} />}
                {activeTab === 'discharge' && <DischargeTab caseSheet={caseSheet} />}
            </motion.div>
        </div>
    );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">{icon}</span>
                {title}
            </h3>
            {children}
        </div>
    );
}

function DataRow({ label, value }: { label: string; value: any }) {
    if (!value) return null;
    return (
        <div className="grid grid-cols-3 gap-4 py-2 border-b border-white/5">
            <div className="text-sm font-medium text-gray-400">{label}</div>
            <div className="col-span-2 text-white">{value}</div>
        </div>
    );
}

function OverviewTab({ caseSheet }: { caseSheet: any }) {
    return (
        <div className="space-y-6">
            <SectionCard title="Presenting Complaints" icon="📋">
                <DataRow label="Chief Complaint" value={caseSheet.chief_complaint} />
                <DataRow label="Duration" value={caseSheet.duration_of_symptoms} />
                {caseSheet.present_illness && (
                    <div className="mt-4">
                        <p className="text-sm font-medium text-gray-400 mb-2">History of Present Illness</p>
                        <p className="text-white whitespace-pre-wrap">{caseSheet.present_illness}</p>
                    </div>
                )}
            </SectionCard>

            <div className="grid md:grid-cols-2 gap-6">
                <SectionCard title="Past Medical History" icon="📚">
                    {caseSheet.past_medical_history ? (
                        <pre className="text-white text-sm whitespace-pre-wrap">
                            {JSON.stringify(caseSheet.past_medical_history, null, 2)}
                        </pre>
                    ) : (
                        <p className="text-gray-500">No past medical history recorded</p>
                    )}
                </SectionCard>

                <SectionCard title="Allergies ⚠️" icon="⚠️">
                    {caseSheet.allergies ? (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                            <pre className="text-red-300 text-sm whitespace-pre-wrap">
                                {JSON.stringify(caseSheet.allergies, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <p className="text-gray-500">No known allergies</p>
                    )}
                </SectionCard>
            </div>

            <SectionCard title="Family & Social History" icon="👨‍👩‍👧‍👦">
                {caseSheet.family_history && (
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-400 mb-2">Family History</p>
                        <p className="text-white whitespace-pre-wrap">{caseSheet.family_history}</p>
                    </div>
                )}
                {caseSheet.social_history && (
                    <div>
                        <p className="text-sm font-medium text-gray-400 mb-2">Social History</p>
                        <pre className="text-white text-sm whitespace-pre-wrap">
                            {JSON.stringify(caseSheet.social_history, null, 2)}
                        </pre>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

function ExaminationTab({ caseSheet }: { caseSheet: any }) {
    return (
        <div className="space-y-6">
            <SectionCard title="General Appearance" icon="🩺">
                <p className="text-white whitespace-pre-wrap">
                    {caseSheet.general_appearance || 'Not recorded'}
                </p>
            </SectionCard>

            <SectionCard title="Vital Signs on Admission" icon="❤️">
                {caseSheet.vital_signs_on_admission ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {Object.entries(caseSheet.vital_signs_on_admission).map(([key, value]: [string, any]) => (
                            <div key={key} className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
                                <p className="text-xs text-gray-400 uppercase mb-1">{key.replace('_', ' ')}</p>
                                <p className="text-xl font-bold text-white">{value}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No vital signs recorded</p>
                )}
            </SectionCard>

            <div className="grid md:grid-cols-2 gap-6">
                <SectionCard title="Cardiovascular System" icon="❤️">
                    <p className="text-white whitespace-pre-wrap">
                        {caseSheet.cardiovascular_system || 'Not examined'}
                    </p>
                </SectionCard>

                <SectionCard title="Respiratory System" icon="🫁">
                    <p className="text-white whitespace-pre-wrap">
                        {caseSheet.respiratory_system || 'Not examined'}
                    </p>
                </SectionCard>

                <SectionCard title="Gastrointestinal System" icon="🍽️">
                    <p className="text-white whitespace-pre-wrap">
                        {caseSheet.gastrointestinal_system || 'Not examined'}
                    </p>
                </SectionCard>

                <SectionCard title="Central Nervous System" icon="🧠">
                    <p className="text-white whitespace-pre-wrap">
                        {caseSheet.central_nervous_system || 'Not examined'}
                    </p>
                </SectionCard>

                <SectionCard title="Musculoskeletal System" icon="🦴">
                    <p className="text-white whitespace-pre-wrap">
                        {caseSheet.musculoskeletal_system || 'Not examined'}
                    </p>
                </SectionCard>
            </div>
        </div>
    );
}

function DiagnosisTab({ caseSheet }: { caseSheet: any }) {
    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
                <SectionCard title="Provisional Diagnosis" icon="🔍">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                        <p className="text-yellow-300 whitespace-pre-wrap">
                            {caseSheet.provisional_diagnosis || 'Not recorded'}
                        </p>
                    </div>
                </SectionCard>

                <SectionCard title="Differential Diagnosis" icon="🤔">
                    {caseSheet.differential_diagnosis ? (
                        <pre className="text-white text-sm whitespace-pre-wrap">
                            {JSON.stringify(caseSheet.differential_diagnosis, null, 2)}
                        </pre>
                    ) : (
                        <p className="text-gray-500">Not recorded</p>
                    )}
                </SectionCard>

                <SectionCard title="Final Diagnosis" icon="✅">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                        <p className="text-green-300 font-semibold whitespace-pre-wrap">
                            {caseSheet.final_diagnosis || 'Pending'}
                        </p>
                    </div>
                </SectionCard>
            </div>

            <SectionCard title="Laboratory Investigations" icon="🧪">
                {caseSheet.lab_investigations ? (
                    <pre className="text-white text-sm whitespace-pre-wrap bg-black/20 rounded-xl p-4">
                        {JSON.stringify(caseSheet.lab_investigations, null, 2)}
                    </pre>
                ) : (
                    <p className="text-gray-500">No lab results recorded</p>
                )}
            </SectionCard>

            <div className="grid md:grid-cols-2 gap-6">
                <SectionCard title="Imaging Studies" icon="📷">
                    {caseSheet.imaging_studies ? (
                        <pre className="text-white text-sm whitespace-pre-wrap">
                            {JSON.stringify(caseSheet.imaging_studies, null, 2)}
                        </pre>
                    ) : (
                        <p className="text-gray-500">No imaging studies recorded</p>
                    )}
                </SectionCard>

                <SectionCard title="Special Investigations" icon="⚡">
                    {caseSheet.special_investigations ? (
                        <pre className="text-white text-sm whitespace-pre-wrap">
                            {JSON.stringify(caseSheet.special_investigations, null, 2)}
                        </pre>
                    ) : (
                        <p className="text-gray-500">No special investigations recorded</p>
                    )}
                </SectionCard>
            </div>
        </div>
    );
}

function TreatmentTab({ caseSheet }: { caseSheet: any }) {
    return (
        <div className="space-y-6">
            <SectionCard title="Treatment Plan" icon="📋">
                <p className="text-white whitespace-pre-wrap">
                    {caseSheet.treatment_plan || 'No treatment plan recorded'}
                </p>
            </SectionCard>

            <SectionCard title="Medications Prescribed" icon="💊">
                {caseSheet.medications_prescribed ? (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <pre className="text-blue-300 text-sm whitespace-pre-wrap">
                            {JSON.stringify(caseSheet.medications_prescribed, null, 2)}
                        </pre>
                    </div>
                ) : (
                    <p className="text-gray-500">No medications prescribed</p>
                )}
            </SectionCard>

            <div className="grid md:grid-cols-2 gap-6">
                <SectionCard title="IV Fluids" icon="💧">
                    {caseSheet.iv_fluids ? (
                        <pre className="text-white text-sm whitespace-pre-wrap">
                            {JSON.stringify(caseSheet.iv_fluids, null, 2)}
                        </pre>
                    ) : (
                        <p className="text-gray-500">No IV fluids recorded</p>
                    )}
                </SectionCard>

                <SectionCard title="Diet Advice" icon="🍽️">
                    <p className="text-white whitespace-pre-wrap">
                        {caseSheet.diet_advice || 'No specific diet advice'}
                    </p>
                </SectionCard>
            </div>

            <SectionCard title="Procedures Performed" icon="🔪">
                {caseSheet.procedures_performed ? (
                    <pre className="text-white text-sm whitespace-pre-wrap">
                        {JSON.stringify(caseSheet.procedures_performed, null, 2)}
                    </pre>
                ) : (
                    <p className="text-gray-500">No procedures recorded</p>
                )}
            </SectionCard>

            {caseSheet.operation_notes && (
                <SectionCard title="Operation Notes" icon="🏥">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <pre className="text-red-300 text-sm whitespace-pre-wrap">
                            {JSON.stringify(caseSheet.operation_notes, null, 2)}
                        </pre>
                    </div>
                </SectionCard>
            )}
        </div>
    );
}

function ProgressTab({ caseSheet }: { caseSheet: any }) {
    return (
        <div className="space-y-6">
            <SectionCard title="Daily Progress Notes" icon="📝">
                {caseSheet.progress_notes && caseSheet.progress_notes.length > 0 ? (
                    <div className="space-y-4">
                        {caseSheet.progress_notes.map((note: any, index: number) => (
                            <div key={index} className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-gray-400">
                                        {new Date(note.date).toLocaleString()}
                                    </span>
                                    <span className="text-xs text-purple-400">
                                        By: {note.by_user_name || 'Doctor'}
                                    </span>
                                </div>
                                <p className="text-white whitespace-pre-wrap">{note.note}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No progress notes recorded</p>
                )}
            </SectionCard>

            <SectionCard title="Event Timeline" icon="📊">
                {caseSheet.event_timeline && caseSheet.event_timeline.length > 0 ? (
                    <div className="space-y-3">
                        {caseSheet.event_timeline.map((event: any, index: number) => (
                            <div key={index} className="bg-white/5 rounded-xl p-4 border-l-4 border-blue-500">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-3 py-1 bg-blue-500/20 rounded-full text-blue-300 text-xs font-medium">
                                        {event.type}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(event.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-white mb-2">{event.description}</p>
                                <p className="text-sm text-gray-400">
                                    By: {event.recorded_by_user_name} ({event.recorded_by_role})
                                </p>
                                {event.acknowledged && (
                                    <div className="mt-2 pt-2 border-t border-white/10">
                                        <p className="text-sm text-green-400">
                                            ✅ Acknowledged by {event.acknowledged_by_user_name} at {new Date(event.acknowledged_at).toLocaleString()}
                                        </p>
                                        {event.acknowledgment_notes && (
                                            <p className="text-sm text-gray-400 mt-1">{event.acknowledgment_notes}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No events recorded</p>
                )}
            </SectionCard>
        </div>
    );
}

function DischargeTab({ caseSheet }: { caseSheet: any }) {
    if (!caseSheet.discharge_date) {
        return (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-8 text-center">
                <p className="text-yellow-400 text-lg">Patient not yet discharged</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <SectionCard title="Discharge Information" icon="ℹ️">
                    <DataRow label="Discharge Date" value={new Date(caseSheet.discharge_date).toLocaleString()} />
                    <DataRow label="Condition on Discharge" value={caseSheet.condition_on_discharge} />
                </SectionCard>

                <SectionCard title="Discharge Medications" icon="💊">
                    {caseSheet.discharge_medications ? (
                        <pre className="text-white text-sm whitespace-pre-wrap">
                            {JSON.stringify(caseSheet.discharge_medications, null, 2)}
                        </pre>
                    ) : (
                        <p className="text-gray-500">No discharge medications</p>
                    )}
                </SectionCard>
            </div>

            <SectionCard title="Discharge Summary" icon="📋">
                <p className="text-white whitespace-pre-wrap">
                    {caseSheet.discharge_summary || 'No discharge summary recorded'}
                </p>
            </SectionCard>

            <SectionCard title="Discharge Advice" icon="💡">
                <p className="text-white whitespace-pre-wrap">
                    {caseSheet.discharge_advice || 'No specific discharge advice'}
                </p>
            </SectionCard>

            <SectionCard title="Follow-up Instructions" icon="📅">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <p className="text-green-300 whitespace-pre-wrap">
                        {caseSheet.follow_up_instructions || 'No follow-up instructions'}
                    </p>
                </div>
            </SectionCard>
        </div>
    );
}
