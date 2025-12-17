// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // ✅ Pastikan ini terimport
import 'leaflet/dist/leaflet.css';
import './index.css';
import Mockup from './index.tsx';
import DetailKejadian from './detailKejadian.tsx';
import ActivityDetailPage from './components/datatable/activitydetailpage.tsx';
import 'flowbite';
import Kerawanan from './kerawanan.tsx';
import Kebencanaan from './kejadian.tsx';
import DetailKejadianBencana from './detailkejadianbencana.tsx';
import AdminLogin from './adminlogin.tsx';

createRoot(document.getElementById('root')!).render(

    <Router>
      <Routes>
        
        <Route path="/" element={<Navigate to="/kerawanan" replace />} />
        <Route path="/kerawanan" element={<Kerawanan />} />
        <Route path="/kebencanaan" element={<Kebencanaan />} />
        <Route path="/detailkejadian" element={<DetailKejadianBencana />} />
        <Route path="/administrator-sign-in" element={<AdminLogin />} />

      </Routes>
    </Router>
);