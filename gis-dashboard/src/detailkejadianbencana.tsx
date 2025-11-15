import React, { useState, useRef } from 'react';
import { MapPin, Heart } from 'lucide-react';

export default function DetailKejadianBencana() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const overviewRef = useRef(null);
  const galleryRef = useRef(null);
  const locationRef = useRef(null);

  const scrollToSection = (ref, tabName) => {
    setActiveTab(tabName);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Title Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            {/* Tags above title */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-red-500 bg-red-50 px-3 py-1 rounded-full">Kebakaran Hutan dan Keseringan</span>
            <span className="text-sm text-red-500 bg-red-50 px-3 py-1 rounded-full">Riau</span>
          </div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-normal text-gray-800 mb-2">
                Kebakaran Hutan terjadi di Riau sejak awal tahun ini.
              </h1>
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <MapPin className="w-4 h-4" />
                <span>Kampar, Riau</span>
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

          {/* Main Image */}
          <div className="relative rounded-lg overflow-hidden mb-6">
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='960' height='400'%3E%3Crect fill='%234a9d5f' width='960' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='18' fill='white'%3EForest Fire Scene - 22 Mei 2025 14:28:19%3C/text%3E%3C/svg%3E"
              alt="Forest fire scene"
              className="w-full h-96 object-cover"
            />
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded text-sm">
              22 Mei 2025 14:28:19
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-8 border-b border-gray-200 mb-6">
            <button
              onClick={() => scrollToSection(overviewRef, 'overview')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-red-500 border-b-2 border-red-500'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection(galleryRef, 'gallery')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'gallery'
                  ? 'text-red-500 border-b-2 border-red-500'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Gallery
            </button>
            <button
              onClick={() => scrollToSection(locationRef, 'location')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'location'
                  ? 'text-red-500 border-b-2 border-red-500'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Location
            </button>
          </div>

          {/* Main Grid Layout - Left Content + Right Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Overview, Gallery, Location */}
            <div className="lg:col-span-2">
              {/* Overview Section */}
              <div ref={overviewRef} className="mb-8 scroll-mt-4">
                <p className="text-gray-700 leading-relaxed mb-6">
                  Kebakaran hutan dan lahan (karhutla) di Provinsi Riau masih terjadi, dengan total luas lahan terbakar sejak awal tahun 
                  hingga 21 Mei 2025 mencapai sekitar 106,08 hektar. Dalam perkembangan terakhir, terdapat penambahan area 
                  terbakar seluas 11 hektar. Seluruh satugas gabungan baik darat hingga udara terus mengupayakan pemadaman.
                </p>

                {/* Categories */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Categories</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Kebakaran Hutan dan Keseringan</span>
                  </div>
                </div>

                {/* Regions */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Regions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Riau</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Serayu</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gallery Section */}
              <div ref={galleryRef} className="mb-8 scroll-mt-4">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Gallery</h3>
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='960' height='400'%3E%3Crect fill='%234a9d5f' width='960' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='18' fill='white'%3EForest Area - 22 Mei 2025 14:28:19%3C/text%3E%3C/svg%3E"
                    alt="Forest area thumbnail"
                    className="w-full h-80 object-cover"
                  />
                </div>
              </div>

              {/* Location Section */}
              <div ref={locationRef} className="scroll-mt-4">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Location</h3>
                <div className="bg-gray-100 rounded-lg overflow-hidden h-96 relative">
                  <img
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='960' height='384'%3E%3Crect fill='%23e8f4ea' width='960' height='384'/%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23666'%3EMap of Riau Province%3C/text%3E%3Ccircle cx='480' cy='220' r='20' fill='%23ef4444' opacity='0.6'/%3E%3Ccircle cx='480' cy='220' r='12' fill='%23ef4444'/%3E%3Ctext x='50%25' y='65%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12' fill='%23666'%3EKampar, Riau%3C/text%3E%3C/svg%3E"
                    alt="Location map"
                    className="w-full h-full object-cover"
                  />
                  <button className="absolute top-4 left-4 bg-white px-4 py-2 rounded shadow-md text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors">
                    <MapPin className="w-4 h-4" />
                    Get Directions
                  </button>
                  <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded shadow-md text-xs text-gray-600">
                    Leaflet | © OpenStreetMap contributors
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Informasi Kondisi Lokasi */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Informasi Kondisi Lokasi</h3>
                
                {/* Data Curah Hujan */}
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

                {/* Data Tutupan Lahan */}
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

                {/* Data Lahan Kritis */}
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
    </div>
  );
}