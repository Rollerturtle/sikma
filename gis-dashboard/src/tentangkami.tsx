import React from 'react';
import { useNavigate } from 'react-router-dom';

const TentangKami = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header/Navbar */}
      <div className="bg-orange-500 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 relative flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:bg-orange-600 px-3 py-2 rounded transition-colors"
          >
            ← Kembali
          </button>
          <h1 className="text-2xl font-bold text-white absolute left-1/2 transform -translate-x-1/2">
            Tentang Kami
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Informasi Umum */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2">
            Pusat Pengembangan Mitigasi dan Adaptasi Bencana Hidrometeorologi Kehutanan
          </h2>
          
          <div className="space-y-4 text-gray-700 text-justify leading-relaxed">
            <p>
              Berdasar Permenhut no 1 tahun 2024, Pusat Pengembangan Mitigasi dan Adaptasi Bencana 
              Hidrometeorologi Kehutanan (Pusbang Mitigasi) mempunyai tugas melaksanakan pengembangan 
              mitigasi dan adaptasi bencana hidrometeorologi kehutanan, yang merupakan unsur pendukung 
              pelaksanaan tugas Kementerian yang berada di bawah dan bertanggung jawab kepada Menteri 
              melalui Sekretaris Jenderal.
            </p>
            
            <p>
              Bencana hidrometeorologi kehutanan adalah kejadian merusak yang terkait dengan kondisi 
              cuaca dan siklus air, seperti banjir, longsor, dan kebakaran hutan, yang terjadi di 
              kawasan hutan dan memberikan dampak signifikan pada ekosistem hutan serta daerah sekitarnya. 
              Bencana ini berakar dari fenomena seperti curah hujan ekstrem, kekeringan, angin kencang, 
              hingga gelombang panas yang sangat memengaruhi kelestarian hutan.
            </p>
            
            <p>
              Pusbang Mitigasi saat ini akan mengembangkan Sistem Informasi berbasis geospasial yang 
              berisi data dan informasi terkait bencana hidrometeorologi. Sistem ini memberikan informasi 
              kejadian bencana (historis bencana), lokasi rawan bencana dan aksi mitigasi dan adaptasi 
              yang sudah dilakukan. Sistem ini dilengkapi dengan beberapa informasi yang terkait kondisi 
              geografis seperti curah hujan, tutupan lahan, kondisi tanah, kelerangan dan geologi.
            </p>
            
            <p>
              Sistem ini didukung dengan beberapa data yang bersumber dari Kementerian Kehutanan, BMKG, 
              BNPB, Kementerian Pertanian dan Kementerian ESDM. Diharapkan sistem informasi ini dapat 
              memberikan sumber data dan informasi untuk kegiatan mitigasi dan adaptasi bencana 
              hidrometeorologi kehutanan di Kementerian Kehutanan.
            </p>
          </div>
        </div>

        {/* Tujuan Pengembangan Sistem */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2">
            Tujuan Pengembangan Sistem
          </h2>
          
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li className="leading-relaxed">
              Tersedianya sumber informasi bencana hidrometeorologi kehutanan yang berkesinambungan 
              dan temutakhirkan berupa data historis kejadian bencana, data rawan bencana dan data 
              aksi mitigasi dan adaptasi yang sudah dilakukan.
            </li>
            <li className="leading-relaxed">
              Tersedianya sistem informasi yang menyediakan visualisasi berbasis map terkait bencana 
              hidrometeorologi Kehutanan.
            </li>
          </ol>
        </div>

        {/* Tabel Sumber Data dan Informasi */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2">
            Sumber Data dan Informasi
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-400 text-white">
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">No.</th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">Jenis Peta</th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">Sumber Data</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="bg-blue-100">
                  <td className="border border-gray-300 px-4 py-2">1.</td>
                  <td className="border border-gray-300 px-4 py-2">Tutupan lahan (2024)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-2">2</td>
                  <td className="border border-gray-300 px-4 py-2">Lahan Kritis (2022)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-blue-100">
                  <td className="border border-gray-300 px-4 py-2">3</td>
                  <td className="border border-gray-300 px-4 py-2">DAS (2018)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-2">4</td>
                  <td className="border border-gray-300 px-4 py-2">Limpasan air (2015)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-blue-100">
                  <td className="border border-gray-300 px-4 py-2">5</td>
                  <td className="border border-gray-300 px-4 py-2">Rawan Erosi (2018)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-2">6</td>
                  <td className="border border-gray-300 px-4 py-2">Areal Karhutla (2021-2024)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-blue-100">
                  <td className="border border-gray-300 px-4 py-2">7</td>
                  <td className="border border-gray-300 px-4 py-2">Rawan Karhutla (2024)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-2">8</td>
                  <td className="border border-gray-300 px-4 py-2">Rehabilitasi hutan dan lahan (2019)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-blue-100">
                  <td className="border border-gray-300 px-4 py-2">9</td>
                  <td className="border border-gray-300 px-4 py-2">Penerapan Teknik TKA (2022)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-2">10</td>
                  <td className="border border-gray-300 px-4 py-2">Jenis Tanah</td>
                  <td className="border border-gray-300 px-4 py-2">Portal KSP</td>
                </tr>
                <tr className="bg-blue-100">
                  <td className="border border-gray-300 px-4 py-2">11</td>
                  <td className="border border-gray-300 px-4 py-2">Rehabilitasi DAS (2024)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-2">12</td>
                  <td className="border border-gray-300 px-4 py-2">Gerakan Tanah/Longsor</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian ESDM</td>
                </tr>
                <tr className="bg-blue-100">
                  <td className="border border-gray-300 px-4 py-2">13</td>
                  <td className="border border-gray-300 px-4 py-2">Geologi</td>
                  <td className="border border-gray-300 px-4 py-2">Portal KSP</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-2">14</td>
                  <td className="border border-gray-300 px-4 py-2">Infrasturktur restorasi gambut (2023)</td>
                  <td className="border border-gray-300 px-4 py-2">Portal KSP</td>
                </tr>
                <tr className="bg-blue-100">
                  <td className="border border-gray-300 px-4 py-2">15</td>
                  <td className="border border-gray-300 px-4 py-2">Reforestasi (2024)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-2">16</td>
                  <td className="border border-gray-300 px-4 py-2">Historis Banjir</td>
                  <td className="border border-gray-300 px-4 py-2">Olahan dari BNPB</td>
                </tr>
                <tr className="bg-blue-100">
                  <td className="border border-gray-300 px-4 py-2">17</td>
                  <td className="border border-gray-300 px-4 py-2">Historis Longsor</td>
                  <td className="border border-gray-300 px-4 py-2">Olahan dari BNPB</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-2">18</td>
                  <td className="border border-gray-300 px-4 py-2">DTA Danau (2020)</td>
                  <td className="border border-gray-300 px-4 py-2">Kementerian Kehutanan</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>© 2024 Pusat Pengembangan Mitigasi dan Adaptasi Bencana Hidrometeorologi Kehutanan</p>
          <p className="mt-1">Kementerian Kehutanan Republik Indonesia</p>
        </div>
      </div>
    </div>
  );
};

export default TentangKami;