import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GoogleAuthCallback = () => {
  const { setTokenFromCallback, setError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const processCallback = () => {
      const queryParams = new URLSearchParams(location.search);
      const token = queryParams.get('token');
      const error = queryParams.get('error');
      
      if (error) {
        setError(`Authentication failed: ${error}`);
        navigate('/login');
        return;
      }
      
      if (token) {
        setTokenFromCallback(token);
        navigate('/');
      } else {
        setError('No authentication token received');
        navigate('/login');
      }
    };
    
    processCallback();
  }, [location, navigate, setTokenFromCallback, setError]);
  
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
      <h2 className="text-xl font-medium text-gray-900">Completing authentication...</h2>
      <p className="mt-2 text-sm text-gray-500">Please wait while we sign you in.</p>
    </div>
  );
};

export default GoogleAuthCallback; 