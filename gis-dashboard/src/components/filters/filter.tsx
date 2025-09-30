// filter.tsx - Updated with risk-based visualization for Kerawanan
import React, { useState, useEffect } from 'react';
import './filter.css';
import {API_URL} from '../../api';

// Mapping dari selection ke tabel database - UPDATED
const TABLE_MAPPING = {
  // Kebencanaan - menggunakan tabel yang sudah ada
  'Kebencanaan.Kebakaran': 'areal_karhutla_2024',
  'Kebencanaan.Longsor': 'lahan_kritis',
  'Kebencanaan.Banjir': 'penutupan_lahan_2024',
  
  // Kerawanan - akan menggunakan risk analysis
  'Kerawanan.Kebakaran': 'risk_analysis',
  'Kerawanan.Longsor': 'risk_analysis', 
  'Kerawanan.Banjir': 'risk_analysis'
};

// Mapping layer names ke table names untuk Mitigasi/Adaptasi
const MITIGATION_TABLE_MAPPING = {
  'Peta Areal Karhutla': 'areal_karhutla_2024',
  'Peta Lahan Kritis': 'lahan_kritis',
  'Peta Penutupan Lahan': 'penutupan_lahan_2024',
  'Peta Rawan Karhutla': 'rawan_karhutla_2024',
  'Peta Rawan Erosi': 'rawan_erosi',
  'Peta Rawan Limpasan': 'rawan_limpasan',
};

// PERUBAHAN UTAMA: Update interface dengan prop onResetToMain
interface FilterProps {
  onFilterChange: (filterData: any) => void;
  onTabChange: (tab: string) => void;
  onResetToMain?: () => void; // TAMBAHAN: Prop baru untuk reset dari detail view
}

// PERUBAHAN UTAMA: Tambahkan onResetToMain ke destructuring
export function Filter({ onFilterChange, onTabChange, onResetToMain }: FilterProps) {
  // State untuk tab aktif (Kerawanan/Kebencanaan/Mitigasi)
  const [activeTab, setActiveTab] = useState<'Kerawanan' | 'Kebencanaan' | 'Mitigasi/Adaptasi'>('Kerawanan');
  
  // State untuk jenis bencana yang dipilih
  const [selectedDisaster, setSelectedDisaster] = useState<string | null>(null);
  
  // State untuk level lokasi yang dipilih
  const [activeLocationLevel, setActiveLocationLevel] = useState<'Provinsi' | 'Kabupaten/Kota' | 'Kecamatan' | 'DAS'>('Provinsi');
  
  // State untuk lokasi yang dipilih
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  
  // State untuk checkbox mitigasi (array of selected items)
  const [selectedMitigationLayers, setSelectedMitigationLayers] = useState<string[]>([]);
  
  // State untuk dropdown visibility
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showMitigationDropdown, setShowMitigationDropdown] = useState(false);
  
  // State untuk data lokasi
  const [locationData, setLocationData] = useState<{[key: string]: string[]}>({
    'Provinsi': [],
    'Kabupaten/Kota': [],
    'Kecamatan': [],
    'DAS': []
  });
  
  // State untuk search
  const [locationSearch, setLocationSearch] = useState('');

  // Load options dari server saat component mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    onTabChange(activeTab);
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (!target.closest('.dropdown-container')) {
        setShowLocationDropdown(false);
        setShowMitigationDropdown(false);
      }
    };

    if (showLocationDropdown || showMitigationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLocationDropdown, showMitigationDropdown]);

  const loadFilterOptions = async () => {
    try {
      // Load provinces
      const provincesResponse = await fetch('${API_URL}/api/filter/provinces');
      const provinces = await provincesResponse.json();
      console.log('Provinces data:', provinces);
      const provinceNames = provinces
        .map((p: any) => p.provinsi)
        .filter((name: any) => name && typeof name === 'string'); // Filter out null/undefined
      
      // Load kabupaten/kota
      const kabupatenResponse = await fetch('${API_URL}/api/filter/kabupaten');
      const kabupaten = await kabupatenResponse.json();
      console.log('Kabupaten data:', kabupaten);
      const kabupatenNames = kabupaten
        .map((k: any) => k.kab_kota)
        .filter((name: any) => name && typeof name === 'string'); // Filter out null/undefined
      
      // Load kecamatan
      const kecamatanResponse = await fetch('${API_URL}/api/filter/kecamatan');
      const kecamatan = await kecamatanResponse.json();
      console.log('Kecamatan data:', kecamatan);
      const kecamatanNames = kecamatan
        .map((k: any) => k.kecamatan)
        .filter((name: any) => name && typeof name === 'string'); // Filter out null/undefined
      
      // Load DAS
      const dasResponse = await fetch('${API_URL}/api/filter/das');
      const das = await dasResponse.json();
      console.log('DAS data:', das);
      const dasNames = das
        .map((d: any) => d.nama_das)
        .filter((name: any) => name && typeof name === 'string'); // Filter out null/undefined
      
      setLocationData({
        'Provinsi': provinceNames,
        'Kabupaten/Kota': kabupatenNames,
        'Kecamatan': kecamatanNames,
        'DAS': dasNames
      });
      
      console.log('Final location data set:', {
        'Provinsi': provinceNames.length,
        'Kabupaten/Kota': kabupatenNames.length,
        'Kecamatan': kecamatanNames.length,
        'DAS': dasNames.length
      });
      
    } catch (error) {
      console.error('Error loading filter options:', error);
      
      // Fallback data
      setLocationData({
        'Provinsi': ['DKI Jakarta', 'Jawa Tengah', 'Jawa Barat', 'Jawa Timur'],
        'Kabupaten/Kota': ['Kab. Banyumas', 'Kab. Purbalingga', 'Kota Semarang'],
        'Kecamatan': ['Kec. Purwokerto Utara', 'Kec. Purwokerto Selatan'],
        'DAS': ['DAS Serayu', 'DAS Bogowonto', 'DAS Pemali']
      });
    }
  };

  // Handle tab change
  const handleTabChange = (tab: 'Kerawanan' | 'Kebencanaan' | 'Mitigasi/Adaptasi') => {
    setActiveTab(tab);
    setSelectedDisaster(null);
    setSelectedLocation('');
    setSelectedMitigationLayers([]);
    setShowLocationDropdown(false);
    setShowMitigationDropdown(false);
    onFilterChange(null);
    onTabChange(tab);
  };

  // Handle disaster type selection
  const handleDisasterSelect = (disasterType: string) => {
    setSelectedDisaster(disasterType);
    setSelectedLocation('');
    setSelectedMitigationLayers([]);
    setShowLocationDropdown(false);
    setShowMitigationDropdown(false);
    
    if (selectedLocation && activeTab !== 'Mitigasi/Adaptasi') {
      applyFilter(disasterType, activeLocationLevel, selectedLocation);
    }
  };

  // Handle location level change
  const handleLocationLevelChange = (level: 'Provinsi' | 'Kabupaten/Kota' | 'Kecamatan' | 'DAS') => {
    setActiveLocationLevel(level);
    setSelectedLocation('');
    setSelectedMitigationLayers([]);
    setShowLocationDropdown(false);
    setShowMitigationDropdown(false);
    setLocationSearch('');
    onFilterChange(null);
  };

  // Handle location selection
  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setShowLocationDropdown(false);
    setLocationSearch('');
    
    if (selectedDisaster && activeTab !== 'Mitigasi/Adaptasi') {
      applyFilter(selectedDisaster, activeLocationLevel, location);
    } else if (activeTab === 'Mitigasi/Adaptasi') {
      setSelectedMitigationLayers([]);
      setShowMitigationDropdown(false);
      applyMitigationFilter('', activeLocationLevel, location, []);
    }
  };

  // Handle mitigation layer checkbox change
  const handleMitigationLayerChange = (layerName: string, checked: boolean) => {
    let newSelectedLayers;
    if (checked) {
      newSelectedLayers = [...selectedMitigationLayers, layerName];
    } else {
      newSelectedLayers = selectedMitigationLayers.filter(layer => layer !== layerName);
    }
    setSelectedMitigationLayers(newSelectedLayers);
    
    if (selectedLocation) {
      applyMitigationFilter('', activeLocationLevel, selectedLocation, newSelectedLayers);
    }
  };

  // UPDATED: Apply filter function with risk analysis for Kerawanan
  const applyFilter = (disasterType: string, locationLevel: string, location: string) => {
    if (!disasterType || !location) {
      onFilterChange(null);
      return;
    }

    console.log(`Applying filter: ${activeTab} - ${disasterType} - ${locationLevel} - ${location}`);

    if (activeTab === 'Kerawanan') {
      // For Kerawanan, use risk analysis based on kejadian data
      const filterQuery = {
        category: activeTab,
        disasterType,
        locationType: locationLevel,
        selectedValue: location,
        isRiskAnalysis: true,
        layers: [
          {
            endpoint: '/api/risk-analysis',
            type: 'risk',
            filter: { 
              disaster_type: disasterType,
              level: locationLevel,
              location_name: location
            }
          },
          // Add boundary layer for context
          {
            endpoint: getBoundaryEndpoint(locationLevel),
            type: 'boundary',
            filter: getBoundaryFilter(locationLevel, location)
          }
        ]
      };

      onFilterChange(filterQuery);
      
    } else if (activeTab === 'Kebencanaan') {
      // PERBAIKAN: For Kebencanaan, use existing logic with actual disaster data
      const path = `${activeTab}.${disasterType}`;
      const disasterTable = TABLE_MAPPING[path];
      
      if (!disasterTable) {
        console.error('Table not found for:', path);
        return;
      }

      // Skip kebakaran untuk sementara karena properties tidak lengkap
      if (disasterType === 'Kebakaran') {
        console.warn('Kebakaran filter belum tersedia - properties tidak lengkap');
        onFilterChange(null);
        return;
      }

      // PERBAIKAN: Hanya support Provinsi dan DAS untuk Kebencanaan
      if (locationLevel !== 'Provinsi' && locationLevel !== 'DAS') {
        console.warn(`Level ${locationLevel} belum didukung untuk Kebencanaan`);
        onFilterChange(null);
        return;
      }

      let filterQuery;
      
      if (locationLevel === 'Provinsi') {
        filterQuery = {
          category: activeTab,
          disasterType,
          disasterTable,
          locationType: locationLevel,
          selectedValue: location,
          layers: [
            // Layer 1: Boundary provinsi yang dipilih
            {
              endpoint: '/api/layers/provinsi',
              type: 'boundary',
              filter: { provinsi: location }
            },
            // Layer 2: Disaster data yang sesuai dengan provinsi
            {
              endpoint: `/api/layers/${disasterTable}`,
              type: 'disaster',
              filter: { 
                filterType: 'province',
                provinceName: location,
                disasterTable: disasterTable 
              }
            }
          ]
        };
      } else if (locationLevel === 'DAS') {
        filterQuery = {
          category: activeTab,
          disasterType,
          disasterTable,
          locationType: locationLevel,
          selectedValue: location,
          layers: [
            // Layer 1: Boundary DAS yang dipilih
            {
              endpoint: '/api/layers/das',
              type: 'boundary', 
              filter: { nama_das: location }
            },
            // Layer 2: Disaster data yang sesuai dengan DAS
            {
              endpoint: `/api/layers/${disasterTable}`,
              type: 'disaster',
              filter: {
                filterType: 'das',
                dasName: location,
                disasterTable: disasterTable
              }
            }
          ]
        };
      }

      console.log('Kebencanaan filter query:', filterQuery);
      onFilterChange(filterQuery);
    }
  };

  // Helper functions for boundary layers
  const getBoundaryEndpoint = (locationLevel: string) => {
    switch (locationLevel) {
      case 'Provinsi': return '/api/layers/provinsi';
      case 'Kabupaten/Kota': return '/api/layers/kab_kota';
      case 'Kecamatan': return '/api/layers/kecamatan';
      case 'DAS': return '/api/layers/das';
      default: return '/api/layers/provinsi';
    }
  };

  const getBoundaryFilter = (locationLevel: string, location: string) => {
    switch (locationLevel) {
      case 'Provinsi': return { provinsi: location };
      case 'Kabupaten/Kota': return { kab_kota: location };
      case 'Kecamatan': return { kecamatan: location };
      case 'DAS': return { nama_das: location };
      default: return { provinsi: location };
    }
  };

  // Apply mitigation filter (unchanged)
  const applyMitigationFilter = (disasterType: string, locationLevel: string, location: string, layers: string[]) => {
    if (!location) {
      onFilterChange(null);
      return;
    }

    console.log(`Applying mitigation filter: ${locationLevel} - ${location} - layers: ${layers.join(', ')}`);
    // Jika tidak ada layer yang dipilih, hanya tampilkan boundary
    if (layers.length === 0) {
      const filterQuery = {
        category: 'Mitigasi/Adaptasi',
        disasterType: '', // Kosong untuk mitigasi
        locationType: locationLevel,
        selectedValue: location,
        selectedLayers: layers,
        layers: [
          // Hanya boundary layer
          {
            endpoint: getBoundaryEndpoint(locationLevel),
            type: 'boundary',
            filter: getBoundaryFilter(locationLevel, location)
          }
        ]
      };
      onFilterChange(filterQuery);
      return;
    }

    // Dengan layer yang dipilih, buat mitigation layers
    const mitigationLayers = layers.map(layerName => {
      const tableName = MITIGATION_TABLE_MAPPING[layerName];

      if (!tableName) {
        console.error('Table mapping not found for layer:', layerName);
        return null;
      }

      return {
        endpoint: `/api/layers/${tableName}`,
        type: 'mitigation',
        layerName: layerName,
        tableName: tableName,
        filter: {
          filterType: locationLevel === 'Provinsi' ? 'province' : 'das',
          [locationLevel === 'Provinsi' ? 'provinceName' : 'dasName']: location
        }
      };
    }).filter(layer => layer !== null);

    const filterQuery = {
      category: 'Mitigasi/Adaptasi',
      disasterType: '', // Kosong untuk mitigasi
      locationType: locationLevel,
      selectedValue: location,
      selectedLayers: layers,
      layers: [
        //Boundary layer
        {
          endpoint: getBoundaryEndpoint(locationLevel),
          type: 'boundary',
          filter: getBoundaryFilter(locationLevel, location)
        },
        // Mitigation layers
        ...mitigationLayers
      ]
    };

    console.log('Mitigation filter query:', filterQuery);
    onFilterChange(filterQuery);
  };

  // PERUBAHAN UTAMA: Handle reset dengan callback ke parent component
  const handleReset = () => {
    setActiveTab('Kerawanan');
    setSelectedDisaster(null);
    setActiveLocationLevel('Provinsi');
    setSelectedLocation('');
    setSelectedMitigationLayers([]);
    setShowLocationDropdown(false);
    setShowMitigationDropdown(false);
    setLocationSearch('');
    
    // PERBAIKAN: Beritahu parent component untuk reset detail view juga
    if (onResetToMain) {
      onResetToMain();
    }
    
    onFilterChange(null);
    onTabChange('Kerawanan');
  };

  // Filter function for search
  const filteredLocations = (locationData[activeLocationLevel] || []).filter(location => {
    // Safety check: ensure location exists and is a string
    if (!location || typeof location !== 'string') {
      return false;
    }
    // Safety check: ensure locationSearch is a string
    const searchTerm = locationSearch || '';
    return location.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get placeholder text for dropdown
  const getDropdownPlaceholder = () => {
    // For Mitigasi/Adaptasi: no disaster selection required
    if (activeTab === 'Mitigasi/Adaptasi') {
      const placeholders = {
        'Provinsi': 'Pilih Provinsi',
        'Kabupaten/Kota': 'Pilih Kabupaten/Kota',
        'Kecamatan': 'Pilih Kecamatan',
        'DAS': 'Pilih DAS'
      };
      return placeholders[activeLocationLevel];
    }
    
    if (!selectedDisaster) {
      return 'Pilih jenis bencana terlebih dahulu';
    }
    
    // TAMBAHAN: Warning untuk level yang belum didukung di Kebencanaan
    if (activeTab === 'Kebencanaan' && (activeLocationLevel === 'Kabupaten/Kota' || activeLocationLevel === 'Kecamatan')) {
      return `${activeLocationLevel} belum didukung untuk Kebencanaan`;
    }
    
    // TAMBAHAN: Warning untuk kebakaran
    if (activeTab === 'Kebencanaan' && selectedDisaster === 'Kebakaran') {
      return 'Kebakaran belum tersedia (data tidak lengkap)';
    }
    
    const placeholders = {
      'Provinsi': 'Pilih Provinsi',
      'Kabupaten/Kota': 'Pilih Kabupaten/Kota',
      'Kecamatan': 'Pilih Kecamatan',
      'DAS': 'Pilih DAS'
    };
    return placeholders[activeLocationLevel];
  };

  // Get search placeholder text
  const getSearchPlaceholder = () => {
    const placeholders = {
      'Provinsi': 'Cari provinsi...',
      'Kabupaten/Kota': 'Cari kabupaten/kota...',
      'Kecamatan': 'Cari kecamatan...',
      'DAS': 'Cari DAS...'
    };
    return placeholders[activeLocationLevel];
  };

  // Get dropdown placeholder for mitigation layers
  const getMitigationDropdownPlaceholder = () => {
    if (!selectedLocation) {
      return 'Pilih lokasi terlebih dahulu';
    }
    if (selectedMitigationLayers.length === 0) {
      return 'Pilih Layer Peta';
    }
    if (selectedMitigationLayers.length === 1) {
      return `${selectedMitigationLayers[0]}`;
    }
    return `${selectedMitigationLayers.length} layer dipilih`;
  };

  // Helper function untuk check apakah kombinasi valid untuk Kebencanaan
  const isValidKebencanaan = () => {
    if (activeTab !== 'Kebencanaan') return true;
    
    // Kebakaran belum didukung
    if (selectedDisaster === 'Kebakaran') return false;
    
    // Hanya Provinsi dan DAS yang didukung
    if (activeLocationLevel !== 'Provinsi' && activeLocationLevel !== 'DAS') return false;
    
    return true;
  };

  // Disaster types for each tab
  const disasterTypes = [
    { key: 'Longsor', name: 'Longsor', icon: 'longsor.png' },
    { key: 'Banjir', name: 'Banjir', icon: 'banjir.png' },
    { key: 'Kebakaran', name: 'Kebakaran', icon: 'kebakaran.png' }
  ];

 // Location levels (UPDATED: Support hanya Provinsi dan DAS untuk Mitigasi/Adaptasi sementara)
  const locationLevels = activeTab === 'Mitigasi/Adaptasi' 
    ? [
        { key: 'Provinsi', name: 'Provinsi' },
        { key: 'DAS', name: 'DAS' }
      ]
    : [
        { key: 'Provinsi', name: 'Provinsi' },
        { key: 'Kabupaten/Kota', name: 'Kab/Kota' },
        { key: 'Kecamatan', name: 'Kecamatan' },
        { key: 'DAS', name: 'DAS' }
      ];

  // Mitigation layers list
  const mitigationLayers = [
    'Peta Areal Karhutla',
    'Peta Lahan Kritis',
    'Peta Penutupan Lahan',
    'Peta Rawan Karhutla',
    'Peta Rawan Erosi',
    'Peta Rawan Limpasan',
  ];

  return (
    <div className="filter-container-new">
      {/* Disaster Type Tabs */}
      <div className="filter-tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === 'Kerawanan' ? 'active' : ''}`}
          onClick={() => handleTabChange('Kerawanan')}
        >
          Kerawanan
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'Kebencanaan' ? 'active' : ''}`}
          onClick={() => handleTabChange('Kebencanaan')}
        >
          Kebencanaan
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'Mitigasi/Adaptasi' ? 'active' : ''}`}
          onClick={() => handleTabChange('Mitigasi/Adaptasi')}
        >
          Mitigasi/Adaptasi
        </button>
      </div>

      {/* Disaster Type Icons - Hide for Mitigasi/Adaptasi tab */}
      {activeTab !== 'Mitigasi/Adaptasi' && (
        <div className="disaster-icons">
          {disasterTypes.map((disaster) => (
            <button
              key={disaster.key}
              type="button"
              className={`disaster-icon ${selectedDisaster === disaster.key ? 'selected' : ''} ${
                activeTab === 'Kebencanaan' && disaster.key === 'Kebakaran' ? 'disabled' : ''
              }`}
              onClick={() => handleDisasterSelect(disaster.key)}
              title={activeTab === 'Kebencanaan' && disaster.key === 'Kebakaran' 
                ? 'Kebakaran belum tersedia untuk Kebencanaan' 
                : disaster.name}
              disabled={activeTab === 'Kebencanaan' && disaster.key === 'Kebakaran'}
            >
              <div className="icon-placeholder">
                <img 
                  src={`/images/${disaster.icon}`} 
                  alt={disaster.name}
                  width="40" 
                  height="40"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Location Level Tabs */}
      <div className="location-tabs">
        {locationLevels.map((level) => (
          <button
            key={level.key}
            type="button"
            className={`location-tab ${activeLocationLevel === level.key ? 'active' : ''} ${
              activeTab === 'Mitigasi/Adaptasi' ? '' :
              (!selectedDisaster || 
              (activeTab === 'Kebencanaan' && (level.key === 'Kabupaten/Kota' || level.key === 'Kecamatan')))
              ? 'disabled' : ''
            }`}
            onClick={() => {
              if (activeTab === 'Mitigasi/Adaptasi' || selectedDisaster) {
                handleLocationLevelChange(level.key as any);
              }
            }}
            disabled={
              activeTab === 'Mitigasi/Adaptasi' ? false :
              (!selectedDisaster || 
              (activeTab === 'Kebencanaan' && (level.key === 'Kabupaten/Kota' || level.key === 'Kecamatan')))
            }
            title={
              activeTab === 'Mitigasi/Adaptasi' ? `Pilih ${level.name}` :
              (!selectedDisaster ? 'Pilih jenis bencana terlebih dahulu' : 
              (activeTab === 'Kebencanaan' && (level.key === 'Kabupaten/Kota' || level.key === 'Kecamatan'))
              ? `${level.name} belum didukung untuk Kebencanaan` : `Pilih ${level.name}`)
            }
          >
            {level.name}
          </button>
        ))}
      </div>

      {/* Location Dropdown */}
      <div className="location-section">
        <div className="dropdown-container">
          <button
            type="button"
            className={`location-dropdown ${selectedLocation ? 'selected' : ''} ${showLocationDropdown ? 'open' : ''} ${
              // For Mitigasi/Adaptasi: only require location level selection
              // For other tabs: require disaster selection and valid combination
              activeTab === 'Mitigasi/Adaptasi' ? '' :
              (!selectedDisaster || !isValidKebencanaan()) ? 'disabled' : ''
            }`}
            onClick={() => {
              // For Mitigasi/Adaptasi: always allow if we have location level
              // For other tabs: require disaster selection and valid combination
              if (activeTab === 'Mitigasi/Adaptasi' || (selectedDisaster && isValidKebencanaan())) {
                setShowLocationDropdown(!showLocationDropdown);
              }
            }}
            disabled={
              activeTab === 'Mitigasi/Adaptasi' ? false :
              (!selectedDisaster || !isValidKebencanaan())
            }
          >
            <span>{selectedLocation || getDropdownPlaceholder()}</span>
            <svg className="dropdown-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
          
          {showLocationDropdown && (activeTab === 'Mitigasi/Adaptasi' || (selectedDisaster && isValidKebencanaan())) && (
            <div className="dropdown-menu">
              <div className="search-container">
                <input
                  type="text"
                  placeholder={getSearchPlaceholder()}
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="search-input"
                />
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="21 21l-4.35-4.35"/>
                </svg>
              </div>
              <div className="dropdown-options">
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((location) => (
                    <button
                      key={location}
                      type="button"
                      className={`dropdown-option ${selectedLocation === location ? 'selected' : ''}`}
                      onClick={() => handleLocationSelect(location)}
                    >
                      {location}
                    </button>
                  ))
                ) : (
                  <div className="no-results">Tidak ada hasil ditemukan</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mitigation Layers Dropdown - only show for Mitigasi/Adaptasi tab */}
      {activeTab === 'Mitigasi/Adaptasi' && (
        <div className="mitigation-section">
          <div className="dropdown-container">
            <button
              type="button"
              className={`mitigation-dropdown ${selectedMitigationLayers.length > 0 ? 'selected' : ''} ${showMitigationDropdown ? 'open' : ''} ${!selectedLocation ? 'disabled' : ''}`}
              onClick={() => {
                if (selectedLocation) {
                  setShowMitigationDropdown(!showMitigationDropdown);
                }
              }}
              disabled={!selectedLocation}
              title={!selectedLocation ? 'Pilih lokasi terlebih dahulu' : 'Pilih layer peta yang ingin ditampilkan'}
            >
              <span>{getMitigationDropdownPlaceholder()}</span>
              <svg className="dropdown-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
            
            {showMitigationDropdown && selectedLocation && (
              <div className="mitigation-dropdown-menu">
                <div className="mitigation-dropdown-header">
                  <span className="mitigation-dropdown-title">Pilih Layer Peta:</span>
                  <span className="mitigation-dropdown-counter">
                    {selectedMitigationLayers.length} dari {mitigationLayers.length} layer dipilih
                  </span>
                </div>
                <div className="mitigation-dropdown-options">
                  {mitigationLayers.map((layer) => (
                    <label
                      key={layer}
                      className="mitigation-dropdown-option"
                    >
                      <input
                        type="checkbox"
                        className="mitigation-checkbox"
                        checked={selectedMitigationLayers.includes(layer)}
                        onChange={(e) => handleMitigationLayerChange(layer, e.target.checked)}
                      />
                      <span className="mitigation-checkbox-text">{layer}</span>
                    </label>
                  ))}
                </div>
                {selectedMitigationLayers.length > 0 && (
                  <div className="mitigation-dropdown-footer">
                    <button
                      type="button"
                      className="clear-selection-btn"
                      onClick={() => {
                        setSelectedMitigationLayers([]);
                        if (selectedLocation) {
                          applyMitigationFilter('', activeLocationLevel, selectedLocation, []);
                        }
                      }}
                    >
                      Hapus Semua
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Button */}
      <div className="filter-footer">
        <button type="button" className="reset-btn" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default Filter;