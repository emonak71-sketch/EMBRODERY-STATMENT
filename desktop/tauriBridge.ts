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
};

declare global {
  interface Window {
    __TAURI__?: NativeApi;
  }
}

export function isWindowsDesktop(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__TAURI__?.core?.invoke);
}

export async function desktopInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isWindowsDesktop()) throw new Error('Windows desktop feature is unavailable in the web application.');
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
