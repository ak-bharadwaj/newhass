/**
 * API client utilities for backend communication
 */

// Prefer same-origin in the browser so Next.js rewrites can proxy to the backend
// and cookies (e.g., access_token) are sent correctly. Use internal URL on the server.
const API_URL = typeof window === 'undefined'
  ? (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000')
  : '';

export interface LoginCredentials {
  email: string;
  password: string;
  otp_code?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
  role_id: string;
  role_name: string;
  role_display_name: string;
  permissions: Record<string, boolean>;
  region_id?: string;
  hospital_id?: string;
  is_active: boolean;
  two_factor_enabled?: boolean;
  last_login?: string;
  created_at: string;
}

// Phase 4: Admin interfaces
export interface GlobalMetrics {
  total_patients: number;
  active_visits: number;
  open_emergencies: number;
  avg_bed_utilization: number;
  total_regions: number;
  total_hospitals: number;
  total_staff: number;
}

export interface Region {
  id: string;
  name: string;
  code: string;
  theme_settings?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegionWithStats extends Region {
  hospitals_count: number;
  active_beds: number;
  total_staff: number;
  total_patients: number;
}

export interface Hospital {
  id: string;
  region_id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  // Branding fields (optional)
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  tagline?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  bed_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HospitalWithStats extends Hospital {
  occupied_beds: number;
  available_beds: number;
  staff_count: number;
  active_patients: number;
}

// Minimal public hospital info for registration
export interface PublicHospital {
  id: string;
  name: string;
  code: string;
}

export interface PublicBranding {
  app_name: string;
  tagline?: string;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
}

export interface UserListItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  role_id: string;
  role_name: string;
  role_display_name?: string; // Added for display
  region_id?: string;
  region_name?: string;
  hospital_id?: string;
  hospital_name?: string;
  is_deleted: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedUsers {
  users: UserListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  notes?: string;
  created_at: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateRegionData {
  name: string;
  code: string;
  theme_settings?: Record<string, any>;
  is_active?: boolean;
}

export interface CreateHospitalData {
  region_id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  // Branding fields (optional)
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  tagline?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  bed_capacity?: number;
  is_active?: boolean;
}

export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role_id: string;
  role_name?: string; // Added for form
  region_id?: string;
  hospital_id?: string;
  is_active?: boolean;
}

// Phase 5: Clinical interfaces
export interface Patient {
  id: string;
  mrn: string;
  hospital_id: string;
  hospital_name?: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  phone?: string;
  contact_number?: string; // Alias for phone
  email?: string;
  address?: string;
  emergency_contact?: string; // Alias for emergency_contact_name
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  allergies?: string;
  active_visit_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientWithVitals extends Patient {
  latest_temperature?: number;
  latest_heart_rate?: number;
  latest_blood_pressure?: string;
  latest_spo2?: number;
  vitals_updated_at?: string;
  has_abnormal_vitals: boolean;
}

export interface CreatePatientData {
  hospital_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  blood_group?: string;
  phone?: string;
  contact_number?: string; // Alias for phone
  email?: string;
  address?: string;
  emergency_contact?: string; // Alias for emergency_contact_name
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  allergies?: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  hospital_id: string;
  visit_type: 'inpatient' | 'outpatient' | 'emergency';
  reason_for_visit?: string;
  admitted_at: string;
  discharged_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVisitData {
  patient_id: string;
  hospital_id: string;
  visit_type: 'inpatient' | 'outpatient' | 'emergency';
  reason_for_visit?: string;
}

export interface Vitals {
  id: string;
  patient_id: string;
  visit_id: string;
  recorded_by_id: string;
  recorded_by_name?: string;
  recorded_at: string;
  temperature?: number;
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  respiratory_rate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  notes?: string;
  is_abnormal: boolean;
  created_at: string;
}

export interface CreateVitalsData {
  patient_id: string;
  visit_id: string;
  temperature?: number;
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  respiratory_rate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  notes?: string;
  is_abnormal?: boolean;
}

export interface Prescription {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_mrn?: string;
  visit_id: string;
  prescribed_by_id: string;
  prescribed_by_name?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration_days?: number;
  start_date: string;
  end_date?: string;
  instructions?: string;
  status: string;
  dispensed_at?: string;
  dispensed_by_id?: string;
  dispensed_by_name?: string;
  administered_at?: string;
  administered_by_id?: string;
  administered_by_name?: string;
  // Optional scheduling fields if backend provides them
  times_of_day?: string[]; // e.g., ["08:00","14:00","21:00"]
  next_due_at?: string; // ISO time for next due dose
  created_at: string;
  updated_at: string;
}

export interface CreatePrescriptionData {
  patient_id: string;
  visit_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration_days?: number;
  start_date: string;
  end_date?: string;
  instructions?: string;
}

export interface NurseLog {
  id: string;
  patient_id: string;
  visit_id: string;
  nurse_id: string;
  nurse_name?: string;
  log_type: string;
  content: string;
  logged_at: string;
  created_at: string;
}

export interface CreateNurseLogData {
  patient_id: string;
  visit_id: string;
  log_type: string;
  content: string;
  logged_at?: string;
}

export interface LabTest {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_mrn?: string;
  visit_id: string;
  requested_by_id: string;
  requested_by_name?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  test_type: string;
  urgency: string;
  status: string;
  requested_at: string;
  accepted_at?: string;
  completed_at?: string;
  result_file_url?: string;
  result_summary?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLabTestData {
  patient_id: string;
  visit_id: string;
  test_type: string;
  urgency?: string;
  notes?: string;
}

// Phase 6: Operations interfaces
export interface Bed {
  id: string;
  hospital_id: string;
  hospital_name?: string;
  bed_number: string;
  ward: string;
  floor?: string;
  bed_type: string; // standard, icu, isolation
  status: string; // available, occupied, maintenance, reserved
  assigned_patient_id?: string;
  assigned_patient_name?: string;
  assigned_patient_mrn?: string;
  assigned_visit_id?: string;
  assigned_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBedData {
  hospital_id: string;
  bed_number: string;
  ward: string;
  floor?: string;
  bed_type: string;
}

export interface UpdateBedData {
  bed_number?: string;
  ward?: string;
  floor?: string;
  bed_type?: string;
  is_active?: boolean;
}

export interface AssignBedData {
  patient_id: string;
  visit_id: string;
}

export interface BedAvailability {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  occupancy_rate: number;
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  patient_phone?: string;
  doctor_id: string;
  doctor_name: string;
  doctor_profile_picture_url?: string;
  doctor_qualification?: string;
  hospital_id: string;
  hospital_name: string;
  scheduled_at: string;
  duration_minutes: number;
  appointment_type: string;
  status: string; // scheduled, checked_in, in_progress, completed, cancelled, no_show
  reason?: string;
  notes?: string;
  checked_in_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorBrief {
  id: string;
  full_name: string;
  profile_picture_url?: string | null;
  qualification?: string | null;
  email?: string | null;
  phone?: string | null;
  hospital_name?: string | null;
}

export interface CreateAppointmentData {
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  appointment_type: string;
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentData {
  scheduled_at?: string;
  duration_minutes?: number;
  appointment_type?: string;
  reason?: string;
  notes?: string;
  status?: string;
}

export interface CancelAppointmentData {
  cancellation_reason: string;
}

export interface AppointmentSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  doctor_id: string;
  doctor_name: string;
}

// Patient self-registration interface
export interface PatientRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  hospital_id: string;
  blood_group?: string;
  address?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface PatientRegistrationResponse {
  success: boolean;
  message: string;
  user_id: string;
  patient_id: string;
  mrn: string;
}

// File upload response interfaces
export interface ProfilePictureUploadResponse {
  success: boolean;
  profile_picture_url: string;
}

export interface RegionalBrandingUploadResponse {
  success: boolean;
  logo_url?: string;
  banner_url?: string;
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies
    };
    
    // Simple resilient fetch with limited retries for idempotent operations
    const method = (config.method || 'GET').toString().toUpperCase();
    const canRetry = method === 'GET' || method === 'HEAD';
    const maxAttempts = canRetry ? 3 : 1;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, config);

        if (!response.ok) {
          const status = response.status;
          let errorMessage = 'Request failed';
          try {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
          } catch {
            switch (status) {
              case 401:
                errorMessage = 'Unauthorized - Please log in again';
                if (typeof window !== 'undefined' && !endpoint.includes('/auth/')) {
                  window.location.href = '/login';
                }
                break;
              case 403:
                errorMessage = 'Forbidden - You do not have permission to access this resource';
                break;
              case 404:
                errorMessage = 'Resource not found';
                break;
              case 500:
                errorMessage = 'Internal server error - Please try again later';
                break;
              case 503:
              case 502:
              case 504:
                errorMessage = 'Service temporarily unavailable - Please try again later';
                break;
              default:
                errorMessage = `Request failed with status ${status}`;
            }
          }

          // Retry on transient server errors if allowed
          if (canRetry && [500, 502, 503, 504].includes(status) && attempt < maxAttempts) {
            const backoff = Math.min(500 * Math.pow(2, attempt - 1), 2000);
            await new Promise(r => setTimeout(r, backoff));
            continue;
          }

          const error = new Error(errorMessage) as Error & { status: number };
          error.status = status;
          throw error;
        }

        return response.json();
      } catch (err: any) {
        lastError = err;
        // Network error: retry if allowed
        if (canRetry && attempt < maxAttempts) {
          const backoff = Math.min(500 * Math.pow(2, attempt - 1), 2000);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        throw err;
      }
    }

    // Should not reach here
    throw lastError || new Error('Unknown network error');
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    return this.request<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<{ message: string }> {
    return this.request('/api/v1/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return this.request<TokenResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getCurrentUser(token: string): Promise<UserResponse> {
    return this.request<UserResponse>('/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // 2FA endpoints
  async initiateTwoFactor(token: string): Promise<{ secret: string; otpauth_url: string }> {
    return this.authenticatedRequest<{ secret: string; otpauth_url: string }>('/api/v1/auth/2fa/setup/initiate', token, {
      method: 'POST',
    });
  }

  async confirmTwoFactor(otp_code: string, token: string): Promise<{ message: string; two_factor_enabled: boolean }> {
    return this.authenticatedRequest<{ message: string; two_factor_enabled: boolean }>('/api/v1/auth/2fa/setup/confirm', token, {
      method: 'POST',
      body: JSON.stringify({ otp_code }),
    });
  }

  async disableTwoFactor(otp_code: string, token: string): Promise<{ message: string; two_factor_enabled: boolean }> {
    return this.authenticatedRequest<{ message: string; two_factor_enabled: boolean }>('/api/v1/auth/2fa/disable', token, {
      method: 'POST',
      body: JSON.stringify({ otp_code }),
    });
  }

  // Generic authenticated request
  async authenticatedRequest<T>(
    endpoint: string,
    token: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Generic helper methods for services (support both token and cookie auth)
  async get<T>(endpoint: string, token?: string): Promise<T> {
    if (token) {
      return this.authenticatedRequest<T>(endpoint, token);
    }
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    if (token) {
      return this.authenticatedRequest<T>(endpoint, token, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      });
    }
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    if (token) {
      return this.authenticatedRequest<T>(endpoint, token, {
        method: 'DELETE',
      });
    }
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Phase 4: Admin endpoints
  async getGlobalMetrics(token: string): Promise<GlobalMetrics> {
    return this.authenticatedRequest<GlobalMetrics>('/api/v1/admin/metrics/global', token);
  }

  async getRegions(token: string): Promise<RegionWithStats[]> {
    return this.authenticatedRequest<RegionWithStats[]>('/api/v1/regions', token);
  }

  async getRegion(regionId: string, token: string): Promise<RegionWithStats> {
    return this.authenticatedRequest<RegionWithStats>(`/api/v1/regions/${regionId}`, token);
  }

  async createRegion(data: CreateRegionData, token: string): Promise<Region> {
    return this.authenticatedRequest<Region>('/api/v1/regions', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRegion(regionId: string, data: Partial<CreateRegionData>, token: string): Promise<Region> {
    return this.authenticatedRequest<Region>(`/api/v1/regions/${regionId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getRegionHospitals(regionId: string, token: string): Promise<HospitalWithStats[]> {
    return this.authenticatedRequest<HospitalWithStats[]>(`/api/v1/regions/${regionId}/hospitals`, token);
  }

  async getRegionMetrics(regionId: string, token: string): Promise<any> {
    return this.authenticatedRequest<any>(`/api/v1/regions/${regionId}/metrics`, token);
  }

  async updateRegionSettings(regionId: string, themeSettings: Record<string, any>, token: string): Promise<Region> {
    return this.authenticatedRequest<Region>(`/api/v1/regions/${regionId}/settings`, token, {
      method: 'PATCH',
      body: JSON.stringify(themeSettings),
    });
  }

  async getHospitals(token: string): Promise<HospitalWithStats[]> {
    return this.authenticatedRequest<HospitalWithStats[]>('/api/v1/hospitals', token);
  }

  async getHospital(hospitalId: string, token: string): Promise<HospitalWithStats> {
    return this.authenticatedRequest<HospitalWithStats>(`/api/v1/hospitals/${hospitalId}`, token);
  }

  async createHospital(data: CreateHospitalData, token: string): Promise<Hospital> {
    return this.authenticatedRequest<Hospital>('/api/v1/hospitals', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHospital(hospitalId: string, data: Partial<CreateHospitalData>, token: string): Promise<Hospital> {
    return this.authenticatedRequest<Hospital>(`/api/v1/hospitals/${hospitalId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getUsers(token: string, params?: {
    role_name?: string;
    region_id?: string;
    hospital_id?: string;
    is_active?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedUsers> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.authenticatedRequest<PaginatedUsers>(`/api/v1/admin/users${query ? `?${query}` : ''}`, token);
  }

  async createUser(data: CreateUserData, token: string): Promise<UserListItem> {
    return this.authenticatedRequest<UserListItem>('/api/v1/admin/users', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(userId: string, data: Partial<CreateUserData>, token: string): Promise<UserListItem> {
    return this.authenticatedRequest<UserListItem>(`/api/v1/admin/users/${userId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string, token: string): Promise<{ message: string; user_id: string }> {
    return this.authenticatedRequest<{ message: string; user_id: string }>(`/api/v1/admin/users/${userId}`, token, {
      method: 'DELETE',
    });
  }

  async getAuditLogs(token: string, params?: {
    user_id?: string;
    action?: string;
    resource_type?: string;
    resource_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedAuditLogs> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.authenticatedRequest<PaginatedAuditLogs>(`/api/v1/audit-logs${query ? `?${query}` : ''}`, token);
  }

  // Phase 5: Clinical endpoints
  // Global patient search (helper for mapping user->patient)
  async searchPatientGlobal(
    query: string,
    searchBy: 'auto' | 'national_id' | 'phone' | 'email' | 'name' | 'mrn',
    token: string
  ): Promise<{ id: string; first_name: string; last_name: string; email?: string } | null> {
    try {
      const params = new URLSearchParams({ query, search_by: searchBy })
      return await this.authenticatedRequest<{ id: string; first_name: string; last_name: string; email?: string }>(
        `/api/v1/patient-search/global?${params.toString()}`,
        token
      )
    } catch (e) {
      return null
    }
  }
  /**
   * Get patients for the current user. If hospitalId is provided, use the
   * hospital-scoped analytics endpoint (useful for manager views). Otherwise
   * fall back to the per-user `/patients/my-patients` endpoint.
   */
  async getMyPatients(token: string, hospitalId?: string): Promise<PatientWithVitals[]> {
    if (hospitalId) {
      const params = new URLSearchParams({ hospital_id: hospitalId });
      return this.authenticatedRequest<PatientWithVitals[]>(`/api/v1/analytics/patients?${params.toString()}`, token);
    }
    return this.authenticatedRequest<PatientWithVitals[]>('/api/v1/patients/my-patients', token);
  }

  async getNursePatients(token: string): Promise<PatientWithVitals[]> {
    return this.authenticatedRequest<PatientWithVitals[]>('/api/v1/patients/nurse-patients', token);
  }

  async getPatient(patientId: string, token: string): Promise<Patient> {
    return this.authenticatedRequest<Patient>(`/api/v1/patients/${patientId}`, token);
  }

  async getAssignedDoctor(patientId: string, token: string): Promise<DoctorBrief | null> {
    try {
      return await this.authenticatedRequest<DoctorBrief>(`/api/v1/patients/${patientId}/assigned-doctor`, token);
    } catch (e) {
      return null;
    }
  }

  // Return the patient record for the currently authenticated user (if any)
  async getMyPatient(token: string): Promise<Patient | null> {
    try {
      return await this.authenticatedRequest<Patient>('/api/v1/patients/me', token);
    } catch (e) {
      return null;
    }
  }

  async createPatient(data: CreatePatientData, token: string): Promise<Patient> {
    return this.authenticatedRequest<Patient>('/api/v1/patients', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createVisit(data: CreateVisitData, token: string): Promise<Visit> {
    return this.authenticatedRequest<Visit>('/api/v1/visits', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPatientVitals(patientId: string, token: string, limit?: number): Promise<Vitals[]> {
    const query = limit ? `?limit=${limit}` : '';
    return this.authenticatedRequest<Vitals[]>(`/api/v1/patients/${patientId}/vitals${query}`, token);
  }

  async getPatientPrescriptions(patientId: string, token: string): Promise<Prescription[]> {
    return this.authenticatedRequest<Prescription[]>(`/api/v1/patients/${patientId}/prescriptions`, token);
  }

  async getPatientNurseLogs(patientId: string, token: string, limit?: number): Promise<NurseLog[]> {
    const query = limit ? `?limit=${limit}` : '';
    return this.authenticatedRequest<NurseLog[]>(`/api/v1/patients/${patientId}/nurse-logs${query}`, token);
  }

  async getPatientLabTests(patientId: string, token: string): Promise<LabTest[]> {
    return this.authenticatedRequest<LabTest[]>(`/api/v1/patients/${patientId}/lab-tests`, token);
  }

  async recordVitals(data: CreateVitalsData, token: string): Promise<Vitals> {
    return this.authenticatedRequest<Vitals>('/api/v1/clinical/vitals', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createPrescription(data: CreatePrescriptionData, token: string): Promise<Prescription> {
    return this.authenticatedRequest<Prescription>('/api/v1/clinical/prescriptions', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listPrescriptions(token: string, params?: { hospital_id?: string; status?: string; limit?: number }): Promise<Prescription[]> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) queryParams.append(k, String(v))
      })
    }
    const query = queryParams.toString()
    return this.authenticatedRequest<Prescription[]>(`/api/v1/clinical/prescriptions${query ? `?${query}` : ''}`, token)
  }

  async administerMedication(prescriptionId: string, token: string, notes?: string): Promise<Prescription> {
    return this.authenticatedRequest<Prescription>(`/api/v1/clinical/prescriptions/${prescriptionId}/administer`, token, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async createNurseLog(data: CreateNurseLogData, token: string): Promise<NurseLog> {
    return this.authenticatedRequest<NurseLog>('/api/v1/clinical/nurse-logs', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createLabTest(data: CreateLabTestData, token: string): Promise<LabTest> {
    return this.authenticatedRequest<LabTest>('/api/v1/clinical/lab-tests', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Alias for createLabTest (used by doctor dashboard)
  async orderLabTest(data: CreateLabTestData, token: string): Promise<LabTest> {
    return this.createLabTest(data, token);
  }

  // List lab tests (lab_tech views)
  async listLabTests(
    token: string,
    params?: {
      hospital_id?: string;
      patient_id?: string;
      status?: string; // pending, in_progress, completed, cancelled
      urgency?: string; // STAT, urgent, routine
      assigned_to_id?: string;
      requested_by_id?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
    }
  ): Promise<LabTest[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) queryParams.append(key, String(value));
      });
    }
    const query = queryParams.toString();
    return this.authenticatedRequest<LabTest[]>(`/api/v1/clinical/lab-tests${query ? `?${query}` : ''}`, token);
  }

  // Phase 6: Operations endpoints - Beds
  async getBeds(hospitalId: string, token: string, params?: {
    status?: string;
    ward?: string;
    bed_type?: string;
    is_active?: boolean;
  }): Promise<Bed[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('hospital_id', hospitalId);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.authenticatedRequest<Bed[]>(`/api/v1/beds${query ? `?${query}` : ''}`, token);
  }

  async getBed(bedId: string, token: string): Promise<Bed> {
    return this.authenticatedRequest<Bed>(`/api/v1/beds/${bedId}`, token);
  }

  async createBed(data: CreateBedData, token: string): Promise<Bed> {
    return this.authenticatedRequest<Bed>('/api/v1/beds', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBed(bedId: string, data: UpdateBedData, token: string): Promise<Bed> {
    return this.authenticatedRequest<Bed>(`/api/v1/beds/${bedId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async assignBed(bedId: string, data: AssignBedData, token: string): Promise<Bed> {
    return this.authenticatedRequest<Bed>(`/api/v1/beds/${bedId}/assign`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async releaseBed(bedId: string, token: string): Promise<Bed> {
    return this.authenticatedRequest<Bed>(`/api/v1/beds/${bedId}/release`, token, {
      method: 'POST',
    });
  }

  async setBedMaintenance(bedId: string, token: string): Promise<Bed> {
    return this.authenticatedRequest<Bed>(`/api/v1/beds/${bedId}/maintenance`, token, {
      method: 'POST',
    });
  }

  async getBedAvailability(hospitalId: string, token: string): Promise<BedAvailability> {
    return this.authenticatedRequest<BedAvailability>(`/api/v1/beds/availability/${hospitalId}`, token);
  }

  // Phase 6: Operations endpoints - Appointments
  async getAppointments(token: string, params?: {
    hospital_id?: string;
    doctor_id?: string;
    patient_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<Appointment[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.authenticatedRequest<Appointment[]>(`/api/v1/appointments${query ? `?${query}` : ''}`, token);
  }

  async getAppointment(appointmentId: string, token: string): Promise<Appointment> {
    return this.authenticatedRequest<Appointment>(`/api/v1/appointments/${appointmentId}`, token);
  }

  async createAppointment(data: CreateAppointmentData, token: string): Promise<Appointment> {
    return this.authenticatedRequest<Appointment>('/api/v1/appointments', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppointment(appointmentId: string, data: UpdateAppointmentData, token: string): Promise<Appointment> {
    return this.authenticatedRequest<Appointment>(`/api/v1/appointments/${appointmentId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async checkInAppointment(appointmentId: string, token: string): Promise<Appointment> {
    return this.authenticatedRequest<Appointment>(`/api/v1/appointments/${appointmentId}/check-in`, token, {
      method: 'POST',
    });
  }

  async cancelAppointment(appointmentId: string, data: CancelAppointmentData, token: string): Promise<Appointment> {
    return this.authenticatedRequest<Appointment>(`/api/v1/appointments/${appointmentId}/cancel`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAvailableSlots(doctorId: string, date: string, token: string, durationMinutes?: number): Promise<AppointmentSlot[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('doctor_id', doctorId);
    queryParams.append('date', date);
    if (durationMinutes) {
      queryParams.append('duration_minutes', String(durationMinutes));
    }
    const query = queryParams.toString();
    return this.authenticatedRequest<AppointmentSlot[]>(`/api/v1/appointments/slots/available?${query}`, token);
  }

  // Patient self-registration (public endpoint)
  async registerPatient(data: PatientRegistrationData): Promise<PatientRegistrationResponse> {
    return this.request<PatientRegistrationResponse>('/api/v1/auth/register/patient', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Public endpoint to list hospitals (no auth)
  async getPublicHospitals(): Promise<PublicHospital[]> {
    return this.request<PublicHospital[]>('/api/v1/public/hospitals');
  }

  async getPublicBranding(): Promise<PublicBranding> {
    return this.request<PublicBranding>('/api/v1/public/branding');
  }

  // File upload: Profile picture (any authenticated user)
  async uploadProfilePicture(file: File, token: string): Promise<ProfilePictureUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseURL}/api/v1/files/profile-picture`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  // File upload: Regional branding (regional_admin or super_admin only)
  async uploadRegionalBranding(
    regionId: string,
    file: File,
    fileType: 'logo' | 'banner',
    token: string
  ): Promise<RegionalBrandingUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);

    const url = `${this.baseURL}/api/v1/files/region-branding/${regionId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  // File upload: Lab report (lab_tech only)
  async uploadLabReport(
    testId: string,
    file: File,
    token: string
  ): Promise<{ success: boolean; result_file_url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseURL}/api/v1/files/lab-report/${testId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  // AI Prescription Assistant methods
  async suggestPrescriptions(
    patientId: string,
    token: string,
    chiefComplaint?: string
  ): Promise<PrescriptionSuggestionResponse> {
    return this.authenticatedRequest<PrescriptionSuggestionResponse>(
      '/api/v1/clinical/prescriptions/ai/suggest',
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          chief_complaint: chiefComplaint,
        }),
      }
    );
  }

  async validatePrescription(
    patientId: string,
    medicationName: string,
    dosage: string,
    frequency: string,
    route: string,
    token: string,
    durationDays?: number
  ): Promise<PrescriptionValidationResponse> {
    return this.authenticatedRequest<PrescriptionValidationResponse>(
      '/api/v1/clinical/prescriptions/ai/validate',
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          medication_name: medicationName,
          dosage,
          frequency,
          route,
          duration_days: durationDays,
        }),
      }
    );
  }

  // AI Drafts methods
  async getAIDrafts(token: string): Promise<AIDraft[]> {
    return this.authenticatedRequest<AIDraft[]>('/api/v1/ai/drafts', token);
  }

  async approveAIDraft(draftId: string, token: string): Promise<void> {
    return this.authenticatedRequest<void>(`/api/v1/ai/drafts/${draftId}/approve`, token, {
      method: 'POST',
    });
  }

  async rejectAIDraft(draftId: string, token: string): Promise<void> {
    return this.authenticatedRequest<void>(`/api/v1/ai/drafts/${draftId}/reject`, token, {
      method: 'POST',
    });
  }

  // Pharmacy inventory endpoints
  async createInventoryItem(data: any, token: string): Promise<any> {
    return this.authenticatedRequest<any>('/api/v1/pharmacy/inventory', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listInventory(params: Record<string, any> = {}, token: string): Promise<any[]> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) queryParams.append(k, String(v));
    });
    const query = queryParams.toString();
    return this.authenticatedRequest<any[]>(`/api/v1/pharmacy/inventory${query ? `?${query}` : ''}`, token);
  }

  async getLowStock(params: Record<string, any> = {}, token: string): Promise<any[]> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) queryParams.append(k, String(v));
    });
    const query = queryParams.toString();
    return this.authenticatedRequest<any[]>(`/api/v1/pharmacy/inventory/low-stock${query ? `?${query}` : ''}`, token);
  }

  async getExpiringSoon(params: Record<string, any> = {}, token: string): Promise<any[]> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) queryParams.append(k, String(v));
    });
    const query = queryParams.toString();
    return this.authenticatedRequest<any[]>(`/api/v1/pharmacy/inventory/expiring-soon${query ? `?${query}` : ''}`, token);
  }

  async updateInventoryItem(itemId: string, data: any, token: string): Promise<any> {
    return this.authenticatedRequest<any>(`/api/v1/pharmacy/inventory/${itemId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteInventoryItem(itemId: string, token: string): Promise<void> {
    return this.authenticatedRequest<void>(`/api/v1/pharmacy/inventory/${itemId}`, token, {
      method: 'DELETE',
    });
  }

  // Secure messaging endpoints
  async createMessageThread(participantUserIds: string[], token: string): Promise<any> {
    return this.authenticatedRequest<any>('/api/v1/messages/threads', token, {
      method: 'POST',
      body: JSON.stringify({ participant_user_ids: participantUserIds }),
    });
  }

  async listMessageThreads(token: string): Promise<any[]> {
    return this.authenticatedRequest<any[]>('/api/v1/messages/threads', token);
  }

  async listThreadMessages(threadId: string, token: string): Promise<any[]> {
    return this.authenticatedRequest<any[]>(`/api/v1/messages/threads/${threadId}/messages`, token);
  }

  async sendMessage(threadId: string, content: string, token: string): Promise<any> {
    return this.authenticatedRequest<any>(`/api/v1/messages/threads/${threadId}/messages`, token, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Admin API keys endpoints
  async createApiKey(data: any, token: string): Promise<any> {
    return this.authenticatedRequest<any>('/api/v1/admin/api-keys', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listApiKeys(token: string): Promise<any[]> {
    return this.authenticatedRequest<any[]>('/api/v1/admin/api-keys', token);
  }

  async revokeApiKey(keyId: string, token: string): Promise<void> {
    return this.authenticatedRequest<void>(`/api/v1/admin/api-keys/${keyId}`, token, {
      method: 'DELETE',
    });
  }

  async rotateApiKey(keyId: string, token: string): Promise<any> {
    return this.authenticatedRequest<any>(`/api/v1/admin/api-keys/${keyId}/rotate`, token, {
      method: 'POST',
    });
  }

  // Analytics endpoints
  async getAnalytics(token: string, params?: {
    startDate?: string;
    endDate?: string;
    hospitalId?: string;
    regionId?: string;
    metric?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.hospitalId) queryParams.append('hospital_id', params.hospitalId);
    if (params?.regionId) queryParams.append('region_id', params.regionId);
    if (params?.metric) queryParams.append('metric', params.metric);
    
    const url = `/api/v1/analytics?${queryParams.toString()}`;
    return this.authenticatedRequest<any>(url, token);
  }

  async getPatientAnalytics(token: string, params?: {
    startDate?: string;
    endDate?: string;
    hospitalId?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.hospitalId) queryParams.append('hospital_id', params.hospitalId);
    
    return this.authenticatedRequest<any>(`/api/v1/analytics/patients?${queryParams.toString()}`, token);
  }

  async getAppointmentAnalytics(token: string, params?: {
    startDate?: string;
    endDate?: string;
    hospitalId?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.hospitalId) queryParams.append('hospital_id', params.hospitalId);
    
    return this.authenticatedRequest<any>(`/api/v1/analytics/appointments?${queryParams.toString()}`, token);
  }

  async getRevenueAnalytics(token: string, params?: {
    startDate?: string;
    endDate?: string;
    hospitalId?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.hospitalId) queryParams.append('hospital_id', params.hospitalId);
    
    return this.authenticatedRequest<any>(`/api/v1/analytics/revenue?${queryParams.toString()}`, token);
  }

  async getStaffAnalytics(token: string, params?: {
    startDate?: string;
    endDate?: string;
    hospitalId?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.hospitalId) queryParams.append('hospital_id', params.hospitalId);
    
    return this.authenticatedRequest<any>(`/api/v1/analytics/staff?${queryParams.toString()}`, token);
  }

  async getBedOccupancyAnalytics(token: string, params?: {
    startDate?: string;
    endDate?: string;
    hospitalId?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.hospitalId) queryParams.append('hospital_id', params.hospitalId);
    
    return this.authenticatedRequest<any>(`/api/v1/analytics/bed-occupancy?${queryParams.toString()}`, token);
  }

  async getDepartmentAnalytics(token: string, params?: {
    startDate?: string;
    endDate?: string;
    hospitalId?: string;
    department?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.hospitalId) queryParams.append('hospital_id', params.hospitalId);
    if (params?.department) queryParams.append('department', params.department);
    
    return this.authenticatedRequest<any>(`/api/v1/analytics/departments?${queryParams.toString()}`, token);
  }

  // AI Analytics endpoints
  async getAIAnalysis(token: string, data: {
    current_data: any[];
    historical_data?: any[];
    hospital_context?: any;
  }): Promise<any> {
    return this.authenticatedRequest<any>('/api/v1/ai-analytics/ai-analysis', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getQuickAIAnalysis(token: string): Promise<any> {
    return this.authenticatedRequest<any>('/api/v1/ai-analytics/ai-analysis/quick', token);
  }

  // ===== CASE SHEET METHODS =====
  
  /**
   * Get all case sheets (with optional filters)
   */
  async getCaseSheets(token: string, params?: {
    patientId?: string;
    visitId?: string;
    hospitalId?: string;
    skip?: number;
    limit?: number;
  }): Promise<CaseSheetResponse[]> {
    const queryParams = new URLSearchParams();
    if (params?.patientId) queryParams.append('patient_id', params.patientId);
    if (params?.visitId) queryParams.append('visit_id', params.visitId);
    if (params?.hospitalId) queryParams.append('hospital_id', params.hospitalId);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.authenticatedRequest<CaseSheetResponse[]>(
      `/api/v1/case-sheets${query ? '?' + query : ''}`,
      token
    );
  }

  /**
   * Get a single case sheet by ID
   */
  async getCaseSheet(token: string, id: string): Promise<CaseSheetResponse> {
    return this.authenticatedRequest<CaseSheetResponse>(`/api/v1/case-sheets/${id}`, token);
  }

  /**
   * Create a new case sheet
   */
  async createCaseSheet(token: string, data: CaseSheetCreate): Promise<CaseSheetResponse> {
    return this.authenticatedRequest<CaseSheetResponse>('/api/v1/case-sheets', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an existing case sheet
   */
  async updateCaseSheet(token: string, id: string, data: Partial<CaseSheetCreate>): Promise<CaseSheetResponse> {
    return this.authenticatedRequest<CaseSheetResponse>(`/api/v1/case-sheets/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get all case sheets for a specific patient
   */
  async getCaseSheetsByPatient(token: string, patientId: string): Promise<CaseSheetResponse[]> {
    return this.authenticatedRequest<CaseSheetResponse[]>(
      `/api/v1/case-sheets/patient/${patientId}`,
      token
    );
  }

  /**
   * Get case sheet for a specific visit
   */
  async getCaseSheetByVisit(token: string, visitId: string): Promise<CaseSheetResponse> {
    return this.authenticatedRequest<CaseSheetResponse>(
      `/api/v1/case-sheets/visit/${visitId}`,
      token
    );
  }

  /**
   * Add a progress note to a case sheet
   */
  async addProgressNote(token: string, caseSheetId: string, note: AddProgressNote): Promise<CaseSheetResponse> {
    return this.authenticatedRequest<CaseSheetResponse>(
      `/api/v1/case-sheets/${caseSheetId}/progress-notes`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(note),
      }
    );
  }

  /**
   * Add an event to the case sheet timeline
   */
  async addCaseSheetEvent(
    token: string,
    caseSheetId: string,
    event: AddEventToTimeline
  ): Promise<CaseSheetResponse> {
    return this.authenticatedRequest<CaseSheetResponse>(
      `/api/v1/case-sheets/${caseSheetId}/events`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(event),
      }
    );
  }

  /**
   * Acknowledge an event in the case sheet timeline
   */
  async acknowledgeCaseSheetEvent(
    token: string,
    caseSheetId: string,
    acknowledgment: AcknowledgeEvent
  ): Promise<CaseSheetResponse> {
    return this.authenticatedRequest<CaseSheetResponse>(
      `/api/v1/case-sheets/${caseSheetId}/events/acknowledge`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(acknowledgment),
      }
    );
  }

  /**
   * Get pending acknowledgments for a case sheet
   */
  async getPendingAcknowledgments(
    token: string,
    caseSheetId: string
  ): Promise<{
    case_sheet_id: string;
    patient_id: string;
    case_number: string;
    pending_count: number;
    pending_events: Array<{ index: number; event: any }>;
  }> {
    return this.authenticatedRequest(
      `/api/v1/case-sheets/${caseSheetId}/events/pending`,
      token
    );
  }
}

export const apiClient = new ApiClient(API_URL);
export default apiClient; // Default export for backward compatibility

// AI Drafts interface
export interface AIDraft {
  id: string;
  patient_id: string;
  patient_name: string;
  draft_type: string;
  content: any;
  created_at: string;
  status: string;
}

// AI Prescription Assistant interfaces
export interface MedicationSuggestion {
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration_days: number;
  indication: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  evidence_level: 'strong' | 'moderate' | 'limited';
  special_instructions?: string;
  contraindications: string[];
  monitoring_required?: string;
}

export interface PrescriptionSuggestionResponse {
  suggestions: MedicationSuggestion[];
  warnings: string[];
  drug_interactions: string[];
  general_recommendations: string;
  generated_at?: string;
  patient_id?: string;
  ai_powered?: boolean;
}

export interface PrescriptionValidationIssue {
  severity: 'critical' | 'high' | 'moderate' | 'low';
  type: 'allergy' | 'interaction' | 'contraindication' | 'dosage' | 'better_alternative';
  description: string;
  recommendation: string;
}

export interface PrescriptionAlternative {
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  advantage: string;
  evidence: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PrescriptionValidationResponse {
  valid: boolean;
  appropriateness_score: number;
  issues: PrescriptionValidationIssue[];
  alternatives: PrescriptionAlternative[];
  warnings: string[];
  approval_recommendation: 'approve' | 'modify' | 'reject';
  summary: string;
  validated_at?: string;
  prescription?: {
    medication: string;
    dosage: string;
    frequency: string;
    route: string;
  };
  ai_powered?: boolean;
}

export interface PrescriptionSuggestionRequest {
  patient_id: string;
  chief_complaint?: string;
}

export interface PrescriptionValidationRequest {
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration_days?: number;
}

// Case Sheet Interfaces
export interface CaseSheetCreate {
  patient_id: string;
  visit_id: string;
  hospital_id: string;
  case_number: string;
  admission_date: string;
  chief_complaint: string;
  present_illness?: string;
  duration_of_symptoms?: string;
  past_medical_history?: Record<string, any>;
  past_surgical_history?: Record<string, any>;
  allergies?: Record<string, any>;
  current_medications?: Record<string, any>;
  family_history?: string;
  social_history?: Record<string, any>;
  general_appearance?: string;
  vital_signs_on_admission?: Record<string, any>;
  cardiovascular_system?: string;
  respiratory_system?: string;
  gastrointestinal_system?: string;
  central_nervous_system?: string;
  musculoskeletal_system?: string;
  other_systems?: Record<string, any>;
  provisional_diagnosis?: string;
  differential_diagnosis?: Record<string, any>;
  final_diagnosis?: string;
  lab_investigations?: Record<string, any>;
  imaging_studies?: Record<string, any>;
  special_investigations?: Record<string, any>;
  treatment_plan?: string;
  medications_prescribed?: Record<string, any>;
  procedures_performed?: Record<string, any>;
  iv_fluids?: Record<string, any>;
  diet_advice?: string;
  intake_output_chart?: Record<string, any>;
  consultation_notes?: Record<string, any>;
  operation_notes?: Record<string, any>;
  discharge_date?: string;
  condition_on_discharge?: string;
  discharge_medications?: Record<string, any>;
  discharge_advice?: string;
  discharge_summary?: string;
  follow_up_instructions?: string;
}

export interface CaseSheetResponse extends CaseSheetCreate {
  id: string;
  progress_notes?: Array<Record<string, any>>;
  event_timeline?: Array<Record<string, any>>;
  created_by: string;
  last_updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AddProgressNote {
  note: string;
}

export interface AddEventToTimeline {
  event_type: string;
  description: string;
  event_data?: Record<string, any>;
  requires_acknowledgment: boolean;
}

export interface AcknowledgeEvent {
  event_index: number;
  acknowledgment_notes?: string;
}

