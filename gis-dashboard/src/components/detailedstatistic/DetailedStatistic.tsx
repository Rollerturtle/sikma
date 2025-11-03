import {useState, useEffect} from 'react';
import './DetailedStatistic.css';
import StatisticList from './statisticlist/StatisticList';
import YearStat from './yearstat/YearStat';
import { API_URL } from '../../api';

interface DetailedStatisticProps {
  filterData?: any;
  onYearSelect?: (year: number) => void;
  selectedYear?: number | null;
}

interface YearStatData {
  year: number;
  count: number;
}

interface ImpactStats {
  total_meninggal: number;
  total_luka: number;
  total_mengungsi: number;
  total_rusak_ringan: number;
  total_rusak_sedang: number;
  total_rusak_berat: number;
  total_terendam: number;
  total_infra_ringan: number;
  total_infra_sedang: number;
  total_infra_berat: number;
  total_kejadian: number;
}

export default function DetailedStatistic({ filterData, onYearSelect, selectedYear }: DetailedStatisticProps) {
  const [yearStats, setYearStats] = useState<YearStatData[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate array of years (current year - 9 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 9 + i);

  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  useEffect(() => {
    const fetchImpactStats = async () => {
        if (!selectedYear || !filterData || filterData.category !== 'Kebencanaan') {
          setImpactStats(null);
          return;
        }

        if (!filterData.disasterType) {
          setImpactStats(null);
          return;
        }

        if (filterData.locationType !== 'Indonesia' && !filterData.selectedValue) {
          setImpactStats(null);
          return;
        }

        setLoadingImpact(true);

        try {
          const url = new URL(`${API_URL}/api/kejadian/impact-stats`);
          url.searchParams.append('disaster_type', filterData.disasterType);
          url.searchParams.append('year', String(selectedYear));
          
          if (filterData.locationType === 'Provinsi') {
            url.searchParams.append('provinsi', filterData.selectedValue);
          } else if (filterData.locationType === 'DAS') {
            url.searchParams.append('das', filterData.selectedValue);
          }

          console.log('📊 Fetching impact stats from URL:', url.toString());

          const response = await fetch(url.toString());
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Impact stats received:', data);
            setImpactStats(data);
          } else {
            console.error('❌ Failed to fetch impact stats');
            setImpactStats(null);
          }
        } catch (error) {
          console.error('❌ Error fetching impact stats:', error);
          setImpactStats(null);
        } finally {
          setLoadingImpact(false);
        }
      };

      fetchImpactStats();
    }, [selectedYear, filterData]);
useEffect(() => {
    const fetchYearStats = async () => {
      console.log('📊 DetailedStatistic useEffect triggered', {
        filterData,
        hasFilter: !!filterData,
        category: filterData?.category,
        disasterType: filterData?.disasterType,
        selectedValue: filterData?.selectedValue,
        locationType: filterData?.locationType
      });

      // Reset jika tidak ada filter atau bukan tab Kebencanaan
      if (!filterData || filterData.category !== 'Kebencanaan') {
        console.log('⚠️ Resetting: No filter or not Kebencanaan tab');
        setYearStats([]);
        if (onYearSelect) onYearSelect(null as any);
        return;
      }

      // Cek apakah disaster type sudah dipilih
      if (!filterData.disasterType) {
        console.log('⚠️ Resetting: No disaster type selected');
        setYearStats([]);
        if (onYearSelect) onYearSelect(null as any);
        return;
      }

      // Untuk level Indonesia, selectedValue harus "Indonesia"
      // Untuk level lain, selectedValue harus ada
      if (filterData.locationType !== 'Indonesia' && !filterData.selectedValue) {
        console.log('⚠️ Resetting: Location required but not selected');
        setYearStats([]);
        if (onYearSelect) onYearSelect(null as any);
        return;
      }

      setLoading(true);

      try {
        // Build query parameters
        const url = new URL(`${API_URL}/api/kejadian/year-stats`);
        url.searchParams.append('disaster_type', filterData.disasterType);
        
        // Add location filter based on location type
        if (filterData.locationType === 'Indonesia') {
          console.log('🌍 Fetching for Indonesia (no location filter)');
        } else if (filterData.locationType === 'Provinsi') {
          url.searchParams.append('provinsi', filterData.selectedValue);
          console.log('🏛️ Fetching for Provinsi:', filterData.selectedValue);
        } else if (filterData.locationType === 'DAS') {
          url.searchParams.append('das', filterData.selectedValue);
          console.log('🌊 Fetching for DAS:', filterData.selectedValue);
        }

        // Add year range
        url.searchParams.append('start_year', String(currentYear - 9));
        url.searchParams.append('end_year', String(currentYear));

        console.log('🔍 Fetching year stats from URL:', url.toString());

        const response = await fetch(url.toString());
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Year stats received:', data);
          
          // Create array with all years, filling in 0 for years without data
          const statsMap = new Map(data.map((item: any) => [item.year, item.count]));
          const fullStats = years.map(year => ({
            year,
            count: statsMap.get(year) || 0
          }));
          
          console.log('📈 Final year stats:', fullStats);
          setYearStats(fullStats);
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to fetch year stats:', response.status, errorText);
          setYearStats(years.map(year => ({ year, count: 0 })));
        }
      } catch (error) {
        console.error('❌ Error fetching year stats:', error);
        setYearStats(years.map(year => ({ year, count: 0 })));
      } finally {
        setLoading(false);
      }
    };

    fetchYearStats();
  }, [filterData, currentYear]);

  // Handle year click
  const handleYearClick = (year: number) => {
    if (onYearSelect) {
      onYearSelect(year);
    }
  };

  // Check if filter is applied
  const isFilterApplied = filterData && 
    filterData.category === 'Kebencanaan' && 
    filterData.disasterType && 
    (filterData.locationType === 'Indonesia' || filterData.selectedValue);

  const isImpactDataAvailable = isFilterApplied && selectedYear && impactStats;

  return (
    <div className="detailed-grid">
      {/* Row 1 */}
      <div className="row1">
        <div className="row1-left">
          <h2 className="ds-title">Intensitas Kejadian Pertahun</h2>
          <h3 className="ds-subtitle">Jumlah Kejadian Bencana Pertahun</h3>
          <h3 className="ds-note">
            {isFilterApplied 
              ? `*${filterData.disasterType} di ${filterData.selectedValue}`
              : '*Pilih jenis bencana dan lokasi terlebih dahulu'}
          </h3>
          <h3 className="ds-note">*Berdasarkan Rekap Pusdalops PB</h3>
        </div>
        <div className="row1-right">
        {loading ? (
            <div style={{ color: '#666', fontSize: '14px' }}>Memuat data...</div>
          ) : (
            yearStats.map((stat, index) => (
              <YearStat 
                key={stat.year}
                year={stat.year} 
                count={stat.count} 
                index={index}
                onYearClick={handleYearClick}
                isActive={selectedYear === stat.year}
              />
            ))
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div className="row2">
        <h2 className="ds2-title">Data Dampak Kejadian Bencana</h2>
        <h3 className="ds2-subtitle">Rincian Dampak Kejadian Bencana</h3>
      </div>

      {/* Row 3*/}
      <div className="row3">
        {/* Col 1 */}
        <div className="col">
          <StatisticList
            image="/public/images/death.png"
            imageSize={50}
            number={isImpactDataAvailable ? impactStats.total_meninggal : '-'}
            metric="Jiwa"
            description="Hilang / /n Meninggal Dunia"
          />
          <StatisticList
            image="/public/images/person.png"
            imageSize={50}
            number={isImpactDataAvailable ? impactStats.total_luka : '-'}
            metric="Jiwa"
            description="Luka-luka"
          />
          <StatisticList
            image="/public/images/family.png"
            imageSize={50}
            number={isImpactDataAvailable ? impactStats.total_mengungsi : '-'}
            metric="Jiwa"
            description="Menderita dan /n Terdampak bencana"
          />
        </div>
        {/* Col 2 */}
        <div className="col">
          <StatisticList
            image="/public/images/house-lighter-pink.png"
            imageSize={50}
            number={isImpactDataAvailable ? impactStats.total_rusak_ringan : '-'}
            metric="Unit"
            description="Rumah Rusak Ringan"
          />
          <StatisticList
            image="/public/images/house-pink.png"
            imageSize={50}
            number={isImpactDataAvailable ? impactStats.total_rusak_sedang : '-'}
            metric="Unit"
            description="Rumah Rusak Sedang"
          />
          <StatisticList
            image="/public/images/house-red.png"
            imageSize={50}
            number={isImpactDataAvailable ? impactStats.total_rusak_berat : '-'}
            metric="Unit"
            description="Rumah Rusak Berat"
          />
          <StatisticList
            image="/public/images/house-drowned.png"
            imageSize={50}
            number={isImpactDataAvailable ? impactStats.total_terendam : '-'}
            metric="Unit"
            description="Rumah Tergenang"
          />
        </div>
        {/* Col 3 */}
        <div className="col">
          <StatisticList
            image="/public/images/bridge.png"
            imageSize={90}
            number={isImpactDataAvailable ? (impactStats.total_infra_ringan + impactStats.total_infra_sedang + impactStats.total_infra_berat) : '-'}
            metric="Unit"
            description={isImpactDataAvailable 
              ? `Infrastruktur /n Rusak sbb, /n- ${impactStats.total_infra_ringan} Unit Rusak Ringan/n- ${impactStats.total_infra_sedang} Unit Rusak Sedang/n- ${impactStats.total_infra_berat} Unit Rusak Berat/nmeliputi: Jalan, Jembatan maupun plengsengan/TPT.`
              : "Infrastruktur /n Rusak sbb, /n- - Unit Rusak Ringan/n- - Unit Rusak Sedang/n- - Unit Rusak Berat/nmeliputi: Jalan, Jembatan maupun plengsengan/TPT."
            }
          />
        </div>
        {/* Col 4 */}
        <div className="col">
         <StatisticList
            image="/public/images/facilities.png"
            imageSize={70}
            number={2}
            metric="Unit"
            description="Fasilitas Umum/ /n Sosial Rusak"
          />
          <StatisticList
            image="/public/images/book.png"
            imageSize={70}
            number={2}
            metric="Unit"
            description="Fasilitas Pendidikan/n Rusak"
          />
        </div>
        {/* Col 5 */}
        <div className="col">
          <StatisticList
            image="/public/images/cow.png"
            imageSize={60}
            number={"-"}
            metric=""
            description="Ternak Mati"
          />
          <StatisticList
            image="/public/images/bush.png"
            imageSize={70}
            number={2}
            metric="Unit"
            description="Lahan Rusak"
          />
          <StatisticList
            image="/public/images/trees.png"
            imageSize={70}
            number={2}
            metric="Unit"
            description="Pohon Tumbang"
          />
        </div>
      </div>
    </div>
  );
}
