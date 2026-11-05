/* Desktop bridge uses the official Tauri 2 global API.
   No native code is imported by the web or mobile PWA bundle. */
type NativeEvent<T> = { event: string; payload: T };
type NativeApi = {
  core: {
    invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  };
  event: {
    listen: <T>(event: string, handler: (event: NativeEvent<T>) => void) => Promise<() => void>;
  };
  opener: {
    openUrl: (url: string, openWith?: string) => Promise<void>;
  };
};

declare global {
  interface Window {
    __TAURI__?: NativeApi;
  }
}

export function isTauriApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__TAURI__?.core?.invoke);
}

export function isAndroidTauriApp(): boolean {
  return isTauriApp() && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

export function isWindowsDesktop(): boolean {
  if (!isTauriApp()) return false;
  return !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function desktopOpenUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== 'github.com' ||
    !parsed.pathname.startsWith('/emonak71-sketch/EMBRODERY-STATMENT/releases/download/') ||
    !parsed.pathname.endsWith('/Embroidery-Statement-Android.apk')
  ) {
    throw new Error('Only official Embroidery Statement release URLs can be opened.');
  }
  if (!isTauriApp()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await window.__TAURI__!.opener.openUrl(url);
}

export async function desktopInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriApp()) throw new Error('Native application feature is unavailable in the web application.');
  return window.__TAURI__!.core.invoke<T>(command, args);
}

export async function desktopListen<T>(
  name: string, handler: (payload: T) => void,
): Promise<() => void> {
  if (!isWindowsDesktop()) return () => undefined;
  return window.__TAURI__!.event.listen<T>(name, event => handler(event.payload));
}

export type DesktopNavigation = {
  tab: 'workers' | 'settings';
  session?: 'morning' | 'night';
};

export function navigateDesktop(target: DesktopNavigation): void {
  window.dispatchEvent(new CustomEvent('embroidery:desktop-navigation', { detail: target }));
}
