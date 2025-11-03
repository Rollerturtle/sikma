// src/components/FileManager/FileManager.tsx
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../api';
import './fileManager.css';

interface FileItem {
  id: string; // Nama file internal (misalnya, nama file yang disimpan di server)
  name: string; // Nama file asli saat diupload
  date: string; // Tanggal modifikasi/unggah (ISO string dari server)
  size: number; // Ukuran dalam bytes
  type: 'pdf' | 'doc' | 'xls' | 'img' | 'default';
  url: string; // URL untuk mengakses file (misalnya, /uploads/filename.ext)
}

interface FileManagerProps {
  className?: string;
  ultraCompact?: boolean; // New prop for ultra compact mode
}

const API_BASE_URL = `${API_URL}`; // Ganti sesuai URL backend Anda

const FileManager: React.FC<FileManagerProps> = ({ 
  className = '', 
  ultraCompact = false 
}) => {
  const [viewType, setViewType] = useState<'list' | 'grid'>('list');
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true); // Tambahkan state loading

  // Ambil file dari server saat komponen dimuat
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true); // Set loading menjadi true sebelum fetch
        const response = await fetch(`${API_BASE_URL}/api/files`);
        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.statusText}`);
        }
        const fetchedData: FileItem[] = await response.json(); // Gunakan nama variabel yang benar
        // Format tanggal dan ukuran untuk tampilan, sesuaikan dengan struktur data dari backend
        const formattedData = fetchedData.map(file => ({
          ...file,
          // Format tanggal (misalnya, "11 Des") - asumsikan file.date adalah ISO string
          date: new Date(file.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
          // Format ukuran (misalnya, "46 KB") - asumsikan file.size adalah angka bytes
          size: formatFileSize(file.size),
          // type dan url seharusnya sudah benar dari response
        }));
        setFiles(formattedData);
      } catch (err: unknown) { // Tambahkan tipe 'unknown' untuk err
        console.error('Error fetching files:', err);
        // Jika error, set files ke array kosong
        setFiles([]);
      } finally {
        setLoading(false); // Set loading menjadi false setelah fetch selesai
      }
    };

    fetchFiles();
  }, []);

  // Fungsi helper untuk memformat ukuran file
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewChange = (type: 'list' | 'grid') => {
    setViewType(type);
  };

  const handleFileOpen = (url: string) => {
    console.log(`Opening file via URL: ${url}`);
    // Buka file di tab baru
    window.open(`${API_BASE_URL}${url}`, '_blank');
  };

  const handleDownload = async (filename: string, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log(`Downloading file: ${filename}`);

    try {
      const response = await fetch(`${API_BASE_URL}/uploads/${filename}`);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: unknown) { // Tambahkan tipe 'unknown' untuk error
      console.error('Download error:', error);
      alert(`Failed to download file: ${(error as Error).message}`);
    }
  };

  const handleDelete = async (filename: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(`Hapus file "${filename}"?`)) {
      console.log(`Deleting file: ${filename}`);
      try {
        const response = await fetch(`${API_BASE_URL}/api/files/${filename}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete file: ${response.statusText}`);
        }

        // Hapus file dari state lokal jika berhasil
        setFiles(prevFiles => prevFiles.filter(file => file.id !== filename)); // Gunakan 'id' karena itu primary key di DB
        console.log(`File ${filename} deleted successfully`);
      } catch (error: unknown) { // Tambahkan tipe 'unknown' untuk error
        console.error('Delete error:', error);
        alert(`Failed to delete file: ${(error as Error).message}`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = e.dataTransfer.files;

    if (droppedFiles.length > 0) {
      console.log('Files dropped:', Array.from(droppedFiles));
      await uploadFiles(Array.from(droppedFiles));
    }
  };

  // Fungsi untuk mengupload file ke backend
  const uploadFiles = async (fileList: File[]) => {
    const formData = new FormData();
    fileList.forEach(file => {
      formData.append('file', file); // Gunakan 'file' sesuai dengan endpoint multer
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/files`, {
        method: 'POST',
        body: formData, // FormData tidak perlu Content-Type header
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload successful via File Manager:', result);

      // Ambil file baru dan tambahkan ke state
      // Kita perlu fetch ulang karena server mungkin mengubah nama file
      const fetchResponse = await fetch(`${API_BASE_URL}/api/files`);
      if (!fetchResponse.ok) {
        throw new Error(`Failed to refresh file list after upload: ${fetchResponse.statusText}`);
      }
      const fetchedRefreshData: FileItem[] = await fetchResponse.json(); // Gunakan nama variabel yang benar
      const formattedRefreshData = fetchedRefreshData.map(file => ({
        ...file,
        date: new Date(file.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        size: formatFileSize(file.size),
      }));
      setFiles(formattedRefreshData);
      console.log('File list refreshed after upload via File Manager.');

    } catch (error: unknown) { // Tambahkan tipe 'unknown' untuk error
      console.error('Upload error via File Manager:', error);
      alert(`Failed to upload files via File Manager: ${(error as Error).message}`);
    }
  };

  const getFileIcon = (type: string) => {
    return (
      <svg className={`file-icon file-${type}`} viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    );
  };

  // Function to truncate filename for grid view
  const truncateFilename = (filename: string, maxLength: number = 12) => {
    if (filename.length <= maxLength) {
      return filename;
    }
    
    const extension = filename.split('.').pop() || '';
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    
    if (extension) {
      const maxNameLength = maxLength - extension.length - 4; // -4 for "..." and "."
      if (maxNameLength > 0) {
        return `${nameWithoutExt.substring(0, maxNameLength)}...${extension}`;
      }
    }
    
    return `${filename.substring(0, maxLength - 3)}...`;
  };

  const fileManagerClass = `file-manager ${ultraCompact ? 'ultra-compact' : ''} ${dragOver ? 'dragover' : ''} ${className}`.trim();

  if (loading) {
    return <div className={fileManagerClass}>Loading files...</div>;
  }

  return (
    <div 
      className={fileManagerClass}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="file-manager-header">
        <div className="filters">
          <button className="filter-btn">
            Jenis
            <svg viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          <button className="filter-btn">
            Tanggal
            <svg viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
        </div>
        
        <div className="view-controls">
          <button 
            className={`view-btn ${viewType === 'list' ? 'active' : ''}`}
            onClick={() => handleViewChange('list')}
            title="List view"
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
          </button>
          <button 
            className={`view-btn ${viewType === 'grid' ? 'active' : ''}`}
            onClick={() => handleViewChange('grid')}
            title="Grid view"
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="file-manager-content">
        {/* List View */}
        {viewType === 'list' && (
          <div className="list-view">
            <div className="list-header">
              <div>Nama</div>
              <div>Tanggal</div>
              <div>Ukuran</div>
              <div>Aksi</div>
            </div>

            {files.map((file) => (
              <div 
                key={file.id} // Gunakan 'id' sebagai key karena unik di DB
                className="file-row" 
                onDoubleClick={() => handleFileOpen(file.url)} // Gunakan 'url' untuk membuka
              >
                <div className="file-info">
                  {getFileIcon(file.type)}
                  <span className="file-name" title={file.name}>
                    {file.name}
                  </span>
                </div>
                <div className="file-date">{file.date}</div>
                <div className="file-size">{file.size}</div>
                <div className="file-actions">
                  <button 
                    className="action-btn" 
                    onClick={(e) => handleDownload(file.id, e)} // Gunakan 'id' (nama file internal) untuk download
                    title="Download"
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                    </svg>
                  </button>
                  <button 
                    className="action-btn" 
                    onClick={(e) => handleDelete(file.id, e)} // Gunakan 'id' (nama file internal) untuk delete
                    title="Delete"
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M9,8H11V17H9V8M13,8H15V17H13V8Z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid View */}
        {viewType === 'grid' && (
          <div className="grid-view">
            {files.map((file) => (
              <div 
                key={file.id} // Gunakan 'id' sebagai key karena unik di DB
                className="file-card" 
                onDoubleClick={() => handleFileOpen(file.url)} // Gunakan 'url' untuk membuka
                title={file.name}
              >
                {getFileIcon(file.type)}
                <div className="file-name">
                  {truncateFilename(file.name, ultraCompact ? 10 : 12)}
                </div>
                <div className="file-date">{file.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-message">
            Lepaskan file untuk upload
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;