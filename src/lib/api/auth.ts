import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api';
import type { TokenResponse } from '@/types/auth';

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiClient
    .post<ApiResponse<TokenResponse>>('/auth/login', { email, password })
    .then(unwrap);
}

export function acceptInvitation(token: string, newPassword: string): Promise<TokenResponse> {
  return apiClient
    .post<ApiResponse<TokenResponse>>(`/auth/invitations/${token}/accept`, { newPassword })
    .then(unwrap);
}

export function logout(): Promise<void> {
  return apiClient.post<ApiResponse<null>>('/auth/logout').then(() => undefined);
}

/** Always resolves the same way whether or not the email is registered - see the backend's AuthService.requestPasswordReset. */
export function forgotPassword(email: string): Promise<void> {
  return apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email }).then(() => undefined);
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return apiClient.post<ApiResponse<null>>('/auth/reset-password', { token, newPassword }).then(() => undefined);
}
