
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Auth } from '@/api/auth.js';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  BarChart3,
  Menu,
  X,
  FlaskConical,
  ChevronRight,
  Play,
  LogOut,
  Zap,
  BookOpen,
  DollarSign,
  Users,
  Newspaper,
  HelpCircle,
  ChevronDown,
  LogIn,
  Building2,
  Briefcase,
  AppWindow
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TenantSelector from '@/components/TenantSelector.jsx';
import ProjectSelector from '@/components/ProjectSelector.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Landing page pages that should use landing layout
const LANDING_PAGES = [
  'Home', 'Documentation', 'Blog', 'CaseStudies', 'Pricing', 
  'BookDemo', 'StartTrial', 'FAQ', 'AITestGeneration', 
  'NaturalLanguageTests', 'NoVendorLockIn'
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const isLandingPage = LANDING_PAGES.includes(currentPageName);
  
  // Landing page state
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // App page state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLandingPage) {
      const handleScroll = () => {
        setScrolled(window.scrollY > 20);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isLandingPage]);

  // Check token expiry on mount and periodically (for app pages)
  useEffect(() => {
    if (!isLandingPage) {
      Auth.checkTokenExpiry();
      const interval = setInterval(() => {
        Auth.checkTokenExpiry();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isLandingPage]);

  const handleLogout = () => {
    Auth.logout();
  };

  // Landing page navigation
  if (isLandingPage) {
    const navLinks = [
      {
        label: 'Features',
        dropdown: true,
        items: [
          { label: 'AI Test Generation', icon: Zap, page: 'AITestGeneration' },
          { label: 'Natural Language Tests', icon: FileText, page: 'NaturalLanguageTests' },
          { label: 'No Vendor Lock-in', icon: Users, page: 'NoVendorLockIn' },
          { label: 'Demo Videos', icon: Play, href: '#demos' },
        ]
      },
      {
        label: 'Resources',
        dropdown: true,
        items: [
          { label: 'Documentation', icon: BookOpen, page: 'Documentation' },
          { label: 'Blog', icon: Newspaper, page: 'Blog' },
          { label: 'Case Studies', icon: FileText, page: 'CaseStudies' },
          { label: 'FAQ', icon: HelpCircle, href: '#faq' },
        ]
      },
      { label: 'Pricing', page: 'Pricing' },
      { label: 'Documentation', page: 'Documentation' },
    ];

    return (
      <div className="min-h-screen bg-slate-950">
        {/* Navigation */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50 py-3' 
            : 'bg-transparent py-5'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link to={createPageUrl('Home')} className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">
                  YourAITester
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-1">
                {navLinks.map((link, index) => (
                  link.dropdown ? (
                    <DropdownMenu key={index}>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50">
                          {link.label}
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-900 border-slate-800 min-w-[200px]">
                        {link.items.map((item, itemIndex) => (
                          item.page ? (
                            <DropdownMenuItem key={itemIndex} asChild>
                              <Link 
                                to={createPageUrl(item.page)} 
                                className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white cursor-pointer"
                              >
                                <item.icon className="w-4 h-4 text-violet-400" />
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem key={itemIndex} asChild>
                              <a 
                                href={item.href} 
                                className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white cursor-pointer"
                              >
                                <item.icon className="w-4 h-4 text-violet-400" />
                                {item.label}
                              </a>
                            </DropdownMenuItem>
                          )
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Link
                      key={index}
                      to={createPageUrl(link.page)}
                      className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
                    >
                      {link.label}
                    </Link>
                  )
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="hidden lg:flex items-center gap-3">
                <Link to={createPageUrl('Login')}>
                  <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800/50">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link to={createPageUrl('BookDemo')}>
                  <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800/50">
                    Book a Demo
                  </Button>
                </Link>
                <Link to={createPageUrl('StartTrial')}>
                  <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-violet-500/25">
                    Start Free Trial
                  </Button>
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button 
                className="lg:hidden p-2 text-slate-300 hover:text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden absolute top-full left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
              <div className="px-4 py-6 space-y-4">
                {navLinks.map((link, index) => (
                  link.dropdown ? (
                    <div key={index} className="space-y-2">
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{link.label}</p>
                      {link.items.map((item, itemIndex) => (
                        item.page ? (
                          <Link
                            key={itemIndex}
                            to={createPageUrl(item.page)}
                            className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <item.icon className="w-4 h-4 text-violet-400" />
                            {item.label}
                          </Link>
                        ) : (
                          <a
                            key={itemIndex}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <item.icon className="w-4 h-4 text-violet-400" />
                            {item.label}
                          </a>
                        )
                      ))}
                    </div>
                  ) : (
                    <Link
                      key={index}
                      to={createPageUrl(link.page)}
                      className="block px-3 py-2 text-slate-300 hover:text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                ))}
                <div className="pt-4 space-y-3 border-t border-slate-800">
                  <Link to={createPageUrl('Login')} className="block">
                    <Button variant="outline" className="w-full border-slate-700 text-slate-300">
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                  <Link to={createPageUrl('BookDemo')} className="block">
                    <Button variant="outline" className="w-full border-slate-700 text-slate-300">
                      Book a Demo
                    </Button>
                  </Link>
                  <Link to={createPageUrl('StartTrial')} className="block">
                    <Button className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white">
                      Start Free Trial
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main>
          {children}
        </main>
      </div>
    );
  }

  // App page navigation - different navigation based on user role
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : '';
  
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'VENDOR_ADMIN';
  const isTrueSuperAdmin = userRole === 'SUPER_ADMIN';
  const isClientAdmin = userRole === 'CLIENT_ADMIN';
  const isMember = !isSuperAdmin && !isClientAdmin;

  let navItems = [];
  
  if (isSuperAdmin) {
    // Super Admin: Only see admin-specific navigation
    navItems = [
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
      { name: 'Clients', icon: Building2, page: 'AdminClients' },
      ...(isTrueSuperAdmin ? [{ name: 'Apps', icon: AppWindow, page: 'AdminApps' }] : []),
    ];
  } else if (isClientAdmin) {
    // Client Admin: See testing features + admin features
    navItems = [
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
      { name: 'Tests', icon: FileText, page: 'Tests' },
      { name: 'Modules', icon: Package, page: 'Modules' },
      { name: 'Results', icon: Play, page: 'RunResults' },
      { name: 'Reports', icon: BarChart3, page: 'Reports' },
      { name: 'Team', icon: Users, page: 'AdminTeam' },
      { name: 'Billing', icon: DollarSign, page: 'AdminBilling' },
      { name: 'Projects', icon: Briefcase, page: 'AdminProjects' },
    ];
  } else {
    // Regular Member: Only testing features
    navItems = [
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
      { name: 'Tests', icon: FileText, page: 'Tests' },
      { name: 'Modules', icon: Package, page: 'Modules' },
      { name: 'Results', icon: Play, page: 'RunResults' },
      { name: 'Reports', icon: BarChart3, page: 'Reports' },
    ];
  }

  const isActive = (page) => {
    if (page === 'Tests') {
      return ['Tests', 'TestEditor', 'TestHistory'].includes(currentPageName);
    }
    if (page === 'Modules') {
      return ['Modules', 'ModuleEditor'].includes(currentPageName);
    }
    if (page === 'RunResults') {
      return ['RunResults', 'TestResults'].includes(currentPageName);
    }
    if (page === 'AdminClients') {
      return ['AdminClients', 'AdminClientDetails'].includes(currentPageName);
    }
    return currentPageName === page;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600">
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">YourAITester</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-300
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
              <FlaskConical className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900">YourAITester</span>
              <p className="text-xs text-slate-400">AI Test Automation</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.page);
            return (
              <Link 
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${active 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}>
                  <item.icon className={`h-5 w-5 ${active ? 'text-indigo-600' : ''}`} />
                  <span>{item.name}</span>
                  {active && (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {!isSuperAdmin && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100">
              <p className="text-sm font-medium text-indigo-700 mb-1">Pro Tip</p>
              <p className="text-xs text-slate-600">Use natural language to write your test steps!</p>
            </div>
          )}
          {isSuperAdmin && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100">
              <p className="text-sm font-medium text-indigo-700 mb-1">Admin Panel</p>
              <p className="text-xs text-slate-600">Manage all clients and their subscriptions</p>
            </div>
          )}
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-slate-600 hover:text-slate-900"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {/* Top bar for desktop: tenant selector and logout */}
        <div className="hidden lg:flex justify-between items-center gap-4 px-6 py-3 border-b bg-white">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Logged in as:</span>
            <span className="text-sm font-medium text-slate-900">{Auth.getRole() || 'User'}</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Only show tenant/project selectors for non-super-admin users */}
            {!isSuperAdmin && (
              <>
                <TenantSelector />
                <ProjectSelector />
              </>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-2 text-slate-600 hover:text-slate-900"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
