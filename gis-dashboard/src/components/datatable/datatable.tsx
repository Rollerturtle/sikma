// src/components/datatable/DataTable.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityModal from './activitymodal';
import SearchableDropdown from './searchabledropdown';
import { API_URL } from '../../api';

interface RowData {
  id: number;
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  das: string;
  sub_das: string;
  banjir: string;
  longsor: string;
  kebakaran_hutan: string;
  kerawanan: string;
  has_kegiatan?: boolean;
  kegiatan_id?: number;
}

const DataTable: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<RowData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(5);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [inputPage, setInputPage] = useState<string>('');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRekomendasiId, setSelectedRekomendasiId] = useState<number | null>(null);
  const [existingActivity, setExistingActivity] = useState<any>(null);
  
  // State untuk menyimpan perubahan sementara selama edit
  const [editingData, setEditingData] = useState<Record<number, Partial<RowData>>>({});

  // State untuk opsi dropdown
  const [provinces, setProvinces] = useState<string[]>([]);
  const [kabupaten, setKabupaten] = useState<string[]>([]);
  const [kecamatan, setKecamatan] = useState<string[]>([]);
  const [das, setDas] = useState<string[]>([]);

  // Fetch rekomendasi data on mount
  const fetchRekomendasi = async () => {
    try {
      const res = await fetch('${API_URL}/api/rekomendasi');
      if (!res.ok) {  // ✅ Tambahkan pengecekan response
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const result = await res.json();
      if (Array.isArray(result)) {
        setData(result);
      } else {
        console.error('Response bukan array:', result);
        setData([]);  // Set empty array jika bukan array
      }
    } catch (err) {
      console.error('Gagal memuat rekomendasi:', err);
      setData([]);  // ✅ Set empty array saat error
    }
  };

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const provincesResponse = await fetch('${API_URL}/api/filter/provinces');
        const provincesData = await provincesResponse.json();
        const provinceNames = provincesData
          .map((p: any) => p.provinsi)
          .filter((name: any) => name && typeof name === 'string');
        setProvinces(provinceNames);

        const kabupatenResponse = await fetch('${API_URL}/api/filter/kabupaten');
        const kabupatenData = await kabupatenResponse.json();
        const kabupatenNames = kabupatenData
          .map((k: any) => k.kab_kota)
          .filter((name: any) => name && typeof name === 'string');
        setKabupaten(kabupatenNames);

        const kecamatanResponse = await fetch('${API_URL}/api/filter/kecamatan');
        const kecamatanData = await kecamatanResponse.json();
        const kecamatanNames = kecamatanData
          .map((k: any) => k.kecamatan)
          .filter((name: any) => name && typeof name === 'string');
        setKecamatan(kecamatanNames);

        const dasResponse = await fetch('${API_URL}/api/filter/das');
        const dasData = await dasResponse.json();
        const dasNames = dasData
          .map((d: any) => d.nama_das)
          .filter((name: any) => name && typeof name === 'string');
        setDas(dasNames);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    fetchRekomendasi();
    loadFilterOptions();
  }, []);

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = Array.isArray(data) ? data.slice(indexOfFirstRow, indexOfLastRow) : [];
  const totalPages = Math.ceil((data?.length || 0) / rowsPerPage);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      setInputPage('');
    }
  };

  const handleInputPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputPage(value);
    if (e.key === 'Enter') {
      const pageNum = parseInt(value);
      if (!isNaN(pageNum)) {
        handlePageChange(pageNum);
      }
    }
  };

  const addRow = () => {
    const newRow: RowData = {
      id: 0,
      provinsi: "",
      kabupaten: "",
      kecamatan: "",
      das: "",
      sub_das: "belum tersedia",
      banjir: "Tidak",
      longsor: "Tidak",
      kebakaran_hutan: "Tidak",
      kerawanan: "Rendah",
      has_kegiatan: false
    };
    setData([newRow, ...data]);
    setEditingRow(newRow.id);
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("Hapus rekomendasi ini?")) return;
    try {
      await fetch(`${API_URL}/api/rekomendasi/${id}`, { method: 'DELETE' });
      setData(data.filter(row => row.id !== id));
    } catch (err) {
      alert('Gagal menghapus rekomendasi');
    }
  };

  const editRow = (id: number) => {
    setEditingRow(id);
  };

  const saveRow = async (id: number) => {
    const originalRow = data.find(r => r.id === id);
    if (!originalRow) return;

    const edited = editingData[id] || {};

    const payload = {
      provinsi: edited.provinsi ?? originalRow.provinsi,
      kabupaten: edited.kabupaten ?? originalRow.kabupaten,
      kecamatan: edited.kecamatan ?? originalRow.kecamatan,
      das: edited.das ?? originalRow.das,
      sub_das: "belum tersedia",
      banjir: edited.banjir ?? originalRow.banjir,
      longsor: edited.longsor ?? originalRow.longsor,
      kebakaran_hutan: edited.kebakaran_hutan ?? originalRow.kebakaran_hutan,
      kerawanan: edited.kerawanan ?? originalRow.kerawanan,
    };

    try {
      let response;
      if (id <= 0) {
        response = await fetch('${API_URL}/api/rekomendasi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const newRec = await response.json();
        setData(data.map(r => r.id === id ? { ...newRec, has_kegiatan: false } : r));
      } else {
        response = await fetch(`${API_URL}/api/rekomendasi/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        await fetchRekomendasi();
      }
      setEditingData(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      setEditingRow(null);
    } catch (err) {
      alert('Gagal menyimpan rekomendasi');
    }
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditingData({});
    setData(data.filter(row => row.id !== 0));
  };

  // Activity handlers
  const handleCreateKegiatan = (rekomendasiId: number) => {
    setModalMode('create');
    setSelectedRekomendasiId(rekomendasiId);
    setExistingActivity(null);
    setShowActivityModal(true);
  };

  const handleEditKegiatan = async (rekomendasiId: number, kegiatanId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/kegiatan-mitigasi/${kegiatanId}`);
      if (!response.ok) {
        throw new Error('Gagal memuat data kegiatan');
      }
      const data = await response.json();
      setModalMode('edit');
      setSelectedRekomendasiId(rekomendasiId);
      setExistingActivity(data);
      setShowActivityModal(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Gagal memuat data kegiatan');
    }
  };

  const handleViewKegiatan = (kegiatanId: number) => {
    navigate(`/activity/detail/${kegiatanId}`);
  };

  const handleDeleteKegiatan = async (kegiatanId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/kegiatan-mitigasi/${kegiatanId}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) {
        throw new Error('Gagal menghapus kegiatan');
      }
      
      alert('Kegiatan berhasil dihapus');
      await fetchRekomendasi();
    } catch (error) {
      console.error('Error:', error);
      alert('Gagal menghapus kegiatan');
    }
  };

  const handleActivitySaved = async () => {
    await fetchRekomendasi();
    setShowActivityModal(false);
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Data Rekomendasi Mitigasi dan Adaptasi</h2>
        <button 
          onClick={addRow}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          Tambah Baris
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">No</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">Provinsi</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">Kabupaten/Kota</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">Kecamatan</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">DAS</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">Sub DAS</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">Banjir</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">Longsor</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">Kebakaran Hutan</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">Kerawanan</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">Kegiatan</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, index) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {indexOfFirstRow + index + 1}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {editingRow === row.id ? (
                    <SearchableDropdown
                      options={provinces}
                      value={editingData[row.id]?.provinsi ?? row.provinsi}
                      onChange={(val) => setEditingData(prev => ({
                        ...prev,
                        [row.id]: { ...prev[row.id], provinsi: val }
                      }))}
                      placeholder="Pilih Provinsi"
                    />
                  ) : (
                    row.provinsi
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {editingRow === row.id ? (
                    <SearchableDropdown
                      options={kabupaten}
                      value={editingData[row.id]?.kabupaten ?? row.kabupaten}
                      onChange={(val) => setEditingData(prev => ({
                        ...prev,
                        [row.id]: { ...prev[row.id], kabupaten: val }
                      }))}
                      placeholder="Pilih Kabupaten"
                    />
                  ) : (
                    row.kabupaten
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {editingRow === row.id ? (
                    <SearchableDropdown
                      options={kecamatan}
                      value={editingData[row.id]?.kecamatan ?? row.kecamatan}
                      onChange={(val) => setEditingData(prev => ({
                        ...prev,
                        [row.id]: { ...prev[row.id], kecamatan: val }
                      }))}
                      placeholder="Pilih Kecamatan"
                    />
                  ) : (
                    row.kecamatan
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {editingRow === row.id ? (
                    <SearchableDropdown
                      options={das}
                      value={editingData[row.id]?.das ?? row.das}
                      onChange={(val) => setEditingData(prev => ({
                        ...prev,
                        [row.id]: { ...prev[row.id], das: val }
                      }))}
                      placeholder="Pilih DAS"
                    />
                  ) : (
                    row.das
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {"belum tersedia"}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {editingRow === row.id ? (
                    <select 
                      value={editingData[row.id]?.banjir ?? row.banjir}
                      onChange={(e) => setEditingData(prev => ({
                        ...prev,
                        [row.id]: { ...prev[row.id], banjir: e.target.value }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="Ya">Ya</option>
                      <option value="Tidak">Tidak</option>
                    </select>
                  ) : (
                    row.banjir
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {editingRow === row.id ? (
                    <select 
                      value={editingData[row.id]?.longsor ?? row.longsor}
                      onChange={(e) => setEditingData(prev => ({
                        ...prev,
                        [row.id]: { ...prev[row.id], longsor: e.target.value }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="Ya">Ya</option>
                      <option value="Tidak">Tidak</option>
                    </select>
                  ) : (
                    row.longsor
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {editingRow === row.id ? (
                    <select 
                      value={editingData[row.id]?.kebakaran_hutan ?? row.kebakaran_hutan}
                      onChange={(e) => setEditingData(prev => ({
                        ...prev,
                        [row.id]: { ...prev[row.id], kebakaran_hutan: e.target.value }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="Ya">Ya</option>
                      <option value="Tidak">Tidak</option>
                    </select>
                  ) : (
                    row.kebakaran_hutan
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {editingRow === row.id ? (
                    <select 
                      value={editingData[row.id]?.kerawanan ?? row.kerawanan}
                      onChange={(e) => setEditingData(prev => ({
                        ...prev,
                        [row.id]: { ...prev[row.id], kerawanan: e.target.value }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="Rendah">Rendah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Tinggi">Tinggi</option>
                    </select>
                  ) : (
                    row.kerawanan
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {row.has_kegiatan ? (
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => handleViewKegiatan(row.kegiatan_id!)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                      >
                        Lihat
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleCreateKegiatan(row.id)}
                      disabled={editingRow === row.id}
                      className={`px-2 py-1 rounded text-xs ${
                        editingRow === row.id 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'  // ✅ Style disabled
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      Buat Kegiatan
                    </button>
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                  {editingRow === row.id ? (
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => saveRow(row.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                      >
                        Simpan
                      </button>
                      <button 
                        onClick={cancelEdit}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => editRow(row.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteRow(row.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                      >
                        Hapus
                      </button>
                      {row.has_kegiatan && (
                        <>
                          <button 
                            onClick={() => handleEditKegiatan(row.id, row.kegiatan_id!)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs"
                          >
                            Ubah Kegiatan
                          </button>
                          <button 
                            onClick={() => handleDeleteKegiatan(row.kegiatan_id!)}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                          >
                            Hapus Kegiatan
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Menampilkan {(currentPage - 1) * rowsPerPage + 1} - 
          {Math.min(currentPage * rowsPerPage, data.length)} dari {data.length} baris
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-2 py-1 rounded text-sm ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
          >
            &lt;
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Halaman</span>
            <input
              type="text"
              value={inputPage}
              onChange={handleInputPageChange}
              onKeyDown={handleInputPageChange}
              placeholder={currentPage.toString()}
              className="w-10 px-2 py-1 border border-gray-300 rounded text-sm text-center"
            />
            <span className="text-sm text-gray-700">dari {totalPages}</span>
          </div>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-2 py-1 rounded text-sm ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
          >
            &gt;
          </button>
        </div>
      </div>

      {/* Activity Modal */}
      {showActivityModal && (
        <ActivityModal
          isOpen={showActivityModal}
          onClose={() => setShowActivityModal(false)}
          mode={modalMode}
          rowId={selectedRekomendasiId}
          existingActivity={existingActivity}
          onActivitySaved={handleActivitySaved}
        />
      )}
    </div>
  );
};

export default DataTable;