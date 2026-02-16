import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {API_URL} from './api';
import Header from './header';

const Kerawanan = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null); 
  const layerGroupsRef = useRef({});
  const navigate = useNavigate();
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [isLoadingLayer, setIsLoadingLayer] = useState(false);
  const [loadingLayerNames, setLoadingLayerNames] = useState<Set<string>>(new Set());
  const [layerError, setLayerError] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const layerCacheRef = useRef<Map<string, any>>(new Map());
  const [hoveredLayerKey, setHoveredLayerKey] = useState<string | null>(null);
  const [hoveredLayerType, setHoveredLayerType] = useState<string | null>(null);
  const [hoveredLayerColor, setHoveredLayerColor] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<Array<{
    label: string;
    level: 'provinsi' | 'kabupaten' | 'kecamatan' | 'kelurahan';
    provinsi?: string;
    kab_kota?: string;
    kecamatan?: string;
    kel_desa?: string;
  }>>([]);
const [adminLevel, setAdminLevel] = useState<'provinsi' | 'kabupaten' | 'kecamatan' | 'kelurahan'>('provinsi');
const [areaSearchQuery, setAreaSearchQuery] = useState('');
const [areaSearchResults, setAreaSearchResults] = useState<Array<any>>([]);
const [showAreaSearchDropdown, setShowAreaSearchDropdown] = useState(false);
const [selectedDas, setSelectedDas] = useState<Array<{
  label: string;
  nama_das: string;
}>>([]);
const [dasSearchQuery, setDasSearchQuery] = useState('');
const [dasSearchResults, setDasSearchResults] = useState<Array<any>>([]);
const [showDasSearchDropdown, setShowDasSearchDropdown] = useState(false);
const [currentBounds, setCurrentBounds] = useState<[[number, number], [number, number]] | null>(null);
const [availableLayers, setAvailableLayers] = useState<{
  kerawanan: Array<{id: string, name: string}>,
  mitigasiAdaptasi: Array<{id: string, name: string}>,
  lainnya: Array<{id: string, name: string}>,
  kejadian: Array<{id: string, name: string, year: number}>
}>({
  kerawanan: [],
  mitigasiAdaptasi: [],
  lainnya: [],
  kejadian: []
});
  const [mapReady, setMapReady] = useState(false);
  const [insertProgress, setInsertProgress] = useState(0);
  const [insertStatus, setInsertStatus] = useState('');

  const [layerData, setLayerData] = useState<{
  kerawanan: Array<{id: string, name: string}>,
  mitigasiAdaptasi: Array<{id: string, name: string}>,
  lainnya: Array<{id: string, name: string}>,
  kejadian: Array<{id: string, name: string, year: number}> // Tambahan untuk kejadian
}>({
  kerawanan: [],
  mitigasiAdaptasi: [],
  lainnya: [],
  kejadian: []
});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentSection, setCurrentSection] = useState<'kerawanan' | 'mitigasiAdaptasi' | 'lainnya'>('kerawanan');
  const [newLayerName, setNewLayerName] = useState('');
  const [layerToDelete, setLayerToDelete] = useState<{section: string, id: string, name: string} | null>(null);
  const formatTableName = (tableName: string): string => {
    return tableName
      .split('_')
      .map(word => {
        // Capitalize first letter of each word
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };
  const [tutupanLahanData, setTutupanLahanData] = useState<Array<{
    pl2024_id: number;
    deskripsi_domain: string;
    luas_total: number;
    color?: string;
  }>>([]);

  const [penutupanLahan2024Data, setPenutupanLahan2024Data] = useState<Array<{
    pl2024_id: number;
    deskripsi_domain: string;
    luas_total: number;
    color?: string;
  }>>([]);

  const [pl2024Data, setPL2024Data] = useState<Array<{
    pl2024_id: number;
    deskripsi_domain: string;
    luas_total: number;
    color?: string;
  }>>([]);

  const [geologiData, setGeologiData] = useState<Array<{
    namobj: string;
    umurobj: string;
    keliling_total: number;
    color?: string;
  }>>([]);

  const [jenisTanahData, setJenisTanahData] = useState<Array<{
    jntnh1: string;
    color?: string;
  }>>([]);

  const [lahanKritisData, setLahanKritisData] = useState<Array<{
    kritis: string;
    luas_ha: number;
    color?: string;
  }>>([]);
  const [rawanErosiData, setRawanErosiData] = useState<Array<{
    tingkat: string;
    luas_ha: number;
    color?: string;
  }>>([]);
  const [rawanLongsorData, setRawanLongsorData] = useState<Array<{
    tingkat: string;
    luas_ha: number;
    color?: string;
  }>>([]);
  const [rawanLimpasanData, setRawanLimpasanData] = useState<Array<{
    tingkat: string;
    luas_ha: number;
    color?: string;
  }>>([]);
  const [rawanKarhutlaData, setRawanKarhutlaData] = useState<Array<{
    tingkat: string;
    luas_ha: number;
    color?: string;
  }>>([]);

  const colorMappingRef = useRef<{
    tutupanLahan: Map<string, string>;
    penutupanLahan2024: Map<string, string>;
    pl2024: Map<string, string>;
    geologi: Map<string, string>;
    jenisTanah: Map<string, string>;
    lahanKritis: Map<string, string>;
    rawanErosi: Map<string, string>;
    rawanLongsor: Map<string, string>;
    rawanLimpasan: Map<string, string>;
    rawanKarhutla: Map<string, string>;
  }>({
    tutupanLahan: new Map(),
    penutupanLahan2024: new Map(),
    pl2024: new Map(),
    geologi: new Map(),
    jenisTanah: new Map(),
    lahanKritis: new Map(),
    rawanErosi: new Map(),
    rawanLongsor: new Map(),
    rawanLimpasan: new Map(),
    rawanKarhutla: new Map()
  });

  const tutupanLahanColors = {
    'Hutan Lahan Kering Primer': '#00B050',
    'Hutan Lahan Kering Sekunder': '#92D050',
    'Hutan Rawa Primer': '#00B050',
    'Hutan Rawa Sekunder': '#92D050',
    'Hutan Mangrove Primer': '#70AD47',
    'Hutan Mangrove Sekunder': '#A9D08E',
    'Savana': '#FFFF00',
    'Hutan Tanaman': '#C6E0B4',
    'Perkebunan': '#E2EFDA',
    'Pertanian Lahan Kering': '#FFFF00',
    'Pertanian Lahan Kering Campur': '#FFFF00',
    'Permukiman Transmigrasi': '#548235',
    'Sawah': '#00FFFF',
    'Tambak': '#00B0F0',
    'Tanah Terbuka': '#FFC000',
    'Lahan Terbuka': '#FFC000',  // Tambahkan alias untuk Lahan Terbuka
    'Pertambangan': '#C00000',
    'Permukiman': '#7F7F7F',
    'Bandara/ Pelabuhan': '#FF00FF',
    'Rawa': '#BF8F00',
    'Awan': '#D9D9D9',
    'Semak Belukar': '#FFC000',
    'Semak Belukar Rawa': '#FFC000',
    'Tubuh Air': '#0070C0'
  };

  const geologiColors = [
  '#FF0000', // Red
  '#00FF00', // Lime
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#008000', // Green
  '#FFC0CB', // Pink
  '#A52A2A', // Brown
  '#000080', // Navy
  '#808000', // Olive
  '#00CED1', // Dark Turquoise
  '#FF6347', // Tomato
  '#4B0082', // Indigo
  '#FF1493', // Deep Pink
  '#32CD32', // Lime Green
  '#FF4500', // Orange Red
  '#9400D3', // Dark Violet
  '#FFD700', // Gold
  '#8B4513', // Saddle Brown
  '#20B2AA', // Light Sea Green
  '#DC143C', // Crimson
  '#7FFF00', // Chartreuse
  '#8A2BE2', // Blue Violet
  '#FF8C00', // Dark Orange
  '#00FA9A', // Medium Spring Green
  '#BA55D3', // Medium Orchid
  '#ADFF2F', // Green Yellow
  '#FF69B4', // Hot Pink
  '#1E90FF', // Dodger Blue
  '#CD5C5C', // Indian Red
  '#00BFFF', // Deep Sky Blue
  '#F08080', // Light Coral
  '#FFDAB9', // Peach Puff
  '#98FB98', // Pale Green
  '#DDA0DD', // Plum
  '#F0E68C', // Khaki
  '#E6E6FA', // Lavender
  '#FFE4B5', // Moccasin
  '#D8BFD8', // Thistle
  '#B0C4DE', // Light Steel Blue
  '#FFDEAD', // Navajo White
  '#F5DEB3', // Wheat
  '#FFA07A', // Light Salmon
  '#FA8072', // Salmon
  '#87CEEB', // Sky Blue
  '#B0E0E6', // Powder Blue
  '#FFB6C1'  // Light Pink
];

const jenisTanahColors = [
  '#8B4513', // Saddle Brown
  '#D2691E', // Chocolate
  '#CD853F', // Peru
  '#DEB887', // Burlywood
  '#F4A460', // Sandy Brown
  '#DAA520', // Goldenrod
  '#B8860B', // Dark Goldenrod
  '#BC8F8F', // Rosy Brown
  '#A0522D', // Sienna
  '#8B7355', // Burlywood4
  '#6B4423', // Dark Brown
  '#C19A6B', // Camel
  '#826644', // Raw Umber
  '#8B6914', // Dark Goldenrod4
  '#704214', // Sepia
  '#A0826D', // Beaver
  '#967969', // Pastel Brown
  '#8D4004', // Burnt Umber
  '#C9AE5D', // Camel Brown
  '#987654', // Tan
  '#9C661F', // Field Drab
  '#6F4E37', // Coffee
  '#B87333', // Copper
  '#8B7D6B', // Khaki
  '#896C39', // Bronze
  '#9B7653', // Café au Lait
  '#AA8866', // Desert Sand
  '#A67B5B', // Café
  '#C8AD7F', // Ecru
  '#8A795D', // Shadow
  '#654321', // Dark Brown
  '#966919', // Metallic Gold
  '#B5651D', // Light Brown
  '#A68064', // Clay
  '#C2B280', // Sand
  '#E1C699', // Desert
  '#D2B48C', // Tan
  '#BDB76B', // Dark Khaki
  '#F0E68C', // Khaki
  '#EEE8AA', // Pale Goldenrod
];

  // Warna untuk lahan kritis
  const lahanKritisColors = {
    'Sangat Kritis': '#FF0000',
    'Kritis': '#FFA500'
  };

  // Warna untuk rawan erosi (berdasarkan tingkat)
  const rawanErosiColors = {
    '<= 15 Ton/Ha/Tahun': '#90EE90',        // Sangat Rendah - Light Green
    '> 15 - 60 Ton/Ha/Tahun': '#FFFF00',   // Rendah - Yellow
    '> 60 - 180 Ton/Ha/Tahun': '#FFA500',  // Sedang - Orange
    '> 180 - 480 Ton/Ha/Tahun': '#FF0000', // Tinggi - Red
    '> 480 Ton/Ha/Tahun': '#8B0000'        // Sangat Tinggi - Dark Red
  };

  // Warna untuk rawan longsor
  const rawanLongsorColors = {
    'Tinggi': '#FF4500',
    'Sangat Rendah': '#90EE90',
    'Menengah': '#FFA500',
    'Rendah': '#FFFF00',
    'Danau': '#1E90FF',
    'Danau Tapal Kuda': '#4169E1',
    'Danau/Situ': '#00BFFF',
    'Waduk': '#4682B4',
    'Alur Aliran Bahan Rombakan': '#8B4513'
  };

  // Warna untuk rawan limpasan
  const rawanLimpasanColors = {
    'Ekstrim': '#8B0000',
    'Tinggi': '#FF0000',
    'Rendah': '#FFFF00',
    'Normal': '#90EE90'
  };

  // Warna untuk rawan karhutla
  const rawanKarhutlaColors = {
    'Sangat Tinggi': '#8B0000',
    'Tinggi': '#FF0000',
    'Sedang': '#FFA500',
    'Rendah': '#FFFF00'
  };

  const [kejadianPhotos, setKejadianPhotos] = useState<Array<{
    id: number;
    path: string;
    incident_type: string;
    incident_date: string;
    title: string;
    latitude: number;
    longitude: number;
  }>>([]);
  const [activeKejadianLayers, setActiveKejadianLayers] = useState<Map<string, {year: number, category: string}>>(new Map());
  const [kejadianListings, setKejadianListings] = useState<Array<any>>([]);

const loadLayerInBounds = async (tableName: string, customBounds?: [[number, number], [number, number]]) => {
  if (!mapInstanceRef.current || !window.L) {
    console.log('Map not ready');
    return;
  }

  try {
    setIsLoadingLayer(true);
    setLoadingLayerNames(prev => new Set([...prev, tableName]));
    setLayerError('');
    
    const zoom = mapInstanceRef.current.getZoom();
    let boundsString = '';
    
    const boundsToUse = customBounds || currentBounds;

    if (boundsToUse) {
      const [[minLat, minLng], [maxLat, maxLng]] = boundsToUse;
      boundsString = `${minLat},${minLng},${maxLat},${maxLng}`;
    } else {
      boundsString = '-11,95,6,141';
    }
    
    // Build URL dengan filter administrasi/DAS
    let url = `${API_URL}/api/layers/${tableName}/geojson?bounds=${boundsString}`;
    
    // Prioritas: DAS > Administrasi
    if (selectedDas.length > 0) {
      const dasNames = selectedDas.map(d => d.nama_das);
      url += `&dasFilter=${encodeURIComponent(JSON.stringify(dasNames))}`;
      console.log('🔄 Loading layer with DAS filtering:', tableName, dasNames);
    } else if (selectedAreas.length > 0) {
      const firstArea = selectedAreas[0];
      const adminLevel = firstArea.level;
      
      const adminNames = selectedAreas.map(area => {
        switch(area.level) {
          case 'provinsi':
            return area.provinsi!;
          case 'kabupaten':
            return area.kab_kota!;
          case 'kecamatan':
            return area.kecamatan!;
          case 'kelurahan':
            return area.kel_desa!;
          default:
            return '';
        }
      }).filter(name => name);
      
      url += `&adminFilter=${encodeURIComponent(JSON.stringify(adminNames))}`;
      url += `&adminLevel=${adminLevel}`;
      console.log('🔄 Loading layer with admin filtering:', tableName, adminLevel, adminNames);
    }
    
    console.log(`🔄 Memuat layer: ${tableName}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const geojsonData = await response.json();
    console.log('✅ GeoJSON data received for', tableName, ':', geojsonData.features?.length || 0, 'features');
    
    // Hapus layer lama
    if (layerGroupsRef.current[tableName]) {
      mapInstanceRef.current.removeLayer(layerGroupsRef.current[tableName]);
    }
    
    if (!geojsonData.features || geojsonData.features.length === 0) {
      console.warn('ℹ️ No features found for:', tableName);
      setLayerError(`ℹ️ Tidak ada data "${tableName}" di area yang dipilih.`);
      setTimeout(() => setLayerError(''), 5000);
      layerGroupsRef.current[tableName] = window.L.layerGroup();
      layerGroupsRef.current[tableName].addTo(mapInstanceRef.current);
      setLoadingLayerNames(prev => {
        const next = new Set(prev);
        next.delete(tableName);
        return next;
      });
      setIsLoadingLayer(loadingLayerNames.size > 1);
      return;
    }
    
    // Build color map
    let colorMap = new Map();
    
    if (tableName === 'tutupan_lahan') {
      const fetchedData = await fetchTutupanLahanData();
      
      // Create mapping from deskripsi_domain to color
      const deskripsiToColorMap = new Map<string, string>();
      fetchedData.forEach((item: any) => {
        const color = tutupanLahanColors[item.deskripsi_domain] || '#999999';
        if (!deskripsiToColorMap.has(item.deskripsi_domain)) {
          deskripsiToColorMap.set(item.deskripsi_domain, color);
        }
      });
      
      // Assign colors based on deskripsi_domain from GeoJSON properties
      geojsonData.features.forEach((feature: any) => {
        const deskripsi = feature.properties.deskripsi_domain;
        const pl2024_id = String(feature.properties.pl2024_id);
        
        // Try to get color from map first, then directly from tutupanLahanColors
        let color = deskripsiToColorMap.get(deskripsi);
        if (!color) {
          color = tutupanLahanColors[deskripsi] || '#999999';
        }
        
        colorMap.set(pl2024_id, color);
        colorMappingRef.current.tutupanLahan.set(pl2024_id, color);
      });
      
    } else if (tableName === 'penutupan_lahan_2024') {
      const fetchedData = await fetchPenutupanLahan2024Data();
      
      // Create mapping from deskripsi_domain to color
      const deskripsiToColorMap = new Map<string, string>();
      fetchedData.forEach((item: any) => {
        const color = tutupanLahanColors[item.deskripsi_domain] || '#999999';
        if (!deskripsiToColorMap.has(item.deskripsi_domain)) {
          deskripsiToColorMap.set(item.deskripsi_domain, color);
        }
      });
      
      // Assign colors based on deskripsi_domain from GeoJSON properties
      geojsonData.features.forEach((feature: any) => {
        const deskripsi = feature.properties.deskripsi_domain;
        const pl2024_id = String(feature.properties.pl2024_id);
        
        // Try to get color from map first, then directly from tutupanLahanColors
        let color = deskripsiToColorMap.get(deskripsi);
        if (!color) {
          color = tutupanLahanColors[deskripsi] || '#999999';
        }
        
        colorMap.set(pl2024_id, color);
        colorMappingRef.current.penutupanLahan2024.set(pl2024_id, color);
      });
      
    } else if (tableName === 'pl2024') {
      const fetchedData = await fetchPL2024();
      
      // Create mapping from deskripsi_domain to color
      const deskripsiToColorMap = new Map<string, string>();
      fetchedData.forEach((item: any) => {
        const color = tutupanLahanColors[item.deskripsi_domain] || '#999999';
        if (!deskripsiToColorMap.has(item.deskripsi_domain)) {
          deskripsiToColorMap.set(item.deskripsi_domain, color);
        }
      });
      
      // Assign colors based on deskripsi_domain from GeoJSON properties
      geojsonData.features.forEach((feature: any) => {
        const deskripsi = feature.properties.deskripsi_domain;
        const pl2024_id = String(feature.properties.pl2024_id);
        
        // Try to get color from map first, then directly from tutupanLahanColors
        let color = deskripsiToColorMap.get(deskripsi);
        if (!color) {
          color = tutupanLahanColors[deskripsi] || '#999999';
        }
        
        colorMap.set(pl2024_id, color);
        colorMappingRef.current.pl2024.set(pl2024_id, color);
      });
      
    } else if (tableName === 'geologi') {
      const uniqueCombinations = new Map<string, {namobj: string, umurobj: string}>();
      
      geojsonData.features.forEach((feature: any) => {
        const namobj = feature.properties.namobj || '';
        const umurobj = feature.properties.umurobj || '';
        const key = `${namobj}|${umurobj}`;
        
        if (!uniqueCombinations.has(key)) {
          uniqueCombinations.set(key, { namobj, umurobj });
        }
      });
      
      const sortedKeys = Array.from(uniqueCombinations.keys()).sort();
      sortedKeys.forEach((key) => {
        if (!colorMappingRef.current.geologi.has(key)) {
          const colorIndex = colorMappingRef.current.geologi.size;
          const color = geologiColors[colorIndex % geologiColors.length];
          colorMappingRef.current.geologi.set(key, color);
        }
        colorMap.set(key, colorMappingRef.current.geologi.get(key)!);
      });
      
      const aggregatedData: any[] = [];
      const aggregateMap = new Map<string, number>();
      
      geojsonData.features.forEach((feature: any) => {
        const namobj = feature.properties.namobj || '';
        const umurobj = feature.properties.umurobj || '';
        const keliling = parseFloat(feature.properties.keliling_m || 0);
        const key = `${namobj}|${umurobj}`;
        
        if (aggregateMap.has(key)) {
          aggregateMap.set(key, aggregateMap.get(key)! + keliling);
        } else {
          aggregateMap.set(key, keliling);
        }
      });
      
      sortedKeys.forEach(key => {
        const [namobj, umurobj] = key.split('|');
        aggregatedData.push({
          namobj,
          umurobj,
          keliling_total: aggregateMap.get(key) || 0,
          color: colorMappingRef.current.geologi.get(key)
        });
      });
      
      setGeologiData(aggregatedData);
      
    } else if (tableName === 'jenis_tanah') {
      const uniqueJenisTanah = new Set<string>();
      
      geojsonData.features.forEach((feature: any) => {
        const jntnh1 = feature.properties.jntnh1 || '';
        if (jntnh1) {
          uniqueJenisTanah.add(jntnh1);
        }
      });
      
      const sortedJenisTanah = Array.from(uniqueJenisTanah).sort();
      sortedJenisTanah.forEach((jntnh1) => {
        if (!colorMappingRef.current.jenisTanah.has(jntnh1)) {
          const colorIndex = colorMappingRef.current.jenisTanah.size;
          const color = jenisTanahColors[colorIndex % jenisTanahColors.length];
          colorMappingRef.current.jenisTanah.set(jntnh1, color);
        }
        colorMap.set(jntnh1, colorMappingRef.current.jenisTanah.get(jntnh1)!);
      });
      
      const aggregatedData: any[] = [];
      sortedJenisTanah.forEach(jntnh1 => {
        aggregatedData.push({
          jntnh1,
          color: colorMappingRef.current.jenisTanah.get(jntnh1)
        });
      });
      
      setJenisTanahData(aggregatedData);
      
    } else if (tableName === 'lahan_kritis') {
      const kritisMap = new Map<string, number>();
      
      geojsonData.features.forEach((feature: any) => {
        const kritis = feature.properties.kritis || '';
        const luas = parseFloat(feature.properties.luas_ha) || 0;
        
        if (kritis) {
          kritisMap.set(kritis, (kritisMap.get(kritis) || 0) + luas);
        }
      });
      
      const kritisArray = Array.from(kritisMap.entries()).map(([kritis, luas_ha]) => ({
        kritis: kritis,
        luas_ha: luas_ha,
        color: lahanKritisColors[kritis] || '#808080'
      }));
      
      const kritisOrder = ['Sangat Kritis', 'Kritis'];
      kritisArray.sort((a, b) => {
        return kritisOrder.indexOf(a.kritis) - kritisOrder.indexOf(b.kritis);
      });
      
      setLahanKritisData(kritisArray);
      
      kritisArray.forEach(item => {
        colorMap.set(item.kritis, item.color!);
        colorMappingRef.current.lahanKritis.set(item.kritis, item.color!);
      });
      
    } else if (tableName === 'rawan_erosi') {
  const keteranganMap = new Map<string, number>();
  
  console.log('🔍 [RAWAN EROSI] Processing features:', geojsonData.features.length);
  
  if (geojsonData.features.length > 0) {
    console.log('📋 [RAWAN EROSI] Sample feature properties:', geojsonData.features[0].properties);
  }
  
  geojsonData.features.forEach((feature: any) => {
    const kls_a = feature.properties.kls_a || '';
    const keterangan = feature.properties.keterangan || '';
    const n_a = parseFloat(feature.properties.n_a) || 0;
    
    if (keterangan && kls_a) {
      // Sum n_a berdasarkan keterangan yang sama
      keteranganMap.set(keterangan, (keteranganMap.get(keterangan) || 0) + n_a);
    }
  });
  
  console.log('📊 [RAWAN EROSI] Keterangan found:', Array.from(keteranganMap.keys()));
  console.log('📊 [RAWAN EROSI] Sum n_a per keterangan:', Array.from(keteranganMap.entries()));
  
  const erosiArray = Array.from(keteranganMap.entries()).map(([keterangan, n_a]) => {
    const color = rawanErosiColors[keterangan] || '#808080';
    console.log(`🎨 [RAWAN EROSI] Keterangan: "${keterangan}" -> n_a: ${n_a.toFixed(2)} -> Color: ${color}`);
    
    return {
      tingkat: keterangan,
      luas_ha: n_a,  // Menggunakan n_a sebagai luas
      color: color
    };
  });
  
  // Sort berdasarkan urutan severity (dari tinggi ke rendah)
  const keteranganOrder = [
    '> 480 Ton/Ha/Tahun',
    '> 180 - 480 Ton/Ha/Tahun',
    '> 60 - 180 Ton/Ha/Tahun',
    '> 15 - 60 Ton/Ha/Tahun',
    '<= 15 Ton/Ha/Tahun'
  ];
  
  erosiArray.sort((a, b) => {
    return keteranganOrder.indexOf(a.tingkat) - keteranganOrder.indexOf(b.tingkat);
  });
  
  console.log('✅ [RAWAN EROSI] Final data:', erosiArray);
  
  setRawanErosiData(erosiArray);
  
  erosiArray.forEach(item => {
    colorMap.set(item.tingkat, item.color!);
    colorMappingRef.current.rawanErosi.set(item.tingkat, item.color!);
  });
  
} else if (tableName === 'rawan_longsor') {
      const unsurMap = new Map<string, number>();
      
      geojsonData.features.forEach((feature: any) => {
        const unsur = feature.properties.unsur || '';
        const luas = parseFloat(feature.properties.shape_area) || 0;
        
        if (unsur) {
          unsurMap.set(unsur, (unsurMap.get(unsur) || 0) + luas);
        }
      });
      
      const longsorArray = Array.from(unsurMap.entries()).map(([tingkat, luas_ha]) => ({
        tingkat: tingkat,
        luas_ha: luas_ha,
        color: rawanLongsorColors[tingkat] || '#808080'
      }));
      
      const unsurOrder = ['Tinggi', 'Menengah', 'Rendah', 'Sangat Rendah', 'Danau', 'Danau Tapal Kuda', 'Danau/Situ', 'Waduk', 'Alur Aliran Bahan Rombakan'];
      longsorArray.sort((a, b) => {
        const aIdx = unsurOrder.indexOf(a.tingkat);
        const bIdx = unsurOrder.indexOf(b.tingkat);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
      
      setRawanLongsorData(longsorArray);
      
      longsorArray.forEach(item => {
        colorMap.set(item.tingkat, item.color!);
        colorMappingRef.current.rawanLongsor.set(item.tingkat, item.color!);
      });
      
    } else if (tableName === 'rawan_limpasan') {
      const limpasanMap = new Map<string, number>();
      
      geojsonData.features.forEach((feature: any) => {
        const limpasan = feature.properties.limpasan || '';
        const luas = parseFloat(feature.properties.shape_leng) || 0;
        
        if (limpasan) {
          limpasanMap.set(limpasan, (limpasanMap.get(limpasan) || 0) + luas);
        }
      });
      
      const limpasanArray = Array.from(limpasanMap.entries()).map(([tingkat, luas_ha]) => ({
        tingkat: tingkat,
        luas_ha: luas_ha,
        color: rawanLimpasanColors[tingkat] || '#808080'
      }));
      
      const limpasanOrder = ['Ekstrim', 'Tinggi', 'Rendah', 'Normal'];
      limpasanArray.sort((a, b) => {
        return limpasanOrder.indexOf(a.tingkat) - limpasanOrder.indexOf(b.tingkat);
      });
      
      setRawanLimpasanData(limpasanArray);
      
      limpasanArray.forEach(item => {
        colorMap.set(item.tingkat, item.color!);
        colorMappingRef.current.rawanLimpasan.set(item.tingkat, item.color!);
      });
      
    } else if (tableName === 'rawan_karhutla') {
      const kelasMap = new Map<string, number>();
      
      geojsonData.features.forEach((feature: any) => {
        const kelas = feature.properties.kelas || '';
        const luas = parseFloat(feature.properties.luas_ha) || 0;
        
        if (kelas) {
          kelasMap.set(kelas, (kelasMap.get(kelas) || 0) + luas);
        }
      });
      
      const karhutlaArray = Array.from(kelasMap.entries()).map(([tingkat, luas_ha]) => ({
        tingkat: tingkat,
        luas_ha: luas_ha,
        color: rawanKarhutlaColors[tingkat] || '#808080'
      }));
      
      const kelasOrder = ['Sangat Tinggi', 'Tinggi', 'Sedang', 'Rendah'];
      karhutlaArray.sort((a, b) => {
        return kelasOrder.indexOf(a.tingkat) - kelasOrder.indexOf(b.tingkat);
      });
      
      setRawanKarhutlaData(karhutlaArray);
      
      karhutlaArray.forEach(item => {
        colorMap.set(item.tingkat, item.color!);
        colorMappingRef.current.rawanKarhutla.set(item.tingkat, item.color!);
      });
    }
    
    // Styling function
    let styleFunction;
    
    if (tableName === 'tutupan_lahan') {
      styleFunction = function(feature: any) {
        const pl2024_id = String(feature.properties.pl2024_id);
        const fillColor = colorMap.get(pl2024_id) || '#EF4444';
        
        return {
          color: fillColor,
          weight: zoom > 10 ? 2 : 1,
          opacity: 0.8,
          fillColor: fillColor,
          fillOpacity: zoom > 10 ? 0.4 : 0.3
        };
      };
    } else if (tableName === 'pl2024') {
      styleFunction = function(feature: any) {
        const pl2024_id = String(feature.properties.pl2024_id);
        const fillColor = colorMap.get(pl2024_id) || '#EF4444';
        
        return {
          color: fillColor,
          weight: zoom > 10 ? 2 : 1,
          opacity: 0.8,
          fillColor: fillColor,
          fillOpacity: zoom > 10 ? 0.4 : 0.3
        };
      };
    } else if (tableName === 'penutupan_lahan_2024') {
      styleFunction = function(feature: any) {
        const pl2024_id = String(feature.properties.pl2024_id);
        const fillColor = colorMap.get(pl2024_id) || '#EF4444';
        
        return {
          color: fillColor,
          weight: zoom > 10 ? 2 : 1,
          opacity: 0.8,
          fillColor: fillColor,
          fillOpacity: zoom > 10 ? 0.4 : 0.3
        };
      };
    } else if (tableName === 'geologi') {
      styleFunction = function(feature: any) {
        const namobj = feature.properties.namobj || '';
        const umurobj = feature.properties.umurobj || '';
        const key = `${namobj}|${umurobj}`;
        const fillColor = colorMap.get(key) || '#B45309';
        
        return {
          color: fillColor,
          weight: zoom > 10 ? 2 : 1,
          opacity: 0.8,
          fillColor: fillColor,
          fillOpacity: zoom > 10 ? 0.4 : 0.3
       };
      };
    } else if (tableName === 'jenis_tanah') {
      styleFunction = function(feature: any) {
        const jntnh1 = feature.properties.jntnh1 || '';
        const fillColor = colorMap.get(jntnh1) || '#8B4513';
        
        return {
          color: fillColor,
          weight: zoom > 10 ? 2 : 1,
          opacity: 0.8,
          fillColor: fillColor,
          fillOpacity: zoom > 10 ? 0.4 : 0.3
        };
      };
    } else if (tableName === 'lahan_kritis') {
      styleFunction = function(feature: any) {
        const kritis = feature.properties.kritis || '';
        const fillColor = colorMap.get(kritis) || '#808080';
        return {
          color: fillColor,
          fillColor: fillColor,
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.5
        };
      };
    } else if (tableName === 'rawan_erosi') {
      styleFunction = function(feature: any) {
        const keterangan = feature.properties.keterangan || '';
        const fillColor = colorMap.get(keterangan) || '#808080';
        
        return {
          color: fillColor,
          fillColor: fillColor,
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.5
        };
      };
    } else if (tableName === 'rawan_longsor') {
      styleFunction = function(feature: any) {
        const unsur = feature.properties.unsur || '';
        const fillColor = colorMap.get(unsur) || '#808080';
        return {
          color: fillColor,
          fillColor: fillColor,
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.5
        };
      };
    } else if (tableName === 'rawan_limpasan') {
      styleFunction = function(feature: any) {
        const limpasan = feature.properties.limpasan || '';
        const fillColor = colorMap.get(limpasan) || '#808080';
        return {
          color: fillColor,
          fillColor: fillColor,
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.5
        };
      };
    } else if (tableName === 'rawan_karhutla') {
      styleFunction = function(feature: any) {
        const kelas = feature.properties.kelas || '';
        const fillColor = colorMap.get(kelas) || '#808080';
        return {
          color: fillColor,
          fillColor: fillColor,
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.5
        };
      };
    // } else {
    //   const tableColor = getColorForTable(tableName);
    //   styleFunction = function(feature: any) {
    //     return {
    //       color: tableColor,
    //       weight: zoom > 10 ? 2 : 1,
    //       opacity: 0.8,
    //       fillOpacity: zoom > 10 ? 0.4 : 0.3
    //     };
    } else {
  // Untuk layer umum, beri warna berbeda per feature
  styleFunction = function(feature: any) {
    // Ambil warna berdasarkan property tertentu, misal: gid, id, atau nama
    let featureIdentifier = feature.properties.gid || 
                           feature.properties.id || 
                           feature.properties.nama || 
                           feature.properties.name ||
                           JSON.stringify(feature.properties); // fallback: gunakan semua properties
    
    // Hash untuk mendapatkan warna unik per feature
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80', 
      '#EC7063', '#5DADE2', '#F1948A', '#73C6B6', '#F39C12',
      '#AED6F1', '#F8C471', '#82E0AA', '#E59866', '#D7BDE2'
    ];
    
    let hash = 0;
    const str = String(featureIdentifier);
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const featureColor = colors[colorIndex];
    
    return {
      color: featureColor,
      weight: zoom > 10 ? 2 : 1,
      opacity: 0.8,
      fillOpacity: zoom > 10 ? 0.4 : 0.3
    };
      };
    }
    
    // Buat layer group
    const layerGroup = window.L.geoJSON(geojsonData, {
      pane: 'overlayPane',
      style: styleFunction,
      pointToLayer: function(feature, latlng) {
        const tableColor = getColorForTable(tableName);
        return window.L.circleMarker(latlng, {
          radius: zoom > 10 ? 6 : 4,
          fillColor: tableColor,
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.7
        });
      },
      onEachFeature: function(feature, layer) {
        if (zoom > 8 && feature.properties) {
          let popupContent = '<div style="max-height: 200px; overflow-y: auto;">';
          popupContent += `<h3 style="margin: 0 0 8px 0; font-weight: bold;">${tableName}</h3>`;
          for (const [key, value] of Object.entries(feature.properties)) {
            if (key !== 'geom' && key !== 'geometry') {
              popupContent += `<p style="margin: 2px 0;"><strong>${key}:</strong> ${value}</p>`;
            }
          }
          popupContent += '</div>';
          layer.bindPopup(popupContent);
        }
      }
    });
    
    layerGroup.addTo(mapInstanceRef.current);

    layerCacheRef.current.set(tableName, layerGroup);
    
    // Cek apakah layer ini punya bottom tab
    const hasBottomTab = layersWithBottomTabs.includes(tableName);
    
    // Jika layer punya bottom tab, hanya tampilkan jika sesuai dengan activeBottomTab
    if (hasBottomTab) {
      // Mapping dari tableName ke tab id
      const tabMapping: Record<string, string> = {
        'tutupan_lahan': 'tutupanLahan',
        'penutupan_lahan_2024': 'penutupanLahan2024',
        'pl2024': 'pl2024',
        'jenis_tanah': 'jenisTanah',
        'geologi': 'geologi',
        'lahan_kritis': 'lahan_kritis',
        'rawan_erosi': 'rawan_erosi',
        'rawan_longsor': 'rawan_longsor',
        'rawan_limpasan': 'rawan_limpasan',
        'rawan_karhutla': 'rawan_karhutla'
      };
      
      const correspondingTab = tabMapping[tableName];
      
      // Hanya add ke map jika tab nya sedang aktif
      if (correspondingTab === activeBottomTab) {
        layerGroup.addTo(mapInstanceRef.current);
        console.log(`✅ Layer "${tableName}" ditampilkan (sesuai active tab)`);
      } else {
        console.log(`💾 Layer "${tableName}" disimpan di cache (tab tidak aktif)`);
      }
    } else {
      // Layer tanpa bottom tab langsung ditampilkan
      layerGroup.addTo(mapInstanceRef.current);
      console.log(`✅ Layer "${tableName}" ditampilkan (no bottom tab)`);
    }

    layerGroupsRef.current[tableName] = layerGroup;

    const filterType = selectedDas.length > 0 ? 'DAS filtering' : 
                       selectedAreas.length > 0 ? 'Admin filtering' : 
                       currentBounds ? 'bounds filtering' : 'no filtering';
    console.log(`✅ Layer "${tableName}" berhasil dimuat dengan ${filterType} (${geojsonData.features.length} features)`);
    
  } catch (error) {
    console.error('❌ Error loading layer:', error);
    
    let errorMessage = '';
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = `🔌 Koneksi error: Tidak dapat terhubung ke server untuk layer "${tableName}".`;
    } else if (error instanceof Error && error.message.includes('HTTP')) {
      errorMessage = `❌ Server error: ${error.message} untuk layer "${tableName}".`;
    } else {
      errorMessage = `❌ Error memuat layer "${tableName}": ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    
    setLayerError(errorMessage);
    
    setTimeout(() => {
      setLayerError('');
    }, 10000);
  } finally {
    setLoadingLayerNames(prev => {
      const next = new Set(prev);
      next.delete(tableName);
      return next;
    });
    // Update isLoadingLayer based on remaining loading layers
    setTimeout(() => {
      setIsLoadingLayer(loadingLayerNames.size > 0);
    }, 0);
  }
};

  const searchAreas = async (query: string) => {
  if (query.trim().length < 2) {
    setAreaSearchResults([]);
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/areas/search?query=${encodeURIComponent(query)}&level=${adminLevel}`
    );
    const data = await response.json();
    setAreaSearchResults(data);
    setShowAreaSearchDropdown(true);
  } catch (error) {
    console.error('Error searching areas:', error);
    setAreaSearchResults([]);
  }
};

useEffect(() => {
  const checkExistingSession = async () => {
    const token = localStorage.getItem('adminToken');
    const userStr = localStorage.getItem('adminUser');
    
    if (token && userStr) {
      try {
        const response = await fetch(`${API_URL}/api/admin/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (data.success) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setIsAuthenticated(false);
      }
    }
  };

  checkExistingSession();
}, []);

useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // List layer yang merupakan data layer (bukan boundary)
    const dataLayers = [
      'tutupan_lahan',
      'penutupan_lahan_2024',
      'pl2024', 
      'geologi', 
      'jenis_tanah', 
      'lahan_kritis', 
      'rawan_erosi', 
      'rawan_longsor', 
      'rawan_limpasan', 
      'rawan_karhutla'
    ];

    // Jika ada layer yang sebelumnya di-hover, reset hanya layer tersebut
    if (hoveredLayerType && dataLayers.includes(hoveredLayerType)) {
      const layerGroup = layerGroupsRef.current[hoveredLayerType];
      if (layerGroup) {
        layerGroup.eachLayer((layer: any) => {
          if (layer.setStyle && layer.feature) {
            const zoom = mapInstanceRef.current.getZoom();
            
            // Get original color from layer
            let originalColor = '#3b82f6'; // default color
            
            if (hoveredLayerType === 'tutupan_lahan') {
              const pl2024_id = String(layer.feature.properties.pl2024_id);
              originalColor = colorMappingRef.current.tutupanLahan.get(pl2024_id) || '#3b82f6';
            } else if (hoveredLayerType === 'penutupan_lahan_2024') {
              const pl2024_id = String(layer.feature.properties.pl2024_id);
              originalColor = colorMappingRef.current.penutupanLahan2024.get(pl2024_id) || '#3b82f6';
            } else if (hoveredLayerType === 'pl2024') {
              const pl2024_id = String(layer.feature.properties.pl2024_id);
              originalColor = colorMappingRef.current.pl2024.get(pl2024_id) || '#3b82f6';
            } else if (hoveredLayerType === 'geologi') {
              const key = `${layer.feature.properties.namobj || ''}|${layer.feature.properties.umurobj || ''}`;
              originalColor = colorMappingRef.current.geologi.get(key) || '#B45309';
            } else if (hoveredLayerType === 'jenis_tanah') {
              originalColor = colorMappingRef.current.jenisTanah.get(layer.feature.properties.jntnh1) || '#8B4513';
            } else if (hoveredLayerType === 'lahan_kritis') {
              originalColor = colorMappingRef.current.lahanKritis.get(layer.feature.properties.kritis) || '#808080';
            } else if (hoveredLayerType === 'rawan_erosi') {
              originalColor = colorMappingRef.current.rawanErosi.get(layer.feature.properties.keterangan) || '#808080';
            } else if (hoveredLayerType === 'rawan_longsor') {
              originalColor = colorMappingRef.current.rawanLongsor.get(layer.feature.properties.unsur) || '#808080';
            } else if (hoveredLayerType === 'rawan_limpasan') {
              originalColor = colorMappingRef.current.rawanLimpasan.get(layer.feature.properties.limpasan) || '#808080';
            } else if (hoveredLayerType === 'rawan_karhutla') {
              originalColor = colorMappingRef.current.rawanKarhutla.get(layer.feature.properties.kelas) || '#808080';
            }
            
            // Apply normal style with original color
            layer.setStyle({
              color: originalColor,
              weight: zoom > 10 ? 2 : 1,
              opacity: 0.8,
              fillColor: originalColor,
              fillOpacity: zoom > 10 ? 0.4 : 0.3
            });
          }
        });
      }
    }

    // Jika ada yang di-hover saat ini, highlight layer tersebut
    if (hoveredLayerKey && hoveredLayerType && hoveredLayerColor && dataLayers.includes(hoveredLayerType)) {
      const layerGroup = layerGroupsRef.current[hoveredLayerType];
      if (layerGroup) {
        layerGroup.eachLayer((layer: any) => {
          if (layer.feature && layer.setStyle) {
            let shouldHighlight = false;

            // Tentukan apakah layer ini yang harus di-highlight
            if (hoveredLayerType === 'tutupan_lahan') {
              shouldHighlight = String(layer.feature.properties.pl2024_id) === hoveredLayerKey;
            } else if (hoveredLayerType === 'penutupan_lahan_2024') {
              shouldHighlight = String(layer.feature.properties.pl2024_id) === hoveredLayerKey;
            } else if (hoveredLayerType === 'pl2024') {
              shouldHighlight = String(layer.feature.properties.pl2024_id) === hoveredLayerKey;
            } else if (hoveredLayerType === 'geologi') {
              const key = `${layer.feature.properties.namobj || ''}|${layer.feature.properties.umurobj || ''}`;
              shouldHighlight = key === hoveredLayerKey;
            } else if (hoveredLayerType === 'jenis_tanah') {
              shouldHighlight = layer.feature.properties.jntnh1 === hoveredLayerKey;
            } else if (hoveredLayerType === 'lahan_kritis') {
              shouldHighlight = layer.feature.properties.kritis === hoveredLayerKey;
            } else if (hoveredLayerType === 'rawan_erosi') {
              shouldHighlight = layer.feature.properties.keterangan === hoveredLayerKey;
            } else if (hoveredLayerType === 'rawan_longsor') {
              shouldHighlight = layer.feature.properties.unsur === hoveredLayerKey;
            } else if (hoveredLayerType === 'rawan_limpasan') {
              shouldHighlight = layer.feature.properties.limpasan === hoveredLayerKey;
            } else if (hoveredLayerType === 'rawan_karhutla') {
              shouldHighlight = layer.feature.properties.kelas === hoveredLayerKey;
            }

            if (shouldHighlight) {
              // Highlight style dengan warna asli layer
              layer.setStyle({
                color: hoveredLayerColor, // Gunakan warna asli
                weight: 5, // Border lebih tebal
                opacity: 1,
                fillColor: hoveredLayerColor,
                fillOpacity: 0.8 // Opacity lebih tinggi untuk highlight
              });
              
              // Bringkan layer ke depan
              if (layer.bringToFront) {
                layer.bringToFront();
              }
            }
          }
        });
      }
    }
  }, [hoveredLayerKey, hoveredLayerType, hoveredLayerColor]);

// Handle logout
const handleLogout = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  setIsAuthenticated(false);
};

const fetchTutupanLahanData = async (): Promise<Array<{pl2024_id: number; deskripsi_domain: string; luas_total: number; color: string}>> => {
  if (!mapInstanceRef.current) return [];
  
  try {
    let boundsString = '';
    
    if (currentBounds) {
      const [[minLat, minLng], [maxLat, maxLng]] = currentBounds;
      boundsString = `${minLat},${minLng},${maxLat},${maxLng}`;
    } else {
      boundsString = '-11,95,6,141';
    }
    
    const dasFilter = selectedDas.length > 0 ? selectedDas.map(d => d.nama_das) : null;
    const dasFilterParam = dasFilter ? `&dasFilter=${encodeURIComponent(JSON.stringify(dasFilter))}` : '';
    
    const response = await fetch(
      `${API_URL}/api/tutupan-lahan/data?bounds=${boundsString}${dasFilterParam}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Assign colors to each unique deskripsi_domain
      const dataWithColors = result.data.map((item: any) => ({
        ...item,
        color: tutupanLahanColors[item.deskripsi_domain] || '#999999'
      }));
      
      setTutupanLahanData(dataWithColors);
      return dataWithColors; // RETURN DATA
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching tutupan lahan data:', error);
    setTutupanLahanData([]);
    return [];
  }
};

const fetchPenutupanLahan2024Data = async (): Promise<Array<{pl2024_id: number; deskripsi_domain: string; luas_total: number; color: string}>> => {
  if (!mapInstanceRef.current) return [];
  
  try {
    let boundsString = '';
    
    if (currentBounds) {
      const [[minLat, minLng], [maxLat, maxLng]] = currentBounds;
      boundsString = `${minLat},${minLng},${maxLat},${maxLng}`;
    } else {
      boundsString = '-11,95,6,141';
    }
    
    const dasFilter = selectedDas.length > 0 ? selectedDas.map(d => d.nama_das) : null;
    const dasFilterParam = dasFilter ? `&dasFilter=${encodeURIComponent(JSON.stringify(dasFilter))}` : '';
    
    const response = await fetch(
      `${API_URL}/api/penutupan-lahan-2024/data?bounds=${boundsString}${dasFilterParam}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Assign colors to each unique deskripsi_domain
      const dataWithColors = result.data.map((item: any) => ({
        ...item,
        color: tutupanLahanColors[item.deskripsi_domain] || '#999999'
      }));
      
      setPenutupanLahan2024Data(dataWithColors);
      return dataWithColors; // RETURN DATA
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching tutupan lahan data:', error);
    setPenutupanLahan2024Data([]);
    return [];
  }
};

const fetchPL2024 = async (): Promise<Array<{pl2024_id: number; deskripsi_domain: string; luas_total: number; color: string}>> => {
  if (!mapInstanceRef.current) return [];
  
  try {
    let boundsString = '';
    
    if (currentBounds) {
      const [[minLat, minLng], [maxLat, maxLng]] = currentBounds;
      boundsString = `${minLat},${minLng},${maxLat},${maxLng}`;
    } else {
      boundsString = '-11,95,6,141';
    }
    
    const dasFilter = selectedDas.length > 0 ? selectedDas.map(d => d.nama_das) : null;
    const dasFilterParam = dasFilter ? `&dasFilter=${encodeURIComponent(JSON.stringify(dasFilter))}` : '';
    
    const response = await fetch(
      `${API_URL}/api/pl-2024/data?bounds=${boundsString}${dasFilterParam}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Assign colors to each unique deskripsi_domain
      const dataWithColors = result.data.map((item: any) => ({
        ...item,
        color: tutupanLahanColors[item.deskripsi_domain] || '#999999'
      }));
      
      setPL2024Data(dataWithColors);
      return dataWithColors; // RETURN DATA
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching tutupan lahan data:', error);
    setPL2024Data([]);
    return [];
  }
};

const fetchGeologiData = async (): Promise<Array<{namobj: string; umurobj: string; keliling_total: number; color: string}>> => {
  if (!mapInstanceRef.current) return [];
  
  try {
    let boundsString = '';
    
    if (currentBounds) {
      const [[minLat, minLng], [maxLat, maxLng]] = currentBounds;
      boundsString = `${minLat},${minLng},${maxLat},${maxLng}`;
    } else {
      boundsString = '-11,95,6,141';
    }
    
    const dasFilter = selectedDas.length > 0 ? selectedDas.map(d => d.nama_das) : null;
    const dasFilterParam = dasFilter ? `&dasFilter=${encodeURIComponent(JSON.stringify(dasFilter))}` : '';
    
    const response = await fetch(
      `${API_URL}/api/geologi/data?bounds=${boundsString}${dasFilterParam}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // PERBAIKAN: Deduplikasi di frontend juga untuk memastikan unique combinations
      const uniqueMap = new Map<string, any>();
      
      result.data.forEach((item: any) => {
        const key = `${item.namobj}|${item.umurobj}`;
        if (uniqueMap.has(key)) {
          // Jika sudah ada, akumulasi keliling_total
          const existing = uniqueMap.get(key);
          existing.keliling_total += parseFloat(item.keliling_total || 0);
        } else {
          uniqueMap.set(key, {
            namobj: item.namobj,
            umurobj: item.umurobj,
            keliling_total: parseFloat(item.keliling_total || 0)
          });
        }
      });
      
      // Convert map to array dan assign colors
      const uniqueData = Array.from(uniqueMap.values());
      const dataWithColors = uniqueData.map((item: any, index: number) => ({
        ...item,
        color: geologiColors[index % geologiColors.length]
      }));
      
      console.log('Unique geologi data after deduplication:', dataWithColors.length);
      
      setGeologiData(dataWithColors);
      return dataWithColors;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching geologi data:', error);
    setGeologiData([]);
    return [];
  }
};

const fetchKejadianListings = async () => {
  try {
    // Ambil semua layer kejadian otomatis yang aktif (yang ada di activeKejadianLayers)
    const activeKejadianLayerNames = Array.from(activeLayers).filter(name => 
      name.startsWith('kejadian_') && activeKejadianLayers.has(name)
    );
    
    console.log('Fetching listings for kejadian layers:', activeKejadianLayerNames);
    console.log('activeKejadianLayers Map:', Array.from(activeKejadianLayers.entries()));
    
    if (activeKejadianLayerNames.length === 0) {
      console.log('No active auto kejadian layers');
      setKejadianListings([]);
      return;
    }
    
    let boundsString = '';
    if (currentBounds) {
      const [[minLat, minLng], [maxLat, maxLng]] = currentBounds;
      boundsString = `${minLat},${minLng},${maxLat},${maxLng}`;
    } else {
      boundsString = '-11,95,6,141';
    }
    
    const dasFilter = selectedDas.length > 0 ? selectedDas.map(d => d.nama_das) : null;
    const dasFilterParam = dasFilter ? `&dasFilter=${encodeURIComponent(JSON.stringify(dasFilter))}` : '';
    
    const allListings: any[] = [];
    
    for (const layerName of activeKejadianLayerNames) {
      const metadata = activeKejadianLayers.get(layerName);
      if (!metadata) {
        console.warn('No metadata found for layer:', layerName);
        continue;
      }
      
      const categoryParam = `&category=${encodeURIComponent(metadata.category)}`;
      
      console.log(`Fetching listings for ${metadata.category} ${metadata.year}...`);
      
      const response = await fetch(
        `${API_URL}/api/kejadian/by-year/${metadata.year}?bounds=${boundsString}${dasFilterParam}${categoryParam}`
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch listings for ${layerName}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`Received ${data.features?.length || 0} features for ${metadata.category} ${metadata.year}`);
      
      if (data.features && data.features.length > 0) {
        const mappedData = data.features.map((f: any) => {
          const props = f.properties;
          const coords = f.geometry.coordinates;
          
          console.log('Feature properties for listing:', props);
          console.log('Geometry coordinates:', coords);
          
          // Format data sama seperti di marker
          return {
            id: props.id,
            title: props.title,
            location: props.location,
            category: props.category,
            date: props.date,
            das: props.das,
            description: props.description,
            thumbnail_path: props.thumbnail_path,
            images_paths: props.images_paths,
            latitude: coords[1],
            longitude: coords[0],
            featured: props.featured || false,
            curah_hujan: props.curah_hujan
          };
        });
        allListings.push(...mappedData);
      }
    }
    
    console.log('Total kejadian listings fetched:', allListings.length);
    
    // Sort by date descending
    allListings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setKejadianListings(allListings);
    
  } catch (error) {
    console.error('Error fetching kejadian listings:', error);
    setKejadianListings([]);
  }
};

const fetchKejadianPhotos = async () => {
  try {
    const activeKejadianLayerNames = Array.from(activeLayers).filter(name => name.startsWith('kejadian_'));
    
    console.log('Fetching photos for active kejadian layers:', activeKejadianLayerNames);
    
    if (activeKejadianLayerNames.length === 0) {
      console.log('No active kejadian layers');
      setKejadianPhotos([]);
      return;
    }
    
    // PERBAIKAN: Ambil year DAN category dari active kejadian layers
    const layersMetadata = activeKejadianLayerNames.map(name => {
      const metadata = activeKejadianLayers.get(name);
      return metadata;
    }).filter(metadata => metadata !== undefined);
    
    if (layersMetadata.length === 0) {
      console.log('No valid layers metadata found');
      setKejadianPhotos([]);
      return;
    }
    
    let boundsString = '';
    if (currentBounds) {
      const [[minLat, minLng], [maxLat, maxLng]] = currentBounds;
      boundsString = `${minLat},${minLng},${maxLat},${maxLng}`;
    } else {
      boundsString = '-11,95,6,141';
    }
    
    console.log('Fetching photos with bounds:', boundsString);
    
    const allPhotos: any[] = [];
    
    // PERBAIKAN: Loop berdasarkan year DAN category
    for (const metadata of layersMetadata) {
      // Build URL dengan filter year DAN category
      let url = `${API_URL}/api/kejadian/photos?year=${metadata.year}&bounds=${boundsString}`;
      
      // TAMBAHKAN category filter
      if (metadata.category) {
        url += `&category=${encodeURIComponent(metadata.category)}`;
      }
      
      // Prioritas: selectedDas > selectedAreas
      if (selectedDas.length > 0) {
        const dasNames = selectedDas.map(d => d.nama_das);
        url += `&dasFilter=${encodeURIComponent(JSON.stringify(dasNames))}`;
        console.log('Using DAS filter for photos:', dasNames);
      } else if (selectedAreas.length > 0) {
        const firstArea = selectedAreas[0];
        const adminLevel = firstArea.level;
        
        const adminNames = selectedAreas.map(area => {
          switch(area.level) {
            case 'provinsi':
              return area.provinsi!;
            case 'kabupaten':
              return area.kab_kota!;
            case 'kecamatan':
              return area.kecamatan!;
            case 'kelurahan':
              return area.kel_desa!;
            default:
              return '';
          }
        }).filter(name => name);
        
        url += `&adminFilter=${encodeURIComponent(JSON.stringify(adminNames))}`;
        url += `&adminLevel=${adminLevel}`;
        console.log('Using admin filter for photos:', adminLevel, adminNames);
      }
      
      console.log(`Fetching photos for ${metadata.category} ${metadata.year}...`, url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Failed to fetch photos for ${metadata.category} ${metadata.year}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`Received ${data.photos?.length || 0} photos for ${metadata.category} ${metadata.year}`);
      
      if (data.photos && data.photos.length > 0) {
        allPhotos.push(...data.photos);
      }
    }
    
    console.log('Total kejadian photos fetched:', allPhotos.length);
    setKejadianPhotos(allPhotos);
    
  } catch (error) {
    console.error('Error fetching kejadian photos:', error);
    setKejadianPhotos([]);
  }
};

const loadKejadianLayer = async (layerName: string, year: number, category?: string, forceDasFilter?: string[] | null) => {
  if (!mapInstanceRef.current || !window.L) {
    console.log('Map not ready');
    return;
  }

  try {
    let boundsString = '';
    
    if (currentBounds) {
      const [[minLat, minLng], [maxLat, maxLng]] = currentBounds;
      boundsString = `${minLat},${minLng},${maxLat},${maxLng}`;
    } else {
      boundsString = '-11,95,6,141';
    }
    
    // Build URL dengan filter
    let url = `${API_URL}/api/kejadian/by-year/${year}?bounds=${boundsString}`;
    
    // Add category filter
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }
    
    // Prioritas: forceDasFilter > selectedDas > selectedAreas
    if (forceDasFilter !== undefined && forceDasFilter !== null && forceDasFilter.length > 0) {
      url += `&dasFilter=${encodeURIComponent(JSON.stringify(forceDasFilter))}`;
      console.log('Using forced DAS filter:', forceDasFilter);
    } else if (selectedDas.length > 0) {
      const dasNames = selectedDas.map(d => d.nama_das);
      url += `&dasFilter=${encodeURIComponent(JSON.stringify(dasNames))}`;
      console.log('Using DAS filter:', dasNames);
    } else if (selectedAreas.length > 0) {
      const firstArea = selectedAreas[0];
      const adminLevel = firstArea.level;
      
      const adminNames = selectedAreas.map(area => {
        switch(area.level) {
          case 'provinsi':
            return area.provinsi!;
          case 'kabupaten':
            return area.kab_kota!;
          case 'kecamatan':
            return area.kecamatan!;
          case 'kelurahan':
            return area.kel_desa!;
          default:
            return '';
        }
      }).filter(name => name);
      
      url += `&adminFilter=${encodeURIComponent(JSON.stringify(adminNames))}`;
      url += `&adminLevel=${adminLevel}`;
      console.log('Using admin filter:', adminLevel, adminNames);
    }
    
    console.log('Loading kejadian layer:', layerName, 'Full URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const geojsonData = await response.json();
    console.log('Kejadian data received for', layerName, ':', geojsonData.features?.length || 0, 'features');
    
    // Hapus layer lama jika ada
    if (layerGroupsRef.current[layerName]) {
      mapInstanceRef.current.removeLayer(layerGroupsRef.current[layerName]);
    }
    
    if (!geojsonData.features || geojsonData.features.length === 0) {
      console.warn('No kejadian found for:', layerName);
      layerGroupsRef.current[layerName] = window.L.layerGroup();
      layerGroupsRef.current[layerName].addTo(mapInstanceRef.current);
      return;
    }
    
    // Function untuk create custom icon berdasarkan category
    const createKejadianIcon = (category: string) => {
      let iconContent = '';
      let bgColor = '#3b82f6'; // default blue
      let hoverColor = '#ef4444'; // default hover red
      let type = 'banjir'; // default type
      
      if (category === 'Banjir') {
        bgColor = '#3b82f6'; // blue
        hoverColor = '#ef4444'; // hover red (dari kebakaran)
        type = 'banjir';
        iconContent = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>`;
      } else if (category === 'Tanah Longsor dan Erosi') {
        bgColor = '#f59e0b'; // orange
        hoverColor = '#3b82f6'; // hover blue (dari banjir)
        type = 'longsor';
        iconContent = `<img src="/images/landslide-svgrepo-com.svg" style="width: 16px; height: 16px; filter: brightness(0) invert(1);" />`;
      } else if (category === 'Kebakaran Hutan dan Kekeringan') {
        bgColor = '#ef4444'; // red
        hoverColor = '#f59e0b'; // hover orange (dari longsor)
        type = 'kebakaran';
        iconContent = `<img src="/images/fire-svgrepo-com.svg" style="width: 16px; height: 16px; filter: brightness(0) invert(1);" />`;
      }
      
      return window.L.divIcon({
        className: 'custom-kejadian-marker',
        html: `
          <style>
            .marker-container-kejadian-${type} .marker-bg {
              fill: ${bgColor};
              transition: fill 0.3s ease;
            }
            .marker-container-kejadian-${type}:hover .marker-bg {
              fill: ${hoverColor} !important;
            }
          </style>
          <div class="marker-container marker-container-kejadian-${type}" style="position: relative; width: 44px; height: 44px; cursor: pointer;">
            <svg class="marker-circle" width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
              <circle class="marker-bg" cx="22" cy="22" r="20" stroke="white" stroke-width="3" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"/>
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; display: flex; align-items: center; justify-content: center;">
              ${iconContent}
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
      });
    };
    
    // Buat layer group dengan marker untuk setiap kejadian
    const markers: any[] = [];
    
    geojsonData.features.forEach((feature: any) => {
      const { coordinates } = feature.geometry;
      const props = feature.properties;
      
      const marker = window.L.marker([coordinates[1], coordinates[0]], {
        icon: createKejadianIcon(props.category)
      });
      
      // Store incident data - LENGKAP dengan semua field (match kejadian.tsx format)
      (marker as any).incidentData = {
        id: props.id,
        title: props.title,
        image: props.thumbnail_path ? `${API_URL}${props.thumbnail_path}` : 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
        location: props.location,
        category: props.category,
        type: props.category.toLowerCase().includes('banjir') ? 'banjir' : 
              props.category.toLowerCase().includes('longsor') ? 'longsor' : 'kebakaran',
        date: props.date,
        das: props.das,
        description: props.description,
        thumbnail_path: props.thumbnail_path,
        images_paths: props.images_paths,
        coordinates: [coordinates[1], coordinates[0]],
        latitude: coordinates[1],
        longitude: coordinates[0],
        featured: props.featured || false,
        curah_hujan: props.curah_hujan
      };
      
      // Add click event
      marker.on('click', function(e: any) {
        const inc = (this as any).incidentData;
        if (!inc) return;
        
        const popupContent = `
          <div onclick="window.navigateToKejadianDetail()" style="width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 8px; overflow: hidden; cursor: pointer;">
            <div style="position: relative; width: 100%; height: 180px; overflow: hidden;">
              <img 
                src="${inc.image}" 
                alt="${inc.title}"
                style="width: 100%; height: 100%; object-fit: cover;"
              />
              
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);"></div>
              
              <button 
                onclick="event.stopPropagation(); event.preventDefault(); if(window.closeKejadianPopup) window.closeKejadianPopup();"
                style="position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; background: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10; font-size: 16px; line-height: 1; color: #333; padding: 0; transition: background-color 0.2s;"
                onmouseover="this.style.backgroundColor='#f3f4f6'"
                onmouseout="this.style.backgroundColor='white'"
              >
                ×
              </button>
              
              <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 16px; z-index: 5; pointer-events: none;">
                <h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: white; line-height: 1.3; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                  ${inc.title}
                </h3>
                <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.9); text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                  ${inc.location}
                </p>
              </div>
            </div>
            
            <div style="background: white; padding: 12px 16px;">
              <p style="margin: 0; font-size: 13px; color: #999;">
                Not rated yet
              </p>
            </div>
          </div>
        `;
        
        // Set up navigation function
        (window as any).navigateToKejadianDetail = () => {
          navigate('/detailkejadian', { state: { incident: inc } });
        };
        
        (window as any).closeKejadianPopup = () => {
          mapInstanceRef.current?.closePopup();
        };
        
        try {
          const popup = window.L.popup({
            maxWidth: 280,
            minWidth: 280,
            closeButton: false,
            className: 'custom-kejadian-popup',
            autoClose: true,
            closeOnClick: true
          })
          .setLatLng(e.latlng)
          .setContent(popupContent);
          
          popup.openOn(mapInstanceRef.current);
        } catch (error) {
          console.error('Error creating/opening popup:', error);
        }
      });
      
      markers.push(marker);
    });
    
    const layerGroup = window.L.layerGroup(markers);
    layerGroup.addTo(mapInstanceRef.current);
    layerGroupsRef.current[layerName] = layerGroup;
    
    console.log('Kejadian layer loaded successfully with', markers.length, 'markers');
    
    // HAPUS manual call fetchKejadianPhotos - biarkan useEffect yang handle

  } catch (error) {
    console.error('Error loading kejadian layer:', error);
  }
};

// Debounced search
const debouncedSearch = useRef<NodeJS.Timeout>();
const handleAreaSearchChange = (value: string) => {
  setAreaSearchQuery(value);
  
  if (debouncedSearch.current) {
    clearTimeout(debouncedSearch.current);
  }
  
  debouncedSearch.current = setTimeout(() => {
    searchAreas(value);
  }, 300);
};

const searchDas = async (query: string) => {
  if (query.trim().length < 2) {
    setDasSearchResults([]);
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/das/search?query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    setDasSearchResults(data);
    setShowDasSearchDropdown(true);
  } catch (error) {
    console.error('Error searching DAS:', error);
    setDasSearchResults([]);
  }
};

// Debounced search untuk DAS
const debouncedDasSearch = useRef<NodeJS.Timeout>();
const handleDasSearchChange = (value: string) => {
  setDasSearchQuery(value);
  
  if (debouncedDasSearch.current) {
    clearTimeout(debouncedDasSearch.current);
  }
  
  debouncedDasSearch.current = setTimeout(() => {
    searchDas(value);
  }, 300);
};

// Function untuk select DAS
const handleDasSelect = (das: any) => {
  const isAlreadySelected = selectedDas.some(d => d.nama_das === das.nama_das);
  
  if (!isAlreadySelected) {
    const newSelectedDas = [...selectedDas, das];
    setSelectedDas(newSelectedDas);
    
    // Clear selected areas when DAS is selected
    setSelectedAreas([]);
    
    // Clear ALL admin boundaries when switching to DAS
    Object.keys(layerGroupsRef.current).forEach(key => {
      if (key.startsWith('admin_boundary')) {
        mapInstanceRef.current?.removeLayer(layerGroupsRef.current[key]);
        delete layerGroupsRef.current[key];
      }
    });
    
    // TAMBAHAN: Render DAS boundary langsung dengan unique key
    if (das.geom && mapInstanceRef.current && window.L) {
      console.log('✅ Rendering DAS boundary for:', das.nama_das);
      
      try {
        // Unique key per DAS
        const boundaryKey = `das_boundary_${das.nama_das.replace(/\s+/g, '_')}`;
        
        const geoJsonLayer = window.L.geoJSON({
          type: 'Feature',
          geometry: das.geom,
          properties: { nama_das: das.nama_das }
        }, {
          style: {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8,
            fillColor: '#dbeafe',
            fillOpacity: 0.1
          }
        });
        
        geoJsonLayer.addTo(mapInstanceRef.current);
        layerGroupsRef.current[boundaryKey] = geoJsonLayer;
        
        console.log('✅ DAS boundary rendered with key:', boundaryKey);
      } catch (error) {
        console.error('❌ Error rendering DAS boundary:', error);
      }
    } else {
      console.log('❌ Cannot render DAS boundary - geom missing or map not ready');
    }
    
    updateMapBoundsDas(newSelectedDas);
  }
  
  setDasSearchQuery('');
  setDasSearchResults([]);
  setShowDasSearchDropdown(false);
};

// Function untuk remove selected DAS
const handleRemoveDas = async (index: number) => {
  const removedDas = selectedDas[index];
  const newSelectedDas = selectedDas.filter((_, i) => i !== index);
  setSelectedDas(newSelectedDas);
  
  // Remove SPECIFIC DAS boundary layer
  const boundaryKey = `das_boundary_${removedDas.nama_das.replace(/\s+/g, '_')}`;
  if (layerGroupsRef.current[boundaryKey]) {
    mapInstanceRef.current?.removeLayer(layerGroupsRef.current[boundaryKey]);
    delete layerGroupsRef.current[boundaryKey];
    console.log('🗑️ Removed DAS boundary:', boundaryKey);
  }
  
  if (newSelectedDas.length > 0) {
    await updateMapBoundsDas(newSelectedDas);
  } else {
    // Tidak ada DAS yang dipilih, kembali ke bounds Indonesia
    setCurrentBounds(null);
    setSelectedAreas([]);
    
    // const kejadianResponse = await fetch('${API_URL}/api/kejadian/years');
    const kejadianResponse = await fetch(`${API_URL}/api/layers`);
    const kejadianData = await kejadianResponse.json();
      
    const allKejadianLayers = kejadianData.years.map((year: number) => ({
      id: `kejadian_${year}`,
      name: `kejadian_${year}`,
      year: year
    }));

    setAvailableLayers({ 
      kerawanan: layerData.kerawanan || [], 
      mitigasiAdaptasi: layerData.mitigasiAdaptasi || [], 
      lainnya: layerData.lainnya || [],
      kejadian: kejadianData.kejadian || []
    });
    
    setTimeout(async () => {
      for (const tableName of activeLayers) {
        if (tableName.startsWith('kejadian_')) {
          // Parse category and year from tableName format: kejadian_Category_Name_Year
          const parts = tableName.split('_');
          if (parts.length >= 3) {
            const year = parseInt(parts[parts.length - 1]);
            const category = parts.slice(1, -1).join(' ');
            await loadKejadianLayer(tableName, year, category);
          }
        } else {
          await loadLayerInBounds(tableName, null);
        }
      }
    }, 100);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([-2.5, 118.0], 5);
    }
  }
};

// Function untuk update map bounds based on selected DAS
const updateMapBoundsDas = async (dasList: Array<any>) => {
  if (dasList.length === 0 || !mapInstanceRef.current) return;

  try {
    const dasNames = dasList.map(d => d.nama_das);
    
    const response = await fetch(`${API_URL}/api/das/bounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedDas: dasNames })
    });
    
    const data = await response.json();
    
    if (data.bounds) {
      // Set bounds dulu
      setCurrentBounds(data.bounds);
      mapInstanceRef.current.fitBounds(data.bounds, { padding: [50, 50] });
      
      // Check available layers in these bounds
      await checkLayerAvailability(data.bounds);
      
      setTimeout(async () => {
        const dasNames = dasList.map(d => d.nama_das);
        for (const tableName of activeLayers) {
          if (tableName.startsWith('kejadian_')) {
            const parts = tableName.split('_');
            if (parts.length >= 3) {
              const year = parseInt(parts[parts.length - 1]);
              const category = parts.slice(1, -1).join(' ');
              await loadKejadianLayer(tableName, year, category, dasNames);
            }
          } else {
            await loadLayerInBounds(tableName, data.bounds);
          }
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error updating DAS bounds:', error);
  }
};

// Function untuk select area
const handleAreaSelect = (area: any) => {
  const isAlreadySelected = selectedAreas.some(a => {
    if (a.level !== area.level) return false;
    
    switch(area.level) {
      case 'provinsi':
        return a.provinsi === area.provinsi;
      case 'kabupaten':
        return a.kab_kota === area.kab_kota && a.provinsi === area.provinsi;
      case 'kecamatan':
        return a.kecamatan === area.kecamatan && a.kab_kota === area.kab_kota && a.provinsi === area.provinsi;
      case 'kelurahan':
        return a.kel_desa === area.kel_desa && a.kecamatan === area.kecamatan && a.kab_kota === area.kab_kota && a.provinsi === area.provinsi;
      default:
        return false;
    }
  });
  
  if (!isAlreadySelected) {
    const newSelectedAreas = [...selectedAreas, area];
    setSelectedAreas(newSelectedAreas);
    
    // Clear selected DAS when area is selected
    setSelectedDas([]);
    
    // Clear ALL DAS boundaries when switching to admin areas
    Object.keys(layerGroupsRef.current).forEach(key => {
      if (key.startsWith('das_boundary')) {
        mapInstanceRef.current?.removeLayer(layerGroupsRef.current[key]);
        delete layerGroupsRef.current[key];
      }
    });
    
    // TAMBAHAN: Render admin boundary langsung dengan unique key
    if (area.geom && mapInstanceRef.current && window.L) {
      console.log('✅ Rendering admin boundary for:', area.label);
      
      try {
        // Unique key per area
        const boundaryKey = `admin_boundary_${area.label.replace(/[,\s]+/g, '_')}`;
        
        const geoJsonLayer = window.L.geoJSON({
          type: 'Feature',
          geometry: area.geom,
          properties: { ...area }
        }, {
          style: {
            color: '#ef4444',
            weight: 3,
            opacity: 0.8,
            fillColor: '#fee2e2',
            fillOpacity: 0.1
          }
        });
        
        geoJsonLayer.addTo(mapInstanceRef.current);
        layerGroupsRef.current[boundaryKey] = geoJsonLayer;
        
        console.log('✅ Admin boundary rendered with key:', boundaryKey);
      } catch (error) {
        console.error('❌ Error rendering admin boundary:', error);
      }
    } else {
      console.log('❌ Cannot render admin boundary - geom missing or map not ready');
    }
    
    updateMapBounds(newSelectedAreas);
  }
  
  setAreaSearchQuery('');
  setAreaSearchResults([]);
  setShowAreaSearchDropdown(false);
};

// Function untuk remove selected area
const handleRemoveArea = async (index: number) => {
  const removedArea = selectedAreas[index];
  const newSelectedAreas = selectedAreas.filter((_, i) => i !== index);
  setSelectedAreas(newSelectedAreas);
  
  // Remove SPECIFIC admin boundary layer
  const boundaryKey = `admin_boundary_${removedArea.label.replace(/[,\s]+/g, '_')}`;
  if (layerGroupsRef.current[boundaryKey]) {
    mapInstanceRef.current?.removeLayer(layerGroupsRef.current[boundaryKey]);
    delete layerGroupsRef.current[boundaryKey];
    console.log('🗑️ Removed admin boundary:', boundaryKey);
  }

  if (newSelectedAreas.length > 0) {
    await updateMapBounds(newSelectedAreas);
  } else {
    setCurrentBounds(null);
    setSelectedDas([]);
    
    // const kejadianResponse = await fetch('${API_URL}/api/kejadian/years');
    const kejadianResponse = await fetch(`${API_URL}/api/layers`);
    const kejadianData = await kejadianResponse.json();
      
    const allKejadianLayers = kejadianData.years.map((year: number) => ({
      id: `kejadian_${year}`,
      name: `kejadian_${year}`,
      year: year
    }));

    setAvailableLayers({ 
      kerawanan: layerData.kerawanan || [], 
      mitigasiAdaptasi: layerData.mitigasiAdaptasi || [], 
      lainnya: layerData.lainnya || [],
      kejadian: kejadianData.kejadian || []
    });
    
    setTimeout(async () => {
      for (const tableName of activeLayers) {
        if (tableName.startsWith('kejadian_')) {
          // Parse category and year from tableName format: kejadian_Category_Name_Year
          const parts = tableName.split('_');
          if (parts.length >= 3) {
            const year = parseInt(parts[parts.length - 1]);
            const category = parts.slice(1, -1).join(' ');
            await loadKejadianLayer(tableName, year, category);
          }
        } else {
          await loadLayerInBounds(tableName, null);
        }
      }
    }, 100);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([-2.5, 118.0], 5);
    }
  }
};

// Function untuk update map bounds based on selected areas
const updateMapBounds = async (areas: Array<any>) => {
  if (areas.length === 0 || !mapInstanceRef.current) return;

  const areasWithoutGeom = areas.map(({ geom, ...rest }) => rest);

  try {
    const response = await fetch(`${API_URL}/api/areas/bounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedAreas: areasWithoutGeom })
    });
    
    const data = await response.json();
    
    if (data.bounds) {
      // Set bounds dulu
      setCurrentBounds(data.bounds);
      mapInstanceRef.current.fitBounds(data.bounds, { padding: [50, 50] });
      
      // Check available layers in these bounds
      await checkLayerAvailability(data.bounds);
      
      setTimeout(async () => {
        const dasNames = selectedDas.length > 0 ? selectedDas.map(d => d.nama_das) : [];
        for (const tableName of activeLayers) {
          if (tableName.startsWith('kejadian_')) {
            const parts = tableName.split('_');
            if (parts.length >= 3) {
              const year = parseInt(parts[parts.length - 1]);
              const category = parts.slice(1, -1).join(' ');
              await loadKejadianLayer(tableName, year, category, dasNames);
            }
          } else {
            await loadLayerInBounds(tableName, data.bounds);
          }
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error updating bounds:', error);
  }
};

// Function untuk check layer availability
const checkLayerAvailability = async (bounds: [[number, number], [number, number]]) => {
  try {
    const dasFilter = selectedDas.length > 0 ? selectedDas.map(d => d.nama_das) : null;
    
    // Check regular layers - KIRIM dasFilter
    const layersResponse = await fetch(`${API_URL}/api/layers/check-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        bounds,
        dasFilter
      })
    });
    
    const layersData = await layersResponse.json();
    console.log('Available layers response:', layersData);
    
    // Build filters untuk kejadian count
    const kejadianFilters: any = { bounds };
    
    // Prioritas: selectedDas > selectedAreas
    if (selectedDas.length > 0) {
      kejadianFilters.dasFilter = selectedDas.map(d => d.nama_das);
      console.log('Using DAS filter for kejadian count:', kejadianFilters.dasFilter);
    } else if (selectedAreas.length > 0) {
      const firstArea = selectedAreas[0];
      kejadianFilters.adminLevel = firstArea.level;
      
      kejadianFilters.adminFilter = selectedAreas.map(area => {
        switch(area.level) {
          case 'provinsi':
            return area.provinsi!;
          case 'kabupaten':
            return area.kab_kota!;
          case 'kecamatan':
            return area.kecamatan!;
          case 'kelurahan':
            return area.kel_desa!;
          default:
            return '';
        }
      }).filter(name => name);
      
      console.log('Using admin filter for kejadian count:', kejadianFilters.adminLevel, kejadianFilters.adminFilter);
    }

    // Check kejadian availability dengan filter yang sesuai
    const kejadianResponse = await fetch(`${API_URL}/api/kejadian/check-years-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kejadianFilters)
    });
    
    const kejadianData = await kejadianResponse.json();
    console.log('Available kejadian:', kejadianData);
    
    // Group available layers by section
    const grouped = {
      kerawanan: [] as Array<{id: string, name: string}>,
      mitigasiAdaptasi: [] as Array<{id: string, name: string}>,
      lainnya: [] as Array<{id: string, name: string}>,
      kejadian: [] as Array<{
        id: string, 
        name: string, 
        category?: string, 
        year?: number, 
        count?: number, 
        isAutoGenerated?: boolean,
        isManual?: boolean,
        isShapefile?: boolean
      }>
    };
    
    // Add regular layers (including shapefile kejadian)
    layersData.availableLayers.forEach((layer: any) => {
      if (grouped[layer.section as keyof typeof grouped]) {
        const layerInfo: any = {
          id: layer.id,
          name: layer.name
        };
        
        // ✅ PERBAIKAN: Tambahkan flags untuk shapefile kejadian
        if (layer.section === 'kejadian') {
          layerInfo.isManual = true;
          layerInfo.isShapefile = true;
        }
        
        grouped[layer.section as keyof typeof grouped].push(layerInfo);
      }
    });
    
    // ✅ APPEND kejadian auto-generated, jangan overwrite
    if (kejadianData.availableKejadian && kejadianData.availableKejadian.length > 0) {
      const autoKejadian = kejadianData.availableKejadian.map((item: any) => ({
        id: `kejadian_${item.category.replace(/\s+/g, '_')}_${item.year}`,
        name: `${item.category} ${item.year}`,
        category: item.category,
        year: item.year,
        count: item.count,
        isAutoGenerated: true,
        isManual: false,
        isShapefile: false
      }));
      
      // Gabungkan shapefile kejadian + auto-generated kejadian
      grouped.kejadian = [...grouped.kejadian, ...autoKejadian];
    }
    
    console.log('Grouped available layers:', grouped);
    setAvailableLayers(grouped);
  } catch (error) {
    console.error('Error checking layer availability:', error);
    // Fallback: preserve current kejadian layers if error
    setAvailableLayers(prev => ({
      kerawanan: [],
      mitigasiAdaptasi: [],
      lainnya: [],
      kejadian: prev.kejadian || []
    }));
  }
};

  useEffect(() => {
  const updateKejadianCount = async () => {
    if (!currentBounds) return;
    
    console.log('Filter changed (selectedAreas/selectedDas) - reloading kejadian count');
    
    // Build filters untuk kejadian count
    const kejadianFilters: any = { bounds: currentBounds };
    
    // Prioritas: selectedDas > selectedAreas
    if (selectedDas.length > 0) {
      kejadianFilters.dasFilter = selectedDas.map(d => d.nama_das);
      console.log('Using DAS filter for kejadian count:', kejadianFilters.dasFilter);
    } else if (selectedAreas.length > 0) {
      const firstArea = selectedAreas[0];
      kejadianFilters.adminLevel = firstArea.level;
      
      kejadianFilters.adminFilter = selectedAreas.map(area => {
        switch(area.level) {
          case 'provinsi':
            return area.provinsi!;
          case 'kabupaten':
            return area.kab_kota!;
          case 'kecamatan':
            return area.kecamatan!;
          case 'kelurahan':
            return area.kel_desa!;
          default:
            return '';
        }
      }).filter(name => name);
      
      console.log('Using admin filter for kejadian count:', kejadianFilters.adminLevel, kejadianFilters.adminFilter);
    }

    try {
      const kejadianResponse = await fetch(`${API_URL}/api/kejadian/check-years-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kejadianFilters)
      });
      
      const kejadianData = await kejadianResponse.json();
      console.log('Available kejadian (updated):', kejadianData);
      
      if (kejadianData.availableKejadian) {
        const updatedKejadian = kejadianData.availableKejadian.map((item: any) => ({
          id: `kejadian_${item.category.replace(/\s+/g, '_')}_${item.year}`,
          name: `${item.category} ${item.year}`,
          category: item.category,
          year: item.year,
          count: item.count
        }));
        
        setAvailableLayers(prev => ({
          ...prev,
          kejadian: updatedKejadian
        }));
      }
    } catch (error) {
      console.error('Error updating kejadian count:', error);
    }
  };
  
  updateKejadianCount();
}, [selectedAreas, selectedDas, currentBounds]);

  const handleLayerToggle = async (tableName: string, isChecked: boolean, year?: number, category?: string, isShapefile?: boolean) => {
  console.log('Toggle layer clicked:', tableName, 'isChecked:', isChecked, 'year:', year, 'category:', category, 'isShapefile:', isShapefile);
  console.log('Current active layers:', Array.from(activeLayers));
  
  if (isChecked) {
    // Tambahkan layer ke active layers
    setActiveLayers(prev => new Set([...prev, tableName]));
    
    // Simpan metadata untuk kejadian layer
    if (tableName.startsWith('kejadian_') && year && category && !isShapefile) {
      // Layer otomatis (point markers)
      setActiveKejadianLayers(prev => {
        const newMap = new Map(prev);
        newMap.set(tableName, { year, category });
        return newMap;
      });
      await loadKejadianLayer(tableName, year, category);
    } else if (isShapefile) {
      // Layer manual shapefile
      await loadLayerInBounds(tableName);
    } else if (tableName.startsWith('kejadian_')) {
      // Fallback untuk format lama (hanya year)
      const yearFromName = parseInt(tableName.replace('kejadian_', ''));
      await loadKejadianLayer(tableName, yearFromName);
    } else {
      // Load layer biasa
      await loadLayerInBounds(tableName);
    }
    
  } else {
    // Hapus layer dari active layers DULU
    setActiveLayers(prev => {
      const newSet = new Set(prev);
      newSet.delete(tableName);
      console.log('Updated active layers after removal:', Array.from(newSet));
      return newSet;
    });
    
    // Hapus layer dari map
    console.log('Removing layer from map:', tableName);
    if (layerGroupsRef.current[tableName] && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(layerGroupsRef.current[tableName]);
      delete layerGroupsRef.current[tableName];
      console.log('Layer removed from map');
      
      // Hapus metadata kejadian layer
      if (tableName.startsWith('kejadian_')) {
        setActiveKejadianLayers(prev => {
          const newMap = new Map(prev);
          newMap.delete(tableName);
          return newMap;
        });
        // HAPUS manual call fetchKejadianPhotos - biarkan useEffect yang handle
      }
      
      if (tableName === 'tutupan_lahan') {
        setTutupanLahanData([]);
      }

      if (tableName === 'penutupan_lahan_2024') {
        setPenutupanLahan2024Data([]);
      }
      
      if (tableName === 'pl2024') {
        setPL2024Data([]);
      }

      if (tableName === 'geologi') {
        setGeologiData([]);
      }

      if (tableName === 'jenis_tanah') {
        setJenisTanahData([]);
      }
      if (tableName === 'lahan_kritis') {
      setLahanKritisData([]);
      }
      if (tableName === 'rawan_erosi') {
        setRawanErosiData([]);
      }
      if (tableName === 'rawan_longsor') {
        setRawanLongsorData([]);
      }
      if (tableName === 'rawan_limpasan') {
        setRawanLimpasanData([]);
      }
      if (tableName === 'rawan_karhutla') {
        setRawanKarhutlaData([]);
      }
    } else {
      console.log('Layer not found in layerGroupsRef or map not ready');
    }
  }
};

  // Fungsi helper untuk generate warna konsisten berdasarkan nama tabel
  const getColorForTable = (tableName: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
      '#E74C3C', '#3498DB', '#9B59B6', '#1ABC9C', '#F39C12',
      '#D35400', '#C0392B', '#2980B9', '#8E44AD', '#16A085'
    ];
    
    // Generate hash dari nama tabel untuk mendapatkan index yang konsisten
    let hash = 0;
    for (let i = 0; i < tableName.length; i++) {
      hash = tableName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Fetch layers from database on mount
  useEffect(() => {
  fetchLayers();
  
  // Clear all kejadian layers on mount/reload
  setActiveLayers(prev => {
    const newSet = new Set(prev);
    // Hapus semua layer kejadian
    Array.from(newSet).forEach(layerName => {
      if (layerName.startsWith('kejadian_')) {
        newSet.delete(layerName);
      }
    });
    return newSet;
  });
  
  // Clear kejadian metadata
  setActiveKejadianLayers(new Map());
  
  // Clear photos dan listings
  setKejadianPhotos([]);
  setKejadianListings([]);
}, []);

const fetchLayers = async () => {
  try {
    const response = await fetch(`${API_URL}/api/layers`);
    const data = await response.json();
    
    console.log('Fetched layers data:', data);
    
    setLayerData(data);
    
    // Jika ada bounds yang dipilih, filter layers
    if (currentBounds) {
      checkLayerAvailability(currentBounds);
    } else {
      // Jika tidak ada bounds, tampilkan semua layer termasuk kejadian
      setAvailableLayers(data);
    }
  } catch (error) {
    console.error('Error fetching layers:', error);
    alert('Gagal memuat data layer');
  }
};



  const handleAddClick = (section: 'kerawanan' | 'mitigasiAdaptasi' | 'lainnya' | 'kejadian') => {
  // Check authentication
  if (!isAuthenticated) {
    if (window.confirm('Anda harus login sebagai admin untuk menambah data. Pergi ke halaman login?')) {
      navigate('/administrator-sign-in');
    }
    return;
  }
  
  setCurrentSection(section);
  setNewLayerName('');
  setUploadedFiles([]);
  setShowAddModal(true);
};

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setUploadedFiles(fileArray);
    }
  };

  const handleCreateLayer = async () => {
    if (!newLayerName.trim()) {
      alert('Nama tabel harus diisi');
      return;
    }

    if (uploadedFiles.length === 0) {
      alert('File shapefile harus diupload');
      return;
    }

    // Check if .shp file exists
    const hasShpFile = uploadedFiles.some(f => f.name.endsWith('.shp'));
    if (!hasShpFile) {
      alert('File .shp wajib diupload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setInsertProgress(0);
    setInsertStatus('');

    try {
      const formData = new FormData();
      formData.append('tableName', newLayerName.trim());
      formData.append('section', currentSection);
      
      uploadedFiles.forEach((file, index) => {
        console.log(`Appending file ${index}:`, file.name, file.type, file.size);
        formData.append('files', file);
      });
      
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
          console.log(`Upload progress: ${Math.round(percentComplete)}%`);
        }
      });

      // Handle response
      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('SUCCESS: Layer created successfully');
            
            setInsertProgress(100);
            setInsertStatus('Selesai');
            
            await fetchLayers();
            setNewLayerName('');
            setUploadedFiles([]);
            
            // Delay sedikit agar user bisa lihat progress 100%
            setTimeout(() => {
              setShowAddModal(false);
              setUploadProgress(0);
              setInsertProgress(0);
              setInsertStatus('');
              alert('Layer berhasil dibuat');
            }, 500);
            
          } catch (err) {
            throw new Error('Failed to parse response');
          }
        } else {
          const error = JSON.parse(xhr.responseText);
          throw new Error(error.error || 'Gagal membuat layer');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Network error saat upload');
      });

      // Setup SSE untuk menerima progress insert dari server
      const eventSource = new EventSource(`${API_URL}/api/layers/progress/${newLayerName.trim()}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Insert progress:', data);
          
          if (data.progress !== undefined) {
            setInsertProgress(data.progress);
          }
          if (data.status) {
            setInsertStatus(data.status);
          }
          if (data.done) {
            eventSource.close();
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.log('SSE connection closed or error');
        eventSource.close();
      };

      xhr.open('POST', `${API_URL}/api/layers`);
      xhr.send(formData);
      
    } catch (error: any) {
      console.error('Error creating layer:', error);
      alert(error.message || 'Gagal membuat layer');
      setIsUploading(false);
      setUploadProgress(0);
      setInsertProgress(0);
      setInsertStatus('');
    }
  };

  const handleDeleteClick = (section: 'kerawanan' | 'mitigasiAdaptasi' | 'lainnya', id: string, name: string) => {
  // Check authentication
  if (!isAuthenticated) {
    if (window.confirm('Anda harus login sebagai admin untuk menghapus data. Pergi ke halaman login?')) {
      navigate('/administrator-sign-in');
    }
    return;
  }
  
  setLayerToDelete({section, id, name});
  setShowDeleteModal(true);
};

  const confirmDelete = async () => {
    if (!layerToDelete) return;

    try {
      const response = await fetch(`${API_URL}/api/layers/${layerToDelete.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menghapus layer');
      }

      // Hapus layer dari map jika sedang aktif
      const layerName = layerToDelete.name;
      if (activeLayers.has(layerName)) {
        handleLayerToggle(layerName, false);
      }

      // Refresh layers
      await fetchLayers();

      setLayerToDelete(null);
      setShowDeleteModal(false);
      alert('Layer berhasil dihapus');
      
    } catch (error: any) {
      console.error('Error deleting layer:', error);
      alert(error.message || 'Gagal menghapus layer');
    }
  };

  const getSectionTitle = (section: string) => {
    const titles = {
      kerawanan: 'Kerawanan',
      mitigasiAdaptasi: 'Mitigasi dan Adaptasi',
      lainnya: 'Lain lain',
      kejadian: 'Kejadian'
    };
    return titles[section as keyof typeof titles];
  };

useEffect(() => {
  if (!mapInstanceRef.current) return;
  
  // Hanya reload jika ada active kejadian layers
  if (activeKejadianLayers.size === 0) return;
  
  console.log('Trigger reload kejadian layers - activeKejadianLayers:', Array.from(activeKejadianLayers.entries()));
  console.log('Current bounds:', currentBounds);
  
  const reloadKejadianLayers = async () => {
    for (const [layerName, metadata] of activeKejadianLayers.entries()) {
      console.log(`Reloading kejadian layer: ${layerName}`, metadata);
      await loadKejadianLayer(layerName, metadata.year, metadata.category);
    }
  };
  
  reloadKejadianLayers();
}, [currentBounds, selectedDas, selectedAreas, activeKejadianLayers]);

  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      if (mapRef.current && window.L) {
        const map = window.L.map(mapRef.current).setView([-2.5, 118.0], 5);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        
        // Simpan instance map ke ref
        mapInstanceRef.current = map;
        setMapReady(true);
      }
    };
    document.head.appendChild(script);

    // Load Chart.js
    const chartScript = document.createElement('script');
    chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
    document.head.appendChild(chartScript);

    return () => {
      link.remove();
      script.remove();
      chartScript.remove();
      
      // Cleanup map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
  // Auto-fetch photos dan listings ketika ada perubahan pada activeLayers kejadian
  const activeAutoKejadian = Array.from(activeLayers).filter(layer => 
    layer.startsWith('kejadian_') && activeKejadianLayers.has(layer)
  );
  
  console.log('useEffect triggered - activeAutoKejadian:', activeAutoKejadian);
  console.log('activeKejadianLayers:', Array.from(activeKejadianLayers.entries()));
  
  if (activeAutoKejadian.length > 0) {
    console.log('Active auto kejadian layers detected, fetching photos and listings...');
    fetchKejadianPhotos();
    fetchKejadianListings();
  } else {
    console.log('No active auto kejadian layers, clearing photos and listings');
    setKejadianPhotos([]);
    setKejadianListings([]);
  }
}, [activeLayers, activeKejadianLayers, currentBounds, selectedDas]);

  const [activeTab, setActiveTab] = useState('administrasi');
  const [activeBottomTab, setActiveBottomTab] = useState('curahHujan');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

  const layersWithBottomTabs = ['tutupan_lahan', 'penutupan_lahan_2024', 'pl2024', 'jenis_tanah', 'geologi', 'lahan_kritis', 'rawan_erosi', 'rawan_longsor', 'rawan_limpasan', 'rawan_karhutla'];

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    // Mapping dari tab id ke tableName
    const tabToLayerMapping: Record<string, string> = {
      'tutupanLahan': 'tutupan_lahan',
      'penutupanLahan2024': 'penutupan_lahan_2024',
      'pl2024': 'pl2024',
      'jenisTanah': 'jenis_tanah',
      'geologi': 'geologi',
      'lahan_kritis': 'lahan_kritis',
      'rawan_erosi': 'rawan_erosi',
      'rawan_longsor': 'rawan_longsor',
      'rawan_limpasan': 'rawan_limpasan',
      'rawan_karhutla': 'rawan_karhutla'
    };
    
    // Sembunyikan semua layer yang punya bottom tab
    layersWithBottomTabs.forEach(layerName => {
      const layer = layerGroupsRef.current[layerName];
      if (layer && mapInstanceRef.current.hasLayer(layer)) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });
    
    // Tampilkan hanya layer yang sesuai dengan activeBottomTab
    const activeLayerName = tabToLayerMapping[activeBottomTab];
    if (activeLayerName) {
      const activeLayer = layerGroupsRef.current[activeLayerName];
      if (activeLayer && activeLayers.has(activeLayerName)) {
        if (!mapInstanceRef.current.hasLayer(activeLayer)) {
          activeLayer.addTo(mapInstanceRef.current);
          console.log(`👁️ Menampilkan layer: ${activeLayerName}`);
        }
      }
    }
    
  }, [activeBottomTab, activeLayers]);

  const [filters, setFilters] = useState({
    kerawanan: {
      banjir: false,
      tanahLongsor: false,
      kekeringan: false,
      abrasi: false,
      arealBanjir: false,
      arealTanahLongsor: false,
      arealKekeringan: false,
      arealAbrasi: false,
    },
    erosiKebakaran: {
      erosi: false,
      kebakaranHutanLahan: false,
      arealErosi: false,
      arealKebakaranHutan: false,
    },
    mitigasiAdaptasi: {
      rehabilitasiDas: false,
      rehabilitasiHutanLahan: false,
      penerapanTeknik: false,
      bendungan: false,
      danau: false,
      situ: false,
      pengamanPantai: false,
      embung: false,
    },
    lainnya: {
      tutupanLahan: false,
      kawasanHutan: false,
      lahanKritis: false,
      kelerengan: false,
      jenisTanah: false,
      geologi: false,
    }
  });

  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);

  const handleFilterChange = (category, key) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const dummyPhotos = [
    'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
    'https://images.unsplash.com/photo-1551522435-a13afa10f103?w=400',
    'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?w=400',
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
    'https://images.unsplash.com/photo-1534809027769-b00d750a6410?w=400',
    'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
  ];

  const CurahHujanChart = () => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (chartRef.current && window.Chart) {
        const ctx = chartRef.current.getContext('2d');
        
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        const days = Array.from({length: 30}, (_, i) => `Hari ${i + 1}`);
        const rainfallData = [0, 100, 150, 170, 250, 200, 180, 150, 120, 100, 70, 50, 30, 10, 30, 50, 70, 100, 50, 40, 45, 50, 55, 50, 40, 30, 50, 80, 100, 100];
        
        chartInstance.current = new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: days,
            datasets: [
              {
                label: 'Curah Hujan (mm/hari)',
                data: rainfallData,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
              },
              {
                label: 'Batas Kritis (mm)',
                data: Array(30).fill(100),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                pointRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Curah Hujan (mm)'
                }
              }
            }
          }
        });
      }

      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, []);

    return <canvas ref={chartRef} />;
  };

  const JenisTanahChart = () => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (chartRef.current && window.Chart) {
        const ctx = chartRef.current.getContext('2d');
        
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        chartInstance.current = new window.Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Aluvial', 'Latosol', 'Regosol', 'Andosol', 'Podsolik'],
            datasets: [{
              label: 'Persentase (%)',
              data: [25, 30, 15, 20, 10],
              backgroundColor: [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                title: {
                  display: true,
                  text: 'Persentase (%)'
                }
              }
            }
          }
        });
      }

      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, []);

    return <canvas ref={chartRef} />;
  };

  const TutupanLahanChart = () => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (chartRef.current && window.Chart) {
        const ctx = chartRef.current.getContext('2d');
        
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        chartInstance.current = new window.Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Hutan', 'Pertanian', 'Pemukiman', 'Perkebunan', 'Lainnya'],
            datasets: [{
              data: [35, 25, 20, 15, 5],
              backgroundColor: [
                'rgba(34, 197, 94, 0.7)',
                'rgba(251, 191, 36, 0.7)',
                'rgba(239, 68, 68, 0.7)',
                'rgba(168, 85, 247, 0.7)',
                'rgba(156, 163, 175, 0.7)',
              ],
              borderColor: [
                'rgba(34, 197, 94, 1)',
                'rgba(251, 191, 36, 1)',
                'rgba(239, 68, 68, 1)',
                'rgba(168, 85, 247, 1)',
                'rgba(156, 163, 175, 1)',
              ],
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
              }
            }
          }
        });
      }

      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }, []);

    return <canvas ref={chartRef} />;
  };

  useEffect(() => {
  // Refresh data tutupan lahan jika layer aktif dan bounds berubah
  if (activeLayers.has('tutupan_lahan')) {
    fetchTutupanLahanData();
  }
}, [currentBounds, selectedDas]);

  const DataTable = ({ columns, data }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-2 py-1 border text-left text-[10px] font-semibold text-gray-700">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-2 py-1 border text-[10px] text-gray-600">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const bottomTabs = React.useMemo(() => {
  const tabs: Array<{id: string, label: string, icon: string}> = [];
    
  const hasAutoKejadian = Array.from(activeLayers).some(layer => 
    layer.startsWith('kejadian_') && activeKejadianLayers.has(layer)
  );

  if (hasAutoKejadian) {
    tabs.push({ id: 'listings', label: 'Listings', icon: '📋' });
  }

  // Hanya tambahkan tab untuk layer-layer yang punya data bottom tabs
  if (activeLayers.has('tutupan_lahan')) {
    tabs.push({ id: 'tutupanLahan', label: 'Tutupan Lahan', icon: '🌳' });
  }
  
  if (activeLayers.has('penutupan_lahan_2024')) {
    tabs.push({ id: 'penutupanLahan2024', label: 'Penutupan Lahan 2024', icon: '🌲' });
  }

  if (activeLayers.has('pl2024')) {
    tabs.push({ id: 'pl2024', label: 'PL2024', icon: '🌴' });
  }

  if (activeLayers.has('jenis_tanah')) {
    tabs.push({ id: 'jenisTanah', label: 'Jenis Tanah', icon: '🌱' });
  }
  
  if (activeLayers.has('geologi')) {
    tabs.push({ id: 'geologi', label: 'Geologi', icon: '🪨' });
  }
  
  if (activeLayers.has('lahan_kritis')) {
    tabs.push({ id: 'lahan_kritis', label: 'Lahan Kritis', icon: '⚠️' });
  }
  
  if (activeLayers.has('rawan_erosi')) {
    tabs.push({ id: 'rawan_erosi', label: 'Rawan Erosi', icon: '🏔️' });
  }
  
  if (activeLayers.has('rawan_longsor')) {
    tabs.push({ id: 'rawan_longsor', label: 'Rawan Longsor', icon: '⛰️' });
  }
  
  if (activeLayers.has('rawan_limpasan')) {
    tabs.push({ id: 'rawan_limpasan', label: 'Rawan Limpasan', icon: '💧' });
  }
  
  if (activeLayers.has('rawan_karhutla')) {
    tabs.push({ id: 'rawan_karhutla', label: 'Rawan Karhutla', icon: '🔥' });
  }
  
  return tabs;
}, [activeLayers, activeKejadianLayers]);

  const renderBottomContent = () => {
  // Jika tidak ada layer yang aktif atau tidak ada tab
  if (bottomTabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-400">
          <p className="text-sm">Tidak ada data untuk ditampilkan</p>
          <p className="text-xs mt-1">Aktifkan layer untuk melihat data</p>
        </div>
      </div>
    );
  }

  // Render konten berdasarkan tab yang aktif
  switch (activeBottomTab) {
    case 'listings':
      if (kejadianListings.length > 0) {
        return (
          <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-1 gap-2 p-3">
              {kejadianListings.map((kejadian, idx) => (
                <div 
                  key={idx} 
                  className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    // Navigate ke detail kejadian bencana
                    navigate('/detailkejadian', {
                      state: {
                        incident: {
                          id: kejadian.id,
                          title: kejadian.title,
                          image: kejadian.thumbnail_path ? `${API_URL}${kejadian.thumbnail_path}` : 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
                          location: kejadian.location,
                          category: kejadian.category,
                          type: kejadian.category.toLowerCase().includes('banjir') ? 'banjir' : 
                                kejadian.category.toLowerCase().includes('longsor') ? 'longsor' : 'kebakaran',
                          date: kejadian.date,
                          das: kejadian.das,
                          description: kejadian.description,
                          thumbnail_path: kejadian.thumbnail_path,
                          images_paths: kejadian.images_paths,
                          coordinates: [kejadian.latitude, kejadian.longitude],
                          latitude: kejadian.latitude,
                          longitude: kejadian.longitude,
                          featured: kejadian.featured || false,
                          curah_hujan: kejadian.curah_hujan
                        }
                      }
                    });
                  }}
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    {kejadian.thumbnail_path && (
                      <div className="w-20 h-20 flex-shrink-0">
                        <img 
                          src={`${API_URL}${kejadian.thumbnail_path}`}
                          alt={kejadian.title}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/80?text=No+Image';
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-800 mb-1 truncate">
                        {kejadian.title}
                      </h4>
                      <div className="space-y-0.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">📍</span>
                          <span className="truncate">{kejadian.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">📅</span>
                          <span>{new Date(kejadian.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">🏷️</span>
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">
                            {kejadian.category}
                          </span>
                        </div>
                        {kejadian.das && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">💧</span>
                            <span className="text-blue-600">{kejadian.das}</span>
                          </div>
                        )}
                        {(kejadian.curah_hujan !== undefined && kejadian.curah_hujan !== null) && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">🌧️</span>
                            <span className="text-blue-600">{kejadian.curah_hujan} mm</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      } else {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-sm">Tidak ada data kejadian di area yang dipilih</p>
            </div>
          </div>
        );
      }

  case 'tutupanLahan':
  if (activeLayers.has('tutupan_lahan') && tutupanLahanData.length > 0) {
    return (
      <div className="p-3 h-full flex flex-col">
        <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(35vh - 100px)' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '50px' }}>No</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '100px' }}>Warna Layer</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Deskripsi Tutupan Lahan</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '120px' }}>Luas (Ha)</th>
              </tr>
            </thead>
            <tbody>
              {tutupanLahanData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onMouseEnter={() => {
                    setHoveredLayerKey(String(item.pl2024_id));
                    setHoveredLayerType('tutupan_lahan');
                    setHoveredLayerColor(item.color || '#999999');
                  }}
                  onMouseLeave={() => {
                    setHoveredLayerKey(null);
                    setHoveredLayerType(null);
                    setHoveredLayerColor(null);
                  }}
                >
                  <td className="py-2 px-2 text-gray-700">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div 
                      className="w-8 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                  </td>
                  <td className="py-2 px-2 text-gray-700 break-words">{item.deskripsi_domain || '-'}</td>
                  <td className="py-2 px-2 text-gray-700">
                    {item.luas_total ? parseFloat(item.luas_total.toString()).toFixed(2) : '0'}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ height: '80px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (activeLayers.has('tutupan_lahan')) {
    return (
      <div className="p-3 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-sm">Tidak ada data tutupan lahan di area yang dipilih</p>
        </div>
      </div>
    );
  }
  break;

  case 'penutupanLahan2024':
  if (activeLayers.has('penutupan_lahan_2024') && penutupanLahan2024Data.length > 0) {
    return (
      <div className="p-3 h-full flex flex-col">
        <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(35vh - 100px)' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '50px' }}>No</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '100px' }}>Warna Layer</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Deskripsi Tutupan Lahan</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '120px' }}>Luas (Ha)</th>
              </tr>
            </thead>
            <tbody>
              {penutupanLahan2024Data.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onMouseEnter={() => {
                    setHoveredLayerKey(String(item.pl2024_id));
                    setHoveredLayerType('penutupan_lahan_2024');
                    setHoveredLayerColor(item.color || '#999999');
                  }}
                  onMouseLeave={() => {
                    setHoveredLayerKey(null);
                    setHoveredLayerType(null);
                    setHoveredLayerColor(null);
                  }}
                >
                  <td className="py-2 px-2 text-gray-700">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div 
                      className="w-8 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                  </td>
                  <td className="py-2 px-2 text-gray-700 break-words">{item.deskripsi_domain || '-'}</td>
                  <td className="py-2 px-2 text-gray-700">
                    {item.luas_total ? parseFloat(item.luas_total.toString()).toFixed(2) : '0'}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ height: '80px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (activeLayers.has('penutupan_lahan_2024')) {
    return (
      <div className="p-3 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-sm">Tidak ada data tutupan lahan di area yang dipilih</p>
        </div>
      </div>
    );
  }
  break;

  case 'pl2024':
  if (activeLayers.has('pl2024') && pl2024Data.length > 0) {
    return (
      <div className="p-3 h-full flex flex-col">
        <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(35vh - 100px)' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '50px' }}>No</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '100px' }}>Warna Layer</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Deskripsi Tutupan Lahan</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '120px' }}>Luas (Ha)</th>
              </tr>
            </thead>
            <tbody>
              {pl2024Data.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onMouseEnter={() => {
                    setHoveredLayerKey(String(item.pl2024_id));
                    setHoveredLayerType('pl2024');
                    setHoveredLayerColor(item.color || '#999999');
                  }}
                  onMouseLeave={() => {
                    setHoveredLayerKey(null);
                    setHoveredLayerType(null);
                    setHoveredLayerColor(null);
                  }}
                >
                  <td className="py-2 px-2 text-gray-700">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div 
                      className="w-8 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                  </td>
                  <td className="py-2 px-2 text-gray-700 break-words">{item.deskripsi_domain || '-'}</td>
                  <td className="py-2 px-2 text-gray-700">
                    {item.luas_total ? parseFloat(item.luas_total.toString()).toFixed(2) : '0'}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ height: '80px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (activeLayers.has('pl2024')) {
    return (
      <div className="p-3 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-sm">Tidak ada data tutupan lahan di area yang dipilih</p>
        </div>
      </div>
    );
  }
  break;

    case 'jenisTanah':
      if (activeLayers.has('jenis_tanah') && jenisTanahData.length > 0) {
        return (
          <div className="p-3 h-full flex flex-col">
            <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(35vh - 100px)' }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '50px' }}>No</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '100px' }}>Warna Layer</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Jenis Tanah</th>
                  </tr>
                </thead>
                <tbody>
                  {jenisTanahData.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                      onMouseEnter={() => {
                        setHoveredLayerKey(item.jntnh1);
                        setHoveredLayerType('jenis_tanah');
                        setHoveredLayerColor(item.color || '#8B4513');
                      }}
                      onMouseLeave={() => {
                        setHoveredLayerKey(null);
                        setHoveredLayerType(null);
                        setHoveredLayerColor(null);
                      }}
                    >
                      <td className="py-2 px-2 text-gray-700">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <div 
                          className="w-8 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: item.color }}
                        ></div>
                      </td>
                      <td className="py-2 px-2 text-gray-700 break-words">{item.jntnh1 || '-'}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ height: '80px' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      } else if (activeLayers.has('jenis_tanah')) {
        return (
          <div className="p-3 flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-sm">Tidak ada data jenis tanah di area yang dipilih</p>
            </div>
          </div>
        );
      }
      break;

    case 'geologi':
      if (activeLayers.has('geologi') && geologiData.length > 0) {
        return (
          <div className="p-3 h-full flex flex-col">
            <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(35vh - 100px)' }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '50px' }}>No</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '100px' }}>Warna Layer</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Jenis Batuan</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Umur Batuan</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '120px' }}>Keliling (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {geologiData.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                      onMouseEnter={() => {
                        setHoveredLayerKey(`${item.namobj}|${item.umurobj}`);
                        setHoveredLayerType('geologi');
                        setHoveredLayerColor(item.color || '#B45309');
                      }}
                      onMouseLeave={() => {
                        setHoveredLayerKey(null);
                        setHoveredLayerType(null);
                        setHoveredLayerColor(null);
                      }}
                    >
                      <td className="py-2 px-2 text-gray-700">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <div 
                          className="w-8 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: item.color }}
                        ></div>
                      </td>
                      <td className="py-2 px-2 text-gray-700 break-words">{item.namobj || '-'}</td>
                      <td className="py-2 px-2 text-gray-700 break-words">{item.umurobj || '-'}</td>
                      <td className="py-2 px-2 text-gray-700">
                        {item.keliling_total ? parseFloat(item.keliling_total.toString()).toFixed(2) : '0'}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} style={{ height: '80px' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
  } else if (activeLayers.has('geologi')) {
    return (
      <div className="p-3 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-sm">Tidak ada data geologi di area yang dipilih</p>
        </div>
      </div>
    );
  }
  break;

  case 'lahan_kritis':
  if (activeLayers.has('lahan_kritis') && lahanKritisData.length > 0) {
    return (
      <div className="p-3 h-full flex flex-col">
        <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(35vh - 100px)' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '50px' }}>No</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '100px' }}>Warna Layer</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Tingkat Kritis</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '120px' }}>Luas (Ha)</th>
              </tr>
            </thead>
            <tbody>
              {lahanKritisData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onMouseEnter={() => {
                    setHoveredLayerKey(item.kritis);
                    setHoveredLayerType('lahan_kritis');
                    setHoveredLayerColor(item.color || '#808080');
                  }}
                  onMouseLeave={() => {
                    setHoveredLayerKey(null);
                    setHoveredLayerType(null);
                    setHoveredLayerColor(null);
                  }}
                >
                  <td className="py-2 px-2 text-gray-700">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div 
                      className="w-8 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                  </td>
                  <td className="py-2 px-2 text-gray-700 break-words">{item.kritis || '-'}</td>
                  <td className="py-2 px-2 text-gray-700">
                    {item.luas_ha ? item.luas_ha.toFixed(2) : '0'}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ height: '80px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (activeLayers.has('lahan_kritis')) {
    return (
      <div className="p-3 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-sm">Tidak ada data lahan kritis di area yang dipilih</p>
        </div>
      </div>
    );
  }
  break;

case 'rawan_erosi':
  if (activeLayers.has('rawan_erosi') && rawanErosiData.length > 0) {
    return (
      <div className="p-3 h-full flex flex-col">
        <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(35vh - 100px)' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '50px' }}>No</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '100px' }}>Warna Layer</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Tingkat Kerawanan</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '120px' }}>Luas (Ha)</th>
              </tr>
            </thead>
            <tbody>
              {rawanErosiData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onMouseEnter={() => {
                    setHoveredLayerKey(item.tingkat);
                    setHoveredLayerType('rawan_erosi');
                    setHoveredLayerColor(item.color || '#808080');
                  }}
                  onMouseLeave={() => {
                    setHoveredLayerKey(null);
                    setHoveredLayerType(null);
                    setHoveredLayerColor(null);
                  }}
                >
                  <td className="py-2 px-2 text-gray-700">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div 
                      className="w-8 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                  </td>
                  <td className="py-2 px-2 text-gray-700 break-words">{item.tingkat || '-'}</td>
                  <td className="py-2 px-2 text-gray-700">
                    {item.luas_ha ? item.luas_ha.toFixed(2) : '0'}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ height: '80px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (activeLayers.has('rawan_erosi')) {
    return (
      <div className="p-3 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-sm">Tidak ada data rawan erosi di area yang dipilih</p>
        </div>
      </div>
    );
  }
  break;

case 'rawan_longsor':
  if (activeLayers.has('rawan_longsor') && rawanLongsorData.length > 0) {
    return (
      <div className="p-3 h-full flex flex-col">
        <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(35vh - 100px)' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '50px' }}>No</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '100px' }}>Warna Layer</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Tingkat Kerawanan</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '120px' }}>Luas Wilayah</th>
              </tr>
            </thead>
            <tbody>
              {rawanLongsorData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onMouseEnter={() => {
                    setHoveredLayerKey(item.tingkat);
                    setHoveredLayerType('rawan_longsor');
                    setHoveredLayerColor(item.color || '#808080');
                  }}
                  onMouseLeave={() => {
                    setHoveredLayerKey(null);
                    setHoveredLayerType(null);
                    setHoveredLayerColor(null);
                  }}
                >
                  <td className="py-2 px-2 text-gray-700">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div 
                      className="w-8 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                  </td>
                  <td className="py-2 px-2 text-gray-700 break-words">{item.tingkat || '-'}</td>
                  <td className="py-2 px-2 text-gray-700">
                    {item.luas_ha ? item.luas_ha.toFixed(6) : '0'}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ height: '80px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (activeLayers.has('rawan_longsor')) {
    return (
      <div className="p-3 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-sm">Tidak ada data rawan longsor di area yang dipilih</p>
        </div>
      </div>
    );
  }
  break;

case 'rawan_limpasan':
  if (activeLayers.has('rawan_limpasan') && rawanLimpasanData.length > 0) {
    return (
      <div className="p-3 h-full flex flex-col">
        <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(35vh - 100px)' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '50px' }}>No</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '100px' }}>Warna Layer</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Tingkat Limpasan</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '120px' }}>Luas (Ha)</th>
              </tr>
            </thead>
            <tbody>
              {rawanLimpasanData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onMouseEnter={() => {
                    setHoveredLayerKey(item.tingkat);
                    setHoveredLayerType('rawan_limpasan');
                    setHoveredLayerColor(item.color || '#808080');
                  }}
                  onMouseLeave={() => {
                    setHoveredLayerKey(null);
                    setHoveredLayerType(null);
                    setHoveredLayerColor(null);
                  }}
                >
                  <td className="py-2 px-2 text-gray-700">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div 
                      className="w-8 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                  </td>
                  <td className="py-2 px-2 text-gray-700 break-words">{item.tingkat || '-'}</td>
                  <td className="py-2 px-2 text-gray-700">
                    {item.luas_ha ? item.luas_ha.toFixed(2) : '0'}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ height: '80px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (activeLayers.has('rawan_limpasan')) {
    return (
      <div className="p-3 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-sm">Tidak ada data rawan limpasan di area yang dipilih</p>
        </div>
      </div>
    );
  }
  break;

case 'rawan_karhutla':
  if (activeLayers.has('rawan_karhutla') && rawanKarhutlaData.length > 0) {
    return (
      <div className="p-3 h-full flex flex-col">
        <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(35vh - 100px)' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '50px' }}>No</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '100px' }}>Warna Layer</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white">Tingkat Kerawanan</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 bg-white" style={{ width: '120px' }}>Luas (Ha)</th>
              </tr>
            </thead>
            <tbody>
              {rawanKarhutlaData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onMouseEnter={() => {
                    setHoveredLayerKey(item.tingkat);
                    setHoveredLayerType('rawan_karhutla');
                    setHoveredLayerColor(item.color || '#808080');
                  }}
                  onMouseLeave={() => {
                    setHoveredLayerKey(null);
                    setHoveredLayerType(null);
                    setHoveredLayerColor(null);
                  }}
                >
                  <td className="py-2 px-2 text-gray-700">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div 
                      className="w-8 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                  </td>
                  <td className="py-2 px-2 text-gray-700 break-words">{item.tingkat || '-'}</td>
                  <td className="py-2 px-2 text-gray-700">
                    {item.luas_ha ? item.luas_ha.toFixed(2) : '0'}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ height: '80px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (activeLayers.has('rawan_karhutla')) {
    return (
      <div className="p-3 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-sm">Tidak ada data rawan karhutla di area yang dipilih</p>
        </div>
      </div>
    );
  }
  break;

    default:
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <p className="text-sm">Pilih tab untuk melihat data</p>
          </div>
        </div>
      );
  }
};

  return (
    

    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      
      <style>
      {`
        .custom-kejadian-marker {
          background: none;
          border: none;
        }
        
        .marker-container:hover .marker-bg {
          fill: #ef4444 !important;
        }
        
        .custom-kejadian-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .custom-kejadian-popup .leaflet-popup-content {
          margin: 0;
          width: 280px !important;
        }
        
        .custom-kejadian-popup .leaflet-popup-tip {
          display: none;
        }
      `}
    </style>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <Header currentPage="kerawanan" />
         {isAuthenticated && (
        <div className="absolute top-0 left-0 right-0 bg-green-50 border-b border-green-200 px-6 py-2 z-[2100] shadow-md">
          <div className="max-w-full flex justify-between items-center">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span className="text-green-800 text-sm font-medium">
                Logged in as Admin
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      )}
        {/* Top Section: Map with Layer Panel - 65% height */}
        <div className="relative flex" style={{ height: '55vh' }}>
          {/* Map Container */}
          <div className="flex-1 relative">
            <div ref={mapRef} className="w-full h-full"></div>

            {/* Menu Button */}
            {/* <div className="absolute top-4 left-4 z-[1000]">
              <div className="relative">
                <button 
                  onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  className={`bg-orange-500 text-white px-3 py-1.5 rounded shadow-lg text-sm font-semibold hover:bg-orange-600 transition-all ${
                    isAuthenticated ? 'mt-12' : ''
                  }`}
                >
                  MENU
                </button>
                {showMenuDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMenuDropdown(false)}
                    />
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 w-40 z-50">
                      <div
                        onClick={() => {
                          navigate('/kerawanan');
                          setShowMenuDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-gray-700 text-sm font-medium border-b border-gray-200"
                      >
                        Kerawanan
                      </div>
                      <div
                        onClick={() => {
                          navigate('/kebencanaan');
                          setShowMenuDropdown(false);
                        }}
                       className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-gray-700 text-sm font-medium border-b border-gray-200"
                      >
                        Kejadian
                      </div>
                      <div
                        onClick={() => {
                          navigate('/tentang-kami');
                          setShowMenuDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-gray-700 text-sm font-medium"
                      >
                        Tentang Kami
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div> */}

            {/* Coordinates Display */}
            {/* <div className="absolute top-4 left-20 z-[1000] bg-white px-3 py-1.5 rounded shadow-lg">
              <span className="font-mono text-xs">128.11, -11.78</span>
            </div> */}
          </div>

          {/* Layer Services Panel - Smaller width */}
          {isLayerPanelOpen && (
            <div className="w-80 bg-white shadow-2xl flex flex-col z-[2000]" style={{ height: '100vh' }}>
              {/* Header - Smaller */}
              <div className="bg-orange-500 text-white p-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">»</span>
                  <h2 className="text-lg font-semibold">SIMITIGASI (Layer Services)</h2>
                </div>
              </div>

              {/* Loading Indicator */}
              {isLoadingLayer && (
                <div className="bg-blue-50 border-b-2 border-blue-500 p-2 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="text-xs text-blue-700 font-medium">
                    Memuat {loadingLayerNames.size} layer: {Array.from(loadingLayerNames).map(name => formatTableName(name)).join(', ')}...
                  </span>
                </div>
              )}

              {/* Error/Warning/Info Message */}
              {layerError && (
                <div className={`border-b-2 p-2 ${
                  layerError.includes('❌') || layerError.includes('🔌') ? 'bg-red-50 border-red-500' : 
                  layerError.includes('⚠️') ? 'bg-yellow-50 border-yellow-500' : 
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className={`text-xs flex-1 ${
                      layerError.includes('❌') || layerError.includes('🔌') ? 'text-red-700' : 
                      layerError.includes('⚠️') ? 'text-yellow-700' : 
                      'text-blue-700'
                    }`}>
                      {layerError}
                    </span>
                    <button
                      onClick={() => setLayerError('')}
                      className="text-gray-500 hover:text-gray-700 font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pb-8">
                <div className="p-3 pb-20">
                  {/* Tabs - Smaller */}
                  <div className="flex gap-3 mb-4">
  <label className="flex items-center gap-1.5 cursor-pointer">
    <input
      type="radio"
      name="mainTab"
      checked={activeTab === 'administrasi'}
      onChange={() => setActiveTab('administrasi')}
      className="w-3.5 h-3.5"
    />
    <span className="text-sm font-medium">Administrasi</span>
  </label>
  <label className="flex items-center gap-1.5 cursor-pointer">
    <input
      type="radio"
      name="mainTab"
      checked={activeTab === 'das'}
      onChange={() => setActiveTab('das')}
      className="w-3.5 h-3.5"
    />
    <span className="text-sm font-medium">DAS</span>
  </label>
</div>

{/* Area Search Section - Only show when Administrasi tab is active */}
{activeTab === 'administrasi' && (
  <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
    <h3 className="text-sm font-semibold text-gray-800 mb-2">Pilih Area</h3>
    
    {/* Info jika ada DAS terpilih */}
    {selectedDas.length > 0 && (
      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-xs text-yellow-700">
          ⚠️ Filter DAS aktif. Hapus filter DAS untuk menggunakan filter administrasi.
        </p>
      </div>
    )}
    
    {/* Level Selection - Diperkecil dan 2 baris */}
    <div className="mb-2 grid grid-cols-2 gap-1.5">
      <button
        onClick={() => setAdminLevel('provinsi')}
        className={`px-1.5 py-1 text-[10px] rounded ${
          adminLevel === 'provinsi' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300'
        }`}
        disabled={selectedDas.length > 0}
      >
        Provinsi
      </button>
      <button
        onClick={() => setAdminLevel('kabupaten')}
        className={`px-1.5 py-1 text-[10px] rounded ${
          adminLevel === 'kabupaten' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300'
        }`}
        disabled={selectedDas.length > 0}
      >
        Kabupaten
      </button>
      <button
        onClick={() => setAdminLevel('kecamatan')}
        className={`px-1.5 py-1 text-[10px] rounded ${
          adminLevel === 'kecamatan' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300'
        }`}
        disabled={selectedDas.length > 0}
      >
        Kecamatan
      </button>
      <button
        onClick={() => setAdminLevel('kelurahan')}
        className={`px-1.5 py-1 text-[10px] rounded ${
          adminLevel === 'kelurahan' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300'
        }`}
        disabled={selectedDas.length > 0}
      >
        Kelurahan
      </button>
    </div>
    
    {/* Selected Areas */}
    {selectedAreas.length > 0 && (
      <div className="mb-2 flex flex-wrap gap-1">
        {selectedAreas.map((area, index) => (
          <div key={index} className="bg-white px-2 py-1 rounded text-xs border border-blue-300 flex items-center gap-1">
            <span className="text-[10px] bg-blue-100 px-1 rounded">{area.level}</span>
            <span className="truncate max-w-[150px]" title={area.label}>
              {area.label}
            </span>
            <button
              onClick={() => handleRemoveArea(index)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )}
    
    {/* Search Input */}
    <div className="relative">
      <input
        type="text"
        value={areaSearchQuery}
        onChange={(e) => handleAreaSearchChange(e.target.value)}
        onFocus={() => setShowAreaSearchDropdown(true)}
        placeholder={`Cari ${adminLevel}...`}
        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        disabled={selectedDas.length > 0}
      />
      
      {/* Search Results Dropdown */}
      {showAreaSearchDropdown && areaSearchResults.length > 0 && selectedDas.length === 0 && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowAreaSearchDropdown(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto z-50">
            {areaSearchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => handleAreaSelect(result)}
                className="px-2 py-1.5 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <span className="text-[10px] bg-gray-100 px-1 rounded mr-1">{result.level}</span>
                {result.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    
    <div className="text-[10px] text-gray-600 mt-1">
      * Pilih level lalu cari area untuk membatasi tampilan layer
    </div>
  </div>
)}

{/* DAS Search Section - Only show when DAS tab is active */}
{activeTab === 'das' && (
  <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
    <h3 className="text-sm font-semibold text-gray-800 mb-2">Pilih DAS</h3>
    
    {/* Info jika ada Area terpilih */}
    {selectedAreas.length > 0 && (
      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-xs text-yellow-700">
          ⚠️ Filter administrasi aktif. Hapus filter administrasi untuk menggunakan filter DAS.
        </p>
      </div>
    )}
    
    {/* Selected DAS */}
    {selectedDas.length > 0 && (
      <div className="mb-2 flex flex-wrap gap-1">
        {selectedDas.map((das, index) => (
          <div key={index} className="bg-white px-2 py-1 rounded text-xs border border-green-300 flex items-center gap-1">
            <span className="truncate max-w-[200px]" title={das.label}>
              {das.label}
            </span>
            <button
              onClick={() => handleRemoveDas(index)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )}
    
    {/* Search Input */}
    <div className="relative">
      <input
        type="text"
        value={dasSearchQuery}
        onChange={(e) => handleDasSearchChange(e.target.value)}
        onFocus={() => setShowDasSearchDropdown(true)}
        placeholder="Cari DAS..."
        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-green-500"
        disabled={selectedAreas.length > 0}
      />
      
      {/* Search Results Dropdown */}
      {showDasSearchDropdown && dasSearchResults.length > 0 && selectedAreas.length === 0 && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDasSearchDropdown(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto z-50">
            {dasSearchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => handleDasSelect(result)}
                className="px-2 py-1.5 text-xs hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                {result.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    
    <div className="text-[10px] text-gray-600 mt-1">
      * Cari dan pilih DAS untuk membatasi tampilan layer
    </div>
  </div>
)}

 {/* Kerawanan Section */}
<div className="mb-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1.5 border-b-2 border-orange-500">
    Kerawanan
  </h3>
  <div className="grid grid-cols-2 gap-2">
    {((currentBounds && (selectedAreas.length > 0 || selectedDas.length > 0)) ? availableLayers.kerawanan : layerData.kerawanan).map((layer) => (
      <div key={layer.id} className={`flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-200 ${loadingLayerNames.has(layer.name) ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <input 
          type="checkbox" 
          className="w-3 h-3 flex-shrink-0" 
          checked={activeLayers.has(layer.name)}
          onChange={(e) => handleLayerToggle(layer.name, e.target.checked)}
          disabled={loadingLayerNames.has(layer.name)}
        />
        <span 
          className="text-xs flex-1 truncate cursor-help flex items-center gap-1" 
          title={formatTableName(layer.name)}
        >
          {loadingLayerNames.has(layer.name) && (
            <span className="inline-block animate-spin">⏳</span>
          )}
          {formatTableName(layer.name)}
        </span>
        {isAuthenticated && (
          <button
            onClick={() => handleDeleteClick('kerawanan', layer.id, layer.name)}
            className="text-red-500 hover:text-red-700 font-bold text-base flex-shrink-0"
          >
          ×
        </button>
        )}
      </div>
    ))}
    
    {/* Tambah Data Button */}
    {isAuthenticated && (
      <button
        onClick={() => handleAddClick('kerawanan')}
        className="flex items-center gap-1 px-2 py-1 border-2 border-dashed border-blue-400 text-blue-500 rounded hover:bg-blue-50 transition-colors justify-center"
      >
      <span className="text-base font-bold">+</span>
      <span className="text-xs">Tambah Data</span>
    </button>
    )}
  </div>
</div>

{/* Mitigasi dan Adaptasi Section */}
<div className="mb-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1.5 border-b-2 border-orange-500">
    Mitigasi dan Adaptasi
  </h3>
  <div className="grid grid-cols-2 gap-2">
    {((currentBounds && (selectedAreas.length > 0 || selectedDas.length > 0)) ? availableLayers.mitigasiAdaptasi : layerData.mitigasiAdaptasi).map((layer) => (
      <div key={layer.id} className={`flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-200 ${loadingLayerNames.has(layer.name) ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <input 
          type="checkbox" 
          className="w-3 h-3 flex-shrink-0" 
          checked={activeLayers.has(layer.name)}
          onChange={(e) => handleLayerToggle(layer.name, e.target.checked)}
          disabled={loadingLayerNames.has(layer.name)}
        />
        <span 
          className="text-xs flex-1 truncate cursor-help" 
          title={formatTableName(layer.name)}
        >
          {formatTableName(layer.name)}
        </span>
        {isAuthenticated && (
          <button
            onClick={() => handleDeleteClick('kerawanan', layer.id, layer.name)}
            className="text-red-500 hover:text-red-700 font-bold text-base flex-shrink-0"
          >
          ×
        </button>
        )}
      </div>
    ))}
    
    {/* Tambah Data Button */}
    {isAuthenticated && (
      <button
        onClick={() => handleAddClick('mitigasiAdaptasi')}
        className="flex items-center gap-1 px-2 py-1 border-2 border-dashed border-blue-400 text-blue-500 rounded hover:bg-blue-50 transition-colors justify-center"
      >
      <span className="text-base font-bold">+</span>
      <span className="text-xs">Tambah Data</span>
    </button>
    )}
  </div>
</div>

{/* Lain lain Section */}
<div className="mb-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1.5 border-b-2 border-orange-500">
    Lain lain
  </h3>
  <div className="grid grid-cols-2 gap-2">
    {((currentBounds && (selectedAreas.length > 0 || selectedDas.length > 0)) ? availableLayers.lainnya : layerData.lainnya).map((layer) => (
      <div key={layer.id} className={`flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-200 ${loadingLayerNames.has(layer.name) ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <input 
          type="checkbox" 
          className="w-3 h-3 flex-shrink-0" 
          checked={activeLayers.has(layer.name)}
          onChange={(e) => handleLayerToggle(layer.name, e.target.checked)}
          disabled={loadingLayerNames.has(layer.name)}
        />
        <span 
          className="text-xs flex-1 truncate cursor-help" 
          title={formatTableName(layer.name)}
        >
          {formatTableName(layer.name)}
        </span>
        {isAuthenticated && (
          <button
            onClick={() => handleDeleteClick('kerawanan', layer.id, layer.name)}
            className="text-red-500 hover:text-red-700 font-bold text-base flex-shrink-0"
          >
          ×
        </button>
        )}
      </div>
    ))}
    
    {/* Tambah Data Button */}
    {isAuthenticated && (
      <button
        onClick={() => handleAddClick('lainnya')}
        className="flex items-center gap-1 px-2 py-1 border-2 border-dashed border-blue-400 text-blue-500 rounded hover:bg-blue-50 transition-colors justify-center"
      >
      <span className="text-base font-bold">+</span>
      <span className="text-xs">Tambah Data</span>
    </button>
    )}
  </div>
</div>

{/* Kejadian Section */}
<div className="mb-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1.5 border-b-2 border-orange-500">
    Kejadian
  </h3>
  <div className="grid grid-cols-2 gap-2">
    {(((currentBounds && (selectedAreas.length > 0 || selectedDas.length > 0)) ? availableLayers.kejadian : layerData.kejadian) || []).map((layer) => (
      <div key={layer.id} className={`flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-200 ${loadingLayerNames.has(layer.name) ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <input 
          type="checkbox" 
          className="w-3 h-3 flex-shrink-0" 
          checked={activeLayers.has(layer.isManual ? layer.name : layer.id)}
          onChange={(e) => handleLayerToggle(
            layer.isManual ? layer.name : layer.id, 
            e.target.checked, 
            layer.year, 
            layer.category,
            layer.isShapefile
          )}
          disabled={loadingLayerNames.has(layer.name)}
        />
        <span 
          className="text-xs flex-1 truncate cursor-help" 
          title={formatTableName(layer.name)}
        >
          {formatTableName(layer.name)}
        </span>
        {/* {layer.count && (
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            ({layer.count})
          </span>
        )} */}
        {/* Tombol delete hanya untuk layer manual upload */}
        {layer.isManual && isAuthenticated && (
          <button
            onClick={() => {
              setLayerToDelete({
                section: 'kejadian',
                id: layer.id,
                name: layer.name
              });
              setShowDeleteModal(true);
            }}
            className="text-red-500 hover:text-red-700 font-bold text-base flex-shrink-0"
            title="Hapus layer"
          >
            ×
          </button>
        )}
      </div>
    ))}
    
    {/* Tambah Data Button */}
    {isAuthenticated && (
      <button
        onClick={() => handleAddClick('kejadian')}
        className="flex items-center gap-1 px-2 py-1 border-2 border-dashed border-blue-400 text-blue-500 rounded hover:bg-blue-50 transition-colors justify-center"
      >
        <span className="text-base font-bold">+</span>
        <span className="text-xs">Tambah Data</span>
      </button>
    )}
  </div>
  {(layerData.kejadian?.length === 0 || !layerData.kejadian) && (
    <div className="text-xs text-gray-500 italic mt-2">
      Belum ada data kejadian
    </div>
  )}
</div>
                </div>
              </div>
            </div>
          )}

          {/* Toggle Panel Button */}
          <button
            onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
            className="absolute right-0 top-1/3 transform -translate-y-1/2 bg-orange-500 text-white p-1.5 rounded-l-lg shadow-lg z-[1000] hover:bg-orange-600"
            style={{ right: isLayerPanelOpen ? '320px' : '0' }}
          >
            <span className="text-lg">{isLayerPanelOpen ? '»' : '«'}</span>
          </button>
        </div>

        {/* Bottom Section: Charts and Photos - 35% height */}
        <div 
          className="flex border-t-2 border-gray-300 transition-all duration-300 overflow-hidden" 
          style={{ 
            height: '45vh'
          }}
        >
          {/* Charts Section */}
          <div 
            className="flex-1 bg-white flex flex-col overflow-hidden min-w-0 transition-all duration-300"
            style={{ 
              marginRight: isLayerPanelOpen ? '250px' : '0'
            }}
          >
            {/* Bottom Tabs - Smaller */}
            <div className="bg-gray-100 border-b border-gray-300 px-3 py-1.5 overflow-x-auto flex-shrink-0" style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#9ca3af #e5e7eb'
            }}>
              <div className="flex gap-1.5 min-w-max">
              {bottomTabs.map(tab => {
            // Check if this tab's layer is currently loading
            const getLayerNameFromTabId = (tabId: string): string => {
              const mapping: Record<string, string> = {
                'tutupanLahan': 'tutupan_lahan',
                'penutupanLahan2024': 'penutupan_lahan_2024',
                'pl2024': 'pl2024',
                'jenisTanah': 'jenis_tanah',
                'geologi': 'geologi',
                'lahan_kritis': 'lahan_kritis',
                'rawan_erosi': 'rawan_erosi',
                'rawan_longsor': 'rawan_longsor',
                'rawan_limpasan': 'rawan_limpasan',
                'rawan_karhutla': 'rawan_karhutla'
              };
              return mapping[tabId] || '';
            };

            const layerName = getLayerNameFromTabId(tab.id);
            const isTabLoading = loadingLayerNames.has(layerName);

            return (
              <button
                key={tab.id}
                onClick={() => !isTabLoading && setActiveBottomTab(tab.id)}
                disabled={isTabLoading}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeBottomTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : isTabLoading
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-800 cursor-pointer'
                }`}
              >
                {isTabLoading && (
                  <span className="inline-block animate-spin mr-1">⏳</span>
                )}
                {tab.icon} {tab.label}
              </button>
            );
          })}
          </div>
        </div>

            {/* Chart Content - Smaller padding */}
            <div className="flex-1 overflow-hidden p-1">
              {renderBottomContent()}
            </div>
          </div>

        </div>
      </div>

      {/* Modal Tambah Data */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={() => !isUploading && setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-base font-semibold">Tambah Data {getSectionTitle(currentSection)}</h3>
              <button
                onClick={() => !isUploading && setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                disabled={isUploading}
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Masukan nama tabel"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded mb-3 focus:outline-none focus:border-blue-500"
                disabled={isUploading}
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                <input
                  type="file"
                  id="shapefileInput"
                  multiple
                  accept=".shp,.shx,.dbf,.prj,.cpg,.sbn,.sbx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <label
                  htmlFor="shapefileInput"
                  className={`cursor-pointer block ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-3xl text-gray-400 mb-1">☁️</div>
                  <div className="text-gray-500 text-xs mb-2">
                    {uploadedFiles.length > 0 
                      ? `${uploadedFiles.length} file dipilih` 
                      : 'Upload file shapefile (.shp, .shx, .dbf, dll)'}
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="text-[10px] text-gray-400 mt-2">
                      {uploadedFiles.map((f, idx) => (
                        <div key={idx}>{f.name}</div>
                      ))}
                    </div>
                  )}
                </label>
              </div>
              <div className="text-[10px] text-gray-500 mt-2">
                * Wajib upload minimal file .shp, disarankan juga upload .shx, .dbf, .prj
              </div>
              
              {/* Progress Bars */}
              {isUploading && (
                <div className="mt-4 space-y-3">
                  {/* Upload Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">Upload Files</span>
                      <span className="text-xs text-gray-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Insert Progress */}
                  {uploadProgress === 100 && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          Inserting Features
                          {insertStatus && <span className="ml-2 text-gray-500">({insertStatus})</span>}
                        </span>
                        <span className="text-xs text-gray-600">{insertProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${insertProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUploading}
              >
                Batal
              </button>
              <button
                onClick={handleCreateLayer}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={isUploading}
              >
                {isUploading ? (uploadProgress < 100 ? 'Mengupload...' : 'Memproses...') : 'Buat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-base font-semibold">Konfirmasi Hapus</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">
                Apakah Anda yakin ingin menghapus layer <strong>{layerToDelete?.name}</strong>?
              </p>
              <p className="text-xs text-red-500 mt-2">
                Tindakan ini tidak dapat dibatalkan dan akan menghapus tabel dari database.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhotoIndex !== null && kejadianPhotos.length > 0 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-[2000] flex items-center justify-center"
          onClick={() => setSelectedPhotoIndex(null)}
          style={{ cursor: 'pointer' }}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 bg-transparent border-none cursor-pointer z-[2001]"
            style={{ background: 'none', border: 'none' }}
          >
            ×
          </button>
          
          {/* Previous Button */}
          {selectedPhotoIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhotoIndex(prev => prev > 0 ? prev - 1 : 0);
              }}
              className="absolute left-4 text-white text-5xl hover:text-gray-300 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 2002 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}
          
          {/* Main Content */}
          <div 
            className="relative max-w-4xl max-h-screen p-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#000',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden'
            }}
          >
            {/* Main Image */}
            <img
              src={`${API_URL}${kejadianPhotos[selectedPhotoIndex].path}`}
              alt={`${kejadianPhotos[selectedPhotoIndex].incident_type}`}
              className="max-w-full max-h-full object-contain block"
              style={{
                maxWidth: '800px',
                maxHeight: '500px',
                width: '100%',
                height: 'auto'
              }}
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/800?text=Image+Not+Found';
              }}
            />
            
            {/* Photo Info */}
            <div className="text-white text-center mt-4 px-4">
              <p className="text-lg font-semibold">
                Foto {selectedPhotoIndex + 1} dari {kejadianPhotos.length}
              </p>
              <p className="text-sm mt-2">
                {kejadianPhotos[selectedPhotoIndex].incident_type} - {' '}
                {new Date(kejadianPhotos[selectedPhotoIndex].incident_date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              {kejadianPhotos[selectedPhotoIndex].title && (
                <p className="text-xs text-gray-300 mt-1">
                  {kejadianPhotos[selectedPhotoIndex].title}
                </p>
              )}
            </div>
            
            {/* Thumbnails */}
            <div 
              className="flex gap-2 mt-4 px-4 pb-4 overflow-x-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#ccc #000'
              }}
            >
              {kejadianPhotos.map((photo, idx) => (
                <img
                  key={idx}
                  src={`${API_URL}${photo.path}`}
                  alt={`Thumbnail ${idx + 1}`}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className="flex-shrink-0 w-20 h-20 object-cover rounded cursor-pointer"
                  style={{
                    border: selectedPhotoIndex === idx ? '3px solid #f97316' : '2px solid transparent',
                    opacity: selectedPhotoIndex === idx ? 1 : 0.6
                  }}
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/80?text=No+Image';
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Next Button */}
          {selectedPhotoIndex < kejadianPhotos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhotoIndex(prev => prev < kejadianPhotos.length - 1 ? prev + 1 : prev);
              }}
              className="absolute right-4 text-white text-5xl hover:text-gray-300 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 2002 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Header Trademark */}
      
    </div>
  );
};

export default Kerawanan;