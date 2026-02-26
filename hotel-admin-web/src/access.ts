import { getCurrentUser } from '@/services/localAuth';

type Role = 'MERCHANT' | 'ADMIN';

type InitialState = {
  currentUser?: {
    username: string;
    role: Role;
  };
};

export default (initialState: InitialState) => {
  const currentUser =
    initialState?.currentUser || getCurrentUser() || undefined;
  const role = currentUser?.role;
  const isLoggedIn = !!currentUser;
  return {
    isLoggedIn,
    canAccessMerchant: isLoggedIn && role === 'MERCHANT',
    canAccessAdmin: isLoggedIn && role === 'ADMIN',
  };
};
