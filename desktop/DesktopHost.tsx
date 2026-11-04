import React, {useEffect, useRef} from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../services/supabaseClient';
import { dbService } from '../services/supabaseService';
import {
  attendanceCompleteness, bangladeshClock, dueSessions, reminderTranslations,
  AttendanceSession,
} from './attendanceCore';
import {desktopInvoke, desktopListen, isWindowsDesktop, navigateDesktop, DesktopNavigation} from './tauriBridge';
import {readReminderPreferences} from '../components/DesktopSettings';

type DesktopUpdateInfo = {
  current_version:string; available_version:string|null; notes:string|null; portable:boolean; configured:boolean;
};

const DesktopHost:React.FC<{children:React.ReactNode}> = ({children}) => {
  const {language} = useLanguage();
  const languageRef = useRef(language);
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);
  useEffect(()=>{languageRef.current=language;},[language]);

  useEffect(()=>{
    if (!isWindowsDesktop()) return;
    let mounted=true;
    const cleanups:Array<() => void>=[];
    const fire = async(force=false) => {
      if (!mounted || checkingRef.current) return;
      const now = Date.now();
      if (!force && now-lastCheckRef.current<45000) return;
      lastCheckRef.current=now;
      const prefs=readReminderPreferences();
      if (!prefs.enabled) return;
      const clock=bangladeshClock();
      const sessions=dueSessions(clock.minutes,prefs);
      if (sessions.length===0) return;

      checkingRef.current=true;
      try {
        const {data:{session},error:sessionError}=await supabase.auth.getSession();
        if (sessionError || !session?.user) return;
        const userId=session.user.id;
        const workers=await dbService.getWorkers();
        for(const attendanceSession of sessions) {
          const idempotency='desktop:reminder:v1:'+userId+':'+clock.date+':'+attendanceSession;
          if (localStorage.getItem(idempotency)==='sent') continue;
          const rows=attendanceSession==='morning'
            ? await dbService.getWorkerAttendance(clock.date)
            : await dbService.getWorkerNightAttendance(clock.date);
          const result=attendanceCompleteness(workers,rows,clock.date);
          if (result.complete || result.expected===0) continue;

          const claimed=await dbService.claimAttendanceReminder(clock.date,attendanceSession);
          if(!claimed){
            localStorage.setItem(idempotency,'sent');
            continue;
          }

          // Re-check after atomic claim to avoid a reminder if another
          // device saved attendance during the claim race.
          // On ANY verification or native-notification failure, release the
          // claim so the next scheduler tick can retry.
          let successfullyNotified = false;
          try {
            const current=attendanceSession==='morning'
              ? await dbService.getWorkerAttendance(clock.date)
              : await dbService.getWorkerNightAttendance(clock.date);
            if (!attendanceCompleteness(workers,current,clock.date).complete) {
              const translated=reminderTranslations[languageRef.current];
              await desktopInvoke('desktop_notify_attendance',{
                title:translated.title,
                body:translated[attendanceSession],
                session:attendanceSession,
              });
              successfullyNotified=true;
              localStorage.setItem(idempotency,'sent');
            }
          } finally {
            if(!successfullyNotified) {
              await dbService.releaseAttendanceReminder(clock.date,attendanceSession);
            }
          }
        }
      } catch (error) {
        // Database unavailable: retry next tick, never classify missing attendance on failure.
        console.warn('Attendance verification temporarily unavailable; will retry',error);
      } finally {
        checkingRef.current=false;
      }
    };

    const checkStartupUpdates=async()=>{
      try {
        const info=await desktopInvoke<DesktopUpdateInfo>('desktop_check_update');
        localStorage.setItem('desktop_last_update_check',new Date().toLocaleString());
        if(info.available_version && !info.portable &&
           localStorage.getItem('desktop_update_dismissed')!==info.available_version){
          await desktopInvoke('desktop_notify_update',{version:info.available_version});
          window.dispatchEvent(new CustomEvent('embroidery:update-available',{detail:info}));
        }
      } catch {
        // Unconfigured updater or no release yet: settings offers manual diagnostics.
      }
    };

    void desktopListen<DesktopNavigation>('desktop:navigate', target=>navigateDesktop(target))
      .then(unlisten=>cleanups.push(unlisten));
    void desktopListen('desktop:scheduler-tick',()=>void fire())
      .then(unlisten=>cleanups.push(unlisten));
    void desktopListen('desktop:check-updates',()=>{
      window.dispatchEvent(new CustomEvent('embroidery:check-updates'));
      navigateDesktop({tab:'settings'});
    }).then(unlisten=>cleanups.push(unlisten));
    void desktopInvoke<DesktopNavigation|null>('desktop_take_navigation').then(target=>{
      if(target) navigateDesktop(target);
    }).catch(()=>undefined);

    const checkWhenVisible=()=>{if(!document.hidden) void fire(true);};
    const checkAfterSave=()=>{lastCheckRef.current=0;void fire(true);};
    const languageChanged=()=>{languageRef.current=(localStorage.getItem('app_language')==='bn'?'bn':'en');};
    document.addEventListener('visibilitychange',checkWhenVisible);
    window.addEventListener('focus',checkWhenVisible);
    window.addEventListener('embroidery:attendance-saved',checkAfterSave);
    window.addEventListener('embroidery:reminder-preferences',checkAfterSave);
    window.addEventListener('storage',languageChanged);
    void fire(true);
    void checkStartupUpdates();

    return ()=>{
      mounted=false;
      cleanups.forEach(cleanup=>cleanup());
      document.removeEventListener('visibilitychange',checkWhenVisible);
      window.removeEventListener('focus',checkWhenVisible);
      window.removeEventListener('embroidery:attendance-saved',checkAfterSave);
      window.removeEventListener('embroidery:reminder-preferences',checkAfterSave);
      window.removeEventListener('storage',languageChanged);
    };
  },[]);

  return <>{children}</>;
};

export default DesktopHost;
