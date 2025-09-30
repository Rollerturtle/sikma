import React from 'react';
import './DetailedStatistic.css';
import StatisticList from './statisticlist/StatisticList';
import YearStat from './yearstat/YearStat';

export default function DetailedStatistic() {
  return (
    <div className="detailed-grid">
      {/* Row 1 */}
      <div className="row1">
        <div className="row1-left">
          <h2 className="ds-title">Intensitas Kejadian Pertahun</h2>
          <h3 className="ds-subtitle">Jumlah Kejadian Bencana Pertahun</h3>
          <h3 className="ds-note">*Berdasarkan Rekap Pusdalops PB</h3>
        </div>
        <div className="row1-right">
      <YearStat year={2014} count={23} index={0} />
      <YearStat year={2015} count={35} index={1} />
      <YearStat year={2016} count={52} index={2} />
      <YearStat year={2017} count={77} index={3} />
      <YearStat year={2018} count={76} index={4} />
      <YearStat year={2019} count={135} index={5} />
      <YearStat year={2020} count={80} index={6} />
      <YearStat year={2021} count={56} index={7} />
      <YearStat year={2022} count={120} index={8} />
      <YearStat year={2023} count={45} index={9} />
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
            number={1}
            metric="Jiwa"
            description="Hilang / /n Meninggal Dunia"
          />
          <StatisticList
            image="/public/images/person.png"
            imageSize={50}
            number={1}
            metric="Jiwa"
            description="Luka-luka"
          />
          <StatisticList
            image="/public/images/family.png"
            imageSize={50}
            number={1}
            metric="Jiwa"
            description="Menderita dan /n Terdampak bencana"
          />
        </div>
        {/* Col 2 */}
        <div className="col">
          <StatisticList
            image="/public/images/house-lighter-pink.png"
            imageSize={50}
            number={11}
            metric="Unit"
            description="Rumah Rusak Ringan"
          />
          <StatisticList
            image="/public/images/house-pink.png"
            imageSize={50}
            number={3}
            metric="Unit"
            description="Rumah Rusak Sedang"
          />
          <StatisticList
            image="/public/images/house-red.png"
            imageSize={50}
            number={2}
            metric="Unit"
            description="Rumah Rusak Berat"
          />
          <StatisticList
            image="/public/images/house-drowned.png"
            imageSize={50}
            number={4.184}
            metric="Unit"
            description="Rumah Tergenang"
          />
        </div>
        {/* Col 3 */}
        <div className="col">
          <StatisticList
            image="/public/images/bridge.png"
            imageSize={90}
            number={22}
            metric="Unit"
            description="
              Infrastruktur /n 
              Rusak sbb, /n
              - 4 Unit Rusak Ringan/n
              - 18 Unit Rusak Sedang/n
              - 0 Unit Rusak Berat/n
              meliputi: Jalan, Jembatan maupun plengsengan/TPT."

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
