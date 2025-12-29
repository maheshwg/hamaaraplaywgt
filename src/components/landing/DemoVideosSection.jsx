import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ExternalLink, Monitor, Globe, ShoppingCart, Building2, Plane, FileText } from 'lucide-react';

const MotionDiv = motion.div;
const MotionButton = motion.button;

export default function DemoVideosSection() {
  const [activeDemo, setActiveDemo] = useState(0);

  const demos = [
    {
      id: 0,
      name: 'Notion',
      icon: FileText,
      description: 'Automating workspace creation, page editing, and collaboration workflows',
      thumbnail: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80',
      testCount: 45,
      duration: '2:34'
    },
    {
      id: 1,
      name: 'Airbnb',
      icon: Building2,
      description: 'Testing search, booking flows, and host management features',
      thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      testCount: 62,
      duration: '3:12'
    },
    {
      id: 2,
      name: 'Kayak',
      icon: Plane,
      description: 'Flight search, price comparison, and multi-city booking automation',
      thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80',
      testCount: 38,
      duration: '2:45'
    },
    {
      id: 3,
      name: 'Salesforce',
      icon: Globe,
      description: 'CRM workflows, lead management, and reporting automation',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      testCount: 85,
      duration: '4:18'
    },
    {
      id: 4,
      name: 'Shopify',
      icon: ShoppingCart,
      description: 'E-commerce checkout, inventory, and order management testing',
      thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
      testCount: 54,
      duration: '3:05'
    },
  ];

  return (
    <section id="demos" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-slate-900/50" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-6">
            <Play className="w-4 h-4" />
            Live Demos
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            See{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              YourAITester
            </span>{' '}
            in Action
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Watch how our AI automates tests for real-world applications
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Demo Selector */}
          <div className="lg:col-span-1 space-y-3">
            {demos.map((demo, index) => (
              <MotionButton
                key={demo.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActiveDemo(index)}
                className={`w-full p-4 rounded-xl border text-left transition-all duration-300 ${
                  activeDemo === index
                    ? 'bg-gradient-to-r from-violet-500/10 to-blue-500/10 border-violet-500/30'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    activeDemo === index
                      ? 'bg-gradient-to-br from-violet-500 to-blue-500'
                      : 'bg-slate-800'
                  }`}>
                    <demo.icon className={`w-6 h-6 ${activeDemo === index ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${activeDemo === index ? 'text-white' : 'text-slate-300'}`}>
                      {demo.name}
                    </h4>
                    <p className="text-sm text-slate-500">{demo.testCount} tests • {demo.duration}</p>
                  </div>
                </div>
              </MotionButton>
            ))}
          </div>

          {/* Demo Video */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <MotionDiv
                key={activeDemo}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900"
              >
                {/* Video Thumbnail */}
                <div className="relative aspect-video">
                  <img
                    src={demos[activeDemo].thumbnail}
                    alt={demos[activeDemo].name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                    <button className="group w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110">
                      <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                    </button>
                  </div>

                  {/* Demo Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 to-transparent">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {demos[activeDemo].name} Automation
                    </h3>
                    <p className="text-slate-300 mb-4">
                      {demos[activeDemo].description}
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-2 text-sm text-slate-400">
                        <Monitor className="w-4 h-4" />
                        {demos[activeDemo].testCount} Test Cases
                      </span>
                      <span className="flex items-center gap-2 text-sm text-slate-400">
                        <Play className="w-4 h-4" />
                        {demos[activeDemo].duration}
                      </span>
                    </div>
                  </div>

                  {/* Live Badge */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-medium text-red-400">LIVE DEMO</span>
                  </div>
                </div>
              </MotionDiv>
            </AnimatePresence>

            {/* Test Output Preview */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm"
            >
              <div className="flex items-center gap-2 mb-3 text-slate-500">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Test execution output
              </div>
              <div className="space-y-1 text-slate-400">
                <p><span className="text-violet-400">describe</span>(<span className="text-green-400">"{demos[activeDemo].name} Automation Suite"</span>)</p>
                <p className="pl-4"><span className="text-green-400">✓</span> should load homepage successfully <span className="text-slate-600">42ms</span></p>
                <p className="pl-4"><span className="text-green-400">✓</span> should navigate to main features <span className="text-slate-600">128ms</span></p>
                <p className="pl-4"><span className="text-green-400">✓</span> should complete primary workflow <span className="text-slate-600">1.2s</span></p>
                <p className="pl-4"><span className="text-green-400">✓</span> should handle edge cases correctly <span className="text-slate-600">89ms</span></p>
                <p className="mt-2 text-green-400">All {demos[activeDemo].testCount} tests passed!</p>
              </div>
            </MotionDiv>
          </div>
        </div>
      </div>
    </section>
  );
}