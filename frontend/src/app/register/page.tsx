'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient, type PublicHospital } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function PatientRegistrationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [hospitals, setHospitals] = useState<PublicHospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mrn, setMrn] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    phone: '',
    email: '',

    // Step 2: Medical Info
    allergies: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',

    // Step 3: Account
    hospital_id: '',
    password: '',
    confirmPassword: '',
  });

  // Load hospitals on mount
  useEffect(() => {
    // Respect user reduced motion preferences
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    }
  }, []);

  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const data = await apiClient.getPublicHospitals();
        setHospitals(data);
        if (data.length === 1) {
          setFormData((prev) => ({ ...prev, hospital_id: data[0].id }));
        }
      } catch (err) {
        console.error('Failed to load hospitals:', err);
      }
    };
    loadHospitals();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = (stepNumber: number): boolean => {
    setError(null);

    if (stepNumber === 1) {
      if (!formData.first_name || !formData.last_name) {
        setError('Please provide your first and last name');
        return false;
      }
      if (!formData.date_of_birth) {
        setError('Please provide your date of birth');
        return false;
      }
      if (!formData.gender) {
        setError('Please select your gender');
        return false;
      }
      if (!formData.phone) {
        setError('Please provide your phone number');
        return false;
      }
      if (!formData.email) {
        setError('Please provide your email address');
        return false;
      }
    }

    if (stepNumber === 3) {
      if (!formData.hospital_id) {
        setError('Please select a hospital');
        return false;
      }
      if (!formData.password) {
        setError('Please create a password');
        return false;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setLoading(true);
    setError(null);

    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        phone: formData.phone,
        hospital_id: formData.hospital_id,
        blood_group: formData.blood_group || undefined,
        address: formData.address || undefined,
        allergies: formData.allergies || undefined,
        emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_phone: formData.emergency_contact_phone || undefined,
      };

      const response = await apiClient.registerPatient(registrationData);

      if (response.success) {
        setSuccess(true);
        setMrn(response.mrn);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = reducedMotion
    ? {
        initial: { opacity: 1, x: 0 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 1, x: 0 },
      }
    : {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
      };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Success State */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Registration Successful!
              </h2>
              <p className="text-white/70 mb-2">
                Your account has been created successfully.
              </p>
              <p className="text-xl font-semibold text-blue-400 mb-4">
                Your Medical Record Number: {mrn}
              </p>
              <p className="text-white/60">
                Redirecting you to login page...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Registration Form */}
        {!success && (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Patient Registration
              </h1>
              <p className="text-white/60">
                Create your account to access our healthcare services
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center flex-1">
                    <motion.div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        s <= step
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          : 'bg-white/10 text-white/40'
                      }`}
                      animate={{ scale: s === step ? 1.1 : 1 }}
                    >
                      {s}
                    </motion.div>
                    {s < 3 && (
                      <div
                        className={`flex-1 h-1 mx-2 ${
                          s < step ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-white/10'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-white/60">
                <span>Personal</span>
                <span>Medical</span>
                <span>Account</span>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4"
                >
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-red-400">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {/* Step 1: Personal Information */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        Gender *
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white text-gray-900 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="" disabled>Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        Blood Group
                      </label>
                      <select
                        name="blood_group"
                        value={formData.blood_group}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white text-gray-900 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" disabled>Select blood group</option>
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
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 234 567 8900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Medical Information */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Allergies
                    </label>
                    <textarea
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="List any known allergies (medications, food, etc.)"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your residential address"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Account Setup */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Select Hospital *
                    </label>
                    <select
                      name="hospital_id"
                      value={formData.hospital_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white text-gray-900 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="" disabled>Select your hospital</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="At least 8 characters"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Re-enter your password"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8">
              {step > 1 ? (
                <motion.button
                  onClick={handleBack}
                  className="px-6 py-3 bg-white/10 text-white rounded-lg font-medium border border-white/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  data-testid="register-back"
                >
                  Back
                </motion.button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <motion.button
                  onClick={handleNext}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  disabled={loading}
                  aria-disabled={loading}
                  data-testid="register-next"
                >
                  Next
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  type="button"
                  aria-busy={loading}
                  data-testid="register-submit"
                >
                  {loading ? (
                    <>
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Complete Registration</span>
                  )}
                </motion.button>
              )}
            </div>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-white/60 text-sm">
                Already have an account?{' '}
                <a
                  href="/login"
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Login here
                </a>
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
