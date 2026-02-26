import { STORAGE_KEYS } from '@/constants/storageKeys';
import { readJSON, remove, writeJSON } from '@/utils/storage';
import { request } from '@umijs/max';

export type Role = 'MERCHANT' | 'ADMIN';
export type User = { username: string; password: string; role: Role };
export type CurrentUser = { username: string; role: Role };

type AnyObject = Record<string, any>;

function normalizeRole(rawRole: unknown): Role | undefined {
  const role = String(rawRole || '').toUpperCase();
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'MERCHANT' || role === 'USER') return 'MERCHANT';
  return undefined;
}

function parseError(error: any, fallback: string) {
  const message =
    error?.info?.errorMessage ||
    error?.data?.message ||
    error?.response?.data?.message ||
    error?.message;
  return new Error(message || fallback);
}

function extractData<T = AnyObject>(payload: any): T {
  if (!payload || typeof payload !== 'object') return payload as T;
  return (payload.data ?? payload.result ?? payload.payload ?? payload) as T;
}

export function seedDefaultUsers() {
  return;
}

export async function registerUser(input: {
  username: string;
  password: string;
  role: Role;
}) {
  const username = input.username.trim();
  if (!username) throw new Error('用户名不能为空');
  if (input.password.length < 6) throw new Error('密码至少 6 位');

  try {
    await request('/api/v1/auth/register', {
      method: 'POST',
      data: {
        username,
        password: input.password,
        role: input.role,
      },
    });
  } catch (error) {
    throw parseError(error, '注册失败');
  }
}

export async function login(input: { username: string; password: string }) {
  const username = input.username.trim();
  if (!username) throw new Error('用户名不能为空');

  try {
    const response = await request('/api/v1/auth/login', {
      method: 'POST',
      data: {
        username,
        password: input.password,
      },
    });

    const data = extractData<AnyObject>(response) || {};
    const token =
      data.token ||
      data.accessToken ||
      data.access_token ||
      (typeof response === 'object' ? response?.token : undefined);

    const role = normalizeRole(data.role || data.user?.role || data.userRole);
    if (!role) throw new Error('登录失败：未识别用户角色');

    const currentUser: CurrentUser = {
      username: data.username || data.userName || username,
      role,
    };

    if (token) {
      localStorage.setItem(STORAGE_KEYS.token, String(token));
    }
    writeJSON(STORAGE_KEYS.currentUser, currentUser);
    return currentUser;
  } catch (error) {
    throw parseError(error, '登录失败');
  }
}

export function logout() {
  remove(STORAGE_KEYS.currentUser);
  remove(STORAGE_KEYS.token);
}

export function getCurrentUser(): CurrentUser | null {
  const currentUser = readJSON<CurrentUser | null>(
    STORAGE_KEYS.currentUser,
    null,
  );
  if (!currentUser) return null;
  const role = normalizeRole(currentUser.role);
  if (!role) return null;
  return {
    ...currentUser,
    role,
  };
}
