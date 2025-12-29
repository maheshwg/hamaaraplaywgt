import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Book, 
  Code, 
  Zap, 
  Settings, 
  Play, 
  Terminal, 
  FileText, 
  ChevronRight,
  Search,
  ExternalLink,
  Copy,
  Check,
  Layers,
  GitBranch,
  Cloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [copiedCode, setCopiedCode] = useState(null);

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: Zap },
    { id: 'writing-tests', label: 'Writing Tests', icon: FileText },
    { id: 'natural-language', label: 'Natural Language Syntax', icon: Code },
    { id: 'running-tests', label: 'Running Tests', icon: Play },
    { id: 'export-playwright', label: 'Export to Playwright', icon: Terminal },
    { id: 'ci-cd', label: 'CI/CD Integration', icon: GitBranch },
    { id: 'api-reference', label: 'API Reference', icon: Layers },
    { id: 'configuration', label: 'Configuration', icon: Settings },
  ];

  const content = {
    'getting-started': {
      title: 'Getting Started',
      description: 'Get up and running with YourAITester in minutes',
      content: [
        {
          title: 'Welcome to YourAITester',
          text: 'YourAITester is an AI-powered test automation platform that lets you write tests in natural language and export them to Playwright. This guide will help you get started quickly.'
        },
        {
          title: 'Quick Start Steps',
          steps: [
            'Sign up for a free trial account',
            'Connect your application URL',
            'Let our AI analyze your app and suggest test cases',
            'Review and customize the generated tests',
            'Run your first test suite'
          ]
        },
        {
          title: 'System Requirements',
          text: 'YourAITester is a cloud-based platform that works in any modern browser. No local installation required. For CI/CD integration, you\'ll need access to your pipeline configuration.',
          code: {
            id: 'install',
            title: 'Optional: CLI Installation',
            language: 'bash',
            content: `# Install the YourAITester CLI (optional)
npm install -g @youraitester/cli

# Authenticate with your API key
ta auth login --key YOUR_API_KEY

# Run tests from command line
ta run --suite "checkout-flow"`
          }
        }
      ]
    },
    'writing-tests': {
      title: 'Writing Tests',
      description: 'Learn how to create effective test cases',
      content: [
        {
          title: 'Test Structure',
          text: 'Tests in YourAITester follow a simple Given-When-Then structure that anyone can understand.',
          code: {
            id: 'test-structure',
            title: 'Basic Test Structure',
            language: 'gherkin',
            content: `Test: User can add item to cart

Given user is on the homepage
When user searches for "laptop"
And user clicks on the first product
And user clicks "Add to Cart" button
Then cart badge should show "1"
And success message should be visible`
          }
        },
        {
          title: 'Using Variables',
          text: 'You can use variables to make your tests more dynamic and reusable.',
          code: {
            id: 'variables',
            title: 'Variables Example',
            language: 'gherkin',
            content: `Test: User login with valid credentials

Variables:
  email: "test@example.com"
  password: "SecurePass123"

Given user is on the login page
When user enters {email} in email field
And user enters {password} in password field
And user clicks "Sign In"
Then user should see dashboard
And welcome message should contain {email}`
          }
        }
      ]
    },
    'natural-language': {
      title: 'Natural Language Syntax',
      description: 'Master the natural language test syntax',
      content: [
        {
          title: 'Available Actions',
          text: 'YourAITester supports a wide range of actions you can express in natural language:',
          list: [
            'click - Click on elements (buttons, links, etc.)',
            'type/enter - Type text into input fields',
            'select - Choose options from dropdowns',
            'check/uncheck - Toggle checkboxes',
            'hover - Hover over elements',
            'scroll - Scroll to elements or positions',
            'wait - Wait for elements or conditions',
            'navigate - Go to URLs'
          ]
        },
        {
          title: 'Assertions',
          text: 'Verify your application state with assertions:',
          code: {
            id: 'assertions',
            title: 'Assertion Examples',
            language: 'gherkin',
            content: `# Text assertions
Then page should contain "Welcome"
Then heading should be "Dashboard"
Then error message should not be visible

# Element state assertions
Then submit button should be disabled
Then checkbox should be checked
Then dropdown should have value "Option 1"

# Count assertions
Then table should have 5 rows
Then cart should contain 3 items

# URL assertions
Then URL should contain "/dashboard"
Then URL should be "https://app.example.com/home"`
          }
        }
      ]
    },
    'running-tests': {
      title: 'Running Tests',
      description: 'Execute your tests and view results',
      content: [
        {
          title: 'Running from Dashboard',
          text: 'The easiest way to run tests is from the YourAITester dashboard. Simply select your test suite and click "Run Tests". You can run individual tests or entire suites.'
        },
        {
          title: 'Running from CLI',
          code: {
            id: 'cli-run',
            title: 'CLI Commands',
            language: 'bash',
            content: `# Run all tests in a suite
ta run --suite "regression"

# Run a specific test
ta run --test "user-login"

# Run with specific browser
ta run --suite "smoke" --browser firefox

# Run with parallel execution
ta run --suite "full" --parallel 5

# Run and generate report
ta run --suite "release" --report html`
          }
        },
        {
          title: 'Viewing Results',
          text: 'After tests complete, you\'ll see detailed results including pass/fail status, execution time, screenshots, and video recordings for each step.'
        }
      ]
    },
    'export-playwright': {
      title: 'Export to Playwright',
      description: 'Export your tests to standard Playwright code',
      content: [
        {
          title: 'Zero Vendor Lock-In',
          text: 'One of YourAITester\'s key features is the ability to export your tests to Playwright at any time. Your tests, your code, your choice.'
        },
        {
          title: 'Export Options',
          code: {
            id: 'export',
            title: 'Exporting Tests',
            language: 'bash',
            content: `# Export entire suite to Playwright
ta export --suite "checkout-flow" --output ./tests

# Export with TypeScript
ta export --suite "checkout-flow" --output ./tests --typescript

# Export with custom config
ta export --suite "all" --output ./tests --config playwright.config.ts`
          }
        },
        {
          title: 'Exported Code Example',
          text: 'Here\'s what your natural language test looks like when exported to Playwright:',
          code: {
            id: 'playwright',
            title: 'Generated Playwright Code',
            language: 'typescript',
            content: `import { test, expect } from '@playwright/test';

test('User can add item to cart', async ({ page }) => {
  // Given user is on the homepage
  await page.goto('https://your-app.com');
  
  // When user searches for "laptop"
  await page.fill('[data-testid="search-input"]', 'laptop');
  await page.press('[data-testid="search-input"]', 'Enter');
  
  // And user clicks on the first product
  await page.click('.product-card:first-child');
  
  // And user clicks "Add to Cart" button
  await page.click('button:has-text("Add to Cart")');
  
  // Then cart badge should show "1"
  await expect(page.locator('.cart-badge')).toHaveText('1');
  
  // And success message should be visible
  await expect(page.locator('.success-toast')).toBeVisible();
});`
          }
        }
      ]
    },
    'ci-cd': {
      title: 'CI/CD Integration',
      description: 'Integrate YourAITester with your pipeline',
      content: [
        {
          title: 'GitHub Actions',
          code: {
            id: 'github-actions',
            title: '.github/workflows/tests.yml',
            language: 'yaml',
            content: `name: Run Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run YourAITester Tests
        uses: youraitester/action@v1
        with:
          api-key: \${{ secrets.TA_API_KEY }}
          suite: regression
          parallel: 5
          
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: ./test-results`
          }
        },
        {
          title: 'Jenkins',
          code: {
            id: 'jenkins',
            title: 'Jenkinsfile',
            language: 'groovy',
            content: `pipeline {
    agent any
    
    environment {
        TA_API_KEY = credentials('youraitester-key')
    }
    
    stages {
        stage('Test') {
            steps {
                sh 'npm install -g @youraitester/cli'
                sh 'ta auth login --key $TA_API_KEY'
                sh 'ta run --suite regression --parallel 5'
            }
        }
    }
    
    post {
        always {
            publishHTML([
                reportDir: 'test-results',
                reportFiles: 'index.html',
                reportName: 'Test Results'
            ])
        }
    }
}`
          }
        }
      ]
    },
    'api-reference': {
      title: 'API Reference',
      description: 'REST API for programmatic access',
      content: [
        {
          title: 'Authentication',
          text: 'All API requests require an API key in the Authorization header.',
          code: {
            id: 'api-auth',
            title: 'Authentication Header',
            language: 'bash',
            content: `curl -X GET "https://api.YourAITester.com/v1/suites" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`
          }
        },
        {
          title: 'Endpoints',
          list: [
            'GET /v1/suites - List all test suites',
            'POST /v1/suites - Create a new suite',
            'GET /v1/suites/:id/tests - List tests in a suite',
            'POST /v1/runs - Start a new test run',
            'GET /v1/runs/:id - Get run status and results',
            'GET /v1/runs/:id/report - Download test report'
          ]
        }
      ]
    },
    'configuration': {
      title: 'Configuration',
      description: 'Configure YourAITester for your needs',
      content: [
        {
          title: 'Configuration File',
          code: {
            id: 'config',
            title: 'youraitester.config.json',
            language: 'json',
            content: `{
  "baseUrl": "https://your-app.com",
  "defaultTimeout": 30000,
  "retries": 2,
  "browsers": ["chromium", "firefox"],
  "viewport": {
    "width": 1280,
    "height": 720
  },
  "screenshots": "on-failure",
  "video": "on",
  "parallel": 5,
  "reporters": ["html", "json"],
  "env": {
    "staging": {
      "baseUrl": "https://staging.your-app.com"
    },
    "production": {
      "baseUrl": "https://your-app.com"
    }
  }
}`
          }
        }
      ]
    }
  };

  const currentContent = content[activeSection];

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Search docs..." 
                  className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeSection === section.id
                        ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <section.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <Book className="w-4 h-4" />
                  <span>Documentation</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-violet-400">{currentContent.title}</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-3">{currentContent.title}</h1>
                <p className="text-lg text-slate-400">{currentContent.description}</p>
              </div>

              {/* Content Blocks */}
              <div className="space-y-8">
                {currentContent.content.map((block, blockIndex) => (
                  <div key={blockIndex} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                    <h2 className="text-xl font-semibold text-white mb-4">{block.title}</h2>
                    
                    {block.text && (
                      <p className="text-slate-400 mb-4">{block.text}</p>
                    )}

                    {block.steps && (
                      <ol className="space-y-3 mb-4">
                        {block.steps.map((step, stepIndex) => (
                          <li key={stepIndex} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-sm font-medium">
                              {stepIndex + 1}
                            </span>
                            <span className="text-slate-300">{step}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    {block.list && (
                      <ul className="space-y-2 mb-4">
                        {block.list.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-2 text-slate-400">
                            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {block.code && (
                      <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                          <span className="text-sm text-slate-400">{block.code.title}</span>
                          <button
                            onClick={() => copyCode(block.code.content, block.code.id)}
                            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedCode === block.code.id ? (
                              <>
                                <Check className="w-4 h-4 text-green-400" />
                                <span className="text-green-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 overflow-x-auto text-sm">
                          <code className="text-slate-300">{block.code.content}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation Footer */}
              <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-800">
                <Button variant="outline" className="border-slate-700 text-slate-400 hover:text-white">
                  Previous
                </Button>
                <Button variant="outline" className="border-slate-700 text-slate-400 hover:text-white">
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}