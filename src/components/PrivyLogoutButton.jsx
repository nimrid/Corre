import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';

function PrivyLogoutButton({ className, children }) {
  const { logout } = usePrivy();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        className={className} 
        onClick={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? 'LOGGING OUT...' : children || 'LOGOUT'}
      </button>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </>
  );
}

export default PrivyLogoutButton; 