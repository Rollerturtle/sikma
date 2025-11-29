import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from './api';

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
  const [mapReady, setMapReady] = useState(false);
  const [insertProgress, setInsertProgress] = useState(0);
  const [insertStatus, setInsertStatus] = useState('');

  const [layerData, setLayerData] = useState<{
    kerawanan: Array<{id: string, name: string}>,
    mitigasiAdaptasi: Array<{id: string, name: string}>,
    lainnya: Array<{id: string, name: string}>
  }>({
    kerawanan: [],
    mitigasiAdaptasi: [],
    lainnya: []
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
      const bounds = mapInstanceRef.current.getBounds();
      const zoom = mapInstanceRef.current.getZoom();
      const boundsString = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
      
      console.log('Loading layer:', tableName, 'zoom:', zoom, 'bounds:', boundsString);
      
      const response = await fetch(
        `${API_URL}/api/layers/${tableName}/geojson?bounds=${boundsString}&zoom=${zoom}`
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
        console.warn('No features found in current bounds for:', tableName);
        // Tetap simpan layer kosong agar bisa reload saat pan/zoom
        layerGroupsRef.current[tableName] = window.L.layerGroup();
        layerGroupsRef.current[tableName].addTo(mapInstanceRef.current);
        return;
      }
      
      // Dapatkan warna konsisten untuk tabel ini
      const tableColor = getColorForTable(tableName);
      
      // Buat layer group baru dengan pane khusus untuk performa
      const layerGroup = window.L.geoJSON(geojsonData, {
        pane: 'overlayPane', // Gunakan pane yang tepat
        style: function(feature) {
          return {
            color: tableColor,
            weight: zoom > 10 ? 2 : 1, // Line lebih tipis saat zoom out
            opacity: 0.8,
            fillOpacity: zoom > 10 ? 0.4 : 0.3 // Transparansi lebih tinggi saat zoom out
          };
        },
        pointToLayer: function(feature, latlng) {
          return window.L.circleMarker(latlng, {
            radius: zoom > 10 ? 6 : 4, // Marker lebih kecil saat zoom out
            fillColor: tableColor,
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.7
          });
        },
        onEachFeature: function(feature, layer) {
          // Hanya tambahkan popup jika zoom cukup dekat (untuk performa)
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
      
      console.log('Layer loaded successfully in bounds');
      
    } catch (error) {
      console.error('Error loading layer in bounds:', error);
    }
  };

  const reloadActiveLayers = () => {
    if (isLoadingLayer) return; // Hindari multiple reload
    
    activeLayers.forEach(tableName => {
      loadLayerInBounds(tableName);
    });
  };

  const handleLayerToggle = async (tableName: string, isChecked: boolean) => {
    console.log('Toggle layer clicked:', tableName, 'isChecked:', isChecked);
    console.log('Current active layers:', Array.from(activeLayers));
    
    if (isChecked) {
      // Tambahkan layer ke active layers
      setActiveLayers(prev => new Set([...prev, tableName]));
      
      // Load layer dengan bounds
      await loadLayerInBounds(tableName);
      
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
  }, []);

  const fetchLayers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/layers`);
      const data = await response.json();
      setLayerData(data);
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

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    console.log('Active layers changed:', Array.from(activeLayers));
    
    // Reload semua active layers dengan bounds terbaru
    const reloadLayers = async () => {
      if (isLoadingLayer) return;
      
      setIsLoadingLayer(true);
      
      for (const tableName of activeLayers) {
        await loadLayerInBounds(tableName);
      }
      
      setIsLoadingLayer(false);
    };

    reloadLayers();
  }, [activeLayers, mapReady]);

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
        let moveTimeout;
        map.on('moveend', () => {
          // Debounce untuk menghindari terlalu banyak request
          clearTimeout(moveTimeout);
          moveTimeout = setTimeout(() => {
            console.log('Map moveend event - reloading active layers');
            
            // Trigger reload dengan mengupdate state
            setActiveLayers(prev => new Set(prev));
          }, 500); // Delay 500ms (lebih lama) untuk performa lebih baik
        });
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

                  {/* Kerawanan Section */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1.5 border-b-2 border-orange-500">
                      Kerawanan
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {layerData.kerawanan.map((layer) => (
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
                      {layerData.mitigasiAdaptasi.map((layer) => (
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
                      {layerData.lainnya.map((layer) => (
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