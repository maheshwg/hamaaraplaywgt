import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Newspaper, 
  Clock, 
  User, 
  ChevronRight, 
  Search,
  Tag,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Posts' },
    { id: 'tutorials', label: 'Tutorials' },
    { id: 'best-practices', label: 'Best Practices' },
    { id: 'product', label: 'Product Updates' },
    { id: 'industry', label: 'Industry Insights' },
  ];

  const posts = [
    {
      id: 1,
      title: 'The Complete Guide to AI-Powered Test Automation in 2024',
      excerpt: 'Learn how artificial intelligence is revolutionizing test automation and how your team can leverage it to ship faster with confidence.',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
      category: 'industry',
      author: 'Sarah Chen',
      authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
      date: 'Dec 15, 2024',
      readTime: '8 min read',
      featured: true
    },
    {
      id: 2,
      title: 'Why Natural Language Testing is the Future of QA',
      excerpt: 'Discover how natural language tests are democratizing quality assurance and enabling non-technical team members to contribute.',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
      category: 'best-practices',
      author: 'Marcus Johnson',
      authorImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      date: 'Dec 12, 2024',
      readTime: '6 min read',
      featured: false
    },
    {
      id: 3,
      title: 'Getting Started with YourAITester: A Step-by-Step Tutorial',
      excerpt: 'A comprehensive tutorial walking you through setting up your first test suite with YourAITester in under 30 minutes.',
      image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80',
      category: 'tutorials',
      author: 'Emily Rodriguez',
      authorImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
      date: 'Dec 10, 2024',
      readTime: '12 min read',
      featured: false
    },
    {
      id: 4,
      title: 'New Feature: Export to Playwright with TypeScript Support',
      excerpt: 'We\'re excited to announce full TypeScript support for Playwright exports, making your exported tests even more type-safe.',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
      category: 'product',
      author: 'David Park',
      authorImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80',
      date: 'Dec 8, 2024',
      readTime: '4 min read',
      featured: false
    },
    {
      id: 5,
      title: '10 Test Automation Metrics Every Engineering Leader Should Track',
      excerpt: 'From test coverage to defect escape rate, learn which metrics actually matter for measuring your test automation ROI.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
      category: 'best-practices',
      author: 'Lisa Thompson',
      authorImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&q=80',
      date: 'Dec 5, 2024',
      readTime: '10 min read',
      featured: false
    },
    {
      id: 6,
      title: 'CI/CD Integration Best Practices for Test Automation',
      excerpt: 'How to seamlessly integrate your automated tests into your continuous integration pipeline for maximum efficiency.',
      image: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&q=80',
      category: 'tutorials',
      author: 'James Wilson',
      authorImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
      date: 'Dec 1, 2024',
      readTime: '7 min read',
      featured: false
    },
  ];

  const filteredPosts = activeCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === activeCategory);

  const featuredPost = posts.find(post => post.featured);
  const regularPosts = filteredPosts.filter(post => !post.featured || activeCategory !== 'all');

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
            <Newspaper className="w-4 h-4" />
            Blog
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Insights & Updates
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Expert articles on test automation, AI, and engineering best practices
          </p>
        </motion.div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-12">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === category.id
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search articles..." 
              className="pl-10 w-full md:w-64 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Featured Post */}
        {activeCategory === 'all' && featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 rounded-3xl bg-slate-900/50 border border-slate-800">
              <div className="relative aspect-video lg:aspect-auto rounded-2xl overflow-hidden">
                <img
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-violet-500/90 text-white text-xs font-medium">
                    Featured
                  </span>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs capitalize">
                    {featuredPost.category.replace('-', ' ')}
                  </span>
                  <span className="text-slate-500 text-sm">{featuredPost.date}</span>
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                  {featuredPost.title}
                </h2>
                <p className="text-slate-400 mb-6">{featuredPost.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={featuredPost.authorImage}
                      alt={featuredPost.author}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-white font-medium text-sm">{featuredPost.author}</p>
                      <p className="text-slate-500 text-xs">{featuredPost.readTime}</p>
                    </div>
                  </div>
                  <Button className="bg-violet-600 hover:bg-violet-500 text-white group">
                    Read Article
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regularPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group rounded-2xl bg-slate-900/50 border border-slate-800 overflow-hidden hover:border-slate-700 transition-all duration-300"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60" />
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-slate-800/90 text-slate-300 text-xs capitalize">
                    {post.category.replace('-', ' ')}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                  <span>{post.date}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-violet-400 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={post.authorImage}
                    alt={post.author}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="text-sm text-slate-300">{post.author}</span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Load More Articles
          </Button>
        </div>
      </div>
    </div>
  );
}