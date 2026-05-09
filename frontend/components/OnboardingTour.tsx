'use client'
import React, { useState, useEffect } from 'react';
import { RedSnareLogo } from './RedSnareLogo';
import { ChevronRight, X, ArrowRight, Zap, Target, ShieldCheck, PlusCircle } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description: string;
  targetId?: string; // HTML element ID to highlight
  icon: React.ReactNode;
}

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const [spotlight, setSpotlight] = useState<{ top: number, left: number, width: number, height: number } | null>(null);

  const steps: Step[] = [
    {
      id: 'welcome',
      title: 'Welcome to RedSnare',
      description: 'The world\'s first decentralized, end-to-end encrypted bug bounty platform. Let\'s show you around.',
      icon: <RedSnareLogo className="w-12 h-12 text-[#E8281E]" />
    },
    {
      id: 'explorer',
      title: 'The Explorer',
      description: 'Browse all active bounty programs. Filter by rewards, severity, or technology stack.',
      targetId: 'nav-explorer',
      icon: <Target className="w-6 h-6 text-brand-400" />
    },
    {
      id: 'submit',
      title: 'Submit Findings',
      description: 'Have you found a vulnerability? Submit your evidence here with client-side encryption.',
      targetId: 'nav-submit',
      icon: <Zap className="w-6 h-6 text-brand-400" />
    },
    {
      id: 'create',
      title: 'Launch a Program',
      description: 'Are you an organization? Create and fund your own bug bounty program in seconds.',
      targetId: 'nav-create',
      icon: <PlusCircle className="w-6 h-6 text-brand-400" />
    },
    {
      id: 'admin',
      title: 'Protocol Command',
      description: 'Manage global settings, monitor all events, and handle protocol-level disputes.',
      targetId: 'nav-admin',
      icon: <ShieldCheck className="w-6 h-6 text-brand-400" />
    },
    {
      id: 'final',
      title: 'Ready to Go',
      description: 'You\'re all set! Start securing the decentralized future today.',
      icon: <ShieldCheck className="w-12 h-12 text-emerald-500" />
    }
  ];

  useEffect(() => {
    // Check if guide was already played in this session
    const played = sessionStorage.getItem('rs-guide-played');
    if (played !== 'true') {
      setTimeout(() => setIsVisible(true), 1000);
      setCurrentStep(0);
    }
  }, []);

  useEffect(() => {
    if (currentStep >= 0 && currentStep < steps.length) {
      const step = steps[currentStep];
      if (step.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          setSpotlight({
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16
          });
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Skip this step if target is not visible for this user role
          next();
        }
      } else {
        setSpotlight(null);
      }
    }
  }, [currentStep]);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    setIsVisible(false);
    sessionStorage.setItem('rs-guide-played', 'true');
    localStorage.setItem('rs-onboarding-complete', 'true');
  };

  if (!isVisible || currentStep === -1) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark Overlay — Less aggressive, more premium blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-500 pointer-events-auto" />

      {/* Spotlight Hole — No massive shadow, just a glow */}
      {spotlight && (
        <div 
          className="absolute border-2 border-brand-500/50 shadow-[0_0_100px_rgba(232,40,30,0.4)] rounded-xl transition-all duration-500 ease-in-out z-[10000]"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            backgroundColor: 'rgba(255,255,255,0.05)', // Subtle "lit" effect
          }}
        >
           {/* Secondary outer glow */}
           <div className="absolute inset-[-4px] border border-brand-500/20 rounded-2xl animate-pulse" />
        </div>
      )}

      {/* Tooltip Card */}
      <div 
        className={`absolute z-[10001] pointer-events-auto transition-all duration-500 transform
          ${!spotlight ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px]' : ''}`}
        style={spotlight ? {
          top: spotlight.top + spotlight.height + 20,
          left: Math.max(20, Math.min(window.innerWidth - 360, spotlight.left + (spotlight.width / 2) - 170)),
          width: '340px'
        } : {}}
      >
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 shadow-2xl overflow-hidden relative group">
          {/* Subtle brand glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 p-4 rounded-3xl bg-brand-500/10 border border-brand-500/20 shadow-[0_0_30px_rgba(232,40,30,0.1)] group-hover:scale-105 transition-all duration-300">
              {step.icon}
            </div>
            
            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter" style={{ fontFamily: 'var(--rs-font-logo)' }}>
              {step.title}
            </h3>
            
            <p className="text-[14px] text-gray-300 leading-relaxed mb-8 max-w-[280px]">
              {step.description}
            </p>

            <div className="flex items-center justify-between w-full pt-6 border-t border-white/5">
              <button 
                onClick={finish}
                className="text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:text-white transition-colors"
              >
                Skip Guide
              </button>
              
              <button 
                onClick={next}
                className="btn-primary py-2 px-6 text-xs font-bold flex items-center gap-2 group/btn"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next Step'}
                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-6">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-brand-500' : 'w-1.5 bg-white/10'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
