import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, DollarSign, Zap, PenTool, Layers, Gauge, Rocket, MessageSquare, CheckCircle2 } from 'lucide-react';

const MotionDiv = motion.div;


// const typingTexts = [
//   '10x faster',
//   'Zero Scripting',
//   'Self Healing',
//   '10x cheaper'
// ];

const speedAdvantages = [
  // {
  //   icon: PenTool,
  //   title: 'No Scripts to Write',
  // description: '<b>No scripts</b> to write or maintain.<br/><b>Describe</b> your test in <b>natural language</b>.<br/>We handle the rest.',
  //   stat: '100%',
  //   statLabel: 'No Code Required',
  //   gradient: 'from-indigo-500 to-violet-600',
  // bgGradient: 'from-indigo-500/30 via-violet-500/10 to-transparent',
  // borderColor: '',
  //   iconBg: 'from-violet-500/30 to-purple-600/30',
  //   statColor: 'from-green-400 to-green-400'
  // },
  // {
  //   icon: Layers,
  //   title: 'Zero Maintenance',
  // description: '<b>Zero maintenance</b> as UI changes.<br/><b>No script updates</b> required.<br/>YourAITester adapts <b>automatically</b>.',
  //   stat: '0.00',
  //   statLabel: 'Hours of Maintenance',
  //   gradient: 'from-vilote-500 to-indigo-600',
  // bgGradient: 'from-vilote-500/30 via-indigo-500/10 to-transparent',
  // borderColor: '',
  //   iconBg: 'from-cyan-500/30 to-blue-600/30',
  //   statColor: 'from-green-400 to-green-400'
  // },
  // {
  //   icon: Gauge,
  //   title: 'Instant Test Creation',
  // description: '<b>Comprehensive test suites</b> in <b>minutes</b>.<br/>Weeks of work <b>reduced</b> to hours.<br/>Accelerate your QA process.',
  //   stat: '100x',
  //   statLabel: 'Faster Setup',
  //   gradient: 'from-pink-500 to-teal-600',
  // bgGradient: 'from-emerald-500/30 via-teal-500/10 to-transparent',
  // borderColor: '',
  //   iconBg: 'from-emerald-500/30 to-teal-600/30',
  //   statColor: 'from-green-400 to-teal-400'
  // },
  // {
  //   icon: Rocket,
  //   title: 'Rapid Iteration',
  // description: '<b>Instant test updates</b> as requirements change.<br/><b>No waiting</b> for developers.<br/>No broken selectors.',
  //   stat: '10x',
  //   statLabel: 'Faster Updates',
  //   gradient: 'from-yellow-500 to-pink-600',
  // bgGradient: 'from-pink-500/30 via-orange-500/10 to-transparent',
  // borderColor: '',
  //   iconBg: 'from-amber-500/30 to-orange-600/30',
  //   statColor: 'from-green-400 to-green-400'
  // },
  // {
  //   icon: MessageSquare,
  //   title: 'Natural Language',
  // description: '<b>Write tests</b> like talking to a colleague.<br/><b>No technical knowledge</b> required.<br/>Just describe the <b>user flow</b>.',
  //   stat: '0',
  //   statLabel: 'Learning Curve',
  //   gradient: 'from-yellow-500 to-rose-600',
  // bgGradient: 'from-pink-500/30 via-rose-500/10 to-transparent',
  // borderColor: '',
  //   iconBg: 'from-pink-500/30 to-rose-600/30',
  //   statColor: 'from-green-400 to-green-400'
  // },
  {
    icon: PenTool,
    title: 'No Scripts to Write',
  description: '<b>No scripts</b> to write or maintain.<br/><b>Describe</b> your test in <b>natural language</b>.<br/>We handle the rest.',
    stat: '100%',
    statLabel: 'No Code Required',
    gradient: 'from-vilote-500 to-indigo-600',
  bgGradient: 'from-vilote-500/30 via-indigo-500/10 to-transparent',
  borderColor: '',
    iconBg: 'from-violet-500/30 to-purple-600/30',
    statColor: 'from-green-400 to-green-400'
  },
  {
    icon: Layers,
    title: 'Zero Maintenance',
  description: '<b>Zero maintenance</b> as UI changes.<br/><b>No script updates</b> required.<br/>YourAITester adapts <b>automatically</b>.',
    stat: '0.00',
    statLabel: 'Hours of Maintenance',
    gradient: 'from-vilote-500 to-indigo-600',
  bgGradient: 'from-vilote-500/30 via-indigo-500/10 to-transparent',
  borderColor: '',
    iconBg: 'from-cyan-500/30 to-blue-600/30',
    statColor: 'from-green-400 to-green-400'
  },
  {
    icon: Gauge,
    title: 'Instant Test Creation',
  description: '<b>Comprehensive test suites</b> in <b>minutes</b>.<br/>Weeks of work <b>reduced</b> to hours.<br/>Accelerate your QA process.',
    stat: '100x',
    statLabel: 'Faster Setup',
    gradient: 'from-vilote-500 to-indigo-600',
  bgGradient: 'from-vilote-500/30 via-indigo-500/10 to-transparent',
  borderColor: '',
    iconBg: 'from-emerald-500/30 to-teal-600/30',
    statColor: 'from-green-400 to-teal-400'
  },
  {
    icon: Rocket,
    title: 'Rapid Iteration',
  description: '<b>Instant test updates</b> as requirements change.<br/><b>No waiting</b> for developers.<br/>No broken selectors.',
    stat: '10x',
    statLabel: 'Faster Updates',
    gradient: 'from-vilote-500 to-indigo-600',
  bgGradient: 'from-vilote-500/30 via-indigo-500/10 to-transparent',
  borderColor: '',
    iconBg: 'from-amber-500/30 to-orange-600/30',
    statColor: 'from-green-400 to-green-400'
  },
  {
    icon: MessageSquare,
    title: 'Natural Language',
  description: '<b>Write tests</b> like talking to a colleague.<br/><b>No technical knowledge</b> required.<br/>Just describe the <b>user flow</b>.',
    stat: '0',
    statLabel: 'Learning Curve',
    gradient: 'from-vilote-500 to-indigo-600',
  bgGradient: 'from-vilote-500/30 via-indigo-500/10 to-transparent',
  borderColor: '',
    iconBg: 'from-pink-500/30 to-rose-600/30',
    statColor: 'from-green-400 to-green-400'
  },
  {
    icon: CheckCircle2,
    title: 'Always Stable',
  description: '<b>Stable tests</b> even when code changes.<br/>AI understands <b>intent</b>,<br/>not just implementation.',
    stat: '99%',
    statLabel: 'Uptime',
    gradient: 'from-vilote-500 to-indigo-600',
  bgGradient: 'from-vilote-500/30 via-indigo-500/10 to-transparent',
  borderColor: '',
    iconBg: 'from-indigo-500/30 to-violet-600/30',
    statColor: 'from-green-400 to-green-400'
  }
];

export default function SpeedAdvantageSection() {
  const [activeAdvantage, setActiveAdvantage] = useState(0);


  // --- Typewriter effect for carousel card titles ---
  const [cardTypedText, setCardTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);


  // Auto-rotate carousel (6 seconds)
  // Only advance carousel after typewriter effect is done
  useEffect(() => {
    if (!isTypingDone) return;
    const timeout = setTimeout(() => {
      setActiveAdvantage((prev) => (prev + 1) % speedAdvantages.length);
    }, 3000); // Wait 3 seconds after typing is done
    return () => clearTimeout(timeout);
  }, [isTypingDone]);


  // Typewriter effect for carousel card titles
  // Reset typewriter when card changes
  useEffect(() => {
    setCardTypedText('');
    setIsTypingDone(false);
  }, [activeAdvantage]);

  useEffect(() => {
    const fullText = speedAdvantages[activeAdvantage]?.title || '';
    let timeout;
    if (cardTypedText === fullText) {
      setIsTypingDone(true);
    } else {
      timeout = setTimeout(() => {
        setCardTypedText((prev) => fullText.substring(0, prev.length + 1));
      }, 120); // Typing speed
    }
    return () => clearTimeout(timeout);
  }, [cardTypedText, activeAdvantage]);



  return (
    <section className="py-20 relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ delay: 0.2, duration: 0.6 }}
          whileHover={{ scale: 1.01 }}
          className="relative"
        >
            <div className="relative p-10 rounded-3xl backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-500">
        
        <div className="relative max-w-5xl mx-auto text-center mb-12">
          {/* Multiple Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm">
              <TrendingUp className="w-4 h-4" />
              Speed Advantage
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm">
              <DollarSign className="w-4 h-4" />
              Cost Advantage
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm">
              <Zap className="w-4 h-4" />

              Faster Time to Market
            </div>
          </div>
          {/*
          <h3 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400">
              {typedText}
              <span className="animate-pulse">|</span>
            </span>
          </h3>
          */}
          {/* <p className="text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
            Unlike other AI automation tools that still require you to write and maintain scripts, 
            YourAITester eliminates script creation entirely. No code to write, no selectors to maintain, 
            no scripts to update when your UI changes. Just describe what you want to test—we handle the rest.
          </p> */}
        </div>

        {/* Advantages Carousel - Inside the card */}
  <div className="relative max-w-5xl mx-auto px-4 pt-16">
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <MotionDiv
                key={activeAdvantage}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                {(() => {
                  const advantage = speedAdvantages[activeAdvantage];
                  if (!advantage) return null;
                  const Icon = advantage.icon;
                  return (
                    <div className={`relative rounded-3xl bg-gradient-to-br ${advantage.bgGradient} backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-500`}>
                      {/* Icon in Top Left Corner - Floating Badge Style */}
                      <div className="absolute -top-4 -left-4">
                        <div className="relative">
                          <div className={`absolute inset-0 bg-gradient-to-br ${advantage.gradient} opacity-40 rounded-2xl blur-xl animate-pulse`} />
                          <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${advantage.gradient} flex items-center justify-center shadow-2xl border-4 border-slate-900 transition-all duration-300`}>
                            <Icon className="w-8 h-8 md:w-10 md:h-10 text-green-400 drop-shadow-lg" strokeWidth={2.5} />
                          </div>
                        </div>
                      </div>
                      {/* Animated Background Effects */}
                      <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${advantage.gradient} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-500`} />
                        <div className={`absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr ${advantage.gradient} opacity-10 rounded-full blur-3xl transition-opacity duration-500`} />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_50%)]" />
                      
                      <div className="relative p-6 md:p-8 pb-10 md:pb-14">

                        {/* Main Content Area - Compact Layout */}
                        <div className="pt-6 md:pt-8">
                          <div className="flex items-start justify-between gap-6">
                            {/* Left: Title and Description */}
                            <div className="flex-1">
                              {/* Title with typewriter effect */}
                              <h4 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 transition-all duration-300">
                                <span>{cardTypedText}</span>
                                <span className="animate-pulse">|</span>
                              </h4>
                              
                              {/* Description */}
                              <p className="text-base md:text-lg text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: advantage.description }} />
                            </div>

                            {/* Right: Stat Display - Inline */}
                            <div className={`flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-br  ${advantage.iconBg} backdrop-blur-sm border ${advantage.borderColor} shadow-xl transition-transform duration-300`}>
                              <div className="text-right">
                                <div className={`text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${advantage.statColor} leading-none mb-1`}>
                                  {advantage.stat}
                                </div>
                                <div className="text-xs md:text-sm text-slate-200 font-semibold uppercase tracking-wide whitespace-nowrap">
                                  {advantage.statLabel}
                                </div>
                              </div>
                              <div className={`w-1 h-12 bg-gradient-to-b ${advantage.gradient} rounded-full`} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Decorative Corner Elements */}
                      <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl ${advantage.gradient} opacity-5 rounded-bl-full`} />
                      <div className={`absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr ${advantage.gradient} opacity-5 rounded-tr-full`} />
              {/* <TrendingUp className="w-4 h-4" />
              <DollarSign className="w-4 h-4" /> */}
              {/* <Zap className="w-4 h-4" /> */}
                    </div>
                  );
                })()}
              </MotionDiv>
            </AnimatePresence>
          </div>

          {/* Carousel Controls - Enhanced Design */}
          {/**
           <div className="flex items-center justify-center gap-8 mt-8">
             <button
               onClick={() => {
                 setActiveAdvantage((prev) => (prev - 1 + speedAdvantages.length) % speedAdvantages.length);
               }}
               className="group flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 text-slate-300 hover:text-white hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300 backdrop-blur-sm hover:scale-105"
             >
               <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
             </button>
             <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
               {speedAdvantages.map((advantage, index) => (
                 <button
                   key={index}
                   onClick={() => setActiveAdvantage(index)}
                   className="group relative w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300"
                   aria-label={`Go to card ${index + 1}`}
                 >
                   {activeAdvantage === index ? (
                     <>
                       <span className={`absolute inset-0 rounded-full ring-2 ring-offset-2 ring-white/80 animate-pulse`} />
                       <span className={`relative w-3 h-3 rounded-full bg-gradient-to-r ${advantage.gradient} shadow-lg`} />
                     </>
                   ) : (
                     <span className="w-3 h-3 rounded-full bg-slate-700 group-hover:bg-slate-500 transition-colors duration-300" />
                   )}
                 </button>
               ))}
             </div>
             <button
               onClick={() => {
                 setActiveAdvantage((prev) => (prev + 1) % speedAdvantages.length);
               }}
               className="group flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 text-slate-300 hover:text-white hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300 backdrop-blur-sm hover:scale-105"
             >
               <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
             </button>
           </div>
          */}
        </div>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}

