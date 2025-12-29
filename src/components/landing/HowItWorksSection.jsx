import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MessageSquare, Sparkles, Rocket, CheckCircle2, ArrowRight } from 'lucide-react';

const MotionDiv = motion.div;

function AnimatedCounter({ end, suffix = '', duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  useEffect(() => {
    if (!isInView) return;
    
    const isPercentage = suffix.includes('%');
    const numericEnd = parseFloat(end.toString().replace(/[^0-9.]/g, ''));
    const prefix = end.toString().match(/^[^0-9.]*/)?.[0] || '';
    
    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = easeOutQuart * numericEnd;
      
      setCount(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);
  
  const prefix = end.toString().match(/^[^0-9.]*/)?.[0] || '';
  const numericEnd = parseFloat(end.toString().replace(/[^0-9.]/g, ''));
  const decimalPlaces = end.toString().includes('.') ? 1 : 0;
  
  return (
    <span ref={ref}>
      {prefix}{count.toFixed(decimalPlaces)}{suffix}
    </span>
  );
}

export default function HowItWorksSection() {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let index = 0;
    setHighlightedIndex(0);
    const interval = setInterval(() => {
      index = (index + 1) % 4;
      setHighlightedIndex(index);
    }, 2500);
    return () => clearInterval(interval);
  }, [isInView]);

  const steps = [
    {
      number: '01',
      icon: MessageSquare,
      title: 'Describe Your Test',
      description: 'Tell the AI what you want to test using natural language. "Test that users can log in with valid credentials."',
      color: 'violet'
    },
    {
      number: '02',
      icon: Sparkles,
      title: 'AI Generates Code',
      description: 'Our AI analyzes your application, understands the UI, and generates robust test scripts automatically.',
      color: 'blue'
    },
    {
      number: '03',
      icon: Rocket,
      title: 'Execute & Scale',
      description: 'Run tests across browsers, devices, and environments. Parallel execution for maximum speed.',
      color: 'cyan'
    },
    {
      number: '04',
      icon: CheckCircle2,
      title: 'Auto-Maintain',
      description: 'Tests self-heal when your app changes. Get detailed reports and insights automatically.',
      color: 'green'
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-violet-950/5 to-slate-950" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
            <Rocket className="w-4 h-4" />
            How It Works
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            From idea to test{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
              in seconds
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Our full-service approach means you get results, not just another tool to figure out
          </p>
        </MotionDiv>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-violet-500/50 via-blue-500/50 to-green-500/50" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                {/* Step Card */}
                <div className={`relative p-6 rounded-2xl bg-slate-900/50 border transition-all duration-700 text-center ${
                  highlightedIndex === index 
                    ? 'border-violet-500 shadow-2xl shadow-violet-500/50 scale-105 bg-slate-800/80' 
                    : 'border-slate-800 hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/10 group-hover:scale-105'
                }`}>
                  {/* Number Badge */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className={`w-8 h-8 rounded-full bg-${step.color}-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-${step.color}-500/30`}>
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Icon */}
                  <div className={`w-16 h-16 mx-auto rounded-2xl bg-${step.color}-500/10 flex items-center justify-center mb-4 mt-4`}>
                    <step.icon className={`w-8 h-8 text-${step.color}-400`} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400">{step.description}</p>
                </div>
                
                {/* Arrow (except last) */}
                {index < steps.length - 1 && (
                  <div className={`hidden lg:flex absolute top-24 -right-4 z-10 w-8 h-8 rounded-full border items-center justify-center transition-all duration-500 ${
                    highlightedIndex === index
                      ? 'bg-violet-500 border-violet-400 shadow-lg shadow-violet-500/50 scale-125'
                      : 'bg-slate-900 border-slate-800'
                  }`}>
                    <ArrowRight className={`w-4 h-4 transition-colors duration-500 ${
                      highlightedIndex === index ? 'text-white' : 'text-slate-500'
                    }`} />
                  </div>
                )}
              </MotionDiv>
            ))}
          </div>
        </div>

        {/* Bottom Stats */}
        <MotionDiv
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-cyan-500/10 border border-violet-500/20 shadow-2xl shadow-violet-500/10"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '10', suffix: 'x', label: 'Faster Test Creation', subtitle: 'Compared to manual scripting', gradient: 'from-violet-400 via-purple-400 to-blue-400' },
              { value: '90', suffix: '%', label: 'Less Maintenance', subtitle: 'With self-healing tests', gradient: 'from-blue-400 via-cyan-400 to-teal-400' },
              { value: '50', suffix: 'K+', label: 'Tests Run Daily', subtitle: 'Across all customers', gradient: 'from-green-400 via-emerald-400 to-teal-400' },
              { value: '99.9', suffix: '%', label: 'Uptime SLA', subtitle: 'Enterprise-grade reliability', gradient: 'from-orange-400 via-amber-400 to-yellow-400' },
            ].map((stat, index) => (
              <MotionDiv 
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
              >
                <p className={`text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${stat.gradient} drop-shadow-lg`}>
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-base text-white font-semibold mt-3">{stat.label}</p>
                <p className="text-sm text-slate-400 mt-1">{stat.subtitle}</p>
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}