import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Kebencanaan = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerClusterGroupRef = useRef(null);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('grid');
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
  const [mapBounds, setMapBounds] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showItemsPerPageDropdown, setShowItemsPerPageDropdown] = useState(false);

  // Extended dummy data with more incidents across Indonesia
  const dummyIncidents = [
    {
      id: 1,
      title: 'Kebakaran Hutan terjadi di Riau sejak awal tahun ini.',
      image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
      category: 'Kebakaran Hutan dan Kekeringan',
      type: 'kebakaran',
      date: '23 Mei 2025',
      location: 'Kampar, Riau',
      address: 'Jalan H. Saman',
      coordinates: [0.3397, 101.1427],
      featured: true,
    },
    {
      id: 2,
      title: 'Sejumlah warga terdampak banjir di Blora',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '22 Mei 2025',
      location: 'Blora, Jawa Tengah',
      address: 'Kecamatan Blora',
      coordinates: [-6.9698, 111.4194],
      featured: true,
    },
    {
      id: 3,
      title: 'Ribuan warga terdampak banjir di Karawang',
      image: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '21 Mei 2025',
      location: 'Karawang, Jawa Barat',
      address: 'Kecamatan Telukjambe',
      coordinates: [-6.3064, 107.3020],
      featured: true,
    },
    {
      id: 4,
      title: 'Longsor melanda desa di Cianjur',
      image: 'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
      category: 'Tanah Longsor dan Erosi',
      type: 'longsor',
      date: '20 Mei 2025',
      location: 'Cianjur, Jawa Barat',
      address: 'Desa Gasol',
      coordinates: [-6.8166, 107.1427],
      featured: false,
    },
    {
      id: 5,
      title: 'Kekeringan melanda wilayah Gunungkidul',
      image: 'https://images.unsplash.com/photo-1534809027769-b00d750a6410?w=400',
      category: 'Kebakaran Hutan dan Kekeringan',
      type: 'kebakaran',
      date: '19 Mei 2025',
      location: 'Gunungkidul, DI Yogyakarta',
      address: 'Kecamatan Wonosari',
      coordinates: [-7.9781, 110.5964],
      featured: false,
    },
    {
      id: 6,
      title: 'Banjir bandang terjadi di Garut',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '18 Mei 2025',
      location: 'Garut, Jawa Barat',
      address: 'Kecamatan Tarogong',
      coordinates: [-7.2206, 107.9079],
      featured: false,
    },
    {
      id: 7,
      title: 'Banjir merendam pemukiman warga di Bandung',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '17 Mei 2025',
      location: 'Bandung, Jawa Barat',
      coordinates: [-6.9175, 107.6191],
      featured: false,
    },
    {
      id: 8,
      title: 'Longsor terjadi di jalur Puncak',
      image: 'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
      category: 'Tanah Longsor dan Erosi',
      type: 'longsor',
      date: '16 Mei 2025',
      location: 'Bogor, Jawa Barat',
      coordinates: [-6.5971, 106.8060],
      featured: false,
    },
    {
      id: 9,
      title: 'Banjir rob melanda pesisir Indramayu',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '15 Mei 2025',
      location: 'Indramayu, Jawa Barat',
      coordinates: [-6.3269, 108.3199],
      featured: false,
    },
    {
      id: 10,
      title: 'Banjir melanda Semarang',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '14 Mei 2025',
      location: 'Semarang, Jawa Tengah',
      coordinates: [-6.9667, 110.4167],
      featured: true,
    },
    {
      id: 11,
      title: 'Longsor di Wonosobo tutup akses jalan',
      image: 'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
      category: 'Tanah Longsor dan Erosi',
      type: 'longsor',
      date: '13 Mei 2025',
      location: 'Wonosobo, Jawa Tengah',
      coordinates: [-7.3631, 109.9036],
      featured: false,
    },
    {
      id: 12,
      title: 'Banjir di Pekalongan merendam ratusan rumah',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '12 Mei 2025',
      location: 'Pekalongan, Jawa Tengah',
      coordinates: [-6.8886, 109.6753],
      featured: false,
    },
    {
      id: 13,
      title: 'Banjir bandang terjadi di Malang',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '11 Mei 2025',
      location: 'Malang, Jawa Timur',
      coordinates: [-7.9797, 112.6304],
      featured: true,
    },
    {
      id: 14,
      title: 'Longsor di kawasan Bromo',
      image: 'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
      category: 'Tanah Longsor dan Erosi',
      type: 'longsor',
      date: '10 Mei 2025',
      location: 'Probolinggo, Jawa Timur',
      coordinates: [-7.7543, 113.2159],
      featured: false,
    },
    {
      id: 15,
      title: 'Banjir melanda Surabaya',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '9 Mei 2025',
      location: 'Surabaya, Jawa Timur',
      coordinates: [-7.2575, 112.7521],
      featured: false,
    },
    {
      id: 16,
      title: 'Kebakaran hutan meluas di Jambi',
      image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
      category: 'Kebakaran Hutan dan Kekeringan',
      type: 'kebakaran',
      date: '8 Mei 2025',
      location: 'Jambi, Jambi',
      coordinates: [-1.6101, 103.6131],
      featured: true,
    },
    {
      id: 17,
      title: 'Banjir bandang di Padang',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '7 Mei 2025',
      location: 'Padang, Sumatera Barat',
      coordinates: [-0.9471, 100.4172],
      featured: false,
    },
    {
      id: 18,
      title: 'Longsor terjadi di Bukittinggi',
      image: 'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
      category: 'Tanah Longsor dan Erosi',
      type: 'longsor',
      date: '6 Mei 2025',
      location: 'Bukittinggi, Sumatera Barat',
      coordinates: [-0.3055, 100.3692],
      featured: false,
    },
    {
      id: 19,
      title: 'Banjir melanda Medan',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '5 Mei 2025',
      location: 'Medan, Sumatera Utara',
      coordinates: [3.5952, 98.6722],
      featured: false,
    },
    {
      id: 20,
      title: 'Kebakaran hutan di Palembang',
      image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
      category: 'Kebakaran Hutan dan Kekeringan',
      type: 'kebakaran',
      date: '4 Mei 2025',
      location: 'Palembang, Sumatera Selatan',
      coordinates: [-2.9761, 104.7754],
      featured: false,
    },
    {
      id: 21,
      title: 'Kebakaran hutan meluas di Pontianak',
      image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
      category: 'Kebakaran Hutan dan Kekeringan',
      type: 'kebakaran',
      date: '3 Mei 2025',
      location: 'Pontianak, Kalimantan Barat',
      coordinates: [-0.0263, 109.3425],
      featured: true,
    },
    {
      id: 22,
      title: 'Banjir di Banjarmasin',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '2 Mei 2025',
      location: 'Banjarmasin, Kalimantan Selatan',
      coordinates: [-3.3194, 114.5900],
      featured: false,
    },
    {
      id: 23,
      title: 'Kebakaran hutan di Balikpapan',
      image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
      category: 'Kebakaran Hutan dan Kekeringan',
      type: 'kebakaran',
      date: '1 Mei 2025',
      location: 'Balikpapan, Kalimantan Timur',
      coordinates: [-1.2379, 116.8529],
      featured: false,
    },
    {
      id: 24,
      title: 'Banjir bandang di Makassar',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '30 Apr 2025',
      location: 'Makassar, Sulawesi Selatan',
      coordinates: [-5.1477, 119.4327],
      featured: false,
    },
    {
      id: 25,
      title: 'Longsor di Manado',
      image: 'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
      category: 'Tanah Longsor dan Erosi',
      type: 'longsor',
      date: '29 Apr 2025',
      location: 'Manado, Sulawesi Utara',
      coordinates: [1.4748, 124.8421],
      featured: false,
    },
    {
      id: 26,
      title: 'Banjir rob di Denpasar',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '28 Apr 2025',
      location: 'Denpasar, Bali',
      coordinates: [-8.6705, 115.2126],
      featured: false,
    },
    {
      id: 27,
      title: 'Longsor di kawasan Gunung Rinjani',
      image: 'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
      category: 'Tanah Longsor dan Erosi',
      type: 'longsor',
      date: '27 Apr 2025',
      location: 'Lombok, Nusa Tenggara Barat',
      coordinates: [-8.5833, 116.1167],
      featured: false,
    },
    {
      id: 28,
      title: 'Banjir melanda Jayapura',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '26 Apr 2025',
      location: 'Jayapura, Papua',
      coordinates: [-2.5920, 140.6689],
      featured: false,
    },
    {
      id: 29,
      title: 'Banjir merendam Jakarta Utara',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '25 Apr 2025',
      location: 'Jakarta Utara, DKI Jakarta',
      coordinates: [-6.1381, 106.8634],
      featured: true,
    },
    {
      id: 30,
      title: 'Banjir di Tangerang Selatan',
      image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
      category: 'Banjir',
      type: 'banjir',
      date: '24 Apr 2025',
      location: 'Tangerang Selatan, Banten',
      coordinates: [-6.2900, 106.7200],
      featured: false,
    },
  ];

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

  // Mapping category to type
  const categoryToType = {
    'Banjir': 'banjir',
    'Kebakaran Hutan dan Kekeringan': 'kebakaran',
    'Tanah Longsor dan Erosi': 'longsor',
  };

  // Filter function with map bounds
  const getFilteredIncidents = () => {
    return dummyIncidents.filter(incident => {
      const matchesSearch = searchText === '' || 
        incident.title.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesLocation = selectedLocation === 'All Lokasi' || 
        incident.location.toLowerCase().includes(selectedLocation.toLowerCase());
      
      const matchesCategory = selectedCategory === 'Kategori' || 
        incident.type === categoryToType[selectedCategory];
      
      let matchesBounds = true;
      if (mapBounds && window.L) {
        const [lat, lng] = incident.coordinates;
        matchesBounds = mapBounds.contains([lat, lng]);
      }
      
      return matchesSearch && matchesLocation && matchesCategory && matchesBounds;
    });
  };

  const filteredIncidents = getFilteredIncidents();

  // Pagination calculations
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedLocation, selectedCategory, mapBounds, itemsPerPage]);

  // Initialize map once
  useEffect(() => {
    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);

    const clusterCSS = document.createElement('link');
    clusterCSS.rel = 'stylesheet';
    clusterCSS.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
    document.head.appendChild(clusterCSS);

    const clusterDefaultCSS = document.createElement('link');
    clusterDefaultCSS.rel = 'stylesheet';
    clusterDefaultCSS.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
    document.head.appendChild(clusterDefaultCSS);

    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.onload = () => {
      const clusterScript = document.createElement('script');
      clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
      clusterScript.onload = () => {
        if (mapRef.current && window.L && !mapInstanceRef.current) {
          console.log('🗺️ Initializing map...');
          const map = window.L.map(mapRef.current).setView([-2.5, 118.0], 5);
          
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);
          
          mapInstanceRef.current = map;

          markerClusterGroupRef.current = window.L.markerClusterGroup({
            maxClusterRadius: 80,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: function(cluster) {
              const childCount = cluster.getChildCount();
              let c = ' marker-cluster-';
              if (childCount < 10) {
                c += 'small';
              } else if (childCount < 30) {
                c += 'medium';
              } else {
                c += 'large';
              }
              return new window.L.DivIcon({ 
                html: '<div><span>' + childCount + '</span></div>', 
                className: 'marker-cluster' + c, 
                iconSize: new window.L.Point(40, 40) 
              });
            }
          });

          console.log('✅ Cluster group created');

          const updateBounds = () => {
            setMapBounds(map.getBounds());
          };

          map.on('moveend', updateBounds);
          map.on('zoomend', updateBounds);
          
          updateBounds();

          console.log('✅ Map initialized, triggering marker creation...');
          setTimeout(() => {
            setMapBounds(map.getBounds());
          }, 100);
        }
      };
      document.head.appendChild(clusterScript);
    };
    document.head.appendChild(leafletScript);

    return () => {
      leafletCSS.remove();
      clusterCSS.remove();
      clusterDefaultCSS.remove();
      leafletScript.remove();
    };
  }, []);

  // Update markers based on filters
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !markerClusterGroupRef.current) {
      console.log('⏳ Waiting for map/cluster to be ready...');
      return;
    }

    console.log('🔄 Updating markers...');

    markerClusterGroupRef.current.clearLayers();

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
        className: 'custom-incident-marker',
        html: `
          <div class="marker-container" style="position: relative; width: 44px; height: 44px; cursor: pointer;">
            <svg class="marker-circle" width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
              <circle class="marker-bg" cx="22" cy="22" r="20" fill="#3b82f6" stroke="white" stroke-width="3" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); transition: fill 0.2s ease;"/>
            </svg>
            <div style="position: absolute; top: 12px; left: 12px; pointer-events: none;">
              ${iconSVG}
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
      });
    };

    const filteredForMarkers = dummyIncidents.filter(incident => {
      const matchesSearch = searchText === '' || 
        incident.title.toLowerCase().includes(searchText.toLowerCase());
      const matchesLocation = selectedLocation === 'All Lokasi' || 
        incident.location.toLowerCase().includes(selectedLocation.toLowerCase());
      const matchesCategory = selectedCategory === 'Kategori' || 
        incident.type === categoryToType[selectedCategory];
      
      return matchesSearch && matchesLocation && matchesCategory;
    });
    
    filteredForMarkers.forEach(incident => {
      const marker = window.L.marker(incident.coordinates, {
        icon: createCustomIcon(incident.type)
      });

      marker.incidentData = incident;

      marker.on('click', function(e) {
        const inc = this.incidentData;
        if (!inc) return;
        
        const popupContent = `
          <div onclick="window.navigateToDetail()" style="width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 8px; overflow: hidden; cursor: pointer;">
            <div style="position: relative; width: 100%; height: 180px; overflow: hidden;">
              <img 
                src="${inc.image}" 
                alt="${inc.title}"
                style="width: 100%; height: 100%; object-fit: cover;"
              />
              
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);"></div>
              
              <button 
                onclick="event.stopPropagation(); event.preventDefault(); if(window.closeCurrentPopup) window.closeCurrentPopup();"
                style="position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; background: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10; font-size: 16px; line-height: 1; color: #333; padding: 0; transition: background-color 0.2s;"
                onmouseover="this.style.backgroundColor='#f3f4f6'"
                onmouseout="this.style.backgroundColor='white'"
              >
                ×
              </button>
              
              <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 16px; z-index: 5; pointer-events: none;">
                <h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: white; line-height: 1.3; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                  ${inc.title}
                </h3>
                <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.9); text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                  ${inc.location}
                </p>
              </div>
            </div>
            
            <div style="background: white; padding: 12px 16px;">
              <p style="margin: 0; font-size: 13px; color: #999;">
                Not rated yet
              </p>
            </div>
          </div>
        `;
        
        window.navigateToDetail = () => {
          navigate('/detailkejadian');
        };
        
        window.closeCurrentPopup = () => {
          mapInstanceRef.current.closePopup();
        };
        
        try {
          const popup = window.L.popup({
            maxWidth: 280,
            minWidth: 280,
            closeButton: false,
            className: 'custom-incident-popup',
            autoClose: true,
            closeOnClick: true
          })
          .setLatLng(e.latlng)
          .setContent(popupContent);
          
          popup.openOn(mapInstanceRef.current);
        } catch (error) {
          console.error('❌ Error creating/opening popup:', error);
        }
      });

      markerClusterGroupRef.current.addLayer(marker);
    });

    mapInstanceRef.current.addLayer(markerClusterGroupRef.current);

    console.log('✅ Markers updated:', filteredForMarkers.length);

    if (filteredForMarkers.length > 0 && !mapBounds) {
      try {
        const bounds = window.L.latLngBounds(filteredForMarkers.map(inc => inc.coordinates));
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [searchText, selectedLocation, selectedCategory, mapBounds]);

  return (
    <>
      <style>
        {`
          .custom-incident-marker {
            background: none;
            border: none;
          }
          
          .marker-container:hover .marker-bg {
            fill: #ef4444 !important;
          }
          
          .custom-incident-popup .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          }
          .custom-incident-popup .leaflet-popup-content {
            margin: 0;
            width: 280px !important;
          }
          .custom-incident-popup .leaflet-popup-tip-container {
            display: none;
          }

          .custom-incident-popup .leaflet-popup-content-wrapper:hover {
            box-shadow: 0 6px 24px rgba(0,0,0,0.2);
            transform: translateY(-2px);
            transition: all 0.3s ease;
          }

          .marker-cluster-small {
            background-color: rgba(181, 226, 140, 0.6);
          }
          .marker-cluster-small div {
            background-color: rgba(110, 204, 57, 0.6);
          }
          .marker-cluster-medium {
            background-color: rgba(241, 211, 87, 0.6);
          }
          .marker-cluster-medium div {
            background-color: rgba(240, 194, 12, 0.6);
          }
          .marker-cluster-large {
            background-color: rgba(253, 156, 115, 0.6);
          }
          .marker-cluster-large div {
            background-color: rgba(241, 128, 23, 0.6);
          }
          .marker-cluster {
            background-clip: padding-box;
            border-radius: 20px;
          }
          .marker-cluster div {
            width: 30px;
            height: 30px;
            margin-left: 5px;
            margin-top: 5px;
            text-align: center;
            border-radius: 15px;
            font: 12px "Helvetica Neue", Arial, Helvetica, sans-serif;
          }
          .marker-cluster span {
            line-height: 30px;
            color: white;
            font-weight: bold;
          }
        `}
      </style>
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

        {/* Search Bar Overlay */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-5xl px-4 z-[1000]">
          <div className="bg-white rounded-full shadow-xl flex items-center overflow-visible relative">
            <input
              type="text"
              placeholder="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1 px-6 py-4 text-gray-700 focus:outline-none rounded-l-full"
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
            
            {/* Display count of visible incidents */}
            <span className="ml-2 text-sm text-gray-600">
              Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredIncidents.length)} dari {filteredIncidents.length} kejadian
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Items Per Page Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowItemsPerPageDropdown(!showItemsPerPageDropdown);
                  setShowSortDropdown(false);
                  setShowDistanceDropdown(false);
                  setShowLocationDropdown(false);
                  setShowCategoryDropdown(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="text-sm">{itemsPerPage} per halaman</span>
                <span className="text-gray-400">▼</span>
              </button>
              {showItemsPerPageDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowItemsPerPageDropdown(false)}
                  />
                  <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 w-40 z-50">
                    {[10, 30, 50, 100].map((num) => (
                      <div
                        key={num}
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemsPerPage(num);
                          setShowItemsPerPageDropdown(false);
                        }}
                        className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                          num === itemsPerPage ? 'bg-red-500 text-white hover:bg-red-600' : 'text-gray-700'
                        }`}
                      >
                        {num} per halaman
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSortDropdown(!showSortDropdown);
                  setShowDistanceDropdown(false);
                  setShowLocationDropdown(false);
                  setShowCategoryDropdown(false);
                  setShowItemsPerPageDropdown(false);
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
                  setShowItemsPerPageDropdown(false);
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
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Tidak ada kejadian yang ditemukan</p>
              <p className="text-gray-400 text-sm mt-2">Coba ubah filter pencarian atau zoom peta Anda</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-3 gap-6">
                  {paginatedIncidents.map((incident) => (
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
                  {paginatedIncidents.map((incident) => (
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded border ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    « Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {/* First Page */}
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="px-4 py-2 rounded border bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
                        >
                          1
                        </button>
                        {currentPage > 4 && (
                          <span className="px-2 py-2 text-gray-400">...</span>
                        )}
                      </>
                    )}

                    {/* Pages around current */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        return page === currentPage ||
                               page === currentPage - 1 ||
                               page === currentPage + 1 ||
                               page === currentPage - 2 ||
                               page === currentPage + 2;
                      })
                      .map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded border ${
                            currentPage === page
                              ? 'bg-red-500 text-white border-red-500'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                    {/* Last Page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && (
                          <span className="px-2 py-2 text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-4 py-2 rounded border bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded border ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    Next »
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default Kebencanaan;