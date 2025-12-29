import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, Plus, Minus } from 'lucide-react';

const MotionDiv = motion.div;

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: 'How do you deliver test automation in just 5 days?',
      answer: 'Our AI-powered platform analyzes your application and generates comprehensive test suites automatically. Combined with our expert team who review and optimize the tests, we can deliver production-ready automation much faster than traditional methods. '
    },
    {
      question: 'What do you mean by "no vendor lock-in"?',
      answer: 'At any time, you can export all your tests to standard Playwright code. This means you own your tests completely and can run them on your own infrastructure, modify them directly in code, or move to a different solution without losing any of your investment. Your tests, your choice.'
    },
    {
      question: 'Do I need technical skills to write tests?',
      answer: 'Not at all! Our natural language interface lets anyone on your team write and modify tests in plain English. For example: "Given user is logged in, When they click Add to Cart, Then the cart should show 1 item." No coding required. Technical team members can also access the underlying Playwright code if needed.'
    },
    // {
    //   question: 'How does the AI test generation work?',
    //   answer: 'Our AI analyzes your application\'s UI, identifies user flows, and generates comprehensive test cases including edge cases that humans often miss. The AI also maintains tests by automatically adapting to UI changes (self-healing), reducing maintenance burden by up to 80%.'
    // },
    // {
    //   question: 'What\'s included in the test execution count?',
    //   answer: 'Each time a test case runs, that counts as one execution. Running your entire suite of 50 tests once would use 50 executions. Most teams run tests on each deployment and nightly for regression. Our plans are designed to give you ample executions for continuous testing.'
    // },
    {
      question: 'Can I integrate with my existing CI/CD pipeline?',
      answer: 'Yes! We integrate with all major CI/CD tools including GitHub Actions, GitLab CI, Jenkins, CircleCI, Azure DevOps, and more. Tests can be triggered automatically on every commit, pull request, or deployment. Setup typically takes less than 10 minutes.'
    },
    {
      question: 'What browsers and platforms do you support?',
      answer: 'We support all major browsers including Chrome, Firefox, Safari, and Edge. Tests can run on desktop and mobile viewports.'
    },
    {
      question: 'What kind of support do you offer?',
      answer: 'All plans include email support. Professional plans get priority support with faster response times. Enterprise customers get a dedicated success manager who helps with test strategy, optimization, and ongoing support. We\'re committed to your success with test automation.'
    },
  ];

  return (
    <section id="faq" className="py-24 relative overflow-hidden">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm mb-6">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Frequently Asked{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">
              Questions
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Everything you need to know about YourAITester
          </p>
        </MotionDiv>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl border transition-all duration-300 ${
                openIndex === index
                  ? 'bg-slate-900/80 border-violet-500/30'
                  : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <span className={`font-semibold ${openIndex === index ? 'text-white' : 'text-slate-300'}`}>
                  {faq.question}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  openIndex === index ? 'bg-violet-500/20' : 'bg-slate-800'
                }`}>
                  {openIndex === index ? (
                    <Minus className="w-4 h-4 text-violet-400" />
                  ) : (
                    <Plus className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <MotionDiv
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <p className="text-slate-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
}