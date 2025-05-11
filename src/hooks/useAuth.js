import { useEffect } from 'react';
import { useUser } from '@civic/auth-web3/react';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const { user, authStatus, error, signIn, signOut } = useUser();
  const navigate = useNavigate();


  // Debug: log the user object to see available fields
  if (user) {
    console.log('Civic user:', user);
  }
  const email = user?.email || '';

  return {
    email,
    isAuthenticated: authStatus === 'authenticated',
    isLoading: authStatus === 'authenticating',
    error,
    login: signIn,
    logout: signOut
  };
}