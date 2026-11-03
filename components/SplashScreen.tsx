import React from 'react';

const SplashScreen: React.FC = () => (
  <main className="splash-screen" aria-label="Embroidery Statement loading">
    <div className="splash-grid" aria-hidden="true" />
    <div className="splash-glow splash-glow-one" aria-hidden="true" />
    <div className="splash-glow splash-glow-two" aria-hidden="true" />
    <div className="splash-content">
      <div className="splash-logo-stage">
        <div className="splash-ring splash-ring-one" />
        <div className="splash-ring splash-ring-two" />
        <img src="/embroidery-statement-logo.jpg" alt="Embroidery Statement" className="splash-logo" />
      </div>
      <div className="splash-wordmark">EMBROIDERY <span>STATEMENT</span></div>
      <p className="splash-caption">BUSINESS MANAGEMENT WORKSPACE</p>
      <div className="splash-progress"><span /></div>
      <p className="splash-loading">Preparing your workspace<span className="splash-dots">...</span></p>
    </div>
  </main>
);

export default SplashScreen;
