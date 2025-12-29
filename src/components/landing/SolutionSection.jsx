import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Wrench, 
  Zap, 
  Brain, 
  Code, 
  BarChart3 
} from 'lucide-react';

const MotionDiv = motion.div;

export default function SolutionSection() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI Test Generation',
      description: 'Describe what you want to test in plain English. Our AI writes the test code for you, understanding your application context.',
      gradient: 'from-violet-500 to-purple-500'
    },
    {
      icon: Wrench,
      title: 'Self-Healing Tests',
      description: 'Tests automatically adapt when your UI changes. No more broken selectors or manual maintenance headaches.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Zap,
      title: '10x Faster Execution',
      description: 'Parallel test execution across cloud infrastructure. Run thousands of tests in minutes, not hours.',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: Brain,
      title: 'Intelligent Coverage',
      description: 'AI analyzes your codebase to suggest missing test scenarios and identify critical paths that need coverage.',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: Code,
      title: 'No-Code & Pro-Code',
      description: 'Visual test builder for quick tests, full code access when you need it. Best of both worlds.',
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      icon: BarChart3,
      title: 'Smart Analytics',
      description: 'Detailed insights into test health, flakiness detection, and performance trends over time.',
      gradient: 'from-indigo-500 to-purple-500'
    }
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      
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
            Everything you need for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
              bulletproof testing
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            From test creation to execution and maintenance, our AI-powered platform handles it all.
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
              className="group relative"
            >
              {/* Card */}
              <div className="h-full p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 hover:-translate-y-2">
                {/* Icon */}
                <div className="relative mb-6">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-blue-400 transition-all">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
}