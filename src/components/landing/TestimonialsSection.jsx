import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const MotionDiv = motion.div;

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'VP of Engineering',
      company: 'TechFlow Systems',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
      content: 'YourAITester delivered our entire test suite in just 4 days. What would have taken us months to build internally was done in less than a week. The natural language tests are so intuitive that our QA team adopted them immediately.',
      rating: 5
    },
    {
      name: 'Marcus Johnson',
      role: 'CTO',
      company: 'E-commerce Company',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      content: 'The fact that we can export everything to Playwright was the deciding factor. No vendor lock-in means we\'re always in control. Plus, the AI-powered test generation caught edge cases our team never would have thought of.',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Head of QA',
      company: 'FinServe Digital',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
      content: 'We went from 15% test coverage to 94% in two weeks. The metrics dashboard gives us complete visibility into our testing health, and the video recordings make debugging a breeze. This is how test automation should work.',
      rating: 5
    },
    {
      name: 'David Park',
      role: 'Engineering Manager',
      company: 'CloudScale Inc',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80',
      content: 'The self-healing tests have been a game changer. Our UI changes frequently, but our tests just keep working. We\'ve reduced test maintenance time by over 80%. The ROI was apparent within the first month.',
      rating: 5
    },
    {
      name: 'Lisa Thompson',
      role: 'Director of Product',
      company: 'HealthTech Solutions',
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&q=80',
      content: 'As a non-technical leader, I love that I can read and understand every test case. The natural language approach means our product team can contribute to testing without learning to code. It\'s democratized quality for us.',
      rating: 5
    },
    {
      name: 'James Wilson',
      role: 'DevOps Lead',
      company: 'DataStream Analytics',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
      content: 'Integration with our CI/CD pipeline was seamless. Tests run on every PR, and the parallel execution means we get results in minutes, not hours. The detailed reports have become essential for our release decisions.',
      rating: 5
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-violet-950/5 to-slate-950" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm mb-6">
            <Star className="w-4 h-4" fill="currentColor" />
            Testimonials
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Loved by{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
              Engineering Teams
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            See what our customers have to say about their experience
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all duration-300"
            >
              {/* Quote Icon */}
              <div className="mb-4">
                <Quote className="w-8 h-8 text-violet-500/30" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" />
                ))}
              </div>

              {/* Content */}
              <p className="text-slate-300 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-slate-500">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
}