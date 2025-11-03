// src/pages/ActivityDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentMapIndex, setCurrentMapIndex] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/kegiatan-mitigasi/${id}`);
        if (!res.ok) {
          throw new Error('Gagal memuat data');
        }
        const data = await res.json();
        
        // ✅ Parse JSON strings untuk dokumen_terkait dan foto_dokumentasi
        const parsedActivity = {
          ...data,
          dokumen_terkait: data.dokumen_terkait 
            ? (typeof data.dokumen_terkait === 'string' 
                ? JSON.parse(data.dokumen_terkait) 
                : data.dokumen_terkait)
            : [],
          foto_dokumentasi: data.foto_dokumentasi
            ? (typeof data.foto_dokumentasi === 'string'
                ? JSON.parse(data.foto_dokumentasi)
                : data.foto_dokumentasi)
            : []
        };
        
        setActivity(parsedActivity);
      } catch (err) {
        console.error('Gagal memuat detail kegiatan:', err);
        alert('Gagal memuat data kegiatan.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchActivity();
  }, [id]);

  const handlePrevMap = () => {
    setCurrentMapIndex((prev) => (prev === 0 ? 2 : prev - 1));
  };

  const handleNextMap = () => {
    setCurrentMapIndex((prev) => (prev === 2 ? 0 : prev + 1));
  };

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
    setIsPhotoModalOpen(true);
  };

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? activity.foto_dokumentasi.length - 1 : prev - 1));
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === activity.foto_dokumentasi.length - 1 ? 0 : prev + 1));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-red-600">Kegiatan tidak ditemukan</h2>
        <button onClick={() => navigate(-1)} className="mt-4 bg-gray-600 text-white px-4 py-2 rounded">
          Kembali
        </button>
      </div>
    );
  }

  const petaMaps = [
    { label: 'Peta Kondisi Awal', url: activity.peta_awal },
    { label: 'Peta Setelah Mitigasi', url: activity.peta_setelah },
    { label: 'Peta Kerentanan', url: activity.peta_kerentanan }
  ];

  const visiblePhotos = activity.foto_dokumentasi ? activity.foto_dokumentasi.slice(0, 4) : [];
  const remainingPhotosCount = activity.foto_dokumentasi ? activity.foto_dokumentasi.length - 4 : 0;

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Detail Kegiatan Mitigasi dan Adaptasi
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali
        </button>
      </div>

      {/* Map and Photos Container */}
      <div className="flex gap-4 mb-6">
        {/* Map Section */}
        <div className="flex-[2] relative">
          <div className="relative rounded-lg shadow-md overflow-hidden">
            <img
              src={`http://localhost:3001${petaMaps[currentMapIndex].url}`}
              alt={petaMaps[currentMapIndex].label}
              className="w-full h-[650px] object-cover"
            />
            
            {/* Map Navigation Buttons */}
            <button
              onClick={handlePrevMap}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl z-10 hover:bg-black/70"
            >
              ‹
            </button>
            <button
              onClick={handleNextMap}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl z-10 hover:bg-black/70"
            >
              ›
            </button>

            {/* Map Label */}
            <div className="absolute bottom-3 left-3 bg-white/95 px-3 py-2 rounded-md text-sm font-semibold">
              {petaMaps[currentMapIndex].label}
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-2 gap-2 flex-1 ml-auto" style={{ gridTemplateColumns: 'repeat(2, 325px)' }}>
          {visiblePhotos.map((photo: string, idx: number) => (
            <div
              key={idx}
              className="relative w-[325px] h-[325px] overflow-hidden rounded shadow-sm cursor-pointer"
              onClick={() => handlePhotoClick(idx)}
            >
              <img
                src={`http://localhost:3001${photo}`}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover transition-transform hover:scale-110"
              />
              {idx === 3 && remainingPhotosCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-5xl font-semibold">
                  +{remainingPhotosCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Metode */}
      <div className="mb-4 p-6 bg-white rounded-lg border shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 pb-2">Metode</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-justify">{activity.metode || '-'}</p>
      </div>

      {/* Analisis */}
      <div className="mb-4 p-6 bg-white rounded-lg border shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 pb-2">Analisis</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-justify">{activity.analisis || '-'}</p>
      </div>

      {/* Monev */}
      <div className="mb-4 p-6 bg-white rounded-lg border shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 pb-2">Monev (Anggaran)</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-justify">{activity.monev || '-'}</p>
      </div>

      {/* Dokumen Terkait */}
      <div className="mb-4 p-6 bg-white rounded-lg border shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 pb-2">Dokumen Terkait</h2>
        {activity.dokumen_terkait && activity.dokumen_terkait.length > 0 ? (
          <ul className="space-y-2">
            {activity.dokumen_terkait.map((url: string, idx: number) => (
              <li key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <a href={`http://localhost:3001${url}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-600 font-medium hover:underline">
                  {url.split('/').pop()}
                </a>
                <span className="text-xs text-gray-500">Dokumen {idx + 1}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Tidak ada dokumen.</p>
        )}
      </div>

      {/* Footer Info */}
       <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-900">
        <p><strong>Dibuat pada:</strong> {new Date(activity.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <p className="mt-1"><strong>Terakhir diubah:</strong> {new Date(activity.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {/* Photo Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={() => setIsPhotoModalOpen(false)}>
          <div className="relative max-w-[80vw] max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsPhotoModalOpen(false)} className="absolute -top-12 right-0 text-white text-3xl font-bold">✕</button>
            
            <img
              src={`http://localhost:3001${activity.foto_dokumentasi[currentPhotoIndex]}`}
              alt={`Foto ${currentPhotoIndex + 1}`}
              className="max-w-[600px] max-h-[400px] w-full h-full object-contain rounded-lg"
            />

            <button onClick={handlePrevPhoto} className="absolute -left-16 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl">‹</button>
            <button onClick={handleNextPhoto} className="absolute -right-16 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl">›</button>

            <div className="flex gap-2 mt-4 overflow-x-auto py-2">
              {activity.foto_dokumentasi.map((photo: string, idx: number) => (
                <img
                  key={idx}
                  src={`http://localhost:3001${photo}`}
                  alt={`Thumbnail ${idx + 1}`}
                  onClick={() => setCurrentPhotoIndex(idx)}
                  className={`w-20 h-20 object-cover rounded cursor-pointer ${idx === currentPhotoIndex ? 'border-2 border-blue-500 opacity-100' : 'border-2 border-transparent opacity-60'}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityDetailPage;