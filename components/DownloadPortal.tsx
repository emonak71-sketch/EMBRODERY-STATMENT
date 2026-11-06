import React, { useEffect, useState } from 'react';
import {
  Apple, ArrowDownToLine, ArrowRight, BadgeCheck, CheckCircle2, Clock3,
  Cloud, Download, ExternalLink, FileCheck2, Globe, HardDrive, Laptop,
  LoaderCircle, Monitor, RefreshCw, ShieldCheck, Smartphone, Sparkles,
  Tablet, Wifi, Zap
} from 'lucide-react';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' | string }>;
};

type Device = {
  name: string;
  recommended: 'web' | 'windows' | 'android';
  apple?: 'ios' | 'mac';
};

export function detectDevice(ua: string, platform: string, touchPoints: number): Device {
  if (/Android/i.test(ua)) return { name: 'Android', recommended: 'android' };
  if (/iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(platform) && touchPoints > 1)) {
    return { name: /iPhone/i.test(ua) ? 'iPhone' : 'iPad', recommended: 'web', apple: 'ios' };
  }
  if (/Windows NT/i.test(ua) || /Win/i.test(platform)) return { name: 'Windows', recommended: 'windows' };
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return { name: 'Mac', recommended: 'web', apple: 'mac' };
  return { name: 'your device', recommended: 'web' };
}

type Asset = {
  name: string;
  browser_download_url: string;
  size: number;
  digest?: string | null;
  content_type?: string | null;
  download_count?: number;
};

type Release = {
  tag_name: string;
  name?: string;
  body?: string;
  draft: boolean;
  prerelease: boolean;
  published_at?: string;
  html_url: string;
  assets: Asset[];
};

type DownloadItem = {
  version: string;
  url: string;
  size: number;
  digest?: string | null;
  publishedAt?: string;
  releaseUrl: string;
  notes: string;
};

const API = 'https://api.github.com/repos/emonak71-sketch/EMBRODERY-STATMENT/releases?per_page=30';
const RELEASES_URL = 'https://github.com/emonak71-sketch/EMBRODERY-STATMENT/releases';
const SUPPORT_EMAIL = 'support@embroderystatement.com';

const formatSize = (bytes: number) => {
  if (!bytes) return 'Size unavailable';
  return bytes < 1024 * 1024
    ? Math.max(1, Math.round(bytes / 1024)) + ' KB'
    : (bytes / 1024 / 1024).toFixed(1) + ' MB';
};

const formatDate = (value?: string) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const releaseSummary = (body?: string) => {
  const line = (body || '')
    .split('\n')
    .map(item => item.replace(/^\s*[-*#]+\s*/, '').trim())
    .find(item => item.length > 0);
  return line || 'Maintenance, reliability improvements and platform updates.';
};

const DownloadPortal: React.FC = () => {
  const [device] = useState(() =>
    detectDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)
  );
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');
  const [android, setAndroid] = useState<DownloadItem | null>(null);
  const [windows, setWindows] = useState<DownloadItem | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const ready = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const loadReleases = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(API, {
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!response.ok) throw new Error('Release service returned HTTP ' + response.status + '. Please retry.');
      const payload = await response.json() as Release[];
      const stable = payload.filter(release => !release.draft && !release.prerelease);
      const windowsRelease = stable.find(release =>
        /^v\d+\.\d+\.\d+$/.test(release.tag_name) &&
        release.assets.some(asset =>
          asset.name.toLowerCase().endsWith('.exe') &&
          !asset.name.toLowerCase().includes('owner') &&
          !asset.name.toLowerCase().includes('uninstall')
        )
      );
      const androidRelease = stable.find(release =>
        /^android-v\d+\.\d+\.\d+$/.test(release.tag_name) &&
        release.assets.some(asset => asset.name === 'Embroidery-Statement-Android.apk')
      );
      const windowsAsset = windowsRelease?.assets.find(asset =>
        asset.name.toLowerCase().endsWith('.exe') &&
        !asset.name.toLowerCase().includes('owner') &&
        !asset.name.toLowerCase().includes('uninstall')
      );
      const androidAsset = androidRelease?.assets.find(asset =>
        asset.name === 'Embroidery-Statement-Android.apk'
      );

      setWindows(windowsRelease && windowsAsset ? {
        version: windowsRelease.tag_name.slice(1),
        url: windowsAsset.browser_download_url,
        size: windowsAsset.size,
        digest: windowsAsset.digest,
        publishedAt: windowsRelease.published_at,
        releaseUrl: windowsRelease.html_url,
        notes: windowsRelease.body || ''
      } : null);

      setAndroid(androidRelease && androidAsset ? {
        version: androidRelease.tag_name.slice('android-v'.length),
        url: androidAsset.browser_download_url,
        size: androidAsset.size,
        digest: androidAsset.digest,
        publishedAt: androidRelease.published_at,
        releaseUrl: androidRelease.html_url,
        notes: androidRelease.body || ''
      } : null);

      setReleases(stable.filter(release =>
        /^v\d+\.\d+\.\d+$/.test(release.tag_name) ||
        /^android-v\d+\.\d+\.\d+$/.test(release.tag_name)
      ).slice(0, 6));
      setLastChecked(new Date());
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not load the latest downloads.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReleases();
  }, []);

  const install = async () => {
    if (!installPrompt || installing) return;
    setInstalling(true);
    setInstallError('');
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch {
      setInstallError('The install prompt could not open. Use your browser menu to install the Web App.');
    } finally {
      setInstalling(false);
    }
  };

  const recommended = (kind: Device['recommended']) => device.recommended === kind;
  const appVersion = windows?.version || android?.version || 'Latest';
  const currentPlatformLabel = device.recommended === 'windows'
    ? 'Windows desktop app'
    : device.recommended === 'android'
      ? 'Android app'
      : 'Web App';
  const webInstallGuide = device.apple === 'ios'
    ? 'On iPhone or iPad: open this page in Safari, tap Share, choose Add to Home Screen, then tap Add.'
    : device.apple === 'mac'
      ? 'On Mac: open the Web App in Safari and choose File → Add to Dock, or use your browser’s install option.'
      : 'Open the Web App and choose Install app or Add to Home Screen from your browser menu when available.';

  const releaseHistory = releases.map(release => ({
    ...release,
    platform: release.tag_name.startsWith('android-v') ? 'Android' : 'Windows & Web',
    version: release.tag_name.startsWith('android-v')
      ? release.tag_name.slice('android-v'.length)
      : release.tag_name.slice(1)
  }));

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f7fb] text-slate-900">
      <div className="relative isolate overflow-hidden bg-[#06152e] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{
          background:
            'radial-gradient(circle at 12% 18%, rgba(14,165,233,.28), transparent 30%), radial-gradient(circle at 88% 10%, rgba(37,99,235,.35), transparent 34%), radial-gradient(circle at 72% 100%, rgba(6,182,212,.15), transparent 34%)'
        }} />
        <div className="pointer-events-none absolute inset-0 opacity-[.12]" style={{
          backgroundImage: 'linear-gradient(rgba(148,190,255,.24) 1px, transparent 1px), linear-gradient(90deg, rgba(148,190,255,.24) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, black, transparent 85%)'
        }} />

        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <a href="/" className="flex min-w-0 items-center gap-3" aria-label="Embroidery Statement home">
            <img src="/embroidery-statement-mark.svg" alt="" className="h-11 w-11 rounded-xl bg-white p-1.5 shadow-lg shadow-sky-950/30" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-black tracking-tight sm:text-base">EMBROIDERY STATEMENT</span>
              <span className="block text-[9px] font-bold uppercase tracking-[.25em] text-sky-300">Business management suite</span>
            </span>
          </a>
          <div className="hidden items-center gap-7 text-xs font-semibold text-slate-300 md:flex">
            <a href="#downloads" className="transition hover:text-white">Downloads</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#updates" className="transition hover:text-white">Release history</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
          </div>
          <a href="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-4 py-2.5 text-[11px] font-bold text-white transition hover:bg-white/[.13]">
            Open Web App <ExternalLink size={13} />
          </a>
        </nav>

        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1.08fr_.92fr] lg:px-10 lg:pb-28 lg:pt-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[.17em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.9)]" />
              Official software download center
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.06] tracking-[-.055em] sm:text-5xl lg:text-[4.15rem]">
              Your embroidery business.
              <span className="mt-2 block bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                Connected everywhere.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Download the official Embroidery Statement app for Windows and Android, or use the secure Web App on iPhone, iPad and Mac. One account keeps your business records in sync across your devices.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#downloads" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-blue-950/40 transition hover:-translate-y-0.5 hover:brightness-110">
                <ArrowDownToLine size={17} /> Find my download <ArrowRight size={15} />
              </a>
              <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-6 py-3.5 text-sm font-bold text-slate-100 transition hover:bg-white/[.12]">
                View all releases <ExternalLink size={14} />
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-[11px] font-semibold text-slate-300">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300" /> Official release files</span>
              <span className="inline-flex items-center gap-2"><Cloud size={15} className="text-sky-300" /> Shared cloud data</span>
              <span className="inline-flex items-center gap-2"><RefreshCw size={14} className="text-cyan-300" /> Latest version lookup</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute -inset-8 rounded-[3rem] bg-sky-400/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-white/[.14] to-white/[.035] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-5">
              <div className="flex items-center justify-between border-b border-white/10 px-2 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-300/90" />
                  <span className="h-2 w-2 rounded-full bg-amber-300/90" />
                  <span className="h-2 w-2 rounded-full bg-emerald-300/90" />
                  <span className="ml-2 text-[10px] font-bold tracking-wide text-slate-300">WORKSPACE OVERVIEW</span>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-bold text-emerald-200">CLOUD CONNECTED</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 px-2 pb-4 pt-5">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-200">Embroidery Statement</div>
                  <div className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Business at a glance</div>
                  <div className="mt-1 text-[11px] text-slate-300">A unified workspace for your daily operations.</div>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-sky-200/20 bg-sky-300/10 text-sky-200">
                  <Sparkles size={23} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-[#071b39]/75 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400"><HardDrive size={13} /> Business records</div>
                  <div className="mt-3 text-lg font-black text-white">Organised</div>
                  <div className="mt-1 text-[10px] text-emerald-200">Customer & ledger data</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#071b39]/75 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400"><Wifi size={13} /> Device access</div>
                  <div className="mt-3 text-lg font-black text-white">Multi-device</div>
                  <div className="mt-1 text-[10px] text-sky-200">Windows · Android · Web</div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-[#071b39]/75 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-300">Choose your platform</span>
                  <span className="text-[9px] font-bold text-slate-500">ONE ACCOUNT</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-sky-300/25 bg-sky-300/10 p-3 text-center">
                    <Monitor className="mx-auto text-sky-200" size={19} />
                    <div className="mt-2 text-[10px] font-bold text-white">Windows</div>
                    <div className="mt-1 text-[9px] text-slate-400">EXE</div>
                  </div>
                  <div className="rounded-xl border border-violet-300/25 bg-violet-300/10 p-3 text-center">
                    <Smartphone className="mx-auto text-violet-200" size={19} />
                    <div className="mt-2 text-[10px] font-bold text-white">Android</div>
                    <div className="mt-1 text-[9px] text-slate-400">APK</div>
                  </div>
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-center">
                    <Globe className="mx-auto text-emerald-200" size={19} />
                    <div className="mt-2 text-[10px] font-bold text-white">Apple / Web</div>
                    <div className="mt-1 text-[9px] text-slate-400">PWA</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between px-1 text-[9px] font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1.5"><BadgeCheck size={12} className="text-emerald-300" /> Official customer downloads</span>
                <span>Version {appVersion}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="downloads" className="scroll-mt-8 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.23em] text-blue-700">Choose your platform</div>
              <h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-slate-950 sm:text-4xl">Get the right app for your device.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">We detected <strong>{device.name}</strong>. Your recommended option is highlighted, but every platform remains available below.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-bold text-slate-600 shadow-sm">
                <span className={'h-2 w-2 rounded-full ' + (loading ? 'bg-amber-400 animate-pulse' : error ? 'bg-rose-500' : 'bg-emerald-500')} />
                {loading ? 'Checking latest releases' : error ? 'Release check needs attention' : 'Release information up to date'}
              </div>
              <button onClick={() => void loadReleases()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-extrabold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-50">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="mt-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
              <span>{error} Previously published release links may still be available through the release archive.</span>
              <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold underline underline-offset-4">Open release archive <ExternalLink size={13} /></a>
            </div>
          )}

          {loading && !windows && !android && (
            <div className="mt-8 flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-10 text-sm font-semibold text-slate-500 shadow-sm">
              <LoaderCircle size={19} className="animate-spin text-blue-600" /> Checking the official release archive…
            </div>
          )}

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <article className={'relative flex flex-col rounded-[1.65rem] border bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(15,23,42,.1)] ' + (recommended('windows') ? 'border-blue-400 ring-4 ring-blue-100' : 'border-slate-200')}>
              {recommended('windows') && <div className="absolute -top-3 left-6 rounded-full bg-blue-600 px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white shadow-lg">Recommended for you</div>}
              <div className="flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Monitor size={27} /></div>
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-blue-700">Desktop app</span>
              </div>
              <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">Windows</h3>
              <p className="mt-2 min-h-[48px] text-xs leading-6 text-slate-600">A dedicated desktop experience for Windows 10 and 11. Download the official customer installer.</p>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-[10px] text-slate-500"><span>Latest customer version</span><span className="font-black text-slate-900">{windows ? 'v' + windows.version : 'Checking…'}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Installer format</span><span className="font-bold text-slate-800">Windows EXE</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>File size</span><span className="font-bold text-slate-800">{windows ? formatSize(windows.size) : 'Not available'}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Published</span><span className="font-bold text-slate-800">{formatDate(windows?.publishedAt)}</span></div>
              </div>
              {windows ? (
                <a href={windows.url} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-xs font-black text-white shadow-lg shadow-blue-700/15 transition hover:bg-blue-800">
                  <Download size={16} /> Download Windows EXE <ArrowRight size={14} />
                </a>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-center text-xs font-semibold text-slate-500">Latest signed installer is not available.</div>
              )}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500"><ShieldCheck size={13} className="text-emerald-600" /> Customer installer · digitally signed release</div>
              {windows?.digest && <details className="mt-4 rounded-xl border border-slate-200 px-3 py-2"><summary className="cursor-pointer text-[10px] font-bold text-slate-600">View SHA-256 checksum</summary><code className="mt-2 block break-all text-[9px] leading-5 text-slate-500">{windows.digest.replace('sha256:', '')}</code></details>}
              {windows && <a href={windows.releaseUrl} target="_blank" rel="noreferrer" className="mt-3 text-center text-[10px] font-bold text-blue-700 hover:underline">Release notes and file archive <ExternalLink size={11} className="inline" /></a>}
            </article>

            <article className={'relative flex flex-col rounded-[1.65rem] border bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(15,23,42,.1)] ' + (recommended('android') ? 'border-violet-400 ring-4 ring-violet-100' : 'border-slate-200')}>
              {recommended('android') && <div className="absolute -top-3 left-6 rounded-full bg-violet-600 px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white shadow-lg">Recommended for you</div>}
              <div className="flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Smartphone size={27} /></div>
                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-violet-700">Mobile app</span>
              </div>
              <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">Android</h3>
              <p className="mt-2 min-h-[48px] text-xs leading-6 text-slate-600">Install the Android customer app directly using the signed APK package. Android will ask you to approve installation.</p>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-[10px] text-slate-500"><span>Latest customer version</span><span className="font-black text-slate-900">{android ? 'v' + android.version : 'Checking…'}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Package format</span><span className="font-bold text-slate-800">Android APK</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>File size</span><span className="font-bold text-slate-800">{android ? formatSize(android.size) : 'Not available'}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Published</span><span className="font-bold text-slate-800">{formatDate(android?.publishedAt)}</span></div>
              </div>
              {android ? (
                <a href={android.url} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-xs font-black text-white shadow-lg shadow-violet-700/15 transition hover:bg-violet-800">
                  <Download size={16} /> Download Android APK <ArrowRight size={14} />
                </a>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-center text-xs font-semibold text-slate-500">Latest signed APK is not available.</div>
              )}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500"><ShieldCheck size={13} className="text-emerald-600" /> Signed APK · same app identity for updates</div>
              {android?.digest && <details className="mt-4 rounded-xl border border-slate-200 px-3 py-2"><summary className="cursor-pointer text-[10px] font-bold text-slate-600">View SHA-256 checksum</summary><code className="mt-2 block break-all text-[9px] leading-5 text-slate-500">{android.digest.replace('sha256:', '')}</code></details>}
              {android && <a href={android.releaseUrl} target="_blank" rel="noreferrer" className="mt-3 text-center text-[10px] font-bold text-violet-700 hover:underline">Release notes and file archive <ExternalLink size={11} className="inline" /></a>}
            </article>

            <article className={'relative flex flex-col rounded-[1.65rem] border bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(15,23,42,.1)] ' + (recommended('web') ? 'border-emerald-400 ring-4 ring-emerald-100' : 'border-slate-200')}>
              {recommended('web') && <div className="absolute -top-3 left-6 rounded-full bg-emerald-600 px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white shadow-lg">Recommended for you</div>}
              <div className="flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Globe size={27} /></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-emerald-700">Web / PWA</span>
              </div>
              <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">iPhone, iPad, Mac & Web</h3>
              <p className="mt-2 min-h-[48px] text-xs leading-6 text-slate-600">No separate APK or EXE is required. Open the secure Web App and add it to your Home Screen or Dock.</p>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-[10px] text-slate-500"><span>Application</span><span className="font-black text-slate-900">Web App / PWA</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Supported devices</span><span className="font-bold text-slate-800">iOS · iPadOS · macOS</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Installation</span><span className="font-bold text-slate-800">Browser-based</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>App updates</span><span className="font-bold text-emerald-700">Web delivery</span></div>
              </div>
              <a href="/" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-black text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-800">
                <Globe size={16} /> Open Web App <ArrowRight size={14} />
              </a>
              {installPrompt && <button onClick={() => void install()} disabled={installing} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-extrabold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50">
                <Download size={14} /> {installing ? 'Opening install prompt…' : 'Install on this device'}
              </button>}
              {installError && <p role="alert" className="mt-2 text-center text-[10px] text-rose-600">{installError}</p>}
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-[10px] leading-5 text-emerald-900">{webInstallGuide}</div>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500"><Apple size={13} /> Works in supported modern browsers</div>
            </article>
          </div>

          <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><InfoIcon /></div>
              <div>
                <div className="text-xs font-extrabold text-slate-900">One account. Your data stays connected.</div>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">Sign in with the same account on your supported devices to access your shared business records and cloud data.</p>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-blue-800">{lastChecked ? 'Checked ' + lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Checking release status…'}</span>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-slate-200 bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[10px] font-black uppercase tracking-[.23em] text-blue-700">Built for everyday operations</div>
            <h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-slate-950 sm:text-4xl">Everything in one connected workspace.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">A practical business toolkit designed to help embroidery teams organise customers, transactions and daily work.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FileCheck2, title: 'Customer statements', text: 'Keep customer accounts, transaction history and outstanding balances organised.' },
              { icon: Cloud, title: 'Cloud synchronisation', text: 'Access shared records across supported devices using the same account.' },
              { icon: Clock3, title: 'Daily operations', text: 'Manage business activity, reports and worker attendance in one place.' },
              { icon: ShieldCheck, title: 'Account protection', text: 'Use account access controls and secure sign-in for your business workspace.' }
            ].map((item, index) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-[#fbfcff] p-5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-900/5">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><item.icon size={21} /></div>
                <h3 className="mt-4 text-sm font-black text-slate-900">{item.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="updates" className="scroll-mt-8 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.23em] text-blue-700">Stay current</div>
            <h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-slate-950 sm:text-4xl">Updates you can follow.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">The download center checks the official release archive whenever it loads. When a new customer release is published, the relevant download card can show the new version without manually editing the website.</p>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-extrabold text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-700">
              Browse complete release archive <ExternalLink size={14} />
            </a>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900"><Zap size={15} /> How a software update reaches this page</div>
              <p className="mt-2 text-[11px] leading-5 text-amber-900/80">After a new version is built, tested and published as a stable GitHub Release with the correct customer file, the website detects it on the next refresh. The website does not build or sign installers by itself.</p>
            </div>
          </div>
          <div className="rounded-[1.65rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.06)] sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="text-sm font-black text-slate-950">Recent stable releases</div>
                <div className="mt-1 text-[10px] text-slate-500">Fetched from the official release archive</div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">Stable</span>
            </div>
            {releaseHistory.length ? (
              <div className="divide-y divide-slate-100">
                {releaseHistory.map((release, index) => (
                  <a key={release.tag_name} href={release.html_url} target="_blank" rel="noreferrer" className="group flex gap-4 py-4 transition hover:bg-slate-50/80">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700">
                      {release.platform === 'Android' ? <Smartphone size={18} /> : <Monitor size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{release.platform}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">v{release.version}</span>
                        {index === 0 && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Recent</span>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">{releaseSummary(release.body)}</p>
                      <span className="mt-1 block text-[9px] font-semibold text-slate-400">{formatDate(release.published_at)}</span>
                    </div>
                    <ExternalLink size={14} className="mt-1 shrink-0 text-slate-400 group-hover:text-blue-600" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500">{loading ? 'Loading release history…' : 'Release history will appear when the release service is available.'}</div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#071a35] px-5 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.23em] text-sky-300">Simple installation</div>
              <h2 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-4xl">Up and running in a few steps.</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">Choose the correct package for your device, install it, and sign in with your existing account.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { n: '01', title: 'Choose', text: 'Select the recommended platform for your device.' },
                { n: '02', title: 'Install', text: 'Open the official EXE or APK, or add the Web App to your device.' },
                { n: '03', title: 'Sign in', text: 'Use your existing account to access your business workspace.' }
              ].map(step => (
                <div key={step.n} className="rounded-2xl border border-white/10 bg-white/[.055] p-5">
                  <div className="text-xs font-black tracking-[.2em] text-sky-300">{step.n}</div>
                  <div className="mt-3 text-sm font-black">{step.title}</div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-300">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-8 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-[.23em] text-blue-700">Need to know</div>
            <h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-slate-950">Frequently asked questions.</h2>
          </div>
          <div className="mt-9 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5 sm:px-7">
            {[
              { q: 'Will my data sync between Windows, Android and iPhone?', a: 'Yes. Sign in with the same account on supported devices. Your business records are shared through the cloud service.' },
              { q: 'How do I update the Windows or Android app?', a: 'Download the newest customer installer from this page and install it. Windows updates must preserve the existing app signing identity. Android will verify the APK signing identity before accepting an update.' },
              { q: 'Does this website update automatically when a new version is released?', a: 'The page checks the official stable release archive when it loads or when you press Refresh. Once the new customer EXE or APK is published with the expected file name, its version and download link appear here. A website refresh is enough; a separate website deployment is not required for a normal release.' },
              { q: 'Can I install an EXE or APK on an iPhone?', a: 'No. iPhone and iPad use the Web App/PWA option. Windows uses the EXE installer, and Android uses the APK package.' },
              { q: 'Why does Android ask for permission to install an APK?', a: 'Android requires user approval for apps installed outside the Play Store. Only install packages linked from this official download center.' },
              { q: 'What if the latest download is not showing?', a: 'Press Refresh, then check the official release archive. If the release is still missing, it may not yet be published as a stable customer release.' }
            ].map(item => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs font-extrabold text-slate-900 marker:hidden">
                  {item.q}
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-45 group-open:bg-blue-50 group-open:text-blue-700">+</span>
                </summary>
                <p className="max-w-3xl pt-3 text-xs leading-6 text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/embroidery-statement-mark.svg" alt="" className="h-10 w-10 rounded-xl bg-[#071a35] p-1.5" />
            <div>
              <div className="text-xs font-black tracking-wide text-slate-900">EMBROIDERY STATEMENT</div>
              <div className="mt-1 text-[9px] font-semibold text-slate-500">Official software download center</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-slate-500">
            <a href="/" className="hover:text-blue-700">Web App</a>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="hover:text-blue-700">Release archive</a>
            <a href="mailto:support@embroderystatement.com" className="hover:text-blue-700">Support</a>
          </div>
          <div className="text-[9px] text-slate-400">© {new Date().getFullYear()} Embroidery Statement. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
};

const InfoIcon: React.FC = () => <CheckCircle2 size={18} />;

export default DownloadPortal;
