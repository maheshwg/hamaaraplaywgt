import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  Sparkles, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PRICING_PLANS } from '@/constants/pricing';

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const plans = PRICING_PLANS;

  const faqs = [
    {
      q: 'What counts as a test execution?',
      a: 'Each time a test case runs, that\'s one execution. Running a suite of 50 tests counts as 50 executions.'
    },
    {
      q: 'Can I change plans anytime?',
      a: 'Yes! You can upgrade or downgrade at any time. Changes take effect immediately, and billing is prorated.'
    },
    {
      q: 'What happens if I exceed my limits?',
      a: 'We\'ll notify you when you\'re approaching your limit. You can upgrade or purchase additional executions as needed.'
    },
    {
      q: 'Is there a free trial?',
      a: 'Yes, all plans include a 14-day free trial with full access. No credit card required to start.'
    },
    {
      q: 'What\'s included in the 5-day delivery?',
      a: 'We analyze your app, create comprehensive test suites, and deliver fully functioning automation within 5 business days.'
    },
    {
      q: 'Can I really export to Playwright anytime?',
      a: 'Absolutely. Export your entire test suite to standard Playwright code with one click. No restrictions, no extra fees.'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            No hidden fees. No surprises. Export to Playwright anytime with zero lock-in.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'annual'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-emerald-400">Save 20%</span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24">
          <TooltipProvider>
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-8 rounded-3xl border ${
                  plan.popular
                    ? 'bg-gradient-to-b from-violet-500/10 to-blue-500/10 border-violet-500/30'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-medium shadow-lg shadow-violet-500/30">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className={`w-14 h-14 mx-auto rounded-2xl bg-${plan.color}-500/20 flex items-center justify-center mb-4`}>
                    <plan.icon className={`w-7 h-7 text-${plan.color}-400`} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                </div>

                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">
                      ${plan.price[billingPeriod].toLocaleString()}
                    </span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                  {billingPeriod === 'annual' && (
                    <p className="text-sm text-emerald-400 mt-2">
                      Save ${((plan.price.monthly - plan.price.annual) * 12).toLocaleString()}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full bg-${plan.color}-500/20 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Check className={`w-3 h-3 text-${plan.color}-400`} />
                      </div>
                      <span className="text-slate-300 text-sm flex items-center gap-2">
                        {feature.text}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
                            {feature.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </li>
                  ))}
                </ul>

                <Link to={createPageUrl(plan.cta === 'Contact Sales' ? 'BookDemo' : 'StartTrial')}>
                  <Button
                    className={`w-full h-12 text-base ${
                      plan.popular
                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg shadow-violet-500/25'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </TooltipProvider>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                <p className="text-slate-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 text-center"
        >
          <p className="text-slate-400 mb-4">
            Need a custom plan? We can tailor a solution for your specific needs.
          </p>
          <Link to={createPageUrl('BookDemo')}>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Contact Sales
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}