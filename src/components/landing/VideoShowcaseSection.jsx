import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles, Zap, Target, Rocket, Shield, Code } from 'lucide-react';

const videoTabs = [
  {
    id: 'ai-test-generation',
    title: 'AI Test Generation',
    description: 'Watch AI create complete test suites in minutes',
    videoUrl: '/videos/ai-test-generation.mp4',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-500'
  },
  {
    id: 'natural-language',
    title: 'Natural Language Tests',
    description: 'Write tests in plain English, no coding required',
    videoUrl: '/videos/natural-language.mp4',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'auto-healing',
    title: 'Self-Healing Tests',
    description: 'Tests automatically adapt to UI changes',
    videoUrl: '/videos/auto-healing.mp4',
    icon: Shield,
    color: 'from-emerald-500 to-green-500'
  },
  {
    id: 'parallel-execution',
    title: 'Parallel Execution',
    description: 'Run hundreds of tests simultaneously',
    videoUrl: '/videos/parallel-execution.mp4',
    icon: Rocket,
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'visual-testing',
    title: 'Visual Testing',
    description: 'Catch visual regressions automatically',
    videoUrl: '/videos/visual-testing.mp4',
    icon: Target,
    color: 'from-pink-500 to-rose-500'
  },
  {
    id: 'api-testing',
    title: 'API Integration',
    description: 'Test APIs alongside your UI seamlessly',
    videoUrl: '/videos/api-testing.mp4',
    icon: Code,
    color: 'from-indigo-500 to-blue-500'
  }
];

export default function VideoShowcaseSection() {
  const [activeTab, setActiveTab] = useState(videoTabs[0]);

  return (
    <section className="relative py-16 px-4 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
      
      {/* Animated background orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Section Header - Simplified since it's right after hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block mb-3"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium">
              <Play className="w-4 h-4" />
              See It In Action
            </span>
          </motion.div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-violet-200 to-blue-200 bg-clip-text text-transparent">
            Experience the Power
          </h2>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto">
            Watch how YourAITester transforms the way teams build and maintain automated tests
          </p>
        </motion.div>

        {/* Main Content: Tabs + Video */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Side: Tabs */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-4 space-y-3"
          >
            {videoTabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab.id === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    w-full text-left p-5 rounded-2xl transition-all duration-300
                    group relative overflow-hidden
                    ${isActive 
                      ? 'bg-gradient-to-br from-violet-500/20 to-blue-500/20 border-2 border-violet-500/50 shadow-lg shadow-violet-500/20' 
                      : 'bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/60'
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${tab.color}`}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  {/* Hover glow effect */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  
                  <div className="relative flex items-start gap-4">
                    {/* Icon */}
                    <div className={`
                      flex-shrink-0 p-3 rounded-xl transition-all duration-300
                      ${isActive 
                        ? `bg-gradient-to-br ${tab.color} shadow-lg` 
                        : 'bg-slate-700/50 group-hover:bg-slate-700'
                      }
                    `}>
                      <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    </div>
                    
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`
                        font-semibold text-lg mb-1 transition-colors
                        ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}
                      `}>
                        {tab.title}
                      </h3>
                      <p className={`
                        text-sm transition-colors
                        ${isActive ? 'text-violet-200' : 'text-slate-500 group-hover:text-slate-400'}
                      `}>
                        {tab.description}
                      </p>
                    </div>
                    
                    {/* Play indicator for active */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Right Side: Video Player */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-8"
          >
            <div className="relative rounded-3xl overflow-hidden bg-slate-800/40 border border-slate-700/50 shadow-2xl shadow-violet-500/10">
              {/* Video Container */}
              <div className="relative" style={{ minHeight: '600px' }}>
                {/* Title Section - 15% of vertical space */}
                <div className="relative z-10 p-8 bg-gradient-to-b from-slate-900/95 to-slate-900/80 backdrop-blur-sm border-b border-slate-700/50" style={{ height: '15%', minHeight: '90px' }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${activeTab.color}`}>
                          <activeTab.icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">
                          {activeTab.title}
                        </h3>
                      </div>
                      <p className="text-slate-400">
                        {activeTab.description}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Video Section - 85% of vertical space */}
                <div className="relative bg-black" style={{ height: '85%', minHeight: '510px' }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0"
                    >
                      <video
                        key={activeTab.videoUrl}
                        className="w-full h-full object-cover"
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                      >
                        <source src={activeTab.videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      
                      {/* Gradient overlay at bottom for better visual */}
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Decorative corner accents */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${activeTab.color} opacity-20 blur-3xl`} />
              <div className={`absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr ${activeTab.color} opacity-20 blur-3xl`} />
            </div>

            {/* Video stats/info below */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-6 grid grid-cols-3 gap-4"
            >
              <div className="text-center p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <div className="text-2xl font-bold text-white mb-1">2 min</div>
                <div className="text-sm text-slate-400">Watch Time</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <div className="text-2xl font-bold text-white mb-1">HD</div>
                <div className="text-sm text-slate-400">Quality</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <div className="text-2xl font-bold text-white mb-1">Live</div>
                <div className="text-sm text-slate-400">Real Demo</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom CTA - Simplified */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-slate-400 mb-4 text-sm">
            Ready to transform your testing workflow?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105">
              Start Free Trial
            </button>
            <button className="px-6 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-white font-semibold hover:bg-slate-800 transition-all duration-300 hover:scale-105">
              Schedule a Demo
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

