import React, { useState, useRef, KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';

// Eye icons for password visibility
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

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();

  // Refs for OTP inputs
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Handle email submission
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.sendPasswordResetOTP(email);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input change
  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0]; // Only take first character
    }

    if (!/^\d*$/.test(value)) {
      return; // Only allow digits
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  // Handle OTP input keydown
  const handleOTPKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authService.verifyPasswordResetOTP(email, otpString);
      setResetToken(response.resetToken);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(resetToken, newPassword);
      // Success - redirect to login
      navigate('/login', { state: { message: 'Password reset successfully! Please log in with your new password.' } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setError('');
    setLoading(true);
    setOtp(['', '', '', '', '', '']);

    try {
      await authService.sendPasswordResetOTP(email);
      setError(''); // Clear error on success
      // Could show success message here
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Section - Form */}
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

          {/* Form Section */}
          <div className="max-w-md mx-auto">
            <h1 className="text-4xl font-bold mb-3">
              {step === 1 && 'Forgot Password?'}
              {step === 2 && 'Enter OTP'}
              {step === 3 && 'Create New Password'}
            </h1>
            <p className="text-gray-500 mb-8">
              {step === 1 && 'Enter your email address and we\'ll send you an OTP'}
              {step === 2 && 'We\'ve sent a 6-digit OTP to your email'}
              {step === 3 && 'Enter your new password'}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Step 1: Email */}
            {step === 1 && (
              <form onSubmit={handleSendOTP}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
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

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-lg text-white font-medium transition-colors ${
                    loading ? 'bg-gray-400' : 'bg-[#26c66e] hover:bg-[#1e9d5c]'
                  }`}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                    Enter the 6-digit code
                  </label>
                  <div className="flex gap-3 justify-center">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={otpRefs[index]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOTPChange(index, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                        className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-lg text-white font-medium transition-colors mb-4 ${
                    loading ? 'bg-gray-400' : 'bg-[#26c66e] hover:bg-[#1e9d5c]'
                  }`}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="w-full text-[#26c66e] hover:text-[#1e9d5c] font-medium"
                >
                  Resend OTP
                </button>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword}>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none pr-12"
                      placeholder="Enter new password"
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
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#26c66e] focus:border-transparent outline-none pr-12"
                      placeholder="Confirm new password"
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

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-lg text-white font-medium transition-colors ${
                    loading ? 'bg-gray-400' : 'bg-[#26c66e] hover:bg-[#1e9d5c]'
                  }`}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            {/* Back to Login */}
            <p className="text-center text-sm text-gray-600 mt-8">
              Remember your password?{' '}
              <Link to="/login" className="text-[#26c66e] hover:text-[#1e9d5c] font-medium">
                Back to Login
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
            Secure Password Reset
          </h2>
          <p className="text-indigo-100 font-regular mb-12">
            We'll send you a secure one-time password to reset your account password.
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

export default ForgotPassword;
