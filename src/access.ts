type Role = 'merchant' | 'admin';

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
    canAccessMerchant: isLoggedIn && role === 'merchant',
    canAccessAdmin: isLoggedIn && role === 'admin',
  };
};
