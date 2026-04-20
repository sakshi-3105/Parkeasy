"use client";
import Link from 'next/link';
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function LandingPage() {
  const container = useRef();
  
  useGSAP(() => {
    // Timeline for coordinated animations
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Navbar animation
    tl.fromTo('.nav-item', 
      { opacity: 0, y: -20 }, 
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }
    );

    // Hero section animations
    tl.fromTo('.hero-badge',
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.5 },
      "-=0.2"
    );

    tl.fromTo('.hero-title-line',
      { opacity: 0, y: 40, rotationX: -20 },
      { opacity: 1, y: 0, rotationX: 0, duration: 0.8, stagger: 0.2 },
      "-=0.3"
    );

    tl.fromTo('.hero-description',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6 },
      "-=0.4"
    );

    tl.fromTo('.hero-button',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 },
      "-=0.2"
    );

    // Feature cards stagger animation
    tl.fromTo('.feature-card',
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.15 },
      "-=0.2"
    );
    
    // Animate background glow
    gsap.to('.bg-glow', {
      duration: 10,
      scale: 1.2,
      opacity: 0.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, { scope: container });

  return (
    <div ref={container} className="min-h-screen bg-[#f8fafc] text-gray-900 overflow-hidden relative selection:bg-blue-600 selection:text-white">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 blur-[120px] rounded-full bg-glow pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 blur-[120px] rounded-full bg-glow pointer-events-none" />
      
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto relative z-10 w-full">
        <h1 className="nav-item text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 tracking-tighter">
          PARKEASY
        </h1>
        <div className="space-x-6 flex items-center">
          <Link href="/login" className="nav-item text-gray-600 font-medium hover:text-gray-900 transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="nav-item bg-blue-50 border border-blue-200 text-blue-700 px-6 py-2 rounded-xl font-medium hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.1)] hover:shadow-[0_0_20px_rgba(37,99,235,0.25)]">
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 py-24 flex flex-col items-center text-center relative z-10">
        <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-bold tracking-widest text-blue-700 uppercase bg-blue-50 border border-blue-200 rounded-full backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          Parking Simplified for Pune
        </div>
        
        <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-8 leading-[1.1] tracking-tight [perspective:1000px]">
          <div className="hero-title-line origin-bottom">Find your perfect spot</div>
          <div className="hero-title-line origin-bottom text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-blue-700 to-blue-500">
            before you arrive.
          </div>
        </h2>
        
        <p className="hero-description max-w-2xl text-lg md:text-xl text-gray-600 mb-12 leading-relaxed">
          Real-time availability, secure booking, and instant checkouts. 
          Stop circling the block and start parking with ParkEasy.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-5">
          <Link href="/signup" className="hero-button bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-[0_0_30px_rgba(37,99,235,0.2)] hover:shadow-[0_0_40px_rgba(37,99,235,0.3)] transform hover:-translate-y-1">
            Register Now
          </Link>
          <Link href="/login" className="hero-button bg-white text-gray-900 border border-gray-200 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all hover:border-gray-300">
            Member Login
          </Link>
        </div>

        {/* Features Preview */}
        <div className="features-container grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full">
          {[
            {
              icon: "📍",
              title: "Prime Locations",
              desc: "Access thousands of spots across MG Road, Kothrud, Baner, and more."
            },
            {
              icon: "⚡",
              title: "Instant Booking",
              desc: "Choose your specific spot from our visual map and book in seconds."
            },
            {
              icon: "💰",
              title: "Transparent Pricing",
              desc: "Pay-as-you-go rates with detailed checkout receipts and history."
            }
          ].map((feature, i) => (
            <div key={i} className="feature-card p-8 rounded-[2rem] bg-white/60 border border-gray-200 backdrop-blur-md text-left hover:bg-white hover:shadow-xl hover:shadow-blue-900/5 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h4 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h4>
              <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 mt-10 py-8">
        <div className="max-w-7xl mx-auto px-8 flex justify-center items-center text-gray-500 text-sm">
          <p>© 2026 ParkEasy Pune. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}