import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profilesService } from '../services/profiles';
import { authService } from '../services/auth';

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

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phoneNumber: '',
    gender: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isCompletion = new URLSearchParams(location.search).get('complete') === '1';

  useEffect(() => {
    if (isCompletion) {
      const raw = sessionStorage.getItem('signup_prefill');
      if (raw) {
        try {
          const prefill = JSON.parse(raw) as { first_name?: string; last_name?: string; email?: string };
          setFormData(prev => ({
            ...prev,
            firstName: prefill.first_name || '',
            lastName: prefill.last_name || '',
            email: prefill.email || '',
          }));
          setCurrentStep(2);
        } catch {}
      } else {
        setCurrentStep(2);
      }
    }
  }, [isCompletion]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const nextStep = () => {
    // Validate step 1 fields before proceeding
    if (!isCompletion) {
      if (currentStep === 1) {
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          setError('Please fill in all fields');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }
      }
    }
    setError('');
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setError('');
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (isCompletion) {
        // Update current user's personal profile
        const me = await profilesService.getCurrentProfile();
        await profilesService.updatePersonalProfile(me.user.id, {
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          phone_number: formData.phoneNumber,
          gender: formData.gender as any,
        });
        sessionStorage.removeItem('signup_prefill');
        navigate('/feed');
      } else {
        const success = await signup({
          email: formData.email,
          password: formData.password,
          account_type: 'personal',
          personalData: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            date_of_birth: formData.dateOfBirth,
            phone_number: formData.phoneNumber,
            gender: formData.gender as 'male' | 'female' | 'other' | undefined
          }
        });

        if (success) {
          navigate('/feed');
        } else {
          setError('Failed to create account. Please try again.');
        }
      }
    } catch (err) {
      setError('An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    // Reuse Login page Google flow
    window.location.href = '/login';
  };

  const ensureFacebookSdk = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.FB) return resolve();
      const appId = process.env.REACT_APP_FACEBOOK_APP_ID;
      if (!appId) {
        setError('Facebook App ID not configured');
        return reject(new Error('Missing REACT_APP_FACEBOOK_APP_ID'));
      }
      const scriptId = 'facebook-jssdk';
      if (document.getElementById(scriptId)) return resolve();
      (window as any).fbAsyncInit = function () {
        window.FB.init({ appId, cookie: true, xfbml: false, version: 'v19.0' });
        resolve();
      };
      const js = document.createElement('script');
      js.id = scriptId;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      js.onerror = () => reject(new Error('Failed to load Facebook SDK'));
      document.body.appendChild(js);
    });
  };

  const handleFacebookSignup = async () => {
    try {
      await ensureFacebookSdk();
      window.FB.login(async (response: any) => {
        if (response?.authResponse?.accessToken) {
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
            setError('Facebook signup failed');
          }
        } else {
          setError('Facebook signup was cancelled or failed');
        }
      }, { scope: 'email,public_profile' });
    } catch (e) {
      // ensureFacebookSdk already set error if needed
    }
  };

  // Render form steps
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {/* Social Signup */}
            {!isCompletion && (
            <div className="mb-8">
              <p className="text-center text-gray-500 text-sm mb-4">Sign up with</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button 
                  type="button"
                  onClick={handleGoogleSignup}
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
                  type="button"
                  onClick={handleFacebookSignup}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 320 512">
                    <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S259.3 0 225.36 0c-73.61 0-121.09 44.38-121.09 124.72v70.62H22.89V288h81.38v224h100.2V288z" fill="#1877F3"/>
                  </svg>
                  <span className="text-sm font-medium">Facebook</span>
                </button>
              </div>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
              </div>
            </div>
            )}

            {/* Step 1: Email and Password */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none"
                placeholder="Enter your email"
                required
                disabled={isCompletion}
              />
            </div>

            {!isCompletion && (
            <>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none pr-12"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            </>
            )}
          </>
        );
      case 2:
        return (
          <>
            {/* Step 2: Personal Information */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none"
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none"
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none"
                required
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none"
                placeholder="Enter your phone number"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none"
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Section - Signup Form */}
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
            <h1 className="text-4xl font-bold mb-3">
              {currentStep === 1 ? 'Create your account' : 'Tell us about yourself'}
            </h1>
            <p className="text-gray-500 mb-8">
              {currentStep === 1 
                ? 'Start your journey with us' 
                : 'Help us personalize your experience'}
            </p>

            {/* Signup Form */}
            <form onSubmit={currentStep === 2 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              
              {renderStep()}

              <div className="flex justify-between mt-8">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${currentStep === 1 ? 'w-full' : 'ml-auto'} ${loading ? 'bg-gray-400' : 'bg-[#26c66e] hover:bg-[#1e9d5c]'}`}
                >
                  {loading ? 'Processing...' : currentStep === 2 ? 'Create Account' : 'Continue'}
                </button>
              </div>
            </form>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600 mt-8">
              Already have an account?{' '}
              <Link to="/login" className="text-[#26c66e] hover:text-[#1e9d5c] font-medium">
                Sign in
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
            Start your journey with us today.
          </h2>
          <p className="text-indigo-100 font-regular mb-12">
            Create your account and join thousands of professionals building meaningful connections.
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

export default Signup;