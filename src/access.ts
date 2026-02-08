type Role = 'user' | 'admin';

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
    canAccessUser: isLoggedIn && role === 'user',
    canAccessAdmin: isLoggedIn && role === 'admin',
  };
};
