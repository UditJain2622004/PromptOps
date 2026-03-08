import { apiRequest } from '@/api/client'
import type { AuthResponse } from '@/types/api'

export function register(input: { name: string; email: string; password: string }) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: input,
    skipAuthRedirect: true,
  })
}

export function login(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: input,
    skipAuthRedirect: true,
  })
}
