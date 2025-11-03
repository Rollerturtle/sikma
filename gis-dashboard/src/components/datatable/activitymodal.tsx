// src/components/datatable/ActivityModal.tsx
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../api';
interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  rowId: number | null;
  existingActivity?: any;
  onActivitySaved: (activity: any) => void;
}

const ActivityModal: React.FC<ActivityModalProps> = ({ 
  isOpen, 
  onClose, 
  mode, 
  rowId, 
  existingActivity,
  onActivitySaved 
}) => {
  const [formData, setFormData] = useState({
    metode: '',
    analisis: '',
    monev: '',
    dokumen_terkait: [] as File[],
    foto_dokumentasi: [] as File[],
    peta_awal: null as File | null,
    peta_setelah: null as File | null,
    peta_kerentanan: null as File | null
  });

  useEffect(() => {
    if (mode === 'edit' && existingActivity) {
      setFormData({
        metode: existingActivity.metode || '',
        analisis: existingActivity.analisis || '',
        monev: existingActivity.monev || '',
        dokumen_terkait: [],
        foto_dokumentasi: [],
        peta_awal: null,
        peta_setelah: null,
        peta_kerentanan: null
      });
    } else {
      setFormData({
        metode: '',
        analisis: '',
        monev: '',
        dokumen_terkait: [],
        foto_dokumentasi: [],
        peta_awal: null,
        peta_setelah: null,
        peta_kerentanan: null
      });
    }
  }, [mode, existingActivity, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof formData) => {
    const files = Array.from(e.target.files || []);
    
    if (field === 'dokumen_terkait') {
      if (files.length > 5) {
        alert('Maksimal hanya 5 dokumen yang dapat diunggah.');
        return;
      }
      setFormData(prev => ({ ...prev, dokumen_terkait: files }));
    } else if (field === 'foto_dokumentasi') {
      const limitedFiles = files.slice(0, 5);
      setFormData(prev => ({ ...prev, foto_dokumentasi: limitedFiles }));
    } else {
      setFormData(prev => ({ ...prev, [field]: files[0] || null }));
    }
  };

  const removeFile = (field: keyof typeof formData, index?: number) => {
    if (field === 'dokumen_terkait' && index !== undefined) {
      setFormData(prev => {
        const updated = [...prev.dokumen_terkait];
        updated.splice(index, 1);
        return { ...prev, dokumen_terkait: updated };
      });
    } else if (field === 'foto_dokumentasi' && index !== undefined) {
      setFormData(prev => {
        const updated = [...prev.foto_dokumentasi];
        updated.splice(index, 1);
        return { ...prev, foto_dokumentasi: updated };
      });
    } else {
      setFormData(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    formDataToSend.append('rekomendasi_id', String(rowId));
    formDataToSend.append('metode', formData.metode);
    formDataToSend.append('analisis', formData.analisis);
    formDataToSend.append('monev', formData.monev);
    
    formData.dokumen_terkait.forEach(file => formDataToSend.append('dokumen_terkait', file));
    formData.foto_dokumentasi.forEach(file => formDataToSend.append('foto_dokumentasi', file));
    if (formData.peta_awal) formDataToSend.append('peta_awal', formData.peta_awal);
    if (formData.peta_setelah) formDataToSend.append('peta_setelah', formData.peta_setelah);
    if (formData.peta_kerentanan) formDataToSend.append('peta_kerentanan', formData.peta_kerentanan);

    try {
      let response;
      if (mode === 'create') {
        response = await fetch(`${API_URL}/api/kegiatan-mitigasi`, {
          method: 'POST',
          body: formDataToSend
        });
      } else {
        const kegiatanId = existingActivity?.id;
        response = await fetch(`${API_URL}/api/kegiatan-mitigasi/${kegiatanId}`, {
          method: 'PUT',
          body: formDataToSend
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json(); 
        throw new Error(errorData.error || 'Gagal menyimpan kegiatan');
      }
      
      const savedActivity = await response.json();
      onActivitySaved(savedActivity);
      onClose();
    } catch (err) {
      console.error('Error saving kegiatan:', err);
      alert(err instanceof Error ? err.message : 'Gagal menyimpan kegiatan');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {mode === 'create' ? 'Buat Kegiatan Mitigasi dan Adaptasi' : 'Ubah Kegiatan Mitigasi dan Adaptasi'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Metode */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Metode</h3>
              <textarea
                value={formData.metode}
                onChange={(e) => setFormData(prev => ({ ...prev, metode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                rows={4}
                placeholder="Masukkan metode mitigasi dan adaptasi..."
                required
              />
            </div>

            {/* Analisis */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Analisis</h3>
              <textarea
                value={formData.analisis}
                onChange={(e) => setFormData(prev => ({ ...prev, analisis: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                rows={6}
                placeholder="Masukkan analisis mendalam..."
                required
              />
            </div>

            {/* Monev */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Monev</h3>
              <textarea
                value={formData.monev}
                onChange={(e) => setFormData(prev => ({ ...prev, monev: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                rows={3}
                placeholder="Masukkan anggaran yang dibutuhkan..."
                required
              />
            </div>

            {/* Dokumen Terkait */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Dokumen Terkait</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unggah dokumen (maksimal 5 file):
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(e) => handleFileChange(e, 'dokumen_terkait')}
                  className="w-full text-sm text-gray-500"
                />
                {formData.dokumen_terkait.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {formData.dokumen_terkait.map((file, idx) => (
                      <li key={idx} className="flex items-center justify-between text-sm bg-gray-100 px-2 py-1 rounded">
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile('dokumen_terkait', idx)}
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Foto Dokumentasi */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Foto Dokumentasi Kegiatan</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unggah foto (maksimal 5):
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'foto_dokumentasi')}
                  className="w-full text-sm text-gray-500"
                />
                {formData.foto_dokumentasi.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {formData.foto_dokumentasi.map((file, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-16 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile('foto_dokumentasi', idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Peta */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Peta</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peta Kondisi Awal:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'peta_awal')}
                    className="w-full text-sm text-gray-500"
                  />
                  {formData.peta_awal && (
                    <div className="mt-2 flex items-center">
                      <img
                        src={URL.createObjectURL(formData.peta_awal)}
                        alt="Peta Awal"
                        className="w-16 h-16 object-cover rounded border mr-2"
                      />
                      <span className="text-sm">{formData.peta_awal.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile('peta_awal')}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peta Setelah Mitigasi:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'peta_setelah')}
                    className="w-full text-sm text-gray-500"
                  />
                  {formData.peta_setelah && (
                    <div className="mt-2 flex items-center">
                      <img
                        src={URL.createObjectURL(formData.peta_setelah)}
                        alt="Peta Setelah"
                        className="w-16 h-16 object-cover rounded border mr-2"
                      />
                      <span className="text-sm">{formData.peta_setelah.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile('peta_setelah')}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peta Kerentanan:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'peta_kerentanan')}
                    className="w-full text-sm text-gray-500"
                  />
                  {formData.peta_kerentanan && (
                    <div className="mt-2 flex items-center">
                      <img
                        src={URL.createObjectURL(formData.peta_kerentanan)}
                        alt="Peta Kerentanan"
                        className="w-16 h-16 object-cover rounded border mr-2"
                      />
                      <span className="text-sm">{formData.peta_kerentanan.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile('peta_kerentanan')}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium"
              >
                {mode === 'create' ? 'Simpan Kegiatan' : 'Perbarui Kegiatan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;