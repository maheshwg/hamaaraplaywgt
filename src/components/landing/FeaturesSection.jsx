import React from 'react';
import { motion } from 'framer-motion';

const MotionDiv = motion.div;

import { 
  Sparkles, 
  MessageSquare, 
  Download, 
  Clock, 
  Video, 
  Camera, 
  BarChart3, 
  Users,
  Zap,
  Shield,
  RefreshCw,
  Globe
} from 'lucide-react';

export default function FeaturesSection() {
  const mainFeatures = [
    {
      icon: Sparkles,
      title: 'AI-Powered Test Generation',
      description: 'Our AI understands your application and generates comprehensive test cases automatically. No coding required.',
      color: 'violet',
      gradient: 'from-violet-500 to-purple-500'
    },
    {
      icon: MessageSquare,
      title: 'Natural Language Tests',
      description: 'Write tests in plain English. Anyone on your team can create, read, and modify test cases without technical knowledge.',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Download,
      title: 'Export to Playwright',
      description: 'Zero vendor lock-in. Export your tests to Playwright anytime and run them on your own infrastructure.',
      color: 'cyan',
      gradient: 'from-cyan-500 to-teal-500'
    },
    {
      icon: Clock,
      title: '5-Day Delivery',
      description: 'We don\'t just sell software — we deliver fully functioning test automation in 5 days or less. Full service.',
      color: 'green',
      gradient: 'from-green-500 to-emerald-500'
    },
  ];

  const additionalFeatures = [
    { icon: Video, title: 'Video Recording', description: 'Every test run includes full video recording for easy debugging' },
    { icon: Camera, title: 'Screenshot Capture', description: 'Automatic screenshots on test failures and key checkpoints' },
    { icon: BarChart3, title: 'Rich Analytics', description: 'Comprehensive metrics dashboard with pass/fail rates, trends, and insights' },
    { icon: Users, title: 'Team Collaboration', description: 'Built for teams with shared test libraries and role-based access' },
    { icon: RefreshCw, title: 'Self-Healing Tests', description: 'AI automatically updates selectors when your UI changes' },
    { icon: Globe, title: 'Cross-Browser Testing', description: 'Run tests across Chrome, Firefox, Safari, and Edge simultaneously' },
    { icon: Zap, title: 'Parallel Execution', description: 'Run multiple tests simultaneously to speed up your pipeline' },
    { icon: Shield, title: 'Enterprise Security', description: 'SOC 2 compliant with SSO and advanced security controls' },
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Features
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Everything You Need to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
              Automate with Confidence
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Full-service test automation powered by AI, delivered in days not months
          </p>
        </MotionDiv>

        {/* Main Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {mainFeatures.map((feature, index) => (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all duration-500 overflow-hidden"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg shadow-${feature.color}-500/25`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 text-lg leading-relaxed">{feature.description}</p>
              
              {/* Decorative Element */}
              <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-5 rounded-tl-full`} />
            </MotionDiv>
          ))}
        </div>

        {/* Additional Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {additionalFeatures.map((feature, index) => (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group p-6 rounded-2xl bg-slate-900/30 border border-slate-800/50 hover:bg-slate-900/50 hover:border-slate-700 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                <feature.icon className="w-5 h-5 text-slate-400 group-hover:text-violet-400 transition-colors" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
              <p className="text-sm text-slate-500">{feature.description}</p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
}