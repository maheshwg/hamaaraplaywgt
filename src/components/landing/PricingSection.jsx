import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';
import { getPricingForHomePage } from '@/constants/pricing';

const MotionDiv = motion.div;

export default function PricingSection() {
  const plans = getPricingForHomePage();

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Pricing
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Simple,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-green-400">
              Transparent Pricing
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            No hidden fees. No surprises. Export to Playwright anytime with zero lock-in.
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-3xl border ${
                plan.popular
                  ? 'bg-gradient-to-b from-violet-500/10 to-blue-500/10 border-violet-500/30'
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-medium shadow-lg shadow-violet-500/30">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <div className={`w-14 h-14 mx-auto rounded-2xl bg-${plan.color}-500/20 flex items-center justify-center mb-4`}>
                  <plan.icon className={`w-7 h-7 text-${plan.color}-400`} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-white">${plan.price.toLocaleString()}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full bg-${plan.color}-500/20 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Check className={`w-3 h-3 text-${plan.color}-400`} />
                    </div>
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
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
            </MotionDiv>
          ))}
        </div>

        {/* Bottom Note */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-slate-400">
            All plans include our{' '}
            <span className="text-white font-medium">5-day delivery guarantee</span>
            {' '}and{' '}
            <span className="text-white font-medium">zero vendor lock-in</span>.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Need a custom plan? <Link to={createPageUrl('BookDemo')} className="text-violet-400 hover:text-violet-300">Contact us</Link>
          </p>
        </MotionDiv>
      </div>
    </section>
  );
}