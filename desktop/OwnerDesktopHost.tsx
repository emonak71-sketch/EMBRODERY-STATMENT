import React,{useEffect} from 'react';
import {desktopListen,isWindowsDesktop} from './tauriBridge';
import DesktopUpdatePrompt from './DesktopUpdatePrompt';

const OwnerDesktopHost:React.FC<{children:React.ReactNode}>=({children})=>{
 useEffect(()=>{
  if(!isWindowsDesktop())return;
  let disposed=false;
  let unlisten:(()=>void)|undefined;
  void desktopListen('desktop:check-updates',()=>{
   window.dispatchEvent(new Event('embroidery:owner-open-updates'));
  }).then(fn=>{if(disposed)fn();else unlisten=fn;});
  return()=>{disposed=true;unlisten?.();};
 },[]);
 return <>{children}<DesktopUpdatePrompt audience="owner" /></>;
};
export default OwnerDesktopHost;
