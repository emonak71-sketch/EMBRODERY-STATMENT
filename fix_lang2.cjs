const fs = require('fs');

// 1. Update contexts/LanguageContext.tsx
let langCode = fs.readFileSync('/app/applet/contexts/LanguageContext.tsx', 'utf8');

langCode = langCode.replace(/'restore': 'Restore'/, `'restore': 'Restore',
    'net_receivables': 'Net Receivables',
    'no_outstanding_balances': 'No outstanding balances.',
    'no_collections_found': 'No collections found.',
    'payments': 'Payments',
    'payment_received': 'Payment Received',
    'party_breakdown': 'Party Breakdown (Top First)',
    'all_memos': 'All Memos'`);

langCode = langCode.replace(/'restore': 'পুনরুদ্ধার করুন'/, `'restore': 'পুনরুদ্ধার করুন',
    'net_receivables': 'নেট পাওনা',
    'no_outstanding_balances': 'কোন বকেয়া ব্যালেন্স নেই।',
    'no_collections_found': 'কোন আদায় পাওয়া যায়নি।',
    'payments': 'পেমেন্ট সমূহ',
    'payment_received': 'পেমেন্ট গ্রহন করা হয়েছে',
    'party_breakdown': 'পার্টির কাজের বিবরণ (সর্বোচ্চ কাজ উপরে)',
    'all_memos': 'সকল মেমো'`);

fs.writeFileSync('/app/applet/contexts/LanguageContext.tsx', langCode);


// 2. Update Dashboard.tsx
let dashCode = fs.readFileSync('/app/applet/components/Dashboard.tsx', 'utf8');

dashCode = dashCode.replace(/'Net Receivables'/g, "t('net_receivables')");
dashCode = dashCode.replace(/>No outstanding balances\.</g, ">{t('no_outstanding_balances')}<");
dashCode = dashCode.replace(/>No collections found\.</g, ">{t('no_collections_found')}<");
dashCode = dashCode.replace(/>\{p\?\.name\} - Payments</g, ">{p?.name} - {t('payments')}<");
dashCode = dashCode.replace(/\{tx\.details \|\| 'Payment Received'\}/g, "{tx.details || t('payment_received')}");

fs.writeFileSync('/app/applet/components/Dashboard.tsx', dashCode);

// 3. Update MonthlyReports.tsx
let mrCode = fs.readFileSync('/app/applet/components/MonthlyReports.tsx', 'utf8');

mrCode = mrCode.replace(/>Party Breakdown \(Top First\)</g, ">{t('party_breakdown')}<");
mrCode = mrCode.replace(/>All Memos</g, ">{t('all_memos')}<");

fs.writeFileSync('/app/applet/components/MonthlyReports.tsx', mrCode);

console.log('Language fixes applied.');
