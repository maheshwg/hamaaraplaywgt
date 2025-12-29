import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar,
  Clock,
  CheckCircle2,
  Video,
  Users,
  Zap,
  Shield,
  ArrowRight,
  Play,
  Building2,
  Mail,
  User,
  Phone,
  Globe
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BookDemo() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    teamSize: '',
    website: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate form submission
    setSubmitted(true);
  };

  const benefits = [
    { icon: Video, text: 'Live 30-minute personalized demo' },
    { icon: Users, text: 'Meet our automation experts' },
    { icon: Zap, text: 'See AI test generation in action' },
    { icon: Shield, text: 'Learn about our 5-day delivery' },
  ];

  const testimonial = {
    quote: "The demo showed us exactly how YourAITester could solve our testing challenges. Within 5 days of signing up, we had our first 50 tests running.",
    author: "Sarah Chen",
    role: "VP of Engineering at TechFlow Systems",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80"
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white pt-24 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Demo Booked!</h1>
          <p className="text-slate-400 mb-6">
            Thanks for your interest! We'll reach out within 24 hours to confirm your demo time.
          </p>
          <p className="text-slate-500 text-sm">
            Check your email for a calendar invite and preparation materials.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left Column - Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
              <Calendar className="w-4 h-4" />
              Book a Demo
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              See YourAITester{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
                in Action
              </span>
            </h1>
            <p className="text-xl text-slate-400 mb-8">
              Get a personalized walkthrough of our AI-powered test automation platform and learn how we can deliver your tests in 5 days.
            </p>

            {/* Benefits */}
            <div className="space-y-4 mb-10">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <benefit.icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <span className="text-slate-300">{benefit.text}</span>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
              <p className="text-slate-300 italic mb-4">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.image}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="text-white font-medium">{testimonial.author}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            </div>

            {/* Demo Preview */}
            <div className="mt-8 relative rounded-2xl overflow-hidden border border-slate-800">
              <img
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80"
                alt="Demo Preview"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-violet-600/90 flex items-center justify-center cursor-pointer hover:bg-violet-500 transition-colors">
                  <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="text-white text-sm font-medium">Watch a 2-min overview</span>
                <span className="flex items-center gap-2 text-slate-300 text-sm">
                  <Clock className="w-4 h-4" />
                  2:34
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800">
              <h2 className="text-2xl font-bold text-white mb-2">Request Your Demo</h2>
              <p className="text-slate-400 mb-8">Fill out the form and we'll be in touch within 24 hours.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      First Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        required
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Last Name *
                    </label>
                    <Input
                      required
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
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
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Name *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      required
                      placeholder="Acme Inc."
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Website URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="url"
                      placeholder="https://yourapp.com"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Team Size *
                  </label>
                  <Select onValueChange={(value) => setFormData({...formData, teamSize: value})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select team size" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    What would you like to discuss?
                  </label>
                  <Textarea
                    placeholder="Tell us about your testing challenges..."
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px]"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg shadow-violet-500/25"
                >
                  Book My Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  By submitting, you agree to our Privacy Policy and Terms of Service.
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}