// src/components/detailmap/DetailMapWithMultipleMarkers.tsx - WITH COMPLETE DEBUG
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {API_URL} from '../../api';

interface KejadianMapData {
  id: number;
  title: string;
  provinsi: string;
  disaster_type: string;
  report_type: string;
  incident_date: string;
  latitude: number;
  longitude: number;
  thumbnail_url: string | null;
}

interface DetailMapProps {
  position: [number, number];
  kejadianData: {
    id: number;
    title: string;
    provinsi: string;
    disaster_type: string;
    report_type: string;
    incident_date: string;
  };
  storedFilterData?: any;
  selectedYear?: number | null;
  isYearLoading?: boolean;
}

// Custom marker icons for different kejadian
const createCustomIcon = (isActive: boolean = false, isClosest: boolean = false) => {
  let backgroundColor = '#3b82f6';
  let symbol = '●';
  
  if (isActive) {
    backgroundColor = '#ef4444';
    symbol = '★';
  } else if (isClosest) {
    backgroundColor = '#10b981';
    symbol = '♦';
  }
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${backgroundColor};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">
        ${symbol}
      </div>
    `,
    className: 'custom-kejadian-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Component to fit map bounds to all markers
const FitBounds: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    console.log('=== FIT BOUNDS DEBUG ===');
    console.log('Positions received:', positions);
    console.log('Positions count:', positions.length);
    
    if (positions.length > 1) {
      try {
        const bounds = L.latLngBounds(positions);
        console.log('Calculated bounds:', bounds.toBBoxString());
        map.fitBounds(bounds, { padding: [20, 20] });
        console.log('✅ Map bounds fitted successfully');
      } catch (error) {
        console.error('❌ Error fitting bounds:', error);
      }
    } else if (positions.length === 1) {
      console.log('Single position, centering map at:', positions[0]);
      map.setView(positions[0], 13);
    } else {
      console.log('⚠️ No positions to fit bounds');
    }
  }, [positions, map]);

  return null;
};

// Function to find kejadian closest to current date
const findClosestToToday = (kejadianList: KejadianMapData[], currentKejadianId: number): number | null => {
  console.log('=== FIND CLOSEST TO TODAY DEBUG ===');
  
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11
  const currentDay = today.getDate(); // 1-31
  
  let closestKejadian = null;
  let minDaysDifference = Infinity;

  console.log('Current date info:', { 
    currentMonth: currentMonth + 1, 
    currentDay,
    totalKejadian: kejadianList.length,
    currentKejadianId 
  });

  if (kejadianList.length === 0) {
    console.log('❌ No kejadian in list to compare');
    return null;
  }

  console.log('Kejadian list for comparison:', kejadianList.map(k => ({
    id: k.id,
    title: k.title,
    date: k.incident_date
  })));

  for (const kejadian of kejadianList) {
    // Skip the current kejadian that's being viewed
    if (kejadian.id === currentKejadianId) {
      console.log(`Skipping current kejadian: ${kejadian.id}`);
      continue;
    }

    const kejadianDate = new Date(kejadian.incident_date);
    const kejadianMonth = kejadianDate.getMonth();
    const kejadianDay = kejadianDate.getDate();
    
    // Calculate difference in days within the year
    // Convert both dates to day of year for comparison
    const todayDayOfYear = getDayOfYear(currentMonth, currentDay);
    const kejadianDayOfYear = getDayOfYear(kejadianMonth, kejadianDay);
    
    // Calculate minimum distance considering year wrap-around
    let daysDifference = Math.abs(todayDayOfYear - kejadianDayOfYear);
    const yearWrapDifference = 365 - daysDifference;
    daysDifference = Math.min(daysDifference, yearWrapDifference);

    console.log(`Kejadian ${kejadian.id} (${kejadian.title}):`, {
      incident_date: kejadian.incident_date,
      kejadianDayOfYear,
      daysDifference: `${daysDifference} days`
    });

    if (daysDifference < minDaysDifference) {
      minDaysDifference = daysDifference;
      closestKejadian = kejadian.id;
      console.log(`🎯 New closest found: ${kejadian.id} with ${daysDifference} days difference`);
    }
  }

  console.log('Final closest kejadian result:', { 
    closestId: closestKejadian, 
    minDays: minDaysDifference 
  });
  
  return closestKejadian;
};

// Helper function to get day of year from month and day
const getDayOfYear = (month: number, day: number): number => {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = day;
  
  for (let i = 0; i < month; i++) {
    dayOfYear += daysInMonth[i];
  }
  
  return dayOfYear;
};

// Helper function untuk create default layers jika tidak ada storedFilterData
const createDefaultLayers = (kejadianData: any) => {
  console.log('🔧 Creating default layers for kejadian:', kejadianData);
  const layers = [];
  
  // Layer batas provinsi
  if (kejadianData.provinsi) {
    layers.push({
      name: `Provinsi ${kejadianData.provinsi}`,
      type: 'boundary',
      endpoint: '/api/layers/provinsi',
      filter: { provinsi: kejadianData.provinsi }
    });
  }
  
  // Layer disaster berdasarkan jenis bencana
  const disasterTypeMapping = {
    'Longsor': 'rawan_longsor',
    'Banjir': 'rawan_banjir', 
    'Kebakaran': 'rawan_karhutla_2024',
    'Gempa': 'rawan_gempa'
  };
  
  const disasterTable = disasterTypeMapping[kejadianData.disaster_type];
  if (disasterTable) {
    layers.push({
      name: `Kerawanan ${kejadianData.disaster_type}`,
      type: 'disaster',
      endpoint: `/api/layers/${disasterTable}`,
      filter: { 
        filterType: 'province', 
        provinceName: kejadianData.provinsi 
      }
    });
  }
  
  console.log('Default layers created:', layers);
  return layers;
};

export const DetailMapWithMultipleMarkers: React.FC<DetailMapProps> = ({ 
  position, 
  kejadianData, 
  storedFilterData,
  selectedYear = null,
  isYearLoading = false
}) => {
  const [allKejadianData, setAllKejadianData] = useState<KejadianMapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [layerData, setLayerData] = useState<any[]>([]);
  const [layerLoadingStatus, setLayerLoadingStatus] = useState<{[key: string]: 'loading' | 'success' | 'error'}>({});
  const [layerDebugInfo, setLayerDebugInfo] = useState<any[]>([]);
  const [closestKejadianId, setClosestKejadianId] = useState<number | null>(null);
  const [activeKejadianId, setActiveKejadianId] = useState<number>(kejadianData.id);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const navigate = useNavigate();

  // DEBUG: Log initial props
  useEffect(() => {
    console.log('=== DETAIL MAP COMPONENT INITIALIZED ===');
    console.log('Initial props:', {
      position,
      kejadianData,
      selectedYear,
      isYearLoading,
      hasStoredFilterData: !!storedFilterData
    });
    console.log('StoredFilterData:', storedFilterData);
  }, []);

  // Load kejadian data based on selected year with proper year change detection
  useEffect(() => {
    const loadKejadianForYear = async () => {
      console.log('=== LOAD KEJADIAN FOR YEAR STARTED ===');
      console.log('Selected year:', selectedYear);
      console.log('Current kejadian data:', kejadianData);
      
      if (!selectedYear) {
        console.log('❌ No selected year, exiting');
        return;
      }
      
      console.log(`📅 Loading kejadian data for year: ${selectedYear}`);
      setLoading(true);
      
      try {
        const params = new URLSearchParams();
        
        // Filter berdasarkan tahun yang dipilih
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;
        
        params.append('start_date', startDate);
        params.append('end_date', endDate);
        
        // Filter berdasarkan kriteria yang sama
        if (kejadianData.report_type) {
          params.append('report_type', kejadianData.report_type);
        }
        if (kejadianData.disaster_type) {
          params.append('disaster_type', kejadianData.disaster_type);
        }
        
        // Filter lokasi berdasarkan context yang sama dengan yearly stats
        if (storedFilterData) {
          console.log('Using storedFilterData for location filter:', storedFilterData);
          if (storedFilterData.locationType === 'DAS' && storedFilterData.selectedValue) {
            params.append('das', storedFilterData.selectedValue);
            console.log('Added DAS filter:', storedFilterData.selectedValue);
          } else if (storedFilterData.locationType === 'Daerah Administratif' && storedFilterData.selectedValue) {
            params.append('provinsi', storedFilterData.selectedValue);
            console.log('Added Provinsi filter:', storedFilterData.selectedValue);
          }
        } else {
          // Fallback: gunakan provinsi dari kejadian saat ini
          params.append('provinsi', kejadianData.provinsi);
          console.log('Using fallback provinsi filter:', kejadianData.provinsi);
        }

        const requestUrl = `${API_URL}/api/kejadian?${params.toString()}`;
        console.log('🌐 Fetching kejadian with URL:', requestUrl);

        const response = await fetch(requestUrl);
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (response.ok) {
          const data = await response.json();
          
          console.log('=== KEJADIAN DATA RESPONSE ===');
          console.log(`Total kejadian found: ${data.length}`);
          console.log('Kejadian details:', data.map(k => ({
            id: k.id,
            title: k.title,
            date: k.incident_date,
            coordinates: [k.latitude, k.longitude],
            disaster_type: k.disaster_type
          })));
          
          setAllKejadianData(data);
          
          // FIXED: Determine active kejadian based on year
          const currentKejadianYear = new Date(kejadianData.incident_date).getFullYear();
          
          console.log('=== ACTIVE KEJADIAN LOGIC ===');
          console.log('Current kejadian year:', currentKejadianYear);
          console.log('Selected year:', selectedYear);
          console.log('Is same year?', selectedYear === currentKejadianYear);
          
          if (selectedYear === currentKejadianYear) {
            // If selected year is same as current kejadian year, keep current kejadian as active
            console.log('✅ Same year - keeping current kejadian as active');
            setActiveKejadianId(kejadianData.id);
            
            // But still find closest for marker styling
            if (data.length > 1) {
              const closestId = findClosestToToday(data, kejadianData.id);
              setClosestKejadianId(closestId);
              console.log('Closest kejadian for marker styling:', closestId);
            }
          } else {
            // If different year, find closest kejadian to today's date and make it active
            console.log('🔄 Different year - finding closest to today');
            if (data.length > 0) {
              const closestId = findClosestToToday(data, kejadianData.id);
              setClosestKejadianId(closestId);
              setActiveKejadianId(closestId || data[0].id); // Fallback to first kejadian if no closest found
              console.log(`Year changed to ${selectedYear}, new active kejadian: ${closestId || data[0].id}`);
            }
          }
        } else {
          console.error('❌ Failed to fetch kejadian for selected year, status:', response.status);
          const errorText = await response.text();
          console.error('Error details:', errorText);
          setAllKejadianData([]);
          setClosestKejadianId(null);
          setActiveKejadianId(kejadianData.id);
        }
      } catch (error) {
        console.error('💥 Error fetching kejadian for selected year:', error);
        setAllKejadianData([]);
        setClosestKejadianId(null);
        setActiveKejadianId(kejadianData.id);
      } finally {
        setLoading(false);
        console.log('=== LOAD KEJADIAN FOR YEAR COMPLETED ===');
      }
    };

    loadKejadianForYear();
  }, [selectedYear, kejadianData, storedFilterData]);

  // Handle marker click
  const handleMarkerClick = (clickedKejadian: KejadianMapData) => {
    console.log('=== MARKER CLICKED ===');
    console.log('Clicked kejadian:', clickedKejadian);
    console.log('Current kejadian ID:', kejadianData.id);
    
    if (clickedKejadian.id !== kejadianData.id) {
      // Store current filter data before navigation
      if (storedFilterData) {
        try {
          sessionStorage.setItem('lastFilterData', JSON.stringify(storedFilterData));
          console.log('✅ Filter data stored for navigation:', storedFilterData);
        } catch (error) {
          console.error('❌ Error storing filter data:', error);
        }
      }
      
      // Navigate to the clicked kejadian detail
      console.log(`🧭 Navigating to kejadian detail: ${clickedKejadian.id}`);
      navigate(`/detail-kejadian/${clickedKejadian.id}`);
    } else {
      console.log('⚠️ Clicked on current kejadian, no navigation needed');
    }
  };

  const getBoundaryStyle = () => ({
    color: '#FFA500',
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.1,
    fillColor: '#FFA500'
  });

  const getDisasterStyle = (disasterTable: string) => {
    const colorMap: Record<string, string> = {
      'lahan_kritis': '#FF4444',
      'penutupan_lahan_2024': '#44FF44',
      'rawan_erosi': '#FFAA44',
      'rawan_karhutla_2024': '#AA44FF',
      'rawan_limpasan': '#4444FF'
    };

    return {
      color: colorMap[disasterTable] || '#666666',
      weight: 1,
      opacity: 0.7,
      fillOpacity: 0.5,
      fillColor: colorMap[disasterTable] || '#666666'
    };
  };

  // Load layer data with debug information
  useEffect(() => {
    const loadLayerData = async () => {
      console.log('=== LOAD LAYER DATA STARTED ===');
      console.log('StoredFilterData available?', !!storedFilterData);
      console.log('StoredFilterData.layers?', storedFilterData?.layers);
      
      // Reset states
      setLayerDebugInfo([]);
      setLayerLoadingStatus({});

      if (!storedFilterData) {
        console.log('⚠️ No storedFilterData - creating default layers');
        try {
          const defaultLayers = createDefaultLayers(kejadianData);
          
          // Load default layers
          const layerPromises = defaultLayers.map(async (layer, index) => {
            const layerName = layer.name;
            console.log(`🔄 Loading default layer: ${layerName}`);
            
            setLayerLoadingStatus(prev => ({ ...prev, [layerName]: 'loading' }));
            
            const params = new URLSearchParams();
            Object.entries(layer.filter).forEach(([key, value]) => {
              if (value) params.append(key, value as string);
            });

            const url = `${API_URL}${layer.endpoint}?${params}`;
            console.log(`📡 Fetching default layer: ${url}`);

            try {
              const response = await fetch(url);
              
              if (response.ok) {
                const data = await response.json();
                console.log(`✅ Default layer ${layerName} loaded: ${data.length} features`);
                
                setLayerLoadingStatus(prev => ({ ...prev, [layerName]: 'success' }));
                
                return {
                  ...layer,
                  name: layerName,
                  data: data,
                  style: layer.type === 'boundary' ? getBoundaryStyle() : getDisasterStyle('default')
                };
              } else {
                console.error(`❌ Default layer ${layerName} failed: ${response.status}`);
                setLayerLoadingStatus(prev => ({ ...prev, [layerName]: 'error' }));
                return null;
              }
            } catch (error) {
              console.error(`💥 Default layer ${layerName} error:`, error);
              setLayerLoadingStatus(prev => ({ ...prev, [layerName]: 'error' }));
              return null;
            }
          });

          const results = await Promise.all(layerPromises);
          const successfulLayers = results.filter(Boolean);
          
          console.log(`🎯 Default layer loading complete: ${successfulLayers.length}/${defaultLayers.length} successful`);
          setLayerData(successfulLayers);
        } catch (error) {
          console.error('💥 Error creating default layers:', error);
        }
        return;
      }

      if (!storedFilterData.layers) {
        console.log('❌ StoredFilterData exists but no layers property');
        return;
      }

      console.log('🗺️ Starting to load layers from storedFilterData:', storedFilterData.layers);

      const debugInfo: any[] = [];
      
      try {
        const layerPromises = storedFilterData.layers.map(async (layer: any, index: number) => {
          const layerName = layer.name || `Layer ${index + 1}`;
          console.log(`🔄 Loading stored layer: ${layerName}`, layer);
          
          setLayerLoadingStatus(prev => ({ ...prev, [layerName]: 'loading' }));
          
          const params = new URLSearchParams();
          
          Object.entries(layer.filter).forEach(([key, value]) => {
            if (value) params.append(key, value as string);
          });

          const url = `${API_URL}${layer.endpoint}?${params}`;
          console.log(`📡 Fetching stored layer: ${url}`);

          const debugEntry = {
            name: layerName,
            type: layer.type,
            endpoint: layer.endpoint,
            filter: layer.filter,
            url: url,
            status: 'loading',
            featureCount: 0,
            error: null
          };

          try {
            const response = await fetch(url);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`✅ Stored layer ${layerName} loaded successfully:`, {
                featureCount: data.length,
                sampleData: data.slice(0, 2)
              });
              
              setLayerLoadingStatus(prev => ({ ...prev, [layerName]: 'success' }));
              
              debugEntry.status = 'success';
              debugEntry.featureCount = data.length;
              debugInfo.push(debugEntry);
              
              return {
                ...layer,
                name: layerName,
                data: data,
                style: layer.type === 'boundary' ? getBoundaryStyle() : getDisasterStyle(storedFilterData.disasterTable || 'default')
              };
            } else {
              const errorText = await response.text();
              console.error(`❌ Stored layer ${layerName} failed to load:`, response.status, errorText);
              
              setLayerLoadingStatus(prev => ({ ...prev, [layerName]: 'error' }));
              
              debugEntry.status = 'error';
              debugEntry.error = `HTTP ${response.status}: ${errorText}`;
              debugInfo.push(debugEntry);
              
              return null;
            }
          } catch (error) {
            console.error(`💥 Stored layer ${layerName} error:`, error);
            
            setLayerLoadingStatus(prev => ({ ...prev, [layerName]: 'error' }));
            
            debugEntry.status = 'error';
            debugEntry.error = error instanceof Error ? error.message : String(error);
            debugInfo.push(debugEntry);
            
            return null;
          }
        });

        const results = await Promise.all(layerPromises);
        const successfulLayers = results.filter(Boolean);
        
        console.log(`🎯 Stored layer loading complete:`, {
          totalLayers: storedFilterData.layers.length,
          successfulLayers: successfulLayers.length,
          failedLayers: storedFilterData.layers.length - successfulLayers.length
        });
        
        setLayerData(successfulLayers);
        setLayerDebugInfo(debugInfo);
        
      } catch (error) {
        console.error('💥 Error in loadLayerData:', error);
        setLayerDebugInfo(prev => [...prev, {
          name: 'System Error',
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        }]);
      }

      console.log('=== LOAD LAYER DATA COMPLETED ===');
    };

    loadLayerData();
  }, [storedFilterData, kejadianData]);

  // Prepare all positions for map bounds with debug
  const allPositions = React.useMemo(() => {
    const positions: [number, number][] = allKejadianData.map(kejadian => [
      kejadian.latitude, 
      kejadian.longitude
    ]);
    
    console.log('=== ALL POSITIONS FOR MAP BOUNDS ===');
    console.log('Total kejadian data:', allKejadianData.length);
    console.log('Positions array:', positions);
    console.log('Valid positions:', positions.filter(pos => 
      !isNaN(pos[0]) && !isNaN(pos[1]) && 
      pos[0] >= -90 && pos[0] <= 90 && 
      pos[1] >= -180 && pos[1] <= 180
    ));
    
    return positions;
  }, [allKejadianData]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Loading overlay */}
      {(loading || isYearLoading) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#3b82f6'
        }}>
          {isYearLoading ? 'Mengubah tahun...' : 'Memuat data...'}
        </div>
      )}

      <MapContainer
        center={position}
        zoom={allKejadianData.length > 1 ? 10 : 13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Render layer data */}
        {layerData.map((layer, index) => {
          console.log(`🗺️ Rendering layer ${index}:`, layer.name, `(${layer.data?.length || 0} features)`);
          
          if (!layer.data || layer.data.length === 0) {
            console.log(`⚠️ Skipping layer ${layer.name} - no data`);
            return null;
          }

          return (
            <GeoJSON
              key={`${layer.type}-${index}-${layer.name}`}
              data={{
                type: 'FeatureCollection',
                features: layer.data
              }}
              style={() => layer.style}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties;
                const popupContent = Object.entries(properties)
                  .slice(0, 5)
                  .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                  .join('<br/>');
                
                layer.bindPopup(popupContent);
              }}
            />
          );
        })}
        
        {/* Fit bounds to show all markers */}
        {allPositions.length > 0 && <FitBounds positions={allPositions} />}
        
        {/* Render markers with proper active state logic and debug */}
        {allKejadianData.map((kejadian) => {
          const isOriginalKejadian = kejadian.id === kejadianData.id;
          const isCurrentlyActive = kejadian.id === activeKejadianId;
          const isClosest = kejadian.id === closestKejadianId;
          const markerPosition: [number, number] = [kejadian.latitude, kejadian.longitude];
          
          // Debug marker rendering
          console.log(`🎯 Rendering marker for kejadian ${kejadian.id}:`, {
            isOriginalKejadian,
            isCurrentlyActive, 
            isClosest,
            position: markerPosition,
            title: kejadian.title
          });
          
          return (
            <Marker
              key={kejadian.id}
              position={markerPosition}
              icon={createCustomIcon(isCurrentlyActive, isClosest && !isCurrentlyActive)}
              eventHandlers={{
                click: () => {
                  console.log(`🖱️ Marker clicked for kejadian ${kejadian.id}`);
                  handleMarkerClick(kejadian);
                }
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  {kejadian.thumbnail_url && (
                    <img 
                      src={`${API_URL}${kejadian.thumbnail_url}`}
                      alt={kejadian.title}
                      style={{ 
                        width: '100%', 
                        height: '100px', 
                        objectFit: 'cover',
                        marginBottom: '8px',
                        borderRadius: '4px'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <strong style={{ 
                      color: isCurrentlyActive ? '#ef4444' : isClosest ? '#10b981' : '#3b82f6' 
                    }}>
                      {isCurrentlyActive ? '★ ' : (isClosest && !isCurrentlyActive) ? '♦ ' : ''}
                      {kejadian.title}
                    </strong><br />
                    <small>{kejadian.provinsi}</small><br />
                    <small>{kejadian.disaster_type} - {kejadian.report_type}</small><br />
                    <small>Tanggal: {new Date(kejadian.incident_date).toLocaleDateString('id-ID')}</small>
                    
                    {/* Status indicators */}
                    {isOriginalKejadian && (
                      <div style={{ 
                        marginTop: '4px', 
                        fontSize: '11px', 
                        color: '#ef4444',
                        fontStyle: 'italic'
                      }}>
                        Kejadian Utama
                      </div>
                    )}
                    {isClosest && !isCurrentlyActive && (
                      <div style={{ 
                        marginTop: '4px', 
                        fontSize: '11px', 
                        color: '#10b981',
                        fontStyle: 'italic'
                      }}>
                        Terdekat dengan hari ini
                      </div>
                    )}
                    {isCurrentlyActive && !isOriginalKejadian && (
                      <div style={{ 
                        marginTop: '4px', 
                        fontSize: '11px', 
                        color: '#ef4444',
                        fontStyle: 'italic'
                      }}>
                        Aktif (Terdekat hari ini)
                      </div>
                    )}
                    
                    {!isCurrentlyActive && (
                      <div style={{ marginTop: '8px' }}>
                        <button 
                          onClick={() => handleMarkerClick(kejadian)}
                          style={{
                            background: isClosest ? '#10b981' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Lihat Detail
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Debug Layer Toggle Button */}
      {/* <button
        onClick={() => setShowDebugPanel(!showDebugPanel)}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 1001,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}
      >
        🐛 Debug ({layerData.length} layers, {allKejadianData.length} kejadian)
      </button> */}

      {/* Enhanced Debug Panel */}
      {showDebugPanel && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.98)',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          fontSize: '12px',
          zIndex: 1000,
          maxWidth: '450px',
          maxHeight: '600px',
          overflowY: 'auto',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>🐛 Complete Debug Panel</span>
            <button
              onClick={() => setShowDebugPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '0',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
          
          {/* Kejadian Debug Section */}
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>📍 Kejadian Debug</div>
            <div>Selected Year: {selectedYear}</div>
            <div>Current Kejadian: {kejadianData.title} (ID: {kejadianData.id})</div>
            <div>Active Kejadian ID: {activeKejadianId}</div>
            <div>Closest Kejadian ID: {closestKejadianId}</div>
            <div>Total Kejadian Loaded: {allKejadianData.length}</div>
            <div>All Positions: {allPositions.length}</div>
            
            {allKejadianData.length > 0 && (
              <details style={{ marginTop: '8px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '11px' }}>Show All Kejadian</summary>
                <div style={{ marginTop: '4px', fontSize: '10px', maxHeight: '100px', overflowY: 'auto' }}>
                  {allKejadianData.map(k => (
                    <div key={k.id} style={{ 
                      padding: '2px 0', 
                      borderBottom: '1px solid #e5e7eb',
                      color: k.id === activeKejadianId ? '#ef4444' : (k.id === closestKejadianId ? '#10b981' : '#666')
                    }}>
                      {k.id === activeKejadianId ? '★' : (k.id === closestKejadianId ? '♦' : '●')} 
                      {k.id}: {k.title} ({k.incident_date})
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Filter Data Debug Section */}
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🔍 Filter Data Debug</div>
            {storedFilterData ? (
              <>
                <div>Category: {storedFilterData.category || 'N/A'}</div>
                <div>Disaster Type: {storedFilterData.disasterType || 'N/A'}</div>
                <div>Location Type: {storedFilterData.locationType || 'N/A'}</div>
                <div>Selected Value: {storedFilterData.selectedValue || 'N/A'}</div>
                <div>Has Layers: {storedFilterData.layers ? 'Yes' : 'No'}</div>
                {storedFilterData.layers && (
                  <div>Layers Count: {storedFilterData.layers.length}</div>
                )}
              </>
            ) : (
              <div style={{ color: '#666', fontStyle: 'italic' }}>No stored filter data</div>
            )}
          </div>
          
          {/* Layers Debug Section */}
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🗺️ Layers Debug</div>
            <div>Loaded Layers: {layerData.length}</div>
            
            {layerDebugInfo.length === 0 && layerData.length === 0 ? (
              <div style={{ color: '#f59e0b' }}>No layers loaded</div>
            ) : (
              layerDebugInfo.map((layer, index) => (
                <div key={index} style={{
                  marginBottom: '8px',
                  padding: '6px',
                  border: `1px solid ${layer.status === 'success' ? '#10b981' : layer.status === 'error' ? '#ef4444' : '#f59e0b'}`,
                  borderRadius: '4px',
                  backgroundColor: layer.status === 'success' ? '#f0fdf4' : layer.status === 'error' ? '#fef2f2' : '#fffbeb',
                  fontSize: '11px'
                }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: layer.status === 'success' ? '#10b981' : layer.status === 'error' ? '#ef4444' : '#f59e0b'
                  }}>
                    {layer.status === 'success' ? '✅' : layer.status === 'error' ? '❌' : '🔄'} {layer.name}
                  </div>
                  
                  {layer.status === 'success' && (
                    <div style={{ color: '#10b981' }}>
                      Features: {layer.featureCount}
                    </div>
                  )}
                  
                  {layer.status === 'error' && layer.error && (
                    <div style={{ color: '#ef4444', fontSize: '10px' }}>
                      Error: {layer.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Map State Debug Section */}
          <div style={{ padding: '10px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🗺️ Map State Debug</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Year Loading: {isYearLoading ? 'Yes' : 'No'}</div>
            <div>Map Position: [{position[0].toFixed(6)}, {position[1].toFixed(6)}]</div>
            <div>Valid Positions: {allPositions.filter(pos => 
              !isNaN(pos[0]) && !isNaN(pos[1])
            ).length}/{allPositions.length}</div>
            
            <details style={{ marginTop: '8px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '11px' }}>Show All Coordinates</summary>
              <div style={{ marginTop: '4px', fontSize: '10px', maxHeight: '80px', overflowY: 'auto' }}>
                {allPositions.map((pos, idx) => (
                  <div key={idx}>
                    Position {idx}: [{pos[0]?.toFixed(4) || 'Invalid'}, {pos[1]?.toFixed(4) || 'Invalid'}]
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Enhanced Info Panel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '10px',
        borderRadius: '6px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        fontSize: '12px',
        zIndex: 1000,
        maxWidth: '220px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          Kejadian Tahun {selectedYear || new Date(kejadianData.incident_date).getFullYear()}
        </div>
        <div>
          {loading ? 'Memuat...' : `${allKejadianData.length} kejadian ditemukan`}
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', lineHeight: '1.3' }}>
          <div>★ = Kejadian aktif</div>
          <div>♦ = Terdekat hari ini</div>
          <div>● = Kejadian lain</div>
        </div>
        {selectedYear && selectedYear !== new Date(kejadianData.incident_date).getFullYear() && (
          <div style={{ 
            marginTop: '6px', 
            fontSize: '11px', 
            color: '#10b981',
            fontStyle: 'italic'
          }}>
            Aktif: Kejadian terdekat dengan {new Date().toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>

      {/* Enhanced Filter Legend */}
      {(storedFilterData || kejadianData) && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '10px',
          borderRadius: '6px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          fontSize: '12px',
          zIndex: 1000,
          maxWidth: '250px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Filter & Context
          </div>
          
          <div>{(storedFilterData?.category || kejadianData.disaster_type)} - {(storedFilterData?.disasterType || kejadianData.report_type)}</div>
          
          <div style={{ fontSize: '11px', color: '#666' }}>
            {storedFilterData?.locationType || 'Provinsi'}: {storedFilterData?.selectedValue || kejadianData.provinsi}
          </div>
          
          {selectedYear && (
            <div style={{ 
              fontSize: '11px', 
              color: '#3b82f6', 
              marginTop: '4px',
              fontWeight: 'bold'
            }}>
              Tahun: {selectedYear}
            </div>
          )}
          
          {/* Enhanced Layer Status */}
          {layerData.length > 0 && (
            <div style={{ 
              marginTop: '8px', 
              paddingTop: '8px', 
              borderTop: '1px solid #e5e7eb',
              fontSize: '11px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                Layers Aktif ({layerData.length}):
              </div>
              {layerData.map((layer, index) => (
                <div key={index} style={{ 
                  color: layer.type === 'boundary' ? '#FFA500' : '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '2px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: layer.type === 'boundary' ? '#FFA500' : 
                      layer.style?.fillColor || '#666'
                  }}></div>
                  {layer.name} ({layer.data?.length || 0})
                </div>
              ))}
            </div>
          )}
          
          {/* No layers warning */}
          {layerData.length === 0 && (
            <div style={{
              marginTop: '8px',
              padding: '6px',
              backgroundColor: '#fef3c7',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#92400e'
            }}>
              ⚠️ Tidak ada layers dimuat
            </div>
          )}
        </div>
      )}
    </div>
  );
};