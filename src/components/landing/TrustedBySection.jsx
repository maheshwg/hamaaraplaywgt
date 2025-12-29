import React from 'react';
import { motion } from 'framer-motion';

const MotionP = motion.p;
const MotionDiv = motion.div;

export default function TrustedBySection() {
  const companies = [
    { name: 'Notion', logo: 'N' },
    { name: 'Airbnb', logo: 'A' },
    { name: 'Salesforce', logo: 'S' },
    { name: 'Shopify', logo: 'Sh' },
    { name: 'Stripe', logo: 'St' },
    { name: 'Slack', logo: 'Sl' },
  ];

  return (
    <section className="py-16 border-y border-slate-800/50 bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionP
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-slate-500 uppercase tracking-wider mb-8"
        >
          Trusted by innovative teams worldwide
        </MotionP>
        
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {companies.map((company, index) => (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="flex items-center gap-3 text-slate-500 hover:text-slate-300 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center font-bold text-xl group-hover:from-violet-500/20 group-hover:to-blue-500/20 group-hover:border group-hover:border-violet-500/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-violet-500/20">
                  {company.logo}
                </div>
                <span className="font-semibold text-lg">{company.name}</span>
              </div>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
}