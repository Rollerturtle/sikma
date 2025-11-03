// src/components/ShpManagement.tsx - Placeholder Version (Table Only)
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../api';
import './shpmanagement.css';

interface TableInfo {
  nama_table: string;
  ukuran: string;
  jumlah_row: number;
  tahun_tersedia: number[];
}

interface ShpManagementProps {
  onViewChange: (showMap: boolean) => void;
  onFilterChange: (filterData: any) => void;
}

export default function ShpManagement({ onViewChange, onFilterChange }: ShpManagementProps) {
  const [activeLayer, setActiveLayer] = useState<{table: string, year: number} | null>(null);
  const [draggedYear, setDraggedYear] = useState<{table: string, year: number} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{table: string, year: number} | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // // Dummy data untuk tabel
  // const [tables, setTables] = useState<TableInfo[]>([
  //   {
  //     nama_table: 'batas_provinsi',
  //     ukuran: '2.4 MB',
  //     jumlah_row: 38,
  //     tahun_tersedia: [2024, 2025]
  //   },
  //   {
  //     nama_table: 'das_jateng',
  //     ukuran: '5.1 MB',
  //     jumlah_row: 125,
  //     tahun_tersedia: [2024, 2025]
  //   },
  //   {
  //     nama_table: 'kecamatan_banyumas',
  //     ukuran: '1.8 MB',
  //     jumlah_row: 27,
  //     tahun_tersedia: [2024, 2025]
  //   },
  //   {
  //     nama_table: 'kabupaten_jateng',
  //     ukuran: '3.2 MB',
  //     jumlah_row: 35,
  //     tahun_tersedia: [2024, 2025]
  //   },
  //   {
  //     nama_table: 'areal_karhutla_2024',
  //     ukuran: '7.6 MB',
  //     jumlah_row: 452,
  //     tahun_tersedia: [2024, 2025]
  //   },
  //   {
  //     nama_table: 'lahan_kritis',
  //     ukuran: '4.3 MB',
  //     jumlah_row: 234,
  //     tahun_tersedia: [2024, 2025]
  //   }
  // ]);

  // Fetch data tabel dari server saat component mount
  useEffect(() => {
    fetchTablesInfo();
  }, []);

  // Reset page to 1 when tables data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tables.length]);

  const fetchTablesInfo = async () => {
    try {

      setLoading(true);
      const response = await fetch(`${API_URL}/api/tables-info`);

      if (!response.ok) {
        throw new Error('Failed to fetch tables information');
      }

      const data = await response.json();
      setTables(data);

    } catch (err) {
      console.error('Error fetching tables info:', err);
      // Jika gagal, gunakan data kosong
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle layer visibility (placeholder - tidak benar-benar menampilkan di map)
  const handleYearClick = (tableName: string, year: number) => {
    if (activeLayer?.table === tableName && activeLayer?.year === year) {
      // Hide layer
      setActiveLayer(null);
      onFilterChange(null);
      console.log('[PLACEHOLDER] Layer disembunyikan:', tableName, year);
    } else {
      // Show layer
      setActiveLayer({ table: tableName, year });
      const filterData = {
        category: 'ShpManagement',  // Category untuk identify source
        selectedValue: tableName,    // Nama tabel
        locationType: 'ShpLayer',    // Custom type
        shpYear: year,               // Tahun yang dipilih
        layers: [
          {
            type: 'shp',                                    // Type layer
            endpoint: `/api/shp-layers/${tableName}/year/${year}`, // API endpoint
            filter: {},                                     // No additional filters
            tableName: tableName,                           // Nama tabel
            layerName: `${tableName} (${year})`            // Display name
          }
        ]
      };
      console.log('🗺️ Layer shown, sending filterData:', filterData);
      onFilterChange(filterData);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, tableName: string, year: number) => {
    setDraggedYear({ table: tableName, year });
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedYear) {
      setDeleteTarget(draggedYear);
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = async () => {
  if (!deleteTarget) return;

  try {
    const response = await fetch(
      `${API_URL}/api/shp-layers/${deleteTarget.table}/year/${deleteTarget.year}`,
      {
        method: 'DELETE'
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete layer data');
    }
    
    const result = await response.json();
    console.log('✅ Delete result:', result);

    // Refresh data tabel dari server
    await fetchTablesInfo();

    // Hide layer jika yang aktif dihapus
    if (activeLayer?.table === deleteTarget.table && activeLayer?.year === deleteTarget.year) {
      setActiveLayer(null);
      onFilterChange(null);
    }

    // ✅ PERUBAHAN: Check jika table di-drop atau hanya rows dihapus

    if (result.action === 'table_dropped') {
      console.log('🗑️ Table was dropped completely');
      alert(`✅ Tabel '${deleteTarget.table}' dihapus karena tahun ${deleteTarget.year} adalah tahun terakhir!`);
    } else {
      console.log('🗑️ Only rows deleted, table still exists');
      alert(`✅ Berhasil menghapus ${result.deletedCount} rows dari ${deleteTarget.table} tahun ${deleteTarget.year}! (${result.remainingYears} tahun tersisa)`);
    }
    
  } catch (error) {
    console.error('Error deleting data:', error);
    alert(`❌ Gagal menghapus data: ${error.message}`);
  } finally {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    setDraggedYear(null);
  }
};

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    setDraggedYear(null);
  };

  // Pagination calculations
  const filteredTables = tables.filter(table => table.tahun_tersedia.length > 0);
  const totalPages = Math.ceil(filteredTables.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTables = filteredTables.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="shp-management-container">
        <div className="files-table-wrapper">
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div>Memuat data tabel...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shp-management-container">
      {/* Files Table */}
      <div className="files-table-wrapper">
        <table className="files-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>No</th>
              <th style={{ width: '30%' }}>Nama Table</th>
              <th style={{ width: '15%' }}>Ukuran</th>
              <th style={{ width: '15%' }}>Jumlah Row Data</th>
              <th style={{ width: '30%' }}>Tahun</th>
              <th 
                style={{ width: '5%' }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="delete-zone" title="Drag tahun ke sini untuk menghapus">
                  🗑️
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentTables.length > 0 ? (
              currentTables.map((table, index) => (
                <tr key={table.nama_table}>
                  <td>{startIndex + index + 1}</td>
                  <td>
                    <div className="file-name-cell">
                      <span className="file-icon">🗺️</span>
                      <span className="file-name">{table.nama_table}</span>
                    </div>
                  </td>
                  <td>{table.ukuran}</td>
                  <td>{table.jumlah_row} rows</td>
                  <td>
                    <div className="year-buttons">
                      {table.tahun_tersedia.map(year => (
                        <button
                          key={year}
                          className={`year-btn ${
                            activeLayer?.table === table.nama_table && activeLayer?.year === year
                              ? 'active'
                              : ''
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, table.nama_table, year)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleYearClick(table.nama_table, year)}
                          title={`Klik untuk toggle layer, drag ke 🗑️ untuk hapus`}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty-state">
                  <div className="empty-icon">📂</div>
                  <div>Tidak ada tabel tersedia</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredTables.length > 0 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredTables.length)} dari {filteredTables.length} tabel
          </div>

          <div className="pagination-controls">
            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹ Prev
            </button>

            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
              ) : (
                <button
                  key={page}
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page as number)}
                >
                  {page}
                </button>
              )
            ))}

            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next ›
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="modal-overlay">
          <div className="shpmanagement-modal-content">
            <h3 className="modal-title">Konfirmasi Hapus</h3>
            <p className="modal-message">
              Apakah Anda yakin ingin menghapus data <strong>{deleteTarget.table}</strong> tahun <strong>{deleteTarget.year}</strong>?
            </p>
            <p className="modal-warning">Data yang dihapus tidak dapat dikembalikan!</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={cancelDelete}>
                Batal
              </button>
              <button className="modal-btn confirm" onClick={confirmDelete}>
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Layer Indicator */}
      {activeLayer && (
        <div className="active-layer-indicator">
          <span className="indicator-icon">🗺️</span>
          <span className="indicator-text">
            Layer Aktif: {activeLayer.table} ({activeLayer.year})
          </span>
          <button 
            className="indicator-close"
            onClick={() => {
              setActiveLayer(null);
              onFilterChange(null);
            }}
            title="Sembunyikan layer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}