import { Zap, Star, Building2 } from 'lucide-react';

// Shared pricing data - changes here will reflect in both home page and pricing page
export const PRICING_PLANS = [
  {
    name: 'Starter',
    description: 'Perfect for small teams getting started with test automation',
    price: {
      monthly: 699,
      annual: 499
    },
    period: '/month',
    icon: Zap,
    color: 'blue',
    features: [
      { 
        text: '100 Test Cases', 
        tooltip: 'Maximum number of test cases you can create' 
      },
      { 
        text: '5,000 Test Executions/month', 
        tooltip: 'Each time a test runs counts as one execution' 
      },
      { 
        text: '2 Parallel Test Runs', 
        tooltip: 'Run 2 tests simultaneously to speed up your pipeline' 
      },
      { 
        text: 'Natural Language Tests', 
        tooltip: 'Write tests in plain English - no coding required' 
      },
      { 
        text: 'Screenshot Capture', 
        tooltip: 'Automatic screenshots on failures and key steps' 
      },
      { 
        text: 'Video Recording', 
        tooltip: 'Full video recording of every test run' 
      },
      { 
        text: 'Basic Analytics Dashboard', 
        tooltip: 'View pass/fail rates and basic metrics' 
      },
      { 
        text: 'Email Support', 
        tooltip: '24-48 hour response time' 
      },
    ],
    cta: 'Start Free Trial',
    popular: false
  },
  {
    name: 'Professional',
    description: 'For growing teams that need more power and flexibility',
    price: {
      monthly: 1999,
      annual: 1699
    },
    period: '/month',
    icon: Star,
    color: 'violet',
    features: [
      { 
        text: '500 Test Cases', 
        tooltip: 'Maximum number of test cases you can create' 
      },
      { 
        text: '20,000 Test Executions/month', 
        tooltip: 'Each time a test runs counts as one execution' 
      },
      { 
        text: '5 Parallel Test Runs', 
        tooltip: 'Run 5 tests simultaneously for faster results' 
      },
      { 
        text: 'Natural Language Tests', 
        tooltip: 'Write tests in plain English - no coding required' 
      },
      { 
        text: 'Screenshot Capture', 
        tooltip: 'Automatic screenshots on failures and key steps' 
      },
      { 
        text: 'Video Recording', 
        tooltip: 'Full video recording of every test run' 
      },
      { 
        text: 'Advanced Analytics & Reports', 
        tooltip: 'Detailed metrics, trends, and custom reports' 
      },
      { 
        text: 'Priority Support', 
        tooltip: '4-8 hour response time during business hours' 
      },
      { 
        text: 'Export to Playwright', 
        tooltip: 'Export all tests to standard Playwright code anytime' 
      },
      { 
        text: 'All CI/CD Integrations', 
        tooltip: 'GitHub Actions, Jenkins, GitLab CI, CircleCI, and more' 
      },
      { 
        text: 'Team Collaboration Tools', 
        tooltip: 'Shared test libraries and team workspaces' 
      },
      { 
        text: 'Custom Test Schedules', 
        tooltip: 'Run tests automatically on your schedule' 
      },
    ],
    cta: 'Start Free Trial',
    popular: true
  },
  {
    name: 'Enterprise',
    description: 'For organizations with advanced testing requirements',
    price: {
      monthly: 7500,
      annual: 6000
    },
    period: '/month',
    icon: Building2,
    color: 'cyan',
    features: [
      { 
        text: 'Unlimited Test Cases', 
        tooltip: 'Maximum number of test cases you can create' 
      },
      { 
        text: '50,000+ Test Executions/month', 
        tooltip: 'Each time a test runs counts as one execution' 
      },
      { 
        text: '10 Parallel Test Runs', 
        tooltip: 'Run 10 tests simultaneously for maximum speed' 
      },
      { 
        text: 'Natural Language Tests', 
        tooltip: 'Write tests in plain English - no coding required' 
      },
      { 
        text: 'Screenshot Capture', 
        tooltip: 'Automatic screenshots on failures and key steps' 
      },
      { 
        text: 'Video Recording', 
        tooltip: 'Full video recording of every test run' 
      },
      { 
        text: 'Enterprise Analytics Suite', 
        tooltip: 'Custom dashboards, API access, and data exports' 
      },
      { 
        text: 'Dedicated Support Manager', 
        tooltip: 'Personal success manager for your team' 
      },
      { 
        text: 'Export to Playwright', 
        tooltip: 'Export all tests to standard Playwright code anytime' 
      },
      { 
        text: 'All CI/CD Integrations', 
        tooltip: 'GitHub Actions, Jenkins, GitLab CI, CircleCI, and more' 
      },
      { 
        text: 'Advanced Team Permissions', 
        tooltip: 'Role-based access control and audit logs' 
      },
      { 
        text: 'Custom Test Schedules', 
        tooltip: 'Run tests automatically on your schedule' 
      },
      { 
        text: 'SSO & SAML Authentication', 
        tooltip: 'Enterprise-grade security with single sign-on' 
      },
      { 
        text: 'Custom SLA', 
        tooltip: 'Tailored service level agreement for your needs' 
      },
      { 
        text: 'On-premise Option', 
        tooltip: 'Deploy on your own infrastructure if required' 
      },
    ],
    cta: 'Contact Sales',
    popular: false
  },
];

// Helper function to get pricing for home page (uses monthly pricing)
export function getPricingForHomePage() {
  return PRICING_PLANS.map(plan => ({
    ...plan,
    price: plan.price.monthly, // Use monthly price for home page
    features: plan.features.map(f => typeof f === 'string' ? f : f.text) // Convert to simple strings
  }));
}

