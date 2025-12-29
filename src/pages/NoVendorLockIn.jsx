import React from 'react';
import { motion } from 'framer-motion';
import { 
  Unlock, 
  Download, 
  Code, 
  ArrowRight,
  CheckCircle2,
  Shield,
  GitBranch,
  Server,
  CloudOff,
  FileCode,
  Database,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MotionDiv = motion.div;

export default function NoVendorLockIn() {
  const freedoms = [
    {
      icon: Download,
      title: 'Export Anytime',
      description: 'Download your complete test suite as standard Playwright code with one click. No proprietary formats.',
      color: 'green'
    },
    {
      icon: Play,
      title: 'Run Anywhere',
      description: 'Execute tests on your local machine, CI/CD pipeline, or any cloud provider. You own the code.',
      color: 'blue'
    },
    {
      icon: GitBranch,
      title: 'Version Control',
      description: 'Store tests in your Git repository alongside application code. Full version history included.',
      color: 'purple'
    },
    {
      icon: Server,
      title: 'Your Infrastructure',
      description: 'Run tests on your own servers, Docker containers, or Kubernetes clusters. No forced cloud dependency.',
      color: 'cyan'
    },
    {
      icon: CloudOff,
      title: 'No Platform Lock',
      description: 'Switch to any test runner or framework anytime. Standard Playwright means universal compatibility.',
      color: 'violet'
    },
    {
      icon: Database,
      title: 'Own Your Data',
      description: 'Test results, screenshots, and videos are yours. Export or delete anytime without restrictions.',
      color: 'pink'
    }
  ];

  const comparisons = [
    {
      feature: 'Test Format',
      timeless: 'Standard Playwright (open source)',
      others: 'Proprietary format'
    },
    {
      feature: 'Export Tests',
      timeless: 'Full export anytime, no limits',
      others: 'Limited or blocked'
    },
    {
      feature: 'Run Tests Locally',
      timeless: 'Yes, on any machine',
      others: 'Only on their platform'
    },
    {
      feature: 'Switching Costs',
      timeless: '$0 - Just export & run',
      others: 'Rewrite everything'
    },
    {
      feature: 'Data Ownership',
      timeless: 'You own all test data',
      others: 'Platform owns your data'
    },
    {
      feature: 'Contract Terms',
      timeless: 'Cancel anytime, no penalty',
      others: 'Long-term contracts'
    }
  ];

  const benefits = [
    {
      title: 'Future-Proof Your Investment',
      description: 'Never worry about vendor bankruptcy, price hikes, or feature changes. Your tests are portable.',
      icon: Shield
    },
    {
      title: 'Maintain Full Control',
      description: 'You decide when and how to run tests. No forced upgrades, no surprise deprecations.',
      icon: Unlock
    },
    {
      title: 'Collaborate Freely',
      description: 'Share tests with contractors, partners, or open source communities without licensing restrictions.',
      icon: GitBranch
    },
    {
      title: 'Regulatory Compliance',
      description: 'Meet data sovereignty and compliance requirements by running tests on your own infrastructure.',
      icon: FileCode
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24">
      {/* Hero */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-emerald-600/20 to-teal-600/20" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-6">
              <Unlock className="w-4 h-4" />
              Freedom & Flexibility
            </span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
              No Vendor{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                Lock-In
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto mb-8">
              Your tests. Your code. Your infrastructure. Export to standard Playwright anytime and run anywhere.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={createPageUrl('StartTrial')}>
                <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-lg">
                  Try Risk-Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to={createPageUrl('BookDemo')}>
                <Button size="lg" variant="outline" className="h-14 px-8 border-green-500/30 text-white hover:bg-green-500/10 text-lg">
                  See How It Works
                </Button>
              </Link>
            </div>
          </MotionDiv>

          {/* Export Demo */}
          <MotionDiv
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Export Your Tests</p>
                  <p className="text-sm text-slate-500">Standard Playwright format</p>
                </div>
              </div>
              <Button size="sm" className="bg-green-600 hover:bg-green-500">
                Export Now
              </Button>
            </div>
            <div className="p-6 bg-slate-950/50">
              <pre className="text-sm text-slate-300 overflow-x-auto">
{`// Exported Playwright test - runs anywhere
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('successful login flow', async ({ page }) => {
    await page.goto('https://your-app.com/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'securepassword');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Welcome');
  });
});

// Run with: npx playwright test
// Works with any CI/CD, no dependencies on YourAITester`}
              </pre>
            </div>
          </MotionDiv>
        </div>
      </section>

      {/* Freedoms */}
      <section className="py-24 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              True Ownership, Zero Lock-In
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Unlike other platforms, we believe you should own your test automation
            </p>
          </MotionDiv>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {freedoms.map((freedom, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-green-500/30 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <freedom.icon className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{freedom.title}</h3>
                <p className="text-slate-400">{freedom.description}</p>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              YourAITester vs. Traditional Platforms
            </h2>
            <p className="text-xl text-slate-400">
              See how we compare on vendor lock-in
            </p>
          </MotionDiv>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-slate-800 bg-slate-800/50">
              <div className="text-slate-400 font-medium">Feature</div>
              <div className="text-green-400 font-bold">YourAITester</div>
              <div className="text-slate-500 font-medium">Other Platforms</div>
            </div>
            {comparisons.map((comp, index) => (
              <div
                key={index}
                className="grid grid-cols-3 gap-4 p-4 border-b border-slate-800 last:border-b-0 hover:bg-slate-800/30 transition-colors"
              >
                <div className="text-white font-medium">{comp.feature}</div>
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  {comp.timeless}
                </div>
                <div className="text-slate-500">{comp.others}</div>
              </div>
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
              Why This Matters
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              The benefits of avoiding vendor lock-in go beyond just technical freedom
            </p>
          </MotionDiv>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800"
              >
                <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{benefit.title}</h3>
                <p className="text-slate-400 text-lg">{benefit.description}</p>
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
            className="p-12 rounded-3xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-slate-800 text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Test with confidence, leave with freedom
            </h2>
            <p className="text-xl text-slate-400 mb-8">
              Try YourAITester risk-free. Export your tests anytime, no questions asked.
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