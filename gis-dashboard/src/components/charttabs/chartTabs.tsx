// src/components/charttabs/ChartTabsComponent.tsx
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { API_URL } from '../../api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartTabsComponentProps {
  disasterType: 'kebakaran' | 'longsor' | 'banjir';
  kejadianId?: number;
  isKerawananMode?: boolean;
  kerawananFilters?: {
    disaster_type: string;
    provinsi?: string | null;
    kabupaten?: string | null;
    kecamatan?: string | null;
    kelurahan?: string | null;
    das?: string | null;
  };
  className?: string;
  isInMockup?: boolean;
}

interface TabConfig {
  id: string;
  label: string;
  type: 'line-chart' | 'bar-chart' | 'doughnut-chart' | 'table';
  chartData?: any;
  tableData?: {
    headers: string[];
    rows: any[][];
  };
}

// Configuration for each disaster type
const getDisasterTabs = (disasterType: string, chartData: any): TabConfig[] => {
  switch (disasterType) {
    case 'banjir':
      return [
        {
          id: 'curah-hujan',
          label: '🌧️ Curah Hujan',
          type: 'line-chart',
          chartData: chartData?.curah_hujan && chartData.curah_hujan.length > 0 ? {
            labels: chartData.curah_hujan.map((d: any) => d.jam),
            datasets: [
              {
                label: 'Curah Hujan (mm)',
                data: chartData.curah_hujan.map((d: any) => parseFloat(d.curah_hujan)),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                tension: 0.4,
              },
              {
                label: 'Batas Kritis (mm)',
                data: Array(chartData.curah_hujan.length).fill(95),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderDash: [5, 5],
                pointRadius: 0,
              }
            ],
          } : null,
        },
        {
          id: 'status-das',
          label: '🌊 Status DAS',
          type: 'table',
          tableData: chartData?.status_das && chartData.status_das.length > 0 ? {
            headers: ['Nama DAS', 'Luas (km²)', 'Tutupan Vegetasi', 'Sedimentasi', 'Status Kekritisan'],
            rows: chartData.status_das.map((d: any) => [
              d.nama_das,
              d.luas?.toLocaleString() || '-',
              d.tutupan_vegetasi ? d.tutupan_vegetasi + '%' : '-',
              d.sedimentasi || '-',
              d.status_kekritisan || '-'
            ])
          } : {
            headers: ['Nama DAS', 'Luas (km²)', 'Tutupan Vegetasi', 'Sedimentasi', 'Status Kekritisan'],
            rows: [['Tidak ada data', '-', '-', '-', '-']]
          },
        },
        {
          id: 'tutupan-das',
          label: '🌳 Tutupan DAS',
          type: 'doughnut-chart',
          chartData: chartData?.tutupan_das && chartData.tutupan_das.length > 0 ? {
            labels: chartData.tutupan_das.map((d: any) => d.jenis_tutupan),
            datasets: [
              {
                data: chartData.tutupan_das.map((d: any) => parseFloat(d.persentase)),
                backgroundColor: ['#059669', '#84cc16', '#fbbf24', '#f97316', '#b91c1c', '#6b7280'],
              },
            ],
          } : null,
        },
        {
          id: 'kemiringan-lahan',
          label: '📐 Kemiringan Lahan',
          type: 'bar-chart',
          chartData: chartData?.kemiringan_lahan ? {
            labels: ['0-2° (Sangat Datar)', '2-8° (Datar)', '8-15° (Landai)', '15-25° (Agak Curam)', '25-40° (Curam)', '>40° (Sangat Curam)'],
            datasets: [
              {
                label: 'Luas Area (Ha)',
                data: [
                  parseFloat(chartData.kemiringan_lahan.sangat_datar) || 0,
                  parseFloat(chartData.kemiringan_lahan.datar) || 0,
                  parseFloat(chartData.kemiringan_lahan.landai) || 0,
                  parseFloat(chartData.kemiringan_lahan.agak_curam) || 0,
                  parseFloat(chartData.kemiringan_lahan.curam) || 0,
                  parseFloat(chartData.kemiringan_lahan.sangat_curam) || 0,
                ],
                backgroundColor: ['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444', '#dc2626'],
              },
            ],
          } : null,
        },
        {
          id: 'kepadatan-pemukiman',
          label: '🏘️ Kepadatan Pemukiman',
          type: 'table',
          tableData: chartData?.kepadatan_pemukiman && chartData.kepadatan_pemukiman.length > 0 ? {
            headers: ['Kelurahan/Desa', 'Jumlah KK', 'Jumlah Jiwa', 'Kepadatan (jiwa/km²)', 'Klasifikasi'],
            rows: chartData.kepadatan_pemukiman.map((d: any) => [
              d.kel_desa,
              d.jumlah_kk?.toLocaleString() || '-',
              d.jumlah_jiwa?.toLocaleString() || '-',
              d.kepadatan?.toLocaleString() || '-',
              d.klasifikasi || '-'
            ])
          } : {
            headers: ['Kelurahan/Desa', 'Jumlah KK', 'Jumlah Jiwa', 'Kepadatan (jiwa/km²)', 'Klasifikasi'],
            rows: [['Tidak ada data', '-', '-', '-', '-']]
          },
        },
      ];

    case 'kebakaran':
      return [
        {
          id: 'status-das',
          label: '🌊 Status DAS',
          type: 'table',
          tableData: chartData?.status_das && chartData.status_das.length > 0 ? {
            headers: ['Nama DAS', 'Luas (Ha)', 'Tutupan Vegetasi', 'Status', 'Tingkat Risiko'],
            rows: chartData.status_das.map((d: any) => [
              d.nama_das,
              d.luas?.toLocaleString() || '-',
              d.tutupan_vegetasi ? d.tutupan_vegetasi + '%' : '-',
              d.status || '-',
              d.tingkat_risiko || '-'
            ])
          } : {
            headers: ['Nama DAS', 'Luas (Ha)', 'Tutupan Vegetasi', 'Status', 'Tingkat Risiko'],
            rows: [['Tidak ada data', '-', '-', '-', '-']]
          },
        },
        {
          id: 'tutupan-das',
          label: '🌳 Tutupan DAS',
          type: 'doughnut-chart',
          chartData: chartData?.tutupan_das && chartData.tutupan_das.length > 0 ? {
            labels: chartData.tutupan_das.map((d: any) => d.jenis_tutupan),
            datasets: [
              {
                data: chartData.tutupan_das.map((d: any) => parseFloat(d.persentase)),
                backgroundColor: ['#059669', '#84cc16', '#fbbf24', '#f97316', '#b91c1c', '#6b7280'],
              },
            ],
          } : null,
        },
        {
          id: 'kemiringan-lahan',
          label: '📐 Kemiringan Lahan',
          type: 'bar-chart',
          chartData: chartData?.kemiringan_lahan ? {
            labels: ['0-8° (Datar)', '8-15° (Landai)', '15-25° (Agak Curam)', '25-40° (Curam)', '>40° (Sangat Curam)'],
            datasets: [
              {
                label: 'Luas Area (Ha)',
                data: [
                  parseFloat(chartData.kemiringan_lahan.sangat_datar) || 0,
                  parseFloat(chartData.kemiringan_lahan.datar) || 0,
                  parseFloat(chartData.kemiringan_lahan.landai) || 0,
                  parseFloat(chartData.kemiringan_lahan.agak_curam) || 0,
                  parseFloat(chartData.kemiringan_lahan.curam) || 0,
                ],
                backgroundColor: ['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'],
              },
            ],
          } : null,
        },
        {
          id: 'kepadatan-pemukiman',
          label: '🏘️ Kepadatan Pemukiman',
          type: 'table',
          tableData: chartData?.kepadatan_pemukiman && chartData.kepadatan_pemukiman.length > 0 ? {
            headers: ['Kelurahan/Desa', 'Jumlah KK', 'Jumlah Jiwa', 'Kepadatan (jiwa/km²)', 'Klasifikasi'],
            rows: chartData.kepadatan_pemukiman.map((d: any) => [
              d.kel_desa,
              d.jumlah_kk?.toLocaleString() || '-',
              d.jumlah_jiwa?.toLocaleString() || '-',
              d.kepadatan?.toLocaleString() || '-',
              d.klasifikasi || '-'
            ])
          } : {
            headers: ['Kelurahan/Desa', 'Jumlah KK', 'Jumlah Jiwa', 'Kepadatan (jiwa/km²)', 'Klasifikasi'],
            rows: [['Tidak ada data', '-', '-', '-', '-']]
          },
        },
      ];

    case 'longsor':
      return [
        {
          id: 'curah-hujan',
          label: '🌧️ Curah Hujan 30 Hari',
          type: 'line-chart',
          chartData: chartData?.curah_hujan && chartData.curah_hujan.length > 0 ? {
            labels: chartData.curah_hujan.map((d: any) => d.hari), // Pakai "Hari 1", "Hari 2", dst
            datasets: [
              {
                label: 'Curah Hujan (mm/hari)',
                data: chartData.curah_hujan.map((d: any) => parseFloat(d.curah_hujan)),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                tension: 0.4,
              },
              {
                label: 'Batas Kritis (mm)',
                data: Array(chartData.curah_hujan.length).fill(100),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderDash: [5, 5],
                pointRadius: 0,
              }
            ],
          } : null,
        },
        {
          id: 'kemiringan-lereng',
          label: '⛰️ Kemiringan Lereng',
          type: 'table',
          tableData: chartData?.kemiringan_lereng && chartData.kemiringan_lereng.length > 0 ? {
            headers: ['Segmen', 'Kemiringan (°)', 'Luas (Ha)', 'Tinggi Lereng (m)', 'Klasifikasi Bahaya'],
            rows: chartData.kemiringan_lereng.map((d: any) => [
              d.segmen,
              d.kemiringan || '-',
              d.luas || '-',
              d.tinggi_lereng || '-',
              d.klasifikasi_bahaya || '-'
            ])
          } : {
            headers: ['Segmen', 'Kemiringan (°)', 'Luas (Ha)', 'Tinggi Lereng (m)', 'Klasifikasi Bahaya'],
            rows: [['Tidak ada data', '-', '-', '-', '-']]
          },
        },
        {
          id: 'topografi',
          label: '🗻 Topografi',
          type: 'table',
          tableData: chartData?.topografi && chartData.topografi.length > 0 ? {
            headers: ['Area', 'Ketinggian (mdpl)', 'Bentuk Lahan', 'Kelerengan', 'Potensi Longsor'],
            rows: chartData.topografi.map((d: any) => [
              d.area,
              d.ketinggian || '-',
              d.bentuk_lahan || '-',
              d.kelerengan || '-',
              d.potensi_longsor || '-'
            ])
          } : {
            headers: ['Area', 'Ketinggian (mdpl)', 'Bentuk Lahan', 'Kelerengan', 'Potensi Longsor'],
            rows: [['Tidak ada data', '-', '-', '-', '-']]
          },
        },
        {
          id: 'geologi',
          label: '🪨 Geologi',
          type: 'table',
          tableData: chartData?.geologi && chartData.geologi.length > 0 ? {
            headers: ['Parameter', 'Deskripsi', 'Klasifikasi', 'Pengaruh terhadap Longsor'],
            rows: chartData.geologi.map((d: any) => [
              d.parameter,
              d.deskripsi || '-',
              d.klasifikasi || '-',
              d.pengaruh_terhadap_longsor || '-'
            ])
          } : {
            headers: ['Parameter', 'Deskripsi', 'Klasifikasi', 'Pengaruh terhadap Longsor'],
            rows: [['Tidak ada data', '-', '-', '-']]
          },
        },
        {
          id: 'jenis-tanah',
          label: '🌱 Jenis Tanah',
          type: 'bar-chart',
          chartData: chartData?.jenis_tanah && chartData.jenis_tanah.length > 0 ? {
            labels: chartData.jenis_tanah.map((d: any) => d.jenis_tanah),
            datasets: [
              {
                label: 'Persentase (%)',
                data: chartData.jenis_tanah.map((d: any) => parseFloat(d.persentase)),
                backgroundColor: ['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'],
              },
            ],
          } : null,
        },
        {
          id: 'patahan',
          label: '⚡ Patahan',
          type: 'table',
          tableData: chartData?.patahan && chartData.patahan.length > 0 ? {
            headers: ['Nama Patahan', 'Jarak (km)', 'Status', 'Tingkat Aktivitas', 'Risiko'],
            rows: chartData.patahan.map((d: any) => [
              d.nama_patahan,
              d.jarak || '-',
              d.status || '-',
              d.tingkat_aktivitas || '-',
              d.risiko || '-'
            ])
          } : {
            headers: ['Nama Patahan', 'Jarak (km)', 'Status', 'Tingkat Aktivitas', 'Risiko'],
            rows: [['Tidak ada data', '-', '-', '-', '-']]
          },
        },
        {
          id: 'tutupan-lahan',
          label: '🌳 Tutupan Lahan',
          type: 'doughnut-chart',
          chartData: chartData?.tutupan_lahan && chartData.tutupan_lahan.length > 0 ? {
            labels: chartData.tutupan_lahan.map((d: any) => d.jenis_tutupan),
            datasets: [
              {
                data: chartData.tutupan_lahan.map((d: any) => parseFloat(d.persentase)),
                backgroundColor: ['#059669', '#84cc16', '#fbbf24', '#f97316', '#b91c1c'],
              },
            ],
          } : null,
        },
        {
          id: 'infrastruktur',
          label: '🏗️ Infrastruktur',
          type: 'table',
          tableData: chartData?.infrastruktur && chartData.infrastruktur.length > 0 ? {
            headers: ['Jenis Infrastruktur', 'Lokasi', 'Jarak (m)', 'Status', 'Tingkat Risiko'],
            rows: chartData.infrastruktur.map((d: any) => [
              d.jenis_infrastruktur,
              d.lokasi || '-',
              d.jarak || '-',
              d.status || '-',
              d.tingkat_risiko || '-'
            ])
          } : {
            headers: ['Jenis Infrastruktur', 'Lokasi', 'Jarak (m)', 'Status', 'Tingkat Risiko'],
            rows: [['Tidak ada data', '-', '-', '-', '-']]
          },
        },
        {
          id: 'kepadatan-pemukiman',
          label: '🏘️ Kepadatan Pemukiman',
          type: 'table',
          tableData: chartData?.kepadatan_pemukiman && chartData.kepadatan_pemukiman.length > 0 ? {
            headers: ['Kelurahan/Desa', 'Jumlah KK', 'Jumlah Jiwa', 'Kepadatan (jiwa/km²)', 'Klasifikasi'],
            rows: chartData.kepadatan_pemukiman.map((d: any) => [
              d.kel_desa,
              d.jumlah_kk?.toLocaleString() || '-',
              d.jumlah_jiwa?.toLocaleString() || '-',
              d.kepadatan?.toLocaleString() || '-',
              d.klasifikasi || '-'
            ])
          } : {
            headers: ['Kelurahan/Desa', 'Jumlah KK', 'Jumlah Jiwa', 'Kepadatan (jiwa/km²)', 'Klasifikasi'],
            rows: [['Tidak ada data', '-', '-', '-', '-']]
          },
        },
      ];

    default:
      return [];
  }
};

const ChartTabsComponent: React.FC<ChartTabsComponentProps> = ({
  disasterType,
  kejadianId,
  isKerawananMode = false,
  kerawananFilters,
  className = '',
  isInMockup = false,
}) => {
  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [chartData, setChartData] = useState<any>(null);  // TAMBAHAN BARU
  const [loading, setLoading] = useState(true);
  const [kejadianCount, setKejadianCount] = useState<number>(0); 

  useEffect(() => {
    const fetchChartData = async () => {
      if (isKerawananMode && kerawananFilters) {
        try {
          setLoading(true);
          
          // Build query params
          const params = new URLSearchParams();
          params.append('disaster_type', kerawananFilters.disaster_type);
          if (kerawananFilters.provinsi) params.append('provinsi', kerawananFilters.provinsi);
          if (kerawananFilters.kabupaten) params.append('kabupaten', kerawananFilters.kabupaten);
          if (kerawananFilters.kecamatan) params.append('kecamatan', kerawananFilters.kecamatan);
          if (kerawananFilters.kelurahan) params.append('kelurahan', kerawananFilters.kelurahan);
          if (kerawananFilters.das) params.append('das', kerawananFilters.das);
          
          const response = await fetch(`${API_URL}/api/kerawanan/chart-data?${params}`);
          const result = await response.json();

          if (result.success) {
            setChartData(result.data);
            setKejadianCount(result.kejadian_count);
            const newTabs = getDisasterTabs(disasterType, result.data);
            setTabs(newTabs);
            if (newTabs.length > 0) {
              setActiveTab(newTabs[0].id);
            }
          } else {
            console.error('Failed to fetch kerawanan chart data:', result);
            const newTabs = getDisasterTabs(disasterType, null);
            setTabs(newTabs);
            if (newTabs.length > 0) {
              setActiveTab(newTabs[0].id);
            }
          }
        } catch (error) {
          console.error('Error fetching kerawanan chart data:', error);
          const newTabs = getDisasterTabs(disasterType, null);
          setTabs(newTabs);
          if (newTabs.length > 0) {
            setActiveTab(newTabs[0].id);
          }
        } finally {
          setLoading(false);
        }
        return;
      }
      
      // Jika mode kejadian (existing logic)
      if (!kejadianId || isInMockup) {
        const newTabs = getDisasterTabs(disasterType, null);
        setTabs(newTabs);
        if (newTabs.length > 0) {
          setActiveTab(newTabs[0].id);
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/kejadian/${kejadianId}/chart-data`);
        const result = await response.json();

        if (result.success) {
          setChartData(result.data);
          const newTabs = getDisasterTabs(disasterType, result.data);
          setTabs(newTabs);
          if (newTabs.length > 0) {
            setActiveTab(newTabs[0].id);
          }
        } else {
          console.error('Failed to fetch chart data:', result);
          const newTabs = getDisasterTabs(disasterType, null);
          setTabs(newTabs);
          if (newTabs.length > 0) {
            setActiveTab(newTabs[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
        const newTabs = getDisasterTabs(disasterType, null);
        setTabs(newTabs);
        if (newTabs.length > 0) {
          setActiveTab(newTabs[0].id);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [disasterType, kejadianId, isInMockup, isKerawananMode, kerawananFilters]);

  // Load tabs based on disaster type
  // useEffect(() => {
  //   const disasterTabs = getDisasterTabs(disasterType, null);
  //   setTabs(disasterTabs);
  //   if (disasterTabs.length > 0) {
  //     setActiveTab(disasterTabs[0].id);
  //   }
  // }, [disasterType]);

  const currentTabConfig = tabs.find((tab) => tab.id === activeTab);

  // Table filtering and pagination
  const getFilteredData = () => {
    if (!currentTabConfig || currentTabConfig.type !== 'table' || !currentTabConfig.tableData) {
      return [];
    }

    return currentTabConfig.tableData.rows.filter((row) =>
      row.some((cell) => cell.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + entriesPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset pagination when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm('');
  }, [activeTab]);

  // Get chart options
  const getChartOptions = (type: string) => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            font: { size: 11 },
            padding: 10,
          },
        },
      },
      scales:
        type !== 'doughnut-chart'
          ? {
              y: {
                beginAtZero: true,
                ticks: { font: { size: 9 } },
              },
              x: {
                ticks: { font: { size: 9 } },
              },
            }
          : undefined,
    };
  };

  // Render chart based on type
  const renderChart = (tab: TabConfig) => {
    if (!tab.chartData) return null;

    const options = getChartOptions(tab.type);

    switch (tab.type) {
      case 'line-chart':
        return <Line data={tab.chartData} options={options} />;
      case 'bar-chart':
        return <Bar data={tab.chartData} options={options} />;
      case 'doughnut-chart':
        return <Doughnut data={tab.chartData} options={options} />;
      default:
        return null;
    }
  };

  // Render table
  const renderTable = (tab: TabConfig) => {
    if (!tab.tableData) return null;

    const { headers, rows } = tab.tableData;

    // Helper function to check if value indicates high risk
    const getStatusClass = (cell: string, header: string) => {
      const lowerCell = cell.toLowerCase();
      const lowerHeader = header.toLowerCase();

      if (
        lowerHeader.includes('status') ||
        lowerHeader.includes('klasifikasi') ||
        lowerHeader.includes('tingkat') ||
        lowerHeader.includes('risiko')
      ) {
        if (
          lowerCell.includes('tinggi') ||
          lowerCell.includes('sangat') ||
          lowerCell.includes('kritis') ||
          lowerCell.includes('rusak') ||
          lowerCell.includes('padat')
        ) {
          return 'status-tinggi';
        } else if (lowerCell.includes('sedang')) {
          return 'status-sedang';
        } else if (lowerCell.includes('rendah') || lowerCell.includes('baik')) {
          return 'status-rendah';
        }
      }
      return '';
    };

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 border-b border-gray-300 -m-3 mb-3 gap-2">
          <div className="flex items-center">
            <label className="mr-2 text-xs text-gray-700">Show</label>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="ml-2 text-xs text-gray-700">entries</span>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1 border border-gray-300 rounded w-48 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="w-3 h-3 text-gray-500 absolute left-2.5 top-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                    {row.map((cell, cellIdx) => {
                      const statusClass = getStatusClass(cell, headers[cellIdx]);
                      return (
                        <td key={cellIdx} className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {statusClass ? (
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                statusClass === 'status-tinggi'
                                  ? 'bg-red-100 text-red-800'
                                  : statusClass === 'status-sedang'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {cell}
                            </span>
                          ) : (
                            cell
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length} className="px-3 py-4 text-center text-xs text-gray-500">
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-3 bg-gray-50 border-t border-gray-300 -m-3 mt-3">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`w-full min-h-[450px] bg-white shadow-md rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-gray-500">Memuat data chart...</p>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="w-full min-h-[450px] bg-white shadow-md rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Tidak ada data tersedia</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full ${
        isInMockup ? 'h-full' : 'min-h-[450px]'
      } bg-white shadow-md rounded-lg overflow-hidden ${className}`}
    >
      {/* TAMBAHAN: Header info untuk kerawanan mode */}
      {isKerawananMode && kejadianCount > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <p className="text-sm text-blue-700">
            📊 Data gabungan dari <strong>{kejadianCount} kejadian</strong> di lokasi ini
          </p>
        </div>
      )}
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-300 flex-shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-3 py-2 font-medium text-xs border-r border-gray-300 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-b-2 border-b-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="p-3 flex-1 flex flex-col overflow-hidden">
        {currentTabConfig && (
          <>
            {currentTabConfig.type !== 'table' ? (
              // Chart Content
              <div
                className="flex-1 min-h-0"
                style={{
                  height: isInMockup ? '100%' : '350px',
                  minHeight: isInMockup ? '300px' : '350px',
                }}
              >
                {renderChart(currentTabConfig)}
              </div>
            ) : (
              // Table Content
              renderTable(currentTabConfig)
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChartTabsComponent;