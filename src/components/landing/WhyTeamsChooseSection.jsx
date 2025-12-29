import React from 'react';
import { motion } from 'framer-motion';
import { PenTool, Layers, Gauge, Rocket, MessageSquare, CheckCircle2 } from 'lucide-react';

const MotionDiv = motion.div;

const speedAdvantages = [
  {
    icon: PenTool,
    title: 'No Scripts to Write',
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/20 via-purple-500/10 to-violet-500/5',
    borderColor: 'border-violet-500/40'
  },
  {
    icon: Layers,
    title: 'Zero Maintenance',
    gradient: 'from-cyan-500 to-blue-600',
    bgGradient: 'from-cyan-500/20 via-blue-500/10 to-cyan-500/5',
    borderColor: 'border-cyan-500/40'
  },
  {
    icon: Gauge,
    title: 'Instant Test Creation',
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-500/20 via-teal-500/10 to-emerald-500/5',
    borderColor: 'border-emerald-500/40'
  },
  {
    icon: Rocket,
    title: 'Rapid Iteration',
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/20 via-orange-500/10 to-amber-500/5',
    borderColor: 'border-amber-500/40'
  },
  {
    icon: MessageSquare,
    title: 'Natural Language',
    gradient: 'from-pink-500 to-rose-600',
    bgGradient: 'from-pink-500/20 via-rose-500/10 to-pink-500/5',
    borderColor: 'border-pink-500/40'
  },
  {
    icon: CheckCircle2,
    title: 'Always Stable',
    gradient: 'from-indigo-500 to-violet-600',
    bgGradient: 'from-indigo-500/20 via-violet-500/10 to-indigo-500/5',
    borderColor: 'border-indigo-500/40'
  }
];

export default function WhyTeamsChooseSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Effects */}
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
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              Why Teams Choose YourAITester
            </h3>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              See how our approach delivers unmatched speed and reliability
            </p>
          </div>

          {/* Static Summary Card */}
          <div className="relative max-w-6xl mx-auto">
            <div className="relative rounded-3xl bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-cyan-600/20 border-2 border-violet-500/40 backdrop-blur-xl overflow-hidden shadow-2xl group">
              {/* Background Effects */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.2),transparent_70%)]" />
              <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
              
              <div className="relative p-8 md:p-12">
                <div>
                  {/* Grid of all advantages */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {speedAdvantages.map((adv, idx) => {
                      const AdvIcon = adv.icon;
                      return (
                        <MotionDiv
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.1 }}
                          className={`group/item relative p-4 md:p-6 rounded-xl bg-gradient-to-br ${adv.bgGradient} border ${adv.borderColor} backdrop-blur-sm hover:scale-105 transition-all duration-300`}
                        >
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br ${adv.gradient} flex items-center justify-center shadow-lg mb-3 group-hover/item:scale-110 transition-transform duration-300`}>
                            <AdvIcon className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.5} />
                          </div>
                          <h5 className="text-sm md:text-base font-bold text-white group-hover/item:text-transparent group-hover/item:bg-clip-text group-hover/item:bg-gradient-to-r group-hover/item:from-violet-400 group-hover/item:to-cyan-400 transition-all duration-300">
                            {adv.title}
                          </h5>
                        </MotionDiv>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-500 to-purple-600 opacity-5 rounded-bl-full" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-500 to-blue-600 opacity-5 rounded-tr-full" />
            </div>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}

