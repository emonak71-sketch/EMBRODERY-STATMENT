import React, { useEffect, useState } from 'react';
import {
  Apple, ArrowDownToLine, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3,
  CalendarCheck, CheckCircle2, ClipboardList, Clock3, Cloud, Download,
  ExternalLink, FileCheck2, Fingerprint, Gauge, Globe, HardDrive, LoaderCircle, PackageCheck,
  Monitor, RefreshCw, ShieldCheck, Smartphone, Sparkles, Users, WalletCards,
  Wifi, Workflow, Zap
} from 'lucide-react';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' | string }>;
};

type Device = {
  name: string;
  recommended: 'web' | 'windows' | 'android' | 'mac';
  apple?: 'ios' | 'mac';
  architecture?: 'x86' | 'x64' | 'arm64' | 'unknown';
};

export function detectDevice(
  ua: string,
  platform: string,
  touchPoints: number,
  architectureHint?: string,
  bitnessHint?: string
): Device {
  if (/Android/i.test(ua)) return { name: 'Android', recommended: 'android' };
  if (/iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(platform) && touchPoints > 1)) {
    return { name: /iPhone/i.test(ua) ? 'iPhone' : 'iPad', recommended: 'web', apple: 'ios' };
  }
  if (/Windows NT/i.test(ua) || /Win/i.test(platform)) {
    const architecture = bitnessHint === '32'
      ? 'x86'
      : /arm/i.test(architectureHint || '') || /ARM64/i.test(ua)
        ? 'arm64'
        : bitnessHint === '64' || /WOW64|Win64|x64|amd64/i.test(ua)
          ? 'x64'
          : /Win32|i686|\bx86\b/i.test(ua)
            ? 'x86'
            : 'unknown';
    const label = architecture === 'x86' ? 'Windows 32-bit' : architecture === 'x64' ? 'Windows 64-bit' : architecture === 'arm64' ? 'Windows ARM64' : 'Windows';
    return { name: label, recommended: 'windows', architecture };
  }
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    const architecture = /arm/i.test(architectureHint || '') ? 'arm64' : /x86|intel/i.test(architectureHint || '') ? 'x64' : 'unknown';
    return { name: architecture === 'arm64' ? 'Mac (Apple Silicon)' : architecture === 'x64' ? 'Mac (Intel)' : 'Mac', recommended: 'mac', apple: 'mac', architecture };
  }
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
  const [device, setDevice] = useState(() =>
    detectDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)
  );
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [android, setAndroid] = useState<DownloadItem | null>(null);
  const [windows, setWindows] = useState<DownloadItem | null>(null);
  const [macIntel, setMacIntel] = useState<DownloadItem | null>(null);
  const [macArm, setMacArm] = useState<DownloadItem | null>(null);
  const [windowsX86, setWindowsX86] = useState<DownloadItem | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const uaData = (navigator as Navigator & {
      userAgentData?: { getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; bitness?: string }> };
    }).userAgentData;
    if (uaData?.getHighEntropyValues) {
      void uaData.getHighEntropyValues(['architecture', 'bitness']).then(hints => {
        setDevice(detectDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints, hints.architecture, hints.bitness));
      }).catch(() => undefined);
    }
  }, []);

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
      const isWindowsCustomerInstaller = (asset: Asset) =>
        asset.name.toLowerCase().endsWith('.exe') &&
        !asset.name.toLowerCase().includes('owner') &&
        !asset.name.toLowerCase().includes('uninstall');
      const windowsAsset = windowsRelease?.assets.find(asset =>
        isWindowsCustomerInstaller(asset) && /(?:x64|x86_64|amd64)-setup\.exe$/i.test(asset.name)
      );
      const windowsX86Asset = windowsRelease?.assets.find(asset =>
        isWindowsCustomerInstaller(asset) && /(?:x86|i686|win32)-setup\.exe$/i.test(asset.name)
      );
      const androidAsset = androidRelease?.assets.find(asset =>
        asset.name === 'Embroidery-Statement-Android.apk'
      );
      const macIntelAsset = windowsRelease?.assets.find(asset =>
        asset.name === 'Embroidery.Statement_' + windowsRelease.tag_name.slice(1) + '_macOS_x64.dmg'
      );
      const macArmAsset = windowsRelease?.assets.find(asset =>
        asset.name === 'Embroidery.Statement_' + windowsRelease.tag_name.slice(1) + '_macOS_arm64.dmg'
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

      setWindowsX86(windowsRelease && windowsX86Asset ? {
        version: windowsRelease.tag_name.slice(1),
        url: windowsX86Asset.browser_download_url,
        size: windowsX86Asset.size,
        digest: windowsX86Asset.digest,
        publishedAt: windowsRelease.published_at,
        releaseUrl: windowsRelease.html_url,
        notes: windowsRelease.body || ''
      } : null);

      setMacIntel(windowsRelease && macIntelAsset ? {
        version: windowsRelease.tag_name.slice(1),
        url: macIntelAsset.browser_download_url,
        size: macIntelAsset.size,
        digest: macIntelAsset.digest,
        publishedAt: windowsRelease.published_at,
        releaseUrl: windowsRelease.html_url,
        notes: windowsRelease.body || ''
      } : null);

      setMacArm(windowsRelease && macArmAsset ? {
        version: windowsRelease.tag_name.slice(1),
        url: macArmAsset.browser_download_url,
        size: macArmAsset.size,
        digest: macArmAsset.digest,
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
  const windowsDownload = device.architecture === 'x86' ? windowsX86 : (device.architecture === 'x64' || device.architecture === 'arm64') ? windows : null;
  const macDownload = device.architecture === 'arm64' ? macArm : device.architecture === 'x64' ? macIntel : null;
  const windowsArchitectureLabel = device.architecture === 'x86' ? '32-bit (x86)' : device.architecture === 'arm64' ? '64-bit (ARM)' : device.architecture === 'x64' ? '64-bit (x64)' : '64-bit (x64)';
  const appVersion = windows?.version || android?.version || macIntel?.version || macArm?.version || 'Latest';
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

        <nav className="sticky top-0 z-40 mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 bg-[#06152e]/85 px-5 py-4 backdrop-blur-2xl sm:px-8 lg:px-10">
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
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">We detected <strong>{device.name}</strong>. The matching app is shown first. Choose another device to view all available platforms.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-bold text-slate-600 shadow-sm">
                <span className={'h-2 w-2 rounded-full ' + (loading ? 'bg-amber-400 animate-pulse' : error ? 'bg-rose-500' : 'bg-emerald-500')} />
                {loading ? 'Checking latest releases' : error ? 'Release check needs attention' : 'Release information up to date'}
              </div>
              <button onClick={() => void loadReleases()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-extrabold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-50">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={() => setShowAllPlatforms(value => !value)} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-2 text-[10px] font-extrabold text-blue-800 shadow-sm transition hover:bg-blue-100">
                {showAllPlatforms ? 'Show recommended only' : 'Choose another device'}
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
            {(showAllPlatforms || recommended('windows')) && <article className={'relative flex flex-col rounded-[1.65rem] border bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(15,23,42,.1)] ' + (recommended('windows') ? 'border-blue-400 ring-4 ring-blue-100' : 'border-slate-200')}>
              {recommended('windows') && <div className="absolute -top-3 left-6 rounded-full bg-blue-600 px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white shadow-lg">Recommended for you</div>}
              <div className="flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Monitor size={27} /></div>
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-blue-700">Desktop app</span>
              </div>
              <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">Windows</h3>
              <p className="mt-2 min-h-[48px] text-xs leading-6 text-slate-600">A dedicated desktop experience for Windows 10 and 11. Download the official customer installer.</p>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-[10px] text-slate-500"><span>Detected device</span><span className="font-black text-slate-900">{device.name}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Recommended installer</span><span className="font-bold text-slate-800">{windowsArchitectureLabel}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Latest customer version</span><span className="font-black text-slate-900">{windowsDownload ? 'v' + windowsDownload.version : windows ? 'v' + windows.version : 'Checking…'}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Installer format</span><span className="font-bold text-slate-800">Windows EXE</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>File size</span><span className="font-bold text-slate-800">{windowsDownload ? formatSize(windowsDownload.size) : 'Not available'}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Published</span><span className="font-bold text-slate-800">{formatDate(windowsDownload?.publishedAt || windows?.publishedAt)}</span></div>
              </div>
              {windowsDownload ? (
                <a href={windowsDownload.url} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-xs font-black text-white shadow-lg shadow-blue-700/15 transition hover:bg-blue-800">
                  <Download size={16} /> Download Windows {device.architecture === 'x86' ? '32-bit' : '64-bit'} EXE <ArrowRight size={14} />
                </a>
              ) : device.architecture === 'x86' ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-800">The Windows 32-bit installer is not published yet. Do not install the 64-bit package on this device.</div>
              ) : device.architecture === 'unknown' && (windows || windowsX86) ? (
                <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-xs font-semibold text-sky-900">
                  Confirm your Windows system type in Settings → System → About before downloading.
                  <div className="mt-3 flex flex-wrap justify-center gap-3">
                    {windows && <a href={windows.url} className="font-black underline underline-offset-2">64-bit EXE</a>}
                    {windowsX86 && <a href={windowsX86.url} className="font-black underline underline-offset-2">32-bit EXE</a>}
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-center text-xs font-semibold text-slate-500">Latest signed installer is not available.</div>
              )}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500"><ShieldCheck size={13} className="text-emerald-600" /> Customer installer · digitally signed release</div>
              {windowsDownload?.digest && <details className="mt-4 rounded-xl border border-slate-200 px-3 py-2"><summary className="cursor-pointer text-[10px] font-bold text-slate-600">View SHA-256 checksum</summary><code className="mt-2 block break-all text-[9px] leading-5 text-slate-500">{windowsDownload.digest.replace('sha256:', '')}</code></details>}
              {windows && <div className="mt-3 flex flex-wrap justify-center gap-3 text-[10px] font-bold text-blue-700">
                {windows && <a href={windows.url} className="hover:underline">64-bit EXE</a>}
                {windowsX86 && <a href={windowsX86.url} className="hover:underline">32-bit EXE</a>}
                <a href={windows.releaseUrl} target="_blank" rel="noreferrer" className="hover:underline">Release notes & archive <ExternalLink size={11} className="inline" /></a>
              </div>}
            </article>}

            {(showAllPlatforms || recommended('android')) && <article className={'relative flex flex-col rounded-[1.65rem] border bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(15,23,42,.1)] ' + (recommended('android') ? 'border-violet-400 ring-4 ring-violet-100' : 'border-slate-200')}>
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
            </article>}

            {(showAllPlatforms || recommended('mac')) && <article className={'relative flex flex-col rounded-[1.65rem] border bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(15,23,42,.1)] ' + (recommended('mac') ? 'border-slate-500 ring-4 ring-slate-100' : 'border-slate-200')}>
              {recommended('mac') && <div className="absolute -top-3 left-6 rounded-full bg-slate-800 px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white shadow-lg">Recommended for you</div>}
              <div className="flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-800"><Apple size={27} /></div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-700">macOS desktop app</span>
              </div>
              <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">Mac Customer App</h3>
              <p className="mt-2 min-h-[48px] text-xs leading-6 text-slate-600">Dedicated macOS installer for Intel Macs and Apple Silicon Macs (M-series).</p>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-[10px] text-slate-500"><span>Detected device</span><span className="font-black text-slate-900">{device.name}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Installer architecture</span><span className="font-bold text-slate-800">{device.architecture === 'arm64' ? 'Apple Silicon' : device.architecture === 'x64' ? 'Intel' : 'Choose manually'}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Latest version</span><span className="font-black text-slate-900">{macDownload ? 'v' + macDownload.version : macIntel || macArm ? 'v' + (macIntel || macArm)!.version : 'Checking…'}</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Installer format</span><span className="font-bold text-slate-800">DMG</span></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>File size</span><span className="font-bold text-slate-800">{macDownload ? formatSize(macDownload.size) : 'Choose architecture'}</span></div>
              </div>
              {macDownload ? (
                <a href={macDownload.url} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-xs font-black text-white shadow-lg transition hover:bg-slate-900">
                  <Download size={16} /> Download Mac {device.architecture === 'arm64' ? 'Apple Silicon' : 'Intel'} DMG <ArrowRight size={14} />
                </a>
              ) : (
                <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-xs font-semibold text-sky-900">
                  Choose the installer for your Mac:
                  <div className="mt-2 flex justify-center gap-4">
                    {macIntel && <a href={macIntel.url} className="underline underline-offset-2">Intel DMG</a>}
                    {macArm && <a href={macArm.url} className="underline underline-offset-2">Apple Silicon DMG</a>}
                  </div>
                  {!macIntel && !macArm && <span>Mac installer is being built or has not been published yet.</span>}
                </div>
              )}
              <div className="mt-3 text-center text-[10px] font-semibold text-slate-500">Customer app only · DMG installer · updater-signed</div>
              {macDownload?.digest && <details className="mt-4 rounded-xl border border-slate-200 px-3 py-2"><summary className="cursor-pointer text-[10px] font-bold text-slate-600">View SHA-256 checksum</summary><code className="mt-2 block break-all text-[9px] leading-5 text-slate-500">{macDownload.digest.replace('sha256:', '')}</code></details>}
              {(macIntel || macArm) && <a href={(macDownload || macIntel || macArm)!.releaseUrl} target="_blank" rel="noreferrer" className="mt-3 text-center text-[10px] font-bold text-slate-700 hover:underline">Release notes and file archive <ExternalLink size={11} className="inline" /></a>}
              <p className="mt-3 text-[10px] leading-5 text-amber-700">Note: Apple Developer ID signing and notarization are separate from updater signing and may be required to avoid macOS Gatekeeper warnings.</p>
            </article>}

            {(showAllPlatforms || recommended('web')) && <article className={'relative flex flex-col rounded-[1.65rem] border bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(15,23,42,.1)] ' + (recommended('web') ? 'border-emerald-400 ring-4 ring-emerald-100' : 'border-slate-200')}>
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
            </article>}
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

      
      
      <section className="relative isolate overflow-hidden bg-[#071a35] px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-24">
        <div className="pointer-events-none absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-sky-500/15 blur-[100px]" />
        <div className="pointer-events-none absolute -right-40 bottom-0 h-[32rem] w-[32rem] rounded-full bg-blue-600/20 blur-[110px]" />
        <div className="pointer-events-none absolute inset-0 download-hero-grid opacity-40" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div className="download-copy-enter">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-[.2em] text-sky-200">
              <Workflow size={13} /> One connected workspace
            </div>
            <h2 className="mt-6 max-w-xl text-3xl font-black leading-[1.08] tracking-[-.05em] sm:text-4xl lg:text-[3.25rem]">
              A clearer way to manage your embroidery business.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Bring customer accounts, statements, transactions, team attendance and business reports into one organised workflow.
            </p>
            <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
              {[
                { icon: Users, label: 'Customer accounts' },
                { icon: WalletCards, label: 'Statements & transactions' },
                { icon: CalendarCheck, label: 'Team attendance' },
                { icon: BarChart3, label: 'Business reports' }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.055] px-3.5 py-3 text-[11px] font-bold text-slate-200 backdrop-blur-xl">
                  <item.icon size={16} className="shrink-0 text-sky-300" /> {item.label}
                </div>
              ))}
            </div>
            <a href="#downloads" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-xs font-black text-[#071a35] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-sky-50">
              Explore the apps <ArrowUpRight size={15} />
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-[650px]">
            <div className="absolute -inset-8 rounded-[3rem] bg-sky-400/10 blur-3xl" />
            <div className="download-float relative rounded-[2rem] border border-white/15 bg-gradient-to-br from-white/[.16] to-white/[.035] p-3 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-4">
              <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3">
                <div className="flex items-center gap-2.5">
                  <img src="/embroidery-statement-mark.svg" alt="" className="h-7 w-7 rounded-lg bg-white p-1" />
                  <div>
                    <div className="text-[10px] font-black tracking-wide text-white">EMBROIDERY STATEMENT</div>
                    <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[.18em] text-slate-400">Interface preview</div>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-200">Product concept</span>
              </div>
              <div className="grid grid-cols-[76px_1fr] gap-3 pt-3 sm:grid-cols-[116px_1fr] sm:gap-4">
                <aside className="rounded-2xl border border-white/10 bg-[#06152e]/80 p-2 sm:p-3">
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-sky-300/10 p-2">
                    <div className="h-2 w-2 rounded-full bg-sky-300" />
                    <span className="hidden text-[8px] font-bold text-sky-100 sm:block">Workspace</span>
                  </div>
                  {[
                    { icon: Users, label: 'Customers', active: true },
                    { icon: WalletCards, label: 'Accounts' },
                    { icon: ClipboardList, label: 'Statements' },
                    { icon: CalendarCheck, label: 'Attendance' },
                    { icon: BarChart3, label: 'Reports' }
                  ].map(item => (
                    <div key={item.label} className={'mb-1 flex items-center gap-2 rounded-lg px-2 py-2 ' + (item.active ? 'bg-blue-500/20 text-sky-200' : 'text-slate-500')}>
                      <item.icon size={13} />
                      <span className="hidden text-[8px] font-semibold sm:block">{item.label}</span>
                    </div>
                  ))}
                  <div className="mt-5 hidden rounded-lg border border-white/10 p-2 sm:block">
                    <div className="h-1 w-10 rounded bg-slate-600" />
                    <div className="mt-2 h-1 w-14 rounded bg-slate-700" />
                  </div>
                </aside>
                <div className="min-w-0 rounded-2xl border border-white/10 bg-[#f7faff] p-3 text-slate-900 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-[.18em] text-blue-600">Business workspace</div>
                      <div className="mt-1 text-sm font-black tracking-tight sm:text-lg">Your operations, organised.</div>
                    </div>
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><Sparkles size={15}/></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { icon: Users, title: 'Customer records', sub: 'Account overview' },
                      { icon: WalletCards, title: 'Statements', sub: 'Transaction history' },
                      { icon: BarChart3, title: 'Reports', sub: 'Business insights' }
                    ].map(item => (
                      <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
                        <item.icon size={15} className="text-blue-600"/>
                        <div className="mt-3 text-[8px] font-black leading-4 text-slate-800 sm:text-[9px]">{item.title}</div>
                        <div className="mt-0.5 text-[7px] text-slate-400">{item.sub}</div>
                        <div className="mt-2 h-1 w-full rounded-full bg-slate-100"><div className="h-1 w-2/3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"/></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black text-slate-800">Daily workflow</span>
                      <span className="text-[7px] font-bold uppercase tracking-wider text-emerald-600">Connected view</span>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {['Customer account management','Statement and transaction review','Attendance and reporting'].map((label, i) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-blue-50 text-[8px] font-black text-blue-700">0{i+1}</span>
                          <span className="h-1.5 flex-1 rounded-full bg-slate-100"/>
                          <span className="hidden text-[7px] font-semibold text-slate-500 sm:block">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[7px] font-bold text-slate-400">
                    <span>Illustrative interface preview</span>
                    <span>Not live customer data</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="download-float-delayed absolute -bottom-5 -left-3 rounded-2xl border border-white/15 bg-[#10294b]/95 px-4 py-3 shadow-2xl backdrop-blur-xl sm:-left-7">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300"><Cloud size={16}/></div>
                <div>
                  <div className="text-[9px] font-black text-white">One connected account</div>
                  <div className="mt-0.5 text-[8px] text-slate-400">Across supported devices</div>
                </div>
              </div>
            </div>
            <div className="download-float absolute -right-2 -top-5 rounded-2xl border border-white/15 bg-[#10294b]/95 px-3.5 py-3 shadow-2xl backdrop-blur-xl sm:-right-5">
              <div className="flex items-center gap-2 text-[9px] font-black text-white"><ShieldCheck size={14} className="text-emerald-300"/> Release transparency</div>
              <div className="mt-1 text-[8px] text-slate-400">Versions · files · checksums</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative overflow-hidden border-y border-slate-200 bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-blue-100/60 blur-[90px]"/>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-[10px] font-black uppercase tracking-[.23em] text-blue-700">Designed around your workflow</div>
              <h2 className="mt-3 text-3xl font-black tracking-[-.05em] text-slate-950 sm:text-4xl lg:text-5xl">The essentials of your business. In one place.</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-600">A focused set of tools for the everyday work behind an embroidery business—from customer accounts to team operations.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Users, no: '01', title: 'Customer accounts', text: 'Keep customer details and account information organised and easy to review.', tone: 'blue' },
              { icon: WalletCards, no: '02', title: 'Statements & transactions', text: 'Review account activity, transaction history and outstanding balances.', tone: 'violet' },
              { icon: CalendarCheck, no: '03', title: 'Team attendance', text: 'Bring worker attendance and daily team records into your business workflow.', tone: 'cyan' },
              { icon: BarChart3, no: '04', title: 'Business reports', text: 'Use organised business information to review activity and follow performance.', tone: 'indigo' },
              { icon: Cloud, no: '05', title: 'Connected devices', text: 'Access shared records on supported devices with the same account.', tone: 'emerald' },
              { icon: Fingerprint, no: '06', title: 'Account protection', text: 'Use secure sign-in and account controls to protect access to your workspace.', tone: 'amber' }
            ].map(item => (
              <article key={item.title} className="download-feature-card group relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-gradient-to-br from-white to-[#f8fbff] p-6 shadow-[0_12px_38px_rgba(15,23,42,.045)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_60px_rgba(15,23,42,.09)]">
                <div className="absolute right-5 top-5 text-[9px] font-black tracking-[.18em] text-slate-300">{item.no}</div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 transition duration-300 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white">
                  <item.icon size={21}/>
                </div>
                <h3 className="mt-5 text-base font-black tracking-tight text-slate-950">{item.title}</h3>
                <p className="mt-2 max-w-sm text-xs leading-6 text-slate-600">{item.text}</p>
                <div className="mt-6 h-px w-full bg-gradient-to-r from-blue-200 via-slate-100 to-transparent"/>
                <div className="mt-3 flex items-center justify-between text-[9px] font-bold uppercase tracking-[.13em] text-slate-400">
                  <span>Embroidery Statement</span><ArrowUpRight size={13} className="text-blue-500 opacity-0 transition group-hover:opacity-100"/>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-4 rounded-[1.5rem] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="text-sm font-black text-slate-900">Ready to bring your workflow together?</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">Choose the right version for your device and get started.</p>
            </div>
            <a href="#downloads" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b3b82] px-5 py-3 text-xs font-black text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-800">Choose your app <ArrowRight size={14}/></a>
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

      
      <section className="border-y border-slate-200 bg-[#f3f7fc] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[10px] font-black uppercase tracking-[.23em] text-blue-700">Clear. Current. Verified.</div>
            <h2 className="mt-3 text-3xl font-black tracking-[-.05em] text-slate-950 sm:text-4xl">A more transparent download experience.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">Know which package you are choosing and where its release information comes from.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {[
              { icon: PackageCheck, title: 'Official release source', text: 'Customer downloads are retrieved from the Embroidery Statement GitHub release archive.' },
              { icon: Gauge, title: 'Version details upfront', text: 'See the version, package size and publication date before choosing a download.' },
              { icon: ShieldCheck, title: 'Integrity information', text: 'Open the SHA-256 checksum when it is supplied with the published release.' }
            ].map(item => (
              <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.045)]">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><item.icon size={20}/></div>
                <h3 className="mt-4 text-sm font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
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

      <footer className="relative overflow-hidden border-t border-white/10 bg-[#06152e] px-5 py-10 text-white sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blue-500/15 blur-[90px]"/>
        <div className="relative mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/embroidery-statement-mark.svg" alt="" className="h-11 w-11 rounded-xl bg-white p-1.5"/>
            <div>
              <div className="text-xs font-black tracking-[.12em] text-white">EMBROIDERY STATEMENT</div>
              <div className="mt-1 text-[9px] font-semibold text-slate-400">Business management suite · Official downloads</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-[10px] font-bold text-slate-300">
            <a href="#downloads" className="transition hover:text-sky-300">Downloads</a>
            <a href="#features" className="transition hover:text-sky-300">Features</a>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="transition hover:text-sky-300">Release archive</a>
            <a href="#faq" className="transition hover:text-sky-300">Installation help</a>
          </div>
          <div className="text-[9px] leading-5 text-slate-500 sm:text-right">© {new Date().getFullYear()} Embroidery Statement.<br/>All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
};

const InfoIcon: React.FC = () => <CheckCircle2 size={18} />;

export default DownloadPortal;
