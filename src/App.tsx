import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PriceUpdatePage } from './components/PriceUpdatePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PriceUpdatePage />} />
      </Routes>
    </BrowserRouter>
  );
}
