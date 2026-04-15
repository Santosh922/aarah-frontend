import { apiRequest } from '@/lib/apiClient';

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  phoneVerified: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface BackendEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface SendOtpPayload {
  phoneNumber: string;
}

export interface VerifyOtpPayload {
  phoneNumber: string;
  otp: string;
}

export interface LoginEmailPayload {
  email: string;
  password: string;
}

export interface ForgotPayload {
  identifier: string;
}

export interface VerifyForgotPayload {
  identifier: string;
  otp: string;
}

export interface ResetPasswordPayload {
  identifier: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

function normalizeAuthUser(user: any): AuthUser {
  return {
    id: Number(user?.id ?? 0),
    firstName: String(user?.firstName ?? ''),
    lastName: String(user?.lastName ?? ''),
    email: String(user?.email ?? ''),
    phoneNumber: String(user?.phoneNumber ?? ''),
    role: String(user?.role ?? ''),
    status: String(user?.status ?? ''),
    phoneVerified: Boolean(user?.phoneVerified),
  };
}

function normalizeAuthResponse(payload: any): AuthResponse {
  const source = payload?.data ?? payload;
  return {
    token: String(source?.token ?? ''),
    user: normalizeAuthUser(source?.user),
  };
}

// USER
export function register(payload: RegisterPayload) {
  return apiRequest<void>('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export function resendRegisterOtp(payload: SendOtpPayload) {
  return apiRequest<void>('/api/auth/register/resend-otp', {
    method: 'POST',
    body: payload,
  });
}

export function verifyRegisterOtp(payload: VerifyOtpPayload) {
  return apiRequest<AuthResponse | BackendEnvelope<AuthResponse>>('/api/auth/register/verify-otp', {
    method: 'POST',
    body: payload,
  }).then(normalizeAuthResponse);
}

export function loginEmail(payload: LoginEmailPayload) {
  return apiRequest<AuthResponse | BackendEnvelope<AuthResponse>>('/api/auth/login', {
    method: 'POST',
    body: payload,
  }).then(normalizeAuthResponse);
}

export function sendLoginOtp(payload: SendOtpPayload) {
  return apiRequest<void>('/api/auth/whatsapp/send-otp', {
    method: 'POST',
    body: payload,
  });
}

export function verifyLoginOtp(payload: VerifyOtpPayload) {
  return apiRequest<AuthResponse | BackendEnvelope<AuthResponse>>('/api/auth/whatsapp/verify-otp', {
    method: 'POST',
    body: payload,
  }).then(normalizeAuthResponse);
}

export function sendForgotOtp(payload: ForgotPayload) {
  return apiRequest<void>('/api/auth/password/forgot/send-otp', {
    method: 'POST',
    body: payload,
  });
}

export function verifyForgotOtp(payload: VerifyForgotPayload) {
  return apiRequest<void>('/api/auth/password/forgot/verify-otp', {
    method: 'POST',
    body: payload,
  });
}

export function resetPassword(payload: ResetPasswordPayload) {
  return apiRequest<void>('/api/auth/password/forgot/reset', {
    method: 'POST',
    body: payload,
  });
}

export function changePassword(payload: ChangePasswordPayload) {
  return apiRequest<void>('/api/auth/password/change', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

// ADMIN
export function adminLogin(payload: LoginEmailPayload) {
  return apiRequest<AuthResponse | BackendEnvelope<AuthResponse>>('/api/auth/admin/login', {
    method: 'POST',
    body: payload,
  }).then(normalizeAuthResponse);
}

export function adminSendForgotOtp(payload: ForgotPayload) {
  return apiRequest<void>('/api/auth/admin/password/forgot/send-otp', {
    method: 'POST',
    body: payload,
  });
}

export function adminVerifyForgotOtp(payload: VerifyForgotPayload) {
  return apiRequest<void>('/api/auth/admin/password/forgot/verify-otp', {
    method: 'POST',
    body: payload,
  });
}

export function adminResetPassword(payload: ResetPasswordPayload) {
  return apiRequest<void>('/api/auth/admin/password/forgot/reset', {
    method: 'POST',
    body: payload,
  });
}

export function adminChangePassword(payload: ChangePasswordPayload) {
  return apiRequest<void>('/api/auth/admin/password/change', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}
