import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_URL } from './api';

export default function DetailKejadianBencana() {
  const location = useLocation();
  const navigate = useNavigate();
  const incidentData = location.state?.incident;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  
  const overviewRef = useRef(null);
  const galleryRef = useRef(null);
  const locationRef = useRef(null);

  // Extract province from location (after comma)
  const getProvince = (locationStr) => {
    if (!locationStr) return '';
    const parts = locationStr.split(',');
    return parts.length > 1 ? parts[1].trim() : locationStr;
  };

  // Extract city from location (before comma)
  const getCity = (locationStr) => {
    if (!locationStr) return '';
    const parts = locationStr.split(',');
    return parts[0].trim();
  };

  // Dummy photos array - simulasi 12 foto
  const dummyPhotos = [
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
    'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
    'https://images.unsplash.com/photo-1551522435-a13afa10f103?w=400',
    'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
    'https://images.unsplash.com/photo-1534809027769-b00d750a6410?w=400',
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
    'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
    'https://images.unsplash.com/photo-1551522435-a13afa10f103?w=400',
    'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
    'https://images.unsplash.com/photo-1534809027769-b00d750a6410?w=400',
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
    'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
  ];

  const scrollToSection = (ref, tabName) => {
    setActiveTab(tabName);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!incidentData) return;

    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);

    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.onload = () => {
      if (mapRef.current && window.L && !mapInstanceRef.current) {
        const map = window.L.map(mapRef.current).setView(incidentData.coordinates, 13);
        
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        
        // Create custom icon based on incident type
        const createCustomIcon = (type) => {
          let iconSVG = '';
          
          if (type === 'banjir') {
            iconSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>`;
          } else if (type === 'longsor') {
            iconSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>`;
          } else if (type === 'kebakaran') {
            iconSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
            </svg>`;
          }
          
          return window.L.divIcon({
            className: 'custom-detail-marker',
            html: `
              <div class="marker-container" style="position: relative; width: 44px; height: 44px;">
                <svg class="marker-circle" width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
                  <circle class="marker-bg" cx="22" cy="22" r="20" fill="#3b82f6" stroke="white" stroke-width="3" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"/>
                </svg>
                <div style="position: absolute; top: 12px; left: 12px; pointer-events: none;">
                  ${iconSVG}
                </div>
              </div>
            `,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });
        };

        window.L.marker(incidentData.coordinates, {
          icon: createCustomIcon(incidentData.type)
        }).addTo(map);
        
        mapInstanceRef.current = map;
      }
    };
    document.head.appendChild(leafletScript);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      leafletCSS.remove();
      leafletScript.remove();
    };
  }, [incidentData]);

  // If no incident data, show error
  if (!incidentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Data tidak ditemukan</h1>
          <p className="text-gray-600 mb-4">Silakan kembali ke halaman kejadian</p>
          <button
            onClick={() => navigate('/kebencanaan')}
            className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition"
          >
            Kembali ke Halaman Kejadian
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .custom-detail-marker {
            background: none;
            border: none;
          }
        `}
      </style>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-red-500 bg-red-50 px-3 py-1 rounded-full">{incidentData.category}</span>
              {incidentData?.location && 
                incidentData.location.split(',').map((loc, idx) => (
                  <span key={`loc-${idx}`} className="text-sm text-red-500 bg-red-50 px-3 py-1 rounded-full">
                    {loc.trim()}
                  </span>
                ))
              }
              
              {/* DAS tag */}
              {incidentData?.das && (
                <span className="text-sm text-red-500 bg-red-50 px-3 py-1 rounded-full">
                  {incidentData.das}
                </span>
              )}
            </div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-normal text-gray-800 mb-2">
                  {incidentData.title}
                </h1>
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{incidentData.location}</span>
                </div>
              </div>
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                <span className="text-sm text-gray-700">Bookmark this listing</span>
              </button>
            </div>

            <div className="relative rounded-lg overflow-hidden mb-6">
              <img
                src={incidentData.image}
                alt={incidentData.title}
                className="w-full h-96 object-cover"
              />
              <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded text-sm">
                {incidentData.date}
              </div>
            </div>

            <div className="flex gap-8 border-b border-gray-200 mb-6">
              <button
                onClick={() => scrollToSection(overviewRef, 'overview')}
                className={`pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'overview' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => scrollToSection(galleryRef, 'gallery')}
                className={`pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'gallery' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Gallery
              </button>
              <button
                onClick={() => scrollToSection(locationRef, 'location')}
                className={`pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'location' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Location
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div ref={overviewRef} className="mb-8 scroll-mt-4">
                  <p className="text-gray-700 leading-relaxed mb-6 text-justify">
                   {incidentData?.description || 'Tidak ada deskripsi'}
                  </p>

                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">Categories</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">{incidentData.category}</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">Regions</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">
                          {incidentData?.location ? 
                            incidentData.location.split(',').slice(-1)[0].trim() // Ambil bagian terakhir (provinsi)
                            : 'Unknown'
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">{incidentData.das}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gallery Section */}
                <div ref={galleryRef} className="mb-8 scroll-mt-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Gallery</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {incidentData?.images_paths && incidentData.images_paths.length > 0 ? (
                      incidentData.images_paths.slice(0, 10).map((photo, idx) => (
                        <div key={idx} className="relative aspect-square">
                          <img
                            src={`${API_URL}${photo}`}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover rounded cursor-pointer hover:opacity-80 transition"
                            onClick={() => setSelectedPhotoIndex(idx)}
                          />
                          {idx === 9 && incidentData.images_paths.length > 10 && (
                            <div 
                              className="absolute inset-0 bg-black/50 bg-opacity-70 flex items-center justify-center rounded cursor-pointer hover:bg-opacity-60 transition"
                              onClick={() => setSelectedPhotoIndex(idx)}
                            >
                              <span className="text-white text-3xl font-bold">+{incidentData.images_paths.length - 10}</span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-5 text-center py-8 text-gray-400 text-sm">
                        Tidak ada foto
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Section with Leaflet Map */}
                <div ref={locationRef} className="scroll-mt-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Location</h3>
                  <div className="bg-gray-100 rounded-lg overflow-hidden h-96 relative">
                    <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
                    <button className="absolute top-4 left-4 bg-white px-4 py-2 rounded shadow-md text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors z-[1000]">
                      <MapPin className="w-4 h-4" />
                      Get Directions
                    </button>
                    <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded shadow-md text-xs text-gray-600 z-[1000]">
                      Leaflet | © OpenStreetMap contributors
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Informasi Kondisi Lokasi</h3>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Data Curah Hujan</h4>
                    <div className="relative h-40">
                      <svg viewBox="0 0 200 80" className="w-full h-full">
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        <polyline
                          points="0,60 20,50 40,30 60,20 80,25 100,40 120,55 140,50 160,40 180,45 200,50"
                          fill="url(#gradient)"
                          stroke="#3b82f6"
                          strokeWidth="2"
                        />
                        <line x1="0" y1="40" x2="200" y2="40" stroke="#ef4444" strokeWidth="1" strokeDasharray="4" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Data curah hujan (mm/bulan)</p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Data Tutupan Lahan</h4>
                    <div className="flex gap-2 h-32 items-end">
                      <div className="flex-1 bg-pink-400 rounded-t" style={{height: '85%'}}></div>
                      <div className="flex-1 bg-blue-400 rounded-t" style={{height: '95%'}}></div>
                      <div className="flex-1 bg-yellow-400 rounded-t" style={{height: '60%'}}></div>
                      <div className="flex-1 bg-teal-400 rounded-t" style={{height: '70%'}}></div>
                      <div className="flex-1 bg-purple-400 rounded-t" style={{height: '40%'}}></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Data Lahan Kritis</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Kelas</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Luas (ha)</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-100">
                            <td className="py-2 px-2 text-gray-700">SR</td>
                            <td className="py-2 px-2 text-gray-700">1</td>
                            <td className="py-2 px-2 text-gray-700">5</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-2 px-2 text-gray-700">K</td>
                            <td className="py-2 px-2 text-gray-700">15</td>
                            <td className="py-2 px-2 text-gray-700">20</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-2 px-2 text-gray-700">AK</td>
                            <td className="py-2 px-2 text-gray-700">8</td>
                            <td className="py-2 px-2 text-gray-700">11.4</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-2 px-2 text-gray-700">P</td>
                            <td className="py-2 px-2 text-gray-700">No</td>
                            <td className="py-2 px-2 text-gray-700">8</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-2 text-gray-700">TP</td>
                            <td className="py-2 px-2 text-gray-700">23</td>
                            <td className="py-2 px-2 text-gray-700">31</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Modal - Full Screen Viewer */}
    {selectedPhotoIndex !== null && incidentData?.images_paths && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center"
        style={{ zIndex: 9999 }}
        onClick={() => setSelectedPhotoIndex(null)}
      >
        <button 
          onClick={() => setSelectedPhotoIndex(null)}
          className="absolute top-4 right-4 text-white hover:text-gray-300"
          style={{ zIndex: 10000 }}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Previous Button */}
        {selectedPhotoIndex > 0 && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPhotoIndex(prev => prev - 1);
            }}
            className="absolute left-4 text-white hover:text-gray-300"
            style={{ zIndex: 10000 }}
          >
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Photo */}
        <div 
          className="max-w-7xl max-h-screen p-4" 
          onClick={(e) => e.stopPropagation()}
          style={{ zIndex: 10000 }}
        >
          <img 
            src={`${API_URL}${incidentData.images_paths[selectedPhotoIndex]}`}
            alt={`Photo ${selectedPhotoIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain mx-auto"
          />
          <p className="text-white text-center mt-4">
            {selectedPhotoIndex + 1} / {incidentData.images_paths.length}
          </p>
        </div>

        {/* Next Button */}
        {selectedPhotoIndex < incidentData.images_paths.length - 1 && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPhotoIndex(prev => prev + 1);
            }}
            className="absolute right-4 text-white hover:text-gray-300"
            style={{ zIndex: 10000 }}
          >
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    )}
      </div>
    </>
  );
}