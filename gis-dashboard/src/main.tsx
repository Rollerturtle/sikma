// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // ✅ Pastikan ini terimport
import 'leaflet/dist/leaflet.css';
import './index.css';
import Mockup from './index.tsx';
import DetailKejadian from './detailKejadian.tsx';
import 'flowbite';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Mockup />} />
        <Route path="/detail-kejadian/:id" element={<DetailKejadian />} />
      </Routes>
    </Router>
  </StrictMode>,
);