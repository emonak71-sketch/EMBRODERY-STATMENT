import React from 'react';

const SplashScreen: React.FC = () => (
  <main className="customer-brand-intro" role="status" aria-live="polite" aria-label="Opening Embroidery Statement">
    <div className="brand-intro-halo" aria-hidden="true" />
    <div className="brand-intro-content">
      <div className="brand-intro-emblem" aria-hidden="true">
        <svg className="brand-intro-thread" viewBox="0 0 180 180" fill="none">
          <rect x="8" y="8" width="164" height="164" rx="42" stroke="url(#intro-thread)" strokeWidth="1.5" />
          <defs><linearGradient id="intro-thread" x1="0" y1="0" x2="180" y2="180"><stop stopColor="#38bdf8"/><stop offset="1" stopColor="#2563eb"/></linearGradient></defs>
        </svg>
        <img src="/embroidery-statement-mark.svg" alt="" className="brand-intro-logo" />
      </div>
      <div className="brand-intro-wordmark"><h1>EMBROIDERY<span>STATEMENT</span></h1><p>Your business. Beautifully organised.</p></div>
      <div className="brand-intro-loading" aria-hidden="true"><span/><span/><span/></div>
      <p className="brand-intro-status">Opening your workspace</p>
    </div>
  </main>
);
export default SplashScreen;
