'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNotification } from '@/components/ui/Toast';

interface CaseSheetFormProps {
    patientId: string;
    visitId: string;
    hospitalId: string;
    onSave?: (data: any) => void;
    initialData?: any;
    mode?: 'create' | 'edit';
}

export default function CaseSheetForm({ 
    patientId, 
    visitId, 
    hospitalId, 
    onSave, 
    initialData,
    mode = 'create' 
}: CaseSheetFormProps) {
    const toast = useNotification();
    const [activeSection, setActiveSection] = useState('presenting');
    const [formData, setFormData] = useState(initialData || {
        case_number: '',
        admission_date: new Date().toISOString().slice(0, 16),
        
        // Presenting Complaints
        chief_complaint: '',
        present_illness: '',
        duration_of_symptoms: '',
        
        // Past History
        past_medical_history: {},
        past_surgical_history: {},
        allergies: {},
        current_medications: {},
        
        // Family & Social History
        family_history: '',
        social_history: {},
        
        // General Examination
        general_appearance: '',
        vital_signs_on_admission: {
            bp: '',
            pulse: '',
            temperature: '',
            respiratory_rate: '',
            spo2: ''
        },
        
        // Systemic Examination
        cardiovascular_system: '',
        respiratory_system: '',
        gastrointestinal_system: '',
        central_nervous_system: '',
        musculoskeletal_system: '',
        
        // Diagnosis
        provisional_diagnosis: '',
        differential_diagnosis: {},
        final_diagnosis: '',
        
        // Investigations
        lab_investigations: {},
        imaging_studies: {},
        special_investigations: {},
        
        // Treatment
        treatment_plan: '',
        medications_prescribed: {},
        procedures_performed: {},
        iv_fluids: {},
        diet_advice: '',
        
        // Charts
        intake_output_chart: {},
        
        // Consultation
        consultation_notes: {},
        operation_notes: {},
        
        // Discharge
        condition_on_discharge: '',
        discharge_medications: {},
        discharge_advice: '',
        discharge_summary: '',
        follow_up_instructions: ''
    });

    const sections = [
        { id: 'presenting', label: '1. Presenting Complaints', icon: '📋' },
        { id: 'history', label: '2. Past History', icon: '📚' },
        { id: 'family_social', label: '3. Family & Social', icon: '👨‍👩‍👧‍👦' },
        { id: 'general_exam', label: '4. General Examination', icon: '🩺' },
        { id: 'systemic_exam', label: '5. Systemic Examination', icon: '🫀' },
        { id: 'diagnosis', label: '6. Diagnosis', icon: '🔬' },
        { id: 'investigations', label: '7. Investigations', icon: '🧪' },
        { id: 'treatment', label: '8. Treatment & Management', icon: '💊' },
        { id: 'charts', label: '9. Progress & Charts', icon: '📊' },
        { id: 'consultation', label: '10. Consultation/Operation', icon: '🏥' },
        { id: 'discharge', label: '11. Discharge Details', icon: '🚪' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                patient_id: patientId,
                visit_id: visitId,
                hospital_id: hospitalId
            };
            if (onSave) {
                await onSave(payload);
                toast.success(`Case sheet ${mode === 'create' ? 'created' : 'updated'} successfully`);
            }
        } catch (error) {
            toast.error('Failed to save case sheet');
        }
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'presenting':
                return <PresentingComplaintsSection formData={formData} setFormData={setFormData} />;
            case 'history':
                return <PastHistorySection formData={formData} setFormData={setFormData} />;
            case 'family_social':
                return <FamilySocialSection formData={formData} setFormData={setFormData} />;
            case 'general_exam':
                return <GeneralExaminationSection formData={formData} setFormData={setFormData} />;
            case 'systemic_exam':
                return <SystemicExaminationSection formData={formData} setFormData={setFormData} />;
            case 'diagnosis':
                return <DiagnosisSection formData={formData} setFormData={setFormData} />;
            case 'investigations':
                return <InvestigationsSection formData={formData} setFormData={setFormData} />;
            case 'treatment':
                return <TreatmentSection formData={formData} setFormData={setFormData} />;
            case 'charts':
                return <ChartsSection formData={formData} setFormData={setFormData} />;
            case 'consultation':
                return <ConsultationSection formData={formData} setFormData={setFormData} />;
            case 'discharge':
                return <DischargeSection formData={formData} setFormData={setFormData} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex gap-6 h-[calc(100vh-200px)]">
            {/* Section Navigator */}
            <div className="w-80 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 overflow-y-auto">
                <h3 className="text-xl font-semibold text-white mb-4">Case Sheet Sections</h3>
                <div className="space-y-2">
                    {sections.map((section) => (
                        <motion.button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                                activeSection === section.id
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{section.icon}</span>
                                <span className="text-sm font-medium">{section.label}</span>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <form onSubmit={handleSubmit} className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderSection()}
                        </motion.div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-white/10 p-6 bg-black/20">
                        <div className="flex justify-between items-center">
                            <button
                                type="button"
                                className="px-6 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
                                onClick={() => {
                                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                                    if (currentIndex > 0) {
                                        setActiveSection(sections[currentIndex - 1].id);
                                    }
                                }}
                            >
                                ← Previous
                            </button>
                            
                            <button
                                type="submit"
                                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg"
                            >
                                💾 Save Case Sheet
                            </button>

                            <button
                                type="button"
                                className="px-6 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
                                onClick={() => {
                                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                                    if (currentIndex < sections.length - 1) {
                                        setActiveSection(sections[currentIndex + 1].id);
                                    }
                                }}
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===== SECTION COMPONENTS =====

function PresentingComplaintsSection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">📋 Section 1: Presenting Complaints</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Case Number *
                </label>
                <input
                    type="text"
                    value={formData.case_number}
                    onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                    placeholder="e.g., CS-2025-001"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Admission Date & Time *
                </label>
                <input
                    type="datetime-local"
                    value={formData.admission_date}
                    onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chief Complaint *
                </label>
                <textarea
                    value={formData.chief_complaint}
                    onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-24"
                    placeholder="e.g., Fever and cough for 3 days"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration of Symptoms
                </label>
                <input
                    type="text"
                    value={formData.duration_of_symptoms}
                    onChange={(e) => setFormData({ ...formData, duration_of_symptoms: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                    placeholder="e.g., 3 days, 2 weeks, since morning"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    History of Present Illness (HPI)
                </label>
                <textarea
                    value={formData.present_illness}
                    onChange={(e) => setFormData({ ...formData, present_illness: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-40"
                    placeholder="Detailed description of current illness, onset, progression, aggravating/relieving factors..."
                />
            </div>
        </div>
    );
}

function PastHistorySection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">📚 Section 2: Past History</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Past Medical History
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-32"
                    placeholder="Previous illnesses: Diabetes, Hypertension, Asthma, TB, etc."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Past Surgical History
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-32"
                    placeholder="Previous surgeries with dates..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    ⚠️ Known Allergies
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-white h-24"
                    placeholder="Drug allergies, food allergies (CRITICAL INFORMATION)"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Medications
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-32"
                    placeholder="Medications patient is currently taking with dosages..."
                />
            </div>
        </div>
    );
}

function FamilySocialSection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">👨‍👩‍👧‍👦 Section 3: Family & Social History</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Family History
                </label>
                <textarea
                    value={formData.family_history}
                    onChange={(e) => setFormData({ ...formData, family_history: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-32"
                    placeholder="Hereditary conditions: Diabetes, Hypertension, Cancer, Heart disease in family..."
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        🚬 Smoking History
                    </label>
                    <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                        <option value="">Select</option>
                        <option value="non-smoker">Non-smoker</option>
                        <option value="ex-smoker">Ex-smoker</option>
                        <option value="current">Current smoker</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        🍺 Alcohol History
                    </label>
                    <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                        <option value="">Select</option>
                        <option value="non-drinker">Non-drinker</option>
                        <option value="occasional">Occasional</option>
                        <option value="regular">Regular</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Occupation
                </label>
                <input
                    type="text"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                    placeholder="Patient's occupation"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Other Social History
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-24"
                    placeholder="Living conditions, diet, exercise, stress factors..."
                />
            </div>
        </div>
    );
}

function GeneralExaminationSection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">🩺 Section 4: General Examination</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    General Appearance
                </label>
                <textarea
                    value={formData.general_appearance}
                    onChange={(e) => setFormData({ ...formData, general_appearance: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-24"
                    placeholder="Built, nourishment, consciousness level, pallor, cyanosis, jaundice, edema..."
                />
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Vital Signs on Admission</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                            Blood Pressure
                        </label>
                        <input
                            type="text"
                            value={formData.vital_signs_on_admission?.bp || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                vital_signs_on_admission: {
                                    ...formData.vital_signs_on_admission,
                                    bp: e.target.value
                                }
                            })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                            placeholder="120/80 mmHg"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                            Pulse Rate
                        </label>
                        <input
                            type="text"
                            value={formData.vital_signs_on_admission?.pulse || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                vital_signs_on_admission: {
                                    ...formData.vital_signs_on_admission,
                                    pulse: e.target.value
                                }
                            })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                            placeholder="72 bpm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                            Temperature
                        </label>
                        <input
                            type="text"
                            value={formData.vital_signs_on_admission?.temperature || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                vital_signs_on_admission: {
                                    ...formData.vital_signs_on_admission,
                                    temperature: e.target.value
                                }
                            })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                            placeholder="98.6°F"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                            Respiratory Rate
                        </label>
                        <input
                            type="text"
                            value={formData.vital_signs_on_admission?.respiratory_rate || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                vital_signs_on_admission: {
                                    ...formData.vital_signs_on_admission,
                                    respiratory_rate: e.target.value
                                }
                            })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                            placeholder="16/min"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                            SpO2
                        </label>
                        <input
                            type="text"
                            value={formData.vital_signs_on_admission?.spo2 || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                vital_signs_on_admission: {
                                    ...formData.vital_signs_on_admission,
                                    spo2: e.target.value
                                }
                            })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                            placeholder="98%"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SystemicExaminationSection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">🫀 Section 5: Systemic Examination</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    ❤️ Cardiovascular System (CVS)
                </label>
                <textarea
                    value={formData.cardiovascular_system}
                    onChange={(e) => setFormData({ ...formData, cardiovascular_system: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-28"
                    placeholder="Heart sounds, murmurs, JVP, peripheral pulses..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    🫁 Respiratory System (RS)
                </label>
                <textarea
                    value={formData.respiratory_system}
                    onChange={(e) => setFormData({ ...formData, respiratory_system: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-28"
                    placeholder="Breath sounds, chest expansion, percussion note, vocal fremitus..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    🍽️ Gastrointestinal System (GIT)
                </label>
                <textarea
                    value={formData.gastrointestinal_system}
                    onChange={(e) => setFormData({ ...formData, gastrointestinal_system: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-28"
                    placeholder="Abdomen - inspection, palpation, percussion, auscultation..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    🧠 Central Nervous System (CNS)
                </label>
                <textarea
                    value={formData.central_nervous_system}
                    onChange={(e) => setFormData({ ...formData, central_nervous_system: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-28"
                    placeholder="Consciousness, orientation, motor/sensory examination, reflexes, cranial nerves..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    🦴 Musculoskeletal System
                </label>
                <textarea
                    value={formData.musculoskeletal_system}
                    onChange={(e) => setFormData({ ...formData, musculoskeletal_system: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-28"
                    placeholder="Joint examination, muscle tone, deformities..."
                />
            </div>
        </div>
    );
}

function DiagnosisSection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">🔬 Section 6: Diagnosis</h2>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
                <label className="block text-sm font-medium text-yellow-400 mb-2">
                    Provisional Diagnosis (Initial)
                </label>
                <textarea
                    value={formData.provisional_diagnosis}
                    onChange={(e) => setFormData({ ...formData, provisional_diagnosis: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-24"
                    placeholder="Initial diagnosis based on examination..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Differential Diagnosis
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-32"
                    placeholder="List of possible diagnoses to consider..."
                />
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
                <label className="block text-sm font-medium text-green-400 mb-2">
                    Final Diagnosis (Confirmed)
                </label>
                <textarea
                    value={formData.final_diagnosis}
                    onChange={(e) => setFormData({ ...formData, final_diagnosis: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-24"
                    placeholder="Confirmed diagnosis after investigations..."
                />
            </div>
        </div>
    );
}

function InvestigationsSection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">🧪 Section 7: Investigations</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    🩸 Laboratory Investigations
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-40"
                    placeholder="CBC: Hb - 12.5 g/dL, WBC - 8500/cmm&#10;RFT: Urea - 30 mg/dL, Creatinine - 1.0 mg/dL&#10;LFT: Bilirubin, SGOT, SGPT&#10;Blood Sugar: Fasting, PP&#10;Lipid Profile&#10;Electrolytes: Na, K, Cl&#10;Urine Analysis&#10;Culture & Sensitivity"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    📷 Imaging Studies
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-32"
                    placeholder="X-ray Chest: Normal&#10;CT Scan: &#10;MRI: &#10;Ultrasound Abdomen: "
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    ⚡ Special Investigations
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-32"
                    placeholder="ECG: Normal sinus rhythm&#10;2D Echo: &#10;Endoscopy: &#10;Biopsy: "
                />
            </div>
        </div>
    );
}

function TreatmentSection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">💊 Section 8: Treatment & Management</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Treatment Plan
                </label>
                <textarea
                    value={formData.treatment_plan}
                    onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-32"
                    placeholder="Overall management strategy..."
                />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                <label className="block text-sm font-medium text-blue-400 mb-2">
                    💊 Medications Prescribed
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-40"
                    placeholder="1. Tab. Paracetamol 500mg - 1-0-1 - After food&#10;2. Tab. Amoxicillin 500mg - 1-1-1 - After food&#10;3. Syp. Cough - 10ml - TDS&#10;4. Inj. Pantoprazole 40mg - IV - OD"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    💧 IV Fluids
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-24"
                    placeholder="DNS 500ml @ 60 drops/min"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    🍽️ Diet Advice
                </label>
                <textarea
                    value={formData.diet_advice}
                    onChange={(e) => setFormData({ ...formData, diet_advice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-24"
                    placeholder="Normal diet / Diabetic diet / Soft diet / Liquid diet / NBM"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    🔪 Procedures Performed
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-24"
                    placeholder="Any procedures performed during admission..."
                />
            </div>
        </div>
    );
}

function ChartsSection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">📊 Section 9: Progress & Charts</h2>
            
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">ℹ️ Note</h3>
                <p className="text-gray-300 text-sm">
                    Daily progress notes, vital signs chart, and intake-output chart are managed separately through the event timeline and progress notes sections. This section is for any additional chart data.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    💧 Intake-Output Chart (24-hour summary)
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-32"
                    placeholder="Intake: IV fluids, Oral intake&#10;Output: Urine output, Drain output&#10;Balance: +/- ml"
                />
            </div>
        </div>
    );
}

function ConsultationSection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">🏥 Section 10: Consultation & Operation Notes</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    👨‍⚕️ Specialist Consultation Notes
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-40"
                    placeholder="Cardiologist consulted on [date]&#10;Opinion: &#10;Suggestions: &#10;&#10;Neurologist consulted on [date]&#10;Opinion: "
                />
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                <label className="block text-sm font-medium text-red-400 mb-2">
                    🔪 Operation Notes (if surgery performed)
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-56"
                    placeholder="Date & Time: &#10;Procedure: &#10;Surgeon: &#10;Assistant: &#10;Anesthesia: &#10;Pre-op Diagnosis: &#10;Post-op Diagnosis: &#10;Findings: &#10;Procedure Details: &#10;Complications: &#10;Blood Loss: &#10;Condition after surgery: "
                />
            </div>
        </div>
    );
}

function DischargeSection({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">🚪 Section 11: Discharge Details</h2>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Discharge Date & Time
                    </label>
                    <input
                        type="datetime-local"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Condition on Discharge
                    </label>
                    <select 
                        value={formData.condition_on_discharge}
                        onChange={(e) => setFormData({ ...formData, condition_on_discharge: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                    >
                        <option value="">Select</option>
                        <option value="improved">Improved</option>
                        <option value="stable">Stable</option>
                        <option value="cured">Cured</option>
                        <option value="lama">LAMA (Left Against Medical Advice)</option>
                        <option value="referred">Referred</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    💊 Discharge Medications
                </label>
                <textarea
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-40"
                    placeholder="1. Tab. Aspirin 75mg - 0-0-1 - After food - 30 days&#10;2. Tab. Atorvastatin 10mg - 0-0-1 - After food - 30 days&#10;3. Tab. Metformin 500mg - 1-0-1 - After food - 30 days"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    📋 Discharge Summary
                </label>
                <textarea
                    value={formData.discharge_summary}
                    onChange={(e) => setFormData({ ...formData, discharge_summary: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-40"
                    placeholder="Summary of hospital stay, procedures, final diagnosis, treatment given..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    🏥 Discharge Advice & Precautions
                </label>
                <textarea
                    value={formData.discharge_advice}
                    onChange={(e) => setFormData({ ...formData, discharge_advice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-32"
                    placeholder="Continue medications as prescribed&#10;Follow wound care instructions&#10;Avoid heavy lifting&#10;Report if symptoms worsen"
                />
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
                <label className="block text-sm font-medium text-green-400 mb-2">
                    📅 Follow-up Instructions
                </label>
                <textarea
                    value={formData.follow_up_instructions}
                    onChange={(e) => setFormData({ ...formData, follow_up_instructions: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white h-24"
                    placeholder="Follow-up after 1 week with reports&#10;Review date: [date]&#10;Department: General Medicine"
                />
            </div>
        </div>
    );
}
