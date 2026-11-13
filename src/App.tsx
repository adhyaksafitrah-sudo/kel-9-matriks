import { useLayoutEffect, useRef } from 'react';
import { mountLegacyApp } from './legacy/script.js';
import appMarkup from './assets/app-shell.html?raw';
import './App.css';

function App() {
  const shellRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    shell.innerHTML = appMarkup;
    const unmountLegacyApp = mountLegacyApp();

    return () => {
      unmountLegacyApp();
      shell.replaceChildren();
    };
  }, []);

  return <div className="app-shell" ref={shellRef} />;
}

export default App;
