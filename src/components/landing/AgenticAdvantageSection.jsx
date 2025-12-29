import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Eye, MousePointerClick, Code, Zap, ArrowRight, ArrowLeft, Database, Package } from 'lucide-react';

const MotionDiv = motion.div;

export default function AgenticAdvantageSection() {
  const [activeCard, setActiveCard] = useState(0);

  const advantages = [
    {
      icon: Brain,
      title: 'Smart Navigation',
      description: 'Our agents understand your UI like humans do. They see buttons, forms, and content—not brittle selectors that break with every design change.',
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-500/10 to-purple-600/10',
      borderColor: 'border-violet-500/30'
    },
    {
      icon: Eye,
      title: 'Visual Understanding',
      description: 'Test actual user flows by seeing what users see. No more hunting for CSS selectors or XPath expressions that become obsolete overnight.',
      gradient: 'from-cyan-500 to-blue-600',
      bgGradient: 'from-cyan-500/10 to-blue-600/10',
      borderColor: 'border-cyan-500/30'
    },
    {
      icon: MousePointerClick,
      title: 'Natural Interactions',
      description: 'Click, type, and navigate just like real users. YourAITester interacts with elements based on what they are, not how they\'re coded.',
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-500/10 to-teal-600/10',
      borderColor: 'border-emerald-500/30'
    },
    {
      icon: Code,
      title: 'Self-Healing Tests',
      description: 'Tests that adapt automatically when your UI changes. No brittle selectors to maintain, no test updates needed—our AI keeps your tests running smoothly through every release.',
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-500/10 to-orange-600/10',
      borderColor: 'border-amber-500/30'
    },
    {
      icon: Database,
      title: 'Data-Driven Testing',
      description: 'Run comprehensive test coverage with multiple datasets. Import CSV files, use dynamic variables, and test hundreds of scenarios without writing complex code.',
      gradient: 'from-rose-500 to-pink-600',
      bgGradient: 'from-rose-500/10 to-pink-600/10',
      borderColor: 'border-rose-500/30'
    },
    {
      icon: Package,
      title: 'Reusable Modules',
      description: 'Build once, use everywhere. Create modular test components for common workflows like login, navigation, or checkout. Compose complex test scenarios from simple, reusable building blocks.',
      gradient: 'from-indigo-500 to-blue-600',
      bgGradient: 'from-indigo-500/10 to-blue-600/10',
      borderColor: 'border-indigo-500/30'
    }
  ];

  const nextCard = () => {
    setActiveCard((prev) => (prev + 1) % advantages.length);
  };

  const prevCard = () => {
    setActiveCard((prev) => (prev - 1 + advantages.length) % advantages.length);
  };

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Effects with Parallax */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.15),transparent_50%)]"
        style={{ transform: 'translateZ(0)' }}
      />
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(59,130,246,0.15),transparent_50%)]"
        style={{ transform: 'translateZ(0)' }}
      />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
            <Zap className="w-4 h-4" />
            The Future of Test Automation
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Discover the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400">
              Agentic QA Advantage
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Test actual user flows, not IDs in code. YourAITester navigates the browser just like human users do. 
            Our AI agents understand visual elements, not brittle CSS selectors or XPath expressions.
          </p>
        </MotionDiv>

        {/* Desktop: Asymmetric Grid Layout with Staggered Animations */}
        <div className="hidden lg:block mb-10">
          {/* First Row - 2 Featured Cards (Larger) */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {advantages.slice(0, 2).map((advantage, index) => {
            const Icon = advantage.icon;
            return (
              <MotionDiv
                key={index}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    delay: index * 0.15,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className={`relative p-8 rounded-2xl border-2 bg-gradient-to-br ${advantage.bgGradient} ${advantage.borderColor} backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 group cursor-pointer`}
                >
                  {/* Icon and Title in line */}
                  <div className="flex items-center gap-4 mb-4">
                    <MotionDiv
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${advantage.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}
                    >
                  <Icon className="w-8 h-8 text-white" />
                    </MotionDiv>
                    <h3 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-cyan-400 transition-all duration-300">
                      {advantage.title}
                    </h3>
                </div>
                
                  {/* Description */}
                <p className="text-slate-300 text-lg leading-relaxed">
                  {advantage.description}
                </p>

                  {/* Enhanced Decorative Elements */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${advantage.gradient} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-500`} />
                  <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr ${advantage.gradient} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-500`} />
                  
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              </MotionDiv>
            );
          })}
        </div>

          {/* Second Row - 4 Supporting Cards (Compact) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {advantages.slice(2, 6).map((advantage, index) => {
              const Icon = advantage.icon;
              return (
                <MotionDiv
                  key={index + 2}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    delay: (index + 2) * 0.1,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  className={`relative p-6 rounded-xl border bg-gradient-to-br ${advantage.bgGradient} ${advantage.borderColor} backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer`}
                >
                  {/* Icon */}
                  <MotionDiv
                    whileHover={{ rotate: 360, scale: 1.15 }}
                    transition={{ duration: 0.5 }}
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${advantage.gradient} flex items-center justify-center shadow-lg mb-3`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </MotionDiv>
                  
                  {/* Title */}
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-cyan-400 transition-all duration-300">
                    {advantage.title}
                  </h3>
                  
                  {/* Description - Compact */}
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {advantage.description}
                  </p>

                  {/* Decorative Elements */}
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${advantage.gradient} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-500`} />
                  
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </MotionDiv>
              );
            })}
          </div>
        </div>

        {/* Mobile/Tablet: Enhanced Carousel */}
        <div className="lg:hidden relative">
          <div className="relative overflow-hidden rounded-2xl">
            <AnimatePresence mode="wait">
              <MotionDiv
                key={activeCard}
                initial={{ opacity: 0, scale: 0.9, x: 100 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -100 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`p-8 rounded-2xl border-2 bg-gradient-to-br ${advantages[activeCard].bgGradient} ${advantages[activeCard].borderColor} backdrop-blur-sm shadow-xl relative overflow-hidden`}
              >
                {(() => {
                  const Icon = advantages[activeCard].icon;
                  return (
                    <>
                      {/* Icon and Title in line */}
                      <div className="flex items-center gap-4 mb-4">
                        <MotionDiv
                          initial={{ rotate: -180, scale: 0 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${advantages[activeCard].gradient} flex items-center justify-center shadow-lg flex-shrink-0`}
                        >
                          <Icon className="w-7 h-7 text-white" />
                        </MotionDiv>
                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-100">
                          {advantages[activeCard].title}
                        </h3>
                      </div>
                      
                      {/* Description */}
                      <p className="text-slate-300 text-lg leading-relaxed">
                        {advantages[activeCard].description}
                      </p>

                      {/* Decorative Elements */}
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${advantages[activeCard].gradient} opacity-5 rounded-full blur-3xl`} />
                      <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr ${advantages[activeCard].gradient} opacity-5 rounded-full blur-2xl`} />
                    </>
                  );
                })()}
              </MotionDiv>
            </AnimatePresence>
          </div>

          {/* Enhanced Carousel Controls */}
          <div className="flex items-center justify-between mt-6">
            <MotionDiv whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button
              onClick={prevCard}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 text-slate-300 hover:text-white hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
            </MotionDiv>
            
            {/* Enhanced Dots Indicator */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-800">
              {advantages.map((advantage, index) => (
                <button
                  key={index}
                  onClick={() => setActiveCard(index)}
                  className={`rounded-full transition-all duration-300 ${
                    activeCard === index
                      ? 'w-8 h-2'
                      : 'w-2 h-2 hover:w-3'
                  }`}
                >
                  {activeCard === index ? (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-r ${advantage.gradient} opacity-40 blur-sm rounded-full`} />
                      <div className={`relative w-full h-full bg-gradient-to-r ${advantage.gradient} rounded-full`} />
                    </>
                  ) : (
                    <div className="w-full h-full bg-slate-700 hover:bg-slate-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <MotionDiv whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button
              onClick={nextCard}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 text-slate-300 hover:text-white hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
            </MotionDiv>
          </div>
        </div>

      </div>
    </section>
  );
}
