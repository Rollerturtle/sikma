// src/components/charttabs/ChartTabsComponent.tsx
import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ChartTabsComponentProps {
  filterData?: any;
  className?: string;
  isInMockup?: boolean;
}

// Mock data untuk tabel
const mockData = [
  { id: 1, col1: 'Data 1', col2: 'Data 2', col3: 'Data 3', col4: 'Data 4', col5: 'Data 5' },
  { id: 2, col1: 'Data 6', col2: 'Data 7', col3: 'Data 8', col4: 'Data 9', col5: 'Data 10' },
  { id: 3, col1: 'Data 11', col2: 'Data 12', col3: 'Data 13', col4: 'Data 14', col5: 'Data 15' },
  { id: 4, col1: 'Data 16', col2: 'Data 17', col3: 'Data 18', col4: 'Data 19', col5: 'Data 20' },
  { id: 5, col1: 'Data 21', col2: 'Data 22', col3: 'Data 23', col4: 'Data 24', col5: 'Data 25' },
];

// Data untuk line chart curah hujan
const rainfallData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  datasets: [
    {
      label: 'Curah Hujan (mm)',
      data: [120, 190, 130, 150, 180, 220, 250, 230, 200, 180, 160, 140],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      tension: 0.3,
      fill: false,
    },
    {
      label: 'Rata-rata Historis (mm)',
      data: [100, 150, 120, 140, 160, 200, 230, 210, 190, 170, 150, 130],
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.5)',
      borderDash: [5, 5],
      tension: 0.3,
      fill: false,
    }
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        font: {
          size: 11
        },
        padding: 10,
      }
    },
    title: {
      display: true,
      text: 'Grafik Curah Hujan Tahun 2023',
      font: {
        size: 13,
        weight: 'bold'
      }
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Curah Hujan (mm)',
        font: {
          size: 10
        }
      },
      ticks: {
        font: {
          size: 9
        }
      }
    },
    x: {
      title: {
        display: true,
        text: 'Bulan',
        font: {
          size: 10
        }
      },
      ticks: {
        font: {
          size: 9
        }
      }
    }
  },
};

const ChartTabsComponent: React.FC<ChartTabsComponentProps> = ({ filterData, className = '', isInMockup = false }) => {
  const [activeTab, setActiveTab] = useState<string>('sheet1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Determine if we're in mockup context (has height constraints) or detail page context
  const containerHeight = isInMockup ? 'h-full' : 'min-h-[400px]';

  // Mock data per sheet
  const sheets = {
    sheet1: mockData,
    sheet2: mockData.map(d => ({ ...d, col1: `${d.col1} (Sheet 2)`, col2: `${d.col2} (Sheet 2)` })),
    sheet3: mockData.map(d => ({ ...d, col1: `${d.col1} (Sheet 3)`, col2: `${d.col2} (Sheet 3)`, col3: `${d.col3} (Sheet 3)` })),
  };

  const currentData = sheets[activeTab] || mockData;

  // Filter data berdasarkan pencarian
  const filteredData = currentData.filter(row =>
    Object.values(row).some(val =>
      val.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + entriesPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset pagination when tab, search, or entries per page changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, entriesPerPage]);

  return (
    <div className={`w-full ${isInMockup ? 'h-full' : 'min-h-[450px]'} bg-white shadow-md rounded-lg overflow-hidden ${className}`}>
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-300 flex-shrink-0">
        <button
          className={`px-3 py-2 font-medium text-xs border border-gray-300 transition-colors ${
            activeTab === 'sheet1' 
              ? 'border-b-0 text-blue-600 bg-white' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('sheet1')}
        >
          Info Curah Hujan
        </button>
        <button
          className={`px-3 py-2 font-medium text-xs border border-gray-300 transition-colors ${
            activeTab === 'sheet2' 
              ? 'border-b-0 text-blue-600 bg-white' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('sheet2')}
        >
          Info Keleregan
        </button>
        <button
          className={`px-3 py-2 font-medium text-xs border border-gray-300 transition-colors ${
            activeTab === 'sheet3' 
              ? 'border-b-0 text-blue-600 bg-white' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('sheet3')}
        >
          Info Kawasan Hutan
        </button>
      </div>

      {/* Content Area */}
      <div className="p-3 flex-1 flex flex-col overflow-hidden">
        {activeTab === 'sheet1' ? (
          // Chart Content - Different heights for different contexts
          <div className="flex-1 min-h-0" style={{ 
            height: isInMockup ? '100%' : '350px',
            minHeight: isInMockup ? '300px' : '350px'
          }}>
            <Line data={rainfallData} options={chartOptions} />
          </div>
        ) : (
          // Table Content
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
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Header 1</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Header 2</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Header 3</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Header 4</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Header 5</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{row.col1}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{row.col2}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{row.col3}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{row.col4}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{row.col5}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-xs text-gray-500">
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
        )}
      </div>

      {/* Filter Info */}
      {filterData && (
        <div className="px-3 py-2 bg-blue-50 border-t border-blue-200 text-xs text-blue-700">
          <span className="font-medium">Filter:</span> {filterData.category} - {filterData.disasterType}
        </div>
      )}
    </div>
  );
};

export default ChartTabsComponent;