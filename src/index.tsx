import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('Registrando Service Worker para funcionalidades PWA');
    
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration);
        
        // Verificar atualizações a cada 60 minutos
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((registrationError) => {
        console.error('Falha ao registrar Service Worker:', registrationError);
      });
  });
}