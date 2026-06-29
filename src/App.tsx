import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { PriceLabelPage } from './components/PriceLabelPage';
import { PalletLabelPage } from './components/PalletLabelPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gia" element={<PriceLabelPage />} />
        <Route path="/pallet" element={<PalletLabelPage />} />
      </Routes>
    </BrowserRouter>
  );
}
