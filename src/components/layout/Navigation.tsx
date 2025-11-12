import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navigation: React.FC = () => {
  const { user, isGuest, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-5 flex items-center justify-between h-16">
        <Link to="/feed" className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
          Connections
        </Link>
        
        <div className="flex items-center space-x-6">
          <Link to="/feed" className="text-gray-700 hover:text-primary-600 font-medium px-3 py-2 rounded-lg transition-colors hover:bg-gray-50">
            Feed
          </Link>
          {!isGuest && (
            <Link to="/profile" className="text-gray-700 hover:text-primary-600 font-medium px-3 py-2 rounded-lg transition-colors hover:bg-gray-50">
              Profile
            </Link>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {isGuest ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-600">Guest Mode</span>
              <Link 
                to="/login" 
                className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-transform hover:scale-105"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">{user?.email}</span>
              <button 
                onClick={logout} 
                className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-transform hover:scale-105 hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
