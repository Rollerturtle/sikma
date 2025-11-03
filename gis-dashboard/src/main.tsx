// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // ✅ Pastikan ini terimport
import 'leaflet/dist/leaflet.css';
import './index.css';
import Mockup from './index.tsx';
import DetailKejadian from './detailKejadian.tsx';
import ActivityDetailPage from './components/datatable/activitydetailpage.tsx';
import 'flowbite';

createRoot(document.getElementById('root')!).render(

    <Router>
      <Routes>
        <Route path="/" element={<Mockup />} />
        <Route path="/detail-kejadian/:id" element={<DetailKejadian />} />
        <Route path="/activity/detail/:id" element={<ActivityDetailPage />} />
      </Routes>
    </Router>
);