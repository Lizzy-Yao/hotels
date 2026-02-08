import { STORAGE_KEYS } from '@/constants/storageKeys';
import { readJSON, remove, writeJSON } from '@/utils/storage';

export type Role = 'user' | 'admin';
export type User = { username: string; password: string; role: Role };
export type CurrentUser = { username: string; role: Role };

type LegacyUser = {
  username: string;
  password: string;
  role: Role | 'merchant';
};

function getUsers(): User[] {
  const users = readJSON<LegacyUser[]>(STORAGE_KEYS.users, []);
  let changed = false;

  const normalized = users
    .map((u) => {
      if (u.role === 'merchant') {
        changed = true;
        return { ...u, role: 'user' as const };
      }
      if (u.role === 'user' || u.role === 'admin') return u;
      changed = true;
      return null;
    })
    .filter(Boolean) as User[];

  if (changed) {
    setUsers(normalized);
  }

  return normalized;
}

function setUsers(users: User[]) {
  writeJSON(STORAGE_KEYS.users, users);
}

export function seedDefaultUsers() {
  const users = getUsers();
  let changed = false;

  const hasUser = users.some((u) => u.role === 'user');
  if (!hasUser) {
    users.push({ username: 'user', password: 'user123', role: 'user' });
    changed = true;
  }

  const hasAdmin = users.some((u) => u.role === 'admin');
  if (!hasAdmin) {
    users.push({ username: 'admin', password: 'admin123', role: 'admin' });
    changed = true;
  }

  if (changed) {
    setUsers(users);
  }
}

export function registerUser(input: { username: string; password: string }) {
  const username = input.username.trim();
  const password = input.password;

  if (!username) throw new Error('用户名不能为空');
  if (password.length < 6) throw new Error('密码至少 6 位');

  const users = getUsers();
  if (users.some((u) => u.username === username)) {
    throw new Error('用户名已存在');
  }

  users.push({ username, password, role: 'user' });
  setUsers(users);
}

export function login(input: {
  username: string;
  password: string;
  role: Role;
}) {
  const username = input.username.trim();
  const password = input.password;
  const role = input.role;

  const users = getUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password,
  );
  if (!user) throw new Error('用户名或密码错误');
  if (user.role !== role) throw new Error('账号与所选身份不一致');

  const currentUser: CurrentUser = { username: user.username, role: user.role };
  writeJSON(STORAGE_KEYS.currentUser, currentUser);
  localStorage.setItem(STORAGE_KEYS.token, 'demo-token');
  return { username: currentUser.username, role: currentUser.role as Role };
}

export function logout() {
  remove(STORAGE_KEYS.currentUser);
  remove(STORAGE_KEYS.token);
}

export function getCurrentUser(): CurrentUser | null {
  const currentUser = readJSON<{
    username: string;
    role: Role | 'merchant';
  } | null>(STORAGE_KEYS.currentUser, null);

  if (!currentUser) return null;
  if (currentUser.role === 'merchant') {
    const normalized: CurrentUser = {
      username: currentUser.username,
      role: 'user',
    };
    writeJSON(STORAGE_KEYS.currentUser, normalized);
    return normalized;
  }

  return { username: currentUser.username, role: currentUser.role as Role };
}
