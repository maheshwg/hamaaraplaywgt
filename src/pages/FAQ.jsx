import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronDown, 
  Search, 
  HelpCircle, 
  Zap, 
  DollarSign, 
  Shield, 
  Code,
  MessageCircle,
  Book,
  Settings
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MotionDiv = motion.div;

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Questions', icon: HelpCircle },
    { id: 'getting-started', label: 'Getting Started', icon: Zap },
    { id: 'pricing', label: 'Pricing & Plans', icon: DollarSign },
    { id: 'technical', label: 'Technical', icon: Code },
    { id: 'security', label: 'Security & Privacy', icon: Shield },
    { id: 'support', label: 'Support', icon: MessageCircle },
  ];

  const faqs = [
    {
      category: 'getting-started',
      question: 'How quickly can I get started with YourAITester?',
      answer: 'You can start creating tests in minutes. Simply sign up for a free trial, connect your application, and begin writing tests in natural language. Our AI will generate the test scripts automatically. Most teams have their first tests running within the same day.'
    },
    {
      category: 'getting-started',
      question: 'Do I need coding experience to use YourAITester?',
      answer: 'No coding experience required! You can write tests in plain English, like "Test that users can log in with valid credentials." However, if you\'re technical, you can also review and customize the generated Playwright code directly.'
    },
    {
      category: 'getting-started',
      question: 'What types of applications can I test?',
      answer: 'YourAITester works with any web application - whether it\'s a React app, Angular, Vue.js, or traditional server-rendered apps. We support testing of SaaS applications, e-commerce sites, internal tools, and more. Mobile web testing is also supported.'
    },
    {
      category: 'getting-started',
      question: 'How does the 5-day delivery work?',
      answer: 'When you sign up for our Professional or Enterprise plan, our team of automation experts will work with you to understand your application and critical user flows. Within 5 business days, we deliver fully functioning, production-ready test automation covering your most important scenarios.'
    },
    {
      category: 'pricing',
      question: 'What\'s included in the free trial?',
      answer: 'The 14-day free trial includes full access to all features: 50 test cases, 5,000 test executions, natural language test creation, AI-generated scripts, screenshot & video recording, analytics dashboard, and CI/CD integrations. No credit card required.'
    },
    {
      category: 'pricing',
      question: 'Can I change plans or cancel anytime?',
      answer: 'Yes, absolutely. You can upgrade, downgrade, or cancel your subscription at any time. There are no long-term contracts or cancellation fees. If you cancel, you\'ll retain access until the end of your billing period.'
    },
    {
      category: 'pricing',
      question: 'What happens if I exceed my test execution limit?',
      answer: 'If you approach your limit, we\'ll notify you in advance. You can either upgrade to a higher plan or purchase additional test executions as needed. Your tests will never stop running unexpectedly - we\'ll work with you to find the best solution.'
    },
    {
      category: 'pricing',
      question: 'Do you offer discounts for annual billing?',
      answer: 'Yes! Annual plans receive a 20% discount compared to monthly billing. We also offer special pricing for non-profits, educational institutions, and early-stage startups. Contact our sales team to discuss custom pricing.'
    },
    // {
    //   category: 'technical',
    //   question: 'How does AI test generation work?',
    //   answer: 'Our AI analyzes your application\'s structure, UI elements, and user flows. When you describe a test in natural language, the AI understands the intent, identifies the relevant elements, and generates robust Playwright test scripts. The AI learns from successful test patterns and continuously improves.'
    // },
    {
      category: 'technical',
      question: 'What is Playwright and why do you use it?',
      answer: 'Playwright is Microsoft\'s open-source browser automation framework. We chose it because it\'s fast, reliable, and widely adopted. Most importantly, there\'s no vendor lock-in - you can export your tests as standard Playwright code and run them anywhere, even without our platform.'
    },
    {
      category: 'technical',
      question: 'Can I run tests on different browsers?',
      answer: 'Yes! Your tests automatically run on Chromium, Firefox, and WebKit (Safari). You can configure which browsers to test on, and our infrastructure handles all the browser setup and management for you.'
    },
    {
      category: 'technical',
      question: 'How do self-healing tests work?',
      answer: 'When your UI changes, our AI automatically detects the changes and updates test selectors. Instead of tests breaking due to minor UI updates, they adapt intelligently. You\'ll receive notifications about changes, but tests continue running without manual intervention.'
    },
    {
      category: 'technical',
      question: 'Can I integrate with my CI/CD pipeline?',
      answer: 'Absolutely. We provide integrations for GitHub Actions, GitLab CI, Jenkins, CircleCI, Azure DevOps, and more. You can trigger tests on every commit, pull request, or deployment. We also provide REST APIs for custom integrations.'
    },
    {
      category: 'technical',
      question: 'How fast do tests execute?',
      answer: 'Tests run in parallel across multiple machines for maximum speed. Average execution time is 2-3 seconds per test case. A suite of 100 tests typically completes in under 2 minutes. Enterprise plans offer dedicated infrastructure for even faster execution.'
    },
    {
      category: 'technical',
      question: 'Can I test behind authentication or VPN?',
      answer: 'Yes. We support various authentication methods including OAuth, SAML SSO, and basic auth. For applications behind VPNs or on private networks, we offer on-premise agents that securely connect to your infrastructure while reporting results to our cloud dashboard.'
    },
    {
      category: 'security',
      question: 'How secure is my data?',
      answer: 'We take security seriously. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We\'re SOC 2 Type II certified, GDPR compliant, and undergo regular security audits. Test scripts and execution data are isolated per customer in separate environments.'
    },
    {
      category: 'security',
      question: 'Do you store sensitive credentials?',
      answer: 'Credentials are encrypted using industry-standard encryption and stored in secure vaults. We support integration with external secret management tools like HashiCorp Vault, AWS Secrets Manager, and Azure Key Vault. You maintain full control over your secrets.'
    },
    {
      category: 'security',
      question: 'Can I get a security review or pen test results?',
      answer: 'Yes. Enterprise customers receive access to our latest security audit reports, penetration test results, and SOC 2 documentation. We also support security questionnaires and can participate in your vendor security review process.'
    },
    {
      category: 'security',
      question: 'Where is data stored?',
      answer: 'We use AWS infrastructure with data centers in US, EU, and Asia-Pacific regions. You can choose your preferred region during setup to comply with data residency requirements. Enterprise customers can also opt for dedicated tenancy or on-premise deployment.'
    },
    {
      category: 'support',
      question: 'What support options are available?',
      answer: 'All plans include email support with response within 24 hours. Professional plans add priority support with 4-hour response time. Enterprise plans include dedicated Slack channels, phone support, and a customer success manager for strategic guidance.'
    },
    {
      category: 'support',
      question: 'Do you offer training or onboarding?',
      answer: 'Yes! All Professional and Enterprise customers receive personalized onboarding sessions. We also provide extensive documentation, video tutorials, and regular webinars. Enterprise customers can request on-site training for their teams.'
    },
    {
      category: 'support',
      question: 'How do I report a bug or request a feature?',
      answer: 'You can submit bug reports and feature requests directly through the dashboard, via email, or through your dedicated support channel. We track all requests in our public roadmap and prioritize based on customer feedback and impact.'
    },
    {
      category: 'support',
      question: 'What if I need help migrating from another tool?',
      answer: 'We offer free migration assistance for Professional and Enterprise customers. Our team will help you import existing tests, set up integrations, and ensure a smooth transition. We support migrations from Selenium, Cypress, TestCafe, and other popular frameworks.'
    },
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
            <HelpCircle className="w-4 h-4" />
            Frequently Asked Questions
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            How can we{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
              help you?
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            Find answers to common questions about YourAITester, or reach out to our support team.
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 text-lg"
            />
          </div>
        </MotionDiv>

        {/* Categories */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                activeCategory === category.id
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.label}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="max-w-4xl mx-auto">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No results found for "{searchQuery}"</p>
              <Button
                onClick={() => setSearchQuery('')}
                variant="outline"
                className="mt-4 border-slate-700 text-slate-300"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <MotionDiv
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl bg-slate-900/50 border border-slate-800 overflow-hidden hover:border-violet-500/30 transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="font-semibold text-white pr-4">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                        openIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-5"
                    >
                      <p className="text-slate-400 leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  )}
                </MotionDiv>
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-cyan-500/10 border border-slate-800 text-center"
        >
          <h3 className="text-2xl font-bold text-white mb-3">Still have questions?</h3>
          <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={createPageUrl('BookDemo')}>
              <Button className="bg-violet-600 hover:bg-violet-500 text-white">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </Link>
            <Link to={createPageUrl('Documentation')}>
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <Book className="w-4 h-4 mr-2" />
                View Documentation
              </Button>
            </Link>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}