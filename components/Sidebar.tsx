
import React, { useState } from 'react';
import { Landmark, FileText, Package, ShoppingCart, Receipt, Search, Users, Sun, Moon, LogOut, Menu, X, MoreVertical, Edit2, Trash2, Settings, Plus, RotateCcw } from 'lucide-react';
import { Party, TabType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (t: TabType) => void;
  parties: Party[];
  selectedParty: Party | null;
  setSelectedParty: (p: Party) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  onAddParty: (name: string, phone: string) => Promise<void>;
  onEditParty: (id: string, updates: Partial<Party>) => Promise<void>;
  onDeleteParty: (id: string) => Promise<void>;
  onRestoreParty: (id: string) => Promise<void>;
  onPermanentDeleteParty: (id: string) => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, parties, selectedParty, setSelectedParty, 
  isDarkMode, toggleDarkMode, onLogout, onAddParty, onEditParty, onDeleteParty,
  onRestoreParty, onPermanentDeleteParty
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showAddParty, setShowAddParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modals state
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, name: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState<Party | null>(null);

  const activeParties = parties.filter(p => !p.is_deleted);
  const deletedParties = parties.filter(p => p.is_deleted);

  const filteredParties = activeParties.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone.includes(searchTerm)
  );

  const handleAddParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddParty(newPartyName, newPartyPhone);
      setNewPartyName('');
      setNewPartyPhone('');
      setShowAddParty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    try {
      await onEditParty(showEditModal.id, { name: showEditModal.name, phone: showEditModal.phone });
      setShowEditModal(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'পার্টির তথ্য আপডেট করা যায়নি। আবার চেষ্টা করুন।');
    }
  };

  return (
    <>
      <button type="button" aria-label="Open navigation menu" aria-expanded={isOpen} onClick={() => setIsOpen(true)} className="app-menu-trigger md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-2xl shadow-xl shadow-slate-900/10">
        <Menu className="w-6 h-6" />
      </button>

      <aside className={`app-sidebar fixed inset-y-0 left-0 z-[70] w-[88vw] max-w-72 border-r border-white/70 dark:border-white/10 shadow-2xl shadow-slate-900/10 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] md:relative md:w-72 md:max-w-none md:translate-x-0 no-print ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex min-w-0 items-center gap-3 font-black text-lg text-slate-900 dark:text-white uppercase tracking-tighter">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white shadow-md shadow-sky-500/10 ring-1 ring-sky-100 dark:ring-sky-900/40">
                <img
                  src="/embroidery-statement-logo.jpg"
                  alt="Embroidery Statement"
                  className="h-full w-full scale-[1.55] origin-top object-cover object-top"
                />
              </div>
              <span className="leading-none">EMBROIDERY<br/><span className="text-[9px] font-bold text-slate-400">STATEMENT</span></span>
            </div>
            <button type="button" aria-label="Close navigation menu" onClick={() => setIsOpen(false)} className="md:hidden min-h-11 min-w-11 p-2 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-shrink-0 space-y-1 mb-6">
            {[
              { id: 'dashboard', label: t('dashboard'), icon: <Landmark className="w-5 h-5" /> },
              { id: 'parties', label: t('parties'), icon: <Users className="w-5 h-5" /> },
              { id: 'ledger', label: t('ledger'), icon: <FileText className="w-5 h-5" /> },
              { id: 'settings', label: t('settings'), icon: <Settings className="w-5 h-5" /> },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={activeTab === item.id ? 'page' : undefined}
                onClick={() => { setActiveTab(item.id as TabType); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === item.id 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex-1 flex flex-col min-h-0 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Parties</h3>
                {deletedParties.length > 0 && (
                  <button onClick={() => setShowRecycleBin(true)} className="p-1 text-slate-400 hover:text-primary-600 transition-colors relative">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary-500 rounded-full border border-white dark:border-slate-900 animate-pulse" />
                  </button>
                )}
              </div>
              <button type="button" aria-label={showAddParty ? 'Close add customer form' : 'Add customer'} onClick={() => setShowAddParty(!showAddParty)} className="min-h-11 min-w-11 grid place-items-center p-2 bg-slate-100 dark:bg-slate-800 text-primary-600 rounded-xl hover:scale-105 transition-all">
                <Plus className={`w-3.5 h-3.5 transition-transform ${showAddParty ? 'rotate-45' : ''}`} />
              </button>
            </div>
            
            {showAddParty && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm animate-in zoom-in-95 relative">
                  <button onClick={() => setShowAddParty(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                    <X className="w-4 h-4" />
                  </button>
                  <h3 className="text-lg font-black uppercase tracking-tight mb-4 text-slate-900 dark:text-white">{t('add_new_party')}</h3>
                  <form onSubmit={handleAddParty} className="space-y-3">
                    <input 
                      type="text" 
                      placeholder={t('party_name')} 
                      required
                      value={newPartyName}
                      onChange={(e) => setNewPartyName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                    <input 
                      type="tel" 
                      placeholder={t('phone_no')} 
                      value={newPartyPhone}
                      onChange={(e) => setNewPartyPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                    <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-black uppercase py-3.5 rounded-xl tracking-widest shadow-lg shadow-primary-500/20 transition-all active:scale-95">
                      {isSubmitting ? 'Saving...' : 'Add Party'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            <div className="relative mb-3 px-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Find party..." 
                className="w-full bg-slate-100 dark:bg-slate-800/50 border-none text-[10px] font-black p-3 pl-10 rounded-xl outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
              {filteredParties.map((party) => (
                <div key={party.id} className="relative group">
                  <button
                    onClick={() => { setSelectedParty(party); setActiveTab('ledger'); setIsOpen(false); }}
                    className={`w-full flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl text-left transition-all ${
                      selectedParty?.id === party.id 
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 font-bold border-l-4 border-primary-500 shadow-sm' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span className="truncate w-full font-black uppercase text-[9px] tracking-tight">{party.name}</span>
                    <span className="text-[8px] opacity-70 font-mono tracking-tighter">{party.phone}</span>
                  </button>
                  
                  <button
                    type="button"
                    aria-label={`More actions for ${party.name}`}
                    aria-haspopup="menu"
                    aria-expanded={activeMenuId === party.id}
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === party.id ? null : party.id); }}
                    className={`party-action-trigger absolute right-1 top-1/2 -translate-y-1/2 transition-all z-[75] ${activeMenuId === party.id ? 'opacity-100 bg-slate-100 dark:bg-slate-800 rounded-xl' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {activeMenuId === party.id && (
                    <div role="menu" className="party-action-menu absolute right-0 top-[85%] z-[90] bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700 p-1 min-w-[144px] animate-in zoom-in-95 origin-top-right">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => { e.stopPropagation(); setShowEditModal(party); setActiveMenuId(null); }} 
                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-primary-500" /> Edit
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ id: party.id, name: party.name }); setActiveMenuId(null); }} 
                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
            {/* Language Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-2">
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('bn')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${language === 'bn' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                বাংলা
              </button>
            </div>
            <button onClick={toggleDarkMode} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[9px] font-black uppercase tracking-widest">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDarkMode ? t('light') : t('dark')}</span>
            </button>
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-900/10 transition-colors text-[9px] font-black uppercase tracking-widest">
              <LogOut className="w-4 h-4" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </aside>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[65] md:hidden animate-in fade-in" onClick={() => setIsOpen(false)} />
      )}

      {/* DROP-DOWN BACKDROP */}
      {activeMenuId && (
        <div className="fixed inset-0 z-[68] cursor-default" onClick={() => setActiveMenuId(null)} />
      )}

      {/* RECYCLE BIN MODAL */}
      {showRecycleBin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-primary-600" />
                <h3 className="font-black uppercase text-xs tracking-widest">Recycle Bin</h3>
              </div>
              <button type="button" aria-label="Close recycle bin" onClick={() => setShowRecycleBin(false)} className="min-h-11 min-w-11 grid place-items-center p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {deletedParties.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Trash is empty</p>
                </div>
              ) : (
                deletedParties.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase">{p.name}</span>
                      <span className="text-[9px] font-mono text-slate-400">{p.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => onRestoreParty(p.id)} className="min-h-11 min-w-11 grid place-items-center p-2 text-primary-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all" title="Restore" aria-label={`Restore ${p.name}`}>
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => onPermanentDeleteParty(p.id)} className="min-h-11 min-w-11 grid place-items-center p-2 text-rose-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all" title="Delete Permanently" aria-label={`Delete ${p.name} permanently`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xs w-full text-center animate-in zoom-in-95">
            <div className="inline-flex p-4 bg-rose-50 dark:bg-rose-900/20 rounded-full mb-4">
              <Trash2 className="w-7 h-7 text-rose-600" />
            </div>
            <h4 className="text-lg font-black uppercase tracking-tight mb-2">Move to Trash?</h4>
            <p className="text-[11px] font-bold text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to delete <span className="text-slate-900 dark:text-white">"{showDeleteConfirm.name}"</span>?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all">{t('cancel')}</button>
              <button onClick={() => { onDeleteParty(showDeleteConfirm.id); setShowDeleteConfirm(null); }} className="py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/20 transition-all">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full animate-in slide-in-from-bottom-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                <Edit2 className="w-5 h-5 text-primary-600" />
              </div>
              <h4 className="text-lg font-black uppercase tracking-tight">{t('edit_party')}</h4>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Name</label>
                <input 
                  type="text" 
                  value={showEditModal.name} 
                  onChange={e => setShowEditModal({...showEditModal, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none font-bold text-sm focus:ring-2 ring-primary-500 outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Phone</label>
                <input 
                  type="tel" 
                  value={showEditModal.phone} 
                  onChange={e => setShowEditModal({...showEditModal, phone: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none font-bold text-sm focus:ring-2 ring-primary-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(null)} className="py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">{t('cancel')}</button>
                <button type="submit" className="py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20 transition-all">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
