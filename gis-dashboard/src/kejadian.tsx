import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Kebencanaan = () => {
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Lokasi');
  const [selectedCategory, setSelectedCategory] = useState('Kategori');
  const [sortBy, setSortBy] = useState('Newest Listings');
  const [distanceRadius, setDistanceRadius] = useState(75);
  const [distanceEnabled, setDistanceEnabled] = useState(true);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showDistanceDropdown, setShowDistanceDropdown] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      if (mapRef.current && window.L) {
        const map = window.L.map(mapRef.current).setView([-2.5, 118.0], 5);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Add dummy markers
        const markers = [
          { lat: 1.0, lng: 101.0, count: 3 },
          { lat: -2.0, lng: 106.0, count: 16 },
          { lat: -6.2, lng: 106.8, count: 9 },
          { lat: -7.8, lng: 110.4, count: 14 },
          { lat: -8.0, lng: 115.0, count: 33 },
          { lat: 1.5, lng: 124.8, count: 4 },
          { lat: -5.0, lng: 119.5, count: 11 },
          { lat: -8.5, lng: 116.0, count: 5 },
          { lat: -8.7, lng: 115.2, count: 7 },
          { lat: 0.5, lng: 101.5, count: 2 },
          { lat: -1.0, lng: 136.0, count: 1 },
          { lat: -2.5, lng: 140.7, count: 1 },
        ];

        markers.forEach(marker => {
          const color = marker.count > 20 ? '#dc2626' : marker.count > 10 ? '#f87171' : '#fca5a5';
          const icon = window.L.divIcon({
            html: `<div style="background-color: ${color}; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${marker.count}</div>`,
            className: 'custom-marker',
            iconSize: [40, 40],
          });
          window.L.marker([marker.lat, marker.lng], { icon }).addTo(map);
        });

        // Add some circle markers (teal)
        const circles = [
          { lat: 0.0, lng: 117.0 },
          { lat: -3.3, lng: 135.5 },
          { lat: -1.0, lng: 120.0 },
        ];

        circles.forEach(circle => {
          window.L.circleMarker([circle.lat, circle.lng], {
            radius: 15,
            fillColor: '#14b8a6',
            color: '#fff',
            weight: 3,
            fillOpacity: 0.8
          }).addTo(map);
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      link.remove();
      script.remove();
    };
  }, []);

  const provinces = [
    'All Lokasi',
    'Bali',
    'Bangka Belitung',
    'Banten',
    'Bengkulu',
    'DI Yogyakarta',
    'DKI Jakarta',
    'Gorontalo',
    'Jambi',
    'Jawa Barat',
    'Jawa Tengah',
    'Jawa Timur',
    'Kalimantan Barat',
    'Kalimantan Selatan',
    'Kalimantan Tengah',
    'Kalimantan Timur',
    'Kalimantan Utara',
    'Kepulauan Riau',
    'Lampung',
    'Maluku',
    'Maluku Utara',
    'Nusa Tenggara Barat',
    'Nusa Tenggara Timur',
    'Papua',
    'Papua Barat',
    'Riau',
    'Sulawesi Barat',
    'Sulawesi Selatan',
    'Sulawesi Tengah',
    'Sulawesi Tenggara',
    'Sulawesi Utara',
    'Sumatera Barat',
    'Sumatera Selatan',
    'Sumatera Utara',
  ];

  const categories = [
    'Kategori',
    'Banjir',
    'Kebakaran Hutan dan Kekeringan',
    'Tanah Longsor dan Erosi',
  ];

  const sortOptions = [
    'Highest Rated',
    'Newest Listings',
    'Oldest Listings',
    'Alphabetically',
    'Featured',
    'Most Views',
    'Verified',
    'Upcoming Event',
    'Random',
  ];

  const dummyIncidents = [
    {
      id: 1,
      title: 'Kebakaran Hutan terjadi di Riau sejak awal tahun ini.',
      image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
      category: 'Kebakaran Hutan dan Kekeringan',
      date: '23 Mei 2025',
      location: 'Kampar, Riau',
      address: 'Jalan H. Saman',
      featured: true,
    },
    {
      id: 2,
      title: 'Sejumlah warga terdampak banjir di Blora',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      date: '22 Mei 2025',
      location: 'Blora, Jawa Tengah',
      address: 'Kecamatan Blora',
      featured: true,
    },
    {
      id: 3,
      title: 'Ribuan warga terdampak banjir di Karawang',
      image: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?w=400',
      category: 'Banjir',
      date: '21 Mei 2025',
      location: 'Karawang, Jawa Barat',
      address: 'Kecamatan Telukjambe',
      featured: true,
    },
    {
      id: 4,
      title: 'Longsor melanda desa di Cianjur',
      image: 'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
      category: 'Tanah Longsor dan Erosi',
      date: '20 Mei 2025',
      location: 'Cianjur, Jawa Barat',
      address: 'Desa Gasol',
      featured: false,
    },
    {
      id: 5,
      title: 'Kekeringan melanda wilayah Gunungkidul',
      image: 'https://images.unsplash.com/photo-1534809027769-b00d750a6410?w=400',
      category: 'Kebakaran Hutan dan Kekeringan',
      date: '19 Mei 2025',
      location: 'Gunungkidul, DI Yogyakarta',
      address: 'Kecamatan Wonosari',
      featured: false,
    },
    {
      id: 6,
      title: 'Banjir bandang terjadi di Garut',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      date: '18 Mei 2025',
      location: 'Garut, Jawa Barat',
      address: 'Kecamatan Tarogong',
      featured: false,
    },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      {/* Map Section */}
      <div className="relative h-1/2 w-full">
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

        {/* Menu Button */}
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="relative">
            <button 
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              className="bg-orange-500 text-white px-4 py-2 rounded shadow-lg font-semibold hover:bg-orange-600"
            >
              MENU
            </button>
            {showMenuDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenuDropdown(false)}
                />
                <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 w-48 z-50">
                  <div
                    onClick={() => {
                      navigate('/kerawanan');
                      setShowMenuDropdown(false);
                    }}
                    className="px-4 py-3 hover:bg-orange-50 cursor-pointer text-gray-700 font-medium border-b border-gray-200"
                  >
                    Kerawanan
                  </div>
                  <div
                    onClick={() => {
                      navigate('/kebencanaan');
                      setShowMenuDropdown(false);
                    }}
                    className="px-4 py-3 hover:bg-orange-50 cursor-pointer text-gray-700 font-medium"
                  >
                    Kejadian
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search Bar Overlay - Moved to Bottom */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-5xl px-4 z-[1000]">
          <div className="bg-white rounded-full shadow-xl flex items-center overflow-visible relative">
            <input
              type="text"
              placeholder="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1 px-6 py-4 text-gray-700 focus:outline-none"
            />
            
            {/* Location Dropdown */}
            <div className="relative border-l border-gray-200">
              <button
                onClick={() => {
                  setShowLocationDropdown(!showLocationDropdown);
                  setShowCategoryDropdown(false);
                  setShowSortDropdown(false);
                  setShowDistanceDropdown(false);
                }}
                className="px-6 py-4 text-gray-700 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
              >
                {selectedLocation}
                <span className="text-gray-400">▼</span>
              </button>
              {showLocationDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-[1001] pointer-events-auto" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLocationDropdown(false);
                    }}
                  />
                  <div 
                    className="absolute top-full mb-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto w-64 z-[1002] pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="🔍"
                        className="w-full px-3 py-2 border border-gray-300 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {provinces.map((province) => (
                        <div
                          key={province}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLocation(province);
                            setShowLocationDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-gray-700"
                        >
                          {province}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="relative border-l border-gray-200">
              <button
                onClick={() => {
                  setShowCategoryDropdown(!showCategoryDropdown);
                  setShowLocationDropdown(false);
                  setShowSortDropdown(false);
                  setShowDistanceDropdown(false);
                }}
                className="px-6 py-4 text-gray-700 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
              >
                {selectedCategory}
                <span className="text-gray-400">▼</span>
              </button>
              {showCategoryDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-[1001] pointer-events-auto" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCategoryDropdown(false);
                    }}
                  />
                  <div 
                    className="absolute top-full mb-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 w-80 z-[1002] pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory('Kategori');
                          setShowCategoryDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-gray-700"
                      >
                        Kategori
                      </div>
                      {categories.slice(1).map((category) => (
                        <div
                          key={category}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategory(category);
                            setShowCategoryDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-gray-700"
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Search Button */}
            <button className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-4 font-semibold hover:from-red-600 hover:to-pink-600 transition rounded-r-full">
              Search
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        {/* <div className="absolute left-4 top-4 z-[1000] flex flex-col gap-1">
          <button className="bg-white w-10 h-10 flex items-center justify-center rounded shadow text-xl font-bold hover:bg-gray-100">
            +
          </button>
          <button className="bg-white w-10 h-10 flex items-center justify-center rounded shadow text-xl font-bold hover:bg-gray-100">
            −
          </button>
        </div> */}
      </div>

      {/* Incidents Section */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* Controls */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-red-50 text-red-500 border-2 border-red-500' : 'bg-white text-gray-400 border-2 border-gray-200'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-red-50 text-red-500 border-2 border-red-500' : 'bg-white text-gray-400 border-2 border-gray-200'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4h14v2H3V4zm0 5h14v2H3V9zm0 5h14v2H3v-2z"/>
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSortDropdown(!showSortDropdown);
                  setShowDistanceDropdown(false);
                  setShowLocationDropdown(false);
                  setShowCategoryDropdown(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
              >
                {sortBy}
                <span className="text-gray-400">▼</span>
              </button>
              {showSortDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowSortDropdown(false)}
                  />
                  <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 w-56 z-50">
                    {sortOptions.map((option) => (
                      <div
                        key={option}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSortBy(option);
                          setShowSortDropdown(false);
                        }}
                        className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                          option === sortBy ? 'bg-red-500 text-white hover:bg-red-600' : 'text-gray-700'
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Distance Radius Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDistanceDropdown(!showDistanceDropdown);
                  setShowSortDropdown(false);
                  setShowLocationDropdown(false);
                  setShowCategoryDropdown(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
              >
                Distance Radius
                <span className="text-gray-400">▼</span>
              </button>
              {showDistanceDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDistanceDropdown(false)}
                  />
                  <div 
                    className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 w-80 p-4 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-gray-800 mb-2">
                        {distanceEnabled ? `${distanceRadius}km` : 'Disabled'}
                      </div>
                      <div className="text-sm text-gray-500">Radius around selected destination</div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={distanceRadius}
                      onChange={(e) => setDistanceRadius(parseInt(e.target.value))}
                      disabled={!distanceEnabled}
                      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none ${distanceEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      style={{
                        background: distanceEnabled 
                          ? `linear-gradient(to right, #ef4444 0%, #ef4444 ${distanceRadius/2}%, #e5e7eb ${distanceRadius/2}%, #e5e7eb 100%)`
                          : '#e5e7eb'
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDistanceEnabled(!distanceEnabled);
                      }}
                      className={`mt-4 w-full px-4 py-2 rounded transition ${
                        distanceEnabled 
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                          : 'bg-red-500 text-white hover:bg-red-600'
                      }`}
                    >
                      {distanceEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* More Filters */}
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
            >
              More Filters
              <span className="text-gray-400">▼</span>
            </button>
          </div>
        </div>

        {/* Incidents Display */}
        <div className="p-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-6">
              {dummyIncidents.map((incident) => (
                <div key={incident.id} onClick={() => navigate('/detailkejadian')} className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition group cursor-pointer">
                  <div className="relative">
                    <img src={incident.image} alt={incident.title} className="w-full h-48 object-cover" />
                    {incident.featured && (
                      <div className="absolute top-3 left-3 bg-yellow-400 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <span>⭐</span> Featured
                      </div>
                    )}
                    <button onClick={(e) => e.stopPropagation()} className="absolute top-3 right-3 bg-white rounded-full p-2 hover:bg-gray-100">
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
                      </svg>
                    </button>
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-red-500 text-white px-3 py-1 rounded text-xs font-semibold">
                        {incident.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-red-500 transition">
                      {incident.title}
                    </h3>
                    <div className="text-sm text-gray-500 mb-1">{incident.location}</div>
                    <div className="text-xs text-gray-400">{incident.date}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {dummyIncidents.map((incident) => (
                <div key={incident.id} onClick={() => navigate('/detailkejadian')} className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition flex cursor-pointer group">
                  <div className="relative w-80 flex-shrink-0">
                    <img src={incident.image} alt={incident.title} className="w-full h-48 object-cover object-center" />
                    {incident.featured && (
                      <div className="absolute top-3 left-3 bg-yellow-400 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <span>⭐</span> Featured
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-red-500 text-white px-3 py-1 rounded text-xs font-semibold">
                        {incident.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-red-500 transition">
                        {incident.title}
                      </h3>
                    </div>
                  </div>
                  <div className="p-6 flex items-center">
                    <button onClick={(e) => e.stopPropagation()} className="bg-white rounded-full p-3 hover:bg-gray-100 border-2 border-gray-200">
                      <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Kebencanaan;