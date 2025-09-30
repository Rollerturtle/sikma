// src/components/tabledataviews/tableDataView.tsx - Updated version
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './tableDataView.css';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {API_URL} from '../../api';

interface KejadianItem {
  id: number;
  title: string;
  provinsi: string;
  kabupaten?: string;
  kecamatan?: string;
  kelurahan?: string;
  das?: string;
  disaster_type: 'Banjir' | 'Longsor' | 'Gempa' | 'Kebakaran';
  incident_date: string;
  thumbnail_url: string | null;
  description: string;
  longitude: number;
  latitude: number;
  created_at: string;
  // Additional Excel data fields - all optional
  curah_hujan?: number | null;
  korban_meninggal?: number | null;
  korban_luka_luka?: number | null;
  korban_mengungsi?: number | null;
  rumah_rusak_berat?: number | null;
  rumah_rusak_sedang?: number | null;
  rumah_rusak_ringan?: number | null;
  rumah_rusak_terendam?: number | null;
  infrastruktur_rusak_berat?: number | null;
  infrastruktur_rusak_sedang?: number | null;
  infrastruktur_rusak_ringan?: number | null;
  dampak_kebakaran?: string | null;
  luas_lokasi_kejadian?: number | null;
  kejadian_ke?: number | null;
}

interface TableDataViewProps {
  filterData?: any;
  onRiskAnalysisUpdate?: (refreshTrigger: boolean) => void; // TAMBAHAN: Callback untuk refresh risk analysis
}

// Store filter data for use in detail view
const storeFilterData = (filterData: any) => {
  if (filterData) {
    try {
      sessionStorage.setItem('lastFilterData', JSON.stringify(filterData));
      console.log('Filter data stored for detail view:', filterData);
    } catch (error) {
      console.error('Error storing filter data:', error);
    }
  }
};

// Koordinat Indonesia
const CENTER: [number, number] = [-2.5, 118.0];
const BOUNDS: [[number, number], [number, number]] = [
  [-11.0, 95.0],
  [6.5, 141.0],
];

// Perbaiki ikon marker default Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Komponen untuk menangani klik pada peta
const MapClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
};

// Komponen DraggableMarker untuk marker yang bisa dipindahkan
const DraggableMarker = ({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number] | null; 
  onPositionChange: (lat: number, lng: number) => void;
}) => {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPosition = marker.getLatLng();
          onPositionChange(newPosition.lat, newPosition.lng);
        }
      },
    }),
    [onPositionChange],
  );

  return position ? (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    >
      <Popup>
        Lokasi yang dipilih<br />
        Lat: {position[0].toFixed(6)}<br />
        Lng: {position[1].toFixed(6)}<br />
        <small>Seret marker untuk mengubah posisi</small>
      </Popup>
    </Marker>
  ) : null;
};

const triggerRiskAnalysisRefresh = async (kejadianData: KejadianItem) => {
  try {
    // Send refresh signal to risk analysis endpoint to recalculate
    const response = await fetch('${API_URL}/api/risk-analysis/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        disaster_type: kejadianData.disaster_type,
        provinsi: kejadianData.provinsi,
        kabupaten: kejadianData.kabupaten,
        kecamatan: kejadianData.kecamatan,
        kelurahan: kejadianData.kelurahan,
        das: kejadianData.das,
        action: 'delete'
      })
    });

    if (response.ok) {
      console.log('Risk analysis refresh triggered successfully');
      return true;
    } else {
      console.warn('Risk analysis refresh failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error triggering risk analysis refresh:', error);
    return false;
  }
};

export function TableDataView({ filterData,onRiskAnalysisUpdate}: TableDataViewProps) {
  // Filter states - hanya tanggal yang tersisa
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [favorites, setFavorites] = useState<number[]>([]);

  // View mode states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  // Pagination states
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Data states
  const [kejadianData, setKejadianData] = useState<KejadianItem[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteItemTitle, setDeleteItemTitle] = useState<string>('');

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const viewToggleRef = useRef<HTMLButtonElement>(null);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  // Add Data Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    thumbnail: null as File | null,
    images: [] as File[],
    dataFiles: [] as File[],
    disasterType: '',
    provinsi: '',
    kabupaten: '',
    kecamatan: '',
    kelurahan: '',
    das: '',
    title: '',
    description: '',
    incidentDate: '',
    longitude: '',
    latitude: '',
  });

  // State untuk posisi marker
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);

  // State untuk dropdown options
  const [provinsiOptions, setProvinsiOptions] = useState<string[]>([]);
  const [kabupatenOptions, setKabupatenOptions] = useState<string[]>([]);
  const [kecamatanOptions, setKecamatanOptions] = useState<string[]>([]);
  const [kelurahanOptions, setKelurahanOptions] = useState<string[]>([]);
  const [dasOptions, setDasOptions] = useState<string[]>([]);

  // State untuk custom dropdown
  const [isProvinsiDropdownOpen, setIsProvinsiDropdownOpen] = useState(false);
  const [isKabupatenDropdownOpen, setIsKabupatenDropdownOpen] = useState(false);
  const [isKecamatanDropdownOpen, setIsKecamatanDropdownOpen] = useState(false);
  const [isKelurahanDropdownOpen, setIsKelurahanDropdownOpen] = useState(false);
  const [isDasDropdownOpen, setIsDasDropdownOpen] = useState(false);
  
  // State untuk search terms
  const [provinsiSearchTerm, setProvinsiSearchTerm] = useState('');
  const [kabupatenSearchTerm, setKabupatenSearchTerm] = useState('');
  const [kecamatanSearchTerm, setKecamatanSearchTerm] = useState('');
  const [kelurahanSearchTerm, setKelurahanSearchTerm] = useState('');
  const [dasSearchTerm, setDasSearchTerm] = useState('');

  const navigate = useNavigate();

  // Filter functions untuk search
  const filteredProvinsiOptions = provinsiOptions.filter(provinsi =>
    provinsi && typeof provinsi === 'string' && provinsi.toLowerCase().includes(provinsiSearchTerm.toLowerCase())
  );

  const filteredKabupatenOptions = kabupatenOptions.filter(kabupaten =>
    kabupaten && typeof kabupaten === 'string' && kabupaten.toLowerCase().includes(kabupatenSearchTerm.toLowerCase())
  );

  const filteredKecamatanOptions = kecamatanOptions.filter(kecamatan =>
    kecamatan && typeof kecamatan === 'string' && kecamatan.toLowerCase().includes(kecamatanSearchTerm.toLowerCase())
  );

  const filteredKelurahanOptions = kelurahanOptions.filter(kelurahan =>
    kelurahan && typeof kelurahan === 'string' && kelurahan.toLowerCase().includes(kelurahanSearchTerm.toLowerCase())
  );

  const filteredDasOptions = dasOptions.filter(das =>
    das && typeof das === 'string' && das.toLowerCase().includes(dasSearchTerm.toLowerCase())
  );

  // Fetch kejadian data
  const fetchKejadianData = async () => {
    setLoading(true);
    try {
      let url = '${API_URL}/api/kejadian?';
      const params = new URLSearchParams();

      // Apply filter dari parent component (filter.tsx)
      if (filterData && typeof filterData === 'object') {
        // Filter berdasarkan jenis bencana
        if (filterData.disasterType && typeof filterData.disasterType === 'string') {
          params.append('disaster_type', filterData.disasterType);
        }
        
        // Filter berdasarkan provinsi jika dipilih
        if (filterData.selectedValue && filterData.locationType === 'Daerah Administratif') {
          params.append('provinsi', filterData.selectedValue);
        }
      }
      
      if (startDate && typeof startDate === 'string') {
        params.append('start_date', startDate);
      }
      if (endDate && typeof endDate === 'string') {
        params.append('end_date', endDate);
      }

      console.log('Fetching kejadian data from:', url + params.toString());
      
      const response = await fetch(url + params.toString());
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received data:', data);
        
        // Pastikan data adalah array dan memiliki struktur yang benar
        if (Array.isArray(data)) {
          setKejadianData(data);
          console.log('Data set successfully, length:', data.length);
        } else {
          console.error('Data received is not an array:', data);
          setKejadianData([]);
        }
      } else {
        console.error('Failed to fetch kejadian data, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setKejadianData([]);
      }
    } catch (error) {
      console.error('Error fetching kejadian data:', error);
      setKejadianData([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete kejadian function

  const handleDeleteKejadian = async (id: number) => {
    try {
      console.log('Deleting kejadian with ID:', id);
      
      const kejadianToDelete = kejadianData.find(item => item.id === id);
      if (!kejadianToDelete) {
        alert('Data kejadian tidak ditemukan');
        return;
      }

      const response = await fetch(`${API_URL}/api/kejadian/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Delete successful:', result);
        // Remove item from local state
        setKejadianData(prev => prev.filter(item => item.id !== id));

        // TAMBAHAN: Trigger risk analysis refresh
        console.log('Triggering risk analysis refresh after delete...');
        const refreshSuccess = await triggerRiskAnalysisRefresh(kejadianToDelete);
        // TAMBAHAN: Notify parent component to refresh risk layers
        if (onRiskAnalysisUpdate) {
          console.log('Notifying parent component to refresh risk analysis...');
          onRiskAnalysisUpdate(true);
        }

        // Show success message with refresh info
        const successMessage = refreshSuccess 
          ? 'Data kejadian berhasil dihapus! Layer kerawanan akan diperbarui.'
          : 'Data kejadian berhasil dihapus! Silakan refresh halaman untuk memperbarui layer kerawanan.';
        alert(successMessage);

        // Show success message
        alert('Data kejadian berhasil dihapus!');
        // Close delete confirmation modal
        setShowDeleteConfirm(false);
        setDeleteItemId(null);
        setDeleteItemTitle('');
      } else {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        alert(`Gagal menghapus data: ${errorData.error || 'Server error'}`);
      }
    } catch (error) {
      console.error('Error deleting kejadian:', error);
      alert('Terjadi kesalahan saat menghapus data. Silakan coba lagi.');
    }
  };
  // Show delete confirmation
  const showDeleteConfirmation = (id: number, title: string) => {
    setDeleteItemId(id);
    setDeleteItemTitle(title);
    setShowDeleteConfirm(true);
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteItemId(null);
    setDeleteItemTitle('');
  };

  // Confirm delete
  const confirmDelete = () => {
    if (deleteItemId) {
      handleDeleteKejadian(deleteItemId);
    }
  };

  // Fetch data saat component mount, filter berubah, atau tanggal berubah
  useEffect(() => {
    console.log('useEffect triggered, filterData:', filterData);
    
    // Store filter data when it changes
    if (filterData) {
      storeFilterData(filterData);
    }
    
    // Add small delay to ensure component is mounted
    const timer = setTimeout(() => {
      fetchKejadianData();
    }, 100);

    return () => clearTimeout(timer);
  }, [filterData, startDate, endDate]);

  // Reset current page saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterData, startDate, endDate, searchTerm]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Filter dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }

      // View dropdown
      if (
        viewDropdownRef.current &&
        !viewDropdownRef.current.contains(event.target as Node) &&
        viewToggleRef.current &&
        !viewToggleRef.current.contains(event.target as Node)
      ) {
        setIsViewDropdownOpen(false);
      }

      // Custom dropdowns - tutup jika click di luar
      if (!(event.target as Element).closest('.custom-dropdown')) {
        setIsProvinsiDropdownOpen(false);
        setIsKabupatenDropdownOpen(false);
        setIsKecamatanDropdownOpen(false);
        setIsKelurahanDropdownOpen(false);
        setIsDasDropdownOpen(false);
      }

      // Add Data Modal
      if (
        isAddModalOpen &&
        event.target instanceof HTMLElement &&
        event.target.classList.contains('modal-overlay')
      ) {
        handleModalClose();
      }
      // Delete confirmation modal
      if (
        showDeleteConfirm &&
        event.target instanceof HTMLElement &&
        event.target.classList.contains('delete-modal-overlay')
      ) {
        cancelDelete();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAddModalOpen, showDeleteConfirm]);

  // Fetch dropdown options saat component mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // Set fallback data first
        const fallbackData = {
          provinsi: ['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten', 'DI Yogyakarta'],
          kabupaten: ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Bandung', 'Bekasi', 'Depok'],
          kecamatan: ['Menteng', 'Tanah Abang', 'Gambir', 'Sawah Besar', 'Kemayoran', 'Senen', 'Cempaka Putih', 'Johar Baru'],
          kelurahan: ['Kebon Sirih', 'Gondangdia', 'Cikini', 'Menteng', 'Pegangsaan', 'Bendungan Hilir', 'Gelora', 'Karet Tengsin'],
          das: ['Citarum', 'Ciliwung', 'Cisadane', 'Brantas', 'Bengawan Solo', 'Serayu', 'Progo']
        };

        // Fetch provinsi
        try {
          const provinsiResponse = await fetch('${API_URL}/api/filter/provinces');
          if (provinsiResponse.ok) {
            const provinsiData = await provinsiResponse.json();
            if (Array.isArray(provinsiData) && provinsiData.length > 0) {
              setProvinsiOptions(provinsiData.map((item: { provinsi: string }) => item.provinsi));
            } else {
              setProvinsiOptions(fallbackData.provinsi);
            }
          } else {
            console.warn('Provinsi API failed, using fallback data');
            setProvinsiOptions(fallbackData.provinsi);
          }
        } catch (error) {
          console.warn('Error fetching provinsi, using fallback:', error);
          setProvinsiOptions(fallbackData.provinsi);
        }

        // Fetch kabupaten
        try {
          const kabupatenResponse = await fetch('${API_URL}/api/filter/kabupaten');
          if (kabupatenResponse.ok) {
            const kabupatenData = await kabupatenResponse.json();
            if (Array.isArray(kabupatenData) && kabupatenData.length > 0) {
              setKabupatenOptions(kabupatenData.map((item: { kab_kota: string }) => item.kab_kota));
            } else {
              setKabupatenOptions(fallbackData.kabupaten);
            }
          } else {
            console.warn('Kabupaten API failed, using fallback data');
            setKabupatenOptions(fallbackData.kabupaten);
          }
        } catch (error) {
          console.warn('Error fetching kabupaten, using fallback:', error);
          setKabupatenOptions(fallbackData.kabupaten);
        }

        // Fetch kecamatan
        try {
          const kecamatanResponse = await fetch('${API_URL}/api/filter/kecamatan');
          if (kecamatanResponse.ok) {
            const kecamatanData = await kecamatanResponse.json();
            if (Array.isArray(kecamatanData) && kecamatanData.length > 0) {
              setKecamatanOptions(kecamatanData.map((item: { kecamatan: string }) => item.kecamatan));
            } else {
              setKecamatanOptions(fallbackData.kecamatan);
            }
          } else {
            console.warn('Kecamatan API failed, using fallback data');
            setKecamatanOptions(fallbackData.kecamatan);
          }
        } catch (error) {
          console.warn('Error fetching kecamatan, using fallback:', error);
          setKecamatanOptions(fallbackData.kecamatan);
        }

        // Fetch kelurahan
        try {
          const kelurahanResponse = await fetch('${API_URL}/api/filter/kelurahan');
          if (kelurahanResponse.ok) {
            const kelurahanData = await kelurahanResponse.json();
            if (Array.isArray(kelurahanData) && kelurahanData.length > 0) {
              setKelurahanOptions(kelurahanData.map((item: { kel_desa: string }) => item.kel_desa));
            } else {
              setKelurahanOptions(fallbackData.kelurahan);
            }
          } else {
            console.warn('Kelurahan API failed, using fallback data');
            setKelurahanOptions(fallbackData.kelurahan);
          }
        } catch (error) {
          console.warn('Error fetching kelurahan, using fallback:', error);
          setKelurahanOptions(fallbackData.kelurahan);
        }

        // Fetch DAS
        try {
          const dasResponse = await fetch('${API_URL}/api/filter/das');
          if (dasResponse.ok) {
            const dasData = await dasResponse.json();
            if (Array.isArray(dasData) && dasData.length > 0) {
              setDasOptions(dasData.map((item: { nama_das: string }) => item.nama_das));
            } else {
              setDasOptions(fallbackData.das);
            }
          } else {
            console.warn('DAS API failed, using fallback data');
            setDasOptions(fallbackData.das);
          }
        } catch (error) {
          console.warn('Error fetching DAS, using fallback:', error);
          setDasOptions(fallbackData.das);
        }

        console.log('Dropdown options loaded successfully');

      } catch (error) {
        console.error('Critical error in fetchOptions:', error);
        // Set complete fallback data if everything fails
        setProvinsiOptions(['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah']);
        setKabupatenOptions(['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Selatan']);
        setKecamatanOptions(['Menteng', 'Tanah Abang', 'Gambir']);
        setKelurahanOptions(['Kebon Sirih', 'Gondangdia', 'Cikini']);
        setDasOptions(['Citarum', 'Ciliwung', 'Cisadane']);
      }
    };

    fetchOptions();
  }, []);

  // Fungsi untuk menangani perubahan koordinat dari peta
  const handleLocationSelect = (lat: number, lng: number) => {
    const newLat = lat.toFixed(6);
    const newLng = lng.toFixed(6);
    
    setFormData(prev => ({ 
      ...prev, 
      latitude: newLat, 
      longitude: newLng 
    }));
    setMarkerPosition([parseFloat(newLat), parseFloat(newLng)]);
  };

  // Fungsi untuk menangani perubahan input koordinat manual
  const handleCoordinateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Update marker position jika kedua koordinat tersedia dan valid
    const updatedFormData = { ...formData, [name]: value };
    const lat = parseFloat(updatedFormData.latitude);
    const lng = parseFloat(updatedFormData.longitude);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setMarkerPosition([lat, lng]);
    } else if (!value.trim()) {
      // Jika input dikosongkan, hapus marker jika input lainnya juga kosong
      if (name === 'latitude' && !updatedFormData.longitude.trim()) {
        setMarkerPosition(null);
      } else if (name === 'longitude' && !updatedFormData.latitude.trim()) {
        setMarkerPosition(null);
      }
    }
  };

  // Handle form changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'latitude' || name === 'longitude') {
      handleCoordinateInputChange(e as React.ChangeEvent<HTMLInputElement>);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.name === 'thumbnail') {
        setFormData(prev => ({ ...prev, thumbnail: e.target.files![0] }));
      } else if (e.target.name === 'images') {
        setFormData(prev => ({ ...prev, images: Array.from(e.target.files!) }));
      }
    }
  };

  // Handler untuk data files (Excel only)
  const handleDataFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Validasi ukuran file (max 10MB per file)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validFiles = files.filter(file => {
        if (file.size > maxSize) {
          alert(`File ${file.name} terlalu besar. Maksimal 10MB per file.`);
          return false;
        }
        return true;
      });

      // Validasi tipe file - hanya Excel
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      const validTypeFiles = validFiles.filter(file => {
        if (!allowedTypes.includes(file.type)) {
          alert(`File ${file.name} bukan file Excel. Hanya file .xls dan .xlsx yang diperbolehkan.`);
          return false;
        }
        return true;
      });

      setFormData(prev => ({ 
        ...prev, 
        dataFiles: [...(prev.dataFiles || []), ...validTypeFiles] 
      }));
    }
  };

  // Reset marker position dan form saat modal ditutup
  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setMarkerPosition(null);
    
    // Reset dropdown states
    setIsProvinsiDropdownOpen(false);
    setIsKabupatenDropdownOpen(false);
    setIsKecamatanDropdownOpen(false);
    setIsKelurahanDropdownOpen(false);
    setIsDasDropdownOpen(false);
    
    // Reset search terms
    setProvinsiSearchTerm('');
    setKabupatenSearchTerm('');
    setKecamatanSearchTerm('');
    setKelurahanSearchTerm('');
    setDasSearchTerm('');
    
    // Reset form data
    setFormData({
      thumbnail: null,
      images: [],
      dataFiles: [],
      disasterType: '',
      provinsi: '',
      kabupaten: '',
      kecamatan: '',
      kelurahan: '',
      das: '',
      title: '',
      description: '',
      incidentDate: '',
      longitude: '',
      latitude: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // UPDATED VALIDATION - removed reportType, added required fields
    if (!formData.disasterType || !formData.provinsi || !formData.kabupaten ||
        !formData.kecamatan || !formData.kelurahan || !formData.title || 
        !formData.longitude || !formData.latitude || !formData.description || 
        !formData.incidentDate) {
      alert('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    // Validate coordinates
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Koordinat tidak valid. Pastikan latitude (-90 to 90) dan longitude (-180 to 180) benar');
      return;
    }

    try {
      // Create FormData for file upload
      const submitFormData = new FormData();
      
      // Add text fields
      submitFormData.append('disasterType', formData.disasterType);
      submitFormData.append('provinsi', formData.provinsi);
      submitFormData.append('kabupaten', formData.kabupaten);
      submitFormData.append('kecamatan', formData.kecamatan);
      submitFormData.append('kelurahan', formData.kelurahan);
      submitFormData.append('das', formData.das);
      submitFormData.append('title', formData.title);
      submitFormData.append('description', formData.description);
      submitFormData.append('incidentDate', formData.incidentDate);
      submitFormData.append('longitude', formData.longitude);
      submitFormData.append('latitude', formData.latitude);
      
      // Add files
      if (formData.thumbnail) {
        submitFormData.append('thumbnail', formData.thumbnail);
      }
      
      formData.images.forEach((image, index) => {
        submitFormData.append('images', image);
      });

      // Add data files (Excel files)
      formData.dataFiles.forEach((file, index) => {
        submitFormData.append('dataFiles', file);
      });

      console.log('Submitting form data...');
      
      // Submit to server
      const response = await fetch('${API_URL}/api/kejadian', {
        method: 'POST',
        body: submitFormData,
      });

      const result = await response.json();

      if (response.ok) {
        alert('Laporan kejadian berhasil disimpan!');
        console.log('Success:', result);
        handleModalClose();
        fetchKejadianData(); // Refresh data
      } else {
        console.error('Error:', result);
        alert(`Error: ${result.error || 'Gagal menyimpan laporan'}`);
      }

    } catch (error) {
      console.error('Network error:', error);
      alert('Terjadi kesalahan jaringan. Silakan coba lagi.');
    }
  };

  // Filter data based on search term
  const filteredData = kejadianData.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.provinsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.das && item.das.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Pagination render function
  const renderPagination = () => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i + 1}
          onClick={() => setCurrentPage(i + 1)}
          className={`px-2 py-1 rounded ${
            currentPage === i + 1
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-200'
          }`}
        >
          {i + 1}
        </button>
      ));
    }

    const pages = [];

    // First page
    pages.push(
      <button
        key={1}
        onClick={() => setCurrentPage(1)}
        className={`px-2 py-1 rounded ${
          currentPage === 1
            ? 'bg-blue-600 text-white'
            : 'hover:bg-gray-200'
        }`}
      >
        1
      </button>
    );

    // "..." if distance to first page > 2
    if (currentPage > 3) {
      pages.push(
        <span key="dots-start" className="px-2 py-1">
          ...
        </span>
      );
    }

    // Previous page
    if (currentPage > 2) {
      pages.push(
        <button
          key={currentPage - 1}
          onClick={() => setCurrentPage(currentPage - 1)}
          className={`px-2 py-1 rounded ${
            currentPage === currentPage - 1
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-200'
          }`}
        >
          {currentPage - 1}
        </button>
      );
    }

    // Current page
    pages.push(
      <button
        key={currentPage}
        onClick={() => setCurrentPage(currentPage)}
        className="px-2 py-1 bg-blue-600 text-white rounded"
      >
        {currentPage}
      </button>
    );

    // Next page
    if (currentPage < totalPages - 1) {
      pages.push(
        <button
          key={currentPage + 1}
          onClick={() => setCurrentPage(currentPage + 1)}
          className={`px-2 py-1 rounded ${
            currentPage === currentPage + 1
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-200'
          }`}
        >
          {currentPage + 1}
        </button>
      );
    }

    // "..." if distance to last page > 2
    if (currentPage < totalPages - 2) {
      pages.push(
        <span key="dots-end" className="px-2 py-1">
          ...
        </span>
      );
    }

    // Last page
    pages.push(
      <button
        key={totalPages}
        onClick={() => setCurrentPage(totalPages)}
        className={`px-2 py-1 rounded ${
          currentPage === totalPages
            ? 'bg-blue-600 text-white'
            : 'hover:bg-gray-200'
        }`}
      >
        {totalPages}
      </button>
    );

    return pages;
  };

  // Updated handleItemClick with proper filter storage and navigation
  const handleItemClick = (id: number) => {
    // Store current filter data before navigation
    if (filterData) {
      storeFilterData(filterData);
      console.log('Navigating to detail with filter context:', filterData);
    }
    
    // Navigate to detail page with the correct route
    navigate(`/detail-kejadian/${id}`);
  };

  // Format date function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Default image for items without thumbnail
  const defaultImage = 'https://via.placeholder.com/300x200?text=No+Image';

  // Early return jika state belum initialized
  if (!Array.isArray(kejadianData)) {
    return (
      <div className="table-data-view">
        <h2 className="title">Tabel Pencarian Data</h2>
        <div className="loading-state">
          <p>Memuat komponen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-data-view">
      <h2 className="title">Tabel Pencarian Data</h2>

      {/* Active Filter Info */}
      {filterData && (
        <div className="active-filter-info" style={{ 
          background: '#f0f9ff', 
          border: '1px solid #0ea5e9', 
          borderRadius: '8px', 
          padding: '12px', 
          margin: '16px 0',
          fontSize: '14px'
        }}>
          <div className="filter-info-text">
            <strong>Filter Aktif:</strong> {filterData.disasterType || 'Semua Jenis Bencana'}
            {filterData.selectedValue && (
              <span> | {filterData.locationType === 'DAS' ? 'DAS' : 'Provinsi'}: {filterData.selectedValue}</span>
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>

      {/* Controls Row */}
      <div className="controls-row">
        <div className="entries-control">
          <span>Show</span>
          <select 
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="entries-select"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
          <span>entries</span>
        </div>

        <div className="filter-controls">
          <button
            ref={filterButtonRef}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="filter-btn-tbv"
            aria-label="Filter"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"/>
            </svg>
          </button>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="filter-btn-tbv"
            aria-label="Add-Data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <button
            ref={viewToggleRef}
            onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
            className="view-toggle-btn"
            aria-label="View Toggle"
          >
            {viewMode === 'grid' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
                <line x1="8" y1="18" x2="16" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Filter Dropdown */}
      {isFilterOpen && (
        <div ref={dropdownRef} className="filter-dropdown">
          <div className="filter-group">
            <label htmlFor="start-date">Tanggal Awal</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="filter-date"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="end-date">Tanggal Akhir</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="filter-date"
            />
          </div>

          <button 
            className="btn-search"
            onClick={fetchKejadianData}
          >
            Cari
          </button>
        </div>
      )}

      {/* View Dropdown */}
      {isViewDropdownOpen && (
        <div ref={viewDropdownRef} className="view-dropdown">
          <button
            onClick={() => {
              setViewMode('grid');
              setIsViewDropdownOpen(false);
            }}
            className={`w-full text-left px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'} transition-colors`}
          >
            Grid
          </button>
          <button
            onClick={() => {
              setViewMode('list');
              setIsViewDropdownOpen(false);
            }}
            className={`w-full text-left px-3 py-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'} transition-colors`}
          >
            List
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <p>Memuat data...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && (!kejadianData || !Array.isArray(kejadianData)) && (
        <div className="error-state">
          <p>Terjadi kesalahan saat memuat data. Silakan refresh halaman.</p>
        </div>
      )}

      {/* Grid View - Updated untuk kejadian data */}
      {viewMode === 'grid' && !loading && Array.isArray(kejadianData) && (
        <>
          <div className="card-grid">
            {currentData.map((item) => (
              <div key={item.id} className="card-item" onClick={() => handleItemClick(item.id)}>
                <div className="card-image-wrapper">
                  <img 
                    src={item.thumbnail_url ? `${API_URL}${item.thumbnail_url}` : defaultImage} 
                    alt={item.title} 
                    className="card-image" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultImage;
                    }}
                  />
                  <div className={`badge ${item.disaster_type.toLowerCase()}`}>
                    {item.disaster_type}
                  </div>
                  <div className="card-title">{item.title}</div>
                  <div className="card-location">{item.provinsi}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showDeleteConfirmation(item.id, item.title);
                    }}
                    className="delete-btn"
                    title="Hapus kejadian"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {currentData.length === 0 && (
            <div className="no-data">
              <p>Tidak ada data kejadian yang ditemukan.</p>
            </div>
          )}

          {/* Pagination for Grid View */}
          <div className="pagination">
            <div className="page-numbers">
              {renderPagination()}
            </div>
          </div>
        </>
      )}

      {/* List View - Updated untuk kejadian data */}
      {viewMode === 'list' && !loading && Array.isArray(kejadianData) && (
        <div className="list-view">
          <div className="table-header">
            <div className="table-cell">Judul Laporan</div>
            <div className="table-cell">Provinsi</div>
            <div className="table-cell">Kabupaten</div>
            <div className="table-cell">DAS</div>
            <div className="table-cell">Jenis Bencana</div>
            <div className="table-cell">Tanggal</div>
            <div className="table-cell">Aksi</div>
          </div>

           <div className="table-body">
            {currentData.map((item) => (
              <div key={item.id} className="table-row">
                <div className="table-cell" onClick={() => handleItemClick(item.id)} style={{ cursor: 'pointer' }}>
                  {item.title}
                </div>

                <div className="table-cell" onClick={() => handleItemClick(item.id)} style={{ cursor: 'pointer' }}>
                  {item.provinsi}
                </div>

                <div className="table-cell" onClick={() => handleItemClick(item.id)} style={{ cursor: 'pointer' }}>
                  {item.kabupaten || '-'}
                </div>

                <div className="table-cell" onClick={() => handleItemClick(item.id)} style={{ cursor: 'pointer' }}>
                  {item.das || '-'}
                </div>

                <div className="table-cell" onClick={() => handleItemClick(item.id)} style={{ cursor: 'pointer' }}>
                  {item.disaster_type}
                </div>

                <div className="table-cell" onClick={() => handleItemClick(item.id)} style={{ cursor: 'pointer' }}>
                  {formatDate(item.incident_date)}
                </div>
                <div className="table-cell">
                  <button
                    onClick={() => showDeleteConfirmation(item.id, item.title)}
                    className="delete-btn-small"
                    title="Hapus kejadian"
                  >

                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {currentData.length === 0 && (
            <div className="no-data">
              <p>Tidak ada data kejadian yang ditemukan.</p>
            </div>
          )}

          {/* Pagination for List View */}
          <div className="pagination">
            <div className="page-numbers">
              {renderPagination()}
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}

      {showDeleteConfirm && (

        <div className="delete-modal-overlay" style={{

          position: 'fixed',

          top: 0,

          left: 0,

          right: 0,

          bottom: 0,

          backgroundColor: 'rgba(0, 0, 0, 0.5)',

          display: 'flex',

          justifyContent: 'center',

          alignItems: 'center',

          zIndex: 1000

        }}>

          <div className="delete-modal-content" style={{

            backgroundColor: 'white',

            padding: '24px',

            borderRadius: '8px',

            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',

            maxWidth: '400px',

            width: '90%'

          }}>

            <div className="delete-modal-header" style={{ marginBottom: '16px' }}>

              <h3 style={{ margin: 0, color: '#dc2626', fontSize: '18px', fontWeight: 'bold' }}>

                Konfirmasi Hapus

              </h3>

            </div>

            <div className="delete-modal-body" style={{ marginBottom: '20px' }}>

              <p style={{ margin: 0, color: '#374151' }}>

                Apakah Anda yakin ingin menghapus kejadian ini?

              </p>

              <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', color: '#1f2937' }}>

                "{deleteItemTitle}"

              </p>

              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>

                Data yang dihapus tidak dapat dikembalikan.

              </p>

            </div>

            <div className="delete-modal-actions" style={{ 

              display: 'flex', 

              gap: '12px',

              justifyContent: 'flex-end'

            }}>

              <button

                onClick={cancelDelete}

                style={{

                  padding: '8px 16px',

                  border: '1px solid #d1d5db',

                  backgroundColor: 'white',

                  color: '#374151',

                  borderRadius: '6px',

                  cursor: 'pointer',

                  fontSize: '14px'

                }}

                onMouseOver={(e) => {

                  e.currentTarget.style.backgroundColor = '#f9fafb';

                }}

                onMouseOut={(e) => {

                  e.currentTarget.style.backgroundColor = 'white';

                }}

              >

                Batal

              </button>

              <button

                onClick={confirmDelete}

                style={{

                  padding: '8px 16px',

                  border: 'none',

                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}

                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
              >
                Hapus
              </button>
            </div>
            </div>
        </div>
      )}

      {/* Add Data Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tambah Laporan Bencana</h3>
              <button 
                onClick={handleModalClose} 
                className="close-button"
                type="button"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              {/* Thumbnail Upload */}
              <div className="form-group">
                <label htmlFor="thumbnail">Upload Gambar Thumbnail Laporan</label>
                <div className="upload-container thumbnail-upload" onClick={() => !formData.thumbnail && document.getElementById('thumbnail')?.click()}>
                  <input
                    type="file"
                    id="thumbnail"
                    name="thumbnail"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="upload-input"
                    style={{ display: 'none' }}
                  />

                  {formData.thumbnail ? (
                    <div className="thumbnail-preview-container">
                      <img 
                        src={URL.createObjectURL(formData.thumbnail)} 
                        alt="Thumbnail Preview" 
                        className="thumbnail-preview-image" 
                      />

                      <div className="thumbnail-overlay">
                        <div className="thumbnail-actions">
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById('thumbnail')?.click();
                            }}
                            className="thumbnail-change-btn"
                            title="Ganti gambar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="17 8 12 3 7 8"></polyline>
                              <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                          </button>

                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData(prev => ({ ...prev, thumbnail: null }));
                            }}
                            className="thumbnail-remove-btn"
                            title="Hapus gambar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="thumbnail-info">
                        <span className="thumbnail-filename">{formData.thumbnail.name}</span>
                        <span className="thumbnail-size">
                          {(formData.thumbnail.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <p>Upload Thumbnail</p>
                      <span className="upload-hint">Klik untuk memilih gambar</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label htmlFor="images">Upload Foto Kegiatan</label>
                
                <div className="upload-container activity-upload" onClick={() => document.getElementById('images')?.click()}>
                  <input
                    type="file"
                    id="images"
                    name="images"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="upload-input"
                    style={{ display: 'none' }}
                  />
                  
                  <div className="upload-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p>Upload Foto Kegiatan</p>
                  </div>
                </div>

                {/* File List Preview */}
                {formData.images.length > 0 && (
                  <div className="file-list">
                    {formData.images.map((file, index) => (
                      <div key={index} className="file-item">
                        <span>{file.name}</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const newFiles = [...formData.images];
                            newFiles.splice(index, 1);
                            setFormData(prev => ({ ...prev, images: newFiles }));
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Judul Laporan */}
              <div className="form-group">
                <label htmlFor="title">Judul Laporan</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Masukkan judul laporan..."
                  required
                />
              </div>

              {/* Deskripsi Panjang */}
              <div className="form-group">
                <label htmlFor="description">Deskripsi Laporan</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-textarea"
                  rows={4}
                  placeholder="Masukkan deskripsi lengkap dari kejadian..."
                  required
                ></textarea>
              </div>

              {/* Tanggal Kejadian */}
              <div className="form-group">
                <label htmlFor="incidentDate">Tanggal Kejadian</label>
                <input
                  type="date"
                  id="incidentDate"
                  name="incidentDate"
                  value={formData.incidentDate}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
              
              {/* Dropdown Provinsi dan Kabupaten/Kota */}
              <div className="form-group">
                <div className="coordinate-inputs">
                  <div style={{ flex: 1 }}>
                    <label htmlFor="provinsi">Provinsi *</label>
                    <div className="custom-dropdown">
                      <div 
                        className="custom-dropdown-trigger"
                        onClick={() => setIsProvinsiDropdownOpen(!isProvinsiDropdownOpen)}
                      >
                        <span>{formData.provinsi || 'Pilih Provinsi'}</span>
                        <svg className={`dropdown-arrow ${isProvinsiDropdownOpen ? 'open' : ''}`} 
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                      {isProvinsiDropdownOpen && (
                        <div className="custom-dropdown-menu">
                          <div className="dropdown-search">
                            <input
                              type="text"
                              placeholder="Cari provinsi..."
                              value={provinsiSearchTerm}
                              onChange={(e) => setProvinsiSearchTerm(e.target.value)}
                              className="dropdown-search-input"
                            />
                          </div>
                          <div className="dropdown-options">
                            {filteredProvinsiOptions.map((provinsi) => (
                              <div
                                key={provinsi}
                                className="dropdown-option"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, provinsi }));
                                  setIsProvinsiDropdownOpen(false);
                                  setProvinsiSearchTerm('');
                                }}
                              >
                                {provinsi}
                              </div>
                            ))}
                            {filteredProvinsiOptions.length === 0 && (
                              <div className="dropdown-no-results">Tidak ada hasil</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label htmlFor="kabupaten">Kabupaten/Kota *</label>
                    <div className="custom-dropdown">
                      <div 
                        className="custom-dropdown-trigger"
                        onClick={() => setIsKabupatenDropdownOpen(!isKabupatenDropdownOpen)}
                      >
                        <span>{formData.kabupaten || 'Pilih Kabupaten/Kota'}</span>
                        <svg className={`dropdown-arrow ${isKabupatenDropdownOpen ? 'open' : ''}`} 
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                      {isKabupatenDropdownOpen && (
                        <div className="custom-dropdown-menu">
                          <div className="dropdown-search">
                            <input
                              type="text"
                              placeholder="Cari kabupaten/kota..."
                              value={kabupatenSearchTerm}
                              onChange={(e) => setKabupatenSearchTerm(e.target.value)}
                              className="dropdown-search-input"
                            />
                          </div>
                          <div className="dropdown-options">
                            {filteredKabupatenOptions.map((kabupaten) => (
                              <div
                                key={kabupaten}
                                className="dropdown-option"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, kabupaten }));
                                  setIsKabupatenDropdownOpen(false);
                                  setKabupatenSearchTerm('');
                                }}
                              >
                                {kabupaten}
                              </div>
                            ))}
                            {filteredKabupatenOptions.length === 0 && (
                              <div className="dropdown-no-results">Tidak ada hasil</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dropdown Kecamatan dan Kelurahan/Desa */}
              <div className="form-group">
                <div className="coordinate-inputs">
                  <div style={{ flex: 1 }}>
                    <label htmlFor="kecamatan">Kecamatan *</label>
                    <div className="custom-dropdown">
                      <div 
                        className="custom-dropdown-trigger"
                        onClick={() => setIsKecamatanDropdownOpen(!isKecamatanDropdownOpen)}
                      >
                        <span>{formData.kecamatan || 'Pilih Kecamatan'}</span>
                        <svg className={`dropdown-arrow ${isKecamatanDropdownOpen ? 'open' : ''}`} 
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                      {isKecamatanDropdownOpen && (
                        <div className="custom-dropdown-menu">
                          <div className="dropdown-search">
                            <input
                              type="text"
                              placeholder="Cari kecamatan..."
                              value={kecamatanSearchTerm}
                              onChange={(e) => setKecamatanSearchTerm(e.target.value)}
                              className="dropdown-search-input"
                            />
                          </div>
                          <div className="dropdown-options">
                            {filteredKecamatanOptions.map((kecamatan) => (
                              <div
                                key={kecamatan}
                                className="dropdown-option"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, kecamatan }));
                                  setIsKecamatanDropdownOpen(false);
                                  setKecamatanSearchTerm('');
                                }}
                              >
                                {kecamatan}
                              </div>
                            ))}
                            {filteredKecamatanOptions.length === 0 && (
                              <div className="dropdown-no-results">Tidak ada hasil</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label htmlFor="kelurahan">Kelurahan/Desa *</label>
                    <div className="custom-dropdown">
                      <div 
                        className="custom-dropdown-trigger"
                        onClick={() => setIsKelurahanDropdownOpen(!isKelurahanDropdownOpen)}
                      >
                        <span>{formData.kelurahan || 'Pilih Kelurahan/Desa'}</span>
                        <svg className={`dropdown-arrow ${isKelurahanDropdownOpen ? 'open' : ''}`} 
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                      {isKelurahanDropdownOpen && (
                        <div className="custom-dropdown-menu">
                          <div className="dropdown-search">
                            <input
                              type="text"
                              placeholder="Cari kelurahan/desa..."
                              value={kelurahanSearchTerm}
                              onChange={(e) => setKelurahanSearchTerm(e.target.value)}
                              className="dropdown-search-input"
                            />
                          </div>
                          <div className="dropdown-options">
                            {filteredKelurahanOptions.map((kelurahan) => (
                              <div
                                key={kelurahan}
                                className="dropdown-option"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, kelurahan }));
                                  setIsKelurahanDropdownOpen(false);
                                  setKelurahanSearchTerm('');
                                }}
                              >
                                {kelurahan}
                              </div>
                            ))}
                            {filteredKelurahanOptions.length === 0 && (
                              <div className="dropdown-no-results">Tidak ada hasil</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dropdown Jenis Bencana dan DAS */}
              <div className="form-group">
                <div className="coordinate-inputs">
                  <div style={{ flex: 1 }}>
                    <label htmlFor="disasterType">Jenis Bencana *</label>
                    <select
                      id="disasterType"
                      name="disasterType"
                      value={formData.disasterType}
                      onChange={handleInputChange}
                      className="form-select"
                      required
                    >
                      <option value="">Pilih Jenis Bencana</option>
                      <option value="Banjir">Banjir</option>
                      <option value="Longsor">Longsor</option>
                      <option value="Gempa">Gempa</option>
                      <option value="Kebakaran">Kebakaran</option>
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label htmlFor="das">DAS</label>
                    <div className="custom-dropdown">
                      <div 
                        className="custom-dropdown-trigger"
                        onClick={() => setIsDasDropdownOpen(!isDasDropdownOpen)}
                      >
                        <span>{formData.das || 'Pilih DAS'}</span>
                        <svg className={`dropdown-arrow ${isDasDropdownOpen ? 'open' : ''}`} 
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                      {isDasDropdownOpen && (
                        <div className="custom-dropdown-menu">
                          <div className="dropdown-search">
                            <input
                              type="text"
                              placeholder="Cari DAS..."
                              value={dasSearchTerm}
                              onChange={(e) => setDasSearchTerm(e.target.value)}
                              className="dropdown-search-input"
                            />
                          </div>
                          <div className="dropdown-options">
                            {filteredDasOptions.map((das) => (
                              <div
                                key={das}
                                className="dropdown-option"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, das }));
                                  setIsDasDropdownOpen(false);
                                  setDasSearchTerm('');
                                }}
                              >
                                {das}
                              </div>
                            ))}
                            {filteredDasOptions.length === 0 && (
                              <div className="dropdown-no-results">Tidak ada hasil</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            {/* Upload File Data */}
            <div className="form-group">
              <label htmlFor="dataFiles">Upload File Data Excel</label>
              <div className="upload-container file-upload" onClick={() => document.getElementById('dataFiles')?.click()}>
                <input
                  type="file"
                  id="dataFiles"
                  name="dataFiles"
                  accept=".xls,.xlsx"
                  multiple
                  onChange={handleDataFilesChange}
                  className="upload-input"
                  style={{ display: 'none' }}
                />
                
                <div className="upload-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <p>Upload File Data Excel</p>
                  <span className="upload-hint">Format: Excel (.xls, .xlsx) - Max 10MB per file<br/>
                  Data seperti: Curah Hujan, Korban, Kerusakan, dll.</span>
                </div>
              </div>

              {/* Data Files List */}
              {formData.dataFiles && formData.dataFiles.length > 0 && (
                <div className="supporting-files-list">
                  <h4>File Excel yang akan diupload:</h4>
                  {formData.dataFiles.map((file, index) => (
                    <div key={index} className="supporting-file-item">
                      <div className="file-info">
                        <svg className="file-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <div className="file-details">
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          const newFiles = [...formData.dataFiles];
                          newFiles.splice(index, 1);
                          setFormData(prev => ({ ...prev, dataFiles: newFiles }));
                        }}
                        className="remove-file-btn"
                        title="Hapus file"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

              {/* Longitude & Latitude */}
              <div className="form-group">
                <label>Longitude & Latitude *</label>
                <div className="coordinate-inputs">
                  <input
                    type="number"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Longitude (-180 to 180)"
                    step="0.000001"
                    min="-180"
                    max="180"
                    required
                  />

                  <input
                    type="number"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Latitude (-90 to 90)"
                    step="0.000001"
                    min="-90"
                    max="90"
                    required
                  />
                </div>
                <div className="coordinate-helper">
                  <small>Contoh: Jakarta (106.845, -6.208) | Yogyakarta (110.370, -7.797)</small>
                </div>
              </div>

              {/* Map Preview */}
              <div className="form-group">
                <label>Peta Lokasi</label>
                <div className="map-container">
                  <MapContainer
                    center={CENTER}
                    zoom={4}
                    minZoom={4}
                    maxBounds={BOUNDS}
                    maxBoundsViscosity={1.0}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Handler untuk klik pada peta */}
                    <MapClickHandler onLocationSelect={handleLocationSelect} />

                    {/* Marker yang bisa di-drag */}
                    <DraggableMarker 
                      position={markerPosition} 
                      onPositionChange={handleLocationSelect} 
                    />
                  </MapContainer>
                </div>
                <p className="map-instruction">
                  Klik pada peta untuk menandai lokasi atau seret marker yang sudah ada untuk mengubah posisi
                </p>

                {/* Coordinate Display */}
                {markerPosition && (
                  <div className="coordinate-display active">
                    Koordinat terpilih: {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={handleModalClose} 
                  className="btn-cancel"
                >
                  Batal
                </button>
                <button type="submit" className="btn-submit">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TableDataView;