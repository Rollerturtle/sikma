import React, {useState, useEffect} from 'react';
import { API_URL } from '../../api';
import './statistic.css';

interface StatisticProps {
  filterData?: any;
  selectedYear?: number | null;
}

interface MonthData {
  month: number;
  name: string;
  count: number;
}

export default function Statistic({ filterData, selectedYear }: StatisticProps) {
  
  const [monthlyStats, setMonthlyStats] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(false);
  
  const monthNames = [
    { month: 1, name: 'JAN.' },
    { month: 2, name: 'FEB.' },
    { month: 3, name: 'MAR.' },
    { month: 4, name: 'APR.' },
    { month: 5, name: 'MEI.' },
    { month: 6, name: 'JUN.' },
    { month: 7, name: 'JUL.' },
    { month: 8, name: 'AGST.' },
    { month: 9, name: 'SEP.' },
    { month: 10, name: 'OKT.' },
    { month: 11, name: 'NOV.' },
    { month: 12, name: 'DES.' }
  ];

  useEffect(() => {
    const fetchMonthlyStats = async () => {
      console.log('📅 Statistic useEffect triggered', {
        filterData,
        selectedYear,
        hasFilter: !!filterData,
        category: filterData?.category,
        disasterType: filterData?.disasterType,
        selectedValue: filterData?.selectedValue,
        locationType: filterData?.locationType
      });

      // Reset jika tidak ada filter, bukan tab Kebencanaan, atau tahun belum dipilih
      if (!filterData || filterData.category !== 'Kebencanaan' || !selectedYear) {
        console.log('⚠️ Resetting monthly stats');
        setMonthlyStats(monthNames.map(m => ({ ...m, count: 0 })));
        return;
      }

      // Cek apakah disaster type sudah dipilih
      if (!filterData.disasterType) {
        console.log('⚠️ No disaster type selected');
        setMonthlyStats(monthNames.map(m => ({ ...m, count: 0 })));
        return;
      }

      // Untuk level Indonesia, selectedValue harus "Indonesia"
      // Untuk level lain, selectedValue harus ada
      if (filterData.locationType !== 'Indonesia' && !filterData.selectedValue) {
        console.log('⚠️ Location required but not selected');
        setMonthlyStats(monthNames.map(m => ({ ...m, count: 0 })));
        return;
      }

      setLoading(true);

      try {
        // Build query parameters
        const url = new URL(`${API_URL}/api/kejadian/monthly-stats`);
        url.searchParams.append('disaster_type', filterData.disasterType);
        url.searchParams.append('year', String(selectedYear));
        
        // Add location filter based on location type
        if (filterData.locationType === 'Indonesia') {
          console.log('🌍 Fetching monthly for Indonesia');
        } else if (filterData.locationType === 'Provinsi') {
          url.searchParams.append('provinsi', filterData.selectedValue);
          console.log('🏛️ Fetching monthly for Provinsi:', filterData.selectedValue);
        } else if (filterData.locationType === 'DAS') {
          url.searchParams.append('das', filterData.selectedValue);
          console.log('🌊 Fetching monthly for DAS:', filterData.selectedValue);
        }

        console.log('🔍 Fetching monthly stats from URL:', url.toString());

        const response = await fetch(url.toString());
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Monthly stats received:', data);
          
          // Create array with all months, filling in 0 for months without data
          const statsMap = new Map(data.map((item: any) => [item.month, item.count]));
          const fullStats = monthNames.map(m => ({
            ...m,
            count: statsMap.get(m.month) || 0
          }));
          
          console.log('📊 Final monthly stats:', fullStats);
          setMonthlyStats(fullStats);
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to fetch monthly stats:', response.status, errorText);
          setMonthlyStats(monthNames.map(m => ({ ...m, count: 0 })));
        }
      } catch (error) {
        console.error('❌ Error fetching monthly stats:', error);
        setMonthlyStats(monthNames.map(m => ({ ...m, count: 0 })));
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyStats();
  }, [filterData, selectedYear]);

  // Calculate total for the year
  const totalCount = monthlyStats.reduce((sum, month) => sum + month.count, 0);

  // Check if data is available
  const isDataAvailable = selectedYear && filterData?.disasterType && 
    (filterData?.locationType === 'Indonesia' || filterData?.selectedValue);

  return (
    <div className="statistic-grid">
      {/* Header */}
      <div className="stat-header">
        <h3 className="stat-title">Intensitas Kejadian Bencana Perbulan</h3>
        <h4 className="stat-subtitle">Jumlah Kejadian Bencana Perbulan</h4>
      </div>

      {/* Kotak besar*/}
      <div className="stat-big">
        <h1>{isDataAvailable ? totalCount : '-'}</h1>
        <h2>Kejadian</h2>
        <h2>Bencana</h2>
      </div>

      {/* Row 2 */}
      <div className="stat-small">
        <div className="month">MEI.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[4]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">JUN.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[5]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>

      {/* Row 3 */}
      <div className="stat-small">
        <div className="month">JUL.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[6]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">AGST.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[7]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>

      {/* Row 4 */}
      <div className="stat-small">
        <div className="month">JAN.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[0]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">FEB.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[1]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">MAR.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[2]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">APR.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[3]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>

      {/* Row 5 */}
      <div className="stat-small">
        <div className="month">SEP.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[8]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">OKT.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[9]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">NOV.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[10]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
      <div className="stat-small">
        <div className="month">DES.</div>
        <div className="number">{isDataAvailable ? (monthlyStats[11]?.count || 0) : '-'}</div>
        <div className="label">Kejadian</div>
        <div className="label">Bencana</div>
      </div>
    </div>
  );
}
