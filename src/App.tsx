import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PasswordGate } from './components/PasswordGate';
import { PriceUpdatePage } from './components/PriceUpdatePage';

export default function App() {
  return (
    <BrowserRouter>
      <PasswordGate>
        <Routes>
          <Route path="/" element={<PriceUpdatePage />} />
        </Routes>
      </PasswordGate>
    </BrowserRouter>
  );
}
