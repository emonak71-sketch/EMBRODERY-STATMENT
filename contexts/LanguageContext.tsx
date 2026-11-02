import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'dashboard': 'Dashboard',
    'ledger': 'Ledger',
    'parties': 'Parties',
    'settings': 'Settings',
    'monthly_reports': 'Monthly Reports',
    'overview': 'Overview',
    'total_outstanding': 'Total Outstanding',
    'total_collected': 'Total Collected',
    'total_credit': 'Total Credit',
    'monthly_work': 'Monthly Work',
    'total_parties': 'Total Parties',
    'recent_activity': 'Recent Activity',
    'all_parties': 'All Parties',
    'add_party': 'Add Party',
    'add_new_party': 'Add New Party',
    'party_name': 'Party Name',
    'phone_no': 'Phone No',
    'adding': 'Adding...',
    'no_parties_found': 'No parties found.',
    'due_balance': 'Due Balance',
    'search_parties': 'Search parties...',
    'logout': 'Logout',
    'theme': 'Theme',
    'light': 'Light',
    'dark': 'Dark',
    'language': 'Language',
    'english': 'English',
    'bangla': 'বাংলা',
    'party_ledger': 'Party Ledger',
    'add_transaction': 'Add Transaction',
    'send_sms': 'Send SMS',
    'edit_party': 'Edit Party',
    'delete_party': 'Delete Party',
    'date': 'Date',
    'memo_no': 'Memo No',
    'details': 'Details',
    'qty_rate': 'Qty / Rate',
    'credit': 'Credit',
    'payment': 'Payment',
    'balance': 'Balance',
    'back': 'Back',
    'month_by_month': 'Month by Month Breakdown',
    'total_work': 'Total Work',
    'memos': 'Memos',
    'amount': 'Amount',
    'no_work_records': 'No work records found.',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'save_changes': 'Save Changes',
    'saving': 'Saving...',
    'add_memo': 'Add Memo',
    'add_payment': 'Add Payment',
    'type': 'Type',
    'pcs': 'Pcs',
    'rate': 'Rate',
    'memo': 'Memo',
    'action': 'Action',
    'no_recent_activity': 'No recent activity.',
    'no_transactions': 'No transactions found.',
    'permanently_delete': 'Permanently Delete',
    'restore': 'Restore',
    'net_receivables': 'Net Receivables',
    'no_outstanding_balances': 'No outstanding balances.',
    'no_collections_found': 'No collections found.',
    'payments': 'Payments',
    'payment_received': 'Payment Received',
    'party_breakdown': 'Party Breakdown (Top First)',
    'all_memos': 'All Memos'
  },
  bn: {
    'dashboard': 'ড্যাশবোর্ড',
    'ledger': 'খতিয়ান (লেজার)',
    'parties': 'পার্টি সমূহ',
    'settings': 'সেটিংস',
    'monthly_reports': 'মাসিক রিপোর্ট',
    'overview': 'ওভারভিউ',
    'total_outstanding': 'মোট পাওনা',
    'total_collected': 'মোট আদায়',
    'total_credit': 'মোট ক্রেডিট (কাজ)',
    'monthly_work': 'মাসিক কাজ',
    'total_parties': 'মোট পার্টি',
    'recent_activity': 'সাম্প্রতিক কার্যক্রম',
    'all_parties': 'সকল পার্টি',
    'add_party': 'পার্টি যোগ করুন',
    'add_new_party': 'নতুন পার্টি যোগ করুন',
    'party_name': 'পার্টির নাম',
    'phone_no': 'ফোন নম্বর',
    'adding': 'যোগ করা হচ্ছে...',
    'no_parties_found': 'কোন পার্টি পাওয়া যায়নি।',
    'due_balance': 'বকেয়া ব্যালেন্স',
    'search_parties': 'পার্টি খুঁজুন...',
    'logout': 'লগ আউট',
    'theme': 'থিম',
    'light': 'লাইট',
    'dark': 'ডার্ক',
    'language': 'ভাষা',
    'english': 'English',
    'bangla': 'বাংলা',
    'party_ledger': 'পার্টির খতিয়ান',
    'add_transaction': 'লেনদেন যোগ করুন',
    'send_sms': 'এসএমএস পাঠান',
    'edit_party': 'পার্টি সম্পাদনা',
    'delete_party': 'পার্টি মুছুন',
    'date': 'তারিখ',
    'memo_no': 'মেমো নং',
    'details': 'বিবরণ',
    'qty_rate': 'পরিমাণ / রেট',
    'credit': 'কাজ (ক্রেডিট)',
    'payment': 'পেমেন্ট',
    'balance': 'ব্যালেন্স',
    'back': 'ফিরে যান',
    'month_by_month': 'মাসিক কাজের বিবরণ',
    'total_work': 'মোট কাজ',
    'memos': 'মেমো',
    'amount': 'টাকা',
    'no_work_records': 'কোন কাজের রেকর্ড পাওয়া যায়নি।',
    'cancel': 'বাতিল',
    'delete': 'মুছুন',
    'save_changes': 'সংরক্ষণ করুন',
    'saving': 'সংরক্ষণ করা হচ্ছে...',
    'add_memo': 'মেমো যোগ করুন',
    'add_payment': 'পেমেন্ট যোগ করুন',
    'type': 'ধরন',
    'pcs': 'পিস',
    'rate': 'রেট',
    'memo': 'মেমো',
    'action': 'অ্যাকশন',
    'no_recent_activity': 'কোন সাম্প্রতিক কার্যক্রম নেই।',
    'no_transactions': 'কোন লেনদেন পাওয়া যায়নি।',
    'permanently_delete': 'স্থায়ীভাবে মুছুন',
    'restore': 'পুনরুদ্ধার করুন',
    'net_receivables': 'নেট পাওনা',
    'no_outstanding_balances': 'কোন বকেয়া ব্যালেন্স নেই।',
    'no_collections_found': 'কোন আদায় পাওয়া যায়নি।',
    'payments': 'পেমেন্ট সমূহ',
    'payment_received': 'পেমেন্ট গ্রহন করা হয়েছে',
    'party_breakdown': 'পার্টির কাজের বিবরণ (সর্বোচ্চ কাজ উপরে)',
    'all_memos': 'সকল মেমো'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'bn' || saved === 'en') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
