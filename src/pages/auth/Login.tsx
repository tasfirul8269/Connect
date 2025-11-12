import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';

declare global {
  interface Window {
    google?: any;
    FB?: any;
  }
}

// Inline SVG icons
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        navigate('/feed');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!window.google || !process.env.REACT_APP_GOOGLE_CLIENT_ID) {
      setError('Google login not configured');
      return;
    }

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      ux_mode: 'popup',
      scope: 'openid email profile',
      callback: async (response: { code?: string; error?: string }) => {
        if (response.error || !response.code) {
          setError('Google login failed');
          return;
        }
        try {
          const data = await authService.googleLogin(response.code);
          localStorage.setItem('token', data.token);
          if (data.needs_completion && (data as any).prefill) {
            sessionStorage.setItem('signup_prefill', JSON.stringify((data as any).prefill));
            window.location.href = '/signup?complete=1';
            return;
          }
          window.location.href = '/feed';
        } catch (e) {
          setError('Google login failed');
        }
      },
    });

    client.requestCode();
  };

  const ensureFacebookSdk = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const appId = process.env.REACT_APP_FACEBOOK_APP_ID;
      if (!appId) {
        setError('Facebook App ID not configured');
        return reject(new Error('Missing REACT_APP_FACEBOOK_APP_ID'));
      }
      // If FB already present, ensure it is initialized
      if (window.FB) {
        try {
          if (!(window as any).__fbInited) {
            window.FB.init({ appId, cookie: true, xfbml: false, version: 'v19.0' });
            (window as any).__fbInited = true;
          }
          return resolve();
        } catch {
          // fall through to script load below
        }
      }
      const scriptId = 'facebook-jssdk';
      if (document.getElementById(scriptId)) {
        // Script tag exists but FB may not be initialized yet; wait briefly
        const tryInit = () => {
          if (window.FB) {
            try {
              if (!(window as any).__fbInited) {
                window.FB.init({ appId, cookie: true, xfbml: false, version: 'v19.0' });
                (window as any).__fbInited = true;
              }
              resolve();
            } catch { setTimeout(tryInit, 200); }
          } else {
            setTimeout(tryInit, 200);
          }
        };
        tryInit();
        return;
      }
      (window as any).fbAsyncInit = function () {
        window.FB.init({ appId, cookie: true, xfbml: false, version: 'v19.0' });
        (window as any).__fbInited = true;
        resolve();
      };
      const js = document.createElement('script');
      js.id = scriptId;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      js.onerror = () => reject(new Error('Failed to load Facebook SDK'));
      document.body.appendChild(js);
    });
  };

  const handleFacebookLogin = () => {
    console.log('Facebook button clicked');
    // Call FB.login synchronously within the click handler to avoid popup blockers
    if (window.FB) {
      console.log('Facebook SDK available, invoking FB.login immediately');
      window.FB.login((response: any) => {
        console.log('FB.login callback response:', response);
        if (response?.authResponse?.accessToken) {
          (async () => {
            try {
              const data = await authService.facebookLogin(response.authResponse.accessToken);
              localStorage.setItem('token', data.token);
              if ((data as any).needs_completion && (data as any).prefill) {
                sessionStorage.setItem('signup_prefill', JSON.stringify((data as any).prefill));
                window.location.href = '/signup?complete=1';
                return;
              }
              window.location.href = '/feed';
            } catch {
              setError('Facebook login failed');
            }
          })();
        } else {
          setError('Facebook login was cancelled or failed');
        }
      }, { scope: 'email,public_profile' });
    } else {
      console.log('Facebook SDK not ready; initializing...');
      ensureFacebookSdk().catch(() => setError('Failed to load Facebook SDK'));
    }
  };

  // Preload Facebook SDK on mount to avoid popup blockers
  useEffect(() => {
    if (process.env.REACT_APP_FACEBOOK_APP_ID) {
      ensureFacebookSdk().catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Section - Login Form */}
      <div className="w-full lg:w-3/5 bg-white flex flex-col justify-between p-8 lg:p-16">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <img 
              src="/Logo.png" 
              alt="Connections Logo" 
              className="h-10 w-auto" 
            />
          </div>

          {/* Welcome Section */}
          <div className="max-w-md mx-auto">
            <h1 className="text-4xl font-bold mb-3">Welcome Back</h1>
            <p className="text-gray-500 mb-8">Enter your email and password to access your account.</p>

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#26c66e] focus:ring-[#26c66e]"
                  />
                  <span className="text-sm text-gray-600">Remember Me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-[#26c66e] hover:text-[#1e9d5c] font-medium">
                  Forgot Your Password?
                </Link>
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#26c66e] hover:bg-[#1e9d5c] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Social Login */}
            <div className="mt-8">
              <p className="text-center text-gray-500 text-sm mb-4">Or Login With</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm font-medium">Google</span>
                </button>
                <button 
                  onClick={handleFacebookLogin}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 320 512">
                    <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S259.3 0 225.36 0c-73.61 0-121.09 44.38-121.09 124.72v70.62H22.89V288h81.38v224h100.2V288z" fill="#1877F3"/>
                  </svg>
                  <span className="text-sm font-medium">Facebook</span>
                </button>
              </div>
            </div>

            {/* Register Link */}
            <p className="text-center text-sm text-gray-600 mt-8">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#26c66e] hover:text-[#1e9d5c] font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 mt-8" style={{width: 'calc(100% - 40px)'}}>
          <p>Copyright {new Date().getFullYear()} Connections</p>
          <Link to="/privacy" className="hover:text-gray-700">Privacy Policy</Link>
        </div>
      </div>

      {/* Right Section - Feature Showcase */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#26c66e] to-[#1e9d5c] p-16 m-5 rounded-[10px] items-center justify-center overflow-y-auto fixed right-0 top-0 bottom-0 my-5" style={{ width: 'calc(45% - 40px)' }}>
        <div className="max-w-xl">
          <h2 className="text-4xl font-regular text-white mb-4">
            Connect with professionals and grow your network.
          </h2>
          <p className="text-indigo-100 font-regular mb-12">
            Join thousands of professionals who are already building their network with us.
          </p>

          {/* Dashboard Image */}
          <div className="overflow-hidden">
            <img 
              src="/Preview.jpg" 
              alt="App Preview" 
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
