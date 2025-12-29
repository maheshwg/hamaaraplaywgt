import React from 'react';
import { motion } from 'framer-motion';
import { Plug, GitBranch, Cloud, Box, Settings, Layers } from 'lucide-react';

const MotionDiv = motion.div;

export default function IntegrationsSection() {
  const integrations = [
    { name: 'GitHub', icon: GitBranch, category: 'Version Control' },
    { name: 'GitLab', icon: GitBranch, category: 'Version Control' },
    { name: 'Bitbucket', icon: GitBranch, category: 'Version Control' },
    { name: 'Jenkins', icon: Settings, category: 'CI/CD' },
    { name: 'CircleCI', icon: Cloud, category: 'CI/CD' },
    { name: 'GitHub Actions', icon: Box, category: 'CI/CD' },
    { name: 'Azure DevOps', icon: Cloud, category: 'CI/CD' },
    { name: 'Jira', icon: Layers, category: 'Project Management' },
    { name: 'Slack', icon: Box, category: 'Communication' },
    { name: 'Teams', icon: Box, category: 'Communication' },
    { name: 'Playwright', icon: Box, category: 'Export' },
    { name: 'Docker', icon: Box, category: 'Infrastructure' },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-slate-900/30" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-6">
            <Plug className="w-4 h-4" />
            Integrations
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Works With Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Existing Tools
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Seamlessly integrate with your CI/CD pipeline and development workflow
          </p>
        </MotionDiv>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {integrations.map((integration, index) => (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-purple-500/30 hover:bg-slate-900 transition-all duration-300 text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-colors">
                <integration.icon className="w-6 h-6 text-slate-400 group-hover:text-purple-400 transition-colors" />
              </div>
              <p className="font-medium text-white text-sm">{integration.name}</p>
              <p className="text-xs text-slate-500 mt-1">{integration.category}</p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
}