import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import DesktopHost from './desktop/DesktopHost';

console.log('Mounting Embrodery Statement App...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to. Ensure <div id='root'></div> exists in index.html");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider><DesktopHost><App /></DesktopHost></LanguageProvider>
  </React.StrictMode>
);