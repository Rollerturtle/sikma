// Enhanced maps component with FIXED TypeScript errors and Z-index issues
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, GeoJSON, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import { API_URL } from '../../api';
import type {
  GeoJsonObject,
  FeatureCollection,
  Feature,
  Geometry,
  GeoJsonProperties,
} from 'geojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// FIXED: Declare process for Node.js types
declare const process: {
  env: {
    NODE_ENV: string;
  };
};

// Enhanced marker styles component with Z-INDEX FIXES
const EnhancedMarkerStyles = () => (
  <style>{`
    /* CRITICAL: Force Leaflet layer ordering */
    .leaflet-tile-pane {
      z-index: 1 !important;
    }
    
    .leaflet-overlay-pane {
      z-index: 400 !important;
    }
    
    .leaflet-shadow-pane {
      z-index: 500 !important;
    }
    
    .leaflet-marker-pane {
      z-index: 600 !important;
    }
    
    .leaflet-tooltip-pane {
      z-index: 650 !important;
    }
    
    .leaflet-popup-pane {
      z-index: 700 !important;
    }
    
    /* Force marker icons to highest level */
    .custom-incident-marker.enhanced {
      z-index: 10000 !important;
      position: relative !important;
    }
    
    .custom-incident-marker.enhanced > div {
      z-index: 10001 !important;
      position: relative !important;
    }
    
    /* Prevent tile loading from affecting markers */
    .leaflet-tile {
      z-index: 1 !important;
    }
    
    .leaflet-tile-loaded {
      z-index: 1 !important;
    }
    
    /* Enhanced marker visibility during loading */
    .leaflet-marker-icon {
      z-index: 1000 !important;
    }
    
    /* Force marker container to front */
    .leaflet-marker-pane .leaflet-marker-icon {
      z-index: 1000 !important;
    }
    
    /* Prevent any interference from other layers */
    .leaflet-interactive {
      z-index: auto !important;
    }
    
    /* Enhanced hover effect */
    .custom-incident-marker.enhanced:hover {
      filter: brightness(1.1) saturate(1.1);
      transform: scale(1.05);
      transition: all 0.2s ease;
      z-index: 10002 !important;
    }

    /* Risk tooltip styling */
    .risk-tooltip {
      z-index: 10000 !important;
    }

    /* Custom popup styling */
    .incident-popup.enhanced {
      z-index: 800 !important;
    }

    /* Pulse animation for markers */
    @keyframes pulse {
      0% { transform: scale(0.5); opacity: 1; }
      70% { transform: scale(1.3); opacity: 0.3; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    /* CRITICAL: Override any external CSS that might interfere */
    .leaflet-container {
      z-index: 1 !important;
    }

    .leaflet-control-container {
      z-index: 800 !important;
    }
  `}</style>
);

// FIXED: Force markers to front function with proper typing
const ForceMarkersToFront = ({ map, markers }: { map: L.Map, markers: L.Layer[] }) => {
  useEffect(() => {
    const bringMarkersToFront = () => {
      markers.forEach(marker => {
        if (map.hasLayer(marker)) {
          // FIXED: Use proper Leaflet method
          if ('bringToFront' in marker && typeof marker.bringToFront === 'function') {
            (marker as any).bringToFront();
          }
        }
      });
    };

    // Force markers to front setelah tile loading
    map.on('tileload', bringMarkersToFront);
    map.on('tileerror', bringMarkersToFront);
    map.on('load', bringMarkersToFront);
    map.on('zoomend', bringMarkersToFront);
    map.on('moveend', bringMarkersToFront);

    // Initial force
    bringMarkersToFront();

    return () => {
      map.off('tileload', bringMarkersToFront);
      map.off('tileerror', bringMarkersToFront);
      map.off('load', bringMarkersToFront);
      map.off('zoomend', bringMarkersToFront);
      map.off('moveend', bringMarkersToFront);
    };
  }, [map, markers]);

  return null;
};

// Enhanced color mapping with disaster type support
const getDisasterColor = (disasterType: string): string => {
  const colorMap: Record<string, string> = {
    'Banjir': '#3B82F6',
    'Longsor': '#DC2626', 
    'Kebakaran': '#EA580C',
    'Karhutla': '#EA580C',
    'Gempa': '#9333EA',
    'Angin Kencang': '#06B6D4',
    'Tanah Longsor': '#DC2626'
  };
  
  return colorMap[disasterType] || '#6B7280';
};

// ENHANCED: createIncidentIcon dengan z-index enhancement
const createIncidentIcon = (disasterType: string) => {
  const color = getDisasterColor(disasterType);
  
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
        transform: translate(-50%, -50%);
        z-index: 999999 !important;
      ">
        <!-- Main marker body -->
        <div style="
          background-color: ${color};
          width: 28px;
          height: 28px;
          border: 5px solid white;
          border-radius: 50%;
          box-shadow: 0 6px 20px rgba(0,0,0,0.8), 0 0 0 3px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          font-family: system-ui;
          cursor: pointer;
          z-index: 999999 !important;
          position: relative;
        ">
          ${disasterType === 'Banjir' ? '💧' : disasterType === 'Longsor' ? '🏔️' : disasterType === 'Kebakaran' || disasterType === 'Karhutla' ? '🔥' : '⚡'}
        </div>
        
        <!-- Enhanced glow effect -->
        <div style="
          position: absolute;
          top: -3px;
          left: -3px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: radial-gradient(circle, ${color}60 0%, ${color}30 50%, transparent 70%);
          pointer-events: none;
          z-index: 999998;
        "></div>
        
        <!-- Enhanced pulse ring -->
        <div style="
          position: absolute;
          top: -6px;
          left: -6px;
          width: 40px;
          height: 40px;
          border: 4px solid ${color};
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
          z-index: 999997;
          animation: pulse 2s infinite;
        "></div>
      </div>
    `,
    className: 'custom-incident-marker enhanced super-high-z',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18]
  });
};

// Component untuk auto-refresh risk analysis
const RiskRefreshHandler = ({ 
  filterData, 
  riskRefreshTrigger, 
  onDataRefresh 
}: { 
  filterData: any;
  riskRefreshTrigger: number;
  onDataRefresh: (layerKey: string, newData: any) => void;
}) => {
  const [lastRefreshTrigger, setLastRefreshTrigger] = useState(0);

  useEffect(() => {
    if (riskRefreshTrigger > lastRefreshTrigger && 
        filterData && 
        filterData.isRiskAnalysis && 
        riskRefreshTrigger > 0) {
      
      console.log('RiskRefreshHandler: Detected refresh trigger change', {
        current: riskRefreshTrigger,
        last: lastRefreshTrigger
      });

      setTimeout(async () => {
        try {
          console.log('RiskRefreshHandler: Refreshing risk analysis data...');
          
          const riskLayer = filterData.layers?.find((layer: any) => layer.type === 'risk');
          if (riskLayer) {
            const params = new URLSearchParams();
            Object.keys(riskLayer.filter).forEach(key => {
              if (riskLayer.filter[key]) {
                params.append(key, riskLayer.filter[key]);
              }
            });

            const response = await fetch(`${API_URL}${riskLayer.endpoint}?${params.toString()}`);
            if (response.ok) {
              const refreshedData = await response.json();
              console.log('RiskRefreshHandler: Risk data refreshed successfully', {
                features: refreshedData.length
              });
              
              const layerKey = `${riskLayer.endpoint}_${JSON.stringify(riskLayer.filter)}`;
              
              const featureCollection: FeatureCollection = {
                type: 'FeatureCollection',
                features: refreshedData.filter((feature: any) => feature.geometry)
              };
              
              onDataRefresh(layerKey, featureCollection);
            } else {
              console.error('RiskRefreshHandler: Failed to refresh risk data');
            }
          }
        } catch (error) {
          console.error('RiskRefreshHandler: Error refreshing risk data:', error);
        }
      }, 1000);

      setLastRefreshTrigger(riskRefreshTrigger);
    }
  }, [riskRefreshTrigger, lastRefreshTrigger, filterData, onDataRefresh]);

  return null;
};

// Enhanced zoom component with dynamic zoom levels based on administrative level
function ZoomToActiveLayers({ 
  loadedLayers, 
  filterData,
  detailView 
}: { 
  loadedLayers: Record<string, FeatureCollection | null | 'loading' | 'error'>;
  filterData: any;
  detailView: any;
}) {
  const map = useMap();
  
  useEffect(() => {
    const allFeatures: Feature[] = [];
    
    Object.values(loadedLayers).forEach(data => {
      if (data && data !== 'loading' && data !== 'error' && data.features) {
        allFeatures.push(...data.features);
      }
    });
    
    if (allFeatures.length > 0) {
      try {
        const tempLayer = L.geoJSON(allFeatures);
        const bounds = tempLayer.getBounds();
        
        if (bounds.isValid()) {
          let targetZoom = 8;
          // FIXED: Use proper tuple type for padding
          let padding: [number, number] = [20, 20];
          
          if (detailView) {
            targetZoom = 16;
            padding = [10, 10];
          } else if (filterData && filterData.locationType) {
            switch (filterData.locationType) {
              case 'Provinsi':
              case 'Daerah Administratif':
                targetZoom = 9;
                padding = [30, 30];
                break;
              case 'Kabupaten/Kota':
                targetZoom = 13;
                padding = [15, 15];
                break;
              case 'Kecamatan':
                targetZoom = 15;
                padding = [10, 10];
                break;
              case 'DAS':
                targetZoom = 10;
                padding = [25, 25];
                break;
              default:
                targetZoom = 9;
            }
          }
          
          map.fitBounds(bounds, { 
            padding: padding
          });
          
          setTimeout(() => {
            const currentZoom = map.getZoom();
            if (currentZoom < targetZoom) {
              map.setZoom(targetZoom);
            }
          }, 500);
          
          console.log(`Zoomed to ${detailView ? 'detail view' : filterData?.locationType || 'area'} with target zoom: ${targetZoom}`);
        }
      } catch (error) {
        console.error('Error calculating bounds for active layers:', error);
      }
    }
  }, [loadedLayers, map, filterData, detailView]);
  
  return null;
}

// ENHANCED: Component for rendering incident points with FIXED z-index and enhanced popups
function IncidentMarkers({ incidents, disasterType }: { incidents: any[], disasterType: string }) {
  const map = useMap();
  const markersRef = useRef<L.Layer[]>([]);
  
  console.log(`IncidentMarkers: Processing ${incidents?.length || 0} incidents for ${disasterType}`);
  
  if (!incidents || incidents.length === 0) {
    console.log('No incidents to display');
    return null;
  }

  // Enhanced cleanup with z-index management
  const cleanupMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      try {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      } catch (e) {
        console.warn('Error removing marker:', e);
      }
    });
    markersRef.current = [];
  }, [map]);

  // Enhanced marker creation with forced z-index
  const createMarkers = useCallback(() => {
    cleanupMarkers();
    
    let validCount = 0;
    
    incidents.forEach((incident, index) => {
      const lat = parseFloat(incident.latitude);
      const lng = parseFloat(incident.longitude);
      
      if (isNaN(lat) || isNaN(lng) || 
          lat < -90 || lat > 90 || 
          lng < -180 || lng > 180 ||
          (lat === 0 && lng === 0)) {
        console.warn(`Invalid coordinates for incident ${incident.id || index}:`, { lat, lng });
        return;
      }

      try {
        // Create marker with MAXIMUM z-index
        const marker = L.marker([lat, lng], {
          icon: createIncidentIcon(incident.disaster_type || disasterType),
          zIndexOffset: 100000 + index, // VERY HIGH z-index
          riseOnHover: true,
          riseOffset: 10000
        });

        // Enhanced popup content
        const popupContent = `
          <div style="min-width: 250px; font-family: system-ui;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb;">
              <div style="
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background-color: ${getDisasterColor(incident.disaster_type || disasterType)};
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                flex-shrink: 0;
              "></div>
              <h4 style="margin: 0; color: #1f2937; font-size: 15px; font-weight: bold; line-height: 1.3;">
                ${incident.title || `Kejadian ${incident.disaster_type || disasterType}`}
              </h4>
            </div>
            
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px 10px; font-size: 13px; line-height: 1.4; color: #374151;">
              <span style="font-weight: 600; color: #6b7280;">Jenis:</span>
              <span style="color: #1f2937; font-weight: 500;">${incident.disaster_type || disasterType}</span>
              
              <span style="font-weight: 600; color: #6b7280;">Tanggal:</span>
              <span>${new Date(incident.incident_date).toLocaleDateString('id-ID', { 
                day: 'numeric', month: 'long', year: 'numeric' 
              })}</span>
              
              <span style="font-weight: 600; color: #6b7280;">Lokasi:</span>
              <span>${[incident.kelurahan, incident.kecamatan, incident.kabupaten].filter(Boolean).join(', ') || 'N/A'}</span>
              
              <span style="font-weight: 600; color: #6b7280;">Koordinat:</span>
              <span style="font-family: monospace; font-size: 11px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
            </div>
            
            ${incident.korban_meninggal > 0 || incident.korban_luka_luka > 0 || incident.korban_mengungsi > 0 ? `
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #6b7280; margin-bottom: 4px;">Dampak:</div>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; font-size: 12px;">
                  ${incident.korban_meninggal > 0 ? `
                    <span style="color: #dc2626;">Meninggal:</span>
                    <span style="font-weight: 500;">${incident.korban_meninggal} orang</span>
                  ` : ''}
                  ${incident.korban_luka_luka > 0 ? `
                    <span style="color: #ea580c;">Luka-luka:</span>
                    <span style="font-weight: 500;">${incident.korban_luka_luka} orang</span>
                  ` : ''}
                  ${incident.korban_mengungsi > 0 ? `
                    <span style="color: #d97706;">Mengungsi:</span>
                    <span style="font-weight: 500;">${incident.korban_mengungsi} orang</span>
                  ` : ''}
                </div>
              </div>
            ` : ''}
            
            ${incident.description ? `
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #6b7280; margin-bottom: 4px;">Deskripsi:</div>
                <div style="font-size: 12px; color: #4b5563; line-height: 1.4;">
                  ${incident.description.substring(0, 150)}${incident.description.length > 150 ? '...' : ''}
                </div>
              </div>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 320,
          className: 'incident-popup enhanced',
          autoPan: true,
          closeButton: true,
          autoClose: false,
          closeOnEscapeKey: true
        });

        // Add marker to map
        marker.addTo(map);
        
        // CRITICAL: Force marker to front immediately - multiple attempts
        const forceToFront = () => {
          if ('bringToFront' in marker && typeof marker.bringToFront === 'function') {
            (marker as any).bringToFront();
          }
        };
        
        setTimeout(forceToFront, 10);
        setTimeout(forceToFront, 100);
        setTimeout(forceToFront, 500);
        
        markersRef.current.push(marker);
        validCount++;

        console.log(`Marker ${index + 1} created with z-index:`, 100000 + index);

      } catch (error) {
        console.error(`Failed to create marker ${index}:`, error);
      }
    });

    console.log(`Successfully created ${validCount}/${incidents.length} markers`);
    
    // ENHANCED: Multiple force-to-front attempts for all markers
    const forceAllMarkersToFront = () => {
      markersRef.current.forEach(marker => {
        if (map.hasLayer(marker)) {
          if ('bringToFront' in marker && typeof marker.bringToFront === 'function') {
            (marker as any).bringToFront();
          }
        }
      });
    };

    // Force markers to front multiple times
    setTimeout(forceAllMarkersToFront, 100);
    setTimeout(forceAllMarkersToFront, 500);
    setTimeout(forceAllMarkersToFront, 1000);
    setTimeout(forceAllMarkersToFront, 2000);
    
    // Force map refresh
    setTimeout(() => {
      map.invalidateSize(false);
      forceAllMarkersToFront();
      console.log('Map refreshed and markers forced to front');
    }, 200);

  }, [incidents, disasterType, map, cleanupMarkers]);

  // Effect for marker management
  useEffect(() => {
    createMarkers();
    
    return () => {
      cleanupMarkers();
    };
  }, [createMarkers, cleanupMarkers]);

  // Use ForceMarkersToFront component
  return (
    <>
      <ForceMarkersToFront map={map} markers={markersRef.current} />
    </>
  );
}

function SetViewOnLoad() {
  const map = useMap();
  const hasBeenSet = useRef(false);

  useEffect(() => {
    if (!hasBeenSet.current) {
      map.fitBounds([[-11.0, 95.0], [6.5, 141.0]], { padding: [50, 50] });
      hasBeenSet.current = true;
    }
  }, [map]);

  return null;
}

interface IndonesiaMapProps {
  filterData: any;
  onDetailView?: (detailData: any) => void;
  detailView?: any;
  onBackToMain?: () => void;
  riskRefreshTrigger?: number;
  selectedYear?: number | null;
}

export default function IndonesiaMap({ 
  filterData, 
  onDetailView, 
  detailView, 
  onBackToMain,
  selectedYear,
  riskRefreshTrigger = 0
}: IndonesiaMapProps) {
  const [loadedLayers, setLoadedLayers] = useState<Record<string, FeatureCollection | null | 'loading' | 'error'>>({});
  const [incidentData, setIncidentData] = useState<any[]>([]);
  const [previousLayers, setPreviousLayers] = useState<Record<string, FeatureCollection | null | 'loading' | 'error'>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const mapRef = useRef<L.Map | null>(null);
  const [selectedProvinsi, setSelectedProvinsi] = useState<string | null>(null);
  const [selectedDAS, setSelectedDAS] = useState<string | null>(null);
  const [kejadianMarkers, setKejadianMarkers] = useState<any[]>([]);
  const [mitigationRiskData, setMitigationRiskData] = useState<Record<string, any>>({});

  // FIXED: Add render trigger to force re-render
  const [renderTrigger, setRenderTrigger] = useState(0);

  const [incidentColorMap, setIncidentColorMap] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const fetchMitigationRiskData = async () => {
      // Hanya fetch jika di tab Mitigasi/Adaptasi
      if (!filterData || filterData.category !== 'Mitigasi/Adaptasi') {
        setMitigationRiskData({});
        return;
      }

      // Hanya untuk layer Provinsi atau DAS
      if (!filterData.locationType || 
          (filterData.locationType !== 'Provinsi' && filterData.locationType !== 'DAS')) {
        setMitigationRiskData({});
        return;
      }

      // Harus ada disaster type untuk analisis risk
      if (!filterData.disasterType) {
        setMitigationRiskData({});
        return;
      }

      try {
        const url = new URL(`${API_URL}/api/risk-analysis`);
        url.searchParams.append('disaster_type', filterData.disasterType);
        
        if (filterData.locationType === 'Provinsi') {
          // Untuk Provinsi, selalu gunakan level Indonesia untuk mendapatkan semua provinsi
          url.searchParams.append('level', 'Indonesia');
          url.searchParams.append('location_name', 'Indonesia');
        } else if (filterData.locationType === 'DAS') {
          // Untuk DAS, juga gunakan level Indonesia
          // TODO: Jika ada endpoint khusus untuk DAS, gunakan itu
          url.searchParams.append('level', 'Indonesia');
          url.searchParams.append('location_name', 'Indonesia');
        }

        console.log('🎨 Fetching mitigation risk data from:', url.toString());

        const response = await fetch(url.toString());
        if (response.ok) {
          const features = await response.json();
          console.log('✅ Mitigation risk data received:', features.length, 'features');
          
          // Convert array to map untuk lookup cepat berdasarkan nama lokasi
          const riskMap: Record<string, any> = {};
          features.forEach((feature: any) => {
            const props = feature.properties;
            // Gunakan UPPER() untuk matching yang konsisten
            const locationName = props?.provinsi || props?.das || props?.wadmpr || props?.nama_das;
            if (locationName) {
              const upperLocationName = locationName.toUpperCase().trim();
              riskMap[upperLocationName] = {
                risk_color: props?.risk_color,
                risk_level: props?.risk_level,
                incident_count: props?.incident_count || 0
              };
              console.log(`📍 Stored risk data for: ${upperLocationName} = ${props?.incident_count} incidents, color: ${props?.risk_color}`);
            }
          });
          
          console.log('📊 Total risk data stored:', Object.keys(riskMap).length, 'locations');
          console.log('🗺️ Available locations:', Object.keys(riskMap));
          setMitigationRiskData(riskMap);
        } else {
          console.error('❌ Failed to fetch mitigation risk data:', response.status);
          setMitigationRiskData({});
        }
      } catch (error) {
        console.error('❌ Error fetching mitigation risk data:', error);
        setMitigationRiskData({});
      }
    };

    fetchMitigationRiskData();
  }, [filterData]);

  useEffect(() => {
    const fetchKejadianMarkers = async () => {
      // Reset markers jika kondisi tidak terpenuhi
      if (!filterData || filterData.category !== 'Kebencanaan' || !filterData.disasterType || !selectedYear) {
        setKejadianMarkers([]);
        return;
      }

      if (filterData.locationType !== 'Indonesia' && !filterData.selectedValue) {
        setKejadianMarkers([]);
        return;
      }

      try {
        const url = new URL(`${API_URL}/api/kejadian/by-year`);
        url.searchParams.append('disaster_type', filterData.disasterType);
        url.searchParams.append('year', String(selectedYear));
        
        if (filterData.locationType === 'Provinsi') {
          url.searchParams.append('provinsi', filterData.selectedValue);
        } else if (filterData.locationType === 'DAS') {
          url.searchParams.append('das', filterData.selectedValue);
        }

        console.log('📍 Fetching kejadian markers from URL:', url.toString());

        const response = await fetch(url.toString());
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Kejadian markers received:', data);
          setKejadianMarkers(data);

          // Fit map bounds to show all markers
          if (data.length > 0 && mapRef.current) {
            const bounds = L.latLngBounds(
              data.map((k: any) => [k.latitude, k.longitude])
            );
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        } else {
          console.error('❌ Failed to fetch kejadian markers');
          setKejadianMarkers([]);
        }
      } catch (error) {
        console.error('❌ Error fetching kejadian markers:', error);
        setKejadianMarkers([]);
      }
    };

    fetchKejadianMarkers();
  }, [filterData, selectedYear]);

  useEffect(() => {
    console.log('Maps received filter data:', filterData);
    
    if (!filterData) {
      setLoadedLayers({});
      setIncidentData([]);
      setPreviousLayers({});
      return;
    }

    loadFilteredLayers(filterData);
  }, [filterData]);

  useEffect(() => {
    if (detailView) {
      console.log('Entering detail view mode:', detailView);
      setPreviousLayers({...loadedLayers});
      loadIncidentData(detailView);
      loadDetailLayer(detailView);
    } else {
      console.log('Exiting detail view mode');
      setIncidentData([]);
    }
  }, [detailView]);

  useEffect(() => {
    if (!detailView && Object.keys(previousLayers).length > 0) {
      console.log('Restoring previous layers...');
      setLoadedLayers({...previousLayers});
      setPreviousLayers({});
    }
  }, [detailView, previousLayers]);

  // ENHANCED: MAP EVENT LISTENERS untuk force markers to front
  useEffect(() => {
    // Jika ada incident data, setup map event listeners
    if (detailView && incidentData.length > 0) {
      const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
      if (mapContainer) {
        const observer = new MutationObserver(() => {
          // Force markers to front ketika DOM berubah
          const markers = document.querySelectorAll('.custom-incident-marker.enhanced');
          markers.forEach(marker => {
            (marker as HTMLElement).style.zIndex = '999999';
          });
        });

        observer.observe(mapContainer, {
          childList: true,
          subtree: true
        });

        return () => {
          observer.disconnect();
        };
      }
    }
  }, [detailView, incidentData]);

  const handleMarkerClick = (kejadianId: number) => {
    window.location.href = `/detail-kejadian/${kejadianId}`;
  };
  
  const handleDataRefresh = (layerKey: string, newData: FeatureCollection) => {
    console.log('IndonesiaMap: Received refreshed data for', layerKey, newData.features.length, 'features');
    setIsRefreshing(true);
    
    setLoadedLayers(prev => ({
      ...prev,
      [layerKey]: newData
    }));
    
    // FIXED: Force re-render after data refresh
    setRenderTrigger(prev => prev + 1);
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const loadDetailLayer = async (detailData: any) => {
    try {
      console.log('Loading detail layer for:', detailData);
      
      setLoadedLayers({});
      
      // FIXED: Proper Feature type with literal "Feature"
      const selectedFeature: Feature = {
        type: "Feature" as const,
        id: 0,
        properties: {
          selectedArea: detailData.selectedArea,
          level: detailData.level,
          disaster_type: detailData.disaster_type,
          risk_level: detailData.risk_level,
          risk_color: detailData.risk_color,
          incident_count: detailData.incident_count,
          analysis_level: detailData.analysis_level,
          location_name: detailData.location_name
        },
        geometry: detailData.boundaryGeometry
      };

      const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: [selectedFeature]
      };

      const detailLayerKey = `detail_layer_${detailData.selectedArea}`;
      setLoadedLayers({ [detailLayerKey]: featureCollection });

      console.log(`Detail layer loaded for: ${detailData.selectedArea} with color: ${detailData.risk_color}`);
    } catch (error) {
      console.error('Error loading detail layer:', error);
    }
  };

  // const loadIncidentData = async (detailData: any) => {
  //   try {
  //     console.log('Loading incident data for detail view:', detailData);
      
  //     const url = new URL(`${API_URL}/api/kejadian`);
      
  //     // Filter berdasarkan jenis bencana
  //     if (detailData.disaster_type) {
  //       url.searchParams.append('disaster_type', detailData.disaster_type);
  //     }
      
  //     // FIXED: Filter berdasarkan hierarki administratif yang tepat
  //     // Dapatkan informasi dari originalFilterData untuk konteks lokasi yang dipilih
  //     const originalFilter = detailData.originalFilterData;
      
  //     // Filter berdasarkan level detail yang dipilih
  //     if (detailData.level === 'kelurahan') {
  //       url.searchParams.append('kelurahan', detailData.selectedArea);
        
  //       // TAMBAHKAN: Filter parent administratif dari originalFilter
  //       if (originalFilter?.selectedValue && originalFilter?.locationType === 'Kecamatan') {
  //         url.searchParams.append('kecamatan', originalFilter.selectedValue);
  //       } else if (originalFilter?.selectedValue && originalFilter?.locationType === 'Kabupaten/Kota') {
  //         url.searchParams.append('kabupaten', originalFilter.selectedValue);
  //       } else if (originalFilter?.selectedValue && originalFilter?.locationType === 'Provinsi') {
  //         url.searchParams.append('provinsi', originalFilter.selectedValue);
  //       }
        
  //     } else if (detailData.level === 'kecamatan') {
  //       url.searchParams.append('kecamatan', detailData.selectedArea);
        
  //       // TAMBAHKAN: Filter parent administratif
  //       if (originalFilter?.selectedValue && originalFilter?.locationType === 'Kabupaten/Kota') {
  //         url.searchParams.append('kabupaten', originalFilter.selectedValue);
  //       } else if (originalFilter?.selectedValue && originalFilter?.locationType === 'Provinsi') {
  //         url.searchParams.append('provinsi', originalFilter.selectedValue);
  //       }
        
  //     } else if (detailData.level === 'kabupaten') {
  //       url.searchParams.append('kabupaten', detailData.selectedArea);
        
  //       // TAMBAHKAN: Filter parent administratif jika dari provinsi
  //       if (originalFilter?.selectedValue && originalFilter?.locationType === 'Provinsi') {
  //         url.searchParams.append('provinsi', originalFilter.selectedValue);
  //       }
  //     }
      
  //     // TAMBAHKAN: Filter berdasarkan DAS jika dari level DAS
  //     if (originalFilter?.locationType === 'DAS' && originalFilter?.selectedValue) {
  //       url.searchParams.append('das', originalFilter.selectedValue);
  //     }
      
  //     // Filter waktu - 1 tahun terakhir
  //     const oneYearAgo = new Date();
  //     oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  //     url.searchParams.append('start_date', oneYearAgo.toISOString().split('T')[0]);
      
  //     console.log(`Loading incident data from: ${url.toString()}`);
  //     console.log('Filter hierarchy applied:', {
  //       selected_detail_area: detailData.selectedArea,
  //       detail_level: detailData.level,
  //       original_filter_area: originalFilter?.selectedValue,
  //       original_filter_level: originalFilter?.locationType,
  //       disaster_type: detailData.disaster_type
  //     });
      
  //     const response = await fetch(url.toString());
  //     if (response.ok) {
  //       const incidents = await response.json();
        
  //       // ENHANCED: Additional client-side filtering untuk memastikan hanya kejadian dalam area yang benar
  //       const filteredIncidents = incidents.filter((incident: any) => {
  //         // Pastikan koordinat valid
  //         const lat = parseFloat(incident.latitude);
  //         const lng = parseFloat(incident.longitude);
  //         if (isNaN(lat) || isNaN(lng) || 
  //             lat < -90 || lat > 90 || 
  //             lng < -180 || lng > 180 ||
  //             (lat === 0 && lng === 0)) {
  //           return false;
  //         }
          
  //         // Filter berdasarkan level detail
  //         if (detailData.level === 'kelurahan') {
  //           const match = incident.kelurahan === detailData.selectedArea ||
  //                        incident.kel_desa === detailData.selectedArea;
  //           if (!match) return false;
  //         } else if (detailData.level === 'kecamatan') {
  //           const match = incident.kecamatan === detailData.selectedArea;
  //           if (!match) return false;
  //         } else if (detailData.level === 'kabupaten') {
  //           const match = incident.kabupaten === detailData.selectedArea ||
  //                        incident.kab_kota === detailData.selectedArea;
  //           if (!match) return false;
  //         }
          
  //         // Filter berdasarkan originalFilter untuk memastikan dalam area parent
  //         if (originalFilter?.locationType === 'Provinsi' && originalFilter?.selectedValue) {
  //           if (incident.provinsi !== originalFilter.selectedValue) return false;
  //         } else if (originalFilter?.locationType === 'Kabupaten/Kota' && originalFilter?.selectedValue) {
  //           const match = incident.kabupaten === originalFilter.selectedValue ||
  //                        incident.kab_kota === originalFilter.selectedValue;
  //           if (!match) return false;
  //         } else if (originalFilter?.locationType === 'Kecamatan' && originalFilter?.selectedValue) {
  //           if (incident.kecamatan !== originalFilter.selectedValue) return false;
  //         } else if (originalFilter?.locationType === 'DAS' && originalFilter?.selectedValue) {
  //           if (incident.das !== originalFilter.selectedValue) return false;
  //         }
          
  //         return true;
  //       });
        const loadIncidentData = async (detailData: any) => {
    try {
      console.log('Loading incident data for detail view:', detailData);
      
      const url = new URL(`${API_URL}/api/kejadian`);
      
      // Filter berdasarkan jenis bencana
      if (detailData.disaster_type) {
        url.searchParams.append('disaster_type', detailData.disaster_type);
      }
      
      // FIXED: Filter berdasarkan hierarki administratif yang tepat
      // Dapatkan informasi dari originalFilterData untuk konteks lokasi yang dipilih
      const originalFilter = detailData.originalFilterData;
      
      // TAMBAHAN: Jika originalFilter adalah Indonesia, jangan tambahkan filter lokasi
      if (originalFilter?.locationType !== 'Indonesia') {
        // Filter berdasarkan level detail yang dipilih
        if (detailData.level === 'kelurahan') {
          url.searchParams.append('kelurahan', detailData.selectedArea);
          
          // TAMBAHKAN: Filter parent administratif dari originalFilter
          if (originalFilter?.selectedValue && originalFilter?.locationType === 'Kecamatan') {
            url.searchParams.append('kecamatan', originalFilter.selectedValue);
          } else if (originalFilter?.selectedValue && originalFilter?.locationType === 'Kabupaten/Kota') {
            url.searchParams.append('kabupaten', originalFilter.selectedValue);
          } else if (originalFilter?.selectedValue && originalFilter?.locationType === 'Provinsi') {
            url.searchParams.append('provinsi', originalFilter.selectedValue);
          }
          
        } else if (detailData.level === 'kecamatan') {
          url.searchParams.append('kecamatan', detailData.selectedArea);
          
          // TAMBAHKAN: Filter parent administratif
          if (originalFilter?.selectedValue && originalFilter?.locationType === 'Kabupaten/Kota') {
            url.searchParams.append('kabupaten', originalFilter.selectedValue);
          } else if (originalFilter?.selectedValue && originalFilter?.locationType === 'Provinsi') {
            url.searchParams.append('provinsi', originalFilter.selectedValue);
          }
          
        } else if (detailData.level === 'kabupaten') {
          url.searchParams.append('kabupaten', detailData.selectedArea);
          
          // TAMBAHKAN: Filter parent administratif jika dari provinsi
          if (originalFilter?.selectedValue && originalFilter?.locationType === 'Provinsi') {
            url.searchParams.append('provinsi', originalFilter.selectedValue);
          }
        } else if (detailData.level === 'provinsi') {
          url.searchParams.append('provinsi', detailData.selectedArea);
        }
        
        // TAMBAHKAN: Filter berdasarkan DAS jika dari level DAS
        if (originalFilter?.locationType === 'DAS' && originalFilter?.selectedValue) {
          url.searchParams.append('das', originalFilter.selectedValue);
        }
      }
      
      // Filter waktu - 1 tahun terakhir
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      url.searchParams.append('start_date', oneYearAgo.toISOString().split('T')[0]);
      
      console.log(`Loading incident data from: ${url.toString()}`);
      console.log('Filter hierarchy applied:', {
        selected_detail_area: detailData.selectedArea,
        detail_level: detailData.level,
        original_filter_area: originalFilter?.selectedValue,
        original_filter_level: originalFilter?.locationType,
        disaster_type: detailData.disaster_type
      });
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const incidents = await response.json();
        
        // ENHANCED: Additional client-side filtering untuk memastikan hanya kejadian dalam area yang benar
        const filteredIncidents = incidents.filter((incident: any) => {
          // Pastikan koordinat valid
          const lat = parseFloat(incident.latitude);
          const lng = parseFloat(incident.longitude);
          if (isNaN(lat) || isNaN(lng) || 
              lat < -90 || lat > 90 || 
              lng < -180 || lng > 180 ||
              (lat === 0 && lng === 0)) {
            return false;
          }
          
          // TAMBAHAN: Skip filter lokasi jika originalFilter adalah Indonesia
          if (originalFilter?.locationType === 'Indonesia') {
            return true;
          }
          
          // Filter berdasarkan level detail
          if (detailData.level === 'kelurahan') {
            const match = incident.kelurahan === detailData.selectedArea ||
                         incident.kel_desa === detailData.selectedArea;
            if (!match) return false;
          } else if (detailData.level === 'kecamatan') {
            const match = incident.kecamatan === detailData.selectedArea;
            if (!match) return false;
          } else if (detailData.level === 'kabupaten') {
            const match = incident.kabupaten === detailData.selectedArea ||
                         incident.kab_kota === detailData.selectedArea;
            if (!match) return false;
          } else if (detailData.level === 'provinsi') {
            const match = incident.provinsi === detailData.selectedArea;
            if (!match) return false;
          }
          
          // Filter berdasarkan originalFilter untuk memastikan dalam area parent
          if (originalFilter?.locationType === 'Provinsi' && originalFilter?.selectedValue) {
            if (incident.provinsi !== originalFilter.selectedValue) return false;
          } else if (originalFilter?.locationType === 'Kabupaten/Kota' && originalFilter?.selectedValue) {
            const match = incident.kabupaten === originalFilter.selectedValue ||
                         incident.kab_kota === originalFilter.selectedValue;
            if (!match) return false;
          } else if (originalFilter?.locationType === 'Kecamatan' && originalFilter?.selectedValue) {
            if (incident.kecamatan !== originalFilter.selectedValue) return false;
          } else if (originalFilter?.locationType === 'DAS' && originalFilter?.selectedValue) {
            if (incident.das !== originalFilter.selectedValue) return false;
          }
          
          return true;
        });
        console.log(`Loaded and filtered ${filteredIncidents.length}/${incidents.length} incidents for detail view`, {
          area: detailData.selectedArea,
          level: detailData.level,
          disaster_type: detailData.disaster_type,
          time_range: 'last 1 year',
          original_count: incidents.length,
          filtered_count: filteredIncidents.length
        });
        
        if (filteredIncidents.length > 0) {
          console.log('Sample filtered incident:', filteredIncidents[0]);
        }
        
        if (incidents.length > 0 && filteredIncidents.length === 0) {
          console.warn('All incidents were filtered out. Check filter criteria:', {
            detailData,
            originalFilter,
            sample_incident: incidents[0]
          });
        }
        
        setIncidentData(filteredIncidents);
      } else {
        console.error('Failed to load incident data:', response.status, response.statusText);
        setIncidentData([]);
      }
    } catch (error) {
      console.error('Error loading incident data:', error);
      setIncidentData([]);
    }
  };

  const loadFilteredLayers = async (filterData: any) => {
    console.log('Loading layers for filter:', filterData);
    
    setLoadedLayers({});
    
    if (filterData.useIncidentColoring && filterData.incidentYear) {
      await fetchIncidentCounts(
        filterData.disasterType,
        filterData.locationType,
        filterData.incidentYear
      );
    }

    const loadPromises: Promise<void>[] = [];

    filterData.layers.forEach((layerConfig: any) => {
      const layerKey = `${layerConfig.endpoint}_${JSON.stringify(layerConfig.filter)}`;
      
      setLoadedLayers(prev => ({ ...prev, [layerKey]: 'loading' }));

      const loadPromise = loadLayer(layerConfig, layerKey);
      loadPromises.push(loadPromise);
    });

    try {
      await Promise.all(loadPromises);
      console.log('All filtered layers loaded successfully');
      // FIXED: Force re-render after all layers loaded
      setRenderTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error loading some filtered layers:', error);
    }
  };

   const loadLayer = async (layerConfig: any, layerKey: string): Promise<void> => {
    try {
      const url = new URL(`${API_URL}${layerConfig.endpoint}`);
      
      Object.entries(layerConfig.filter).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, value as string);
        }
      });

      console.log(`Fetching layer: ${url.toString()}`);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // FIXED: Check if data is already an array of features or needs transformation
      let features: Feature[];
      
      // Check if data is already in Feature format
      if (Array.isArray(data) && data.length > 0 && data[0].type === 'Feature') {
        features = data;
      } else if (Array.isArray(data)) {
        // Transform database rows to GeoJSON features
        features = data.map((row: any, index: number) => {
          // Extract geometry from geometry_json if available
          const geometry = row.geometry_json 
            ? (typeof row.geometry_json === 'string' 
                ? JSON.parse(row.geometry_json) 
                : row.geometry_json)
            : row.geom;
          
          // Remove geom and geometry_json from properties
          const { geom, geometry_json, ...properties } = row;
          
          return {
            type: 'Feature',
            id: index,
            properties: properties,
            geometry: geometry
          };
        });
      } else {
        console.error('Unexpected data format:', data);
        throw new Error('Invalid data format received from server');
      }

      const validFeatures = features.filter(feature => {
        if (!feature.geometry) {
          console.warn(`Feature without geometry in ${layerKey}:`, feature);
          return false;
        }
        return true;
      });

      const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: validFeatures
      };

      console.log(`✅ Loaded ${validFeatures.length} features for ${layerKey}`);
      setLoadedLayers(prev => ({ ...prev, [layerKey]: featureCollection }));

    } catch (error) {
      console.error(`Error loading layer ${layerConfig.endpoint}:`, error);
      setLoadedLayers(prev => ({ ...prev, [layerKey]: 'error' }));
    }
  };

  const fetchIncidentCounts = async (disasterType: string, level: string, year: number) => {
    try {
      console.log(`🎨 Fetching incident counts for coloring: ${disasterType}, ${level}, ${year}`);
      
      const response = await fetch(
        `${API_URL}/api/incident-counts?disaster_type=${encodeURIComponent(disasterType)}&level=${encodeURIComponent(level)}&year=${year}`
      );
      
      if (!response.ok) {
        console.warn('Failed to fetch incident counts');
        return;
      }
      
      const data = await response.json();
      
      // Create color map based on incident counts
      const colorMap: {[key: string]: string} = {};
      
      Object.entries(data.incidentMap).forEach(([location, count]) => {
        const incidentCount = count as number;
        let color;
        
        if (incidentCount === 0) {
          color = '#62c486'; // Very Low
        } else if (incidentCount <= 1) {
          color = '#22c55e'; // Low - Green
        } else if (incidentCount <= 5) {
          color = '#f97316'; // Medium - Orange
        } else {
          color = '#ef4444'; // High - Red
        }
        
        colorMap[location] = color;
      });
      
      setIncidentColorMap(colorMap);
      console.log('✅ Incident color map created:', Object.keys(colorMap).length, 'locations');
      
    } catch (error) {
      console.error('❌ Error fetching incident counts:', error);
    }
  };

  // const handleLayerClick = (feature: Feature, layerKey: string) => {
  //   console.log('Layer clicked:', {
  //     layerKey, 
  //     properties: feature.properties,
  //     isRiskAnalysis: layerKey.includes('/api/risk-analysis'),
  //     filterMode: filterData?.isRiskAnalysis
  //   });
    
  //   if (!layerKey.includes('/api/risk-analysis') || !filterData?.isRiskAnalysis) {
  //     console.log('Not a risk analysis layer or not in Kerawanan mode, ignoring click');
  //     return;
  //   }

  //   const props = feature.properties;
  //   if (!props) {
  //     console.log('No properties found in feature');
  //     return;
  //   }

  //   console.log('Processing risk analysis click with properties:', props);

  //   let detailLevel, selectedArea, boundaryGeometry, locationName;
    
  //   const currentLevel = filterData.locationType;
    
  //   // TAMBAHAN: Logika untuk level Indonesia
  //   if (currentLevel === 'Indonesia' && props.provinsi) {
  //     detailLevel = 'provinsi';
  //     selectedArea = props.provinsi;
  //     locationName = props.provinsi;
  //     boundaryGeometry = feature.geometry;
  //   } else if (currentLevel === 'Provinsi' && props.kab_kota) {
  //     detailLevel = 'kabupaten';
  //     selectedArea = props.kab_kota;
  //     locationName = props.kab_kota;
  //     boundaryGeometry = feature.geometry;
  //   } else if (currentLevel === 'Kabupaten/Kota' && props.kecamatan) {
  //     detailLevel = 'kecamatan';
  //     selectedArea = props.kecamatan;
  //     locationName = props.kecamatan;
  //     boundaryGeometry = feature.geometry;
  //   } else if (currentLevel === 'Kecamatan' && props.kel_desa) {
  //     detailLevel = 'kelurahan';
  //     selectedArea = props.kel_desa;
  //     locationName = props.kel_desa;
  //     boundaryGeometry = feature.geometry;
  //   } else if (currentLevel === 'DAS' && props.kel_desa) {
  //     detailLevel = 'kelurahan';
  //     selectedArea = props.kel_desa;
  //     locationName = props.kel_desa;
  //     boundaryGeometry = feature.geometry;
  //   } else {
  //     console.log('Cannot determine detail level for current selection:', {
  //       currentLevel, 
  //       availableProps: Object.keys(props)
  //     });
  //     return;
  //   }

  //   const detailData = {
  //     level: detailLevel,
  //     selectedArea: selectedArea,
  //     disaster_type: props.disaster_type,
  //     analysis_level: props.analysis_level,
  //     location_name: locationName,
  //     incident_count: props.incident_count || 0,
  //     risk_level: props.risk_level,
  //     risk_color: props.risk_color,
  //     boundaryGeometry: boundaryGeometry,
  //     originalFilterData: filterData
  //   };

  //   console.log('Layer clicked, entering detail view with data:', detailData);
    
  //   if (onDetailView) {
  //     onDetailView(detailData);
  //   }
  // };

   const handleLayerClick = (feature: Feature, layerKey: string) => {
    console.log('Layer clicked:', {
      layerKey, 
      properties: feature.properties,
      filterCategory: filterData?.category
    });

    // Risk analysis layer click - drill down to detail view (HANYA untuk tab Kerawanan)
    if (layerKey.includes('/api/risk-analysis')) {
      // PENTING: Disable click untuk tab Mitigasi/Adaptasi
      if (filterData?.category === 'Mitigasi/Adaptasi') {
        console.log('Click disabled for Mitigasi/Adaptasi tab - risk layer');
        return;
      }

      const props = feature.properties;
      if (!props) {
        console.warn('No properties found in clicked feature');
        return;
      }

      console.log('Risk analysis layer clicked, properties:', props);

      const currentLevel = props.analysis_level;
      let detailLevel: 'provinsi' | 'kabupaten' | 'kecamatan' | 'kelurahan' | null = null;
      let selectedArea: string | null = null;
      let locationName = props.location_name;

      // FIXED: Logic untuk menentukan level yang benar
      if (currentLevel === 'Indonesia') {
        // User klik provinsi dari level Indonesia
        detailLevel = 'provinsi';
        selectedArea = props.provinsi;
        locationName = props.provinsi;
      } else if (currentLevel === 'Provinsi') {
        // User klik kabupaten dari level Provinsi
        detailLevel = 'kabupaten';
        selectedArea = props.kab_kota;
        locationName = props.kab_kota;
      } else if (currentLevel === 'Kabupaten/Kota') {
        // User klik kecamatan dari level Kabupaten
        detailLevel = 'kecamatan';
        selectedArea = props.kecamatan;
        locationName = props.kecamatan;
      } else if (currentLevel === 'Kecamatan') {
        // User klik kelurahan dari level Kecamatan
        detailLevel = 'kelurahan';
        selectedArea = props.kel_desa;
        locationName = props.kel_desa;
      } else if (currentLevel === 'DAS') {
        // User klik kelurahan dari level DAS
        detailLevel = 'kelurahan';
        selectedArea = props.kel_desa;
        locationName = props.kel_desa;
      }

      if (!detailLevel || !selectedArea) {
        console.warn('Could not determine detail level or selected area:', { 
          currentLevel, 
          availableProps: Object.keys(props)
        });
        return;
      }

      const boundaryGeometry = feature.geometry;

      const detailData = {
        level: detailLevel,
        selectedArea: selectedArea,
        disaster_type: props.disaster_type,
        analysis_level: props.analysis_level,
        location_name: locationName,
        incident_count: props.incident_count || 0,
        risk_level: props.risk_level,
        risk_color: props.risk_color,
        boundaryGeometry: boundaryGeometry,
        originalFilterData: filterData
      };

      console.log('Layer clicked, entering detail view with data:', detailData);
      
      if (onDetailView) {
        onDetailView(detailData);
      }
      
      return;
    }

    // Boundary layer click di tab Mitigasi/Adaptasi - do nothing
    if (filterData?.category === 'Mitigasi/Adaptasi') {
      console.log('Click disabled for Mitigasi/Adaptasi tab - boundary layer');
      return;
    }

    // Other layer clicks - no action
    console.log('Non-risk layer clicked, no action');
  };

  const getColorForLayer = (layerKey: string, feature?: Feature): string => {
    if (layerKey.includes('/api/risk-analysis') || layerKey.includes('detail_layer_')) {
      if (feature && feature.properties && feature.properties.risk_color) {
        return feature.properties.risk_color;
      }
      return '#FF0000';
    }
    
    if (layerKey.includes('mitigation') || isMitigationLayer(layerKey)) {
      return getMitigationLayerColor(layerKey);
    }
    
    let tableName = '';
    if (layerKey.includes('/api/layers/')) {
      const withoutPrefix = layerKey.replace('/api/layers/', '');
      const filterStartIndex = withoutPrefix.indexOf('_{');
      if (filterStartIndex !== -1) {
        tableName = withoutPrefix.substring(0, filterStartIndex);
      } else {
        tableName = withoutPrefix;
      }
    }
    
    const colorMap: Record<string, string> = {
      'provinsi': '#FFA500',
      'kab_kota': '#00BFFF',
      'kecamatan': '#FFD700',
      'kel_desa': '#98FB98',
      'das': '#00FFFF',
      'lahan_kritis': '#FF4444',
      'penutupan_lahan_2024': '#44FF44',
      'rawan_erosi': '#FFAA44',
      'rawan_karhutla_2024': '#AA44FF',
      'rawan_limpasan': '#4444FF',
      'areal_karhutla_2024': '#DC143C',
    };
    
    return colorMap[tableName] || '#FF0000';
  };

  const isMitigationLayer = (layerKey: string): boolean => {
    const mitigationTables = [
      'areal_karhutla_2024', 'lahan_kritis', 'penutupan_lahan_2024',
      'rawan_karhutla_2024', 'rawan_erosi', 'rawan_limpasan'
    ];
    
    return mitigationTables.some(table => layerKey.includes(table)) && 
           filterData?.category === 'Mitigasi/Adaptasi';
  };

  const getMitigationLayerColor = (layerKey: string): string => {
    const mitigationColorMap: Record<string, string> = {
      'areal_karhutla_2024': '#DC143C',
      'lahan_kritis': '#FF4444',
      'penutupan_lahan_2024': '#44FF44',
      'rawan_karhutla_2024': '#AA44FF',
      'rawan_erosi': '#FFAA44',
      'rawan_limpasan': '#4444FF'
    };
    
    for (const [table, color] of Object.entries(mitigationColorMap)) {
      if (layerKey.includes(table)) {
        return color;
      }
    }
    
    return '#666666';
  };

  // FIXED: Enhanced styling with better visibility and interaction
  const getStyleForLayer = (layerKey: string) => {
    // FIXED: Proper typing for style function
    return (feature?: Feature<Geometry, any>) => {
      if (!feature) {
        return {
          fillColor: '#FF0000',
          color: '#000000',
          weight: 1,
          fillOpacity: 0.5,
          opacity: 1
        };
      }

      // PERBAIKAN KHUSUS KEBENCANAAN: Bedakan warna boundary dan disaster layer
      if (filterData?.category === 'Kebencanaan') {
        const isBoundaryLayer = layerKey.includes('provinsi/year') || 
                               layerKey.includes('das/year') ||
                               layerKey.includes('kabupaten') ||
                               layerKey.includes('kecamatan');
        
        const isDisasterLayer = layerKey.includes('lahan_kritis') || 
                               layerKey.includes('penutupan_lahan') || 
                               layerKey.includes('areal_karhutla');
        
        if (isBoundaryLayer) {
          // Boundary layer: biru transparan dengan border lebih tebal
          const shouldUseIncidentColoring = filterData?.useIncidentColoring && 
                                     (filterData?.locationType === 'Indonesia' || 
                                      filterData?.locationType === 'Provinsi' || 
                                      filterData?.locationType === 'DAS');
  
          if (shouldUseIncidentColoring && Object.keys(incidentColorMap).length > 0) {
            // INCIDENT-BASED COLORING untuk Kebencanaan
            console.log('🎨 Using incident-based coloring for boundary layer');
            
            // Determine which property to match
            let locationName;
            if (filterData.locationType === 'Indonesia' || filterData.locationType === 'Provinsi') {
              locationName = feature.properties?.provinsi || feature.properties?.wadmpr;
            } else if (filterData.locationType === 'DAS') {
              locationName = feature.properties?.nama_das || feature.properties?.das;
            }
            
            if (locationName) {
              const upperLocationName = locationName.toUpperCase().trim();
              const incidentColor = incidentColorMap[upperLocationName];
              
              if (incidentColor) {
                console.log(`✅ Applying incident color to "${locationName}": ${incidentColor}`);
                return {
                  fillColor: incidentColor,
                  fillOpacity: 0.6,
                  color: '#1e40af',
                  weight: 2.5,
                  opacity: 0.8
                };
              }
            }
            
            // Default color if no incident data
            return {
              fillColor: '#e5e7eb', // Gray
              fillOpacity: 0.3,
              color: '#1e40af',
              weight: 2.5,
              opacity: 0.8
            };
          }
          return {
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            color: '#1e40af',
            weight: 2.5,
            opacity: 0.8
          };
        } else if (isDisasterLayer) {
          // Disaster layer: merah/oranye lebih solid
          let disasterColor = '#ef4444'; // default merah
  
  if (layerKey.includes('lahan_kritis')) {
    disasterColor = '#FF4444'; // Merah untuk lahan kritis
  } else if (layerKey.includes('penutupan_lahan')) {
    disasterColor = '#44FF44'; // Hijau untuk penutupan lahan
  } else if (layerKey.includes('areal_karhutla')) {
    disasterColor = '#DC143C'; // Crimson untuk areal karhutla
  } else if (layerKey.includes('rawan_erosi')) {
    disasterColor = '#FFAA44'; // Orange untuk rawan erosi
  } else if (layerKey.includes('rawan_limpasan')) {
    disasterColor = '#4444FF'; // Biru untuk rawan limpasan
  } else if (layerKey.includes('rawan_karhutla')) {
    disasterColor = '#AA44FF'; // Ungu untuk rawan karhutla
  }
  
  console.log(`✅ Applying disaster color: ${disasterColor} for layer: ${layerKey}`);
  
  return {
    fillColor: disasterColor,
    fillOpacity: 0.5,
    color: '#000000',
    weight: 1.5,
    opacity: 1
  };
        }
      }

      if (filterData?.category === 'Mitigasi/Adaptasi') {
        const isBoundaryLayer = layerKey.includes('provinsi/year') || 
                              layerKey.includes('das/year');
        
        const isDisasterLayer = layerKey.includes('lahan_kritis') || 
                              layerKey.includes('penutupan_lahan') || 
                              layerKey.includes('areal_karhutla') ||
                              layerKey.includes('rawan_erosi') ||
                              layerKey.includes('rawan_limpasan') ||
                              layerKey.includes('rawan_karhutla');
        
        if (isBoundaryLayer) {
          // Boundary layer: gunakan incident-based coloring
          const shouldUseIncidentColoring = filterData?.useIncidentColoring && 
                                            Object.keys(incidentColorMap).length > 0;
          
          console.log('🎨 Mitigasi/Adaptasi boundary check:', {
            layerKey,
            shouldUseIncidentColoring,
            incidentColorMapSize: Object.keys(incidentColorMap).length,
            locationType: filterData?.locationType
          });
          
          if (shouldUseIncidentColoring) {
            // INCIDENT-BASED COLORING untuk Mitigasi/Adaptasi
            console.log('🎨 Using incident-based coloring for Mitigasi boundary layer');
            
            // Determine which property to match
            let locationName;
            if (layerKey.includes('provinsi/year')) {
              locationName = feature.properties?.provinsi || feature.properties?.wadmpr;
            } else if (layerKey.includes('das/year')) {
              locationName = feature.properties?.nama_das || feature.properties?.das;
            }
            
            console.log('🔍 Mitigasi location check:', {
              layerKey,
              locationName,
              allProperties: Object.keys(feature.properties || {})
            });
            
            if (locationName) {
              const upperLocationName = locationName.toUpperCase().trim();
              const incidentColor = incidentColorMap[upperLocationName];
              
              console.log('🎨 Mitigasi color lookup:', {
                locationName,
                upperLocationName,
                incidentColor,
                found: !!incidentColor
              });
              
              if (incidentColor) {
                console.log(`✅ Applying incident color to Mitigasi "${locationName}": ${incidentColor}`);
                return {
                  fillColor: incidentColor,
                  fillOpacity: 0.6,
                  color: '#1e40af',
                  weight: 2.5,
                  opacity: 0.8
                };
              }
            }
            
            // Default color if no incident data
            console.log('Using default gray for Mitigasi (no incident data)');
            return {
              fillColor: '#e5e7eb', // Gray
              fillOpacity: 0.3,
              color: '#1e40af',
              weight: 2.5,
              opacity: 0.8
            };
          }
          
          // Default boundary styling jika tidak pakai incident coloring
          return {
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            color: '#1e40af',
            weight: 2.5,
            opacity: 0.8
          };
        } else if (isDisasterLayer) {
          // Disaster layer: merah/oranye lebih solid
          let disasterColor = '#ef4444'; // default merah
  
  if (layerKey.includes('lahan_kritis')) {
    disasterColor = '#FF4444'; // Merah untuk lahan kritis
  } else if (layerKey.includes('penutupan_lahan')) {
    disasterColor = '#44FF44'; // Hijau untuk penutupan lahan
  } else if (layerKey.includes('areal_karhutla')) {
    disasterColor = '#DC143C'; // Crimson untuk areal karhutla
  } else if (layerKey.includes('rawan_erosi')) {
    disasterColor = '#FFAA44'; // Orange untuk rawan erosi
  } else if (layerKey.includes('rawan_limpasan')) {
    disasterColor = '#4444FF'; // Biru untuk rawan limpasan
  } else if (layerKey.includes('rawan_karhutla')) {
    disasterColor = '#AA44FF'; // Ungu untuk rawan karhutla
  }
  
  console.log(`✅ Applying disaster color: ${disasterColor} for layer: ${layerKey}`);
  
  return {
    fillColor: disasterColor,
    fillOpacity: 0.5,
    color: '#000000',
    weight: 1.5,
    opacity: 1
  };
        }
      }

      // Risk analysis layer styling (tab Kerawanan) - TIDAK DIUBAH
      if (layerKey.includes('/api/risk-analysis') || layerKey.includes('detail_layer_')) {
        const riskColor = feature.properties?.risk_color || '#FF0000';
        
        console.log(`Styling risk layer ${layerKey} with color: ${riskColor}`);
        
        return {
          fillColor: riskColor,
          color: '#000000',
          weight: 2,
          fillOpacity: 0.7,
          opacity: 1
        };
      }

      // Mitigation layer styling (bukan boundary) - TIDAK DIUBAH
      if (isMitigationLayer(layerKey)) {
        return {
          fillColor: getMitigationLayerColor(layerKey),
          color: '#000000',
          weight: 1,
          fillOpacity: 0.6,
          opacity: 1
        };
      }
      
      let tableName = '';
      if (layerKey.includes('/api/layers/')) {
        const withoutPrefix = layerKey.replace('/api/layers/', '');
        const filterStartIndex = withoutPrefix.indexOf('_{');
        if (filterStartIndex !== -1) {
          tableName = withoutPrefix.substring(0, filterStartIndex);
        } else {
          tableName = withoutPrefix;
        }
      }
      
      const isBoundary = ['provinsi', 'kab_kota', 'kecamatan', 'kel_desa', 'das'].includes(tableName);
      
      // ENHANCED: Apply risk-based coloring untuk Provinsi dan DAS di tab Mitigasi/Adaptasi - TIDAK DIUBAH
      if (isBoundary && (tableName === 'provinsi' || tableName === 'das') && 
          filterData?.category === 'Mitigasi/Adaptasi' &&
          Object.keys(mitigationRiskData).length > 0) {
        
        // Coba berbagai field name untuk matching
        const locationName = feature.properties?.provinsi || 
                            feature.properties?.wadmpr || 
                            feature.properties?.das || 
                            feature.properties?.nama_das;
        
        console.log(`🔍 Trying to match ${tableName} feature:`, {
          locationName,
          allProps: Object.keys(feature.properties || {}),
          availableRiskData: Object.keys(mitigationRiskData).length
        });
        
        if (locationName) {
          const upperLocationName = locationName.toUpperCase().trim();
          const riskData = mitigationRiskData[upperLocationName];
          
          console.log(`🔍 Looking for risk data: "${upperLocationName}"`, riskData ? 'FOUND ✅' : 'NOT FOUND ❌');
          
          if (riskData) {
            console.log(`✅ Applying risk color to ${tableName} "${locationName}": ${riskData.risk_color} (${riskData.incident_count} incidents)`);
            
            return {
              fillColor: riskData.risk_color,
              color: '#000000',
              weight: 2,
              fillOpacity: 0.7,
              opacity: 1
            };
          }
        }
      }
      
      // Default boundary styling
      return {
        fillColor: getColorForLayer(layerKey, feature),
        color: '#000000',
        weight: isBoundary ? 2 : 1,
        fillOpacity: isBoundary ? 0.2 : 0.6,
        opacity: 1
      };
    };
  };

  // const createPopupContent = (feature: Feature, layerKey: string): string => {
  //   if (!feature.properties) return 'No data available';
    
  //   const props = feature.properties;
    
  //   if (layerKey.includes('/api/risk-analysis')) {
  //     const content = [
  //       `<div style="font-weight: bold; margin-bottom: 8px;">Analisis Risiko ${props.disaster_type}</div>`,
  //       `<b>Area:</b> ${props.kel_desa || props.kecamatan || props.kab_kota || 'Unknown'}`,
  //       `<b>Tingkat Risiko:</b> <span style="color: ${props.risk_color}; font-weight: bold;">${props.risk_level}</span>`,
  //       `<b>Jumlah Kejadian (1 tahun):</b> ${props.incident_count || 0}`,
  //       `<b>Level Analisis:</b> ${props.analysis_level}`,
  //       `<div style="margin-top: 8px; font-style: italic; color: #666;">Klik untuk melihat detail dan titik kejadian</div>`
  //     ];
      
  //     return content.join('<br>');
  //   }
    
  //   if (isMitigationLayer(layerKey)) {
  //     const layerName = filterData?.layers?.find((layer: any) => 
  //       layerKey.includes(layer.tableName))?.layerName || 'Layer Mitigasi';
      
  //     const content = [
  //       `<div style="font-weight: bold; margin-bottom: 8px;">${layerName}</div>`
  //     ];
      
  //     const relevantProps = Object.entries(props)
  //       .filter(([key, value]) => {
  //         return value !== null && 
  //                value !== undefined && 
  //                value !== '' &&
  //                !key.includes('geometry') &&
  //                !key.includes('geom');
  //       })
  //       .slice(0, 5);
      
  //     if (relevantProps.length > 0) {
  //       relevantProps.forEach(([key, value]) => {
  //         content.push(`<b>${key}:</b> ${value}`);
  //       });
  //     }
      
  //     return content.join('<br>');
  //   }
    
  //   const relevantProps = Object.entries(props)
  //     .filter(([key, value]) => {
  //       return value !== null && 
  //              value !== undefined && 
  //              value !== '' &&
  //              !key.includes('geometry') &&
  //              !key.includes('geom') &&
  //              key !== 'risk_color' &&
  //              key !== 'risk_level';
  //     })
  //     .slice(0, 8);
    
  //   if (relevantProps.length === 0) return 'No data available';
    
  //   const content = relevantProps
  //     .map(([key, value]) => `<b>${key}:</b> ${value}`)
  //     .join('<br>');
    
  //   return content;
  // };

  const createPopupContent = (feature: Feature, layerKey: string): string => {
    if (!feature.properties) return 'No data available';
    
    const props = feature.properties;
    
    // Risk analysis popup (tab Kerawanan)
    if (layerKey.includes('/api/risk-analysis')) {
      const content = [
        `<div style="font-weight: bold; margin-bottom: 8px;">Analisis Risiko ${props.disaster_type}</div>`,
        `<b>Area:</b> ${props.kel_desa || props.kecamatan || props.kab_kota || props.provinsi || props.das || 'Unknown'}`,
        `<b>Tingkat Risiko:</b> <span style="color: ${props.risk_color}; font-weight: bold;">${props.risk_level}</span>`,
        `<b>Jumlah Kejadian (1 tahun):</b> ${props.incident_count || 0}`,
        `<b>Level Analisis:</b> ${props.analysis_level}`,
        `<div style="margin-top: 8px; font-style: italic; color: #666;">Klik untuk melihat detail dan titik kejadian</div>`
      ];
      
      return content.join('<br>');
    }
    
    // Extract table name
    let tableName = '';
    if (layerKey.includes('/api/layers/')) {
      const withoutPrefix = layerKey.replace('/api/layers/', '');
      const filterStartIndex = withoutPrefix.indexOf('_{');
      if (filterStartIndex !== -1) {
        tableName = withoutPrefix.substring(0, filterStartIndex);
      } else {
        tableName = withoutPrefix;
      }
    }
    
    // Enhanced popup untuk Provinsi/DAS di tab Mitigasi/Adaptasi dengan risk data
    if ((tableName === 'provinsi' || tableName === 'das') && 
        filterData?.category === 'Mitigasi/Adaptasi' &&
        Object.keys(mitigationRiskData).length > 0) {
      
      const locationName = props.provinsi || props.wadmpr || props.das || props.nama_das;
      
      if (locationName) {
        const upperLocationName = locationName.toUpperCase().trim();
        const riskData = mitigationRiskData[upperLocationName];
        
        if (riskData) {
          const content = [
            `<div style="font-weight: bold; margin-bottom: 8px;">Analisis Risiko ${filterData.disasterType}</div>`,
            `<b>${tableName === 'provinsi' ? 'Provinsi' : 'DAS'}:</b> ${locationName}`,
            `<b>Tingkat Risiko:</b> <span style="color: ${riskData.risk_color}; font-weight: bold;">${riskData.risk_level}</span>`,
            `<b>Jumlah Kejadian (1 tahun):</b> ${riskData.incident_count}`
          ];
          
          return content.join('<br>');
        }
      }
    }
    
    // Mitigation layer popup (bukan boundary)
    if (isMitigationLayer(layerKey)) {
      const layerName = filterData?.layers?.find((layer: any) => 
        layerKey.includes(layer.tableName))?.layerName || 'Layer Mitigasi';
      
      const content = [
        `<div style="font-weight: bold; margin-bottom: 8px;">${layerName}</div>`
      ];
      
      const relevantProps = Object.entries(props)
        .filter(([key, value]) => {
          return value !== null && 
                 value !== undefined && 
                 value !== '' &&
                 !key.includes('geometry') &&
                 !key.includes('geom');
        })
        .slice(0, 5);
      
      if (relevantProps.length > 0) {
        relevantProps.forEach(([key, value]) => {
          content.push(`<b>${key}:</b> ${value}`);
        });
      }
      
      return content.join('<br>');
    }
    
    // Default popup untuk boundary layers lainnya
    const locationName = props.wadmpr || props.wadmkk || props.wadmkc || 
                        props.wadmkd || props.provinsi || props.kab_kota || 
                        props.kecamatan || props.kel_desa || props.nama_das || 
                        props.das || 'Unknown';
    
    return `<b>${tableName}:</b> ${locationName}`;
  };

  return (
    <div className="h-full w-full relative">
      {/* Include enhanced marker styles */}
      <EnhancedMarkerStyles />
      
      {/* Refresh indicator */}
      {isRefreshing && (
        <div className="absolute top-4 right-4 bg-blue-500/90 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-[1001] flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>Memperbarui analisis risiko...</span>
        </div>
      )}
      
      <MapContainer
        center={[-2.5, 118.0]}
        zoom={5}
        minZoom={4}
        maxZoom={18}
        maxBounds={[[-11.0, 95.0], [6.5, 141.0]]}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
        preferCanvas={false}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={18}
        />
        <SetViewOnLoad />
        
        <RiskRefreshHandler
          filterData={filterData}
          riskRefreshTrigger={riskRefreshTrigger}
          onDataRefresh={handleDataRefresh}
        />
        
        <ZoomToActiveLayers 
          loadedLayers={loadedLayers} 
          filterData={filterData}
          detailView={detailView}
        />

        {/* Render incident markers */}
        {detailView && incidentData.length > 0 && (
          <IncidentMarkers 
            incidents={incidentData} 
            disasterType={detailView.disaster_type}
          />
        )}

        {/* FIXED: Render layers with proper ordering and unique keys */}
        {Object.entries(loadedLayers)
          .sort(([keyA], [keyB]) => {
            // Boundary layers first, risk analysis layers last, mitigation in between
            if (keyA.includes('/api/risk-analysis') && !keyB.includes('/api/risk-analysis')) return 1;
            if (!keyA.includes('/api/risk-analysis') && keyB.includes('/api/risk-analysis')) return -1;
            if (isMitigationLayer(keyA) && !isMitigationLayer(keyB)) return 1;
            if (!isMitigationLayer(keyA) && isMitigationLayer(keyB)) return -1;
            return 0;
          })
          .map(([layerKey, data]) => {
            if (data && data !== 'loading' && data !== 'error') {
              if (data.features && data.features.length > 0) {
                console.log(`Rendering layer: ${layerKey} with ${data.features.length} features`);
                
                return (
                  <GeoJSON
                    key={`${layerKey}-${renderTrigger}`}
                    data={data}
                    style={getStyleForLayer(layerKey)}
                    onEachFeature={(feature, leafletLayer) => {
                      console.log('Setting up layer event handlers:', {
                        layerKey, 
                        isRiskAnalysis: layerKey.includes('/api/risk-analysis'),
                        filterMode: filterData?.isRiskAnalysis,
                        featureProps: Object.keys(feature.properties || {})
                      });
                      
                      // FIXED: Enhanced event handling with proper cleanup
                      if (filterData?.isRiskAnalysis) {
                        if (layerKey.includes('/api/risk-analysis')) {
                          console.log('Setting up RISK ANALYSIS layer with enhanced click handler');
                          
                          // FIXED: Single, robust click handler
                          const clickHandler = (e: any) => {
                            console.log('RISK ANALYSIS LAYER CLICKED!', {
                              properties: feature.properties,
                              layerKey,
                              latlng: e.latlng
                            });
                            
                            // Prevent default behavior and stop propagation
                            L.DomEvent.preventDefault(e);
                            L.DomEvent.stopPropagation(e);
                            
                            handleLayerClick(feature, layerKey);
                          };
                          
                          // FIXED: Use Leaflet's event system properly
                          leafletLayer.on('click', clickHandler);
                          
                          // FIXED: Enhanced hover effects
                          leafletLayer.on({
                            mouseover: (e) => {
                              const layer = e.target;
                              console.log('Risk layer mouseover - applying hover effects');
                              
                              layer.setStyle({
                                weight: 4,
                                fillOpacity: 0.9,
                                color: '#ffffff',
                                dashArray: '5, 5'
                              });
                              
                              // Enhanced tooltip
                              const props = feature.properties;
                              if (props) {
                                const tooltipContent = `
                                  <div style="font-size: 12px; background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px;">
                                    <strong>${props.kel_desa || props.kecamatan || props.kab_kota || 'Area'}</strong><br/>
                                    Risiko: <span style="color: ${props.risk_color}; font-weight: bold;">${props.risk_level}</span><br/>
                                    Kejadian: ${props.incident_count || 0}<br/>
                                    <em>Klik untuk detail</em>
                                  </div>
                                `;
                                layer.bindTooltip(tooltipContent, {
                                  permanent: false,
                                  direction: 'top',
                                  offset: [0, -10],
                                  opacity: 0.9,
                                  className: 'risk-tooltip'
                                }).openTooltip();
                              }
                              
                              // Bring to front
                              if ('bringToFront' in layer && typeof layer.bringToFront === 'function') {
                                layer.bringToFront();
                              }
                            },
                            mouseout: (e) => {
                              const layer = e.target;
                              console.log('Risk layer mouseout - removing hover effects');
                              
                              layer.setStyle({
                                weight: 2,
                                fillOpacity: 0.7,
                                color: '#000000',
                                dashArray: null
                              });
                              
                              layer.closeTooltip();
                            }
                          });
                          
                        } else {
                          console.log('Setting up BOUNDARY layer - minimal interaction in risk analysis mode');
                          
                          // Boundary layer in risk analysis mode: minimal hover, no clicks
                          leafletLayer.on({
                            mouseover: (e) => {
                              const layer = e.target;
                              layer.setStyle({
                                weight: 3,
                                opacity: 0.8
                              });
                            },
                            mouseout: (e) => {
                              const layer = e.target;
                              layer.setStyle({
                                weight: 2,
                                opacity: 1
                              });
                            }
                          });
                        }
                      } else {
                        console.log('Normal mode - setting up popup for:', layerKey);
                        
                        // Normal mode: popup functionality
                        const popupContent = createPopupContent(feature, layerKey);
                        leafletLayer.bindPopup(popupContent, {
                          maxWidth: 300,
                          className: 'custom-popup'
                        });
                        
                        // PERBAIKAN: Hover effects berbeda untuk Kebencanaan
                        if (filterData?.category === 'Kebencanaan') {
                          const isBoundaryLayer = layerKey.includes('provinsi/year') || 
                                                 layerKey.includes('das/year');
                          const isDisasterLayer = layerKey.includes('lahan_kritis') || 
                                                 layerKey.includes('penutupan_lahan') || 
                                                 layerKey.includes('areal_karhutla');
                          
                          leafletLayer.on({
                            mouseover: (e) => {
                              const layer = e.target;
                              if (isBoundaryLayer) {
                                // Hover untuk boundary: sedikit lebih gelap
                                layer.setStyle({
                                  fillOpacity: 0.25,
                                  weight: 3,
                                  opacity: 1
                                });
                              } else if (isDisasterLayer) {
                                // Hover untuk disaster layer: lebih solid
                                layer.setStyle({
                                  fillOpacity: 0.7,
                                  weight: 2.5,
                                  color: '#7f1d1d'
                                });
                              }
                              if ('bringToFront' in layer && typeof layer.bringToFront === 'function') {
                                layer.bringToFront();
                              }
                            },
                            mouseout: (e) => {
                              const layer = e.target;
                              if (isBoundaryLayer) {
                                // Reset boundary ke style awal
                                layer.setStyle({
                                  fillOpacity: 0.15,
                                  weight: 2.5,
                                  opacity: 0.8
                                });
                              } else if (isDisasterLayer) {
                                // Reset disaster layer ke style awal
                                layer.setStyle({
                                  fillOpacity: 0.5,
                                  weight: 1.5,
                                  color: '#991b1b'
                                });
                              }
                            }
                          });
                        }
                        // Hover effects untuk mitigation layers - TIDAK DIUBAH
                        else if (isMitigationLayer(layerKey)) {
                          leafletLayer.on({
                            mouseover: (e) => {
                              const layer = e.target;
                              layer.setStyle({
                                weight: 2,
                                fillOpacity: 0.8,
                                color: '#ffffff'
                              });
                              if ('bringToFront' in layer && typeof layer.bringToFront === 'function') {
                                layer.bringToFront();
                              }
                            },
                            mouseout: (e) => {
                              const layer = e.target;
                              layer.setStyle({
                                weight: 1,
                                fillOpacity: 0.6,
                                color: '#000000'
                              });
                            }
                          });
                        }
                      }
                    }}
                  />
                );
              }
            }
            return null;
          })}
          {kejadianMarkers.length > 0 && kejadianMarkers.map((kejadian: any) => (
          <Marker
            key={kejadian.id}
            position={[kejadian.latitude, kejadian.longitude]}
            icon={L.divIcon({
              className: 'custom-incident-marker',
              html: `
                <div style="
                  background-color: #ef4444;
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <div style="
                    background-color: white;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                  "></div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
            eventHandlers={{
              click: () => handleMarkerClick(kejadian.id)
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  {kejadian.disaster_type}
                </h3>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  <div><strong>Tanggal:</strong> {new Date(kejadian.incident_date).toLocaleDateString('id-ID')}</div>
                  <div><strong>Lokasi:</strong> {kejadian.kecamatan}, {kejadian.kabupaten}</div>
                  {kejadian.title && <div><strong>Kejadian:</strong> {kejadian.title}</div>}
                  <div style={{ marginTop: '8px', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}>
                    Klik untuk detail lengkap
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Status indicators */}
      {filterData && filterData.category !== 'Mitigasi/Adaptasi' && (
        <div className="absolute top-4 left-4 bg-white/95 p-3 rounded-lg shadow-lg text-sm max-w-80 z-[1001]" style={{pointerEvents: 'none'}}>
          <div className="font-bold text-gray-800 mb-2 flex items-center justify-between">
            <span>{detailView ? 'Detail Kerawanan' : 'Filter Aktif'}:</span>
            {detailView && onBackToMain && (
              <button 
                onClick={onBackToMain}
                className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                style={{pointerEvents: 'auto'}}
              >
                ← Kembali
              </button>
            )}
          </div>
          
          {detailView ? (
            <div className="space-y-1">
              <div><span className="font-medium">Area:</span> {detailView.selectedArea}</div>
              <div><span className="font-medium">Level:</span> {detailView.level}</div>
              <div><span className="font-medium">Bencana:</span> {detailView.disaster_type}</div>
              <div><span className="font-medium">Risiko:</span> 
                <span style={{color: detailView.risk_color, fontWeight: 'bold'}}> {detailView.risk_level}</span>
                {isRefreshing && (
                  <span className="ml-2 text-blue-600 text-xs">(Diperbarui)</span>
                )}
              </div>
              <div><span className="font-medium">Kejadian (1 tahun):</span> {detailView.incident_count}</div>
              <div><span className="font-medium">Titik Kejadian:</span> {incidentData.length}</div>
              {incidentData.length !== detailView.incident_count && (
                <div className="text-xs text-amber-600 bg-amber-50 p-1 rounded mt-1">
                  Note: Titik yang ditampilkan ({incidentData.length}) mungkin berbeda dari total kejadian ({detailView.incident_count}) 
                  karena filter koordinat valid
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div><span className="font-medium">Kategori:</span> {filterData.category}
                {isRefreshing && filterData.isRiskAnalysis && (
                  <span className="ml-2 text-blue-600 text-xs">(Diperbarui)</span>
                )}
              </div>
              {filterData.disasterType && (
                <div><span className="font-medium">Jenis Bencana:</span> {filterData.disasterType}</div>
              )}
              <div><span className="font-medium">Lokasi:</span> {filterData.selectedValue}</div>
              <div><span className="font-medium">Level:</span> {filterData.locationType}</div>
              {filterData.selectedLayers && filterData.selectedLayers.length > 0 && (
                <div><span className="font-medium">Layer Aktif:</span> {filterData.selectedLayers.length}</div>
              )}
              {filterData.isRiskAnalysis && (
                <div className="text-xs text-gray-600 mt-2 pt-1 border-t border-gray-200">
                  <strong>Klik area berwarna untuk melihat detail kejadian</strong><br/>
                  <small>Hover untuk melihat info, border putus-putus menandakan area dapat diklik</small>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {Object.values(loadedLayers).some(status => status === 'loading') && (
        <div className="absolute top-4 right-4 bg-blue-500/90 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-[1000] flex items-center gap-2" style={{pointerEvents: 'none'}}>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>Memuat layer...</span>
        </div>
      )}

      {/* Debug info for development */}
      {detailView && typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-gray-900/80 text-white text-xs p-2 rounded max-w-xs z-[1000]" style={{pointerEvents: 'none'}}>
          <div className="font-bold mb-1">Debug Info:</div>
          <div>Selected: {detailView.selectedArea}</div>
          <div>Level: {detailView.level}</div>
          <div>Incidents loaded: {incidentData.length}</div>
          <div>Incidents expected: {detailView.incident_count}</div>
          <div>Filter mode: {filterData?.isRiskAnalysis ? 'Risk Analysis' : 'Normal'}</div>
          <div>Render trigger: {renderTrigger}</div>
        </div>
      )}
    </div>
  );
}