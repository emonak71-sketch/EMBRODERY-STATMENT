import React, {useEffect,useRef} from 'react';
import {desktopInvoke,desktopListen,isWindowsDesktop} from './tauriBridge';

type UpdateInfo={available_version:string|null;portable:boolean;configured:boolean};
const OwnerDesktopHost:React.FC<{children:React.ReactNode}>=({children})=>{
 const checking=useRef(false);
 useEffect(()=>{
  if(!isWindowsDesktop())return;
  let mounted=true;
  const check=async()=>{
   if(!mounted||checking.current)return;
   checking.current=true;
   try{
    const info=await desktopInvoke<UpdateInfo>('desktop_check_update');
    if(mounted&&info.configured&&info.available_version&&!info.portable){
     await desktopInvoke('desktop_install_update');
    }
   }catch(error){
    console.warn('Owner Control Center automatic update check failed; it will retry.',error);
   }finally{checking.current=false;}
  };
  void check();
  let unlisten:(()=>void)|undefined;
  void desktopListen('desktop:check-updates',()=>void check()).then(fn=>{unlisten=fn;});
  const timer=window.setInterval(()=>void check(),6*60*60*1000);
  return()=>{mounted=false;window.clearInterval(timer);unlisten?.();};
 },[]);
 return <>{children}</>;
};
export default OwnerDesktopHost;
