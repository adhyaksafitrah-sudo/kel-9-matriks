import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemen React root tidak ditemukan.');
}

createRoot(rootElement).render(<App />);
