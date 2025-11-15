import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Kerawanan = () => {
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

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
              <th key={idx} className="px-4 py-2 border text-left text-sm font-semibold text-gray-700">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-2 border text-sm text-gray-600">
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
          <div className="h-96 p-4">
            <CurahHujanChart />
          </div>
        );
      case 'kemiringan':
        return (
          <div className="p-4">
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
          <div className="p-4">
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
          <div className="p-4">
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
          <div className="h-96 p-4">
            <JenisTanahChart />
          </div>
        );
      case 'patahan':
        return (
          <div className="p-4">
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
          <div className="h-96 p-4">
            <TutupanLahanChart />
          </div>
        );
      case 'infrastruktur':
        return (
          <div className="p-4">
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
          <div className="p-4">
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
    <div className="flex flex-col h-screen w-full bg-gray-100">
      {/* Top section with map and filters */}
      <div className="flex flex-1 overflow-hidden" style={{ height: '60%' }}>
        {/* Map Section */}
        <div className="relative flex-1">
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

          {/* Coordinates Display */}
          <div className="absolute top-4 left-24 z-[1000] bg-white px-4 py-2 rounded shadow-lg">
            <span className="font-mono text-sm">128.11, -11.78</span>
          </div>

          {/* Zoom Controls */}
          {/* <div className="absolute left-4 top-24 z-[1000] flex flex-col gap-1">
            <button className="bg-white w-8 h-8 flex items-center justify-center rounded shadow text-xl font-bold hover:bg-gray-100">
              +
            </button>
            <button className="bg-white w-8 h-8 flex items-center justify-center rounded shadow text-xl font-bold hover:bg-gray-100">
              −
            </button>
          </div> */}
        </div>

        {/* Layer Services Panel */}
        {isLayerPanelOpen && (
          <div className="w-96 bg-white shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="bg-orange-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">»</span>
                <h2 className="text-xl font-semibold">Layer Services</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Tabs */}
              <div className="flex gap-4 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mainTab"
                    checked={activeTab === 'administrasi'}
                    onChange={() => setActiveTab('administrasi')}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">Administrasi</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mainTab"
                    checked={activeTab === 'das'}
                    onChange={() => setActiveTab('das')}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">DAS</span>
                </label>
              </div>

              {/* Kerawanan Section */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-orange-500">
                  Kerawanan
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.kerawanan.banjir}
                      onChange={() => handleFilterChange('kerawanan', 'banjir')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Banjir</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.kerawanan.arealBanjir}
                      onChange={() => handleFilterChange('kerawanan', 'arealBanjir')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Areal Banjir</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.kerawanan.tanahLongsor}
                      onChange={() => handleFilterChange('kerawanan', 'tanahLongsor')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Tanah Longsor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.kerawanan.arealTanahLongsor}
                      onChange={() => handleFilterChange('kerawanan', 'arealTanahLongsor')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Areal Tanah Longsor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.kerawanan.kekeringan}
                      onChange={() => handleFilterChange('kerawanan', 'kekeringan')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Kekeringan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.kerawanan.arealKekeringan}
                      onChange={() => handleFilterChange('kerawanan', 'arealKekeringan')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Areal Kekeringan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.kerawanan.abrasi}
                      onChange={() => handleFilterChange('kerawanan', 'abrasi')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Abrasi</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.kerawanan.arealAbrasi}
                      onChange={() => handleFilterChange('kerawanan', 'arealAbrasi')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Areal Abrasi</span>
                  </label>
                </div>
              </div>

              {/* Erosi Section */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-orange-500">
                  Erosi
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.erosiKebakaran.erosi}
                      onChange={() => handleFilterChange('erosiKebakaran', 'erosi')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Erosi</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.erosiKebakaran.arealErosi}
                      onChange={() => handleFilterChange('erosiKebakaran', 'arealErosi')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Areal Erosi</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.erosiKebakaran.kebakaranHutanLahan}
                      onChange={() => handleFilterChange('erosiKebakaran', 'kebakaranHutanLahan')}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">Kebakaran Hutan dan Lahan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.erosiKebakaran.arealKebakaranHutan}
                      onChange={() => handleFilterChange('erosiKebakaran', 'arealKebakaranHutan')}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">Areal Kebakaran Hutan</span>
                  </label>
                </div>
              </div>

              {/* Mitigasi dan Adaptasi Section */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-orange-500">
                  Mitigasi dan Adaptasi
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.mitigasiAdaptasi.rehabilitasiDas}
                      onChange={() => handleFilterChange('mitigasiAdaptasi', 'rehabilitasiDas')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Rehabilitasi Das</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.mitigasiAdaptasi.danau}
                      onChange={() => handleFilterChange('mitigasiAdaptasi', 'danau')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Danau</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.mitigasiAdaptasi.rehabilitasiHutanLahan}
                      onChange={() => handleFilterChange('mitigasiAdaptasi', 'rehabilitasiHutanLahan')}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">Rehabilitasi Hutan dan Lahan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.mitigasiAdaptasi.situ}
                      onChange={() => handleFilterChange('mitigasiAdaptasi', 'situ')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Situ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.mitigasiAdaptasi.penerapanTeknik}
                      onChange={() => handleFilterChange('mitigasiAdaptasi', 'penerapanTeknik')}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">Penerapan Teknik Konservasi Tanah dan Air</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.mitigasiAdaptasi.pengamanPantai}
                      onChange={() => handleFilterChange('mitigasiAdaptasi', 'pengamanPantai')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Pengaman pantai</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.mitigasiAdaptasi.bendungan}
                      onChange={() => handleFilterChange('mitigasiAdaptasi', 'bendungan')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Bendungan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.mitigasiAdaptasi.embung}
                      onChange={() => handleFilterChange('mitigasiAdaptasi', 'embung')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Embung</span>
                  </label>
                </div>
              </div>

              {/* Other Layers Section */}
              <div className="mb-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.lainnya.tutupanLahan}
                      onChange={() => handleFilterChange('lainnya', 'tutupanLahan')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Tutupan Lahan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.lainnya.kawasanHutan}
                      onChange={() => handleFilterChange('lainnya', 'kawasanHutan')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Kawasan Hutan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.lainnya.lahanKritis}
                      onChange={() => handleFilterChange('lainnya', 'lahanKritis')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Lahan Kritis</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.lainnya.kelerengan}
                      onChange={() => handleFilterChange('lainnya', 'kelerengan')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Kelerengan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.lainnya.jenisTanah}
                      onChange={() => handleFilterChange('lainnya', 'jenisTanah')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Jenis Tanah</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.lainnya.geologi}
                      onChange={() => handleFilterChange('lainnya', 'geologi')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Geologi</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Panel Button */}
        <button
          onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          className="absolute right-0 top-1/3 transform -translate-y-1/2 bg-orange-500 text-white p-2 rounded-l-lg shadow-lg z-[1000] hover:bg-orange-600"
          style={{ right: isLayerPanelOpen ? '384px' : '0' }}
        >
          <span className="text-xl">{isLayerPanelOpen ? '»' : '«'}</span>
        </button>
      </div>

      {/* Bottom section with tabs, charts and photos */}
      <div className="h-2/5 bg-white border-t-2 border-gray-300 overflow-y-auto flex">
        <div className="flex-1" style={{ maxWidth: 'calc(100% - 400px)' }}>
          {/* Bottom Tabs */}
          <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex gap-2 overflow-x-auto">
            {bottomTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveBottomTab(tab.id)}
                className={`px-3 py-2 rounded-t text-xs whitespace-nowrap flex items-center gap-1 ${
                  activeBottomTab === tab.id
                    ? 'bg-white text-orange-600 font-semibold border-t-2 border-orange-500'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Bottom Content */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 50px)' }}>
            {renderBottomContent()}
          </div>
        </div>

        {/* Photo Gallery Sidebar */}
        <div className="w-96 bg-gray-50 border-l border-gray-300 p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-800 mb-4">Dokumentasi Foto Bencana</h3>
          <div className="grid grid-cols-2 gap-3">
            {dummyPhotos.slice(0, 4).map((photo, idx) => (
              <div key={idx} className="relative">
                <img
                  src={photo}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-80 transition"
                  onClick={() => setSelectedPhotoIndex(idx)}
                />
                {idx === 3 && dummyPhotos.length > 4 && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded cursor-pointer hover:bg-opacity-60 transition"
                    onClick={() => setSelectedPhotoIndex(idx)}>
                    <span className="text-white text-3xl font-bold">+{dummyPhotos.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

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