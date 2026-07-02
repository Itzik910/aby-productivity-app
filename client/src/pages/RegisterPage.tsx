import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Eye, EyeOff, Mail, Lock, User, Briefcase, MapPin, UserPlus, ArrowLeft, Info } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    profession: '',
    homeAddress: '',
    workAddress: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [worksFromHome, setWorksFromHome] = useState(false);
  
  const { register, isLoading, error, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      console.error('Auth store reported an error:', error);
    }
  }, [error]);
 
 // Redirect authenticated users to dashboard
 useEffect(() => {
   if (isAuthenticated) {
     console.log('[REGISTER PAGE] User already authenticated, redirecting to dashboard');
     navigate('/dashboard', { replace: true });
   }
 }, [isAuthenticated, navigate]);

  const professions = [
    { value: 'student', label: 'Student' },
    { value: 'parent', label: 'Parent' },
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'employee', label: 'Employee' },
    { value: 'entrepreneur', label: 'Entrepreneur' },
    { value: 'retired', label: 'Retired' },
    { value: 'other', label: 'Other' }
  ];

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.age && (parseInt(formData.age) < 13 || parseInt(formData.age) > 120)) {
      newErrors.age = 'Age must be between 13 and 120';
    }

    if (!formData.homeAddress.trim()) {
      newErrors.homeAddress = 'Home address is required for Fix My Day';
    }

    if (!worksFromHome && !formData.workAddress.trim()) {
      newErrors.workAddress = 'Work address is required for Fix My Day';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) return;

    try {
      const registerData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        ...(formData.age && { age: parseInt(formData.age) }),
        ...(formData.profession && { profession: formData.profession }),
        addresses: {
          home: formData.homeAddress.trim(),
          work: worksFromHome ? formData.homeAddress.trim() : formData.workAddress.trim()
        }
      };

      console.log('Submitting registration data:', registerData); // Debug log

      await register(registerData);
      console.log('Registration succeeded, navigating to dashboard'); // Debug log
      console.log('[REGISTER PAGE] Current auth state before navigation:', { 
        isAuthenticated: useAuthStore.getState().isAuthenticated,
        user: useAuthStore.getState().user,
        token: useAuthStore.getState().token 
      });
      navigate('/dashboard');
      console.log('[REGISTER PAGE] Navigation to dashboard called');
    } catch (error) {
      console.error('Registration failed in handleSubmit catch block:', error);
    }
  };

  const locationHint = 'Home + work = ABY can turn your commute into a power move.';

  const InfoBadge = ({ text }: { text: string }) => (
    <span
      className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-purple-200 bg-purple-100 text-purple-700 align-middle"
      title={text}
      aria-label={text}
    >
      <Info className="h-3 w-3" />
    </span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join ABY and boost your productivity</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 rounded ${
              step >= 2 ? 'bg-purple-600' : 'bg-gray-200'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Account Info</span>
            <span>Location Info</span>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 1 ? (
            <form onSubmit={handleStep1Next} className="space-y-6">
              {/* Global Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                    disabled={isLoading}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Create a password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Next Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200"
              >
                Next Step
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Global Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Age Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age (Optional)
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.age ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your age"
                  min="13"
                  max="120"
                  disabled={isLoading}
                />
                {errors.age && (
                  <p className="mt-1 text-sm text-red-600">{errors.age}</p>
                )}
              </div>

              {/* Profession Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profession (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    <option value="">Select your profession</option>
                    {professions.map(prof => (
                      <option key={prof.value} value={prof.value}>
                        {prof.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fix My Day Locations */}
              <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Fix My Day power-ups</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      We need your home and work spots so ABY can build smarter route suggestions.
                    </p>
                  </div>
                  <InfoBadge text={locationHint} />
                </div>
                <p className="mb-4 text-xs text-purple-700">
                  Tiny secret: without these two anchors, your day would be a treasure map with no X.
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Home Address *
                      <InfoBadge text="Home is where the planning magic starts." />
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="homeAddress"
                        value={formData.homeAddress}
                        onChange={handleInputChange}
                        className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          errors.homeAddress ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Home address, neighborhood, city..."
                        disabled={isLoading}
                        required
                      />
                    </div>
                    {errors.homeAddress && (
                      <p className="mt-1 text-sm text-red-600">{errors.homeAddress}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Work Address *
                      <InfoBadge text="Work is the launchpad for your task adventures." />
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="worksFromHome"
                        checked={worksFromHome}
                        onChange={(e) => {
                          setWorksFromHome(e.target.checked);
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, workAddress: '' }));
                            setErrors(prev => ({ ...prev, workAddress: '' }));
                          }
                        }}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor="worksFromHome" className="text-sm text-gray-600">
                        I work from home / I'm not currently employed
                      </label>
                    </div>
                    {!worksFromHome && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="workAddress"
                        value={formData.workAddress}
                        onChange={handleInputChange}
                        className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          errors.workAddress ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Office, coworking space, workplace..."
                        disabled={isLoading}
                        required={!worksFromHome}
                      />
                    </div>
                    )}
                    {errors.workAddress && (
                      <p className="mt-1 text-sm text-red-600">{errors.workAddress}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                  I agree to the{' '}
                  <Link to="/terms" className="text-purple-600 hover:text-purple-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-purple-600 hover:text-purple-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-purple-600 hover:text-purple-500 font-semibold"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 