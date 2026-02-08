import { STORAGE_KEYS } from '@/constants/storageKeys';
import { readJSON, remove, writeJSON } from '@/utils/storage';

export type Role = 'merchant' | 'admin';
export type User = { username: string; password: string; role: Role };
export type CurrentUser = { username: string; role: Role };

function getUsers(): User[] {
  return readJSON<User[]>(STORAGE_KEYS.users, []);
}

function setUsers(users: User[]) {
  writeJSON(STORAGE_KEYS.users, users);
}

export function seedAdminUser() {
  const users = getUsers();
  const hasAdmin = users.some((u) => u.role === 'admin');
  if (hasAdmin) return;

  users.push({ username: 'admin', password: 'admin123', role: 'admin' });
  setUsers(users);
}

export function registerMerchant(input: {
  username: string;
  password: string;
}) {
  const username = input.username.trim();
  const password = input.password;

  if (!username) throw new Error('用户名不能为空');
  if (password.length < 6) throw new Error('密码至少 6 位');

  const users = getUsers();
  if (users.some((u) => u.username === username)) {
    throw new Error('用户名已存在');
  }

  users.push({ username, password, role: 'merchant' });
  setUsers(users);
}

export function login(input: { username: string; password: string }) {
  const username = input.username.trim();
  const password = input.password;

  const users = getUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password,
  );
  if (!user) throw new Error('用户名或密码错误');

  const currentUser: CurrentUser = { username: user.username, role: user.role };
  writeJSON(STORAGE_KEYS.currentUser, currentUser);
  localStorage.setItem(STORAGE_KEYS.token, 'demo-token');
  return currentUser;
}

export function logout() {
  remove(STORAGE_KEYS.currentUser);
  remove(STORAGE_KEYS.token);
}

export function getCurrentUser(): CurrentUser | null {
  return readJSON<CurrentUser | null>(STORAGE_KEYS.currentUser, null);
}
