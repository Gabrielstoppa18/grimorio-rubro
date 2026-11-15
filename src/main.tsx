import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DiceProvider } from './components/Dice';
import { Embers } from './components/Ornaments';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Embers />
    <DiceProvider>
      <App />
    </DiceProvider>
  </StrictMode>,
);
