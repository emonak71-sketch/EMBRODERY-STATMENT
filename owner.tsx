import React from 'react';
import ReactDOM from 'react-dom/client';
import OwnerApp from './components/OwnerApp';
import OwnerDesktopHost from './desktop/OwnerDesktopHost';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Owner Control Center root element is missing.');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <OwnerDesktopHost><OwnerApp /></OwnerDesktopHost>
  </React.StrictMode>
);
