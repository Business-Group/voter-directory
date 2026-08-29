import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- Supabase Setup ---
const supabaseUrl = 'https://ekuhogarfvumhidvrydi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrdWhvZ2FyZnZ1bWhpZHZyeWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODM4NjUsImV4cCI6MjEwMzA1OTg2NX0.PFr9XwZgg8_-iCW9p6Aw6m96-9gny5s_GLcp2l2T2iM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  // --- PRELOADER STATE ---
  const [showPreloader, setShowPreloader] = useState(true);
  const [loaderPhase, setLoaderPhase] = useState('dropping');

  // --- DIRECTORY STATE ---
  const [voters, setVoters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  // --- FACEBOOK RESPONSIVE WIDTH STATE ---
  const [fbWidth, setFbWidth] = useState(500);

  // --- RESPONSIVE FACEBOOK WIDTH TRACKER ---
  useEffect(() => {
    const updateFbWidth = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth < 540) {
        setFbWidth(Math.max(180, screenWidth - 32)); 
      } else {
        setFbWidth(500);
      }
    };

    updateFbWidth(); // Run on mount
    window.addEventListener('resize', updateFbWidth);
    return () => window.removeEventListener('resize', updateFbWidth);
  }, []);

  // --- PRELOADER ANIMATION SEQUENCE ---
  useEffect(() => {
    const tickTimer = setTimeout(() => setLoaderPhase('ticked'), 1000);
    const fadeTimer = setTimeout(() => setLoaderPhase('fading'), 2000);
    const removeTimer = setTimeout(() => setShowPreloader(false), 2500);

    return () => {
      clearTimeout(tickTimer);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // --- DIRECTORY FETCH LOGIC ---
  useEffect(() => {
    const fetchVoters = async () => {
      const searchValue = searchTerm.trim();
      
      if (!searchValue) {
        setVoters([]);
        setLoading(false);
        setExpandedIndex(null);
        return;
      }

      setLoading(true);
      
      let query = supabase.from('voters').select('*');
      
      if (filterClass !== 'All') {
        query = query.ilike('MEMBER_CLASS', `%${filterClass[0]}%`);
      }
      
      // 1. STANDARD TEXT SEARCH (Names, Companies, MSNO)
      const standardWildcard = `%${searchValue}%`;
      let exactSearchQuery = `REPRESENTATIVE_NAME.ilike.${standardWildcard},COMPANY_NAME.ilike.${standardWildcard},MSNO.ilike.${standardWildcard}`;

      // 2. ROBUST NUMERIC REGEX SEARCH (CNIC, NTN, Phones)
      const cleanSearch = searchValue.replace(/[-\s]/g, '');
      
      // If the user typed purely numbers, activate the POSIX Regex Logic
      if (cleanSearch.length > 0 && /^\d+$/.test(cleanSearch)) {
        
        // Turns "107" into "1[^0-9]*0[^0-9]*7" 
        // This database command means: Find 1, ignore non-digits, find 0, ignore non-digits, find 7.
        const regexPattern = cleanSearch.split('').join('[^0-9]*');
        
        // 'imatch' is Supabase's operator for PostgreSQL Regular Expressions
        exactSearchQuery += `,CNIC.imatch.${regexPattern},NTN.imatch.${regexPattern},CONTACT_1.imatch.${regexPattern},CONTACT_2.imatch.${regexPattern}`;
      } else {
        // Fallback for standard exact search if they included letters
        exactSearchQuery += `,CNIC.ilike.${standardWildcard},NTN.ilike.${standardWildcard},CONTACT_1.ilike.${standardWildcard},CONTACT_2.ilike.${standardWildcard}`;
      }

      query = query.or(exactSearchQuery).limit(50);
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Supabase query error:", error);
      } else {
        setVoters(data || []);
      }
      
      setLoading(false);
      setExpandedIndex(null); 
    };

    const delayDebounceFn = setTimeout(() => {
      fetchVoters();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filterClass]);

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Helper function to handle 'NULL' text strings from database
  const renderValue = (val) => {
    if (!val || val === 'NULL' || val === 'null' || val === '') return 'N/A';
    return val;
  };

  return (
    <>
      {/* GLOBAL SCROLLBAR, PRINT & ANIMATION CSS */}
      <style>
        {`
          /* Hide scrollbar for Chrome, Safari and Opera */
          ::-webkit-scrollbar { display: none; }
          /* Hide scrollbar for IE, Edge and Firefox */
          * { -ms-overflow-style: none; scrollbar-width: none; }

          /* ANNOUNCEMENT BAR SCROLL ANIMATION */
          @keyframes marquee {
            0% { transform: translateX(100vw); }
            100% { transform: translateX(-100%); }
          }
          .animate-marquee {
            display: inline-block;
            white-space: nowrap;
            animation: marquee 45s linear infinite; 
          }

          /* PRINT LOGIC: Hide everything except the designated print-area */
          @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              border: none !important;
              box-shadow: none !important;
              background-color: white !important;
            }
            .no-print, .no-print * { display: none !important; }
          }
        `}
      </style>

      {/* 0. INITIAL PRELOADER SCREEN */}
      {showPreloader && (
        <div 
          className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#fafbfc] transition-opacity duration-500 ease-in-out ${
            loaderPhase === 'fading' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="relative flex flex-col items-center justify-center w-64 h-64 scale-75 md:scale-100">
            <div 
              className={`absolute z-10 w-16 h-24 bg-white border-2 border-brand-dark flex flex-col items-center pt-2 transition-transform duration-700 ease-in ${
                loaderPhase === 'dropping' ? '-translate-y-24' : 'translate-y-4'
              }`}
            >
              <div className="w-8 h-1 bg-gray-300 mb-2"></div>
              <div className="w-10 h-1 bg-gray-300 mb-2"></div>
              <div className="w-6 h-1 bg-gray-300 mb-4"></div>
              <div className="w-6 h-6 rounded-full border-4 border-brand-primary opacity-50"></div>
            </div>

            <div className="relative z-20 mt-16 flex flex-col items-center">
              <div className="w-32 h-6 bg-brand-dark border-2 border-brand-dark flex items-center justify-center">
                <div className="w-16 h-2 bg-black rounded-full"></div>
              </div>
              <div className="w-40 h-32 bg-brand-primary border-x-4 border-b-4 border-brand-dark flex flex-col items-center justify-center relative shadow-[8px_8px_0px_0px_#001f5b]">
                <span className="font-heading font-black text-brand-gold text-xl leading-none uppercase text-center tracking-widest">
                  Business<br/>Group
                </span>
                <div 
                  className={`absolute -bottom-4 -right-4 w-12 h-12 bg-white rounded-full border-4 border-brand-dark flex items-center justify-center transition-all duration-300 ease-out shadow-[4px_4px_0px_0px_#001f5b] ${
                    loaderPhase === 'dropping' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
                  }`}
                >
                  <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN APPLICATION CONTENT */}
      <div className="min-h-screen bg-[#fafbfc] text-gray-800 flex flex-col w-full font-sans">
        
        {/* =========================================
            STICKY NAVIGATION & ANNOUNCEMENT WRAPPER 
            ========================================= */}
        <div className="sticky top-0 z-50 w-full flex flex-col shadow-sm no-print">
          
          {/* 0.5. SCROLLING ANNOUNCEMENT BAR */}
          <div className="w-full bg-[#0d2136] text-[#cda03f] overflow-hidden py-2 border-b border-[#cda03f]/30">
            <div className="animate-marquee font-heading font-bold tracking-widest text-xs md:text-sm uppercase flex items-center">
              <span className="mx-8 whitespace-nowrap">IN SHA ALLAH</span>
              <span className="mx-8 text-white">•</span>
              <span className="mx-8 whitespace-nowrap">VICTORY FOR RANA FARHAN AS EXECUTIVE MEMBER GCCI ELECTIONS 2026-2028</span>
              <span className="mx-8 text-white">•</span>
              <span className="mx-8 whitespace-nowrap">IN SHA ALLAH</span>
              <span className="mx-8 text-white">•</span>
              <span className="mx-8 whitespace-nowrap">VICTORY FOR RANA FARHAN AS EXECUTIVE MEMBER GCCI ELECTIONS 2026-2028</span>
              <span className="mx-8 text-white">•</span>
              <span className="mx-8 whitespace-nowrap">IN SHA ALLAH</span>
              <span className="mx-8 text-white">•</span>
              <span className="mx-8 whitespace-nowrap">VICTORY FOR RANA FARHAN AS EXECUTIVE MEMBER GCCI ELECTIONS 2026-2028</span>
            </div>
          </div>

          {/* 1. HEADER / NAVBAR */}
          <header className="w-full bg-[#d4d4d4] text-gray-800 flex flex-col md:flex-row justify-between items-center px-4 md:px-8 py-3 md:py-4 border-b-4 border-brand-gold">
            
            {/* LOGO, TITLE, AND ELECTION TEXT */}
            <div className="flex items-center mb-3 md:mb-0 w-full md:w-auto justify-center md:justify-start">
              <img src="logo.png" alt="Business Group Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-full mr-2 md:mr-3" />
              
              <div className="flex items-center">
                {/* Title */}
                <div className="font-heading font-bold text-xl md:text-2xl tracking-tight text-brand-dark whitespace-nowrap">
                  Business <span className="text-brand-primary">Group</span>
                </div>
                
                {/* Vertical Bar Separator */}
                <div className="mx-2 md:mx-4 h-5 md:h-7 w-[2px] bg-gray-400 rounded-full"></div>
                
                {/* Election Text */}
                <div className="font-sans font-bold text-xs md:text-sm text-gray-600 uppercase tracking-wide whitespace-nowrap pt-1">
                  Election 2026-2028
                </div>
              </div>
            </div>

            {/* NAVIGATION & SOCIALS */}
            <nav className="flex items-center justify-center space-x-4 md:space-x-6 w-full md:w-auto">
              <div className="flex items-center space-x-3 md:space-x-4 border-r-2 border-gray-400 pr-4 md:pr-6">
                <a href="https://www.facebook.com/profile.php?id=61577872561636" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.005 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.268h3.328l-.531 3.49h-2.797V24C19.612 23.094 24 18.1 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://www.instagram.com/rana_farhan_rana/" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="ig-grad" x1="2.4" y1="21.6" x2="21.6" y2="2.4" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#f09433"/>
                        <stop offset="0.15" stopColor="#e6683c"/>
                        <stop offset="0.3" stopColor="#dc2743"/>
                        <stop offset="0.5" stopColor="#cc2366"/>
                        <stop offset="0.7" stopColor="#bc1888"/>
                        <stop offset="1" stopColor="#8a3ab9"/>
                      </linearGradient>
                    </defs>
                    <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.323a1.44 1.44 0 100-2.88 1.44 1.44 0 000 2.88z"/>
                  </svg>
                </a>
                <a href="https://www.tiktok.com/@rana007farhan" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.15 5.54-3.33 7.36-1.93 1.63-4.5 2.2-6.9 1.75-2.73-.52-5.06-2.5-5.91-5.11-.85-2.62-.25-5.59 1.55-7.66 1.78-1.8 4.41-2.63 6.83-2.14v4.06c-1.32-.23-2.75-.02-3.83.82-1.07.82-1.65 2.19-1.52 3.54.12 1.25.96 2.37 2.12 2.89 1.17.51 2.58.4 3.63-.35 1.05-.83 1.61-2.14 1.6-3.48-.02-5.71-.01-11.42-.01-17.13h1.73z" fill="#000000"/>
                    <path d="M12.525.02v17.11c.01 1.34-.55 2.65-1.6 3.48-1.05.75-2.46.86-3.63.35-1.16-.52-2-1.64-2.12-2.89-.13-1.35.45-2.72 1.52-3.54 1.08-.84 2.51-1.05 3.83-.82V9.65c-2.42-.49-5.05.34-6.83 2.14-1.8 2.07-2.4 5.04-1.55 7.66.85 2.61 3.18 4.59 5.91 5.11 2.4.45 4.97-.12 6.9-1.75 2.18-1.82 3.25-4.58 3.33-7.36.03-2.91.01-5.83.02-8.75.52.34 1.05.67 1.62.93 1.31.62 2.76.92 4.2.97v-4.03c-1.54-.17-3.12-.68-4.24-1.79-1.12-1.08-1.67-2.64-1.75-4.17-1.3 0-2.6-.01-3.91.01z" fill="#FE2C55" style={{ mixBlendMode: "screen" }} transform="translate(1, -1)"/>
                    <path d="M12.525.02v17.11c.01 1.34-.55 2.65-1.6 3.48-1.05.75-2.46.86-3.63.35-1.16-.52-2-1.64-2.12-2.89-.13-1.35.45-2.72 1.52-3.54 1.08-.84 2.51-1.05 3.83-.82V9.65c-2.42-.49-5.05.34-6.83 2.14-1.8 2.07-2.4 5.04-1.55 7.66.85 2.61 3.18 4.59 5.91 5.11 2.4.45 4.97-.12 6.9-1.75 2.18-1.82 3.25-4.58 3.33-7.36.03-2.91.01-5.83.02-8.75.52.34 1.05.67 1.62.93 1.31.62 2.76.92 4.2.97v-4.03c-1.54-.17-3.12-.68-4.24-1.79-1.12-1.08-1.67-2.64-1.75-4.17-1.3 0-2.6-.01-3.91.01z" fill="#25F4EE" style={{ mixBlendMode: "screen" }} transform="translate(-1, 1)"/>
                  </svg>
                </a>
              </div>
              <a href="#directory" className="px-4 py-2 md:px-5 md:py-2.5 text-sm md:text-base bg-brand-primary text-white font-semibold rounded hover:bg-brand-dark transition-colors shadow-sm whitespace-nowrap">
                Voter Directory
              </a>
            </nav>
          </header>
        </div>
        {/* ========================================= */}

        {/* 2. HERO SECTION */}
        <section className="relative w-full bg-white overflow-hidden no-print flex flex-col border-b border-gray-200">
          
          {/* IMAGE CONTAINER */}
          <div className="w-full relative flex flex-col items-center bg-[#e4eff6] md:bg-[#74c0e8]">
            
            {/* 📱 MOBILE IMAGE */}
            <img 
              src="frontal-final.jfif" 
              alt="Business Group Candidates GCCI 2026-28: Rana Farhan Asghar, Waqas Afzal Mughal, Ghulam Hussain Judge, Mian Umer Saleem, Rana Saddique Khan" 
              className="w-full h-auto object-contain md:hidden drop-shadow-sm"
            />

            {/* 💻 DESKTOP IMAGE */}
            <img 
              src="frontal5.jfif" 
              alt="Business Group Candidates GCCI 2026-28: Rana Farhan Asghar, Waqas Afzal Mughal, Ghulam Hussain Judge, Mian Umer Saleem, Rana Saddique Khan" 
              className="hidden md:block w-full h-auto max-h-[85vh] object-cover object-bottom drop-shadow-md"
            />
          </div>

          {/* TEXT CONTENT */}
          <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pt-8 md:pt-12 flex flex-col items-center text-center bg-white">
            
            <h3 className="font-heading font-bold text-[#a67b27] text-xl md:text-2xl lg:text-3xl tracking-widest mb-4 md:mb-6 drop-shadow-sm">
              نَصْرٌ مِّنَ اللَّهِ وَفَتْحٌ قَرِيبٌ
            </h3>
            
            <div className="hidden md:flex flex-col items-center">
              <div className="inline-block bg-[#001f5b] text-white font-bold px-5 py-2 rounded-sm text-xs md:text-sm mb-6 tracking-widest uppercase shadow-md">
                GCCI Elections 2026–2028
              </div>
              
              <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-black text-[#001f5b] tracking-tight leading-none mb-3 drop-shadow-sm uppercase">
                Vote For <br />
                <span className="text-[#1877F2]">Business Group</span>
              </h1>
              
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-6">
                Rana Muhammad Farhan Asghar <br className="md:hidden" />
                <span className="font-medium text-lg md:text-2xl text-gray-600">As Executive Member</span>
              </h2>
              
              <p className="font-sans text-gray-700 text-lg md:text-xl font-medium max-w-2xl mb-8 leading-relaxed italic">
                "Together We Stand, Together We Rise."
              </p>
            </div>
          </div>

          <div className="w-full bg-white pb-10 md:pb-16 flex justify-center z-20">
             <a href="#directory" className="inline-block bg-[#1877F2] text-white font-sans font-bold uppercase text-sm tracking-wider px-10 py-4 rounded-full shadow-xl hover:bg-[#155ebd] hover:scale-105 active:scale-95 transition-all duration-300">
              Retrieve Your Data Now
            </a>
          </div>

        </section>

        {/* 3. CORE VALUES */}
        <section className="w-full flex flex-col md:flex-row bg-white no-print">
          <div className="w-full md:w-1/3 p-8 md:p-12 flex flex-col items-center text-center bg-gradient-to-br from-brand-dark to-brand-primary text-white relative group overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10 mix-blend-multiply transition-opacity group-hover:opacity-20"></div>
            <div className="relative z-10">
              <svg className="w-14 h-14 text-white mb-6 mx-auto drop-shadow-md" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.5,10.8l-8.3-8.3c-0.4-0.4-1-0.4-1.4,0l-4.3,4.3l-1.3-1.3c-0.4-0.4-1-0.4-1.4,0L1.3,9 c-0.4,0.4-0.4,1,0,1.4l3.5,3.5L1.3,17.4c-0.4,0.4-0.4,1,0,1.4l3.5,3.5c0.4,0.4,1,0.4,1.4,0l3.5-3.5l3.5,3.5c0.4,0.4,1,0.4,1.4,0 l7.1-7.1C21.9,11.8,21.9,11.2,21.5,10.8z M4.8,17.5l-2.1-2.1l3.5-3.5l2.1,2.1L4.8,17.5z M8.3,10.5L6.2,8.4l3.5-3.5l2.1,2.1 L8.3,10.5z M15.4,17.5l-2.1,2.1l-2.1-2.1l4.3-4.3l2.1,2.1L15.4,17.5z M19.6,13.3l-2.1,2.1l-4.3-4.3l2.1-2.1L19.6,13.3z" />
              </svg>
              <h3 className="font-heading text-xl md:text-2xl font-bold uppercase mb-3 drop-shadow-sm">Unity & Strength</h3>
              <p className="font-sans text-blue-100 text-sm leading-relaxed">
                Moving forward together. Our unity guarantees the success of Gujranwala's business community.
              </p>
            </div>
          </div>
          <div className="w-full md:w-1/3 p-8 md:p-12 flex flex-col items-center text-center bg-gradient-to-br from-brand-primary to-blue-600 text-white relative group overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10 mix-blend-multiply transition-opacity group-hover:opacity-20"></div>
            <div className="relative z-10">
              <svg className="w-14 h-14 text-white mb-6 mx-auto drop-shadow-md" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
              </svg>
              <h3 className="font-heading text-xl md:text-2xl font-bold uppercase mb-3 drop-shadow-sm">Trust</h3>
              <p className="font-sans text-blue-100 text-sm leading-relaxed">
                Your unwavering trust is our greatest asset in the fight for equal representation.
              </p>
            </div>
          </div>
          <div className="w-full md:w-1/3 p-8 md:p-12 flex flex-col items-center text-center bg-gradient-to-br from-blue-600 to-brand-sky text-white relative group overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10 mix-blend-multiply transition-opacity group-hover:opacity-20"></div>
            <div className="relative z-10">
              <svg className="w-14 h-14 text-white mb-6 mx-auto drop-shadow-md" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>
              </svg>
              <h3 className="font-heading text-xl md:text-2xl font-bold uppercase mb-3 drop-shadow-sm">Development</h3>
              <p className="font-sans text-blue-100 text-sm leading-relaxed">
                Together we will build a developed, modern, and thriving industrial ecosystem.
              </p>
            </div>
          </div>
        </section>

        {/* 4. MISSION & VISION */}
        <section id="mission" className="w-full max-w-7xl mx-auto px-6 py-16 md:py-20 flex flex-col items-center text-center no-print">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-brand-dark mb-10">Our Mission & Vision</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 text-left">
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <h3 className="font-heading text-xl md:text-2xl font-bold text-brand-primary mb-4 flex items-center">
                <span className="w-6 md:w-8 h-1 bg-brand-sky mr-3 rounded"></span> Mission
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4 text-sm md:text-base">
                To protect the rights of small and large scale industries alike, ensuring a level playing field. We are dedicated to streamlining the taxation and regulatory processes for all GCCI members, creating a hassle-free environment for business operations.
              </p>
            </div>
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <h3 className="font-heading text-xl md:text-2xl font-bold text-brand-primary mb-4 flex items-center">
                <span className="w-6 md:w-8 h-1 bg-brand-sky mr-3 rounded"></span> Vision
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4 text-sm md:text-base">
                Transforming Gujranwala into the leading, most innovative industrial hub of Pakistan. We envision an environment of continuous growth, technological advancement, and peaceful, democratic elections within the chamber.
              </p>
            </div>
          </div>
        </section>

        {/* 5. FACEBOOK POSTS FEED */}
        <section id="news" className="w-full bg-white px-0 md:px-6 py-16 md:py-20 border-t border-gray-100 no-print">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-10 md:mb-12 px-6">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#1877F2] mb-4 flex items-center">
                <svg className="w-6 h-6 md:w-8 md:h-8 mr-3 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.005 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.268h3.328l-.531 3.49h-2.797V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
                Facebook Updates
              </h2>
              <p className="text-gray-500 max-w-2xl font-sans text-sm md:text-base mb-6">
                Stay updated with our latest campaign activities and announcements directly from our official page.
              </p>
            </div>
            
            <div 
              className="bg-white rounded-none md:rounded-xl shadow-none md:shadow-md border-y md:border border-gray-200 flex justify-center overflow-hidden transition-all duration-300 mx-auto relative"
              style={{ width: `${fbWidth}px`, height: '600px' }}
            >
              <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                <iframe 
                  src={`https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fprofile.php%3Fid%3D61577872561636&tabs=timeline&width=${fbWidth}&height=600&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId`}
                  width={fbWidth + 24} height="600" style={{ border: 'none', width: `${fbWidth + 24}px`, maxWidth: 'none' }} scrolling="no" frameBorder="0" allowFullScreen={true} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" title="Business Group Facebook Feed"
                ></iframe>
              </div>
            </div>
          </div>
        </section>

        {/* 6. VOTER DIRECTORY */}
        <section id="directory" className="w-full bg-transparent px-6 py-16 md:py-20 border-t border-gray-200">
          <div className="max-w-7xl mx-auto">
            
            <div className="flex flex-col items-center text-center mb-10 md:mb-12 no-print">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-brand-dark mb-3">Voter Directory</h2>
              <p className="text-gray-600 max-w-2xl font-sans text-sm md:text-base px-4">Search the official registry to confirm your details. Filter by class or search by Name, CNIC, NTN, or MSNO.</p>
            </div>
            
            <div className="flex flex-col lg:flex-row w-full mb-8 md:mb-12 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden no-print">
              <div className="w-full lg:w-2/3 flex items-center px-4">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                  type="text" 
                  placeholder="Search Name, CNIC, NTN, Phone or MSNO..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full p-4 md:p-5 outline-none text-gray-700 font-sans text-sm md:text-base placeholder-gray-400 bg-transparent" 
                />
              </div>
              <div className="w-full lg:w-1/3 flex bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 p-2 gap-2">
                {['All', 'A Class', 'C Class'].map((cls) => (
                  <button key={cls} onClick={() => setFilterClass(cls)} className={`flex-1 py-2.5 md:py-3 font-sans font-semibold text-xs md:text-sm rounded-lg transition-all ${filterClass === cls ? 'bg-brand-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>{cls}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap -mx-2 md:-mx-3 items-start">
              {loading ? (
                <div className="w-full py-16 md:py-20 text-center flex flex-col items-center no-print">
                   <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-brand-primary mb-4"></div>
                   <span className="font-sans text-gray-600 text-sm md:text-base">Searching Registry...</span>
                </div>
              ) : !searchTerm.trim() ? (
                <div className="w-full bg-white rounded-xl text-center py-16 md:py-20 px-6 border border-gray-200 shadow-sm no-print">
                  <svg className="w-12 h-12 md:w-16 md:h-16 text-brand-sky mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <h3 className="font-heading font-bold text-lg md:text-xl text-gray-800 mb-2">Find Your Registration</h3>
                  <p className="font-sans text-gray-500 text-xs md:text-sm">Enter a query above to securely search the database.</p>
                </div>
              ) : voters.length > 0 ? (
                voters.map((voter, index) => {
                  const isExpanded = expandedIndex === index;

                  return (
                    <div key={index} className={`p-2 md:p-3 transition-all duration-300 ${isExpanded ? 'w-full flex-shrink-0' : 'w-full md:w-1/2 lg:w-1/3 no-print'}`}>
                      {isExpanded ? (
                        <div id="print-area" className="w-full bg-white rounded-xl shadow-lg border border-brand-primary overflow-hidden print:shadow-none print:border-none font-sans relative transition-all duration-300">
                          
                          <div className="hidden print:block px-8 py-6 pb-0">
                            <h2 className="text-3xl font-black text-brand-dark border-b border-gray-200 pb-4">GCCI Voter Record</h2>
                          </div>

                          <div className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative">
                              <div className="pr-32 md:pr-40">
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-800">{renderValue(voter.REPRESENTATIVE_NAME)}</h3>
                                <p className="text-brand-primary font-medium text-sm md:text-base mt-1">{renderValue(voter.COMPANY_NAME)}</p>
                              </div>
                              
                              <div className="absolute top-0 right-0 border-[3px] border-[#cda03f] rounded-lg px-4 md:px-6 py-2 transform rotate-6 bg-white shadow-sm text-center print:border-gray-800 print:text-gray-800">
                                <div className="text-[#cda03f] print:text-gray-800 font-black text-lg md:text-xl leading-none">{renderValue(voter.MEMBER_CLASS)}</div>
                                <div className="text-[#cda03f] print:text-gray-800 text-[8px] md:text-[10px] tracking-[0.2em] font-bold mt-1 uppercase">Registered Voter</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 border-t border-b border-gray-200 py-6 mb-6">
                               <div className="flex flex-col">
                                 <span className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">Serial No.</span>
                                 <span className="text-base font-medium text-gray-800">{renderValue(voter.Sr_no)}</span>
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">MSNO</span>
                                 <span className="text-base font-medium text-gray-800">{renderValue(voter.MSNO)}</span>
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">Contact 1</span>
                                 <span className="text-base font-medium text-gray-800 font-mono">{renderValue(voter.CONTACT_1)}</span>
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">Contact 2</span>
                                 <span className="text-base font-medium text-gray-800 font-mono">{renderValue(voter.CONTACT_2)}</span>
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">CNIC</span>
                                 <span className="text-base font-medium text-gray-800 font-mono">{renderValue(voter.CNIC)}</span>
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">NTN</span>
                                 <span className="text-base font-medium text-gray-800 font-mono">{renderValue(voter.NTN)}</span>
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">GST</span>
                                 <span className="text-base font-medium text-gray-800 font-mono">{renderValue(voter.GST)}</span>
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">City</span>
                                 <span className="text-base font-medium text-gray-800">{renderValue(voter.CITY)}</span>
                               </div>
                            </div>

                            <div className="mb-6 border-b border-gray-200 pb-6">
                               <span className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1 block">Business Address</span>
                               <span className="text-base font-medium text-gray-800">{renderValue(voter.ADDRESS)}</span>
                            </div>

                            <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                               <img src="farhan.jpeg" alt="Rana Farhan Asghar" className="w-14 h-14 rounded-full object-cover border-2 border-brand-primary bg-white" />
                               <div>
                                  <h4 className="font-bold text-brand-dark text-lg">Vote for Rana Farhan Asghar</h4>
                                  <p className="text-gray-600 text-xs md:text-sm mt-1">For Executive Member, GCCI 2026–2028 · Business Group Gujranwala</p>
                               </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 px-6 py-4 flex flex-wrap gap-4 no-print border-t border-gray-200">
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`Record: ${renderValue(voter.REPRESENTATIVE_NAME)} - Serial: ${renderValue(voter.Sr_no)}`); alert('Copied to clipboard!'); }} 
                              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition text-sm flex items-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                              Copy Details
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); window.print(); }} 
                              className="px-5 py-2 rounded-lg bg-brand-primary text-white font-medium hover:bg-brand-dark transition shadow-sm text-sm flex items-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                              Print
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleExpand(index); }} 
                              className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition text-sm ml-auto"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="bg-white rounded-xl flex flex-col transition-all cursor-pointer border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-sky"
                          onClick={() => toggleExpand(index)}
                        >
                          <div className="px-5 py-4 md:px-6 md:py-5 flex justify-between items-start border-b border-gray-100">
                            <span className="font-heading font-bold text-gray-800 text-base md:text-lg leading-tight pr-3 truncate block">
                              {renderValue(voter.COMPANY_NAME) || 'GCCI Corp'}
                            </span>
                            <span className={`text-[10px] md:text-xs font-bold px-2 py-1 md:px-3 md:py-1 rounded-full whitespace-nowrap ${
                              voter.MEMBER_CLASS === 'A Class' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {renderValue(voter.MEMBER_CLASS) || 'Class'}
                            </span>
                          </div>
                          
                          <div className="p-5 md:p-6 flex flex-col font-sans text-xs md:text-sm">
                            <div className="mb-4">
                              <span className="block text-gray-400 text-[10px] md:text-xs uppercase tracking-wider mb-1">Rep Name</span> 
                              <span className="text-gray-800 font-medium text-sm md:text-base">{renderValue(voter.REPRESENTATIVE_NAME)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="block text-gray-400 text-[10px] md:text-xs uppercase tracking-wider mb-1">CNIC</span> 
                                <span className="text-gray-600 font-mono">{renderValue(voter.CNIC)}</span>
                              </div>
                              <div className="text-right">
                                 <span className="block text-gray-400 text-[10px] md:text-xs uppercase tracking-wider mb-1">Serial</span>
                                 <span className="text-gray-800 font-medium">#{renderValue(voter.Sr_no)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="w-full bg-white rounded-xl text-center py-16 md:py-20 px-6 border border-gray-200 shadow-sm no-print">
                  <h3 className="font-heading font-bold text-lg md:text-xl text-gray-800 mb-2">No Voters Found</h3>
                  <p className="font-sans text-gray-500 text-xs md:text-sm">No records match "{searchTerm}".</p>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* 7. FOOTER */}
        <footer className="w-full bg-gray-900 pt-12 md:pt-16 pb-6 md:pb-8 px-4 md:px-6 flex flex-col items-center no-print">
          <h2 className="font-heading font-bold text-xl md:text-2xl text-white mb-6">
            Business <span className="text-brand-sky">Group</span>
          </h2>
          <div className="w-full max-w-4xl border-t border-gray-800 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 font-sans text-[10px] md:text-xs text-center md:text-left mb-4 md:mb-0">
              &copy; 2026 Business Group. Campaigning for Gujranwala Chamber of Commerce & Industry.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}