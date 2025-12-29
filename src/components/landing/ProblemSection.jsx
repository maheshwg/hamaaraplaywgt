import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, Clock, Code, DollarSign, AlertTriangle, Frown } from 'lucide-react';

const MotionDiv = motion.div;

export default function ProblemSection() {
  const problems = [
    {
      icon: Clock,
      title: 'Months of Setup',
      description: 'Traditional automation takes 3-6 months before you see any value'
    },
    {
      icon: Code,
      title: 'Technical Expertise Required',
      description: 'You need to hire expensive automation engineers'
    },
    {
      icon: DollarSign,
      title: 'Vendor Lock-In',
      description: 'Proprietary tools trap you with expensive contracts'
    },
    {
      icon: AlertTriangle,
      title: 'Constant Maintenance',
      description: 'Tests break with every UI change, wasting valuable time'
    },
    {
      icon: Frown,
      title: 'Poor Test Coverage',
      description: 'Manual testing can\'t keep up with rapid releases'
    },
    {
      icon: XCircle,
      title: 'Flaky Tests',
      description: 'Unreliable tests that cry wolf and lose team trust'
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-red-950/5 to-slate-950" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
            <AlertTriangle className="w-4 h-4" />
            The Problem
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Traditional Test Automation is{' '}
            <span className="text-red-400">Broken</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Teams waste months and thousands of dollars trying to build reliable test automation. Sound familiar?
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((problem, index) => (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-red-500/50 hover:shadow-2xl hover:shadow-red-500/20 transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
                <problem.icon className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{problem.title}</h3>
              <p className="text-slate-400">{problem.description}</p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
}