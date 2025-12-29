import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Clock, Bug, Target } from 'lucide-react';

const MotionDiv = motion.div;

export default function CaseStudiesSection() {
  const caseStudies = [
    {
      company: 'E-commerce Company',
      industry: 'E-commerce',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
      challenge: 'Manual testing was causing 3-week release delays',
      results: [
        { metric: '94%', label: 'Test Coverage', icon: Target },
        { metric: '85%', label: 'Faster Releases', icon: Clock },
        { metric: '73%', label: 'Bug Reduction', icon: Bug },
        { metric: '3.2x', label: 'ROI', icon: TrendingUp },
      ],
      quote: 'YourAITester transformed our release process. We went from monthly releases to weekly, with confidence.',
      author: 'Marcus Johnson, CTO'
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6">
            <TrendingUp className="w-4 h-4" />
            Case Studies
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Real{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Results
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            See how companies are transforming their testing with YourAITester
          </p>
        </MotionDiv>

        {caseStudies.map((study, index) => (
          <MotionDiv
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-slate-800 bg-slate-900/50 overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Image */}
              <div className="relative h-64 lg:h-auto">
                <img
                  src={study.image}
                  alt={study.company}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
                    {study.industry}
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-3">{study.company}</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 lg:p-10">
                <p className="text-slate-400 mb-6">
                  <span className="text-white font-medium">Challenge:</span> {study.challenge}
                </p>

                {/* Results Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {study.results.map((result, resultIndex) => (
                    <div key={resultIndex} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="flex items-center gap-3 mb-2">
                        <result.icon className="w-5 h-5 text-emerald-400" />
                        <span className="text-2xl font-bold text-white">{result.metric}</span>
                      </div>
                      <p className="text-sm text-slate-400">{result.label}</p>
                    </div>
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="border-l-2 border-emerald-500 pl-4 mb-6">
                  <p className="text-slate-300 italic">"{study.quote}"</p>
                  <cite className="text-sm text-slate-500 mt-2 block">— {study.author}</cite>
                </blockquote>

                <Link to={createPageUrl('CaseStudies')}>
                  <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 group">
                    Read Full Case Study
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </MotionDiv>
        ))}
      </div>
    </section>
  );
}