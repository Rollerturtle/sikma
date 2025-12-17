import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {API_URL} from './api';

export default function DetailKejadianBencana() {
  const location = useLocation();
  const navigate = useNavigate();
  const incidentData = location.state?.incident;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [tutupanLahanData, setTutupanLahanData] = useState([]);
  const [dasGeometry, setDasGeometry] = useState(null);
  const [kerawananData, setKerawananData] = useState([]);
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

  // Function untuk fetch data kerawanan berdasarkan kategori
  const fetchKerawananData = async () => {
    if (!incidentData?.coordinates || !incidentData?.category) return;
    
    try {
      const [lat, lon] = incidentData.coordinates;
      const response = await fetch(
        `${API_URL}/api/kerawanan/by-coordinates?longitude=${lon}&latitude=${lat}&category=${encodeURIComponent(incidentData.category)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch kerawanan data');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setKerawananData(data.data);
        console.log('Kerawanan data:', data.data);
      }
    } catch (error) {
      console.error('Error fetching kerawanan data:', error);
      setKerawananData([]);
    }
  };

  // Function untuk fetch tutupan lahan data
  const fetchTutupanLahanData = async () => {
    if (!incidentData?.coordinates) return;
    
    try {
      const [lat, lon] = incidentData.coordinates;
      const response = await fetch(
        `${API_URL}/api/tutupan-lahan/by-coordinates?longitude=${lon}&latitude=${lat}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch tutupan lahan data');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setTutupanLahanData(data.data);
        console.log('Tutupan lahan data:', data.data);
      }
    } catch (error) {
      console.error('Error fetching tutupan lahan:', error);
      setTutupanLahanData([]);
    }
  };

  // Function untuk fetch DAS geometry
const fetchDasGeometry = async () => {
  if (!incidentData?.coordinates) return;
  
  try {
    const [lat, lon] = incidentData.coordinates;
    const response = await fetch(
      `${API_URL}/api/das/geometry-by-coordinates?longitude=${lon}&latitude=${lat}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch DAS geometry');
    }
    
    const data = await response.json();
    
    if (data.success && data.geom) {
      setDasGeometry(data.geom); // data.geom sudah dalam format GeoJSON object
      console.log('DAS geometry loaded:', data.dasName);
    }
  } catch (error) {
    console.error('Error fetching DAS geometry:', error);
    setDasGeometry(null);
  }
};

  // Helper function untuk menentukan warna dan label curah hujan
  const getRainfallColorAndLabel = (rainfall) => {
    if (rainfall === 0) {
      return { color: '#9CA3AF', label: 'Berawan', bg: '#F3F4F6' };
    } else if (rainfall > 0 && rainfall <= 20) {
      return { color: '#10B981', label: 'Hujan ringan', bg: '#D1FAE5' };
    } else if (rainfall > 20 && rainfall <= 50) {
      return { color: '#F59E0B', label: 'Hujan sedang', bg: '#FEF3C7' };
    } else if (rainfall > 50 && rainfall <= 100) {
      return { color: '#F97316', label: 'Hujan lebat', bg: '#FFEDD5' };
    } else if (rainfall > 100 && rainfall <= 150) {
      return { color: '#EF4444', label: 'Hujan sangat lebat', bg: '#FEE2E2' };
    } else {
      return { color: '#A855F7', label: 'Hujan ekstrem', bg: '#F3E8FF' };
    }
  };

  // Generate random colors for tutupan lahan bars
  const getBarColor = (index) => {
    const colors = ['#EC4899', '#3B82F6', '#F59E0B', '#14B8A6', '#A855F7', '#EF4444', '#10B981'];
    return colors[index % colors.length];
  };

  const scrollToSection = (ref, tabName) => {
    setActiveTab(tabName);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Helper function untuk mendapatkan judul tabel berdasarkan kategori
  const getKerawananTableTitle = () => {
    if (incidentData?.category === 'Banjir') {
      return 'Data Rawan Limpasan';
    } else if (incidentData?.category === 'Kebakaran Hutan dan Kekeringan') {
      return 'Data Rawan Karhutla';
    } else if (incidentData?.category === 'Tanah Longsor dan Erosi') {
      return 'Data Rawan Erosi';
    }
    return 'Data Lahan Kritis';
  };

  // Helper function untuk mendapatkan header kolom
  const getKerawananTableHeaders = () => {
    if (incidentData?.category === 'Banjir') {
      return ['Tingkat Limpasan', 'Luas Limpasan (Ha)'];
    } else if (incidentData?.category === 'Kebakaran Hutan dan Kekeringan') {
      return ['Tingkat Kerawanan', 'Luas Wilayah (Ha)'];
    } else if (incidentData?.category === 'Tanah Longsor dan Erosi') {
      return ['Tingkat Kerawanan', 'Luas Wilayah (Ton/Ha)'];
    }
    return ['Kelas', 'Luas'];
  };

  // Initialize Leaflet map and fetch data
useEffect(() => {
  if (!incidentData) return;

  // Fetch tutupan lahan and DAS data HANYA SEKALI
  fetchTutupanLahanData();
  fetchDasGeometry();
  fetchKerawananData();

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
}, [incidentData]); // HAPUS dasGeometry dari dependency!

// Separate useEffect untuk render DAS layer ketika dasGeometry tersedia
useEffect(() => {
  if (dasGeometry && mapInstanceRef.current && window.L) {
    console.log('Adding DAS layer to map');
    
    // Hapus layer DAS lama jika ada
    if (mapInstanceRef.current._dasLayer) {
      mapInstanceRef.current.removeLayer(mapInstanceRef.current._dasLayer);
    }
    
    // Tambah layer DAS baru
    const dasLayer = window.L.geoJSON(dasGeometry, {
      style: {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.8,
        fillColor: '#dbeafe',
        fillOpacity: 0.2
      }
    }).addTo(mapInstanceRef.current);
    
    // Simpan reference untuk cleanup nanti
    mapInstanceRef.current._dasLayer = dasLayer;
  }
}, [dasGeometry]);

// Tambahkan di awal component untuk debug
useEffect(() => {
  if (incidentData) {
    console.log('=== INCIDENT DATA DEBUG ===');
    console.log('Full incidentData:', incidentData);
    console.log('curah_hujan value:', incidentData.curah_hujan);
    console.log('curah_hujan type:', typeof incidentData.curah_hujan);
    console.log('Has curah_hujan property:', 'curah_hujan' in incidentData);
  }
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
              {/* <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                <span className="text-sm text-gray-700">Bookmark this listing</span>
              </button> */}
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
                    {incidentData?.curah_hujan !== undefined && incidentData?.curah_hujan !== null ? (
                      <div>
                        <div 
                          className="rounded-lg p-6 flex flex-col items-center justify-center"
                          style={{ 
                            backgroundColor: getRainfallColorAndLabel(incidentData.curah_hujan).bg 
                          }}
                        >
                          <div 
                            className="text-3xl font-black mb-2"
                            style={{ 
                              color: getRainfallColorAndLabel(incidentData.curah_hujan).color 
                            }}
                          >
                            {incidentData.curah_hujan} mm/hari
                          </div>
                          <div 
                            className="text-sm font-semibold uppercase tracking-wide"
                            style={{ 
                              color: getRainfallColorAndLabel(incidentData.curah_hujan).color 
                            }}
                          >
                            {getRainfallColorAndLabel(incidentData.curah_hujan).label}
                          </div>
                        </div>
                        
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <p className="text-sm">Data curah hujan tidak tersedia</p>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Data Tutupan Lahan</h4>
                    {tutupanLahanData.length > 0 ? (
                      <div>
                        <div className="flex gap-2 h-32 items-end">
                          {tutupanLahanData.slice(0, 7).map((item, index) => {
                            const maxCount = Math.max(...tutupanLahanData.map(d => d.count));
                            const height = (item.count / maxCount) * 100;
                            
                            return (
                              <div 
                                key={index}
                                className="flex-1 rounded-t relative group cursor-pointer"
                                style={{
                                  height: `${height}%`,
                                  backgroundColor: getBarColor(index),
                                  minHeight: '20%'
                                }}
                                title={`${item.deskripsi_domain}: ${item.count}`}
                              >
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                  <div className="font-semibold">{item.deskripsi_domain}</div>
                                  <div className="text-xs">Jumlah: {item.count}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Hover untuk melihat detail tutupan lahan
                        </p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <p className="text-sm">Tidak ada data tutupan lahan</p>
                      </div>
                    )}
                  </div>

                  <div>
  <h4 className="text-sm font-medium text-gray-700 mb-3">{getKerawananTableTitle()}</h4>
  {kerawananData.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            {getKerawananTableHeaders().map((header, idx) => (
              <th key={idx} className="text-left py-2 px-2 font-medium text-gray-600">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {kerawananData.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              <td className="py-2 px-2 text-gray-700">{item.tingkat}</td>
              <td className="py-2 px-2 text-gray-700">
                {parseFloat(item.luas_total).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="text-center text-gray-400 py-4">
      <p className="text-xs">Tidak ada data kerawanan</p>
    </div>
  )}
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