import React from 'react';
import { desktopInvoke, isWindowsDesktop } from '../desktop/tauriBridge';

export default class StartupBoundary extends React.Component<React.PropsWithChildren, {failed: boolean}> {
  declare props: React.PropsWithChildren;
  state = {failed: false};
  componentDidMount() {
    requestAnimationFrame(() => {
      if (this.state.failed) return;
      document.documentElement.dataset.appReady = 'true';
      if (isWindowsDesktop()) void desktopInvoke('desktop_startup_ready').catch(console.warn);
    });
  }
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch(error: Error) { console.error('Application startup failed', error); }
  render() {
    if (this.state.failed) return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#071a35',color:'#fff',fontFamily:'system-ui',padding:24}}>
      <div><h1 style={{fontSize:24,fontWeight:700}}>Embroidery Statement</h1>
        <p>The application could not finish loading. Please reopen it or try again.</p>
        <button type="button" onClick={()=>window.location.reload()} style={{marginTop:20,padding:'12px 24px',background:'#0369a1',color:'#fff',border:0,borderRadius:12}}>Try Again</button>
      </div>
    </main>;
    return this.props.children;
  }
}
