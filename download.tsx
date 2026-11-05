import React from 'react';
import ReactDOM from 'react-dom/client';
import DownloadPortal from './components/DownloadPortal';

const rootElement=document.getElementById('root');
if(!rootElement)throw new Error('Download portal root element is missing.');
ReactDOM.createRoot(rootElement).render(<React.StrictMode><DownloadPortal/></React.StrictMode>);
