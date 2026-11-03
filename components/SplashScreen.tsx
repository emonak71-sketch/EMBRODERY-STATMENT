import React from 'react';

const SplashScreen: React.FC = () => (
  <main className="splash-screen splash-machine-scene" aria-label="Embroidery Statement machine stitching logo">
    <div className="splash-grid" aria-hidden="true" />
    <div className="splash-glow splash-glow-one" aria-hidden="true" />
    <div className="splash-glow splash-glow-two" aria-hidden="true" />

    <div className="machine-scene-content">
      <div className="machine-scene-kicker"><span /> PREMIUM EMBROIDERY WORKSPACE <span /></div>
      <div className="machine-stage">
        <svg className="machine-illustration" viewBox="0 0 1200 700" role="img" aria-label="A computerized embroidery machine stitching the Embroidery Statement logo">
          <defs>
            <linearGradient id="machineSteel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f7fbff" /><stop offset=".18" stopColor="#9eb7d5" /><stop offset=".42" stopColor="#f4f8ff" /><stop offset=".68" stopColor="#607b9e" /><stop offset="1" stopColor="#dceaff" />
            </linearGradient>
            <linearGradient id="machineBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f4f9ff" /><stop offset=".24" stopColor="#b7cbe3" /><stop offset=".52" stopColor="#6c88ad" /><stop offset=".78" stopColor="#dbe8f8" /><stop offset="1" stopColor="#536e93" />
            </linearGradient>
            <linearGradient id="machineDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#27476d" /><stop offset=".5" stopColor="#0d2546" /><stop offset="1" stopColor="#06162d" />
            </linearGradient>
            <linearGradient id="machineScreen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#062b50" /><stop offset="1" stopColor="#07172c" />
            </linearGradient>
            <linearGradient id="fabricGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#24456c" /><stop offset=".16" stopColor="#102b4d" /><stop offset="1" stopColor="#06162d" />
            </linearGradient>
            <linearGradient id="threadGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#05d6ed" /><stop offset=".5" stopColor="#75f2ff" /><stop offset="1" stopColor="#1782ff" />
            </linearGradient>
            <radialGradient id="machineLight">
              <stop offset="0" stopColor="#67e9ff" stopOpacity=".95" /><stop offset="1" stopColor="#168bff" stopOpacity="0" />
            </radialGradient>
            <pattern id="fabricWeave" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M0 2H12 M0 8H12" stroke="#8eb7e5" strokeOpacity=".15" strokeWidth="1" />
              <path d="M2 0V12 M8 0V12" stroke="#020b1b" strokeOpacity=".35" strokeWidth="1" />
            </pattern>
            <filter id="machineShadow" x="-30%" y="-30%" width="160%" height="180%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="13" /><feOffset dy="16" /><feComponentTransfer><feFuncA type="linear" slope=".48" /></feComponentTransfer><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="threadGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <clipPath id="logoStitchReveal" clipPathUnits="userSpaceOnUse">
              <rect className="machine-logo-reveal" x="480" y="388" width="0" height="238" />
            </clipPath>
          </defs>

          <ellipse cx="600" cy="350" rx="440" ry="45" fill="#1b8cff" opacity=".12" filter="url(#threadGlow)" />
          <g className="embroidery-fabric" filter="url(#machineShadow)">
            <rect x="100" y="354" width="1000" height="292" rx="28" fill="url(#fabricGradient)" stroke="#7397c3" strokeOpacity=".7" strokeWidth="4" />
            <rect x="114" y="368" width="972" height="264" rx="19" fill="url(#fabricWeave)" opacity=".9" />
            <rect x="126" y="380" width="948" height="240" rx="14" fill="none" stroke="#8bb8e9" strokeOpacity=".48" strokeWidth="2" strokeDasharray="3 8" />
            <path d="M130 405H1070 M130 607H1070" stroke="#c2ddff" strokeOpacity=".08" strokeWidth="2" />
            <path d="M155 395V610 M1045 395V610" stroke="#c2ddff" strokeOpacity=".06" strokeWidth="2" />
            <path d="M100 382Q80 354 120 342H1080Q1120 354 1100 382" fill="none" stroke="#a7c8ec" strokeOpacity=".3" strokeWidth="6" />
            <path d="M122 652H1078" stroke="#7db8ef" strokeOpacity=".35" strokeWidth="3" />
          </g>

          <g className="machine-rail">
            <rect x="180" y="83" width="840" height="42" rx="12" fill="url(#machineDark)" stroke="#7897bb" strokeWidth="3" />
            <rect x="194" y="91" width="812" height="8" rx="4" fill="#b7d5f6" opacity=".58" />
            <rect x="205" y="108" width="790" height="5" rx="2.5" fill="#020b1a" opacity=".8" />
            <circle cx="202" cy="104" r="9" fill="url(#machineSteel)" /><circle cx="998" cy="104" r="9" fill="url(#machineSteel)" />
            <path d="M175 125V150 M1025 125V150" stroke="#7898bc" strokeWidth="12" strokeLinecap="round" />
          </g>

          <g className="machine-carriage">
            <g transform="translate(600 0)" filter="url(#machineShadow)">
              <rect x="-165" y="60" width="330" height="38" rx="12" fill="url(#machineSteel)" stroke="#d7eaff" strokeWidth="2" />
              <rect x="-150" y="69" width="300" height="7" rx="3.5" fill="#fff" opacity=".7" />
              <path d="M-130 92H130" stroke="#304f75" strokeWidth="5" />
              <path d="M-122 98Q-122 75 -96 75H96Q122 75 122 101V266Q122 286 101 286H76V331H-76V286H-101Q-122 286 -122 266Z" fill="url(#machineBody)" stroke="#d6e8fc" strokeWidth="3" />
              <path d="M-111 112Q-111 88 -87 88H87Q111 88 111 112V130H-111Z" fill="#fff" opacity=".3" />
              <path d="M-105 143H105V258H-105Z" fill="url(#machineDark)" stroke="#7898bd" strokeWidth="2" />
              <rect x="-82" y="158" width="164" height="74" rx="10" fill="url(#machineScreen)" stroke="#9dc5ef" strokeWidth="2" />
              <rect x="-72" y="168" width="144" height="54" rx="6" fill="#09274a" />
              <path d="M-58 205L-34 190L-9 199L18 177L47 191L62 179" fill="none" stroke="#31d5ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="52" cy="181" r="4" fill="#a4f5ff" filter="url(#threadGlow)" />
              <text x="-62" y="181" fill="#b7d8ff" fontSize="8" fontWeight="700" letterSpacing="1.4">STITCH CONTROL</text>
              <circle cx="-55" cy="246" r="7" fill="#1a3c64" stroke="#b8d4f4" strokeWidth="2" /><circle cx="-25" cy="246" r="7" fill="#1a3c64" stroke="#b8d4f4" strokeWidth="2" /><circle cx="5" cy="246" r="7" fill="#1a3c64" stroke="#b8d4f4" strokeWidth="2" /><circle cx="35" cy="246" r="7" fill="#1a3c64" stroke="#b8d4f4" strokeWidth="2" /><circle cx="65" cy="246" r="7" fill="#1a3c64" stroke="#b8d4f4" strokeWidth="2" />
              <path d="M-120 121H-138V255H-120" fill="none" stroke="#e8f4ff" strokeWidth="5" opacity=".7" /><path d="M120 121H138V255H120" fill="none" stroke="#49698f" strokeWidth="5" />
              <rect x="-33" y="17" width="66" height="58" rx="14" fill="url(#machineDark)" stroke="#8eabc9" strokeWidth="3" />
              <path d="M-23 27H23" stroke="#d3e5f8" strokeWidth="3" strokeLinecap="round" /><circle cx="-10" cy="47" r="4" fill="#27d4ee" /><circle cx="10" cy="47" r="4" fill="#27d4ee" />
              <g className="machine-spool">
                <rect x="54" y="4" width="42" height="62" rx="7" fill="#102c4f" stroke="#a9c9ec" strokeWidth="2" />
                <path d="M58 12H92 M58 20H92 M58 28H92 M58 36H92 M58 44H92 M58 52H92" stroke="#24c7e7" strokeWidth="3" opacity=".8" />
                <path d="M50 5H100 M50 65H100" stroke="#e5f2ff" strokeWidth="5" strokeLinecap="round" />
                <rect x="69" y="-12" width="12" height="17" rx="4" fill="url(#machineSteel)" />
              </g>
              <path className="machine-thread-line" d="M76 6C88 38 25 48 18 88C12 132 0 158 0 202L0 336" fill="none" stroke="url(#threadGradient)" strokeWidth="3.5" strokeLinecap="round" filter="url(#threadGlow)" />
              <circle cx="0" cy="336" r="5" fill="#8ff7ff" filter="url(#threadGlow)" />
              <g className="machine-needle-bounce">
                <rect x="-9" y="263" width="18" height="74" rx="5" fill="url(#machineSteel)" stroke="#f0f7ff" strokeWidth="1.5" />
                <path d="M-2 337L0 359L2 337Z" fill="#e7f3ff" stroke="#8ca9c9" strokeWidth="1" />
                <path d="M-2 344L0 358L2 344" fill="none" stroke="#12d9ee" strokeWidth="1.5" />
                <path d="M-31 332H31L22 346H-22Z" fill="url(#machineSteel)" stroke="#c5dcf5" strokeWidth="2" />
                <rect x="-39" y="325" width="78" height="9" rx="4" fill="#1c3d61" stroke="#b8d5f4" strokeWidth="2" />
              </g>
              <path d="M-143 119H-126 M126 119H143" stroke="#f4f9ff" strokeWidth="4" strokeLinecap="round" />
              <circle cx="-99" cy="105" r="5" fill="#fff" /><circle cx="99" cy="105" r="5" fill="#fff" /><circle cx="-99" cy="270" r="5" fill="#fff" /><circle cx="99" cy="270" r="5" fill="#fff" />
              <path d="M-112 280H112" stroke="#203f66" strokeWidth="5" opacity=".6" /><path d="M-72 289V319 M72 289V319" stroke="#9bb8d9" strokeWidth="7" strokeLinecap="round" /><path d="M-75 319H75" stroke="#d9eaff" strokeWidth="5" strokeLinecap="round" />
              <circle cx="0" cy="356" r="17" fill="url(#machineLight)" opacity=".8" />
            </g>
          </g>

          <g className="machine-logo-work">
            <image href="/embroidery-statement-logo.svg?v=1" x="480" y="388" width="238" height="238" preserveAspectRatio="xMidYMid meet" clipPath="url(#logoStitchReveal)" />
            <rect x="472" y="380" width="254" height="254" rx="12" fill="none" stroke="#5adff4" strokeWidth="3" strokeDasharray="7 9" pathLength="1000" className="machine-logo-stitches" filter="url(#threadGlow)" />
            <path d="M470 374H730V640H470Z" fill="none" stroke="#a8d8ff" strokeOpacity=".35" strokeWidth="2" strokeDasharray="3 8" />
          </g>
          <g className="machine-needle-sparks" filter="url(#threadGlow)">
            <circle cx="600" cy="363" r="5" fill="#8ef7ff" /><circle cx="584" cy="373" r="2.5" fill="#1eb7ff" /><circle cx="616" cy="376" r="2.5" fill="#1eb7ff" />
          </g>
        </svg>
        <div className="machine-stage-reflection" aria-hidden="true" />
      </div>

      <div className="splash-finished-brand">
        <div className="splash-wordmark">EMBROIDERY <span>STATEMENT</span></div>
        <p className="splash-caption">BUSINESS MANAGEMENT WORKSPACE</p>
      </div>
      <div className="splash-progress"><span /></div>
      <p className="splash-loading">STITCHING YOUR BRAND INTO EVERY DETAIL<span className="splash-dots">...</span></p>
    </div>
  </main>
);

export default SplashScreen;
