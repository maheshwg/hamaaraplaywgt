import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Zap, Twitter, Linkedin, Github, Youtube } from 'lucide-react';

export default function FooterSection() {
  const footerLinks = {
    Product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', page: 'Pricing' },
      { label: 'Integrations', href: '#integrations' },
      { label: 'Demo', page: 'BookDemo' },
    ],
    Resources: [
      { label: 'Documentation', page: 'Documentation' },
      { label: 'Blog', page: 'Blog' },
      { label: 'Case Studies', page: 'CaseStudies' },
      { label: 'FAQ', href: '#faq' },
    ],
    Company: [
      { label: 'About Us', page: 'About' },
      { label: 'Careers', page: 'Careers' },
      { label: 'Contact', page: 'BookDemo' },
      { label: 'Press', page: 'Press' },
    ],
    Legal: [
      { label: 'Privacy Policy', page: 'Privacy' },
      { label: 'Terms of Service', page: 'Terms' },
      { label: 'Security', page: 'Security' },
      { label: 'GDPR', page: 'GDPR' },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

  return (
    <footer className="py-16 border-t border-slate-800 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                YourAITester
              </span>
            </Link>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">
              Full-service AI test automation delivered in 5 days. No vendor lock-in. Export to Playwright anytime.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link, index) => (
                  <li key={index}>
                    {link.page ? (
                      <Link
                        to={createPageUrl(link.page)}
                        className="text-slate-400 hover:text-white text-sm transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-slate-400 hover:text-white text-sm transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} YourAITester. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-500">
              Made with ❤️ for QA teams worldwide
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}