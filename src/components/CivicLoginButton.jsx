import React, { useState } from 'react';
import { useUser } from '@civic/auth-web3/react';

function CivicLoginButton({ className, children }) {
  const { signIn, authStatus } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add a small delay to ensure the UI is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Call the login function
      await signIn();
    } catch (err) {
      console.error('Login failed:', err);
      
      // Check for specific error types
      if (err.message && err.message.includes('Turnstile')) {
        setError('CAPTCHA verification failed. Please try again.');
      } else {
        setError('Login failed. Please try again or contact support.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        className={className} 
        onClick={handleLogin}
        disabled={isLoading || authStatus === 'authenticating'}
      >
        {isLoading ? 'CONNECTING...' : children || 'LOGIN'}
      </button>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </>
  );
}

export default CivicLoginButton; 