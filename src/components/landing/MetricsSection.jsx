import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const MotionDiv = motion.div;

function AnimatedNumber({ end, suffix = '', prefix = '', decimals = 0 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  useEffect(() => {
    if (!isInView) return;
    
    const numericEnd = parseFloat(end.toString().replace(/[^0-9.]/g, ''));
    let startTime;
    
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / 1500, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(easeOutQuart * numericEnd);
      if (progress < 1) requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }, [isInView, end]);
  
  return <span ref={ref}>{prefix}{count.toFixed(decimals)}{suffix}</span>;
}

import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Target,
  Activity,
  Zap,
  Timer,
  Bug,
  Layers,
  RefreshCw
} from 'lucide-react';

export default function MetricsSection() {
  const metricCategories = [
    {
      title: 'Coverage & Quality',
      metrics: [
        { name: 'Test Coverage Rate', value: '94.2%', icon: Target, description: 'Percentage of code paths covered by tests' },
        { name: 'Requirement Traceability', value: '98%', icon: Layers, description: 'Requirements linked to test cases' },
        { name: 'Defect Detection Rate', value: '89%', icon: Bug, description: 'Bugs caught before production' },
      ]
    },
    {
      title: 'Performance',
      metrics: [
        { name: 'Avg. Execution Time', value: '2.3s', icon: Timer, description: 'Average time per test case' },
        { name: 'Parallel Runs', value: '10x', icon: Zap, description: 'Concurrent test execution speed' },
        { name: 'First-Time Pass Rate', value: '96%', icon: CheckCircle2, description: 'Tests passing without retry' },
      ]
    },
    {
      title: 'Efficiency',
      metrics: [
        { name: 'Test Authoring Speed', value: '85%', icon: TrendingUp, description: 'Faster than manual creation' },
        { name: 'Maintenance Burden', value: '-81%', icon: RefreshCw, description: 'Reduced test maintenance time' },
        { name: 'Defect Escape Rate', value: '0.2%', icon: AlertTriangle, description: 'Bugs reaching production' },
      ]
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-blue-950/5 to-slate-950" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-6">
            <BarChart3 className="w-4 h-4" />
            Metrics & Analytics
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Comprehensive{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
              Test Analytics
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Track every metric that matters with our detailed reporting dashboard
          </p>
        </MotionDiv>

        {/* Dashboard Preview */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 rounded-3xl border border-slate-800 bg-slate-900/50 overflow-hidden"
        >
          {/* Dashboard Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-yellow-500 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-violet-400">Test Analytics Dashboard</h3>
                <p className="text-sm text-slate-500">Last updated: Just now</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="p-6">
            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Tests', value: '1,284', change: '+12%', color: 'violet' },
                { label: 'Pass Rate', value: '97.8%', change: '+2.1%', color: 'green' },
                { label: 'Avg. Duration', value: '2.3s', change: '-18%', color: 'blue' },
                { label: 'Coverage', value: '94.2%', change: '+5.4%', color: 'cyan' },
              ].map((stat, index) => (
                <MotionDiv 
                  key={index} 
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: "spring" }}
                  className="p-5 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300"
                >
                  <p className="text-sm text-slate-400 mb-2">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-transparent bg-clip-text text-violet-400 bg-gradient-to-r from-white to-slate-300">
                      {stat.label.includes('Duration') ? stat.value : (
                        <AnimatedNumber 
                          end={parseFloat(stat.value.replace(/[^0-9.]/g, ''))} 
                          suffix={stat.value.match(/[^0-9.]+$/)?.[0] || ''} 
                          prefix={stat.value.match(/^[^0-9.]+/)?.[0] || ''}
                          decimals={stat.value.includes('.') ? 1 : 0}
                        />
                      )}
                    </span>
                    <span className="text-xs font-medium text-green-400">{stat.change}</span>
                  </div>
                </MotionDiv>
              ))}
            </div>

            {/* Chart Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pass/Fail Chart */}
              <div className="lg:col-span-2 p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <h4 className="text-sm font-medium text-slate-400 mb-4">Test Results Over Time</h4>
                <div className="h-48 flex items-end gap-2 px-2 overflow-x-auto">
                  {(() => {
                    // Mock data: [passed, failed] for each month
                    const monthlyData = [
                      { passed: 245, failed: 38 }, // Jan - 86.6% pass rate
                      { passed: 312, failed: 28 }, // Feb - 91.8% pass rate
                      { passed: 298, failed: 35 }, // Mar - 89.5% pass rate
                      { passed: 387, failed: 23 }, // Apr - 94.4% pass rate
                      { passed: 421, failed: 19 }, // May - 95.7% pass rate
                      { passed: 456, failed: 14 }, // Jun - 97.0% pass rate
                      { passed: 489, failed: 12 }, // Jul - 97.6% pass rate
                      { passed: 512, failed: 8 },  // Aug - 98.5% pass rate
                      { passed: 534, failed: 6 },  // Sep - 98.9% pass rate
                      { passed: 567, failed: 5 },  // Oct - 99.1% pass rate
                      { passed: 589, failed: 4 },   // Nov - 99.3% pass rate
                      { passed: 612, failed: 3 },  // Dec - 99.5% pass rate
                    ];
                    
                    // Find max total for scaling
                    const maxTotal = Math.max(...monthlyData.map(d => d.passed + d.failed));
                    
                    return monthlyData.map((data, index) => {
                      const total = data.passed + data.failed;
                      // Calculate heights in pixels based on container height (h-48 = 192px)
                      const containerHeight = 192; // h-48 = 192px
                      const passedHeightPx = (data.passed / maxTotal) * containerHeight;
                      const failedHeightPx = (data.failed / maxTotal) * containerHeight;
                      
                      return (
                        <div
                          key={index}
                          className="flex flex-col justify-end gap-1 group relative"
                          style={{ minWidth: '56px', width: '56px', flexShrink: 0, height: '100%' }}
                        >
                          <div 
                            className="w-full bg-gradient-to-t from-green-500/60 to-green-400/60 rounded-t transition-all duration-300 hover:from-green-400/75 hover:to-green-300/75 cursor-pointer shadow-lg border-2 border-green-600/25"
                            style={{ height: `${passedHeightPx}px`, minHeight: '4px' }}
                            title={`${data.passed} passed (${((data.passed / total) * 100).toFixed(1)}%)`}
                          />
                          {data.failed > 0 && (
                            <div 
                              className="w-full bg-gradient-to-t from-red-500/70 to-red-400/70 rounded-b transition-all duration-300 hover:from-red-400/80 hover:to-red-300/80 cursor-pointer shadow-lg border-2 border-red-600/25"
                              style={{ height: `${failedHeightPx}px`, minHeight: '2px' }}
                              title={`${data.failed} failed (${((data.failed / total) * 100).toFixed(1)}%)`}
                            />
                          )}
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
                            <div className="font-semibold mb-1">Total: {total} tests</div>
                            <div className="text-green-400">✓ {data.passed} passed</div>
                            {data.failed > 0 && <div className="text-red-400">✗ {data.failed} failed</div>}
                            <div className="text-slate-400 mt-1">Pass rate: {((data.passed / total) * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                {/* X-axis labels aligned to the bars (same widths + scroll behavior) */}
                <div className="mt-4 flex items-center gap-2 px-2 overflow-x-auto text-xs text-slate-500">
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m) => (
                    <div
                      key={m}
                      className="flex-shrink-0 text-center"
                      style={{ minWidth: '56px', width: '56px' }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Types */}
              <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <h4 className="text-sm font-medium text-slate-400 mb-4">Error Types</h4>
                <div className="space-y-4">
                  {[
                    { type: 'Element Not Found', count: 12, percentage: 35 },
                    { type: 'Timeout', count: 8, percentage: 24 },
                    { type: 'Assertion Failed', count: 7, percentage: 21 },
                    { type: 'Network Error', count: 4, percentage: 12 },
                    { type: 'Other', count: 3, percentage: 8 },
                  ].map((error, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-yellow-400">{error.type}</span>
                        <span className="text-slate-500">{error.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                          style={{ width: `${error.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Metric Categories */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {metricCategories.map((category, catIndex) => (
            <MotionDiv
              key={catIndex}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: catIndex * 0.15, type: "spring", stiffness: 100 }}
              className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-green-500/30 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500"
            >
              <h3 className="text-lg font-semibold text-white mb-6">{category.title}</h3>
              <div className="space-y-4">
                {category.metrics.map((metric, metricIndex) => (
                  <div key={metricIndex} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <metric.icon className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-white">{metric.value}</span>
                        <span className="text-sm text-slate-500">{metric.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{metric.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </MotionDiv>
          ))}
        </div> */}
      </div>
    </section>
  );
}