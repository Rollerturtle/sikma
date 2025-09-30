// src/mockup.tsx - Updated dengan mitigation support dan risk refresh handler
import { useState } from 'react';
import IndonesiaMap from './components/maps/maps';
import Filter from './components/filters/filter';
import Statistic from './components/statistic/statistic';
import DetailedStatistic from './components/detailedstatistic/DetailedStatistic';
import TableDataView from './components/tabledataviews/tableDataView';
import ChartTabs from './components/charttabs/chartTabs';
import FileManager from './components/filemanager/fileManager';

export function Mockup() {
  const [filterData, setFilterData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('Kerawanan');
  const [detailView, setDetailView] = useState<any>(null);
  
  // State untuk trigger refresh risk analysis
  const [riskRefreshTrigger, setRiskRefreshTrigger] = useState(0);
  
  const handleFilterChange = (newFilterData: any) => {
    console.log('Mockup received filter data:', newFilterData);
    setFilterData(newFilterData);
    setDetailView(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setDetailView(null);
  };

  const handleDetailView = (detailData: any) => {
    console.log('Entering detail view:', detailData);
    setDetailView(detailData);
  };

  const handleBackToMain = () => {
    setDetailView(null);
  };

  // Handle reset dari detail view
  const handleResetToMain = () => {
    console.log('Resetting to main view from filter reset');
    setDetailView(null);
    setFilterData(null);
    setActiveTab('Kerawanan');
  };

  // Handle risk analysis update dari TableDataView
  const handleRiskAnalysisUpdate = (shouldRefresh: boolean) => {
    if (shouldRefresh) {
      console.log('Mockup: Triggering risk analysis refresh...');
      
      // Increment trigger untuk force refresh map component
      setRiskRefreshTrigger(prev => prev + 1);
      
      // Jika sedang dalam mode Kerawanan dengan risk analysis, refresh filter data
      if (filterData && filterData.isRiskAnalysis && activeTab === 'Kerawanan') {
        console.log('Mockup: Refreshing current risk analysis filter...');
        
        // Create new filter object to trigger re-render
        const refreshedFilterData = {
          ...filterData,
          refreshTrigger: Date.now() // Add timestamp to force refresh
        };
        
        setTimeout(() => {
          setFilterData(refreshedFilterData);
        }, 500); // Small delay to allow backend to process
      }
    }
  };

  // Check conditions for different tabs
  const isKebencanaan = activeTab === 'Kebencanaan';
  const isMitigasiAdaptasi = activeTab === 'Mitigasi' || activeTab === 'Adaptasi' || activeTab === 'Mitigasi/Adaptasi';
  const isKerawanan = activeTab === 'Kerawanan';
  const isDetailKerawanan = isKerawanan && detailView;

  // Helper function to get legend content based on filter data and detail view
  const getLegendContent = () => {
    // Detail view legend
    if (detailView) {
      return (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-800 mb-2">
            Detail Area: {detailView.selectedArea}
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full border border-white" 
                 style={{backgroundColor: '#3B82F6'}}></div>
            <span className="text-gray-700">Titik Kejadian Banjir</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full border border-white" 
                 style={{backgroundColor: '#DC2626'}}></div>
            <span className="text-gray-700">Titik Kejadian Longsor</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full border border-white" 
                 style={{backgroundColor: '#EA580C'}}></div>
            <span className="text-gray-700">Titik Kejadian Kebakaran</span>
          </div>
          
          <div className="text-xs text-gray-600 mt-2 pt-1 border-t border-gray-200">
            <div><strong>Tingkat Risiko:</strong> 
              <span style={{color: detailView.risk_color, fontWeight: 'bold'}}> {detailView.risk_level}</span>
            </div>
            <div><strong>Jumlah Kejadian:</strong> {detailView.incident_count}</div>
          </div>
        </div>
      );
    }

    if (!filterData) {
      return (
        <div className="text-xs text-gray-500">
          Pilih filter untuk melihat data
        </div>
      );
    }

    // Mitigation legend
    if (filterData.category === 'Mitigasi/Adaptasi') {
      return (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-800 mb-2">
            Layer Mitigasi/Adaptasi
            {riskRefreshTrigger > 0 && (
              <span className="ml-2 text-green-600 text-xs">(Layer Diperbarui)</span>
            )}
          </div>
          
          {/* Boundary layer */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-sm border border-black/20 flex-shrink-0" 
                 style={{backgroundColor: getBoundaryColor(filterData.locationType)}}></div>
            <span className="text-gray-700">
              Batas {getBoundaryLabel(filterData.locationType)}
            </span>
          </div>

          {/* Selected mitigation layers */}
          {filterData.selectedLayers && filterData.selectedLayers.length > 0 ? (
            filterData.selectedLayers.map((layerName: string) => (
              <div key={layerName} className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-sm border border-black/20 flex-shrink-0" 
                     style={{backgroundColor: getMitigationLayerColor(layerName)}}></div>
                <span className="text-gray-700">{layerName}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500 italic">
              Belum ada layer peta yang dipilih
            </div>
          )}
          
          <div className="text-xs text-gray-600 mt-2 pt-1 border-t border-gray-200">
            <div><strong>Area:</strong> {filterData.selectedValue}</div>
            <div><strong>Level:</strong> {filterData.locationType}</div>
            <div><strong>Layer Aktif:</strong> {filterData.selectedLayers?.length || 0}</div>
          </div>
        </div>
      );
    }

    // Risk analysis legend for Kerawanan
    if (filterData.isRiskAnalysis) {
      return (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-800 mb-2">
            Tingkat Risiko {filterData.disasterType}
            {riskRefreshTrigger > 0 && (
              <span className="ml-2 text-green-600 text-xs">(Diperbarui)</span>
            )}
          </div>
          
          {/* Risk levels */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-sm border border-black/20 flex-shrink-0" 
                 style={{backgroundColor: '#22c55e'}}></div>
            <span className="text-gray-700">Rendah (≤1 kejadian/tahun)</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-sm border border-black/20 flex-shrink-0" 
                 style={{backgroundColor: '#f97316'}}></div>
            <span className="text-gray-700">Sedang (2-5 kejadian/tahun)</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-sm border border-black/20 flex-shrink-0" 
                 style={{backgroundColor: '#ef4444'}}></div>
            <span className="text-gray-700">Tinggi (&gt;5 kejadian/tahun)</span>
          </div>

          {/* Boundary layer */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-sm border border-black/20 flex-shrink-0" 
                 style={{backgroundColor: getBoundaryColor(filterData.locationType)}}></div>
            <span className="text-gray-700">
              Batas {getBoundaryLabel(filterData.locationType)}
            </span>
          </div>
          
          <div className="text-xs text-gray-600 mt-2 pt-1 border-t border-gray-200">
            <div><strong>Area:</strong> {filterData.selectedValue}</div>
            <div><strong>Level:</strong> {getDisplayLevel(filterData.locationType)}</div>
            <div className="text-xs text-gray-500 mt-1">Klik layer untuk detail</div>
          </div>
        </div>
      );
    }

    // Regular disaster data legend for Kebencanaan
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <div 
            className="w-4 h-4 rounded-sm border border-black/20 flex-shrink-0" 
            style={{backgroundColor: getBoundaryColor(filterData.locationType)}}
          ></div>
          <span className="text-gray-700">
            Batas {getBoundaryLabel(filterData.locationType)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div 
            className="w-4 h-4 rounded-sm border border-black/20 flex-shrink-0" 
            style={{backgroundColor: getDisasterColor(filterData.disasterTable)}}
          ></div>
          <span className="text-gray-700">Area {filterData.disasterType}</span>
        </div>
        <div className="text-xs text-gray-600 mt-2 pt-1 border-t border-gray-200">
          Filter: {filterData.selectedValue}
        </div>
      </div>
    );
  };

  // Helper functions for legend
  const getBoundaryColor = (locationType: string): string => {
    const colorMap: Record<string, string> = {
      'Provinsi': '#FFA500',
      'Daerah Administratif': '#FFA500',
      'Kabupaten/Kota': '#00BFFF',
      'Kecamatan': '#FFD700',
      'DAS': '#00FFFF'
    };
    return colorMap[locationType] || '#FFA500';
  };

  const getBoundaryLabel = (locationType: string): string => {
    const labelMap: Record<string, string> = {
      'Provinsi': 'Provinsi',
      'Daerah Administratif': 'Provinsi',
      'Kabupaten/Kota': 'Kabupaten/Kota',
      'Kecamatan': 'Kecamatan',
      'DAS': 'DAS'
    };
    return labelMap[locationType] || 'Area';
  };

  const getDisplayLevel = (locationType: string): string => {
    if (locationType === 'Provinsi') return 'Menampilkan Kabupaten/Kota';
    if (locationType === 'Kabupaten/Kota') return 'Menampilkan Kecamatan';
    if (locationType === 'Kecamatan') return 'Menampilkan Kelurahan/Desa';
    if (locationType === 'DAS') return 'Menampilkan Area DAS';
    return 'Area Terpilih';
  };

  // Helper function untuk warna mitigation layer
  const getMitigationLayerColor = (layerName: string): string => {
    const colorMap: Record<string, string> = {
      'Peta Areal Karhutla': '#DC143C',
      'Peta Lahan Kritis': '#FF4444', 
      'Peta Penutupan Lahan': '#44FF44',
      'Peta Rawan Karhutla': '#AA44FF',
      'Peta Rawan Erosi': '#FFAA44',
      'Peta Rawan Limpasan': '#4444FF'
    };
    
    return colorMap[layerName] || '#666666';
  };

  return (
    <div className="mockup-container">
      <div className="mockup-grid">
        <div className="mockup-cell relative">
          <IndonesiaMap 
            filterData={filterData} 
            onDetailView={handleDetailView}
            detailView={detailView}
            onBackToMain={handleBackToMain}
            riskRefreshTrigger={riskRefreshTrigger}
          />

          {/* Enhanced Legend - Show different content for detail view */}
          <div className="absolute bottom-5 left-3 bg-white/95 rounded-md shadow-lg border border-gray-300 p-3 max-w-64 z-[1001]">
            <div className="font-semibold text-sm text-gray-800 mb-2">
              {detailView ? `Detail ${detailView.selectedArea}` : 
               (filterData ? `${filterData.category}${filterData.disasterType ? ` - ${filterData.disasterType}` : ''}` : 'Legenda')}
            </div>
            
            {/* Back button for detail view */}
            {detailView && (
              <button 
                onClick={handleBackToMain}
                className="mb-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
              >
                ← Kembali ke Filter Utama
              </button>
            )}
            
            {getLegendContent()}
          </div>
        </div>

        {/* Cell 2: Filter */}
        <div className="mockup-cell relative">
          <Filter 
            onFilterChange={handleFilterChange} 
            onTabChange={handleTabChange}
            onResetToMain={handleResetToMain}
          />
        </div>

        {/* Cell 3: Show ChartTabs when in detail kerawanan, otherwise show based on tab */}
        {(isDetailKerawanan || isMitigasiAdaptasi) && (
          <div className="mockup-cell">
            <ChartTabs isInMockup={true}/>
          </div>
        )}
        
        {(isKebencanaan && !isDetailKerawanan) && (
          <div className="mockup-cell">
            <DetailedStatistic />
          </div>
        )}

        {/* Cell 4: Show appropriate component based on state */}
        {(isMitigasiAdaptasi && !isDetailKerawanan) && (
          <div className="mockup-cell">
            <FileManager />
          </div>
        )}

        {(isKebencanaan && !isDetailKerawanan) && (
          <div className="mockup-cell">
            <Statistic />
          </div>
        )}

        {/* Cell 4: Empty when in detail kerawanan to give more space to chart */}
        {isDetailKerawanan && (
          <div className="mockup-cell">
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center p-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Detail Analisis Kerawanan</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div><strong>Area:</strong> {detailView.selectedArea}</div>
                  <div><strong>Level:</strong> {detailView.level}</div>
                  <div><strong>Jumlah Kejadian:</strong> {detailView.incident_count}</div>
                  <div><strong>Tingkat Risiko:</strong> 
                    <span style={{color: detailView.risk_color, fontWeight: 'bold'}}> {detailView.risk_level}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {/* Table Data Section - Show when tab is "Kebencanaan" dengan risk update handler */}
      {isKebencanaan && (
        <div className="table-data-section">
          <TableDataView 
            filterData={filterData} 
            onRiskAnalysisUpdate={handleRiskAnalysisUpdate}
          />
        </div>
      )}
    </div>
  );
}

export default Mockup;

// Helper function untuk mendapatkan warna disaster
function getDisasterColor(disasterTable: string): string {
  const colorMap: Record<string, string> = {
    'lahan_kritis': '#FF4444',
    'penutupan_lahan_2024': '#44FF44', 
    'rawan_erosi': '#FFAA44',
    'rawan_karhutla_2024': '#AA44FF',
    'rawan_limpasan': '#4444FF',
    'areal_karhutla_2024': '#DC143C'
  };
  
  return colorMap[disasterTable] || '#666666';
}