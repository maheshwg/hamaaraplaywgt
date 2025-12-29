import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Sparkles, Clock, Shield, Download } from 'lucide-react';

const MotionDiv = motion.div;

export default function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-blue-600/20 to-cyan-600/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
            <Sparkles className="w-4 h-4 text-violet-300" />
            <span className="text-sm text-white/80">Ready to transform your testing?</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Stop Writing Tests.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-300">
              Start Shipping Confidently.
            </span>
          </h2>

          {/* Subtext */}
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Get fully functioning test automation delivered in 5 days. No vendor lock-in. No lengthy setup. Just results.
          </p>

          {/* Value Props */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            {[
              { icon: Clock, text: '5-Day Delivery' },
              { icon: Shield, text: 'Zero Lock-In' },
              { icon: Download, text: 'Export to Playwright' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-white/80">
                <item.icon className="w-5 h-5 text-violet-300" />
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={createPageUrl('StartTrial')}>
              <Button 
                size="lg" 
                className="h-14 px-8 text-lg bg-white text-slate-900 hover:bg-slate-100 shadow-2xl group"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to={createPageUrl('BookDemo')}>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-14 px-8 text-lg border-white/30 text-white hover:bg-white/10 group"
              >
                <Play className="mr-2 w-5 h-5 text-violet-300 group-hover:scale-110 transition-transform" />
                Book a Demo
              </Button>
            </Link>
          </div>

          {/* Trust Badge */}
          <p className="mt-8 text-sm text-slate-400">
            No credit card required • Free 14-day trial • Cancel anytime
          </p>
        </MotionDiv>
      </div>
    </section>
  );
}