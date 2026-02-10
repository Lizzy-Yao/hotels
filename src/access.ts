type Role = 'MERCHANT' | 'ADMIN';

type InitialState = {
  currentUser?: {
    username: string;
    role: Role;
  };
};

export default (initialState: InitialState) => {
  const role = initialState?.currentUser?.role;
  const isLoggedIn = !!initialState?.currentUser;
  return {
    isLoggedIn,
    canAccessMerchant: isLoggedIn && role === 'MERCHANT',
    canAccessAdmin: isLoggedIn && role === 'ADMIN',
  };
};
