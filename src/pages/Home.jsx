import React from 'react';
import HeroSection from '@/components/landing/HeroSection.jsx';
import TrustedBySection from '@/components/landing/TrustedBySection.jsx';
import ProblemSection from '@/components/landing/ProblemSection.jsx';
import FeaturesSection from '@/components/landing/FeaturesSection.jsx';
import HowItWorksSection from '@/components/landing/HowItWorksSection.jsx';
import SolutionSection from '@/components/landing/SolutionSection.jsx';
import AgenticAdvantageSection from '@/components/landing/AgenticAdvantageSection.jsx';
import SpeedAdvantageSection from '@/components/landing/SpeedAdvantageSection.jsx';
import WhyTeamsChooseSection from '@/components/landing/WhyTeamsChooseSection.jsx';
import DemoVideosSection from '@/components/landing/DemoVideosSection.jsx';
import VideoShowcaseSection from '@/components/landing/VideoShowcaseSection.jsx';
import MetricsSection from '@/components/landing/MetricsSection.jsx';
import PricingSection from '@/components/landing/PricingSection.jsx';
import TestimonialsSection from '@/components/landing/TestimonialsSection.jsx';
import CaseStudiesSection from '@/components/landing/CaseStudiesSection.jsx';
import IntegrationsSection from '@/components/landing/IntegrationsSection.jsx';
import FAQSection from '@/components/landing/FAQSection.jsx';
import CTASection from '@/components/landing/CTASection.jsx';
import FooterSection from '@/components/landing/FooterSection.jsx';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <HeroSection />
      <VideoShowcaseSection />
      <TrustedBySection />
      <ProblemSection />
      <FeaturesSection />
      <AgenticAdvantageSection />
      <HowItWorksSection />
      <SpeedAdvantageSection/>
      {/* <SolutionSection /> */}
      {/* <DemoVideosSection /> */}
      <MetricsSection />
      <PricingSection />
      {/* <TestimonialsSection /> */}
      <CaseStudiesSection />
      <IntegrationsSection />
      <FAQSection />
      <CTASection />
      {/* <WhyTeamsChooseSection /> */}
      <FooterSection />
    </div>
  );
}