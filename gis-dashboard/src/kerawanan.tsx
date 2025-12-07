import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {API_URL} from './api';

const Kerawanan = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null); 
  const layerGroupsRef = useRef({});
  const navigate = useNavigate();
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [isLoadingLayer, setIsLoadingLayer] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<Array<{
    label: string;
    level: 'provinsi' | 'kabupaten' | 'kecamatan' | 'kelurahan';
    provinsi?: string;
    kab_kota?: string;
    kecamatan?: string;
    kel_desa?: string;
  }>>([]);
const [adminLevel, setAdminLevel] = useState<'provinsi' | 'kabupaten' | 'kecamatan' | 'kelurahan'>('provinsi');
const [areaSearchQuery, setAreaSearchQuery] = useState('');
const [areaSearchResults, setAreaSearchResults] = useState<Array<any>>([]);
const [showAreaSearchDropdown, setShowAreaSearchDropdown] = useState(false);
const [selectedDas, setSelectedDas] = useState<Array<{
  label: string;
  nama_das: string;
}>>([]);
const [dasSearchQuery, setDasSearchQuery] = useState('');
const [dasSearchResults, setDasSearchResults] = useState<Array<any>>([]);
const [showDasSearchDropdown, setShowDasSearchDropdown] = useState(false);
const [currentBounds, setCurrentBounds] = useState<[[number, number], [number, number]] | null>(null);
const [availableLayers, setAvailableLayers] = useState<{
  kerawanan: Array<{id: string, name: string}>,
  mitigasiAdaptasi: Array<{id: string, name: string}>,
  lainnya: Array<{id: string, name: string}>,
  kejadian: Array<{id: string, name: string, year: number}>
}>({
  kerawanan: [],
  mitigasiAdaptasi: [],
  lainnya: [],
  kejadian: []
});
  const [mapReady, setMapReady] = useState(false);
  const [insertProgress, setInsertProgress] = useState(0);
  const [insertStatus, setInsertStatus] = useState('');

  const [layerData, setLayerData] = useState<{
  kerawanan: Array<{id: string, name: string}>,
  mitigasiAdaptasi: Array<{id: string, name: string}>,
  lainnya: Array<{id: string, name: string}>,
  kejadian: Array<{id: string, name: string, year: number}> // Tambahan untuk kejadian
}>({
  kerawanan: [],
  mitigasiAdaptasi: [],
  lainnya: [],
  kejadian: []
});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentSection, setCurrentSection] = useState<'kerawanan' | 'mitigasiAdaptasi' | 'lainnya'>('kerawanan');
  const [newLayerName, setNewLayerName] = useState('');
  const [layerToDelete, setLayerToDelete] = useState<{section: string, id: string, name: string} | null>(null);

  const loadLayerInBounds = async (tableName: string) => {
  if (!mapInstanceRef.current || !window.L) {
    console.log('Map not ready');
    return;
  }

  try {
    const zoom = mapInstanceRef.current.getZoom();
    let boundsString = '';
    
    // Jika ada currentBounds (filter administratif dipilih), gunakan itu
    // Jika tidak ada, gunakan bounds seluruh Indonesia
    if (currentBounds) {
      const [[minLat, minLng], [maxLat, maxLng]] = currentBounds;
      boundsString = `${minLat},${minLng},${maxLat},${maxLng}`;
      console.log('Loading layer:', tableName, 'zoom:', zoom, 'admin bounds:', boundsString);
    } else {
      // Bounds seluruh Indonesia (approx)
      // Format: minLat, minLng, maxLat, maxLng
      boundsString = '-11,95,6,141'; // Indonesia bounds: lat -11 to 6, lng 95 to 141
      console.log('Loading layer:', tableName, 'zoom:', zoom, 'Indonesia bounds (no filter)');
    }
    
    // TAMBAH: Kirim dasFilter jika ada
    const dasFilter = selectedDas.length > 0 ? selectedDas.map(d => d.nama_das) : null;
    const dasFilterParam = dasFilter ? `&dasFilter=${encodeURIComponent(JSON.stringify(dasFilter))}` : '';
    
    console.log('DAS Filter for layer:', dasFilter);
    
    const response = await fetch(
      `${API_URL}/api/layers/${tableName}/geojson?bounds=${boundsString}&zoom=${zoom}${dasFilterParam}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const geojsonData = await response.json();
    console.log('GeoJSON data received for', tableName, ':', geojsonData.features?.length || 0, 'features');
    
    // Hapus layer lama jika ada
    if (layerGroupsRef.current[tableName]) {
      mapInstanceRef.current.removeLayer(layerGroupsRef.current[tableName]);
    }
    
    if (!geojsonData.features || geojsonData.features.length === 0) {
      console.warn('No features found in bounds for:', tableName);
      layerGroupsRef.current[tableName] = window.L.layerGroup();
      layerGroupsRef.current[tableName].addTo(mapInstanceRef.current);
      return;
    }
    
    // Dapatkan warna konsisten untuk tabel ini
    const tableColor = getColorForTable(tableName);
    
    // Buat layer group baru
    const layerGroup = window.L.geoJSON(geojsonData, {
      pane: 'overlayPane',
      style: function(feature) {
        return {
          color: tableColor,
          weight: zoom > 10 ? 2 : 1,
          opacity: 0.8,
          fillOpacity: zoom > 10 ? 0.4 : 0.3
        };
      },
      pointToLayer: function(feature, latlng) {
        return window.L.circleMarker(latlng, {
          radius: zoom > 10 ? 6 : 4,
          fillColor: tableColor,
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.7
        });
      },
      onEachFeature: function(feature, layer) {
        if (zoom > 8 && feature.properties) {
          let popupContent = '<div style="max-height: 200px; overflow-y: auto;">';
          popupContent += `<h3 style="margin: 0 0 8px 0; font-weight: bold;">${tableName}</h3>`;
          for (const [key, value] of Object.entries(feature.properties)) {
            if (key !== 'geom' && key !== 'geometry') {
              popupContent += `<p style="margin: 2px 0;"><strong>${key}:</strong> ${value}</p>`;
            }
          }
          popupContent += '</div>';
          layer.bindPopup(popupContent);
        }
      }
    });
    
    layerGroup.addTo(mapInstanceRef.current);
    layerGroupsRef.current[tableName] = layerGroup;
    
    const boundsType = currentBounds ? 'administrative bounds' : 'Indonesia bounds (all data)';
    console.log(`Layer loaded successfully with ${boundsType}`);
    
  } catch (error) {
    console.error('Error loading layer in bounds:', error);
  }
};

  const searchAreas = async (query: string) => {
  if (query.trim().length < 2) {
    setAreaSearchResults([]);
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/areas/search?query=${encodeURIComponent(query)}&level=${adminLevel}`
    );
    const data = await response.json();
    setAreaSearchResults(data);
    setShowAreaSearchDropdown(true);
  } catch (error) {
    console.error('Error searching areas:', error);
    setAreaSearchResults([]);
  }
};

const loadKejadianLayer = async (layerName: string, year: number) => {
  if (!mapInstanceRef.current || !window.L) {
    console.log('Map not ready');
    return;
  }

  try {
    let boundsString = '';
    
    if (currentBounds) {
      const [[minLat, minLng], [maxLat, maxLng]] = currentBounds;
      boundsString = `${minLat},${minLng},${maxLat},${maxLng}`;
    } else {
      boundsString = '-11,95,6,141'; // Indonesia bounds
    }
    
    // TAMBAH: Kirim dasFilter jika ada
    const dasFilter = selectedDas.length > 0 ? selectedDas.map(d => d.nama_das) : null;
    const dasFilterParam = dasFilter ? `&dasFilter=${encodeURIComponent(JSON.stringify(dasFilter))}` : '';
    
    console.log('Loading kejadian layer:', layerName, 'year:', year, 'bounds:', boundsString, 'dasFilter:', dasFilter);
    
    const response = await fetch(
      `${API_URL}/api/kejadian/by-year/${year}?bounds=${boundsString}${dasFilterParam}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const geojsonData = await response.json();
    console.log('Kejadian data received for', layerName, ':', geojsonData.features?.length || 0, 'features');
    
    // Hapus layer lama jika ada
    if (layerGroupsRef.current[layerName]) {
      mapInstanceRef.current.removeLayer(layerGroupsRef.current[layerName]);
    }
    
    if (!geojsonData.features || geojsonData.features.length === 0) {
      console.warn('No kejadian found for:', layerName);
      layerGroupsRef.current[layerName] = window.L.layerGroup();
      layerGroupsRef.current[layerName].addTo(mapInstanceRef.current);
      return;
    }
    
    // Function untuk create custom icon berdasarkan category
    const createKejadianIcon = (category: string) => {
      let iconSVG = '';
      let bgColor = '#3b82f6'; // default blue
      
      if (category === 'Banjir') {
        bgColor = '#3b82f6'; // blue
        iconSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>`;
      } else if (category === 'Tanah Longsor dan Erosi') {
        bgColor = '#f59e0b'; // orange
        iconSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>`;
      } else if (category === 'Kebakaran Hutan dan Kekeringan') {
        bgColor = '#ef4444'; // red
        iconSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
        </svg>`;
      }
      
      return window.L.divIcon({
        className: 'custom-kejadian-marker',
        html: `
          <div class="marker-container" style="position: relative; width: 44px; height: 44px; cursor: pointer;">
            <svg class="marker-circle" width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
              <circle class="marker-bg" cx="22" cy="22" r="20" fill="${bgColor}" stroke="white" stroke-width="3" 
                style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); transition: fill 0.2s ease;"/>
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
    
    // Buat layer group dengan marker untuk setiap kejadian
    const markers: any[] = [];
    
    geojsonData.features.forEach((feature: any) => {
      const { coordinates } = feature.geometry;
      const props = feature.properties;
      
      const marker = window.L.marker([coordinates[1], coordinates[0]], {
        icon: createKejadianIcon(props.category)
      });
      
      // Store incident data
      (marker as any).incidentData = {
        id: props.id,
        title: props.title,
        image: props.thumbnail_path ? `${API_URL}${props.thumbnail_path}` : 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
        location: props.location,
        category: props.category,
        date: props.date,
        das: props.das,
        description: props.description,
        images_paths: props.images_paths
      };
      
      // Add click event
      marker.on('click', function(e: any) {
        const inc = (this as any).incidentData;
        if (!inc) return;
        
        const popupContent = `
          <div onclick="window.navigateToKejadianDetail()" style="width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 8px; overflow: hidden; cursor: pointer;">
            <div style="position: relative; width: 100%; height: 180px; overflow: hidden;">
              <img 
                src="${inc.image}" 
                alt="${inc.title}"
                style="width: 100%; height: 100%; object-fit: cover;"
              />
              
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);"></div>
              
              <button 
                onclick="event.stopPropagation(); event.preventDefault(); if(window.closeKejadianPopup) window.closeKejadianPopup();"
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
        
        // Set up navigation function
        (window as any).navigateToKejadianDetail = () => {
          navigate('/detailkejadian', { state: { incident: inc } });
        };
        
        (window as any).closeKejadianPopup = () => {
          mapInstanceRef.current?.closePopup();
        };
        
        try {
          const popup = window.L.popup({
            maxWidth: 280,
            minWidth: 280,
            closeButton: false,
            className: 'custom-kejadian-popup',
            autoClose: true,
            closeOnClick: true
          })
          .setLatLng(e.latlng)
          .setContent(popupContent);
          
          popup.openOn(mapInstanceRef.current);
        } catch (error) {
          console.error('Error creating/opening popup:', error);
        }
      });
      
      markers.push(marker);
    });
    
    const layerGroup = window.L.layerGroup(markers);
    layerGroup.addTo(mapInstanceRef.current);
    layerGroupsRef.current[layerName] = layerGroup;
    
    console.log('Kejadian layer loaded successfully');
    
  } catch (error) {
    console.error('Error loading kejadian layer:', error);
  }
};

// Debounced search
const debouncedSearch = useRef<NodeJS.Timeout>();
const handleAreaSearchChange = (value: string) => {
  setAreaSearchQuery(value);
  
  if (debouncedSearch.current) {
    clearTimeout(debouncedSearch.current);
  }
  
  debouncedSearch.current = setTimeout(() => {
    searchAreas(value);
  }, 300);
};

const searchDas = async (query: string) => {
  if (query.trim().length < 2) {
    setDasSearchResults([]);
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/das/search?query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    setDasSearchResults(data);
    setShowDasSearchDropdown(true);
  } catch (error) {
    console.error('Error searching DAS:', error);
    setDasSearchResults([]);
  }
};

// Debounced search untuk DAS
const debouncedDasSearch = useRef<NodeJS.Timeout>();
const handleDasSearchChange = (value: string) => {
  setDasSearchQuery(value);
  
  if (debouncedDasSearch.current) {
    clearTimeout(debouncedDasSearch.current);
  }
  
  debouncedDasSearch.current = setTimeout(() => {
    searchDas(value);
  }, 300);
};

// Function untuk select DAS
const handleDasSelect = (das: any) => {
  // Check if already selected
  const isAlreadySelected = selectedDas.some(d => d.nama_das === das.nama_das);
  
  if (!isAlreadySelected) {
    const newSelectedDas = [...selectedDas, das];
    setSelectedDas(newSelectedDas);
    
    // Clear selected areas when DAS is selected
    setSelectedAreas([]);
    
    updateMapBoundsDas(newSelectedDas);
  }
  
  setDasSearchQuery('');
  setDasSearchResults([]);
  setShowDasSearchDropdown(false);
};

// Function untuk remove selected DAS
const handleRemoveDas = async (index: number) => {
  const newSelectedDas = selectedDas.filter((_, i) => i !== index);
  setSelectedDas(newSelectedDas);
  
  if (newSelectedDas.length > 0) {
    await updateMapBoundsDas(newSelectedDas);
  } else {
    // Tidak ada DAS yang dipilih, kembali ke bounds Indonesia
    setCurrentBounds(null);
    
    // Clear selected areas juga
    setSelectedAreas([]);
    
    setAvailableLayers({ 
      kerawanan: layerData.kerawanan || [], 
      mitigasiAdaptasi: layerData.mitigasiAdaptasi || [], 
      lainnya: layerData.lainnya || [],
      kejadian: layerData.kejadian || []
    });
    
    // Tunggu sebentar agar state ter-update
    setTimeout(async () => {
      // Reload semua active layers untuk menampilkan data seluruh Indonesia
      for (const tableName of activeLayers) {
        if (tableName.startsWith('kejadian_')) {
          const year = parseInt(tableName.replace('kejadian_', ''));
          await loadKejadianLayer(tableName, year);
        } else {
          await loadLayerInBounds(tableName);
        }
      }
    }, 100);
    
    // Reset map view ke Indonesia
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([-2.5, 118.0], 5);
    }
  }
};

// Function untuk update map bounds based on selected DAS
const updateMapBoundsDas = async (dasList: Array<any>) => {
  if (dasList.length === 0 || !mapInstanceRef.current) return;

  try {
    const dasNames = dasList.map(d => d.nama_das);
    
    const response = await fetch(`${API_URL}/api/das/bounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedDas: dasNames })
    });
    
    const data = await response.json();
    
    if (data.bounds) {
      // Set bounds dulu
      setCurrentBounds(data.bounds);
      mapInstanceRef.current.fitBounds(data.bounds, { padding: [50, 50] });
      
      // Check available layers in these bounds
      await checkLayerAvailability(data.bounds);
      
      // Tunggu sebentar agar state ter-update, lalu reload layers
      setTimeout(async () => {
        for (const tableName of activeLayers) {
          // Check jika kejadian layer
          if (tableName.startsWith('kejadian_')) {
            const year = parseInt(tableName.replace('kejadian_', ''));
            await loadKejadianLayer(tableName, year);
          } else {
            await loadLayerInBounds(tableName);
          }
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error updating DAS bounds:', error);
  }
};

// Function untuk select area
const handleAreaSelect = (area: any) => {
  // Check if already selected - comparison based on level
  const isAlreadySelected = selectedAreas.some(a => {
    if (a.level !== area.level) return false;
    
    switch(area.level) {
      case 'provinsi':
        return a.provinsi === area.provinsi;
      case 'kabupaten':
        return a.kab_kota === area.kab_kota && a.provinsi === area.provinsi;
      case 'kecamatan':
        return a.kecamatan === area.kecamatan && a.kab_kota === area.kab_kota && a.provinsi === area.provinsi;
      case 'kelurahan':
        return a.kel_desa === area.kel_desa && a.kecamatan === area.kecamatan && a.kab_kota === area.kab_kota && a.provinsi === area.provinsi;
      default:
        return false;
    }
  });
  
  if (!isAlreadySelected) {
    const newSelectedAreas = [...selectedAreas, area];
    setSelectedAreas(newSelectedAreas);
    
    // Clear selected DAS when area is selected
    setSelectedDas([]);
    
    updateMapBounds(newSelectedAreas);
  }
  
  setAreaSearchQuery('');
  setAreaSearchResults([]);
  setShowAreaSearchDropdown(false);
};

// Function untuk remove selected area
const handleRemoveArea = async (index: number) => {
  const newSelectedAreas = selectedAreas.filter((_, i) => i !== index);
  setSelectedAreas(newSelectedAreas);
  
  if (newSelectedAreas.length > 0) {
    // Masih ada area yang dipilih, update bounds
    await updateMapBounds(newSelectedAreas);
  } else {
    // Tidak ada area yang dipilih, kembali ke bounds Indonesia
    setCurrentBounds(null);
    
    // Clear selected DAS juga
    setSelectedDas([]);
    
    // Reset availableLayers ke semua layer termasuk semua tahun kejadian
    setAvailableLayers({ 
      kerawanan: layerData.kerawanan || [], 
      mitigasiAdaptasi: layerData.mitigasiAdaptasi || [], 
      lainnya: layerData.lainnya || [],
      kejadian: layerData.kejadian || []
    });
    
    // Tunggu sebentar agar state ter-update
    setTimeout(async () => {
      // Reload semua active layers untuk menampilkan data seluruh Indonesia
      for (const tableName of activeLayers) {
        if (tableName.startsWith('kejadian_')) {
          const year = parseInt(tableName.replace('kejadian_', ''));
          await loadKejadianLayer(tableName, year);
        } else {
          await loadLayerInBounds(tableName);
        }
      }
    }, 100);
    
    // Reset map view ke Indonesia
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([-2.5, 118.0], 5);
    }
  }
};

// Function untuk update map bounds based on selected areas
const updateMapBounds = async (areas: Array<any>) => {
  if (areas.length === 0 || !mapInstanceRef.current) return;

  try {
    const response = await fetch(`${API_URL}/api/areas/bounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedAreas: areas })
    });
    
    const data = await response.json();
    
    if (data.bounds) {
      // Set bounds dulu
      setCurrentBounds(data.bounds);
      mapInstanceRef.current.fitBounds(data.bounds, { padding: [50, 50] });
      
      // Check available layers in these bounds
      await checkLayerAvailability(data.bounds);
      
      // Tunggu sebentar agar state ter-update, lalu reload layers
      setTimeout(async () => {
        for (const tableName of activeLayers) {
          // Check jika kejadian layer
          if (tableName.startsWith('kejadian_')) {
            const year = parseInt(tableName.replace('kejadian_', ''));
            await loadKejadianLayer(tableName, year);
          } else {
            await loadLayerInBounds(tableName);
          }
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error updating bounds:', error);
  }
};

// Function untuk check layer availability
const checkLayerAvailability = async (bounds: [[number, number], [number, number]]) => {
  try {
    // TAMBAH: Kirim dasFilter jika ada DAS yang dipilih
    const dasFilter = selectedDas.length > 0 ? selectedDas.map(d => d.nama_das) : null;
    
    console.log('Checking layer availability with:', { bounds, dasFilter });
    
    // Check regular layers - KIRIM dasFilter
    const layersResponse = await fetch(`${API_URL}/api/layers/check-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        bounds,
        dasFilter // TAMBAH INI
      })
    });
    
    const layersData = await layersResponse.json();
    console.log('Available layers response:', layersData);
    
    // Check kejadian years availability - KIRIM dasFilter
    const kejadianResponse = await fetch(`${API_URL}/api/kejadian/check-years-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        bounds,
        dasFilter // TAMBAH INI
      })
    });
    
    const kejadianData = await kejadianResponse.json();
    console.log('Available kejadian years:', kejadianData);
    
    // Group available layers by section
    const grouped = {
      kerawanan: [] as Array<{id: string, name: string}>,
      mitigasiAdaptasi: [] as Array<{id: string, name: string}>,
      lainnya: [] as Array<{id: string, name: string}>,
      kejadian: [] as Array<{id: string, name: string, year: number}>
    };
    
    // Add regular layers
    layersData.availableLayers.forEach((layer: any) => {
      if (grouped[layer.section as keyof typeof grouped]) {
        grouped[layer.section as keyof typeof grouped].push({
          id: layer.id,
          name: layer.name
        });
      }
    });
    
    // Add kejadian layers for available years
    if (kejadianData.availableYears && kejadianData.availableYears.length > 0) {
      grouped.kejadian = kejadianData.availableYears.map((year: number) => ({
        id: `kejadian_${year}`,
        name: `kejadian_${year}`,
        year: year
      }));
    }
    
    console.log('Grouped available layers:', grouped);
    setAvailableLayers(grouped);
  } catch (error) {
    console.error('Error checking layer availability:', error);
    // Fallback: preserve current kejadian layers if error
    setAvailableLayers(prev => ({
      kerawanan: [],
      mitigasiAdaptasi: [],
      lainnya: [],
      kejadian: prev.kejadian || []
    }));
  }
};

  // const reloadActiveLayers = () => {
  //   if (isLoadingLayer) return; // Hindari multiple reload
    
  //   activeLayers.forEach(tableName => {
  //     loadLayerInBounds(tableName);
  //   });
  // };

  const handleLayerToggle = async (tableName: string, isChecked: boolean) => {
  console.log('Toggle layer clicked:', tableName, 'isChecked:', isChecked);
  console.log('Current active layers:', Array.from(activeLayers));
  
  if (isChecked) {
    // Tambahkan layer ke active layers
    setActiveLayers(prev => new Set([...prev, tableName]));
    
    // Check jika ini adalah kejadian layer
    if (tableName.startsWith('kejadian_')) {
      const year = parseInt(tableName.replace('kejadian_', ''));
      await loadKejadianLayer(tableName, year);
    } else {
      // Load layer biasa
      await loadLayerInBounds(tableName);
    }
    
  } else {
    // Hapus layer dari map
    console.log('Removing layer from map:', tableName);
    if (layerGroupsRef.current[tableName] && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(layerGroupsRef.current[tableName]);
      delete layerGroupsRef.current[tableName];
      console.log('Layer removed from map');
      
      // Update state
      setActiveLayers(prev => {
        const newSet = new Set(prev);
        newSet.delete(tableName);
        console.log('Updated active layers after removal:', Array.from(newSet));
        return newSet;
      });
    } else {
      console.log('Layer not found in layerGroupsRef or map not ready');
    }
  }
};

  // Fungsi helper untuk generate warna konsisten berdasarkan nama tabel
  const getColorForTable = (tableName: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
      '#E74C3C', '#3498DB', '#9B59B6', '#1ABC9C', '#F39C12',
      '#D35400', '#C0392B', '#2980B9', '#8E44AD', '#16A085'
    ];
    
    // Generate hash dari nama tabel untuk mendapatkan index yang konsisten
    let hash = 0;
    for (let i = 0; i < tableName.length; i++) {
      hash = tableName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Fetch layers from database on mount
  useEffect(() => {
  fetchLayers();
  fetchKejadianYears();
}, []);

const fetchKejadianYears = async () => {
  try {
    const response = await fetch(`${API_URL}/api/kejadian/years`);
    const data = await response.json();
    
    const kejadianLayers = data.years.map((year: number) => ({
      id: `kejadian_${year}`,
      name: `kejadian_${year}`,
      year: year
    }));
    
    setLayerData(prev => ({
      ...prev,
      kejadian: kejadianLayers
    }));
    
    setAvailableLayers(prev => ({
      ...prev,
      kejadian: kejadianLayers
    }));
    
  } catch (error) {
    console.error('Error fetching kejadian years:', error);
  }
};

const fetchLayers = async () => {
  try {
    const response = await fetch(`${API_URL}/api/layers`);
    const data = await response.json();
    setLayerData(prev => ({
      ...prev,
      ...data
    }));
    
    // Jika ada bounds yang dipilih, filter layers
    if (currentBounds) {
      checkLayerAvailability(currentBounds);
    } else {
      // Jika tidak ada bounds, tampilkan semua layer termasuk semua kejadian
      setAvailableLayers(prev => ({
        ...prev,
        ...data,
        kejadian: layerData.kejadian // Use all kejadian years from layerData
      }));
    }
  } catch (error) {
    console.error('Error fetching layers:', error);
    alert('Gagal memuat data layer');
  }
};



  const handleAddClick = (section: 'kerawanan' | 'mitigasiAdaptasi' | 'lainnya') => {
    setCurrentSection(section);
    setNewLayerName('');
    setUploadedFiles([]);
    setShowAddModal(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setUploadedFiles(fileArray);
    }
  };

  const handleCreateLayer = async () => {
    if (!newLayerName.trim()) {
      alert('Nama tabel harus diisi');
      return;
    }

    if (uploadedFiles.length === 0) {
      alert('File shapefile harus diupload');
      return;
    }

    // Check if .shp file exists
    const hasShpFile = uploadedFiles.some(f => f.name.endsWith('.shp'));
    if (!hasShpFile) {
      alert('File .shp wajib diupload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setInsertProgress(0);
    setInsertStatus('');

    try {
      const formData = new FormData();
      formData.append('tableName', newLayerName.trim());
      formData.append('section', currentSection);
      
      uploadedFiles.forEach((file, index) => {
        console.log(`Appending file ${index}:`, file.name, file.type, file.size);
        formData.append('files', file);
      });
      
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
          console.log(`Upload progress: ${Math.round(percentComplete)}%`);
        }
      });

      // Handle response
      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('SUCCESS: Layer created successfully');
            
            setInsertProgress(100);
            setInsertStatus('Selesai');
            
            await fetchLayers();
            setNewLayerName('');
            setUploadedFiles([]);
            
            // Delay sedikit agar user bisa lihat progress 100%
            setTimeout(() => {
              setShowAddModal(false);
              setUploadProgress(0);
              setInsertProgress(0);
              setInsertStatus('');
              alert('Layer berhasil dibuat');
            }, 500);
            
          } catch (err) {
            throw new Error('Failed to parse response');
          }
        } else {
          const error = JSON.parse(xhr.responseText);
          throw new Error(error.error || 'Gagal membuat layer');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Network error saat upload');
      });

      // Setup SSE untuk menerima progress insert dari server
      const eventSource = new EventSource(`${API_URL}/api/layers/progress/${newLayerName.trim()}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Insert progress:', data);
          
          if (data.progress !== undefined) {
            setInsertProgress(data.progress);
          }
          if (data.status) {
            setInsertStatus(data.status);
          }
          if (data.done) {
            eventSource.close();
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.log('SSE connection closed or error');
        eventSource.close();
      };

      xhr.open('POST', `${API_URL}/api/layers`);
      xhr.send(formData);
      
    } catch (error: any) {
      console.error('Error creating layer:', error);
      alert(error.message || 'Gagal membuat layer');
      setIsUploading(false);
      setUploadProgress(0);
      setInsertProgress(0);
      setInsertStatus('');
    }
  };

  const handleDeleteClick = (section: 'kerawanan' | 'mitigasiAdaptasi' | 'lainnya', id: string, name: string) => {
    setLayerToDelete({section, id, name});
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!layerToDelete) return;

    try {
      const response = await fetch(`${API_URL}/api/layers/${layerToDelete.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menghapus layer');
      }

      // Hapus layer dari map jika sedang aktif
      const layerName = layerToDelete.name;
      if (activeLayers.has(layerName)) {
        handleLayerToggle(layerName, false);
      }

      // Refresh layers
      await fetchLayers();

      setLayerToDelete(null);
      setShowDeleteModal(false);
      alert('Layer berhasil dihapus');
      
    } catch (error: any) {
      console.error('Error deleting layer:', error);
      alert(error.message || 'Gagal menghapus layer');
    }
  };

  const getSectionTitle = (section: string) => {
    const titles = {
      kerawanan: 'Kerawanan',
      mitigasiAdaptasi: 'Mitigasi dan Adaptasi',
      lainnya: 'Lain lain'
    };
    return titles[section as keyof typeof titles];
  };

  // useEffect(() => {
  //   if (!mapReady || !mapInstanceRef.current) return;

  //   console.log('Active layers changed:', Array.from(activeLayers));
    
  //   // Reload semua active layers dengan bounds terbaru
  //   const reloadLayers = async () => {
  //     if (isLoadingLayer) return;
      
  //     setIsLoadingLayer(true);
      
  //     for (const tableName of activeLayers) {
  //       await loadLayerInBounds(tableName);
  //     }
      
  //     setIsLoadingLayer(false);
  //   };

  //   reloadLayers();
  // }, [activeLayers, mapReady]);

  useEffect(() => {
  if (!mapReady || !mapInstanceRef.current) return;

  let zoomTimeout: NodeJS.Timeout;
  
  const handleZoomEnd = () => {
    // Debounce untuk menghindari terlalu banyak request
    clearTimeout(zoomTimeout);
    zoomTimeout = setTimeout(() => {
      const currentZoom = mapInstanceRef.current?.getZoom();
      console.log('Zoom changed to:', currentZoom, '- Reloading layers for new simplification level');
      
      // Ambil snapshot activeLayers saat ini
      const currentActiveLayers = Array.from(activeLayers);
      
      // Reload semua active layers dengan zoom level baru
      currentActiveLayers.forEach(async (tableName) => {
        if (tableName.startsWith('kejadian_')) {
          const year = parseInt(tableName.replace('kejadian_', ''));
          await loadKejadianLayer(tableName, year);
        } else {
          await loadLayerInBounds(tableName);
        }
      });
    }, 500); // Delay 500ms setelah zoom selesai
  };

  mapInstanceRef.current.on('zoomend', handleZoomEnd);

  return () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.off('zoomend', handleZoomEnd);
    }
    clearTimeout(zoomTimeout);
  };
}, [mapReady]);

//   useEffect(() => {
//   if (!mapReady || activeLayers.size === 0) return;
  
//   // Reload semua active layers dengan bounds yang baru
//   const reloadAllLayers = async () => {
//     console.log('CurrentBounds changed, reloading active layers:', Array.from(activeLayers));
//     for (const tableName of activeLayers) {
//       await loadLayerInBounds(tableName);
//     }
//   };
  
//   reloadAllLayers();
// }, [currentBounds, mapReady]);

  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      if (mapRef.current && window.L) {
        const map = window.L.map(mapRef.current).setView([-2.5, 118.0], 5);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        
        // Simpan instance map ke ref
        mapInstanceRef.current = map;
        setMapReady(true);
        
        // Tambahkan event listener untuk moveend (setelah pan/zoom selesai)
        // let moveTimeout;
        // map.on('moveend', () => {
        //   // Debounce untuk menghindari terlalu banyak request
        //   clearTimeout(moveTimeout);
        //   moveTimeout = setTimeout(() => {
        //     console.log('Map moveend event - reloading active layers');
            
        //     // Trigger reload dengan mengupdate state
        //     setActiveLayers(prev => new Set(prev));
        //   }, 500); // Delay 500ms (lebih lama) untuk performa lebih baik
        // });
      }
    };
    document.head.appendChild(script);

    // Load Chart.js
    const chartScript = document.createElement('script');
    chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
    document.head.appendChild(chartScript);

    return () => {
      link.remove();
      script.remove();
      chartScript.remove();
      
      // Cleanup map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const [activeTab, setActiveTab] = useState('administrasi');
  const [activeBottomTab, setActiveBottomTab] = useState('curahHujan');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [filters, setFilters] = useState({
    kerawanan: {
      banjir: false,
      tanahLongsor: false,
      kekeringan: false,
      abrasi: false,
      arealBanjir: false,
      arealTanahLongsor: false,
      arealKekeringan: false,
      arealAbrasi: false,
    },
    erosiKebakaran: {
      erosi: false,
      kebakaranHutanLahan: false,
      arealErosi: false,
      arealKebakaranHutan: false,
    },
    mitigasiAdaptasi: {
      rehabilitasiDas: false,
      rehabilitasiHutanLahan: false,
      penerapanTeknik: false,
      bendungan: false,
      danau: false,
      situ: false,
      pengamanPantai: false,
      embung: false,
    },
    lainnya: {
      tutupanLahan: false,
      kawasanHutan: false,
      lahanKritis: false,
      kelerengan: false,
      jenisTanah: false,
      geologi: false,
    }
  });

  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);

  const handleFilterChange = (category, key) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const dummyPhotos = [
    'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
    'https://images.unsplash.com/photo-1551522435-a13afa10f103?w=400',
    'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
    'https://images.unsplash.com/photo-1534809027769-b00d750a6410?w=400',
    'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
  ];

  const CurahHujanChart = () => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (chartRef.current && window.Chart) {
        const ctx = chartRef.current.getContext('2d');
        
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        const days = Array.from({length: 30}, (_, i) => `Hari ${i + 1}`);
        const rainfallData = [0, 100, 150, 170, 250, 200, 180, 150, 120, 100, 70, 50, 30, 10, 30, 50, 70, 100, 50, 40, 45, 50, 55, 50, 40, 30, 50, 80, 100, 100];
        
        chartInstance.current = new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: days,
            datasets: [
              {
                label: 'Curah Hujan (mm/hari)',
                data: rainfallData,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
              },
              {
                label: 'Batas Kritis (mm)',
                data: Array(30).fill(100),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                pointRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Curah Hujan (mm)'
                }
              }
            }
          }
        });
      }

      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, []);

    return <canvas ref={chartRef} />;
  };

  const JenisTanahChart = () => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (chartRef.current && window.Chart) {
        const ctx = chartRef.current.getContext('2d');
        
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        chartInstance.current = new window.Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Aluvial', 'Latosol', 'Regosol', 'Andosol', 'Podsolik'],
            datasets: [{
              label: 'Persentase (%)',
              data: [25, 30, 15, 20, 10],
              backgroundColor: [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                title: {
                  display: true,
                  text: 'Persentase (%)'
                }
              }
            }
          }
        });
      }

      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, []);

    return <canvas ref={chartRef} />;
  };

  const TutupanLahanChart = () => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (chartRef.current && window.Chart) {
        const ctx = chartRef.current.getContext('2d');
        
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        chartInstance.current = new window.Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Hutan', 'Pertanian', 'Pemukiman', 'Perkebunan', 'Lainnya'],
            datasets: [{
              data: [35, 25, 20, 15, 5],
              backgroundColor: [
                'rgba(34, 197, 94, 0.7)',
                'rgba(251, 191, 36, 0.7)',
                'rgba(239, 68, 68, 0.7)',
                'rgba(168, 85, 247, 0.7)',
                'rgba(156, 163, 175, 0.7)',
              ],
              borderColor: [
                'rgba(34, 197, 94, 1)',
                'rgba(251, 191, 36, 1)',
                'rgba(239, 68, 68, 1)',
                'rgba(168, 85, 247, 1)',
                'rgba(156, 163, 175, 1)',
              ],
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
              }
            }
          }
        });
      }

      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, []);

    return <canvas ref={chartRef} />;
  };

  const DataTable = ({ columns, data }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-2 py-1 border text-left text-[10px] font-semibold text-gray-700">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-2 py-1 border text-[10px] text-gray-600">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const bottomTabs = [
    { id: 'curahHujan', label: 'Curah Hujan 30 Hari', icon: '🌧️' },
    { id: 'kemiringan', label: 'Kemiringan Lereng', icon: '⛰️' },
    { id: 'topografi', label: 'Topografi', icon: '🗺️' },
    { id: 'geologi', label: 'Geologi', icon: '🪨' },
    { id: 'jenisTanah', label: 'Jenis Tanah', icon: '🌱' },
    { id: 'patahan', label: 'Patahan', icon: '⚡' },
    { id: 'tutupanLahan', label: 'Tutupan Lahan', icon: '🌳' },
    { id: 'infrastruktur', label: 'Infrastruktur', icon: '🏗️' },
    { id: 'kepadatan', label: 'Kepadatan Pemukiman', icon: '🏘️' },
  ];

  const renderBottomContent = () => {
    switch(activeBottomTab) {
      case 'curahHujan':
        return (
          <div style={{ height: '180px' }} className="p-3">
            <CurahHujanChart />
          </div>
        );
      case 'kemiringan':
        return (
          <div className="p-3">
            <DataTable 
              columns={['No', 'Kelas Lereng', 'Luas (Ha)', 'Persentase (%)', 'Tingkat Bahaya']}
              data={[
                ['1', '0-8%', '1,250', '25%', 'Rendah'],
                ['2', '8-15%', '1,500', '30%', 'Sedang'],
                ['3', '15-25%', '1,000', '20%', 'Tinggi'],
                ['4', '25-40%', '750', '15%', 'Sangat Tinggi'],
                ['5', '>40%', '500', '10%', 'Ekstrim'],
              ]}
            />
          </div>
        );
      case 'topografi':
        return (
          <div className="p-3">
            <DataTable 
              columns={['No', 'Kelas Elevasi', 'Luas (Ha)', 'Persentase (%)', 'Kategori']}
              data={[
                ['1', '0-100 mdpl', '2,000', '40%', 'Dataran Rendah'],
                ['2', '100-500 mdpl', '1,500', '30%', 'Dataran Tinggi'],
                ['3', '500-1000 mdpl', '1,000', '20%', 'Perbukitan'],
                ['4', '1000-2000 mdpl', '400', '8%', 'Pegunungan'],
                ['5', '>2000 mdpl', '100', '2%', 'Pegunungan Tinggi'],
              ]}
            />
          </div>
        );
      case 'geologi':
        return (
          <div className="p-3">
            <DataTable 
              columns={['No', 'Formasi Batuan', 'Luas (Ha)', 'Persentase (%)']}
              data={[
                ['1', 'Aluvium', '1,800', '36%'],
                ['2', 'Batuan Vulkanik', '1,500', '30%'],
                ['3', 'Batuan Sedimen', '1,200', '24%'],
                ['4', 'Batuan Metamorf', '500', '10%'],
              ]}
            />
          </div>
        );
      case 'jenisTanah':
        return (
          <div style={{ height: '180px' }} className="p-3">
            <JenisTanahChart />
          </div>
        );
      case 'patahan':
        return (
          <div className="p-3">
            <DataTable 
              columns={['No', 'Nama Patahan', 'Panjang (km)', 'Status', 'Tingkat Bahaya']}
              data={[
                ['1', 'Patahan Sumatra', '120', 'Aktif', 'Tinggi'],
                ['2', 'Patahan Lembang', '45', 'Aktif', 'Sedang'],
                ['3', 'Patahan Cimandiri', '80', 'Semi-Aktif', 'Sedang'],
                ['4', 'Patahan Palu-Koro', '200', 'Aktif', 'Sangat Tinggi'],
                ['5', 'Patahan Sorong', '150', 'Aktif', 'Tinggi'],
              ]}
            />
          </div>
        );
      case 'tutupanLahan':
        return (
          <div style={{ height: '180px' }} className="p-3">
            <TutupanLahanChart />
          </div>
        );
      case 'infrastruktur':
        return (
          <div className="p-3">
            <DataTable 
              columns={['No', 'Jenis Infrastruktur', 'Jumlah', 'Kondisi', 'Tahun Pembangunan']}
              data={[
                ['1', 'Jalan Aspal', '150 km', 'Baik', '2020'],
                ['2', 'Jembatan', '25 unit', 'Baik', '2019'],
                ['3', 'Bendungan', '3 unit', 'Sangat Baik', '2021'],
                ['4', 'Irigasi', '80 km', 'Sedang', '2018'],
                ['5', 'Drainase', '120 km', 'Baik', '2020'],
              ]}
            />
          </div>
        );
      case 'kepadatan':
        return (
          <div className="p-3">
            <DataTable 
              columns={['No', 'Kecamatan', 'Jumlah Penduduk', 'Luas (km²)', 'Kepadatan (jiwa/km²)']}
              data={[
                ['1', 'Kecamatan A', '50,000', '25', '2,000'],
                ['2', 'Kecamatan B', '35,000', '30', '1,167'],
                ['3', 'Kecamatan C', '60,000', '20', '3,000'],
                ['4', 'Kecamatan D', '25,000', '40', '625'],
                ['5', 'Kecamatan E', '45,000', '35', '1,286'],
              ]}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    

    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      
      <style>
      {`
        .custom-kejadian-marker {
          background: none;
          border: none;
        }
        
        .marker-container:hover .marker-bg {
          fill: #ef4444 !important;
        }
        
        .custom-kejadian-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .custom-kejadian-popup .leaflet-popup-content {
          margin: 0;
          width: 280px !important;
        }
        
        .custom-kejadian-popup .leaflet-popup-tip {
          display: none;
        }
      `}
    </style>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Section: Map with Layer Panel - 65% height */}
        <div className="relative flex" style={{ height: '65vh' }}>
          {/* Map Container */}
          <div className="flex-1 relative">
            <div ref={mapRef} className="w-full h-full"></div>

            {/* Menu Button */}
            <div className="absolute top-4 left-4 z-[1000]">
              <div className="relative">
                <button 
                  onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  className="bg-orange-500 text-white px-3 py-1.5 rounded shadow-lg text-sm font-semibold hover:bg-orange-600"
                >
                  MENU
                </button>
                {showMenuDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMenuDropdown(false)}
                    />
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 w-40 z-50">
                      <div
                        onClick={() => {
                          navigate('/kerawanan');
                          setShowMenuDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-gray-700 text-sm font-medium border-b border-gray-200"
                      >
                        Kerawanan
                      </div>
                      <div
                        onClick={() => {
                          navigate('/kebencanaan');
                          setShowMenuDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-gray-700 text-sm font-medium"
                      >
                        Kejadian
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Coordinates Display */}
            {/* <div className="absolute top-4 left-20 z-[1000] bg-white px-3 py-1.5 rounded shadow-lg">
              <span className="font-mono text-xs">128.11, -11.78</span>
            </div> */}
          </div>

          {/* Layer Services Panel - Smaller width */}
          {isLayerPanelOpen && (
            <div className="w-80 bg-white shadow-2xl flex flex-col" style={{ height: '65vh' }}>
              {/* Header - Smaller */}
              <div className="bg-orange-500 text-white p-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">»</span>
                  <h2 className="text-lg font-semibold">Layer Services</h2>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-3">
                  {/* Tabs - Smaller */}
                  <div className="flex gap-3 mb-4">
  <label className="flex items-center gap-1.5 cursor-pointer">
    <input
      type="radio"
      name="mainTab"
      checked={activeTab === 'administrasi'}
      onChange={() => setActiveTab('administrasi')}
      className="w-3.5 h-3.5"
    />
    <span className="text-sm font-medium">Administrasi</span>
  </label>
  <label className="flex items-center gap-1.5 cursor-pointer">
    <input
      type="radio"
      name="mainTab"
      checked={activeTab === 'das'}
      onChange={() => setActiveTab('das')}
      className="w-3.5 h-3.5"
    />
    <span className="text-sm font-medium">DAS</span>
  </label>
</div>

{/* Area Search Section - Only show when Administrasi tab is active */}
{activeTab === 'administrasi' && (
  <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
    <h3 className="text-sm font-semibold text-gray-800 mb-2">Pilih Area</h3>
    
    {/* Info jika ada DAS terpilih */}
    {selectedDas.length > 0 && (
      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-xs text-yellow-700">
          ⚠️ Filter DAS aktif. Hapus filter DAS untuk menggunakan filter administrasi.
        </p>
      </div>
    )}
    
    {/* Level Selection - Diperkecil dan 2 baris */}
    <div className="mb-2 grid grid-cols-2 gap-1.5">
      <button
        onClick={() => setAdminLevel('provinsi')}
        className={`px-1.5 py-1 text-[10px] rounded ${
          adminLevel === 'provinsi' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300'
        }`}
        disabled={selectedDas.length > 0}
      >
        Provinsi
      </button>
      <button
        onClick={() => setAdminLevel('kabupaten')}
        className={`px-1.5 py-1 text-[10px] rounded ${
          adminLevel === 'kabupaten' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300'
        }`}
        disabled={selectedDas.length > 0}
      >
        Kabupaten
      </button>
      <button
        onClick={() => setAdminLevel('kecamatan')}
        className={`px-1.5 py-1 text-[10px] rounded ${
          adminLevel === 'kecamatan' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300'
        }`}
        disabled={selectedDas.length > 0}
      >
        Kecamatan
      </button>
      <button
        onClick={() => setAdminLevel('kelurahan')}
        className={`px-1.5 py-1 text-[10px] rounded ${
          adminLevel === 'kelurahan' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300'
        }`}
        disabled={selectedDas.length > 0}
      >
        Kelurahan
      </button>
    </div>
    
    {/* Selected Areas */}
    {selectedAreas.length > 0 && (
      <div className="mb-2 flex flex-wrap gap-1">
        {selectedAreas.map((area, index) => (
          <div key={index} className="bg-white px-2 py-1 rounded text-xs border border-blue-300 flex items-center gap-1">
            <span className="text-[10px] bg-blue-100 px-1 rounded">{area.level}</span>
            <span className="truncate max-w-[150px]" title={area.label}>
              {area.label}
            </span>
            <button
              onClick={() => handleRemoveArea(index)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )}
    
    {/* Search Input */}
    <div className="relative">
      <input
        type="text"
        value={areaSearchQuery}
        onChange={(e) => handleAreaSearchChange(e.target.value)}
        onFocus={() => setShowAreaSearchDropdown(true)}
        placeholder={`Cari ${adminLevel}...`}
        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        disabled={selectedDas.length > 0}
      />
      
      {/* Search Results Dropdown */}
      {showAreaSearchDropdown && areaSearchResults.length > 0 && selectedDas.length === 0 && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowAreaSearchDropdown(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto z-50">
            {areaSearchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => handleAreaSelect(result)}
                className="px-2 py-1.5 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <span className="text-[10px] bg-gray-100 px-1 rounded mr-1">{result.level}</span>
                {result.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    
    <div className="text-[10px] text-gray-600 mt-1">
      * Pilih level lalu cari area untuk membatasi tampilan layer
    </div>
  </div>
)}

{/* DAS Search Section - Only show when DAS tab is active */}
{activeTab === 'das' && (
  <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
    <h3 className="text-sm font-semibold text-gray-800 mb-2">Pilih DAS</h3>
    
    {/* Info jika ada Area terpilih */}
    {selectedAreas.length > 0 && (
      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-xs text-yellow-700">
          ⚠️ Filter administrasi aktif. Hapus filter administrasi untuk menggunakan filter DAS.
        </p>
      </div>
    )}
    
    {/* Selected DAS */}
    {selectedDas.length > 0 && (
      <div className="mb-2 flex flex-wrap gap-1">
        {selectedDas.map((das, index) => (
          <div key={index} className="bg-white px-2 py-1 rounded text-xs border border-green-300 flex items-center gap-1">
            <span className="truncate max-w-[200px]" title={das.label}>
              {das.label}
            </span>
            <button
              onClick={() => handleRemoveDas(index)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )}
    
    {/* Search Input */}
    <div className="relative">
      <input
        type="text"
        value={dasSearchQuery}
        onChange={(e) => handleDasSearchChange(e.target.value)}
        onFocus={() => setShowDasSearchDropdown(true)}
        placeholder="Cari DAS..."
        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-green-500"
        disabled={selectedAreas.length > 0}
      />
      
      {/* Search Results Dropdown */}
      {showDasSearchDropdown && dasSearchResults.length > 0 && selectedAreas.length === 0 && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDasSearchDropdown(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto z-50">
            {dasSearchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => handleDasSelect(result)}
                className="px-2 py-1.5 text-xs hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                {result.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    
    <div className="text-[10px] text-gray-600 mt-1">
      * Cari dan pilih DAS untuk membatasi tampilan layer
    </div>
  </div>
)}

 {/* Kerawanan Section */}
<div className="mb-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1.5 border-b-2 border-orange-500">
    Kerawanan
  </h3>
  <div className="grid grid-cols-2 gap-2">
    {((currentBounds && (selectedAreas.length > 0 || selectedDas.length > 0)) ? availableLayers.kerawanan : layerData.kerawanan).map((layer) => (
      <div key={layer.id} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-200">
        <input 
          type="checkbox" 
          className="w-3 h-3 flex-shrink-0" 
          checked={activeLayers.has(layer.name)}
          onChange={(e) => handleLayerToggle(layer.name, e.target.checked)}
        />
        <span 
          className="text-xs flex-1 truncate cursor-help" 
          title={layer.name}
        >
          {layer.name}
        </span>
        <button
          onClick={() => handleDeleteClick('kerawanan', layer.id, layer.name)}
          className="text-red-500 hover:text-red-700 font-bold text-base flex-shrink-0"
        >
          ×
        </button>
      </div>
    ))}
    
    {/* Tambah Data Button */}
    <button
      onClick={() => handleAddClick('kerawanan')}
      className="flex items-center gap-1 px-2 py-1 border-2 border-dashed border-blue-400 text-blue-500 rounded hover:bg-blue-50 transition-colors justify-center"
    >
      <span className="text-base font-bold">+</span>
      <span className="text-xs">Tambah Data</span>
    </button>
  </div>
</div>

{/* Mitigasi dan Adaptasi Section */}
<div className="mb-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1.5 border-b-2 border-orange-500">
    Mitigasi dan Adaptasi
  </h3>
  <div className="grid grid-cols-2 gap-2">
    {((currentBounds && (selectedAreas.length > 0 || selectedDas.length > 0)) ? availableLayers.mitigasiAdaptasi : layerData.mitigasiAdaptasi).map((layer) => (
      <div key={layer.id} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-200">
        <input 
          type="checkbox" 
          className="w-3 h-3 flex-shrink-0" 
          checked={activeLayers.has(layer.name)}
          onChange={(e) => handleLayerToggle(layer.name, e.target.checked)}
        />
        <span 
          className="text-xs flex-1 truncate cursor-help" 
          title={layer.name}
        >
          {layer.name}
        </span>
        <button
          onClick={() => handleDeleteClick('mitigasiAdaptasi', layer.id, layer.name)}
          className="text-red-500 hover:text-red-700 font-bold text-base flex-shrink-0"
        >
          ×
        </button>
      </div>
    ))}
    
    {/* Tambah Data Button */}
    <button
      onClick={() => handleAddClick('mitigasiAdaptasi')}
      className="flex items-center gap-1 px-2 py-1 border-2 border-dashed border-blue-400 text-blue-500 rounded hover:bg-blue-50 transition-colors justify-center"
    >
      <span className="text-base font-bold">+</span>
      <span className="text-xs">Tambah Data</span>
    </button>
  </div>
</div>

{/* Lain lain Section */}
<div className="mb-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1.5 border-b-2 border-orange-500">
    Lain lain
  </h3>
  <div className="grid grid-cols-2 gap-2">
    {((currentBounds && (selectedAreas.length > 0 || selectedDas.length > 0)) ? availableLayers.lainnya : layerData.lainnya).map((layer) => (
      <div key={layer.id} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-200">
        <input 
          type="checkbox" 
          className="w-3 h-3 flex-shrink-0" 
          checked={activeLayers.has(layer.name)}
          onChange={(e) => handleLayerToggle(layer.name, e.target.checked)}
        />
        <span 
          className="text-xs flex-1 truncate cursor-help" 
          title={layer.name}
        >
          {layer.name}
        </span>
        <button
          onClick={() => handleDeleteClick('lainnya', layer.id, layer.name)}
          className="text-red-500 hover:text-red-700 font-bold text-base flex-shrink-0"
        >
          ×
        </button>
      </div>
    ))}
    
    {/* Tambah Data Button */}
    <button
      onClick={() => handleAddClick('lainnya')}
      className="flex items-center gap-1 px-2 py-1 border-2 border-dashed border-blue-400 text-blue-500 rounded hover:bg-blue-50 transition-colors justify-center"
    >
      <span className="text-base font-bold">+</span>
      <span className="text-xs">Tambah Data</span>
    </button>
  </div>
</div>

{/* Kejadian Section */}
<div className="mb-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1.5 border-b-2 border-orange-500">
    Kejadian
  </h3>
  <div className="grid grid-cols-2 gap-2">
    {(((currentBounds && (selectedAreas.length > 0 || selectedDas.length > 0)) ? availableLayers.kejadian : layerData.kejadian) || []).map((layer) => (
      <div key={layer.id} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-200">
        <input 
          type="checkbox" 
          className="w-3 h-3 flex-shrink-0" 
          checked={activeLayers.has(layer.name)}
          onChange={(e) => handleLayerToggle(layer.name, e.target.checked)}
        />
        <span 
          className="text-xs flex-1 truncate cursor-help" 
          title={`Kejadian Tahun ${layer.year}`}
        >
          Kejadian {layer.year}
        </span>
      </div>
    ))}
  </div>
  {(layerData.kejadian?.length === 0 || !layerData.kejadian) && (
    <div className="text-xs text-gray-500 italic mt-2">
      Belum ada data kejadian
    </div>
  )}
</div>
                </div>
              </div>
            </div>
          )}

          {/* Toggle Panel Button */}
          <button
            onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
            className="absolute right-0 top-1/3 transform -translate-y-1/2 bg-orange-500 text-white p-1.5 rounded-l-lg shadow-lg z-[1000] hover:bg-orange-600"
            style={{ right: isLayerPanelOpen ? '320px' : '0' }}
          >
            <span className="text-lg">{isLayerPanelOpen ? '»' : '«'}</span>
          </button>
        </div>

        {/* Bottom Section: Charts and Photos - 35% height */}
        <div className="flex border-t-2 border-gray-300" style={{ height: '35vh' }}>
          {/* Charts Section */}
          <div className="flex-1 bg-white flex flex-col overflow-hidden">
            {/* Bottom Tabs - Smaller */}
            <div className="bg-gray-100 border-b border-gray-300 px-3 py-1.5 flex gap-1.5 overflow-x-auto flex-shrink-0">
              {bottomTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveBottomTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-t text-xs whitespace-nowrap flex items-center gap-1 ${
                    activeBottomTab === tab.id
                      ? 'bg-white text-orange-600 font-semibold border-t-2 border-orange-500'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Chart Content - Smaller padding */}
            <div className="flex-1 overflow-hidden p-3">
              {renderBottomContent()}
            </div>
          </div>

          {/* Photo Gallery Sidebar */}
          <div className="w-80 bg-gray-50 border-l border-gray-300 flex flex-col" style={{ height: '35vh' }}>
            <div className="p-3 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-800">Dokumentasi Foto Bencana</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                {dummyPhotos.slice(0, 4).map((photo, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition"
                      onClick={() => setSelectedPhotoIndex(idx)}
                    />
                    {idx === 3 && dummyPhotos.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded cursor-pointer hover:bg-black/40 transition"
                        onClick={() => setSelectedPhotoIndex(idx)}>
                        <span className="text-white text-xl font-bold">+{dummyPhotos.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tambah Data */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={() => !isUploading && setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-base font-semibold">Tambah Data {getSectionTitle(currentSection)}</h3>
              <button
                onClick={() => !isUploading && setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                disabled={isUploading}
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Masukan nama tabel"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded mb-3 focus:outline-none focus:border-blue-500"
                disabled={isUploading}
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                <input
                  type="file"
                  id="shapefileInput"
                  multiple
                  accept=".shp,.shx,.dbf,.prj,.cpg,.sbn,.sbx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <label
                  htmlFor="shapefileInput"
                  className={`cursor-pointer block ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-3xl text-gray-400 mb-1">☁️</div>
                  <div className="text-gray-500 text-xs mb-2">
                    {uploadedFiles.length > 0 
                      ? `${uploadedFiles.length} file dipilih` 
                      : 'Upload file shapefile (.shp, .shx, .dbf, dll)'}
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="text-[10px] text-gray-400 mt-2">
                      {uploadedFiles.map((f, idx) => (
                        <div key={idx}>{f.name}</div>
                      ))}
                    </div>
                  )}
                </label>
              </div>
              <div className="text-[10px] text-gray-500 mt-2">
                * Wajib upload minimal file .shp, disarankan juga upload .shx, .dbf, .prj
              </div>
              
              {/* Progress Bars */}
              {isUploading && (
                <div className="mt-4 space-y-3">
                  {/* Upload Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">Upload Files</span>
                      <span className="text-xs text-gray-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Insert Progress */}
                  {uploadProgress === 100 && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          Inserting Features
                          {insertStatus && <span className="ml-2 text-gray-500">({insertStatus})</span>}
                        </span>
                        <span className="text-xs text-gray-600">{insertProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${insertProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUploading}
              >
                Batal
              </button>
              <button
                onClick={handleCreateLayer}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={isUploading}
              >
                {isUploading ? (uploadProgress < 100 ? 'Mengupload...' : 'Memproses...') : 'Buat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-base font-semibold">Konfirmasi Hapus</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">
                Apakah Anda yakin ingin menghapus layer <strong>{layerToDelete?.name}</strong>?
              </p>
              <p className="text-xs text-red-500 mt-2">
                Tindakan ini tidak dapat dibatalkan dan akan menghapus tabel dari database.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhotoIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[2000] flex items-center justify-center">
          <button
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
          >
            ×
          </button>
          
          <button
            onClick={() => setSelectedPhotoIndex(prev => prev > 0 ? prev - 1 : dummyPhotos.length - 1)}
            className="absolute left-4 text-white text-5xl hover:text-gray-300 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
          >
            ‹
          </button>
          
          <div className="max-w-4xl max-h-screen p-4">
            <img
              src={dummyPhotos[selectedPhotoIndex]}
              alt={`Photo ${selectedPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            <div className="text-white text-center mt-4">
              <p className="text-lg">Foto {selectedPhotoIndex + 1} dari {dummyPhotos.length}</p>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {dummyPhotos.map((photo, idx) => (
                <img
                  key={idx}
                  src={photo}
                  alt={`Thumbnail ${idx + 1}`}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`w-16 h-16 object-cover cursor-pointer rounded ${
                    idx === selectedPhotoIndex ? 'border-4 border-orange-500' : 'border-2 border-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <button
            onClick={() => setSelectedPhotoIndex(prev => prev < dummyPhotos.length - 1 ? prev + 1 : 0)}
            className="absolute right-4 text-white text-5xl hover:text-gray-300 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default Kerawanan;