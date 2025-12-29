import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  Bug, 
  Target, 
  ArrowRight,
  Building2,
  ShoppingCart,
  Stethoscope,
  Landmark,
  Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CaseStudies() {
  const caseStudies = [
    {
      id: 1,
      company: 'E-commerce Company',
      industry: 'E-commerce',
      icon: ShoppingCart,
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
      challenge: 'Manual testing was causing 3-week release delays and critical bugs were reaching production.',
      solution: 'Implemented comprehensive AI-powered test automation covering checkout flows, inventory management, and payment processing.',
      results: [
        { metric: '94%', label: 'Test Coverage', icon: Target },
        { metric: '85%', label: 'Faster Releases', icon: Clock },
        { metric: '73%', label: 'Bug Reduction', icon: Bug },
        { metric: '3.2x', label: 'ROI in 6 months', icon: TrendingUp },
      ],
      quote: 'YourAITester transformed our release process. We went from monthly releases to weekly, with complete confidence in our quality.',
      author: 'Marcus Johnson',
      authorRole: 'CTO',
      authorImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      timeline: '5 days',
      testCount: 150
    },
    {
      id: 2,
      company: 'TechFlow Systems',
      industry: 'SaaS',
      icon: Building2,
      image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
      challenge: 'Engineering team spent 60% of their time on test maintenance instead of building new features.',
      solution: 'Deployed self-healing AI tests that automatically adapt to UI changes, eliminating maintenance burden.',
      results: [
        { metric: '81%', label: 'Less Maintenance', icon: Clock },
        { metric: '96%', label: 'Test Stability', icon: Target },
        { metric: '45%', label: 'More Features Shipped', icon: TrendingUp },
        { metric: '2.1x', label: 'Developer Productivity', icon: Bug },
      ],
      quote: 'The self-healing tests have been a game changer. Our UI changes frequently, but our tests just keep working.',
      author: 'Sarah Chen',
      authorRole: 'VP of Engineering',
      authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
      timeline: '4 days',
      testCount: 200
    },
    {
      id: 3,
      company: 'HealthTech Solutions',
      industry: 'Healthcare',
      icon: Stethoscope,
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
      challenge: 'HIPAA compliance requirements meant manual testing was too slow and error-prone for their rapid development cycle.',
      solution: 'Created compliance-focused test suites with detailed audit trails and natural language tests that non-technical compliance officers could review.',
      results: [
        { metric: '100%', label: 'Compliance Coverage', icon: Target },
        { metric: '70%', label: 'Audit Time Saved', icon: Clock },
        { metric: '0', label: 'Compliance Violations', icon: Bug },
        { metric: '4.5x', label: 'Faster Compliance Review', icon: TrendingUp },
      ],
      quote: 'As a non-technical leader, I love that I can read and understand every test case. It\'s democratized quality for us.',
      author: 'Lisa Thompson',
      authorRole: 'Director of Product',
      authorImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&q=80',
      timeline: '5 days',
      testCount: 180
    },
    {
      id: 4,
      company: 'FinServe Digital',
      industry: 'Fintech',
      icon: Landmark,
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80',
      challenge: 'Financial calculations required 100% accuracy, but manual testing couldn\'t keep up with regulatory changes.',
      solution: 'Implemented data-driven test automation with comprehensive edge case coverage for financial calculations and regulatory scenarios.',
      results: [
        { metric: '99.9%', label: 'Calculation Accuracy', icon: Target },
        { metric: '15%', label: 'Test Coverage to 94%', icon: TrendingUp },
        { metric: '89%', label: 'Bugs Caught Early', icon: Bug },
        { metric: '2 weeks', label: 'Faster Compliance Updates', icon: Clock },
      ],
      quote: 'We went from 15% test coverage to 94% in two weeks. The video recordings make debugging a breeze.',
      author: 'Emily Rodriguez',
      authorRole: 'Head of QA',
      authorImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
      timeline: '5 days',
      testCount: 250
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6">
            <TrendingUp className="w-4 h-4" />
            Case Studies
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Real Results from{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Real Companies
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            See how teams are transforming their testing with YourAITester
          </p>
        </motion.div>

        {/* Case Studies */}
        <div className="space-y-12">
          {caseStudies.map((study, index) => (
            <motion.div
              key={study.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="rounded-3xl border border-slate-800 bg-slate-900/50 overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Image */}
                <div className="relative h-64 lg:h-auto">
                  <img
                    src={study.image}
                    alt={study.company}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent" />
                  <div className="absolute top-6 left-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <study.icon className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                          {study.industry}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white">{study.company}</h2>
                  </div>
                  <div className="absolute bottom-6 left-6 flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Delivered in {study.timeline}
                    </span>
                    <span className="flex items-center gap-2 text-slate-300">
                      <Target className="w-4 h-4 text-emerald-400" />
                      {study.testCount} tests
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8 lg:p-10">
                  {/* Challenge */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Challenge</h3>
                    <p className="text-slate-300">{study.challenge}</p>
                  </div>

                  {/* Solution */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Solution</h3>
                    <p className="text-slate-300">{study.solution}</p>
                  </div>

                  {/* Results Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {study.results.map((result, resultIndex) => (
                      <div key={resultIndex} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center gap-3 mb-2">
                          <result.icon className="w-5 h-5 text-emerald-400" />
                          <span className="text-2xl font-bold text-white">{result.metric}</span>
                        </div>
                        <p className="text-sm text-slate-400">{result.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quote */}
                  <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <Quote className="w-8 h-8 text-emerald-500/30 mb-3" />
                    <p className="text-slate-300 italic mb-4">"{study.quote}"</p>
                    <div className="flex items-center gap-3">
                      <img
                        src={study.authorImage}
                        alt={study.author}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-white font-medium">{study.author}</p>
                        <p className="text-sm text-slate-500">{study.authorRole}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 p-12 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-slate-800 text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Testing?
          </h2>
          <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
            Join these companies and hundreds more who have revolutionized their test automation with YourAITester.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={createPageUrl('StartTrial')}>
              <Button className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to={createPageUrl('BookDemo')}>
              <Button variant="outline" className="h-12 px-8 border-slate-700 text-slate-300 hover:bg-slate-800">
                Book a Demo
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}