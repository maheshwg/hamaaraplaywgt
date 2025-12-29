import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Brain, 
  Wand2, 
  CheckCircle2, 
  ArrowRight,
  Code,
  Zap,
  Target,
  Clock,
  Shield,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MotionDiv = motion.div;

export default function AITestGeneration() {
  const benefits = [
    {
      icon: Clock,
      title: '10x Faster Test Creation',
      description: 'Generate comprehensive test suites in minutes, not weeks. Our AI writes tests faster than any human could.'
    },
    {
      icon: Brain,
      title: 'Intelligent Test Coverage',
      description: 'AI analyzes your app to identify critical paths and edge cases you might miss manually.'
    },
    {
      icon: Shield,
      title: 'Self-Healing Tests',
      description: 'Tests automatically adapt to UI changes, reducing maintenance burden by 90%.'
    },
    {
      icon: Target,
      title: 'Smart Element Detection',
      description: 'Advanced algorithms find the most stable selectors, making tests resilient to change.'
    },
    {
      icon: Code,
      title: 'Production-Ready Code',
      description: 'Generated tests follow best practices and are ready to run in your CI/CD pipeline.'
    },
    {
      icon: TrendingUp,
      title: 'Continuous Learning',
      description: 'AI improves over time, learning from test patterns and your application behavior.'
    }
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Describe Your Test',
      description: 'Write what you want to test in plain English. "Verify users can checkout with a credit card."',
      icon: Wand2
    },
    {
      step: '02',
      title: 'AI Analyzes Your App',
      description: 'Our AI crawls your application, understands the structure, and identifies UI elements.',
      icon: Brain
    },
    {
      step: '03',
      title: 'Code Generation',
      description: 'AI generates robust Playwright test code with smart selectors and proper assertions.',
      icon: Code
    },
    {
      step: '04',
      title: 'Execute & Refine',
      description: 'Tests run automatically. AI learns from results and optimizes for better coverage.',
      icon: Sparkles
    }
  ];

  const useCases = [
    {
      title: 'Regression Testing',
      description: 'Generate tests for all critical user flows to catch regressions before deployment.',
      stat: '500+ tests',
      statLabel: 'per project'
    },
    {
      title: 'Edge Case Detection',
      description: 'AI identifies and tests edge cases that manual testers often overlook.',
      stat: '40%',
      statLabel: 'more coverage'
    },
    {
      title: 'API Testing',
      description: 'Generate API tests from OpenAPI specs or by observing network traffic.',
      stat: '2 mins',
      statLabel: 'to generate'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24">
      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-blue-600/20 to-cyan-600/20" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Testing
            </span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
              AI Test Generation
            </h1>
            <p className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto mb-8">
              Let AI write your tests. Describe what you want to test in plain English,
              and get production-ready Playwright code in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={createPageUrl('StartTrial')}>
                <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-lg">
                  Try It Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to={createPageUrl('BookDemo')}>
                <Button size="lg" variant="outline" className="h-14 px-8 border-violet-500/30 text-white hover:bg-violet-500/10 text-lg">
                  See It In Action
                </Button>
              </Link>
            </div>
          </MotionDiv>

          {/* Demo Visual */}
          <MotionDiv
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">AI Test Generator</p>
                  <p className="text-sm text-slate-500">Natural language to code</p>
                </div>
              </div>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Generating...
              </span>
            </div>
            <div className="grid md:grid-cols-2 divide-x divide-slate-800">
              <div className="p-6 bg-slate-950/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Your Description</p>
                <p className="text-slate-300 leading-relaxed">
                  Test that users can add items to cart, apply a discount code "SAVE20", 
                  and complete checkout with credit card payment.
                </p>
              </div>
              <div className="p-6 bg-slate-900/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Generated Test Code</p>
                <pre className="text-xs text-slate-300 overflow-x-auto">
{`test('checkout with discount', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="cart-icon"]');
  await page.fill('[name="coupon"]', 'SAVE20');
  await page.click('text=Apply');
  await page.click('text=Checkout');
  // ... complete checkout flow
  await expect(page).toHaveURL(/\\/order\\/success/);
});`}
                </pre>
              </div>
            </div>
          </MotionDiv>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              How AI Test Generation Works
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              From idea to executable test in seconds with our advanced AI engine
            </p>
          </MotionDiv>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-violet-500/30 transition-all duration-300">
                  <div className="absolute -top-4 left-6 px-3 py-1 rounded-full bg-violet-600 text-white text-sm font-bold">
                    {item.step}
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 mt-4">
                    <item.icon className="w-7 h-7 text-violet-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400">{item.description}</p>
                </div>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Why AI-Generated Tests Are Better
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              AI doesn't just write tests faster—it writes better tests
            </p>
          </MotionDiv>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{benefit.title}</h3>
                <p className="text-slate-400">{benefit.description}</p>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for Every Testing Scenario
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              From simple smoke tests to complex end-to-end flows
            </p>
          </MotionDiv>

          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-900/50 border border-slate-800"
              >
                <div className="text-center mb-6">
                  <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400 mb-2">
                    {useCase.stat}
                  </p>
                  <p className="text-sm text-slate-500">{useCase.statLabel}</p>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{useCase.title}</h3>
                <p className="text-slate-400">{useCase.description}</p>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-cyan-500/10 border border-slate-800 text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to experience AI-powered testing?
            </h2>
            <p className="text-xl text-slate-400 mb-8">
              Start generating tests in minutes with our free trial
            </p>
            <Link to={createPageUrl('StartTrial')}>
              <Button size="lg" className="h-14 px-8 bg-white text-slate-900 hover:bg-slate-100 text-lg">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </MotionDiv>
        </div>
      </section>
    </div>
  );
}