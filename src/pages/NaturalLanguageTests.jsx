import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Code, 
  Users, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  FileCode,
  GitBranch,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MotionDiv = motion.div;

export default function NaturalLanguageTests() {
  const examples = [
    {
      natural: 'Test that users can log in with valid credentials',
      code: `test('user login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});`
    },
    {
      natural: 'Verify search returns relevant results for "laptop"',
      code: `test('search functionality', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="search-input"]', 'laptop');
  await page.click('[data-testid="search-button"]');
  const results = page.locator('.search-result');
  await expect(results).toContainText('laptop');
});`
    },
    {
      natural: 'Check that items can be added to cart and quantity increases',
      code: `test('add to cart', async ({ page }) => {
  await page.goto('/products/1');
  const cartCount = page.locator('[data-testid="cart-count"]');
  const initialCount = await cartCount.textContent();
  await page.click('[data-testid="add-to-cart"]');
  await expect(cartCount).not.toHaveText(initialCount);
});`
    }
  ];

  const benefits = [
    {
      icon: Users,
      title: 'No Coding Required',
      description: 'QA teams, product managers, and designers can write tests without technical expertise.',
      color: 'violet'
    },
    {
      icon: Zap,
      title: 'Faster Test Creation',
      description: 'Write tests 10x faster by describing behavior instead of writing code line by line.',
      color: 'blue'
    },
    {
      icon: Lightbulb,
      title: 'Better Communication',
      description: 'Tests are self-documenting. Anyone can read and understand what\'s being tested.',
      color: 'cyan'
    },
    {
      icon: FileCode,
      title: 'Still Get Real Code',
      description: 'Natural language converts to actual Playwright code you can review and customize.',
      color: 'green'
    },
    {
      icon: GitBranch,
      title: 'Version Control Friendly',
      description: 'Generated code works seamlessly with Git and your existing development workflow.',
      color: 'purple'
    },
    {
      icon: Play,
      title: 'Instant Execution',
      description: 'Tests run immediately after generation—no setup or configuration needed.',
      color: 'pink'
    }
  ];

  const useCases = [
    {
      role: 'QA Engineers',
      description: 'Focus on testing strategy instead of writing boilerplate code',
      tasks: ['Write complex test scenarios quickly', 'Spend less time on syntax', 'Maintain tests easily']
    },
    {
      role: 'Product Managers',
      description: 'Define acceptance criteria that become automated tests',
      tasks: ['Convert user stories to tests', 'Validate features work as designed', 'Catch issues before release']
    },
    {
      role: 'Developers',
      description: 'Get comprehensive test coverage without the overhead',
      tasks: ['Test while you code', 'Quick regression checks', 'Collaborate with non-technical team']
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24">
      {/* Hero */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-cyan-600/20 to-teal-600/20" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
              <MessageSquare className="w-4 h-4" />
              Natural Language Testing
            </span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
              Write Tests in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Plain English
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto mb-8">
              No coding required. Just describe what you want to test, and our AI generates production-ready test code.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={createPageUrl('StartTrial')}>
                <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-lg">
                  Try It Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to={createPageUrl('BookDemo')}>
                <Button size="lg" variant="outline" className="h-14 px-8 border-blue-500/30 text-white hover:bg-blue-500/10 text-lg">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </MotionDiv>

          {/* Interactive Examples */}
          <div className="max-w-5xl mx-auto space-y-6">
            {examples.map((example, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden"
              >
                <div className="grid md:grid-cols-2 divide-x divide-slate-800">
                  <div className="p-6 bg-blue-500/5">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-slate-500 uppercase tracking-wider">Natural Language</span>
                    </div>
                    <p className="text-white text-lg">{example.natural}</p>
                  </div>
                  <div className="p-6 bg-slate-950/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Code className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-slate-500 uppercase tracking-wider">Generated Code</span>
                    </div>
                    <pre className="text-xs text-slate-300 overflow-x-auto">
                      {example.code}
                    </pre>
                  </div>
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
              Why Natural Language Testing?
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Testing should be accessible to everyone, not just developers
            </p>
          </MotionDiv>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{benefit.title}</h3>
                <p className="text-slate-400">{benefit.description}</p>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases by Role */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for Every Team Member
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              From QA to product managers, everyone can contribute to test coverage
            </p>
          </MotionDiv>

          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-900/50 border border-slate-800"
              >
                <h3 className="text-2xl font-bold text-white mb-3">{useCase.role}</h3>
                <p className="text-slate-400 mb-6">{useCase.description}</p>
                <ul className="space-y-3">
                  {useCase.tasks.map((task, taskIndex) => (
                    <li key={taskIndex} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{task}</span>
                    </li>
                  ))}
                </ul>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-slate-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Simple Process, Powerful Results
            </h2>
            <p className="text-xl text-slate-400">
              Three steps from idea to executable test
            </p>
          </MotionDiv>

          <div className="space-y-8">
            {[
              {
                step: '1',
                title: 'Describe the Test',
                description: 'Write what you want to test in everyday language, just like you\'d explain it to a colleague.'
              },
              {
                step: '2',
                title: 'AI Generates Code',
                description: 'Our AI understands your intent and generates robust, maintainable Playwright test code.'
              },
              {
                step: '3',
                title: 'Run & Iterate',
                description: 'Execute tests immediately. Review the code if needed, or just let it run automatically.'
              }
            ].map((item, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-6 p-6 rounded-2xl bg-slate-900/50 border border-slate-800"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-lg">{item.description}</p>
                </div>
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
            className="p-12 rounded-3xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-slate-800 text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Start writing tests in plain English today
            </h2>
            <p className="text-xl text-slate-400 mb-8">
              No credit card required • 14-day free trial • No coding needed
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