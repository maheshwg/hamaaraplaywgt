import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Zap,
  CheckCircle2,
  ArrowRight,
  Mail,
  User,
  Lock,
  Building2,
  Shield,
  Clock,
  Download,
  CreditCard,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function StartTrial() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    company: '',
    phone: '',
    agreeToTerms: false
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/public/trial/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message);
        setSubmitted(true);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Unable to connect to the server. Please try again later or contact support@youraitester.com');
    } finally {
      setLoading(false);
    }
  };

  const trialBenefits = [
    { icon: Clock, text: '14-day free trial with full access' },
    { icon: CreditCard, text: 'No credit card required' },
    { icon: Shield, text: '5-day delivery guarantee included' },
    { icon: Download, text: 'Export to Playwright anytime' },
  ];

  const features = [
    '50 test cases',
    '5,000 test executions',
    'Natural language tests',
    'Screenshot & video recording',
    'Analytics dashboard',
    'CI/CD integrations',
    'Email support',
    'Export to Playwright'
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white pt-24 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Thank You for Signing Up!
          </h1>
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 mb-6">
            <p className="text-lg text-slate-300 mb-4">
              {successMessage || "We're creating your account and will get back to you shortly."}
            </p>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Check Your Email</h3>
                  <p className="text-sm text-slate-400">
                    We've sent a confirmation to <span className="text-green-400">{formData.email}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Account Setup</h3>
                  <p className="text-sm text-slate-400">
                    Our team will set up your account within <span className="text-green-400">24-48 business hours</span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Login Credentials</h3>
                  <p className="text-sm text-slate-400">
                    You'll receive your login details via email once your account is ready
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
            <p className="text-sm text-blue-300">
              <strong>Questions?</strong> Contact us at{' '}
              <a href="mailto:support@youraitester.com" className="text-blue-400 hover:text-blue-300 underline">
                support@youraitester.com
              </a>
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white"
          >
            Return to Home
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column - Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-6">
              <Zap className="w-4 h-4" />
              Start Free Trial
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Start Testing{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
                in Minutes
              </span>
            </h1>
            <p className="text-xl text-slate-400 mb-8">
              Get instant access to AI-powered test automation. No credit card required.
            </p>

            {/* Trial Benefits */}
            <div className="space-y-4 mb-10">
              {trialBenefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <benefit.icon className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-slate-300">{benefit.text}</span>
                </div>
              ))}
            </div>

            {/* What's Included */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
              <h3 className="text-lg font-semibold text-white mb-4">What's included in your trial:</h3>
              <div className="grid grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-slate-400">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column - Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800">
              <h2 className="text-2xl font-bold text-white mb-2">Create Your Account</h2>
              <p className="text-slate-400 mb-8">Start your 14-day free trial today.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-300">{error}</p>
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      required
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      disabled={loading}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Work Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      required
                      type="email"
                      placeholder="john@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={loading}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      required
                      type="password"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      disabled={loading}
                      minLength={8}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 disabled:opacity-50"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Minimum 8 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Acme Inc."
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      disabled={loading}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="terms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => setFormData({...formData, agreeToTerms: checked})}
                    disabled={loading}
                    className="mt-1 border-slate-600 data-[state=checked]:bg-green-600 disabled:opacity-50"
                  />
                  <label htmlFor="terms" className="text-sm text-slate-400">
                    I agree to the{' '}
                    <a href="#" className="text-green-400 hover:text-green-300">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-green-400 hover:text-green-300">Privacy Policy</a>
                  </label>
                </div>

                <Button 
                  type="submit" 
                  disabled={!formData.agreeToTerms || loading}
                  className="w-full h-12 text-base bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Start Free Trial
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </Button>
                  <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </Button>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Already have an account?{' '}
                  <a href="#" className="text-green-400 hover:text-green-300">Sign in</a>
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}