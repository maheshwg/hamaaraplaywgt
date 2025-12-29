import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Sparkles, Clock, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const MotionDiv = motion.div;

export default function HeroSection() {
  return (
    <section className="relative flex items-center justify-center overflow-hidden pt-32 pb-16">
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-700/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-700/25 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-black-600/10 to-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-3/4 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-3/4 right-3/4 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl animate-pulse delay-1000" />
        {/* <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-black-600/10 to-blue-600/10 rounded-full blur-3xl" /> */}
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* Badge */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-violet-300">AI-Powered Test Automation</span>
          </MotionDiv>

          {/* Main Headline */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight mb-6"
          >
            <span className="text-white">Your AI Tester</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400">
              Tests using natural language.
            </span>
            <br />
            <span className="text-white">Zero Vendor Lock-In.</span>
          </MotionDiv>

          {/* Subheadline */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl sm:text-2xl text-slate-400 max-w-3xl mx-auto mb-8 leading-relaxed"
          >
            get {' '}
            <span className="text-green-500 font-medium">full automaton coverage</span>{' '}
            in 5 days or less. Export to Playwright anytime.
          </MotionDiv>

          {/* Key Value Props */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-6 mb-12"
          >
            {[
              { icon: Clock, text: '5-Day Delivery' },
              { icon: Shield, text: 'No Vendor Lock-In' },
              { icon: Zap, text: 'AI-Powered' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </MotionDiv>

          {/* CTA Buttons */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to={createPageUrl('StartTrial')}>
              <Button 
                size="lg" 
                className="h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 shadow-2xl shadow-violet-500/30 group"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to={createPageUrl('BookDemo')}>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-14 px-8 text-lg border-slate-700 bg-slate-900/50 text-white hover:bg-slate-800 hover:border-slate-600 group"
              >
                <Play className="mr-2 w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform" />
                Book a Demo
              </Button>
            </Link>
          </MotionDiv>

          {/* Hero Visual - Commented out, replaced with VideoShowcaseSection */}
          {/* <MotionDiv
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl shadow-violet-500/10">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-7 rounded-md bg-slate-800 flex items-center px-3">
                    <span className="text-xs text-slate-500">app.YourAITester.com/dashboard</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-950">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Tests Passed', value: '1,284', change: '+12.5%', color: 'green' },
                    { label: 'Test Coverage', value: '94.2%', change: '+3.1%', color: 'violet' },
                    { label: 'Avg. Execution Time', value: '2.3s', change: '-18%', color: 'blue' },
                  ].map((stat, index) => (
                    <div key={index} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{stat.value}</span>
                        <span className={`text-xs font-medium ${
                          stat.color === 'green' ? 'text-green-400' : 
                          stat.color === 'violet' ? 'text-violet-400' : 'text-blue-400'
                        }`}>{stat.change}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-slate-500">Running test: checkout_flow.test</span>
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="text-slate-400"><span className="text-violet-400">Given</span> user is on the homepage</p>
                    <p className="text-slate-400"><span className="text-blue-400">When</span> user clicks "Add to Cart"</p>
                    <p className="text-slate-400"><span className="text-cyan-400">Then</span> cart should show 1 item</p>
                    <p className="text-green-400 flex items-center gap-2 mt-2">
                      <span className="inline-block w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center text-xs">✓</span>
                      Test passed in 1.2s
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-xl shadow-violet-500/30 animate-bounce">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">5</p>
                <p className="text-xs text-white/80">Days</p>
              </div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 text-lg">✓</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Export to Playwright</p>
                  <p className="text-xs text-slate-400">Zero vendor lock-in</p>
                </div>
              </div>
            </div>
          </MotionDiv> */}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-6 h-10 rounded-full border-2 border-slate-700 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-violet-400 animate-bounce" />
        </div>
      </div>
    </section>
  );
}