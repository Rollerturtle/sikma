// server.js - Updated with new schema and Excel processing + REFERENCE_MAPPING
require('dotenv').config();

const PORT = process.env.PORT || 3001;
const express = require('express');
const { Client, Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
app.use(cors());
app.use(express.json());

let riskAnalysisCache = new Map();

// Setup for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const kejadianUpload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow images and Excel files only for kejadian form
    if (file.mimetype.startsWith('image/') || 
        file.mimetype === 'application/vnd.ms-excel' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only image and Excel files are allowed for kejadian reports'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const fileManagerUpload = multer({ 
  storage: storage,
  // Tidak ada fileFilter - izinkan semua tipe file
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// const dbConfig = {
//   host: 'localhost',
//   port: 5433,
//   database: 'gis_data',
//   user: 'postgres',
//   password: '12345678'
// };

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false,
};

const client = new Client(dbConfig);
const pool = new Pool(dbConfig);

async function resolveNameColumn(tableName) {
  const candidates = ['nama', 'provinsi', 'kab_kota', 'kecamatan', 'kelurahan', 'name', 'nama_das'];
  try {
    const q = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `;
    const cols = (await client.query(q, [tableName])).rows.map(r => r.column_name.toLowerCase());
    for (let cand of candidates) {
      if (cols.includes(cand)) return cand;
    }
    const fallback = cols.find(c => !['geom', 'geometry', 'gid', 'id', 'tahun_data'].includes(c));
    return fallback || 'nama';
  } catch (err) {
    console.error('resolveNameColumn error', err);
    return 'nama';
  }
}

// TAMBAHAN: Helper function untuk clear cache berdasarkan area yang terdampak
const invalidateRiskCache = (impactData) => {

  if (!impactData) return;
  const { disaster_type, provinsi, kabupaten, kecamatan, kelurahan, das } = impactData;
  // Clear semua cache yang mungkin terdampak
  const keysToDelete = [];
  for (let [cacheKey, cacheData] of riskAnalysisCache.entries()) {
    const keyParts = cacheKey.split('|');
    if (keyParts.length >= 3) {
      const cachedDisasterType = keyParts[0];
      const cachedLevel = keyParts[1];
      const cachedLocation = keyParts[2];
      // Hapus cache jika disaster type sama
      if (cachedDisasterType === disaster_type) {
        // Check berbagai level yang mungkin terdampak
        if (
          (cachedLevel === 'Provinsi' && cachedLocation === provinsi) ||
          (cachedLevel === 'Kabupaten/Kota' && cachedLocation === kabupaten) ||
          (cachedLevel === 'Kecamatan' && cachedLocation === kecamatan) ||
          (cachedLevel === 'DAS' && cachedLocation === das) ||
          // Atau jika provinsi/kabupaten parent sama (karena bisa mempengaruhi child areas)
          (cachedLevel === 'Kabupaten/Kota' && provinsi && cacheData.parentArea === provinsi) ||
          (cachedLevel === 'Kecamatan' && kabupaten && cacheData.parentArea === kabupaten)
        ) {
          keysToDelete.push(cacheKey);
        }
      }
    }
  }

  // Hapus cache yang terdampak
  keysToDelete.forEach(key => {
    riskAnalysisCache.delete(key);
    console.log(`Risk cache invalidated for key: ${key}`);
  });

  console.log(`Total ${keysToDelete.length} cache entries invalidated`);
};

// Function to create updated kejadian table
// const createKejadianTable = async () => {
//   const createTableSQL = `
//     CREATE TABLE IF NOT EXISTS kejadian (
//       id SERIAL PRIMARY KEY,
//       thumbnail_path VARCHAR(500),
//       images_paths TEXT[],
//       disaster_type VARCHAR(50) NOT NULL,
//       provinsi VARCHAR(100) NOT NULL,
//       kabupaten VARCHAR(100) NOT NULL,
//       kecamatan VARCHAR(100) NOT NULL,
//       kelurahan VARCHAR(100) NOT NULL,
//       das VARCHAR(100),
//       title VARCHAR(255) NOT NULL,
//       description TEXT NOT NULL,
//       incident_date DATE NOT NULL,
//       longitude DOUBLE PRECISION NOT NULL,
//       latitude DOUBLE PRECISION NOT NULL,
//       geom GEOMETRY(POINT, 4326),
      
//       -- Additional fields from Excel data
//       curah_hujan DECIMAL(10,2),
//       korban_meninggal INTEGER DEFAULT 0,
//       korban_luka_luka INTEGER DEFAULT 0,
//       korban_mengungsi INTEGER DEFAULT 0,
//       rumah_rusak_berat INTEGER DEFAULT 0,
//       rumah_rusak_sedang INTEGER DEFAULT 0,
//       rumah_rusak_ringan INTEGER DEFAULT 0,
//       rumah_rusak_terendam INTEGER DEFAULT 0,
//       infrastruktur_rusak_berat INTEGER DEFAULT 0,
//       infrastruktur_rusak_sedang INTEGER DEFAULT 0,
//       infrastruktur_rusak_ringan INTEGER DEFAULT 0,
//       dampak_kebakaran TEXT,
//       luas_lokasi_kejadian DECIMAL(15,2),
//       kejadian_ke INTEGER,
      
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     );

//     -- Create indexes
//     CREATE INDEX IF NOT EXISTS idx_kejadian_provinsi ON kejadian(provinsi);
//     CREATE INDEX IF NOT EXISTS idx_kejadian_kabupaten ON kejadian(kabupaten);
//     CREATE INDEX IF NOT EXISTS idx_kejadian_kecamatan ON kejadian(kecamatan);
//     CREATE INDEX IF NOT EXISTS idx_kejadian_kelurahan ON kejadian(kelurahan);
//     CREATE INDEX IF NOT EXISTS idx_kejadian_disaster_type ON kejadian(disaster_type);
//     CREATE INDEX IF NOT EXISTS idx_kejadian_incident_date ON kejadian(incident_date);
//     CREATE INDEX IF NOT EXISTS idx_kejadian_geom ON kejadian USING GIST(geom);

//     -- Create composite indexes for common filter combinations
//     CREATE INDEX IF NOT EXISTS idx_kejadian_filter_combo ON kejadian(provinsi, disaster_type);
//     CREATE INDEX IF NOT EXISTS idx_kejadian_date_province ON kejadian(incident_date DESC, provinsi);

//     -- Create trigger function for updating timestamp
//     CREATE OR REPLACE FUNCTION update_kejadian_timestamp()
//     RETURNS TRIGGER AS $$
//     BEGIN
//         NEW.updated_at = CURRENT_TIMESTAMP;
//         RETURN NEW;
//     END;
//     $$ LANGUAGE plpgsql;

//     -- Create trigger
//     DROP TRIGGER IF EXISTS trigger_update_kejadian_timestamp ON kejadian;
//     CREATE TRIGGER trigger_update_kejadian_timestamp
//         BEFORE UPDATE ON kejadian
//         FOR EACH ROW
//         EXECUTE FUNCTION update_kejadian_timestamp();
//   `;

//   try {
//     await client.query(createTableSQL);
//     console.log('Updated kejadian table created successfully');
//   } catch (error) {
//     console.error('Error creating kejadian table:', error);
//   }
// };

const createKejadianTable = async () => {
  const createTableSQL = `
    -- KEJADIAN TABLE (hapus field curah_hujan)
    CREATE TABLE IF NOT EXISTS kejadian (
      id SERIAL PRIMARY KEY,
      thumbnail_path VARCHAR(500),
      images_paths TEXT[],
      disaster_type VARCHAR(50) NOT NULL CHECK (disaster_type IN ('Banjir', 'Kebakaran', 'Longsor')),
      provinsi VARCHAR(100) NOT NULL,
      kabupaten VARCHAR(100) NOT NULL,
      kecamatan VARCHAR(100) NOT NULL,
      kelurahan VARCHAR(100) NOT NULL,
      das VARCHAR(100),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      incident_date DATE NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      geom GEOMETRY(POINT, 4326),
      
      -- Data Korban (dari sheet "Data Korban")
      korban_meninggal INTEGER DEFAULT 0,
      korban_luka_luka INTEGER DEFAULT 0,
      korban_mengungsi INTEGER DEFAULT 0,
      rumah_rusak_berat INTEGER DEFAULT 0,
      rumah_rusak_sedang INTEGER DEFAULT 0,
      rumah_rusak_ringan INTEGER DEFAULT 0,
      rumah_rusak_terendam INTEGER DEFAULT 0,
      infrastruktur_rusak_berat INTEGER DEFAULT 0,
      infrastruktur_rusak_sedang INTEGER DEFAULT 0,
      infrastruktur_rusak_ringan INTEGER DEFAULT 0,
      dampak_kebakaran TEXT,
      luas_lokasi_kejadian DECIMAL(15,2),
      kejadian_ke INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_kejadian_provinsi ON kejadian(provinsi);
    CREATE INDEX IF NOT EXISTS idx_kejadian_kabupaten ON kejadian(kabupaten);
    CREATE INDEX IF NOT EXISTS idx_kejadian_kecamatan ON kejadian(kecamatan);
    CREATE INDEX IF NOT EXISTS idx_kejadian_kelurahan ON kejadian(kelurahan);
    CREATE INDEX IF NOT EXISTS idx_kejadian_disaster_type ON kejadian(disaster_type);
    CREATE INDEX IF NOT EXISTS idx_kejadian_incident_date ON kejadian(incident_date);
    CREATE INDEX IF NOT EXISTS idx_kejadian_geom ON kejadian USING GIST(geom);

    -- CURAH HUJAN (tabel terpisah)
    CREATE TABLE IF NOT EXISTS curah_hujan (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      hari VARCHAR(20),
      jam TIME,
      curah_hujan DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_curah_hujan_kejadian ON curah_hujan(kejadian_id);

    -- TUTUPAN DAS
    CREATE TABLE IF NOT EXISTS tutupan_das (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      jenis_tutupan VARCHAR(50) NOT NULL,
      persentase DECIMAL(5,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_tutupan_das_kejadian ON tutupan_das(kejadian_id);

    -- KEMIRINGAN LAHAN
    CREATE TABLE IF NOT EXISTS kemiringan_lahan (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER UNIQUE NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      sangat_datar DECIMAL(10,2) DEFAULT 0,
      datar DECIMAL(10,2) DEFAULT 0,
      landai DECIMAL(10,2) DEFAULT 0,
      agak_curam DECIMAL(10,2) DEFAULT 0,
      curam DECIMAL(10,2) DEFAULT 0,
      sangat_curam DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_kemiringan_lahan_kejadian ON kemiringan_lahan(kejadian_id);

    -- KEPADATAN PEMUKIMAN
    CREATE TABLE IF NOT EXISTS kepadatan_pemukiman (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      kel_desa VARCHAR(100) NOT NULL,
      jumlah_kk INTEGER NOT NULL DEFAULT 0,
      jumlah_jiwa INTEGER NOT NULL DEFAULT 0,
      kepadatan DECIMAL(10,2),
      klasifikasi VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_kepadatan_pemukiman_kejadian ON kepadatan_pemukiman(kejadian_id);

    -- STATUS DAS BANJIR
    CREATE TABLE IF NOT EXISTS status_das_banjir (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      nama_das VARCHAR(100) NOT NULL,
      luas DECIMAL(10,2),
      tutupan_vegetasi VARCHAR(10),
      sedimentasi VARCHAR(50),
      status_kekritisan VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_status_das_banjir_kejadian ON status_das_banjir(kejadian_id);

    -- STATUS DAS KEBAKARAN
    CREATE TABLE IF NOT EXISTS status_das_kebakaran (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      nama_das VARCHAR(100) NOT NULL,
      luas DECIMAL(10,2),
      tutupan_vegetasi VARCHAR(10),
      status VARCHAR(50),
      tingkat_risiko VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_status_das_kebakaran_kejadian ON status_das_kebakaran(kejadian_id);

    -- KEMIRINGAN LERENG
    CREATE TABLE IF NOT EXISTS kemiringan_lereng (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      segmen VARCHAR(50) NOT NULL,
      kemiringan VARCHAR(20) NOT NULL,
      luas DECIMAL(10,2),
      tinggi_lereng DECIMAL(10,2),
      klasifikasi_bahaya VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_kemiringan_lereng_kejadian ON kemiringan_lereng(kejadian_id);

    -- TOPOGRAFI
    CREATE TABLE IF NOT EXISTS topografi (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      area VARCHAR(50) NOT NULL,
      ketinggian VARCHAR(50),
      bentuk_lahan VARCHAR(50),
      kelerengan VARCHAR(50),
      potensi_longsor VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_topografi_kejadian ON topografi(kejadian_id);

    -- GEOLOGI
    CREATE TABLE IF NOT EXISTS geologi (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      parameter VARCHAR(100) NOT NULL,
      deskripsi TEXT,
      klasifikasi VARCHAR(100),
      pengaruh_terhadap_longsor VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_geologi_kejadian ON geologi(kejadian_id);

    -- JENIS TANAH
    CREATE TABLE IF NOT EXISTS jenis_tanah (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      jenis_tanah VARCHAR(50) NOT NULL,
      persentase DECIMAL(5,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_jenis_tanah_kejadian ON jenis_tanah(kejadian_id);

    -- PATAHAN
    CREATE TABLE IF NOT EXISTS patahan (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      nama_patahan VARCHAR(100) NOT NULL,
      jarak VARCHAR(20),
      status VARCHAR(50),
      tingkat_aktivitas VARCHAR(50),
      risiko VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_patahan_kejadian ON patahan(kejadian_id);

    -- TUTUPAN LAHAN
    CREATE TABLE IF NOT EXISTS tutupan_lahan (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      jenis_tutupan VARCHAR(50) NOT NULL,
      persentase DECIMAL(5,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_tutupan_lahan_kejadian ON tutupan_lahan(kejadian_id);

    -- INFRASTRUKTUR
    CREATE TABLE IF NOT EXISTS infrastruktur (
      id SERIAL PRIMARY KEY,
      kejadian_id INTEGER NOT NULL REFERENCES kejadian(id) ON DELETE CASCADE,
      jenis_infrastruktur VARCHAR(100) NOT NULL,
      lokasi VARCHAR(200) NOT NULL,
      jarak VARCHAR(20),
      status VARCHAR(100),
      tingkat_risiko VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_infrastruktur_kejadian ON infrastruktur(kejadian_id);

    -- TRIGGER
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS update_kejadian_updated_at ON kejadian;
    CREATE TRIGGER update_kejadian_updated_at
        BEFORE UPDATE ON kejadian
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await client.query(createTableSQL);
    console.log('✅ All tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
};

const createFileTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS file (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(500) UNIQUE NOT NULL, -- Nama file unik yang disimpan
      original_name VARCHAR(500) NOT NULL,   -- Nama file asli saat diupload
      filepath VARCHAR(1000) NOT NULL,       -- Path relatif dari file (e.g., /uploads/filename.ext)
      mimetype VARCHAR(100),                 -- Tipe MIME file
      size BIGINT,                           -- Ukuran file dalam bytes
      upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Tanggal upload
      -- Tidak ada kolom associated_report_id karena ini hanya untuk File Manager
    );

    -- Index untuk performa pencarian dan penghapusan
    CREATE INDEX IF NOT EXISTS idx_file_filename ON file(filename);
  `;
  try {
    await client.query(createTableSQL);
    console.log('File table created or already exists.');
  } catch (error) {
    console.error('Error creating file table:', error);
  }
};

const createMitigasiTables = async () => {
  const createRekomendasiSQL = `
    CREATE TABLE IF NOT EXISTS rekomendasi_mitigasi_adaptasi (
      id SERIAL PRIMARY KEY,
      provinsi VARCHAR(100),
      kabupaten VARCHAR(100),
      kecamatan VARCHAR(100),
      das VARCHAR(100),
      sub_das VARCHAR(100),
      banjir VARCHAR(10),
      longsor VARCHAR(10),
      kebakaran_hutan VARCHAR(10),
      kerawanan VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Tambahkan ini
    );

    -- Index untuk performa query
    CREATE INDEX IF NOT EXISTS idx_rekomendasi_provinsi ON rekomendasi_mitigasi_adaptasi(provinsi);
    CREATE INDEX IF NOT EXISTS idx_rekomendasi_kabupaten ON rekomendasi_mitigasi_adaptasi(kabupaten);
  `;

  const createKegiatanSQL = `
    CREATE TABLE IF NOT EXISTS kegiatan_mitigasi (
      id SERIAL PRIMARY KEY,
      rekomendasi_id INTEGER UNIQUE NOT NULL,  -- Tambahkan UNIQUE constraint
      metode TEXT,
      analisis TEXT,
      monev TEXT,
      dokumen_terkait TEXT,  -- Ubah jadi TEXT (untuk JSON string)
      foto_dokumentasi TEXT,  -- Ubah jadi TEXT (untuk JSON string)
      peta_awal VARCHAR(500),
      peta_setelah VARCHAR(500),
      peta_kerentanan VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Tambahkan ini
      CONSTRAINT fk_rekomendasi
        FOREIGN KEY (rekomendasi_id) 
        REFERENCES rekomendasi_mitigasi_adaptasi(id) 
        ON DELETE CASCADE
    );

    -- Index untuk performa
    CREATE INDEX IF NOT EXISTS idx_kegiatan_rekomendasi ON kegiatan_mitigasi(rekomendasi_id);

    -- Trigger untuk auto-update updated_at
    CREATE OR REPLACE FUNCTION update_kegiatan_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_kegiatan_timestamp ON kegiatan_mitigasi;
    CREATE TRIGGER trigger_update_kegiatan_timestamp
        BEFORE UPDATE ON kegiatan_mitigasi
        FOR EACH ROW
        EXECUTE FUNCTION update_kegiatan_timestamp();

    -- Trigger untuk rekomendasi
    CREATE OR REPLACE FUNCTION update_rekomendasi_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_rekomendasi_timestamp ON rekomendasi_mitigasi_adaptasi;
    CREATE TRIGGER trigger_update_rekomendasi_timestamp
        BEFORE UPDATE ON rekomendasi_mitigasi_adaptasi
        FOR EACH ROW
        EXECUTE FUNCTION update_rekomendasi_timestamp();
  `;

  try {
    await client.query(createRekomendasiSQL);
    console.log('Table rekomendasi_mitigasi_adaptasi created successfully');
    
    await client.query(createKegiatanSQL);
    console.log('Table kegiatan_mitigasi created successfully');
  } catch (error) {
    console.error('Error creating mitigasi tables:', error);
  }
};

// Connect to database and create table
client.connect()
  .then(async () => {
    console.log('Connected to PostgreSQL');
    await createKejadianTable();
    await createFileTable();
    await createMitigasiTables();
  })
  .catch(err => console.error('Connection error:', err));


  function processExcelFile(filePath, disasterType) {
  const workbook = XLSX.readFile(filePath);
  const result = {};

  try {
    // Process Data Korban (sama untuk semua bencana)
    result.data_korban = processSheet_DataKorban(workbook);

    // Process berdasarkan jenis bencana
    if (disasterType === 'Banjir') {
      result.curah_hujan = processSheet_CurahHujan_Banjir(workbook);
      result.status_das = processSheet_StatusDAS_Banjir(workbook);
      result.tutupan_das = processSheet_TutupanDas(workbook);
      result.kemiringan_lahan = processSheet_KemiringanLahan(workbook);
      result.kepadatan_pemukiman = processSheet_KepadatanPemukiman(workbook);
    } 
    else if (disasterType === 'Kebakaran') {
      result.status_das = processSheet_StatusDAS_Kebakaran(workbook);
      result.tutupan_das = processSheet_TutupanDas(workbook);
      result.kemiringan_lahan = processSheet_KemiringanLahan(workbook);
      result.kepadatan_pemukiman = processSheet_KepadatanPemukiman(workbook);
    } 
    else if (disasterType === 'Longsor') {
      result.curah_hujan = processSheet_CurahHujan_Longsor(workbook);
      result.kemiringan_lereng = processSheet_KemiringanLereng(workbook);
      result.topografi = processSheet_Topografi(workbook);
      result.geologi = processSheet_Geologi(workbook);
      result.jenis_tanah = processSheet_JenisTanah(workbook);
      result.patahan = processSheet_Patahan(workbook);
      result.tutupan_lahan = processSheet_TutupanLahan(workbook);
      result.infrastruktur = processSheet_Infrastruktur(workbook);
      result.kepadatan_pemukiman = processSheet_KepadatanPemukiman(workbook);
    }
  } catch (error) {
    console.error('Error processing Excel file:', error);
  }

  return result;
}

// Process Data Korban (sama untuk semua bencana)
function processSheet_DataKorban(workbook) {
  const sheetName = 'Data Korban';
  if (!workbook.SheetNames.includes(sheetName)) return null;
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  if (data.length === 0) return null;
  
  const row = data[0];
  return {
    korban_meninggal: parseInt(row['Korban Meninggal']) || 0,
    korban_luka_luka: parseInt(row['Korban Luka-luka']) || 0,
    korban_mengungsi: parseInt(row['Korban Mengungsi']) || 0,
    rumah_rusak_berat: parseInt(row['Rumah Rusak Berat']) || 0,
    rumah_rusak_sedang: parseInt(row['Rumah Rusak Sedang']) || 0,
    rumah_rusak_ringan: parseInt(row['Rumah Rusak Ringan']) || 0,
    rumah_rusak_terendam: parseInt(row['Rumah Terendam']) || 0,
    infrastruktur_rusak_berat: parseInt(row['Infrastruktur Rusak Berat']) || 0,
    infrastruktur_rusak_sedang: parseInt(row['Infrastruktur Rusak Sedang']) || 0,
    infrastruktur_rusak_ringan: parseInt(row['Infrastruktur Rusak Ringan']) || 0,
    dampak_kebakaran: row['Dampak Kebakaran'] || '',
    luas_lokasi_kejadian: parseFloat(row['Luas Lokasi Kejadian']) || 0,
    kejadian_ke: parseInt(row['Kejadian Ke']) || 0
  };
}

// Process Curah Hujan untuk Banjir (per jam)
function processSheet_CurahHujan_Banjir(workbook) {
  const sheetName = 'Curah Hujan';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    hari: row['Hari'] || null,
    jam: row['Jam'] || null,
    curah_hujan: parseFloat(String(row['Curah Hujan']).replace(',', '.')) || 0
  }));
}

// Process Curah Hujan untuk Longsor (30 hari)
function processSheet_CurahHujan_Longsor(workbook) {
  const sheetName = 'Curah Hujan';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => {
    // Extract number from "Hari 1", "Hari 2", etc.
    let hariNumber = null;
    if (row['Hari']) {
      const match = row['Hari'].toString().match(/\d+/);
      if (match) {
        hariNumber = parseInt(match[0]);
      }
    }
    
    return {
      hari: hariNumber ? `Hari ${hariNumber}` : row['Hari'], // Keep format "Hari 1"
      jam: null, // Longsor tidak pakai jam
      curah_hujan: parseFloat(String(row['Curah Hujan']).replace(',', '.')) || 0
    };
  });
}

// Process Status DAS Banjir
function processSheet_StatusDAS_Banjir(workbook) {
  const sheetName = 'Status DAS';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    nama_das: row['Nama DAS'] || '',
    luas: parseFloat(row['Luas (km²)']) || 0,
    tutupan_vegetasi: row['Tutupan Vegetasi'] || '',
    sedimentasi: row['Sedimentasi'] || '',
    status_kekritisan: row['Status Kekritisan'] || ''
  }));
}

// Process Status DAS Kebakaran
function processSheet_StatusDAS_Kebakaran(workbook) {
  const sheetName = 'Status DAS';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    nama_das: row['Nama DAS'] || '',
    luas: parseFloat(row['Luas (Ha)']) || 0,
    tutupan_vegetasi: row['Tutupan Vegetasi'] || '',
    status: row['Status'] || '',
    tingkat_risiko: row['Tingkat Risiko'] || ''
  }));
}

// Process Tutupan DAS
function processSheet_TutupanDas(workbook) {
  const sheetName = 'Tutupan DAS';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    jenis_tutupan: row['Jenis Tutupan'] || '',
    persentase: parseFloat(row['Persentase']) || 0
  }));
}

// Process Kemiringan Lahan
function processSheet_KemiringanLahan(workbook) {
  const sheetName = 'Kemiringan Lahan';
  if (!workbook.SheetNames.includes(sheetName)) return null;
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  if (data.length === 0) return null;
  
  const row = data[0];
  
  // Try different header formats
  return {
    sangat_datar: parseFloat(row['0-2° Sangat Datar (ha)'] || row['0-8° Sangat Datar (Ha)'] || 0),
    datar: parseFloat(row['2-8° Datar (ha)'] || row['0-8° Datar (Ha)'] || 0),
    landai: parseFloat(row['8-15° Landai (ha)'] || row['8-15° Landai (Ha)'] || 0),
    agak_curam: parseFloat(row['15-25° Agak Curam (ha)'] || row['15-25° Agak Curam (Ha)'] || 0),
    curam: parseFloat(row['>25° Curam (ha)'] || row['25-40° Curam (Ha)'] || 0),
    sangat_curam: parseFloat(row['>25° Sangat Curam (ha)'] || row['>40° Sangat Curam (Ha)'] || 0)
  };
}

// Process Kepadatan Pemukiman
function processSheet_KepadatanPemukiman(workbook) {
  const sheetName = 'Kepadatan Pemukiman';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    kel_desa: row['Kelurahan/Desa'] || '',
    jumlah_kk: parseInt(row['Jumlah KK']) || 0,
    jumlah_jiwa: parseInt(row['Jumlah Jiwa']) || 0,
    kepadatan: parseFloat(row['Kepadatan (jiwa/km²)']) || 0,
    klasifikasi: row['Klasifikasi'] || ''
  }));
}

// Process Kemiringan Lereng (Longsor)
function processSheet_KemiringanLereng(workbook) {
  const sheetName = 'Kemiringan Lereng';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    segmen: row['Segmen'] || '',
    kemiringan: row['Kemiringan'] || '',
    luas: parseFloat(row['Luas (Ha)']) || 0,
    tinggi_lereng: parseFloat(row['Tinggi Lereng (m)']) || 0,
    klasifikasi_bahaya: row['Klasifikasi Bahaya'] || ''
  }));
}

// Process Topografi
function processSheet_Topografi(workbook) {
  const sheetName = 'Topografi';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    area: row['Area'] || '',
    ketinggian: row['Ketinggian (mdpl)'] || '',
    bentuk_lahan: row['Bentuk Lahan'] || '',
    kelerengan: row['Kelerengan'] || '',
    potensi_longsor: row['Potensi Longsor'] || ''
  }));
}

// Process Geologi
function processSheet_Geologi(workbook) {
  const sheetName = 'Geologi';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    parameter: row['Parameter'] || '',
    deskripsi: row['Deskripsi'] || '',
    klasifikasi: row['Klasifikasi'] || '',
    pengaruh_terhadap_longsor: row['Pengaruh terhadap Longsor'] || ''
  }));
}

// Process Jenis Tanah
function processSheet_JenisTanah(workbook) {
  const sheetName = 'Jenis Tanah';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    jenis_tanah: row['Jenis Tanah'] || '',
    persentase: parseFloat(row['Persentase']) || 0
  }));
}

// Process Patahan
function processSheet_Patahan(workbook) {
  const sheetName = 'Patahan';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    nama_patahan: row['Nama Patahan'] || '',
    jarak: row['Jarak dari Lokasi (km)'] || '',
    status: row['Status'] || '',
    tingkat_aktivitas: row['Tingkat Aktivitas'] || '',
    risiko: row['Risiko'] || ''
  }));
}

// Process Tutupan Lahan
function processSheet_TutupanLahan(workbook) {
  const sheetName = 'Tutupan Lahan';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    jenis_tutupan: row['Jenis Tutupan'] || '',
    persentase: parseFloat(row['Persentase']) || 0
  }));
}

// Process Infrastruktur
function processSheet_Infrastruktur(workbook) {
  const sheetName = 'Infrastruktur';
  if (!workbook.SheetNames.includes(sheetName)) return [];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    jenis_infrastruktur: row['Jenis Infrastruktur'] || '',
    lokasi: row['Nama/Lokasi'] || '',
    jarak: row['Jarak dari Longsor'] || '',
    status: row['Status'] || '',
    tingkat_risiko: row['Tingkat Risiko'] || ''
  }));
}

async function insertCurahHujan(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO curah_hujan (kejadian_id, hari, jam, curah_hujan) VALUES ($1, $2, $3, $4)`,
      [kejadianId, row.hari, row.jam, row.curah_hujan]
    );
  }
}

async function insertStatusDasBanjir(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO status_das_banjir (kejadian_id, nama_das, luas, tutupan_vegetasi, sedimentasi, status_kekritisan) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [kejadianId, row.nama_das, row.luas, row.tutupan_vegetasi, row.sedimentasi, row.status_kekritisan]
    );
  }
}

async function insertStatusDasKebakaran(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO status_das_kebakaran (kejadian_id, nama_das, luas, tutupan_vegetasi, status, tingkat_risiko) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [kejadianId, row.nama_das, row.luas, row.tutupan_vegetasi, row.status, row.tingkat_risiko]
    );
  }
}

async function insertTutupanDas(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO tutupan_das (kejadian_id, jenis_tutupan, persentase) VALUES ($1, $2, $3)`,
      [kejadianId, row.jenis_tutupan, row.persentase]
    );
  }
}

async function insertKemiringanLahan(client, kejadianId, data) {
  if (!data) return;
  await client.query(
    `INSERT INTO kemiringan_lahan (kejadian_id, sangat_datar, datar, landai, agak_curam, curam, sangat_curam) 
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [kejadianId, data.sangat_datar, data.datar, data.landai, data.agak_curam, data.curam, data.sangat_curam]
  );
}

async function insertKepadatanPemukiman(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO kepadatan_pemukiman (kejadian_id, kel_desa, jumlah_kk, jumlah_jiwa, kepadatan, klasifikasi) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [kejadianId, row.kel_desa, row.jumlah_kk, row.jumlah_jiwa, row.kepadatan, row.klasifikasi]
    );
  }
}

async function insertKemiringanLereng(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO kemiringan_lereng (kejadian_id, segmen, kemiringan, luas, tinggi_lereng, klasifikasi_bahaya) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [kejadianId, row.segmen, row.kemiringan, row.luas, row.tinggi_lereng, row.klasifikasi_bahaya]
    );
  }
}

async function insertTopografi(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO topografi (kejadian_id, area, ketinggian, bentuk_lahan, kelerengan, potensi_longsor) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [kejadianId, row.area, row.ketinggian, row.bentuk_lahan, row.kelerengan, row.potensi_longsor]
    );
  }
}

async function insertGeologi(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO geologi (kejadian_id, parameter, deskripsi, klasifikasi, pengaruh_terhadap_longsor) 
       VALUES ($1, $2, $3, $4, $5)`,
      [kejadianId, row.parameter, row.deskripsi, row.klasifikasi, row.pengaruh_terhadap_longsor]
    );
  }
}

async function insertJenisTanah(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO jenis_tanah (kejadian_id, jenis_tanah, persentase) VALUES ($1, $2, $3)`,
      [kejadianId, row.jenis_tanah, row.persentase]
    );
  }
}

async function insertPatahan(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO patahan (kejadian_id, nama_patahan, jarak, status, tingkat_aktivitas, risiko) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [kejadianId, row.nama_patahan, row.jarak, row.status, row.tingkat_aktivitas, row.risiko]
    );
  }
}

async function insertTutupanLahan(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO tutupan_lahan (kejadian_id, jenis_tutupan, persentase) VALUES ($1, $2, $3)`,
      [kejadianId, row.jenis_tutupan, row.persentase]
    );
  }
}

async function insertInfrastruktur(client, kejadianId, data) {
  for (const row of data) {
    await client.query(
      `INSERT INTO infrastruktur (kejadian_id, jenis_infrastruktur, lokasi, jarak, status, tingkat_risiko) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [kejadianId, row.jenis_infrastruktur, row.lokasi, row.jarak, row.status, row.tingkat_risiko]
    );
  }
}

// Aggregate Curah Hujan
async function aggregateCurahHujan(kejadianIds, perJam = true) {
  if (kejadianIds.length === 0) return [];

  const query = `
    SELECT hari, jam, curah_hujan 
    FROM curah_hujan 
    WHERE kejadian_id = ANY($1)
    ${perJam ? 'AND jam IS NOT NULL' : 'AND jam IS NULL'}
    ORDER BY hari, jam
  `;
  
  const result = await client.query(query, [kejadianIds]);
  const data = result.rows;

  // Group by hari and jam
  const grouped = {};
  
  data.forEach(row => {
    const key = perJam ? `${row.hari}_${row.jam}` : row.hari;
    
    if (!grouped[key]) {
      grouped[key] = {
        hari: row.hari,
        jam: row.jam,
        values: [],
        count: 0
      };
    }
    
    grouped[key].values.push(parseFloat(row.curah_hujan));
    grouped[key].count++;
  });

  // Calculate average for same hari/jam
  const aggregated = Object.values(grouped).map(group => ({
    hari: group.hari,
    jam: group.jam,
    curah_hujan: (group.values.reduce((a, b) => a + b, 0) / group.count).toFixed(2)
  }));

  return aggregated;
}

// Aggregate Status DAS (append all)
async function aggregateStatusDas(kejadianIds, tableName) {
  if (kejadianIds.length === 0) return [];

  const query = `SELECT * FROM ${tableName} WHERE kejadian_id = ANY($1)`;
  const result = await client.query(query, [kejadianIds]);
  
  return result.rows;
}

// Aggregate Tutupan (DAS/Lahan) - percentage based
async function aggregateTutupan(kejadianIds, tableName) {
  if (kejadianIds.length === 0) return [];

  const columnName = tableName === 'tutupan_das' ? 'jenis_tutupan' : 
                     tableName === 'tutupan_lahan' ? 'jenis_tutupan' : 'jenis_tanah';

  const query = `
    SELECT ${columnName}, persentase, kejadian_id
    FROM ${tableName} 
    WHERE kejadian_id = ANY($1)
  `;
  
  const result = await client.query(query, [kejadianIds]);
  const data = result.rows;

  // Group by jenis
  const grouped = {};
  
  data.forEach(row => {
    const jenis = row[columnName];
    
    if (!grouped[jenis]) {
      grouped[jenis] = {
        values: [],
        kejadian_ids: new Set()
      };
    }
    
    grouped[jenis].values.push(parseFloat(row.persentase));
    grouped[jenis].kejadian_ids.add(row.kejadian_id);
  });

  // Calculate weighted average and normalize to 100%
  let aggregated = Object.keys(grouped).map(jenis => ({
    [columnName]: jenis,
    persentase: grouped[jenis].values.reduce((a, b) => a + b, 0) / grouped[jenis].kejadian_ids.size
  }));

  // Normalize to 100%
  const total = aggregated.reduce((sum, item) => sum + item.persentase, 0);
  
  if (total > 0) {
    aggregated = aggregated.map(item => ({
      ...item,
      persentase: ((item.persentase / total) * 100).toFixed(2)
    }));
  }

  return aggregated;
}

// Aggregate Kemiringan Lahan
async function aggregateKemiringanLahan(kejadianIds) {
  if (kejadianIds.length === 0) return null;

  const query = `SELECT * FROM kemiringan_lahan WHERE kejadian_id = ANY($1)`;
  const result = await client.query(query, [kejadianIds]);
  const data = result.rows;

  if (data.length === 0) return null;

  // Sum all values
  const aggregated = {
    sangat_datar: 0,
    datar: 0,
    landai: 0,
    agak_curam: 0,
    curam: 0,
    sangat_curam: 0
  };

  data.forEach(row => {
    aggregated.sangat_datar += parseFloat(row.sangat_datar) || 0;
    aggregated.datar += parseFloat(row.datar) || 0;
    aggregated.landai += parseFloat(row.landai) || 0;
    aggregated.agak_curam += parseFloat(row.agak_curam) || 0;
    aggregated.curam += parseFloat(row.curam) || 0;
    aggregated.sangat_curam += parseFloat(row.sangat_curam) || 0;
  });

  return aggregated;
}

// Aggregate Tables (append all rows)
async function aggregateTable(kejadianIds, tableName) {
  if (kejadianIds.length === 0) return [];

  const query = `SELECT * FROM ${tableName} WHERE kejadian_id = ANY($1)`;
  const result = await client.query(query, [kejadianIds]);
  
  return result.rows;
}

// Aggregate Banjir Data
async function aggregateBanjirData(kejadianIds) {
  return {
    curah_hujan: await aggregateCurahHujan(kejadianIds, true),
    status_das: await aggregateStatusDas(kejadianIds, 'status_das_banjir'),
    tutupan_das: await aggregateTutupan(kejadianIds, 'tutupan_das'),
    kemiringan_lahan: await aggregateKemiringanLahan(kejadianIds),
    kepadatan_pemukiman: await aggregateTable(kejadianIds, 'kepadatan_pemukiman')
  };
}

// Aggregate Kebakaran Data
async function aggregateKebakaranData(kejadianIds) {
  return {
    status_das: await aggregateStatusDas(kejadianIds, 'status_das_kebakaran'),
    tutupan_das: await aggregateTutupan(kejadianIds, 'tutupan_das'),
    kemiringan_lahan: await aggregateKemiringanLahan(kejadianIds),
    kepadatan_pemukiman: await aggregateTable(kejadianIds, 'kepadatan_pemukiman')
  };
}

// Aggregate Longsor Data
async function aggregateLongsorData(kejadianIds) {
  return {
    curah_hujan: await aggregateCurahHujan(kejadianIds, false),
    kemiringan_lereng: await aggregateTable(kejadianIds, 'kemiringan_lereng'),
    topografi: await aggregateTable(kejadianIds, 'topografi'),
    geologi: await aggregateTable(kejadianIds, 'geologi'),
    jenis_tanah: await aggregateTutupan(kejadianIds, 'jenis_tanah'),
    patahan: await aggregateTable(kejadianIds, 'patahan'),
    tutupan_lahan: await aggregateTutupan(kejadianIds, 'tutupan_lahan'),
    infrastruktur: await aggregateTable(kejadianIds, 'infrastruktur'),
    kepadatan_pemukiman: await aggregateTable(kejadianIds, 'kepadatan_pemukiman')
  };
}


// Hardcoded reference mapping dengan contoh data
const REFERENCE_MAPPING = {
  // lahan_kritis: bpdas column
  lahan_kritis: {
      das_to_bpdas: {
          'BENGAWAN SOLO': 'Solo',
          'BEH': 'Dodokan Moyosari',
          'DAS BEH': 'Dodokan Moyosari',
          'DAS JANGKA': 'Dodokan Moyosari',
          'DAS KAMBU': 'Dodokan Moyosari',
          'DAS NAE 1': 'Dodokan Moyosari',
          'DAS NAE 2': 'Dodokan Moyosari',
          'NAE': 'Dodokan Moyosari',
          'DAS MOYO': 'Dodokan Moyosari',
          'DAS PALAPARADO': 'Dodokan Moyosari',
          'DAS REA': 'Dodokan Moyosari',
          'REA': 'Dodokan Moyosari',
          'DAS GILI RHEE': 'Dodokan Moyosari',
          'DAS TULA': 'Dodokan Moyosari',
          'DAS UTAN': 'Dodokan Moyosari',
          'DAS SUMBAWA': 'Dodokan Moyosari',
          'UNDA': 'Unda Anyar',
          'AYUNG': 'Unda Anyar',
          'RAWA PENET': 'Unda Anyar',
          'YEH PENET': 'Unda Anyar',
          'SABA': 'Unda Anyar',
          'BALIAN': 'Unda Anyar',
          'DAYA': 'Unda Anyar',
          'DAYA 1': 'Unda Anyar',
          'DAYA 2': 'Unda Anyar',
          'DAS BARU': 'Brantas Sampean',
          'BARU': 'Brantas Sampean',
          'BARU KECIL': 'Brantas Sampean',
          'BONDOYUDO': 'Brantas Sampean',
          'SAMPEAN': 'Brantas Sampean',
          'MAYANG': 'Brantas Sampean',
          'BRANTAS': 'Brantas Sampean',
          'CIMANUK': 'Cimanuk Citanduy',
          'CIMANUK KECIL': 'Cimanuk Citanduy',
          'CISANGGARUNG': 'Cimanuk Citanduy',
          'CITANDUY': 'Cimanuk Citanduy',
          'CIWULAN': 'Cimanuk Citanduy',
          'CIKANDANG': 'Cimanuk Citanduy',
          'CIKAENGAN': 'Cimanuk Citanduy',
          'CIMEDANG': 'Cimanuk Citanduy',
          'CILAKI': 'Citarum Ciliwung',
          'PEMALI': 'Pemali Jratun',
          'COMAL': 'Pemali Jratun',
          'BODRI': 'Pemali Jratun',
          'TUNTANG': 'Pemali Jratun',
          'SERANG': 'Pemali Jratun',
          'SERANG 2': 'Pemali Jratun',
          'JUWATA': 'Pemali Jratun',
          'BOGOWONTO': 'Serayu Opak Progo',
          'SERAYU': 'Serayu Opak Progo',
          'PROGO': 'Serayu Opak Progo',
          'OPAK': 'Serayu Opak Progo',
          'OYO': 'Serayu Opak Progo',
          'SERUYAN': 'Kahayan',
          'KAHAYAN': 'Kahayan',
          'KATINGAN': 'Kahayan',
          'MENTAYA': 'Kahayan',
          'JELAI': 'Kahayan',
          'KOTAWARINGIN PULAU': 'Kahayan',
          'KOTAWARINGIN': 'Kahayan',
          'BARITO': 'Barito',
          'SEBUKU': 'Mahakam Berau',
          'SEBUKU BESAR': 'Mahakam Berau',
          'SEBUKU KECIL': 'Mahakam Berau',
          'SEBUKU SELATAN': 'Mahakam Berau',
          'SEBAKUNG': 'Mahakam Berau',
          'SESAYAP': 'Mahakam Berau',
          'KAYAN': 'Mahakam Berau',
          'BERAU': 'Mahakam Berau',
          'MAHAKAM': 'Mahakam Berau',
          'KAPUAS - MURUNG PULAU': 'Kapuas',
          'KAPUAS': 'Kapuas',
          'PM KAPUAS DABUNG': 'Kapuas',
          'KAPUAS - MURUNG': 'Kapuas',
      },
      provinsi_to_bpdas: {
          'Jawa Tengah': ['Solo', 'Cimanuk Citanduy', 'Pemali Jratun', 'Serayu Opak Progo'],
          'Jawa Timur': ['Solo', 'Brantas Sampean'],
          'Nusa Tenggara Barat': 'Dodokan Moyosari',
          'Bali': 'Unda Anyar',
          'Jawa Barat': ['Cimanuk Citanduy', 'Citarum Ciliwung'],
          'Banten': 'Citarum Ciliwung',
          'DKI Jakarta': 'Citarum Ciliwung',
          'Daerah Istimewa Yogyakarta': 'Serayu Opak Progo',
          'Kalimantan Tengah': ['Kahayan', 'Barito'],
          'Kalimantan Selatan': ['Kahayan', 'Barito'],
          'Kalimantan Barat': ['Kahayan', 'Kapuas'],
          'Kalimantan Timur': 'Mahakam Berau',
          'Kalimantan Utara': 'Mahakam Berau',
      }
  },
  
  // penutupan_lahan_2024: kode_prov column
  penutupan_lahan_2024: {
    das_to_kode_prov: {
        'BENGAWAN SOLO': ['33', '35'],
        'BEH': '52',
        'DAS BEH': '52',
        'DAS JANGKA': '52',
        'DAS KAMBU': '52',
        'DAS NAE 1': '52',
        'DAS NAE 2': '52',
        'NAE': '52',
        'DAS MOYO': '52',
        'DAS PALAPARADO': '52',
        'DAS REA': '52',
        'REA': '52',
        'DAS GILI RHEE': '52',
        'DAS TULA': '52',
        'DAS UTAN': '52',
        'DAS SUMBAWA': '52',
        'UNDA': '51',
        'AYUNG': '51',
        'RAWA PENET': '51',
        'YEH PENET': '51',
        'SABA': '51',
        'BALIAN': '51',
        'DAYA': '51',
        'DAYA 1': '51',
        'DAYA 2': '51',
        'DAS BARU': '35',
        'BARU': '35',
        'BARU KECIL': '35',
        'BONDOYUDO': '35',
        'SAMPEAN': '35',
        'MAYANG': '35',
        'BRANTAS': '35',
        'CIMANUK': ['33', '32'],
        'CIMANUK KECIL': ['33', '32'],
        'CISANGGARUNG': ['33', '32'],
        'CITANDUY': ['33', '32'],
        'CIWULAN': ['33', '32'],
        'CIKANDANG': ['33', '32'],
        'CIKAENGAN': ['33', '32'],
        'CIMEDANG': ['33', '32'],
        'CILAKI': ['32', '36', '31'],
        'PEMALI': '33',
        'COMAL': '33',
        'BODRI': '33',
        'TUNTANG': '33',
        'SERANG': '33',
        'SERANG 2': '33',
        'JUWATA': '33',
        'BOGOWONTO': ['33', '34'],
        'SERAYU': ['33', '34'],
        'PROGO': ['33', '34'],
        'OPAK': ['33', '34'],
        'OYO': ['33', '34'],
        'SERUYAN': ['62', '63', '61'],
        'KAHAYAN': ['62', '63', '61'],
        'KATINGAN': ['62', '63', '61'],
        'MENTAYA': ['62', '63', '61'],
        'JELAI': ['62', '63', '61'],
        'KOTAWARINGIN PULAU': ['62', '63', '61'],
        'KOTAWARINGIN': ['62', '63', '61'],
        'BARITO': ['63', '62'],
        'SEBUKU': ['64', '65'],
        'SEBUKU BESAR': ['64', '65'],
        'SEBUKU KECIL': ['64', '65'],
        'SEBUKU SELATAN': ['64', '65'],
        'SEBAKUNG': ['64', '65'],
        'SESAYAP': ['64', '65'],
        'KAYAN': ['64', '65'],
        'BERAU': ['64', '65'],
        'MAHAKAM': ['64', '65'],
        'KAPUAS - MURUNG PULAU': '61',
        'KAPUAS': '61',
        'PM KAPUAS DABUNG': '61',
        'KAPUAS - MURUNG': '61',
    }
  },
  
  // rawan_erosi: n_bpdas column
  rawan_erosi: {
      das_to_n_bpdas: {
          'BENGAWAN SOLO': 'Solo',
          'BEH': 'Dodokan Moyosari',
          'DAS BEH': 'Dodokan Moyosari',
          'DAS JANGKA': 'Dodokan Moyosari',
          'DAS KAMBU': 'Dodokan Moyosari',
          'DAS NAE 1': 'Dodokan Moyosari',
          'DAS NAE 2': 'Dodokan Moyosari',
          'NAE': 'Dodokan Moyosari',
          'DAS MOYO': 'Dodokan Moyosari',
          'DAS PALAPARADO': 'Dodokan Moyosari',
          'DAS REA': 'Dodokan Moyosari',
          'REA': 'Dodokan Moyosari',
          'DAS GILI RHEE': 'Dodokan Moyosari',
          'DAS TULA': 'Dodokan Moyosari',
          'DAS UTAN': 'Dodokan Moyosari',
          'DAS SUMBAWA': 'Dodokan Moyosari',
          'UNDA': 'Unda Anyar',
          'AYUNG': 'Unda Anyar',
          'RAWA PENET': 'Unda Anyar',
          'YEH PENET': 'Unda Anyar',
          'SABA': 'Unda Anyar',
          'BALIAN': 'Unda Anyar',
          'DAYA': 'Unda Anyar',
          'DAYA 1': 'Unda Anyar',
          'DAYA 2': 'Unda Anyar',
          'DAS BARU': 'Brantas Sampean',
          'BARU': 'Brantas Sampean',
          'BARU KECIL': 'Brantas Sampean',
          'BONDOYUDO': 'Brantas Sampean',
          'SAMPEAN': 'Brantas Sampean',
          'MAYANG': 'Brantas Sampean',
          'BRANTAS': 'Brantas Sampean',
          'CIMANUK': 'Cimanuk Citanduy',
          'CIMANUK KECIL': 'Cimanuk Citanduy',
          'CISANGGARUNG': 'Cimanuk Citanduy',
          'CITANDUY': 'Cimanuk Citanduy',
          'CIWULAN': 'Cimanuk Citanduy',
          'CIKANDANG': 'Cimanuk Citanduy',
          'CIKAENGAN': 'Cimanuk Citanduy',
          'CIMEDANG': 'Cimanuk Citanduy',
          'CILAKI': 'Citarum Ciliwung',
          'PEMALI': 'Pemali Jratun',
          'COMAL': 'Pemali Jratun',
          'BODRI': 'Pemali Jratun',
          'TUNTANG': 'Pemali Jratun',
          'SERANG': 'Pemali Jratun',
          'SERANG 2': 'Pemali Jratun',
          'JUWATA': 'Pemali Jratun',
          'BOGOWONTO': 'Serayu Opak Progo',
          'SERAYU': 'Serayu Opak Progo',
          'PROGO': 'Serayu Opak Progo',
          'OPAK': 'Serayu Opak Progo',
          'OYO': 'Serayu Opak Progo',
          'SERUYAN': 'Kahayan',
          'KAHAYAN': 'Kahayan',
          'KATINGAN': 'Kahayan',
          'MENTAYA': 'Kahayan',
          'JELAI': 'Kahayan',
          'KOTAWARINGIN PULAU': 'Kahayan',
          'KOTAWARINGIN': 'Kahayan',
          'BARITO': 'Barito',
          'SEBUKU': 'Mahakam Berau',
          'SEBUKU BESAR': 'Mahakam Berau',
          'SEBUKU KECIL': 'Mahakam Berau',
          'SEBUKU SELATAN': 'Mahakam Berau',
          'SEBAKUNG': 'Mahakam Berau',
          'SESAYAP': 'Mahakam Berau',
          'KAYAN': 'Mahakam Berau',
          'BERAU': 'Mahakam Berau',
          'MAHAKAM': 'Mahakam Berau',
          'KAPUAS - MURUNG PULAU': 'Kapuas',
          'KAPUAS': 'Kapuas',
          'PM KAPUAS DABUNG': 'Kapuas',
          'KAPUAS - MURUNG': 'Kapuas',
      },
      provinsi_to_n_bpdas: {
          'Jawa Tengah': ['Solo', 'Cimanuk Citanduy', 'Pemali Jratun', 'Serayu Opak Progo'],
          'Jawa Timur': ['Solo', 'Brantas Sampean'],
          'Nusa Tenggara Barat': 'Dodokan Moyosari',
          'Bali': 'Unda Anyar',
          'Jawa Barat': ['Cimanuk Citanduy', 'Citarum Ciliwung'],
          'Banten': 'Citarum Ciliwung',
          'DKI Jakarta': 'Citarum Ciliwung',
          'Daerah Istimewa Yogyakarta': 'Serayu Opak Progo',
          'Kalimantan Tengah': ['Kahayan', 'Barito'],
          'Kalimantan Selatan': ['Kahayan', 'Barito'],
          'Kalimantan Barat': ['Kahayan', 'Kapuas'],
          'Kalimantan Timur': 'Mahakam Berau',
          'Kalimantan Utara': 'Mahakam Berau',
      }
  },
  
  // rawan_karhutla_2024: provinsi column
    rawan_karhutla_2024: {
      provinsi_direct: {
          'Jawa Tengah': 'Jawa Tengah',
          'Jawa Timur': 'Jawa Timur',
          'Nusa Tenggara Barat': 'Nusa Tenggara Barat',
          'Bali': 'Bali',
          'Jawa Barat': 'Jawa Barat',
          'DKI Jakarta': 'DKI Jakarta',
          'Banten': 'Banten',
          'D.I. Yogyakarta': 'Daerah Istimewa Yogyakarta',
          'Kalimantan Selatan': 'Kalimantan Selatan',
          'Kalimantan Tengah': 'Kalimantan Tengah',
          'Kalimantan Barat': 'Kalimantan Barat',
          'Kalimantan Timur': 'Kalimantan Timur',
          'Kalimantan Utara': 'Kalimantan Utara',
          'Maluku Utara': 'Maluku Utara',
          'Maluku': 'Maluku',
          'Papua Tengah': 'Papua Tengah',
          'Papua Barat': 'Papua Barat',
          'Papua Selatan': 'Papua Selatan',
          'Papua': 'Papua',
          'Papua Pegunungan': 'Papua Pegunungan',
          'Gorontalo': 'Gorontalo',
          'Sulawesi Tengah': 'Sulawesi Tengah',
          'Sulawesi Barat': 'Sulawesi Barat',
          'Sulawesi Tenggara': 'Sulawesi Tenggara',
          'Sulawesi Selatan': 'Sulawesi Selatan',
          'Sulawesi Utara': 'Sulawesi Utara',
          'Riau': 'Riau',
          'Sumatera Barat': 'Sumatera Barat',
          'Jambi': 'Jambi',
          'Sumatera Utara': 'Sumatera Utara',
          'Bengkulu': 'Bengkulu',
          'Sumatera Selatan': 'Sumatera Selatan',
          'Kep. Bangka Belitung': 'Kepulauan Bangka Belitung',
          'Lampung': 'Lampung',
          'Aceh': 'Aceh',
          'Kepulauan Riau': 'Kepulauan Riau',
          'Papua Barat Daya': 'Papua Barat Daya',
      },
      das_to_provinsi: {
          'BENGAWAN SOLO': ['Jawa Tengah', 'Jawa Timur'],
          'BEH': 'Nusa Tenggara Barat',
          'DAS BEH': 'Nusa Tenggara Barat',
          'DAS JANGKA': 'Nusa Tenggara Barat',
          'DAS KAMBU': 'Nusa Tenggara Barat',
          'DAS NAE 1': 'Nusa Tenggara Barat',
          'DAS NAE 2': 'Nusa Tenggara Barat',
          'NAE': 'Nusa Tenggara Barat',
          'DAS MOYO': 'Nusa Tenggara Barat',
          'DAS PALAPARADO': 'Nusa Tenggara Barat',
          'DAS REA': 'Nusa Tenggara Barat',
          'REA': 'Nusa Tenggara Barat',
          'DAS GILI RHEE': 'Nusa Tenggara Barat',
          'DAS TULA': 'Nusa Tenggara Barat',
          'DAS UTAN': 'Nusa Tenggara Barat',
          'DAS SUMBAWA': 'Nusa Tenggara Barat',
          'UNDA': 'Bali',
          'AYUNG': 'Bali',
          'RAWA PENET': 'Bali',
          'YEH PENET': 'Bali',
          'SABA': 'Bali',
          'BALIAN': 'Bali',
          'DAYA': 'Bali',
          'DAYA 1': 'Bali',
          'DAYA 2': 'Bali',
          'DAS BARU': 'Jawa Timur',
          'BARU': 'Jawa Timur',
          'BARU KECIL': 'Jawa Timur',
          'BONDOYUDO': 'Jawa Timur',
          'SAMPEAN': 'Jawa Timur',
          'MAYANG': 'Jawa Timur',
          'BRANTAS': 'Jawa Timur',
          'CIMANUK': ['Jawa Tengah', 'Jawa Barat'],
          'CIMANUK KECIL': ['Jawa Tengah', 'Jawa Barat'],
          'CISANGGARUNG': ['Jawa Tengah', 'Jawa Barat'],
          'CITANDUY': ['Jawa Tengah', 'Jawa Barat'],
          'CIWULAN': ['Jawa Tengah', 'Jawa Barat'],
          'CIKANDANG': ['Jawa Tengah', 'Jawa Barat'],
          'CIKAENGAN': ['Jawa Tengah', 'Jawa Barat'],
          'CIMEDANG': ['Jawa Tengah', 'Jawa Barat'],
          'CILAKI': ['Jawa Barat', 'Banten', 'DKI Jakarta'],
          'PEMALI': 'Jawa Tengah',
          'COMAL': 'Jawa Tengah',
          'BODRI': 'Jawa Tengah',
          'TUNTANG': 'Jawa Tengah',
          'SERANG': 'Jawa Tengah',
          'SERANG 2': 'Jawa Tengah',
          'JUWATA': 'Jawa Tengah',
          'BOGOWONTO': ['Jawa Tengah', 'Daerah Istimewa Yogyakarta'],
          'SERAYU': ['Jawa Tengah', 'Daerah Istimewa Yogyakarta'],
          'PROGO': ['Jawa Tengah', 'Daerah Istimewa Yogyakarta'],
          'OPAK': ['Jawa Tengah', 'Daerah Istimewa Yogyakarta'],
          'OYO': ['Jawa Tengah', 'Daerah Istimewa Yogyakarta'],
          'SERUYAN': ['Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Barat'],
          'KAHAYAN': ['Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Barat'],
          'KATINGAN': ['Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Barat'],
          'MENTAYA': ['Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Barat'],
          'JELAI': ['Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Barat'],
          'KOTAWARINGIN PULAU': ['Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Barat'],
          'KOTAWARINGIN': ['Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Barat'],
          'BARITO': ['Kalimantan Selatan', 'Kalimantan Tengah'],
          'SEBUKU': ['Kalimantan Timur', 'Kalimantan Utara'],
          'SEBUKU BESAR': ['Kalimantan Timur', 'Kalimantan Utara'],
          'SEBUKU KECIL': ['Kalimantan Timur', 'Kalimantan Utara'],
          'SEBUKU SELATAN': ['Kalimantan Timur', 'Kalimantan Utara'],
          'SEBAKUNG': ['Kalimantan Timur', 'Kalimantan Utara'],
          'SESAYAP': ['Kalimantan Timur', 'Kalimantan Utara'],
          'KAYAN': ['Kalimantan Timur', 'Kalimantan Utara'],
          'BERAU': ['Kalimantan Timur', 'Kalimantan Utara'],
          'MAHAKAM': ['Kalimantan Timur', 'Kalimantan Utara'],
          'KAPUAS - MURUNG PULAU': 'Kalimantan Barat',
          'KAPUAS': 'Kalimantan Barat',
          'PM KAPUAS DABUNG': 'Kalimantan Barat',
          'KAPUAS - MURUNG': 'Kalimantan Barat',
      }
  },
  
  // rawan_limpasan: wil_kerja column
    rawan_limpasan: {
      das_to_wil_kerja: {
          'BENGAWAN SOLO': 'BPDAS SOLO',
          'BEH': 'BPDAS DODOKAN MOYOSARI',
          'DAS BEH': 'BPDAS DODOKAN MOYOSARI',
          'DAS JANGKA': 'BPDAS DODOKAN MOYOSARI',
          'DAS KAMBU': 'BPDAS DODOKAN MOYOSARI',
          'DAS NAE 1': 'BPDAS DODOKAN MOYOSARI',
          'DAS NAE 2': 'BPDAS DODOKAN MOYOSARI',
          'NAE': 'BPDAS DODOKAN MOYOSARI',
          'DAS MOYO': 'BPDAS DODOKAN MOYOSARI',
          'DAS PALAPARADO': 'BPDAS DODOKAN MOYOSARI',
          'DAS REA': 'BPDAS DODOKAN MOYOSARI',
          'REA': 'BPDAS DODOKAN MOYOSARI',
          'DAS GILI RHEE': 'BPDAS DODOKAN MOYOSARI',
          'DAS TULA': 'BPDAS DODOKAN MOYOSARI',
          'DAS UTAN': 'BPDAS DODOKAN MOYOSARI',
          'DAS SUMBAWA': 'BPDAS DODOKAN MOYOSARI',
          'UNDA': 'BPDAS UNDA ANYAR',
          'AYUNG': 'BPDAS UNDA ANYAR',
          'RAWA PENET': 'BPDAS UNDA ANYAR',
          'YEH PENET': 'BPDAS UNDA ANYAR',
          'SABA': 'BPDAS UNDA ANYAR',
          'BALIAN': 'BPDAS UNDA ANYAR',
          'DAYA': 'BPDAS UNDA ANYAR',
          'DAYA 1': 'BPDAS UNDA ANYAR',
          'DAYA 2': 'BPDAS UNDA ANYAR',
          'DAS BARU': ['BPDAS BRANTAS', 'BPDAS SAMPEAN'],
          'BARU': ['BPDAS BRANTAS', 'BPDAS SAMPEAN'],
          'BARU KECIL': ['BPDAS BRANTAS', 'BPDAS SAMPEAN'],
          'BONDOYUDO': ['BPDAS BRANTAS', 'BPDAS SAMPEAN'],
          'SAMPEAN': ['BPDAS BRANTAS', 'BPDAS SAMPEAN'],
          'MAYANG': ['BPDAS BRANTAS', 'BPDAS SAMPEAN'],
          'BRANTAS': ['BPDAS BRANTAS', 'BPDAS SAMPEAN'],
          'CIMANUK': 'BPDAS CIMANUK CITANDUY',
          'CIMANUK KECIL': 'BPDAS CIMANUK CITANDUY',
          'CISANGGARUNG': 'BPDAS CIMANUK CITANDUY',
          'CITANDUY': 'BPDAS CIMANUK CITANDUY',
          'CIWULAN': 'BPDAS CIMANUK CITANDUY',
          'CIKANDANG': 'BPDAS CIMANUK CITANDUY',
          'CIKAENGAN': 'BPDAS CIMANUK CITANDUY',
          'CIMEDANG': 'BPDAS CIMANUK CITANDUY',
          'CILAKI': 'BPDAS CITARUM CILIWUNG',
          'PEMALI': 'BPDAS PEMALI JRATUN',
          'COMAL': 'BPDAS PEMALI JRATUN',
          'BODRI': 'BPDAS PEMALI JRATUN',
          'TUNTANG': 'BPDAS PEMALI JRATUN',
          'SERANG': 'BPDAS PEMALI JRATUN',
          'SERANG 2': 'BPDAS PEMALI JRATUN',
          'JUWATA': 'BPDAS PEMALI JRATUN',
          'BOGOWONTO': 'BPDAS SERAYU OPAK PROGO',
          'SERAYU': 'BPDAS SERAYU OPAK PROGO',
          'PROGO': 'BPDAS SERAYU OPAK PROGO',
          'OPAK': 'BPDAS SERAYU OPAK PROGO',
          'OYO': 'BPDAS SERAYU OPAK PROGO',
          'SERUYAN': 'BPDAS KAHAYAN',
          'KAHAYAN': 'BPDAS KAHAYAN',
          'KATINGAN': 'BPDAS KAHAYAN',
          'MENTAYA': 'BPDAS KAHAYAN',
          'JELAI': 'BPDAS KAHAYAN',
          'KOTAWARINGIN PULAU': 'BPDAS KAHAYAN',
          'KOTAWARINGIN': 'BPDAS KAHAYAN',
          'BARITO': 'BPDAS BARITO',
          'SEBUKU': 'BPDAS MAHAKAM BERAU',
          'SEBUKU BESAR': 'BPDAS MAHAKAM BERAU',
          'SEBUKU KECIL': 'BPDAS MAHAKAM BERAU',
          'SEBUKU SELATAN': 'BPDAS MAHAKAM BERAU',
          'SEBAKUNG': 'BPDAS MAHAKAM BERAU',
          'SESAYAP': 'BPDAS MAHAKAM BERAU',
          'KAYAN': 'BPDAS MAHAKAM BERAU',
          'BERAU': 'BPDAS MAHAKAM BERAU',
          'MAHAKAM': 'BPDAS MAHAKAM BERAU',
          'KAPUAS - MURUNG PULAU': 'BPDAS KAPUAS',
          'KAPUAS': 'BPDAS KAPUAS',
          'PM KAPUAS DABUNG': 'BPDAS KAPUAS',
          'KAPUAS - MURUNG': 'BPDAS KAPUAS',
      },
      provinsi_to_wil_kerja: {
          'Jawa Tengah': ['BPDAS SOLO', 'BPDAS CIMANUK CITANDUY', 'BPDAS PEMALI JRATUN', 'BPDAS SERAYU OPAK PROGO'],
          'Jawa Timur': ['BPDAS SOLO', 'BPDAS BRANTAS', 'BPDAS SAMPEAN'],
          'Nusa Tenggara Barat': 'BPDAS DODOKAN MOYOSARI',
          'Bali': 'BPDAS UNDA ANYAR',
          'Jawa Barat': ['BPDAS CIMANUK CITANDUY', 'BPDAS CITARUM CILIWUNG'],
          'Banten': 'BPDAS CITARUM CILIWUNG',
          'DKI Jakarta': 'BPDAS CITARUM CILIWUNG',
          'Daerah Istimewa Yogyakarta': 'BPDAS SERAYU OPAK PROGO',
          'Kalimantan Tengah': ['BPDAS KAHAYAN', 'BPDAS BARITO'],
          'Kalimantan Selatan': ['BPDAS KAHAYAN', 'BPDAS BARITO'],
          'Kalimantan Barat': ['BPDAS KAHAYAN', 'BPDAS KAPUAS'],
          'Kalimantan Timur': 'BPDAS MAHAKAM BERAU',
          'Kalimantan Utara': 'BPDAS MAHAKAM BERAU',
    }
  }
};

// Function to process Excel data
// const processExcelData = (filePath) => {
//   try {
//     const workbook = XLSX.readFile(filePath);
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
    
//     // Read specific cells based on your mapping
//     const cellMapping = {
//       'A3': 'curah_hujan',           // A3
//       'B3': 'korban_meninggal',      // B3
//       'C3': 'korban_luka_luka',      // C3
//       'D3': 'korban_mengungsi',      // D3
//       'E3': 'rumah_rusak_berat',     // E3
//       'F3': 'rumah_rusak_sedang',    // F3
//       'G3': 'rumah_rusak_ringan',    // G3
//       'H3': 'rumah_rusak_terendam',  // H3
//       'I3': 'infrastruktur_rusak_berat',   // I3
//       'J3': 'infrastruktur_rusak_sedang',  // J3
//       'K3': 'infrastruktur_rusak_ringan',  // K3
//       'L3': 'dampak_kebakaran',      // L3
//       'M3': 'luas_lokasi_kejadian',  // M3
//       'N3': 'kejadian_ke'            // N3
//     };

//     const processedData = {};

//     // Process each cell mapping
//     Object.keys(cellMapping).forEach(cellAddress => {
//       const dbColumn = cellMapping[cellAddress];
//       const cell = worksheet[cellAddress];
            
//       let value = null;
//       if (cell && cell.v !== undefined) {
//         value = cell.v;
//       }
      
//       // Handle different data types based on database column
//       if (value !== null && value !== undefined && value !== '') {
//         if (dbColumn === 'dampak_kebakaran') {
//           // For text field
//           processedData[dbColumn] = String(value);
//         } else if (dbColumn === 'curah_hujan' || dbColumn === 'luas_lokasi_kejadian') {
//           // For decimal fields
//           const numValue = parseFloat(value);
//           processedData[dbColumn] = isNaN(numValue) ? null : numValue;
//         } else {
//           // For integer fields
//           const intValue = parseInt(value);
//           processedData[dbColumn] = isNaN(intValue) ? 0 : intValue;
//         }
//       } else {
//         // Set default values for missing/empty data
//         if (dbColumn === 'dampak_kebakaran') {
//           processedData[dbColumn] = null;
//         } else if (dbColumn === 'curah_hujan' || dbColumn === 'luas_lokasi_kejadian') {
//           processedData[dbColumn] = null;
//         } else {
//           processedData[dbColumn] = 0;
//         }
//       }
//     });
    
//     // Validate that we got some data
//     const hasData = Object.values(processedData).some(value => 
//       value !== null && value !== 0 && value !== ''
//     );
    
//     if (!hasData) {
//       console.warn('No valid data found in Excel file. All values are null/0/empty.');
//     }
    
//     return processedData;
    
//   } catch (error) {
//     console.error('Error processing Excel file:', error);
//     throw new Error(`Failed to process Excel file: ${error.message}`);
//   }
// };

// Helper functions untuk parsing geometry dan create features
const parseGeometry = (geometryJson, rowIndex, tableName) => {
  if (!geometryJson) {
    console.warn(`Row ${rowIndex} in ${tableName}: No geometry_json found`);
    return null;
  }
  
  try {
    return JSON.parse(geometryJson);
  } catch (e) {
    console.error(`Error parsing geometry for row ${rowIndex} in ${tableName}:`, e.message);
    return null;
  }
};

const createFeatures = (rows, tableName) => {
  const features = [];
  let validCount = 0;
  let errorCount = 0;

  if (!rows || rows.length === 0) {
    return features;
  }

  rows.forEach((row, index) => {
    try {
      const geometry = parseGeometry(row.geometry_json, index, tableName);
      
      if (geometry) {
        validCount++;
        const { geometry_json, geom, ...properties } = row;
        
        features.push({
          type: 'Feature',
          id: index,
          properties: properties,
          geometry: geometry
        });
      } else {
        errorCount++;
      }
    } catch (featureError) {
      console.error(`Error processing feature ${index} in ${tableName}:`, featureError);
      errorCount++;
    }
  });

  return features;
};

// PERBAIKAN 5: Perbaiki fungsi buildWhereClause jika ada masalah
const buildWhereClause = (columnName, values, params) => {
  try {
    if (Array.isArray(values)) {
      // Multiple values: WHERE column = ANY($1)
      const paramIndex = params.length + 1;
      params.push(values);
      return ` WHERE ${columnName} = ANY($${paramIndex})`;
    } else {
      // Single value: WHERE column = $1
      const paramIndex = params.length + 1;
      params.push(values);
      return ` WHERE ${columnName} = $${paramIndex}`;
    }
  } catch (error) {
    console.error('Error in buildWhereClause:', error);
    throw error;
  }
};

app.get('/api/available-years/location', async (req, res) => {
  try {
    const result = {};
    
    // ✅ FIX: Gunakan nama tabel yang benar
    const tableConfigs = {
      provinsi: 'provinsi',
      kabupaten: 'kab_kota',      // ✅ UBAH dari 'kabupaten' ke 'kab_kota'
      kecamatan: 'kecamatan',
      kelurahan: 'kel_desa',       // ✅ UBAH dari 'kelurahan' ke 'kel_desa'
      das: 'das'
    };
    
    for (const [key, tableName] of Object.entries(tableConfigs)) {
      try {
        const query = await client.query(
          `SELECT DISTINCT tahun_data FROM ${tableName} WHERE tahun_data IS NOT NULL ORDER BY tahun_data DESC`
        );
        result[key] = query.rows.map(r => r.tahun_data);
        console.log(`✅ Found ${result[key].length} years in ${tableName}:`, result[key]);
      } catch (err) {
        console.log(`⚠️ Table ${tableName} might not exist or has no tahun_data:`, err.message);
        result[key] = [];
      }
    }
    
    console.log('📅 Available years result:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in /api/available-years/location:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/available-years/disaster/:tableName', async (req, res) => {
  const { tableName } = req.params;
  
  try {
    // Validate table name untuk security
    const validPattern = /^[a-z_0-9]+$/;
    if (!validPattern.test(tableName)) {
      return res.status(400).json({ error: 'Invalid table name format' });
    }
    
    console.log(`🔍 Fetching years for disaster table: ${tableName}`);
    
    const query = `SELECT DISTINCT tahun_data FROM ${tableName} WHERE tahun_data IS NOT NULL ORDER BY tahun_data DESC`;
    const result = await client.query(query);
    
    const years = result.rows.map(r => r.tahun_data);
    console.log(`✅ Found ${years.length} years in ${tableName}:`, years);
    
    res.json(years);
  } catch (error) {
    console.error(`❌ Error fetching years for ${tableName}:`, error.message);
    
    // Check if table exists
    try {
      const checkTable = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [tableName]
      );
      
      if (!checkTable.rows[0].exists) {
        return res.status(404).json({ 
          error: `Table '${tableName}' does not exist`,
          message: 'Tabel tidak ditemukan di database'
        });
      }
      
      // Check if tahun_data column exists
      const checkColumn = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'tahun_data'
        )`,
        [tableName]
      );
      
      if (!checkColumn.rows[0].exists) {
        return res.status(400).json({ 
          error: `Column 'tahun_data' does not exist in table '${tableName}'`,
          message: 'Kolom tahun_data tidak ditemukan di tabel'
        });
      }
    } catch (checkError) {
      console.error('Error checking table/column:', checkError);
    }
    
    res.status(500).json({ 
      error: error.message,
      table: tableName 
    });
  }
      });

// ================= ENDPOINT BARU #3 ================
app.get('/api/locations/:level', async (req, res) => {
  const { level } = req.params;
  const { year, filter_column, filter_value } = req.query;
  
  try {
    const tableConfig = {
      'provinsi': { table: 'provinsi', column: 'provinsi' },
      'kabupaten': { table: 'kab_kota', column: 'kab_kota' },
      'kecamatan': { table: 'kecamatan', column: 'kecamatan' },
      'kelurahan': { table: 'kel_desa', column: 'kel_desa' },
      'das': { table: 'das', column: 'nama_das' }
    };
    
    const config = tableConfig[level];
    if (!config) {
      return res.status(400).json({ error: 'Invalid level' });
    }
    
    console.log(`🔍 Fetching ${level} for year ${year}`);
    
    // PERBAIKAN: Tambahkan filter untuk exclude NULL values
    let query = `SELECT DISTINCT ${config.column} as name, tahun_data FROM ${config.table}`;
    const params = [];
    const conditions = [];
    
    // PERBAIKAN: Tambahkan kondisi untuk exclude NULL
    conditions.push(`${config.column} IS NOT NULL`);
    conditions.push(`${config.column} != ''`);
    
    if (year) {
      params.push(year);
      conditions.push(`tahun_data = $${params.length}`);
    }
    
    // Gunakan reference_mapping untuk filter
    if (filter_column && filter_value) {
      const mappingQuery = `
        SELECT target_value 
        FROM reference_mapping 
        WHERE source_table = $1 
          AND source_column = $2 
          AND UPPER(source_value) = UPPER($3)
      `;
      const mappingResult = await client.query(mappingQuery, [config.table, filter_column, filter_value]);
      
      if (mappingResult.rows.length > 0) {
        const targetValue = mappingResult.rows[0].target_value;
        params.push(targetValue);
        conditions.push(`UPPER(${filter_column}) = UPPER($${params.length})`);
      } else {
        params.push(filter_value);
        conditions.push(`UPPER(${filter_column}) = UPPER($${params.length})`);
      }
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY ${config.column}`;
    
    const result = await client.query(query, params);
    console.log(`✅ Found ${result.rows.length} ${level}(s)`);
    
    res.json(result.rows);
  } catch (error) {
    console.error(`❌ Error fetching ${level}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ================= ENDPOINT BARU #4 ================
app.get('/api/locations/:level/max-year', async (req, res) => {
  const { level } = req.params;
  const { maxYear, filter_column, filter_value } = req.query;
  
  if (!maxYear) {
    return res.status(400).json({ error: 'maxYear parameter required' });
  }
  
  try {
    const tableConfig = {
      'provinsi': { table: 'provinsi', column: 'provinsi' },
      'kabupaten': { table: 'kab_kota', column: 'kab_kota' },
      'kecamatan': { table: 'kecamatan', column: 'kecamatan' },
      'kelurahan': { table: 'kel_desa', column: 'kel_desa' },
      'das': { table: 'das', column: 'nama_das' }
    };
    
    const config = tableConfig[level];
    if (!config) {
      return res.status(400).json({ error: 'Invalid level' });
    }
    
    console.log(`🔍 Fetching ${level} with max year ${maxYear}`);
    
    // PERBAIKAN: Gunakan subquery untuk mendapatkan max year per lokasi
    let query = `
      WITH max_years AS (
        SELECT 
          ${config.column},
          MAX(tahun_data) as max_year
        FROM ${config.table}
        WHERE tahun_data <= $1
        GROUP BY ${config.column}
      )
      SELECT DISTINCT 
        t.${config.column} as name,
        t.tahun_data
      FROM ${config.table} t
      INNER JOIN max_years m 
        ON t.${config.column} = m.${config.column} 
        AND t.tahun_data = m.max_year
    `;
    
    const params = [maxYear];
    
    // Gunakan reference_mapping untuk filter
    if (filter_column && filter_value) {
      const mappingQuery = `
        SELECT target_value 
        FROM reference_mapping 
        WHERE source_table = $1 
          AND source_column = $2 
          AND UPPER(source_value) = UPPER($3)
      `;
      const mappingResult = await client.query(mappingQuery, [config.table, filter_column, filter_value]);
      
      if (mappingResult.rows.length > 0) {
        const targetValue = mappingResult.rows[0].target_value;
        params.push(targetValue);
        query += ` WHERE UPPER(t.${filter_column}) = UPPER($${params.length})`;
      } else {
        params.push(filter_value);
        query += ` WHERE UPPER(t.${filter_column}) = UPPER($${params.length})`;
      }
    }
    
    query += ` ORDER BY name`;
    
    console.log('📝 Executing query:', query);
    console.log('📝 With params:', params);
    
    const result = await client.query(query, params);
    console.log(`✅ Found ${result.rows.length} ${level}(s) with max year ${maxYear}`);
    
    res.json(result.rows);
  } catch (error) {
    console.error(`❌ Error fetching ${level} with max year:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ================= ENDPOINT BARU #5 ================
app.get('/api/locations/cascade/:level', async (req, res) => {
  const { level } = req.params;
  const { year, provinsi, kabupaten, kecamatan } = req.query;
  
  if (!year) {
    return res.status(400).json({ error: 'year parameter required' });
  }
  
  try {
    let query, params;
    
    if (level === 'kabupaten' && provinsi) {
      console.log(`🔍 Fetching kabupaten for provinsi: ${provinsi}, year: ${year}`);
      
      // Cari mapping dari provinsi ke kabupaten
      const mappingQuery = `
        SELECT DISTINCT target_value 
        FROM reference_mapping 
        WHERE source_table = 'provinsi'
          AND source_column = 'provinsi'
          AND target_table = 'kab_kota'
          AND target_column = 'provinsi'
          AND UPPER(source_value) = UPPER($1)
      `;
      const mappingResult = await client.query(mappingQuery, [provinsi]);
      
      let provinsiFilter = mappingResult.rows.length > 0 ? mappingResult.rows[0].target_value : provinsi;
      
      query = `
        SELECT DISTINCT ON (kab_kota) 
          kab_kota as name,
          tahun_data
        FROM kab_kota
        WHERE tahun_data <= $1
          AND UPPER(provinsi) = UPPER($2)
        ORDER BY kab_kota, tahun_data DESC
      `;
      params = [year, provinsiFilter];
      
    } else if (level === 'kecamatan' && kabupaten) {
      console.log(`🔍 Fetching kecamatan for kabupaten: ${kabupaten}, year: ${year}`);
      
      const mappingQuery = `
        SELECT DISTINCT target_value 
        FROM reference_mapping 
        WHERE source_table = 'kab_kota'
          AND source_column = 'kab_kota'
          AND target_table = 'kecamatan'
          AND target_column = 'kab_kota'
          AND UPPER(source_value) = UPPER($1)
      `;
      const mappingResult = await client.query(mappingQuery, [kabupaten]);
      
      let kabupatenFilter = mappingResult.rows.length > 0 ? mappingResult.rows[0].target_value : kabupaten;
      
      query = `
        SELECT DISTINCT ON (kecamatan) 
          kecamatan as name,
          tahun_data
        FROM kecamatan
        WHERE tahun_data <= $1
          AND UPPER(kab_kota) = UPPER($2)
        ORDER BY kecamatan, tahun_data DESC
      `;
      params = [year, kabupatenFilter];
      
    } else if (level === 'kelurahan' && kecamatan) {
      console.log(`🔍 Fetching kelurahan for kecamatan: ${kecamatan}, year: ${year}`);
      
      const mappingQuery = `
        SELECT DISTINCT target_value 
        FROM reference_mapping 
        WHERE source_table = 'kecamatan'
          AND source_column = 'kecamatan'
          AND target_table = 'kel_desa'
          AND target_column = 'kecamatan'
          AND UPPER(source_value) = UPPER($1)
      `;
      const mappingResult = await client.query(mappingQuery, [kecamatan]);
      
      let kecamatanFilter = mappingResult.rows.length > 0 ? mappingResult.rows[0].target_value : kecamatan;
      
      query = `
        SELECT DISTINCT ON (kel_desa) 
          kel_desa as name,
          tahun_data
        FROM kel_desa
        WHERE tahun_data <= $1
          AND UPPER(kecamatan) = UPPER($2)
        ORDER BY kel_desa, tahun_data DESC
      `;
      params = [year, kecamatanFilter];
      
    } else {
      return res.status(400).json({ error: 'Invalid cascade parameters' });
    }
    
    const result = await client.query(query, params);
    console.log(`✅ Cascading ${level} for year ${year}:`, result.rows.length);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error(`❌ Error in cascading ${level}:`, error);
    res.status(500).json({ error: error.message });
  }
});



// NEW ENDPOINTS: Get kabupaten, kecamatan, kelurahan data
app.get('/api/filter/kabupaten', async (req, res) => {
  try {
    const result = await client.query('SELECT DISTINCT kab_kota FROM kab_kota ORDER BY kab_kota');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching kabupaten:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/filter/kecamatan', async (req, res) => {
  try {
    const result = await client.query('SELECT DISTINCT kecamatan FROM kecamatan ORDER BY kecamatan');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching kecamatan:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/filter/kelurahan', async (req, res) => {
  try {
    const result = await client.query('SELECT DISTINCT kel_desa FROM kel_desa ORDER BY kel_desa');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching kelurahan:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Existing endpoints
app.get('/api/filter/provinces', async (req, res) => {
  try {
    const result = await client.query('SELECT DISTINCT provinsi FROM provinsi ORDER BY provinsi');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching provinces:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/filter/das', async (req, res) => {
  try {
    const result = await client.query('SELECT DISTINCT nama_das FROM das ORDER BY nama_das');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching DAS:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/incident-counts', async (req, res) => {
  try {
    const { disaster_type, level, year, location_name } = req.query;
    
    if (!disaster_type || !level || !year) {
      return res.status(400).json({ 
        error: 'Missing required parameters: disaster_type, level, year' 
      });
    }

    console.log(`🎨 Fetching incident counts for coloring: ${disaster_type}, ${level}, year ${year}`);

    let kejadianQuery;
    let params = [];

    // Build query based on level
    if (level === 'Indonesia' || level === 'Provinsi') {
      // For Indonesia and Provinsi level, count by provinsi
      kejadianQuery = `
        SELECT UPPER(TRIM(provinsi)) as location_key, COUNT(*) as incident_count
        FROM kejadian 
        WHERE disaster_type = $1
          AND EXTRACT(YEAR FROM incident_date) = $2
          AND provinsi IS NOT NULL
          AND TRIM(provinsi) != ''
        GROUP BY UPPER(TRIM(provinsi))
      `;
      params = [disaster_type, year];
      
    } else if (level === 'DAS') {
      // For DAS level, count by das name
      kejadianQuery = `
        SELECT TRIM(das) as location_key, COUNT(*) as incident_count
        FROM kejadian 
        WHERE disaster_type = $1
          AND EXTRACT(YEAR FROM incident_date) = $2
          AND das IS NOT NULL
          AND TRIM(das) != ''
        GROUP BY TRIM(das)
      `;
      params = [disaster_type, year];
      
    } else {
      return res.status(400).json({ error: 'Invalid level parameter' });
    }

    const result = await client.query(kejadianQuery, params);
    
    // Create a map for easy lookup
    const incidentMap = {};
    result.rows.forEach(row => {
      incidentMap[row.location_key] = parseInt(row.incident_count);
    });
    
    console.log(`✅ Found incident counts for ${result.rows.length} locations`);
    console.log('📊 Sample data:', result.rows.slice(0, 3));
    
    res.json({ incidentMap, totalLocations: result.rows.length });
    
  } catch (error) {
    console.error('❌ Error fetching incident counts:', error);
    res.status(500).json({ error: error.message });
  }
});

// // UPDATED ENDPOINT: Submit kejadian report with Excel processing (no report_type)
// app.post('/api/kejadian', kejadianUpload.fields([
//   { name: 'thumbnail', maxCount: 1 },
//   { name: 'images', maxCount: 10 },
//   { name: 'dataFiles', maxCount: 5 }
// ]), async (req, res) => {
//   try {

//     const {
//       disasterType,
//       provinsi,
//       kabupaten,
//       kecamatan,
//       kelurahan,
//       das,
//       title,
//       description,
//       incidentDate,
//       longitude,
//       latitude
//     } = req.body;

//     // Updated validation for new required fields
//     const requiredFields = ['disasterType', 'provinsi', 'kabupaten', 'kecamatan', 'kelurahan', 'title', 'longitude', 'latitude', 'description', 'incidentDate'];
//     const missingFields = requiredFields.filter(field => !req.body[field]);

//     if (missingFields.length > 0) {
//       return res.status(400).json({ 
//         error: 'Missing required fields',
//         missing: missingFields,
//         // required: requiredFields
//       });
//     }

//     // Validate coordinates
//     const lng = parseFloat(longitude);
//     const lat = parseFloat(latitude);
    
//     if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
//       return res.status(400).json({ 
//         error: 'Invalid coordinates',
//         // details: `Longitude: ${longitude}, Latitude: ${latitude}` 
//       });
//     }

//     const lngRounded = Math.round(lng * 1000000) / 1000000;
//     const latRounded = Math.round(lat * 1000000) / 1000000;

//     // Process uploaded files
//     let thumbnailPath = null;
//     let imagesPaths = [];
//     let excelData = {};

//     if (req.files) {
//       if (req.files.thumbnail && req.files.thumbnail[0]) {
//         thumbnailPath = req.files.thumbnail[0].filename;
//       }
      
//       if (req.files.images) {
//         imagesPaths = req.files.images.map(file => file.filename);
//       }

//       // Process Excel files
//       if (req.files.dataFiles && req.files.dataFiles.length > 0) {
//         try {
//           // Process the first Excel file (you can modify this to process multiple files)
//           const excelFile = req.files.dataFiles[0];
//           const excelFilePath = path.join(uploadDir, excelFile.filename);
//           excelData = processExcelData(excelFilePath);
          
//           // Clean up Excel file after processing (optional)
//           // fs.unlinkSync(excelFilePath);
//         } catch (excelError) {
//           console.error('Excel processing error:', excelError);
//           // Continue without Excel data - it's optional
//           excelData = {};
//         }
//       }
//     }

//     // Insert into database with new schema (no report_type)
//     const insertQuery = `
//       INSERT INTO kejadian (
//         thumbnail_path, images_paths, disaster_type, 
//         provinsi, kabupaten, kecamatan, kelurahan, das, title, description, incident_date, 
//         longitude, latitude, geom,
//         curah_hujan, korban_meninggal, korban_luka_luka, korban_mengungsi,
//         rumah_rusak_berat, rumah_rusak_sedang, rumah_rusak_ringan, rumah_rusak_terendam,
//         infrastruktur_rusak_berat, infrastruktur_rusak_sedang, infrastruktur_rusak_ringan,
//         dampak_kebakaran, luas_lokasi_kejadian, kejadian_ke
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
//         ST_SetSRID(ST_MakePoint($12, $13), 4326),
//         $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
//       ) RETURNING id, created_at
//     `;

//     const values = [
//       thumbnailPath,
//       imagesPaths,
//       disasterType,
//       provinsi,
//       kabupaten,
//       kecamatan,
//       kelurahan,
//       das || null,
//       title,
//       description,
//       incidentDate,
//       lngRounded,
//       latRounded,
//       // Excel data fields
//       excelData.curah_hujan || null,
//       excelData.korban_meninggal || 0,
//       excelData.korban_luka_luka || 0,
//       excelData.korban_mengungsi || 0,
//       excelData.rumah_rusak_berat || 0,
//       excelData.rumah_rusak_sedang || 0,
//       excelData.rumah_rusak_ringan || 0,
//       excelData.rumah_rusak_terendam || 0,
//       excelData.infrastruktur_rusak_berat || 0,
//       excelData.infrastruktur_rusak_sedang || 0,
//       excelData.infrastruktur_rusak_ringan || 0,
//       excelData.dampak_kebakaran || null,
//       excelData.luas_lokasi_kejadian || null,
//       excelData.kejadian_ke || null
//     ];

//     const result = await client.query(insertQuery, values);
//     invalidateRiskCache({
//       disaster_type: disasterType,
//       provinsi, kabupaten, kecamatan, kelurahan, das
//     });
    
//     res.status(201).json({
//       success: true,
//       message: 'Laporan kejadian berhasil disimpan',
//       data: {
//         id: result.rows[0].id,
//         created_at: result.rows[0].created_at,
//         coordinates: {
//           longitude: lngRounded,
//           latitude: latRounded
//         },
//         thumbnail_url: thumbnailPath ? `/uploads/${thumbnailPath}` : null,
//         images_urls: imagesPaths.map(path => `/uploads/${path}`),
//         excel_data_processed: Object.keys(excelData).length > 0
//       }
//     });

//   } catch (error) {
//     console.error('Error saving kejadian:', error);
    
//     // Clean up uploaded files if database insert fails
//     if (req.files) {
//       const allFiles = [
//         ...(req.files.thumbnail || []),
//         ...(req.files.images || []),
//         ...(req.files.dataFiles || [])
//       ];
      
//       allFiles.forEach(file => {
//         const filePath = path.join(uploadDir, file.filename);
//         if (fs.existsSync(filePath)) {
//           fs.unlinkSync(filePath);
//         }
//       });
//     }
    
//     res.status(500).json({ 
//       error: 'Internal Server Error',
//       message: error.message 
//     });
//   }
// });

app.post('/api/kejadian', kejadianUpload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'dataFiles', maxCount: 10 }  // Semua Excel files di sini
]), async (req, res) => {
  let dbClient;
  
  try {
    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    const {
      disasterType,
      provinsi,
      kabupaten,
      kecamatan,
      kelurahan,
      das,
      title,
      description,
      incidentDate,
      longitude,
      latitude
    } = req.body;

    // Validation
    const requiredFields = ['disasterType', 'provinsi', 'kabupaten', 'kecamatan', 'kelurahan', 'title', 'longitude', 'latitude', 'description', 'incidentDate'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    
    if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new Error('Invalid coordinates');
    }

    const lngRounded = Math.round(lng * 1000000) / 1000000;
    const latRounded = Math.round(lat * 1000000) / 1000000;

    // Process uploaded files
    let thumbnailPath = null;
    let imagesPaths = [];
    let excelData = {};
    let dataKorban = null;

    if (req.files) {
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        thumbnailPath = req.files.thumbnail[0].filename;
      }
      
      if (req.files.images) {
        imagesPaths = req.files.images.map(file => file.filename);
      }

      // Process Excel files
      if (req.files.dataFiles && req.files.dataFiles.length > 0) {
        try {
          for (const excelFile of req.files.dataFiles) {
            const excelFilePath = path.join(uploadDir, excelFile.filename);
            const processedData = processExcelFile(excelFilePath, disasterType);
            
            // Merge data
            if (processedData.data_korban) {
              dataKorban = processedData.data_korban;
            }
            
            Object.assign(excelData, processedData);
            
            // Clean up Excel file after processing
            fs.unlinkSync(excelFilePath);
          }
        } catch (excelError) {
          console.error('Excel processing error:', excelError);
          throw new Error('Failed to process Excel files: ' + excelError.message);
        }
      }
    }

    // Insert kejadian dengan data korban
    const insertKejadianQuery = `
      INSERT INTO kejadian (
        thumbnail_path, images_paths, disaster_type, 
        provinsi, kabupaten, kecamatan, kelurahan, das, 
        title, description, incident_date, 
        longitude, latitude, geom,
        korban_meninggal, korban_luka_luka, korban_mengungsi,
        rumah_rusak_berat, rumah_rusak_sedang, rumah_rusak_ringan, rumah_rusak_terendam,
        infrastruktur_rusak_berat, infrastruktur_rusak_sedang, infrastruktur_rusak_ringan,
        dampak_kebakaran, luas_lokasi_kejadian, kejadian_ke
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
        ST_SetSRID(ST_MakePoint($12, $13), 4326),
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING id, created_at
    `;

    const kejadianValues = [
      thumbnailPath,
      imagesPaths,
      disasterType,
      provinsi,
      kabupaten,
      kecamatan,
      kelurahan,
      das || null,
      title,
      description,
      incidentDate,
      lngRounded,
      latRounded,
      // Data Korban
      dataKorban?.korban_meninggal || 0,
      dataKorban?.korban_luka_luka || 0,
      dataKorban?.korban_mengungsi || 0,
      dataKorban?.rumah_rusak_berat || 0,
      dataKorban?.rumah_rusak_sedang || 0,
      dataKorban?.rumah_rusak_ringan || 0,
      dataKorban?.rumah_rusak_terendam || 0,
      dataKorban?.infrastruktur_rusak_berat || 0,
      dataKorban?.infrastruktur_rusak_sedang || 0,
      dataKorban?.infrastruktur_rusak_ringan || 0,
      dataKorban?.dampak_kebakaran || null,
      dataKorban?.luas_lokasi_kejadian || null,
      dataKorban?.kejadian_ke || null
    ];

    const kejadianResult = await dbClient.query(insertKejadianQuery, kejadianValues);
    const kejadianId = kejadianResult.rows[0].id;

    // Insert data detail berdasarkan disaster type
    if (disasterType === 'Banjir') {
      if (excelData.curah_hujan && excelData.curah_hujan.length > 0) {
        await insertCurahHujan(dbClient, kejadianId, excelData.curah_hujan);
      }
      if (excelData.status_das && excelData.status_das.length > 0) {
        await insertStatusDasBanjir(dbClient, kejadianId, excelData.status_das);
      }
      if (excelData.tutupan_das && excelData.tutupan_das.length > 0) {
        await insertTutupanDas(dbClient, kejadianId, excelData.tutupan_das);
      }
      if (excelData.kemiringan_lahan) {
        await insertKemiringanLahan(dbClient, kejadianId, excelData.kemiringan_lahan);
      }
      if (excelData.kepadatan_pemukiman && excelData.kepadatan_pemukiman.length > 0) {
        await insertKepadatanPemukiman(dbClient, kejadianId, excelData.kepadatan_pemukiman);
      }
    }
    else if (disasterType === 'Kebakaran') {
      if (excelData.status_das && excelData.status_das.length > 0) {
        await insertStatusDasKebakaran(dbClient, kejadianId, excelData.status_das);
      }
      if (excelData.tutupan_das && excelData.tutupan_das.length > 0) {
        await insertTutupanDas(dbClient, kejadianId, excelData.tutupan_das);
      }
      if (excelData.kemiringan_lahan) {
        await insertKemiringanLahan(dbClient, kejadianId, excelData.kemiringan_lahan);
      }
      if (excelData.kepadatan_pemukiman && excelData.kepadatan_pemukiman.length > 0) {
        await insertKepadatanPemukiman(dbClient, kejadianId, excelData.kepadatan_pemukiman);
      }
    }
    else if (disasterType === 'Longsor') {
      if (excelData.curah_hujan && excelData.curah_hujan.length > 0) {
        await insertCurahHujan(dbClient, kejadianId, excelData.curah_hujan);
      }
      if (excelData.kemiringan_lereng && excelData.kemiringan_lereng.length > 0) {
        await insertKemiringanLereng(dbClient, kejadianId, excelData.kemiringan_lereng);
      }
      if (excelData.topografi && excelData.topografi.length > 0) {
        await insertTopografi(dbClient, kejadianId, excelData.topografi);
      }
      if (excelData.geologi && excelData.geologi.length > 0) {
        await insertGeologi(dbClient, kejadianId, excelData.geologi);
      }
      if (excelData.jenis_tanah && excelData.jenis_tanah.length > 0) {
        await insertJenisTanah(dbClient, kejadianId, excelData.jenis_tanah);
      }
      if (excelData.patahan && excelData.patahan.length > 0) {
        await insertPatahan(dbClient, kejadianId, excelData.patahan);
      }
      if (excelData.tutupan_lahan && excelData.tutupan_lahan.length > 0) {
        await insertTutupanLahan(dbClient, kejadianId, excelData.tutupan_lahan);
      }
      if (excelData.infrastruktur && excelData.infrastruktur.length > 0) {
        await insertInfrastruktur(dbClient, kejadianId, excelData.infrastruktur);
      }
      if (excelData.kepadatan_pemukiman && excelData.kepadatan_pemukiman.length > 0) {
        await insertKepadatanPemukiman(dbClient, kejadianId, excelData.kepadatan_pemukiman);
      }
    }

    await dbClient.query('COMMIT');

    invalidateRiskCache({
      disaster_type: disasterType,
      provinsi, kabupaten, kecamatan, kelurahan, das
    });
    
    res.status(201).json({
      success: true,
      message: 'Laporan kejadian dan data detail berhasil disimpan',
      data: {
        id: kejadianId,
        created_at: kejadianResult.rows[0].created_at,
        coordinates: {
          longitude: lngRounded,
          latitude: latRounded
        },
        thumbnail_url: thumbnailPath ? `/uploads/${thumbnailPath}` : null,
        images_urls: imagesPaths.map(p => `/uploads/${p}`),
        excel_data_processed: Object.keys(excelData).length > 0,
        data_korban_processed: dataKorban !== null
      }
    });

  } catch (error) {
    if (dbClient) await dbClient.query('ROLLBACK');
    console.error('Error saving kejadian:', error);
    
    // Clean up uploaded files if database insert fails
    if (req.files) {
      const allFiles = [
        ...(req.files.thumbnail || []),
        ...(req.files.images || []),
        ...(req.files.dataFiles || [])
      ];
      
      allFiles.forEach(file => {
        const filePath = path.join(uploadDir, file.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error('Error deleting file:', e);
          }
        }
      });
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  } finally {
    if (dbClient) dbClient.release();
  }
});

  app.get('/api/kerawanan/chart-data', async (req, res) => {
    try {
      const { disaster_type, provinsi, kabupaten, kecamatan, kelurahan, das } = req.query;

      if (!disaster_type) {
        return res.status(400).json({ error: 'disaster_type is required' });
      }

      // Build WHERE clause based on filters
      const conditions = ['LOWER(disaster_type) = LOWER($1)'];
      const params = [disaster_type];
      let paramIndex = 2;

      if (provinsi) {
        conditions.push(`LOWER(provinsi) = LOWER($${paramIndex})`);
        params.push(provinsi);
        paramIndex++;
      }
      if (kabupaten) {
        conditions.push(`LOWER(kabupaten) = LOWER($${paramIndex})`);
        params.push(kabupaten);
        paramIndex++;
      }
      if (kecamatan) {
        conditions.push(`LOWER(kecamatan) = LOWER($${paramIndex})`);
        params.push(kecamatan);
        paramIndex++;
      }
      if (kelurahan) {
        conditions.push(`LOWER(kelurahan) = LOWER($${paramIndex})`);
        params.push(kelurahan);
        paramIndex++;
      }
      if (das) {
        conditions.push(`LOWER(das) = LOWER($${paramIndex})`);
        params.push(das);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Get all kejadian IDs that match the filters
      const kejadianQuery = `SELECT id FROM kejadian WHERE ${whereClause}`;
      const kejadianResult = await client.query(kejadianQuery, params);
      const kejadianIds = kejadianResult.rows.map(row => row.id);

      if (kejadianIds.length === 0) {
        return res.json({
          success: true,
          disaster_type,
          data: {},
          kejadian_count: 0
        });
      }

      // Aggregate data based on disaster type
      let aggregatedData = {};

      if (disaster_type === 'Banjir') {
        aggregatedData = await aggregateBanjirData(kejadianIds);
      } else if (disaster_type === 'Kebakaran') {
        aggregatedData = await aggregateKebakaranData(kejadianIds);
      } else if (disaster_type === 'Longsor') {
        aggregatedData = await aggregateLongsorData(kejadianIds);
      }

      res.json({
        success: true,
        disaster_type,
        data: aggregatedData,
        kejadian_count: kejadianIds.length
      });

    } catch (error) {
      console.error('Error fetching kerawanan chart data:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: error.message 
      });
    }
  });

  app.get('/api/kejadian/year-stats', async (req, res) => {
  try {
    const { disaster_type, provinsi, das, start_year, end_year } = req.query;
    
    console.log('📊 Year stats request:', { disaster_type, provinsi, das, start_year, end_year });
    
    if (!disaster_type) {
      return res.status(400).json({ error: 'disaster_type is required' });
    }
    
    let query = `
      SELECT 
        EXTRACT(YEAR FROM incident_date) as year,
        COUNT(*) as count
      FROM kejadian
      WHERE disaster_type = $1
        AND incident_date IS NOT NULL
    `;
    
    const params = [disaster_type];
    let paramIndex = 2;
    
    // Add location filters
    if (provinsi) {
      query += ` AND provinsi = $${paramIndex}`;
      params.push(provinsi);
      paramIndex++;
    }
    
    if (das) {
      query += ` AND das = $${paramIndex}`;
      params.push(das);
      paramIndex++;
    }
    
    // Add year range filter
    if (start_year) {
      query += ` AND EXTRACT(YEAR FROM incident_date) >= $${paramIndex}`;
      params.push(parseInt(start_year));
      paramIndex++;
    }
    
    if (end_year) {
      query += ` AND EXTRACT(YEAR FROM incident_date) <= $${paramIndex}`;
      params.push(parseInt(end_year));
      paramIndex++;
    }
    
    query += `
      GROUP BY EXTRACT(YEAR FROM incident_date)
      ORDER BY year
    `;
    
    console.log('🔍 Executing query:', query);
    console.log('📝 With params:', params);
    
    const result = await client.query(query, params);
    
    const formattedResults = result.rows.map(row => ({
      year: parseInt(row.year),
      count: parseInt(row.count)
    }));
    
    console.log('✅ Year stats results:', formattedResults);
    
    res.json(formattedResults);
  } catch (error) {
    console.error('❌ Error fetching year stats:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      detail: error.detail || 'No additional details'
    });
  }
});

// ================= Endpoint untuk monthly statistics ================
app.get('/api/kejadian/monthly-stats', async (req, res) => {
  try {
    const { disaster_type, provinsi, das, year } = req.query;
    
    console.log('📅 Monthly stats request:', { disaster_type, provinsi, das, year });
    
    if (!disaster_type || !year) {
      return res.status(400).json({ error: 'disaster_type and year are required' });
    }
    
    let query = `
      SELECT 
        EXTRACT(MONTH FROM incident_date) as month,
        COUNT(*) as count
      FROM kejadian
      WHERE disaster_type = $1
        AND EXTRACT(YEAR FROM incident_date) = $2
        AND incident_date IS NOT NULL
    `;
    
    const params = [disaster_type, parseInt(year)];
    let paramIndex = 3;
    
    // Add location filters
    if (provinsi) {
      query += ` AND provinsi = $${paramIndex}`;
      params.push(provinsi);
      paramIndex++;
    }
    
    if (das) {
      query += ` AND das = $${paramIndex}`;
      params.push(das);
      paramIndex++;
    }
    
    query += `
      GROUP BY EXTRACT(MONTH FROM incident_date)
      ORDER BY month
    `;
    
    console.log('🔍 Executing query:', query);
    console.log('📝 With params:', params);
    
    const result = await client.query(query, params);
    
    const formattedResults = result.rows.map(row => ({
      month: parseInt(row.month),
      count: parseInt(row.count)
    }));
    
    console.log('✅ Monthly stats results:', formattedResults);
    
    res.json(formattedResults);
  } catch (error) {
    console.error('❌ Error fetching monthly stats:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      detail: error.detail || 'No additional details'
    });
  }
});

  app.get('/api/kejadian/impact-stats', async (req, res) => {
  try {
    const { disaster_type, provinsi, das, year } = req.query;
    
    console.log('📊 Impact stats request:', { disaster_type, provinsi, das, year });
    
    if (!disaster_type || !year) {
      return res.status(400).json({ error: 'disaster_type and year are required' });
    }
    
    let query = `
      SELECT 
        COALESCE(SUM(korban_meninggal), 0)::integer as total_meninggal,
        COALESCE(SUM(korban_luka_luka), 0)::integer as total_luka,
        COALESCE(SUM(korban_mengungsi), 0)::integer as total_mengungsi,
        COALESCE(SUM(rumah_rusak_ringan), 0)::integer as total_rusak_ringan,
        COALESCE(SUM(rumah_rusak_sedang), 0)::integer as total_rusak_sedang,
        COALESCE(SUM(rumah_rusak_berat), 0)::integer as total_rusak_berat,
        COALESCE(SUM(rumah_rusak_terendam), 0)::integer as total_terendam,
        COALESCE(SUM(infrastruktur_rusak_ringan), 0)::integer as total_infra_ringan,
        COALESCE(SUM(infrastruktur_rusak_sedang), 0)::integer as total_infra_sedang,
        COALESCE(SUM(infrastruktur_rusak_berat), 0)::integer as total_infra_berat,
        COUNT(*)::integer as total_kejadian
      FROM kejadian
      WHERE disaster_type = $1
        AND EXTRACT(YEAR FROM incident_date) = $2
    `;
    
    const params = [disaster_type, parseInt(year)];
    let paramIndex = 3;
    
    if (provinsi) {
      query += ` AND provinsi = $${paramIndex}`;
      params.push(provinsi);
      paramIndex++;
    } else if (das) {
      query += ` AND das = $${paramIndex}`;
      params.push(das);
    }
    
    console.log('🔍 Executing query:', query);
    console.log('📝 With params:', params);
    
    const result = await client.query(query, params);
    
    console.log('✅ Impact stats results:', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching impact stats:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

  app.get('/api/kejadian/by-year', async (req, res) => {
  try {
    const { disaster_type, provinsi, das, year } = req.query;
    
    console.log('📍 Kejadian by year request:', { disaster_type, provinsi, das, year });
    
    if (!disaster_type || !year) {
      return res.status(400).json({ error: 'disaster_type and year are required' });
    }
    
    let query = `
      SELECT 
        id,
        disaster_type,
        title,
        description,
        incident_date,
        longitude,
        latitude,
        provinsi,
        kabupaten,
        kecamatan
      FROM kejadian
      WHERE disaster_type = $1
        AND EXTRACT(YEAR FROM incident_date) = $2
        AND longitude IS NOT NULL
        AND latitude IS NOT NULL
    `;
    
    const params = [disaster_type, parseInt(year)];
    let paramIndex = 3;
    
    if (provinsi) {
      query += ` AND provinsi = $${paramIndex}`;
      params.push(provinsi);
      paramIndex++;
    } else if (das) {
      query += ` AND das = $${paramIndex}`;
      params.push(das);
    }
    
    query += ` ORDER BY incident_date DESC`;
    
    console.log('🔍 Executing query:', query);
    console.log('📝 With params:', params);
    
    const result = await client.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} incidents for year ${year}`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching incidents by year:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

  app.get('/api/kejadian/:id/chart-data', async (req, res) => {
  try {
    const { id } = req.params;

    const kejadianQuery = 'SELECT disaster_type FROM kejadian WHERE id = $1';
    const kejadianResult = await client.query(kejadianQuery, [id]);

    if (kejadianResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kejadian not found' });
    }

    const disasterType = kejadianResult.rows[0].disaster_type;
    let chartData = {};

    if (disasterType === 'Banjir') {
      chartData = await getChartDataBanjir(id);
    } else if (disasterType === 'Kebakaran') {
      chartData = await getChartDataKebakaran(id);
    } else if (disasterType === 'Longsor') {
      chartData = await getChartDataLongsor(id);
    }

    res.json({
      success: true,
      disaster_type: disasterType,
      data: chartData
    });

  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
});

async function getChartDataBanjir(kejadianId) {
  const data = {};

  const chResult = await client.query(
    'SELECT jam, curah_hujan FROM curah_hujan WHERE kejadian_id = $1 AND jam IS NOT NULL ORDER BY jam',
    [kejadianId]
  );
  data.curah_hujan = chResult.rows;

  const dasResult = await client.query(
    'SELECT * FROM status_das_banjir WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.status_das = dasResult.rows;

  const tutupanResult = await client.query(
    'SELECT jenis_tutupan, persentase FROM tutupan_das WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.tutupan_das = tutupanResult.rows;

  const kemiringanResult = await client.query(
    'SELECT * FROM kemiringan_lahan WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.kemiringan_lahan = kemiringanResult.rows[0] || null;

  const kepadatanResult = await client.query(
    'SELECT * FROM kepadatan_pemukiman WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.kepadatan_pemukiman = kepadatanResult.rows;

  return data;
}

async function getChartDataKebakaran(kejadianId) {
  const data = {};

  const dasResult = await client.query(
    'SELECT * FROM status_das_kebakaran WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.status_das = dasResult.rows;

  const tutupanResult = await client.query(
    'SELECT jenis_tutupan, persentase FROM tutupan_das WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.tutupan_das = tutupanResult.rows;

  const kemiringanResult = await client.query(
    'SELECT * FROM kemiringan_lahan WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.kemiringan_lahan = kemiringanResult.rows[0] || null;

  const kepadatanResult = await client.query(
    'SELECT * FROM kepadatan_pemukiman WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.kepadatan_pemukiman = kepadatanResult.rows;

  return data;
}

async function getChartDataLongsor(kejadianId) {
  const data = {};

  const chResult = await client.query(
    'SELECT hari, curah_hujan FROM curah_hujan WHERE kejadian_id = $1 AND jam IS NULL ORDER BY hari',
    [kejadianId]
  );
  data.curah_hujan = chResult.rows;

  const lerengResult = await client.query(
    'SELECT * FROM kemiringan_lereng WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.kemiringan_lereng = lerengResult.rows;

  const topoResult = await client.query(
    'SELECT * FROM topografi WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.topografi = topoResult.rows;

  const geoResult = await client.query(
    'SELECT * FROM geologi WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.geologi = geoResult.rows;

  const tanahResult = await client.query(
    'SELECT jenis_tanah, persentase FROM jenis_tanah WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.jenis_tanah = tanahResult.rows;

  const patahanResult = await client.query(
    'SELECT * FROM patahan WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.patahan = patahanResult.rows;

  const tutupanResult = await client.query(
    'SELECT jenis_tutupan, persentase FROM tutupan_lahan WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.tutupan_lahan = tutupanResult.rows;

  const infraResult = await client.query(
    'SELECT * FROM infrastruktur WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.infrastruktur = infraResult.rows;

  const kepadatanResult = await client.query(
    'SELECT * FROM kepadatan_pemukiman WHERE kejadian_id = $1',
    [kejadianId]
  );
  data.kepadatan_pemukiman = kepadatanResult.rows;

  return data;
}

// UPDATED ENDPOINT: Yearly stats without report_type
app.get('/api/kejadian/yearly-stats', async (req, res) => {
  try {
    const { disaster_type, provinsi, das } = req.query;
    
    let query = `
      SELECT 
        EXTRACT(YEAR FROM incident_date) as year,
        COUNT(*) as count
      FROM kejadian
      WHERE incident_date IS NOT NULL
    `;
    
    const params = [];
    
    // Add filters based on query parameters - removed report_type filter
    if (disaster_type) {
      query += ` AND disaster_type = $${params.length + 1}`;
      params.push(disaster_type);
    }
    
    // Prioritize DAS if provided, otherwise use provinsi
    if (das) {
      query += ` AND das = $${params.length + 1}`;
      params.push(das);
    } else if (provinsi) {
      query += ` AND provinsi = $${params.length + 1}`;
      params.push(provinsi);
    }
    
    query += `
      GROUP BY EXTRACT(YEAR FROM incident_date)
      ORDER BY year ASC
    `;
    
    const result = await client.query(query, params);
    
    // Transform data to include years with 0 counts
    const currentYear = new Date().getFullYear();
    const yearlyStats = [];
    
    // Create array of last 10 years (current year - 9 to current year)
    for (let year = currentYear - 9; year <= currentYear; year++) {
      const existingData = result.rows.find(row => parseInt(row.year) === year);
      yearlyStats.push({
        year: year,
        count: existingData ? parseInt(existingData.count) : 0
      });
    }
        
    res.json(yearlyStats);
    
  } catch (error) {
    console.error('Error fetching yearly statistics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// FIXED: Kejadian endpoint dengan parameter placeholder yang benar
app.get('/api/kejadian', async (req, res) => {
  try {
    // let query = `
    //   SELECT 
    //     id, thumbnail_path, images_paths, disaster_type,
    //     provinsi, kabupaten, kecamatan, kelurahan, das, title, description, incident_date,
    //     longitude, latitude, created_at, updated_at,
    //     curah_hujan, korban_meninggal, korban_luka_luka, korban_mengungsi,
    //     rumah_rusak_berat, rumah_rusak_sedang, rumah_rusak_ringan, rumah_rusak_terendam,
    //     infrastruktur_rusak_berat, infrastruktur_rusak_sedang, infrastruktur_rusak_ringan,
    //     dampak_kebakaran, luas_lokasi_kejadian, kejadian_ke,
    //     ST_AsGeoJSON(geom) as geometry_json
    //   FROM kejadian
    // `;
    
    let query = `
      SELECT 
        id, thumbnail_path, images_paths, disaster_type,
        provinsi, kabupaten, kecamatan, kelurahan, das, title, description, incident_date,
        longitude, latitude, created_at, updated_at,
        korban_meninggal, korban_luka_luka, korban_mengungsi,
        rumah_rusak_berat, rumah_rusak_sedang, rumah_rusak_ringan, rumah_rusak_terendam,
        infrastruktur_rusak_berat, infrastruktur_rusak_sedang, infrastruktur_rusak_ringan,
        dampak_kebakaran, luas_lokasi_kejadian, kejadian_ke,
        ST_AsGeoJSON(geom) as geometry_json
      FROM kejadian
    `;

    const params = [];
    const conditions = [];
    
    // FIXED: Added $ to all parameter placeholders
    if (req.query.id) {
      conditions.push(`id = $${params.length + 1}`);
      params.push(req.query.id);
    }
    
    if (req.query.provinsi) {
      conditions.push(`provinsi = $${params.length + 1}`);
      params.push(req.query.provinsi);
    }
    
    // if (req.query.kabupaten) {
    //   conditions.push(`kabupaten = $${params.length + 1}`);
    //   params.push(req.query.kabupaten);
    // }
    
    // if (req.query.kecamatan) {
    //   conditions.push(`kecamatan = $${params.length + 1}`);
    //   params.push(req.query.kecamatan);
    // }
    
    // if (req.query.kelurahan) {
    //   conditions.push(`kelurahan = $${params.length + 1}`);
    //   params.push(req.query.kelurahan);
    // }
    
    if (req.query.das) {
      conditions.push(`das = $${params.length + 1}`);
      params.push(req.query.das);
    }
    
    if (req.query.disaster_type) {
      conditions.push(`disaster_type = $${params.length + 1}`);
      params.push(req.query.disaster_type);
    }
    
    if (req.query.start_date) {
      conditions.push(`incident_date >= $${params.length + 1}`);
      params.push(req.query.start_date);
    }
    
    if (req.query.end_date) {
      conditions.push(`incident_date <= $${params.length + 1}`);
      params.push(req.query.end_date);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC LIMIT 1000';
    
    
    const result = await client.query(query, params);
    // Transform data to include full URLs for images
    const kejadianData = result.rows.map(row => ({
      ...row,
      thumbnail_url: row.thumbnail_path ? `/uploads/${row.thumbnail_path}` : null,
      images_urls: row.images_paths ? row.images_paths.map(path => `/uploads/${path}`) : []
    }));
    
    res.json(kejadianData);
    
  } catch (error) {
    console.error('Error fetching kejadian:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// NEW ENDPOINT: Get kejadian as GeoJSON features
app.get('/api/layers/kejadian', async (req, res) => {
  try {
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM kejadian
    `;
    
    const params = [];
    const conditions = [];
    
    if (req.query.provinsi) {
      conditions.push(`provinsi = $${params.length + 1}`);
      params.push(req.query.provinsi);
    }
    
    if (req.query.disaster_type) {
      conditions.push(`disaster_type = $${params.length + 1}`);
      params.push(req.query.disaster_type);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' LIMIT 1000';

    const result = await client.query(query, params);
    const features = createFeatures(result.rows, 'kejadian');
    
    res.json(features);
    
  } catch (error) {
    console.error('Error fetching kejadian features:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// UPDATED ENDPOINT: Get single kejadian by ID
app.get('/api/kejadian/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id, thumbnail_path, images_paths, disaster_type,
        provinsi, kabupaten, kecamatan, kelurahan, das, title, description, incident_date,
        longitude, latitude, created_at, updated_at,
        korban_meninggal, korban_luka_luka, korban_mengungsi,
        rumah_rusak_berat, rumah_rusak_sedang, rumah_rusak_ringan, rumah_rusak_terendam,
        infrastruktur_rusak_berat, infrastruktur_rusak_sedang, infrastruktur_rusak_ringan,
        dampak_kebakaran, luas_lokasi_kejadian, kejadian_ke,
        ST_AsGeoJSON(geom) as geometry_json
      FROM kejadian
      WHERE id = $1
    `;
    
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kejadian not found' });
    }
    
    // Transform data to include full URLs for images
    const kejadianData = {
      ...result.rows[0],
      thumbnail_url: result.rows[0].thumbnail_path ? `/uploads/${result.rows[0].thumbnail_path}` : null,
      images_urls: result.rows[0].images_paths ? result.rows[0].images_paths.map(path => `/uploads/${path}`) : []
    };
    
    res.json(kejadianData);
    
  } catch (error) {
    console.error('Error fetching kejadian by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// UPDATED ENDPOINT: Delete kejadian dengan cache invalidation

// app.delete('/api/kejadian/:id', async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id || isNaN(parseInt(id))) {
//       return res.status(400).json({ 
//         error: 'Invalid kejadian ID'
//       });
//     }

//     // Get the kejadian data first untuk cache invalidation
//     const selectQuery = 'SELECT * FROM kejadian WHERE id = $1';
//     const selectResult = await client.query(selectQuery, [id]);

//     if (selectResult.rows.length === 0) {
//       return res.status(404).json({ 
//         error: 'Kejadian not found'
//       });
//     }

//     const kejadianData = selectResult.rows[0];

//     // Delete the record from database

//     const deleteQuery = 'DELETE FROM kejadian WHERE id = $1 RETURNING id, title, disaster_type';
//     const deleteResult = await client.query(deleteQuery, [id]);

//     if (deleteResult.rows.length === 0) {
//       return res.status(404).json({ 
//         error: 'Failed to delete kejadian'
//       });
//     }

//     const deletedKejadian = deleteResult.rows[0];

//     // TAMBAHAN: Invalidate risk cache setelah menghapus kejadian
//     invalidateRiskCache({
//       disaster_type: kejadianData.disaster_type,
//       provinsi: kejadianData.provinsi,
//       kabupaten: kejadianData.kabupaten, 
//       kecamatan: kejadianData.kecamatan,
//       kelurahan: kejadianData.kelurahan,
//       das: kejadianData.das
//     });

//     // Clean up associated files
//     const filesToDelete = [];

//     if (kejadianData.thumbnail_path) {
//       filesToDelete.push(kejadianData.thumbnail_path);
//     }

//     if (kejadianData.images_paths && Array.isArray(kejadianData.images_paths)) {
//       filesToDelete.push(...kejadianData.images_paths);
//     }

//     if (filesToDelete.length > 0) {
//       deleteFiles(filesToDelete);
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Kejadian berhasil dihapus',
//       data: {
//         id: deletedKejadian.id,
//         title: deletedKejadian.title,
//         disaster_type: deletedKejadian.disaster_type,
//         files_deleted: filesToDelete.length,
//         cache_invalidated: true
//       }
//     });

//   } catch (error) {
//     console.error('Error deleting kejadian:', error);
//     res.status(500).json({ 
//       error: 'Internal Server Error',
//       message: error.message 
//     });
//   }
// });

app.delete('/api/kejadian/:id', async (req, res) => {
  let dbClient;
  
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid kejadian ID'
      });
    }

    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    // Get the kejadian data first untuk cache invalidation dan file cleanup
    const selectQuery = 'SELECT * FROM kejadian WHERE id = $1';
    const selectResult = await dbClient.query(selectQuery, [id]);

    if (selectResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Kejadian not found'
      });
    }

    const kejadianData = selectResult.rows[0];

    // Delete the record from database (CASCADE akan otomatis delete related tables)
    const deleteQuery = 'DELETE FROM kejadian WHERE id = $1 RETURNING id, title, disaster_type';
    const deleteResult = await dbClient.query(deleteQuery, [id]);

    if (deleteResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Failed to delete kejadian'
      });
    }

    const deletedKejadian = deleteResult.rows[0];

    await dbClient.query('COMMIT');

    // Invalidate risk cache setelah commit berhasil
    invalidateRiskCache({
      disaster_type: kejadianData.disaster_type,
      provinsi: kejadianData.provinsi,
      kabupaten: kejadianData.kabupaten, 
      kecamatan: kejadianData.kecamatan,
      kelurahan: kejadianData.kelurahan,
      das: kejadianData.das
    });

    // Clean up associated files setelah commit berhasil
    const filesToDelete = [];

    if (kejadianData.thumbnail_path) {
      filesToDelete.push(kejadianData.thumbnail_path);
    }

    if (kejadianData.images_paths && Array.isArray(kejadianData.images_paths)) {
      filesToDelete.push(...kejadianData.images_paths);
    }

    if (filesToDelete.length > 0) {
      deleteFiles(filesToDelete);
    }

    res.status(200).json({
      success: true,
      message: 'Kejadian dan semua data terkait berhasil dihapus (CASCADE)',
      data: {
        id: deletedKejadian.id,
        title: deletedKejadian.title,
        disaster_type: deletedKejadian.disaster_type,
        files_deleted: filesToDelete.length,
        cache_invalidated: true
      }
    });

  } catch (error) {
    if (dbClient) await dbClient.query('ROLLBACK');
    console.error('Error deleting kejadian:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  } finally {
    if (dbClient) dbClient.release();
  }
});

// TAMBAHAN: NEW ENDPOINT untuk trigger manual refresh risk analysis

app.post('/api/risk-analysis/refresh', async (req, res) => {
  try {
    const { disaster_type, provinsi, kabupaten, kecamatan, kelurahan, das, action } = req.body;

    if (!disaster_type) {
      return res.status(400).json({ 
        error: 'disaster_type is required' 
      });
    }

    // Invalidate affected cache entries
    invalidateRiskCache({
      disaster_type, provinsi, kabupaten, kecamatan, kelurahan, das
    });

    // Optional: Bisa tambahkan pre-warming cache untuk area yang sering diakses
    const popularAreas = [];

    if (provinsi) {
      popularAreas.push({ 
        disaster_type, 
        level: 'Provinsi', 
        location_name: provinsi 
      });
    }

    if (kabupaten) {
      popularAreas.push({ 
        disaster_type, 
        level: 'Kabupaten/Kota', 
        location_name: kabupaten 
      });
    }

    // Pre-warm cache untuk area populer (optional)
    let preWarmedCount = 0;
    for (const area of popularAreas) {
      try {

        // Simulate cache warming dengan memanggil risk analysis
        const cacheKey = `${area.disaster_type}|${area.level}|${area.location_name}`;
        if (!riskAnalysisCache.has(cacheKey)) {
          // Bisa panggil fungsi risk analysis di sini untuk cache warming
          preWarmedCount++;
        }
      } catch (warmingError) {
        console.warn('Cache warming failed for area:', area, warmingError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Risk analysis refresh completed',
      details: {
        action: action || 'manual_refresh',
        disaster_type,
        affected_areas: { provinsi, kabupaten, kecamatan, kelurahan, das },
        cache_entries_cleared: riskAnalysisCache.size,
        cache_entries_prewarmed: preWarmedCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in risk analysis refresh:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
});

// Helper function to delete files (unchanged)
const deleteFiles = (filePaths) => {
  if (!filePaths) return;
  const pathsArray = Array.isArray(filePaths) ? filePaths : [filePaths];
  pathsArray.forEach(filePath => {
    if (filePath) {
      const fullPath = path.join(uploadDir, filePath);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (error) {
        console.error(`Error deleting file ${fullPath}:`, error);
      }
    }
  });
};

// Layer endpoints dengan filtering - TETAP MENGGUNAKAN REFERENCE_MAPPING
app.get('/api/layers/provinsi', async (req, res) => {
  try {
    
    let query = `
      SELECT 
        gid, kode_prov, provinsi, fid,
        ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM provinsi
    `;
    
    const params = [];
    let appliedFilter = 'none';
    
    if (req.query.provinsi) {
      query += buildWhereClause('provinsi', req.query.provinsi, params);
      appliedFilter = `provinsi: ${req.query.provinsi}`;
    }
    
    query += ' ORDER BY provinsi LIMIT 1000';

    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'provinsi');
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching provinsi:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'provinsi'
    });
  }
});

// TAMBAHAN: Endpoints untuk kab_kota dan kecamatan (yang belum ada)
app.get('/api/layers/kab_kota', async (req, res) => {
  try {
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM kab_kota
    `;
    
    const params = [];
    if (req.query.kab_kota) {
      query += buildWhereClause('kab_kota', req.query.kab_kota, params);
    } else if (req.query.provinsi) {
      query += buildWhereClause('provinsi', req.query.provinsi, params);
    }
    
    query += ' LIMIT 1000';

    const result = await client.query(query, params);
    const features = createFeatures(result.rows, 'kab_kota');
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching kab_kota:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/layers/kecamatan', async (req, res) => {
  try {
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM kecamatan
    `;
    
    const params = [];
    if (req.query.kecamatan) {
      query += buildWhereClause('kecamatan', req.query.kecamatan, params);
    } else if (req.query.kab_kota) {
      query += buildWhereClause('kab_kota', req.query.kab_kota, params);
    }
    
    query += ' LIMIT 1000';

    const result = await client.query(query, params);
    const features = createFeatures(result.rows, 'kecamatan');
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching kecamatan:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PERBAIKAN 2: Endpoint DAS dengan error handling yang lebih baik
app.get('/api/layers/das', async (req, res) => {
  try {
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM das
    `;
    
    const params = [];
    let appliedFilter = 'none';
    
    if (req.query.nama_das) {
      query += buildWhereClause('nama_das', req.query.nama_das, params);
      appliedFilter = `nama_das: ${req.query.nama_das}`;
    }
    
    query += ' ORDER BY nama_das LIMIT 1000';

    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'das');
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching das:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'das'
    });
  }
});

// Endpoint lahan_kritis - MENGGUNAKAN REFERENCE_MAPPING
app.get('/api/layers/lahan_kritis', async (req, res) => {
  try {
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM lahan_kritis
    `;
    
    const params = [];
    let appliedFilter = 'none';
    
    if (req.query.filterType === 'province' && req.query.provinceName) {
      
      // Check if REFERENCE_MAPPING exists and has the required data
      if (!REFERENCE_MAPPING || !REFERENCE_MAPPING.lahan_kritis || !REFERENCE_MAPPING.lahan_kritis.provinsi_to_bpdas) {
        console.error('REFERENCE_MAPPING.lahan_kritis.provinsi_to_bpdas not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available',
          message: 'lahan_kritis provinsi mapping not configured'
        });
      }
      
      const bpdasValue = REFERENCE_MAPPING.lahan_kritis.provinsi_to_bpdas[req.query.provinceName];
      
      if (bpdasValue) {
        query += buildWhereClause('bpdas', bpdasValue, params);
        appliedFilter = `province: ${req.query.provinceName} -> bpdas: ${JSON.stringify(bpdasValue)}`;
      } else {
        return res.json([]); // Return empty if no mapping
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      
      if (!REFERENCE_MAPPING || !REFERENCE_MAPPING.lahan_kritis || !REFERENCE_MAPPING.lahan_kritis.das_to_bpdas) {
        console.error('REFERENCE_MAPPING.lahan_kritis.das_to_bpdas not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available',
          message: 'lahan_kritis DAS mapping not configured'
        });
      }
      
      const bpdasValue = REFERENCE_MAPPING.lahan_kritis.das_to_bpdas[req.query.dasName];
      
      if (bpdasValue) {
        query += buildWhereClause('bpdas', bpdasValue, params);
        appliedFilter = `das: ${req.query.dasName} -> bpdas: ${JSON.stringify(bpdasValue)}`;
      } else {
        return res.json([]); // Return empty if no mapping
      }
    }
    
    query += ' LIMIT 1000';

    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'lahan_kritis');
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching lahan_kritis:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'lahan_kritis'
    });
  }
});

// PERBAIKAN 4: Endpoint penutupan_lahan_2024 dengan error handling yang lebih baik
app.get('/api/layers/penutupan_lahan_2024', async (req, res) => {
  try {
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM penutupan_lahan_2024
    `;
    
    const params = [];
    let appliedFilter = 'none';
    
    if (req.query.filterType === 'province' && req.query.provinceName) {
      
      // Direct lookup kode_prov dari tabel provinsi
      try {
        const provinceCodeQuery = await client.query('SELECT kode_prov FROM provinsi WHERE provinsi = $1', [req.query.provinceName]);
        
        if (provinceCodeQuery.rows.length > 0) {
          const kodeProvValue = provinceCodeQuery.rows[0].kode_prov;
          query += buildWhereClause('kode_prov', kodeProvValue, params);
          appliedFilter = `province: ${req.query.provinceName} -> kode_prov: ${kodeProvValue}`;
        } else {
          return res.json([]); // Return empty if province not found
        }
      } catch (provinceError) {
        console.error('Error looking up province code:', provinceError);
        return res.status(500).json({ 
          error: 'Province lookup failed',
          message: provinceError.message
        });
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      
      if (!REFERENCE_MAPPING || !REFERENCE_MAPPING.penutupan_lahan_2024 || !REFERENCE_MAPPING.penutupan_lahan_2024.das_to_kode_prov) {
        console.error('REFERENCE_MAPPING.penutupan_lahan_2024.das_to_kode_prov not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available',
          message: 'penutupan_lahan_2024 DAS mapping not configured'
        });
      }
      
      const kodeProv = REFERENCE_MAPPING.penutupan_lahan_2024.das_to_kode_prov[req.query.dasName];
      
      if (kodeProv) {
        query += buildWhereClause('kode_prov', kodeProv, params);
        appliedFilter = `das: ${req.query.dasName} -> kode_prov: ${JSON.stringify(kodeProv)}`;
      } else {
        return res.json([]); // Return empty if no mapping
      }
    }
    
    query += ' LIMIT 1000';

    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'penutupan_lahan_2024');
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching penutupan_lahan_2024:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'penutupan_lahan_2024'
    });
  }
});

// Endpoint rawan_erosi - MENGGUNAKAN REFERENCE_MAPPING
app.get('/api/layers/rawan_erosi', async (req, res) => {
  try {
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM rawan_erosi
    `;
    
    const params = [];
    
    if (req.query.filterType === 'province' && req.query.provinceName) {
      const nBpdasValue = REFERENCE_MAPPING.rawan_erosi.provinsi_to_n_bpdas[req.query.provinceName];
      if (nBpdasValue) {
        query += buildWhereClause('n_bpdas', nBpdasValue, params);
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      const nBpdasValue = REFERENCE_MAPPING.rawan_erosi.das_to_n_bpdas[req.query.dasName];
      if (nBpdasValue) {
        query += buildWhereClause('n_bpdas', nBpdasValue, params);
      }
    }
    
    query += ' LIMIT 1000';

    const result = await client.query(query, params);
    const features = createFeatures(result.rows, 'rawan_erosi');
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching rawan_erosi:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint rawan_karhutla_2024 - MENGGUNAKAN REFERENCE_MAPPING
app.get('/api/layers/rawan_karhutla_2024', async (req, res) => {
  try {
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM rawan_karhutla_2024
    `;
    
    const params = [];
    
    if (req.query.filterType === 'province' && req.query.provinceName) {
      const provinsiValue = REFERENCE_MAPPING.rawan_karhutla_2024.provinsi_direct[req.query.provinceName];
      if (provinsiValue) {
        query += buildWhereClause('provinsi', provinsiValue, params);
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      const provinsiValue = REFERENCE_MAPPING.rawan_karhutla_2024.das_to_provinsi[req.query.dasName];
      if (provinsiValue) {
        query += buildWhereClause('provinsi', provinsiValue, params);
      }
    }
    
    query += ' LIMIT 1000';

    const result = await client.query(query, params);
    const features = createFeatures(result.rows, 'rawan_karhutla_2024');
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching rawan_karhutla_2024:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint rawan_limpasan - MENGGUNAKAN REFERENCE_MAPPING
app.get('/api/layers/rawan_limpasan', async (req, res) => {
  try {
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM rawan_limpasan
    `;
    
    const params = [];
    
    if (req.query.filterType === 'province' && req.query.provinceName) {
      const wilKerjaValue = REFERENCE_MAPPING.rawan_limpasan.provinsi_to_wil_kerja[req.query.provinceName];
      if (wilKerjaValue) {
        query += buildWhereClause('wil_kerja', wilKerjaValue, params);
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      const wilKerjaValue = REFERENCE_MAPPING.rawan_limpasan.das_to_wil_kerja[req.query.dasName];
      if (wilKerjaValue) {
        query += buildWhereClause('wil_kerja', wilKerjaValue, params);
      }
    }
    
    query += ' LIMIT 1000';

    const result = await client.query(query, params);
    const features = createFeatures(result.rows, 'rawan_limpasan');
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching rawan_limpasan:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// NEW: Endpoint lahan_kritis dengan year - MENGGUNAKAN REFERENCE_MAPPING
app.get('/api/layers/lahan_kritis/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM lahan_kritis
      WHERE tahun_data = $1
    `;
    
    const params = [parseInt(year)];
    let appliedFilter = `year: ${year}`;
    
    if (req.query.filterType === 'province' && req.query.provinceName) {
      if (!REFERENCE_MAPPING?.lahan_kritis?.provinsi_to_bpdas) {
        console.error('REFERENCE_MAPPING.lahan_kritis.provinsi_to_bpdas not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available',
          message: 'lahan_kritis provinsi mapping not configured'
        });
      }
      
      const bpdasValue = REFERENCE_MAPPING.lahan_kritis.provinsi_to_bpdas[req.query.provinceName];
      
      if (bpdasValue) {
        if (Array.isArray(bpdasValue)) {
          query += ` AND bpdas = ANY($${params.length + 1})`;
          params.push(bpdasValue);
        } else {
          query += ` AND bpdas = $${params.length + 1}`;
          params.push(bpdasValue);
        }
        appliedFilter += `, province: ${req.query.provinceName} -> bpdas: ${JSON.stringify(bpdasValue)}`;
      } else {
        return res.json([]);
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      if (!REFERENCE_MAPPING?.lahan_kritis?.das_to_bpdas) {
        console.error('REFERENCE_MAPPING.lahan_kritis.das_to_bpdas not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available',
          message: 'lahan_kritis DAS mapping not configured'
        });
      }
      
      const bpdasValue = REFERENCE_MAPPING.lahan_kritis.das_to_bpdas[req.query.dasName];
      
      if (bpdasValue) {
        if (Array.isArray(bpdasValue)) {
          query += ` AND bpdas = ANY($${params.length + 1})`;
          params.push(bpdasValue);
        } else {
          query += ` AND bpdas = $${params.length + 1}`;
          params.push(bpdasValue);
        }
        appliedFilter += `, das: ${req.query.dasName} -> bpdas: ${JSON.stringify(bpdasValue)}`;
      } else {
        return res.json([]);
      }
    }
    
    console.log('🔍 Fetching layer lahan_kritis for year', year);
    console.log('📋 Applied filters:', appliedFilter);
    console.log('📝 Executing query with params:', params);
    
    query += ' LIMIT 10000';
    
    const result = await client.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} record(s) in lahan_kritis for year ${year}`);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'lahan_kritis');
    res.json(features);
    
  } catch (error) {
    console.error('❌ Error fetching lahan_kritis with year:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'lahan_kritis/year'
    });
  }
});

// NEW: Endpoint penutupan_lahan_2024 dengan year
app.get('/api/layers/penutupan_lahan_2024/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM penutupan_lahan_2024
      WHERE tahun_data = $1
    `;
    
    const params = [parseInt(year)];
    let appliedFilter = `year: ${year}`;
    
    if (req.query.filterType === 'province' && req.query.provinceName) {
      try {
        const provinceCodeQuery = await client.query(
          'SELECT kode_prov FROM provinsi WHERE provinsi = $1 ORDER BY tahun_data DESC LIMIT 1', 
          [req.query.provinceName]
        );
        
        if (provinceCodeQuery.rows.length > 0) {
          const kodeProvValue = provinceCodeQuery.rows[0].kode_prov;
          query += ` AND kode_prov = $${params.length + 1}`;
          params.push(kodeProvValue);
          appliedFilter += `, province: ${req.query.provinceName} -> kode_prov: ${kodeProvValue}`;
        } else {
          return res.json([]);
        }
      } catch (provinceError) {
        console.error('Error looking up province code:', provinceError);
        return res.status(500).json({ 
          error: 'Province lookup failed',
          message: provinceError.message
        });
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      if (!REFERENCE_MAPPING?.penutupan_lahan_2024?.das_to_kode_prov) {
        console.error('REFERENCE_MAPPING.penutupan_lahan_2024.das_to_kode_prov not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available',
          message: 'penutupan_lahan_2024 DAS mapping not configured'
        });
      }
      
      const kodeProv = REFERENCE_MAPPING.penutupan_lahan_2024.das_to_kode_prov[req.query.dasName];
      
      if (kodeProv) {
        if (Array.isArray(kodeProv)) {
          query += ` AND kode_prov = ANY($${params.length + 1})`;
          params.push(kodeProv);
        } else {
          query += ` AND kode_prov = $${params.length + 1}`;
          params.push(kodeProv);
        }
        appliedFilter += `, das: ${req.query.dasName} -> kode_prov: ${JSON.stringify(kodeProv)}`;
      } else {
        return res.json([]);
      }
    }
    
    console.log('🔍 Fetching layer penutupan_lahan_2024 for year', year);
    console.log('📋 Applied filters:', appliedFilter);
    console.log('📝 Executing query with params:', params);
    
    query += ' LIMIT 10000';
    
    const result = await client.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} record(s) in penutupan_lahan_2024 for year ${year}`);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'penutupan_lahan_2024');
    res.json(features);
    
  } catch (error) {
    console.error('❌ Error fetching penutupan_lahan_2024 with year:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'penutupan_lahan_2024/year'
    });
  }
});

// NEW: Endpoint areal_karhutla_2024 dengan year (untuk Kebakaran - Kebencanaan)
app.get('/api/layers/areal_karhutla_2024/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM areal_karhutla_2024
      WHERE tahun_data = $1
    `;
    
    const params = [parseInt(year)];
    let appliedFilter = `year: ${year}`;
    
    // Note: areal_karhutla_2024 belum ada mapping di REFERENCE_MAPPING, 
    // jadi untuk sementara hanya filter by year
    // Ketika mapping sudah tersedia, bisa ditambahkan filter lokasi di sini
    
    console.log('🔍 Fetching layer areal_karhutla_2024 for year', year);
    console.log('📋 Applied filters:', appliedFilter);
    console.log('📝 Executing query with params:', params);
    
    query += ' LIMIT 10000';
    
    const result = await client.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} record(s) in areal_karhutla_2024 for year ${year}`);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'areal_karhutla_2024');
    res.json(features);
    
  } catch (error) {
    console.error('❌ Error fetching areal_karhutla_2024 with year:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'areal_karhutla_2024/year'
    });
  }
});

// NEW: Endpoint rawan_erosi dengan year
app.get('/api/layers/rawan_erosi/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM rawan_erosi
      WHERE tahun_data = $1
    `;
    
    const params = [parseInt(year)];
    let appliedFilter = `year: ${year}`;
    
    if (req.query.filterType === 'province' && req.query.provinceName) {
      if (!REFERENCE_MAPPING?.rawan_erosi?.provinsi_to_n_bpdas) {
        console.error('REFERENCE_MAPPING.rawan_erosi.provinsi_to_n_bpdas not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available'
        });
      }
      
      const nBpdasValue = REFERENCE_MAPPING.rawan_erosi.provinsi_to_n_bpdas[req.query.provinceName];
      
      if (nBpdasValue) {
        if (Array.isArray(nBpdasValue)) {
          query += ` AND n_bpdas = ANY($${params.length + 1})`;
          params.push(nBpdasValue);
        } else {
          query += ` AND n_bpdas = $${params.length + 1}`;
          params.push(nBpdasValue);
        }
        appliedFilter += `, province: ${req.query.provinceName} -> n_bpdas: ${JSON.stringify(nBpdasValue)}`;
      } else {
        return res.json([]);
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      if (!REFERENCE_MAPPING?.rawan_erosi?.das_to_n_bpdas) {
        console.error('REFERENCE_MAPPING.rawan_erosi.das_to_n_bpdas not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available'
        });
      }
      
      const nBpdasValue = REFERENCE_MAPPING.rawan_erosi.das_to_n_bpdas[req.query.dasName];
      
      if (nBpdasValue) {
        if (Array.isArray(nBpdasValue)) {
          query += ` AND n_bpdas = ANY($${params.length + 1})`;
          params.push(nBpdasValue);
        } else {
          query += ` AND n_bpdas = $${params.length + 1}`;
          params.push(nBpdasValue);
        }
        appliedFilter += `, das: ${req.query.dasName} -> n_bpdas: ${JSON.stringify(nBpdasValue)}`;
      } else {
        return res.json([]);
      }
    }
    
    console.log('🔍 Fetching layer rawan_erosi for year', year);
    console.log('📋 Applied filters:', appliedFilter);
    console.log('📝 Executing query with params:', params);
    
    query += ' LIMIT 10000';
    
    const result = await client.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} record(s) in rawan_erosi for year ${year}`);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'rawan_erosi');
    res.json(features);
    
  } catch (error) {
    console.error('❌ Error fetching rawan_erosi with year:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'rawan_erosi/year'
    });
  }
});

// NEW: Endpoint rawan_karhutla_2024 dengan year
app.get('/api/layers/rawan_karhutla_2024/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM rawan_karhutla_2024
      WHERE tahun_data = $1
    `;
    
    const params = [parseInt(year)];
    let appliedFilter = `year: ${year}`;
    
    if (req.query.filterType === 'province' && req.query.provinceName) {
      if (!REFERENCE_MAPPING?.rawan_karhutla_2024?.provinsi_direct) {
        console.error('REFERENCE_MAPPING.rawan_karhutla_2024.provinsi_direct not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available'
        });
      }
      
      const provinsiValue = REFERENCE_MAPPING.rawan_karhutla_2024.provinsi_direct[req.query.provinceName];
      
      if (provinsiValue) {
        query += ` AND provinsi = $${params.length + 1}`;
        params.push(provinsiValue);
        appliedFilter += `, province: ${req.query.provinceName} -> provinsi: ${provinsiValue}`;
      } else {
        return res.json([]);
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      if (!REFERENCE_MAPPING?.rawan_karhutla_2024?.das_to_provinsi) {
        console.error('REFERENCE_MAPPING.rawan_karhutla_2024.das_to_provinsi not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available'
        });
      }
      
      const provinsiValue = REFERENCE_MAPPING.rawan_karhutla_2024.das_to_provinsi[req.query.dasName];
      
      if (provinsiValue) {
        if (Array.isArray(provinsiValue)) {
          query += ` AND provinsi = ANY($${params.length + 1})`;
          params.push(provinsiValue);
        } else {
          query += ` AND provinsi = $${params.length + 1}`;
          params.push(provinsiValue);
        }
        appliedFilter += `, das: ${req.query.dasName} -> provinsi: ${JSON.stringify(provinsiValue)}`;
      } else {
        return res.json([]);
      }
    }
    
    console.log('🔍 Fetching layer rawan_karhutla_2024 for year', year);
    console.log('📋 Applied filters:', appliedFilter);
    console.log('📝 Executing query with params:', params);
    
    query += ' LIMIT 10000';
    
    const result = await client.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} record(s) in rawan_karhutla_2024 for year ${year}`);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'rawan_karhutla_2024');
    res.json(features);
    
  } catch (error) {
    console.error('❌ Error fetching rawan_karhutla_2024 with year:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'rawan_karhutla_2024/year'
    });
  }
});

// NEW: Endpoint rawan_limpasan dengan year
app.get('/api/layers/rawan_limpasan/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM rawan_limpasan
      WHERE tahun_data = $1
    `;
    
    const params = [parseInt(year)];
    let appliedFilter = `year: ${year}`;
    
    if (req.query.filterType === 'province' && req.query.provinceName) {
      if (!REFERENCE_MAPPING?.rawan_limpasan?.provinsi_to_wil_kerja) {
        console.error('REFERENCE_MAPPING.rawan_limpasan.provinsi_to_wil_kerja not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available'
        });
      }
      
      const wilKerjaValue = REFERENCE_MAPPING.rawan_limpasan.provinsi_to_wil_kerja[req.query.provinceName];
      
      if (wilKerjaValue) {
        if (Array.isArray(wilKerjaValue)) {
          query += ` AND wil_kerja = ANY($${params.length + 1})`;
          params.push(wilKerjaValue);
        } else {
          query += ` AND wil_kerja = $${params.length + 1}`;
          params.push(wilKerjaValue);
        }
        appliedFilter += `, province: ${req.query.provinceName} -> wil_kerja: ${JSON.stringify(wilKerjaValue)}`;
      } else {
        return res.json([]);
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      if (!REFERENCE_MAPPING?.rawan_limpasan?.das_to_wil_kerja) {
        console.error('REFERENCE_MAPPING.rawan_limpasan.das_to_wil_kerja not found');
        return res.status(500).json({ 
          error: 'Reference mapping not available'
        });
      }
      
      const wilKerjaValue = REFERENCE_MAPPING.rawan_limpasan.das_to_wil_kerja[req.query.dasName];
      
      if (wilKerjaValue) {
        if (Array.isArray(wilKerjaValue)) {
          query += ` AND wil_kerja = ANY($${params.length + 1})`;
          params.push(wilKerjaValue);
        } else {
          query += ` AND wil_kerja = $${params.length + 1}`;
          params.push(wilKerjaValue);
        }
        appliedFilter += `, das: ${req.query.dasName} -> wil_kerja: ${JSON.stringify(wilKerjaValue)}`;
      } else {
        return res.json([]);
      }
    }
    
    console.log('🔍 Fetching layer rawan_limpasan for year', year);
    console.log('📋 Applied filters:', appliedFilter);
    console.log('📝 Executing query with params:', params);
    
    query += ' LIMIT 10000';
    
    const result = await client.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} record(s) in rawan_limpasan for year ${year}`);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'rawan_limpasan');
    res.json(features);
    
  } catch (error) {
    console.error('❌ Error fetching rawan_limpasan with year:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'rawan_limpasan/year'
    });
  }
});

// NEW: Endpoint provinsi dengan year
app.get('/api/layers/provinsi/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM provinsi
      WHERE tahun_data = $1
    `;
    
    const params = [parseInt(year)];
    let appliedFilter = `year: ${year}`;
    
    // Filter by provinsi name if provided
    if (req.query.provinsi) {
      query += ` AND provinsi = $${params.length + 1}`;
      params.push(req.query.provinsi);
      appliedFilter += `, provinsi: ${req.query.provinsi}`;
    }
    
    console.log('🔍 Fetching provinsi with max year', year);
    console.log('📋 Applied filters:', appliedFilter);
    console.log('📝 Executing query with params:', params);
    
    const result = await client.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} provinsi(s) with max year ${year}`);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'provinsi');
    res.json(features);
    
  } catch (error) {
    console.error('❌ Error fetching provinsi with year:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'provinsi/year'
    });
  }
});

// NEW: Endpoint das dengan year
app.get('/api/layers/das/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM das
      WHERE tahun_data = $1
    `;
    
    const params = [parseInt(year)];
    let appliedFilter = `year: ${year}`;
    
    // Filter by das name if provided
    if (req.query.nama_das) {
      query += ` AND nama_das = $${params.length + 1}`;
      params.push(req.query.nama_das);
      appliedFilter += `, nama_das: ${req.query.nama_das}`;
    }
    
    console.log('🔍 Fetching das with year', year);
    console.log('📋 Applied filters:', appliedFilter);
    console.log('📝 Executing query with params:', params);
    
    const result = await client.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} das(s) with year ${year}`);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, 'das');
    res.json(features);
    
  } catch (error) {
    console.error('❌ Error fetching das with year:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: 'das/year'
    });
  }
});

// NEW ENDPOINTS for kab_kota and kecamatan layers
app.get('/api/filter/kabupaten', async (req, res) => {
  try {
    const result = await client.query('SELECT DISTINCT kab_kota FROM kab_kota WHERE kab_kota IS NOT NULL ORDER BY kab_kota');
    
    // Log first few records for debugging
    if (result.rows.length > 0) {
      console.log('📍 Sample kabupaten records:', result.rows.slice(0, 3));
    }
    
    // Filter out null/empty values
    const validRows = result.rows.filter(row => row.kab_kota && row.kab_kota.trim() !== '');
    
    res.json(validRows);
  } catch (error) {
    console.error('❌ Error fetching kabupaten/kota:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// UPDATED ENDPOINT: Get kecamatan data with better error handling
app.get('/api/filter/kecamatan', async (req, res) => {
  try {
    const result = await client.query('SELECT DISTINCT kecamatan FROM kecamatan WHERE kecamatan IS NOT NULL ORDER BY kecamatan');
    
    // Log first few records for debugging
    if (result.rows.length > 0) {
      
      // Check for null values in the results
      const nullCount = result.rows.filter(row => !row.kecamatan || row.kecamatan.trim() === '').length;
      if (nullCount > 0) {
        console.warn(`⚠️ Found ${nullCount} null/empty kecamatan records`);
      }
    }
    
    // Filter out null/empty values and ensure all are strings
    const validRows = result.rows.filter(row => {
      if (!row.kecamatan) {
        console.warn('⚠️ Found null kecamatan:', row);
        return false;
      }
      if (typeof row.kecamatan !== 'string') {
        console.warn('⚠️ Found non-string kecamatan:', typeof row.kecamatan, row);
        return false;
      }
      if (row.kecamatan.trim() === '') {
        console.warn('⚠️ Found empty kecamatan:', row);
        return false;
      }
      return true;
    });
    
    
    res.json(validRows);
  } catch (error) {
    console.error('❌ Error fetching kecamatan:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// UPDATED ENDPOINT: Get kelurahan/desa data with better error handling  
app.get('/api/filter/kelurahan', async (req, res) => {
  try {
    const result = await client.query('SELECT DISTINCT kel_desa FROM kel_desa WHERE kel_desa IS NOT NULL ORDER BY kel_desa');
    
    // Log first few records for debugging
    if (result.rows.length > 0) {
      console.log('📍 Sample kelurahan records:', result.rows.slice(0, 3));
    }
    
    // Filter out null/empty values
    const validRows = result.rows.filter(row => row.kel_desa && row.kel_desa.trim() !== '');
    
    res.json(validRows);
  } catch (error) {
    console.error('❌ Error fetching kelurahan:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// NEW ENDPOINT: Risk analysis based on kejadian data
app.get('/api/risk-analysis', async (req, res) => {
  try {
    const { disaster_type, level, location_name } = req.query;
    
    if (!disaster_type || !level || !location_name) {
      return res.status(400).json({ 
        error: 'Missing required parameters: disaster_type, level, location_name' 
      });
    }

    const cacheKey = `${disaster_type}|${level}|${location_name}`;

    // Check cache first
    if (riskAnalysisCache.has(cacheKey)) {
      const cachedData = riskAnalysisCache.get(cacheKey);
      // Check if cache is still fresh (5 minutes)
      if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
        return res.json(cachedData.features);
      } else {
        riskAnalysisCache.delete(cacheKey);
      }
    }

    let kejadianQuery;
    let layerQuery;
    let groupByField;
    let params = [];

    // Build queries based on level
    if (level === 'Indonesia') {
      // Level Indonesia - Show provinsi with incident counts
      groupByField = 'provinsi';
      
      // Query dengan UPPER() untuk case-insensitive matching
      kejadianQuery = `
        SELECT UPPER(TRIM(provinsi)) as provinsi, COUNT(*) as incident_count
        FROM kejadian 
        WHERE disaster_type = $1
          AND provinsi IS NOT NULL
          AND TRIM(provinsi) != ''
          AND incident_date >= CURRENT_DATE - INTERVAL '1 year'
        GROUP BY UPPER(TRIM(provinsi))
      `;
      params = [disaster_type];

      layerQuery = `
        SELECT UPPER(TRIM(provinsi)) as provinsi, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
        FROM provinsi
        WHERE provinsi IS NOT NULL
        ORDER BY provinsi
      `;
      
    } else if (level === 'Provinsi') {
      // Show kab_kota with incident counts from the selected provinsi
      groupByField = 'kabupaten';
      
      kejadianQuery = `
        SELECT kabupaten, COUNT(*) as incident_count
        FROM kejadian 
        WHERE disaster_type = $1 AND provinsi = $2
          AND incident_date >= CURRENT_DATE - INTERVAL '1 year'
        GROUP BY kabupaten
      `;
      params = [disaster_type, location_name];

      layerQuery = `
        SELECT kab_kota, provinsi, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
        FROM kab_kota 
        WHERE provinsi = $1
      `;
      
    } else if (level === 'Kabupaten/Kota') {
      // Show kecamatan with incident counts from the selected kab_kota
      groupByField = 'kecamatan';
      
      kejadianQuery = `
        SELECT kecamatan, COUNT(*) as incident_count
        FROM kejadian 
        WHERE disaster_type = $1 AND kabupaten = $2
          AND incident_date >= CURRENT_DATE - INTERVAL '1 year'
        GROUP BY kecamatan
      `;
      params = [disaster_type, location_name];

      layerQuery = `
        SELECT kecamatan, kab_kota, provinsi, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
        FROM kecamatan 
        WHERE kab_kota = $1
      `;
      
    } else if (level === 'Kecamatan') {
      // Show kel_desa with incident counts from the selected kecamatan
      groupByField = 'kelurahan';
      
      kejadianQuery = `
        SELECT kelurahan, COUNT(*) as incident_count
        FROM kejadian 
        WHERE disaster_type = $1 AND kecamatan = $2
          AND incident_date >= CURRENT_DATE - INTERVAL '1 year'
        GROUP BY kelurahan
      `;
      params = [disaster_type, location_name];

      layerQuery = `
        SELECT kel_desa, kecamatan, kab_kota, provinsi, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
        FROM kel_desa 
        WHERE kecamatan = $1
      `;
      
    } else if (level === 'DAS') {
      // Show areas within the DAS with incident counts
      groupByField = 'kelurahan';
      
      kejadianQuery = `
        SELECT kelurahan, kecamatan, kabupaten, COUNT(*) as incident_count
        FROM kejadian 
        WHERE disaster_type = $1 AND das = $2
          AND incident_date >= CURRENT_DATE - INTERVAL '1 year'
        GROUP BY kelurahan, kecamatan, kabupaten
      `;
      params = [disaster_type, location_name];

      layerQuery = `
        SELECT kel_desa, kecamatan, kab_kota, provinsi, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
        FROM kel_desa 
        WHERE kel_desa IN (
          SELECT DISTINCT kelurahan FROM kejadian WHERE das = $1
        )
      `;
    } else {
      return res.status(400).json({ error: 'Invalid level parameter' });
    }

    // Execute queries
    const layerParams = level === 'Indonesia' ? [] : [location_name];
    const [kejadianResult, layerResult] = await Promise.all([
      client.query(kejadianQuery, params),
      client.query(layerQuery, layerParams)
    ]);

    // Create incident count map
    const incidentMap = new Map();
    kejadianResult.rows.forEach(row => {
      let key;
      if (level === 'Indonesia') {
        // Untuk Indonesia, key adalah provinsi (sudah di-uppercase di query)
        key = row.provinsi;
      } else if (level === 'DAS') {
        key = row.kelurahan;
      } else {
        key = row[groupByField.toLowerCase()];
      }
      incidentMap.set(key, parseInt(row.incident_count));
    });

    // Create features with risk levels
    const features = layerResult.rows.map((row, index) => {
      const { geometry_json, geom, ...properties } = row;
      
      let geometry;
      try {
        geometry = JSON.parse(geometry_json);
      } catch (e) {
        console.error(`Error parsing geometry for row ${index}:`, e);
        return null;
      }

      // Get the appropriate field name for matching
      let matchField;
      if (level === 'Indonesia') {
        // Untuk Indonesia, matchField adalah provinsi (sudah di-uppercase)
        matchField = row.provinsi;
      } else if (level === 'Provinsi') {
        matchField = row.kab_kota;
      } else if (level === 'Kabupaten/Kota') {
        matchField = row.kecamatan;
      } else if (level === 'Kecamatan' || level === 'DAS') {
        matchField = row.kel_desa;
      }

      const incidentCount = incidentMap.get(matchField) || 0;
      
      console.log(`Feature matching: ${matchField} = ${incidentCount} incidents`); // Debug log
      
      // Determine risk level and color
      let riskLevel, riskColor;
      if (incidentCount === 0) {
        riskLevel = 'Very Low';
        riskColor = '#62c486'; // Gray untuk no data
      } else if (incidentCount <= 1) {
        riskLevel = 'Low';
        riskColor = '#22c55e'; // Green
      } else if (incidentCount <= 5) {
        riskLevel = 'Medium';
        riskColor = '#f97316'; // Orange
      } else {
        riskLevel = 'High';
        riskColor = '#ef4444'; // Red
      }
      
      return {
        type: 'Feature',
        id: index,
        properties: {
          ...properties,
          incident_count: incidentCount,
          risk_level: riskLevel,
          risk_color: riskColor,
          disaster_type: disaster_type,
          analysis_level: level,
          location_name: location_name
        },
        geometry: geometry
      };
    }).filter(feature => feature !== null);

    riskAnalysisCache.set(cacheKey, {
      features: features,
      timestamp: Date.now(),
      metadata: {
        disaster_type,
        level,
        location_name,
        total_features: features.length,
        incident_groups: kejadianResult.rows.length
      }
    });
    
    res.json(features);

  } catch (error) {
    console.error('Error in risk analysis:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint untuk mengambil daftar file dari folder uploads dan tabel file (hanya yang diupload via File Manager)
app.get('/api/files', async (req, res) => {
  try {
    // Ambil file-file dari tabel 'file' (ini adalah file yang diupload via File Manager)
    const dbFileQuery = 'SELECT filename, original_name, filepath, mimetype, size, upload_date FROM file ORDER BY upload_date DESC';
    const dbFileResult = await client.query(dbFileQuery);

    const responseList = dbFileResult.rows.map(row => ({
      id: row.filename, // Gunakan nama file sebagai ID
      name: row.original_name, // Gunakan nama asli untuk tampilan
      date: row.upload_date.toISOString(), // Format ISO untuk konsistensi
      size: row.size, // Ukuran dalam bytes
      // Tentukan tipe file berdasarkan ekstensi dari original_name
      type: (function() {
        const ext = path.extname(row.original_name).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) return 'img';
        if (['.pdf'].includes(ext)) return 'pdf';
        if (['.doc', '.docx'].includes(ext)) return 'doc';
        if (['.xls', '.xlsx'].includes(ext)) return 'xls';
        return 'default'; // Untuk tipe lainnya
      })(),
      // URL untuk akses file
      url: row.filepath, // filepath sudah berisi /uploads/filename.ext
    }));

    res.json(responseList);
  } catch (error) {
    console.error('Error reading file database:', error);
    res.status(500).json({ error: 'Failed to read file database' });
  }
});

// Endpoint untuk menghapus file dari folder uploads dan tabel file (hanya file dari File Manager)
app.delete('/api/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    // Ambil filepath dari database untuk keamanan
    const selectFileQuery = 'SELECT filepath FROM file WHERE filename = $1';
    const selectResult = await client.query(selectFileQuery, [filename]);

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ error: 'File entry not found in database' });
    }

    const filepath = selectResult.rows[0].filepath;
    const filePathOnDisk = path.join(__dirname, filepath.substring(1)); // Hapus '/' pertama untuk path relatif

    if (!fs.existsSync(filePathOnDisk)) {
      console.warn(`File not found on disk: ${filePathOnDisk}, but entry exists in DB. Removing DB entry.`);
      // Hapus entri dari database meskipun file tidak ditemukan di disk
      const deleteFileQuery = 'DELETE FROM file WHERE filename = $1';
      await client.query(deleteFileQuery, [filename]);
      return res.status(200).json({ message: 'File entry removed from database. File not found on disk.' });
    }

    // Hapus file dari sistem
    fs.unlinkSync(filePathOnDisk);

    // Hapus entri file dari database
    const deleteFileQuery = 'DELETE FROM file WHERE filename = $1';
    await client.query(deleteFileQuery, [filename]);

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Endpoint untuk upload file secara langsung ke folder uploads dan tabel file (hanya untuk File Manager)
app.post('/api/files', fileManagerUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Simpan informasi file ke database
    const insertFileQuery = `
      INSERT INTO file (filename, original_name, filepath, mimetype, size)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const insertValues = [
      req.file.filename,
      req.file.originalname,
      `/uploads/${req.file.filename}`, // Simpan path relatif
      req.file.mimetype,
      req.file.size
    ];

    await client.query(insertFileQuery, insertValues);

    res.status(201).json({
      success: true,
      message: 'File uploaded and registered successfully via File Manager',
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Error uploading file via File Manager:', error);
    // Hapus file dari disk jika insert ke DB gagal
    if (req.file && fs.existsSync(path.join(uploadDir, req.file.filename))) {
        fs.unlinkSync(path.join(uploadDir, req.file.filename));
    }
    res.status(500).json({ error: 'Failed to upload file or register in database via File Manager' });
  }
});

// TAMBAHAN: Cleanup expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const expiredKeys = [];
  for (let [key, value] of riskAnalysisCache.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) { // 5 minutes
      expiredKeys.push(key);
    }
  }
  expiredKeys.forEach(key => riskAnalysisCache.delete(key));
  if (expiredKeys.length > 0) {
    console.log(`Cleaned up ${expiredKeys.length} expired cache entries. Current cache size: ${riskAnalysisCache.size}`);
  }
}, 10 * 60 * 1000); 

// Error handler untuk kedua konfigurasi multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 10MB)' });
    }
    return res.status(400).json({ error: `Upload error: ${error.message}` });
  }
  
  // Handle fileFilter errors dengan pesan yang lebih jelas
  if (error.message && error.message.includes('Only image and Excel files are allowed')) {
    return res.status(400).json({ 
      error: 'File type not supported in kejadian form. Only images and Excel files are allowed.' 
    });
  }
  
  // General multer error
  if (error.message) {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
});

// Generic endpoint untuk mitigation layers - tambahkan setelah endpoint layer yang sudah ada
app.get('/api/layers/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    console.log('='.repeat(80));
    console.log('📥 GET Generic Layer Request');
    console.log('='.repeat(80));
    console.log('📋 Table:', tableName);
    console.log('🔍 Query params:', req.query);
    console.log('='.repeat(80));
    
    // STEP 1: Validasi table name untuk keamanan - cek apakah tabel benar-benar ada di database
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = $1
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('file', 'kejadian', 'spatial_ref_sys')
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
    `;
    
    console.log('🔍 Validating table existence...');
    const tableCheck = await client.query(tableCheckQuery, [tableName]);
    
    if (tableCheck.rows.length === 0) {
      console.error('❌ Table not found or not accessible:', tableName);
      console.log('='.repeat(80));
      return res.status(404).json({ 
        error: 'Table not found',
        message: `Table '${tableName}' does not exist or is not accessible`
      });
    }
    
    console.log('✅ Table validation passed:', tableName);
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM ${tableName}
    `;
    
    const params = [];
    let appliedFilter = 'none';
    
    // Apply filters based on request and REFERENCE_MAPPING
    if (req.query.filterType === 'province' && req.query.provinceName) {
      
      let filterValue = null;
      let columnName = null;
      
      // Gunakan REFERENCE_MAPPING yang sudah ada
      if (tableName === 'lahan_kritis') {
        if (REFERENCE_MAPPING.lahan_kritis?.provinsi_to_bpdas) {
          filterValue = REFERENCE_MAPPING.lahan_kritis.provinsi_to_bpdas[req.query.provinceName];
          columnName = 'bpdas';
        }
      } else if (tableName === 'penutupan_lahan_2024') {
        // Direct lookup kode_prov dari tabel provinsi
        try {
          const provinceCodeQuery = await client.query('SELECT kode_prov FROM provinsi WHERE provinsi = $1', [req.query.provinceName]);
          if (provinceCodeQuery.rows.length > 0) {
            filterValue = provinceCodeQuery.rows[0].kode_prov;
            columnName = 'kode_prov';
          }
        } catch (provinceError) {
          console.error('Error looking up province code:', provinceError);
        }
      } else if (tableName === 'rawan_erosi') {
        if (REFERENCE_MAPPING.rawan_erosi?.provinsi_to_n_bpdas) {
          filterValue = REFERENCE_MAPPING.rawan_erosi.provinsi_to_n_bpdas[req.query.provinceName];
          columnName = 'n_bpdas';
        }
      } else if (tableName === 'rawan_karhutla_2024') {
        if (REFERENCE_MAPPING.rawan_karhutla_2024?.provinsi_direct) {
          filterValue = REFERENCE_MAPPING.rawan_karhutla_2024.provinsi_direct[req.query.provinceName];
          columnName = 'provinsi';
        }
      } else if (tableName === 'rawan_limpasan') {
        if (REFERENCE_MAPPING.rawan_limpasan?.provinsi_to_wil_kerja) {
          filterValue = REFERENCE_MAPPING.rawan_limpasan.provinsi_to_wil_kerja[req.query.provinceName];
          columnName = 'wil_kerja';
        }
      } else if (tableName === 'areal_karhutla_2024') {
        // Untuk areal_karhutla_2024, bisa menggunakan mapping yang sama dengan rawan_karhutla_2024
        if (REFERENCE_MAPPING.rawan_karhutla_2024?.provinsi_direct) {
          filterValue = REFERENCE_MAPPING.rawan_karhutla_2024.provinsi_direct[req.query.provinceName];
          columnName = 'provinsi';
        }
      }
      
      
      if (filterValue && columnName) {
        query += buildWhereClause(columnName, filterValue, params);
        appliedFilter = `province: ${req.query.provinceName} -> ${columnName}: ${JSON.stringify(filterValue)}`;
      } else {
        return res.json([]); // Return empty if no mapping
      }
    }
    
    if (req.query.filterType === 'das' && req.query.dasName) {
      
      let filterValue = null;
      let columnName = null;
      
      // Gunakan REFERENCE_MAPPING yang sudah ada
      if (tableName === 'lahan_kritis') {
        if (REFERENCE_MAPPING.lahan_kritis?.das_to_bpdas) {
          filterValue = REFERENCE_MAPPING.lahan_kritis.das_to_bpdas[req.query.dasName];
          columnName = 'bpdas';
        }
      } else if (tableName === 'penutupan_lahan_2024') {
        if (REFERENCE_MAPPING.penutupan_lahan_2024?.das_to_kode_prov) {
          filterValue = REFERENCE_MAPPING.penutupan_lahan_2024.das_to_kode_prov[req.query.dasName];
          columnName = 'kode_prov';
        }
      } else if (tableName === 'rawan_erosi') {
        if (REFERENCE_MAPPING.rawan_erosi?.das_to_n_bpdas) {
          filterValue = REFERENCE_MAPPING.rawan_erosi.das_to_n_bpdas[req.query.dasName];
          columnName = 'n_bpdas';
        }
      } else if (tableName === 'rawan_karhutla_2024') {
        if (REFERENCE_MAPPING.rawan_karhutla_2024?.das_to_provinsi) {
          filterValue = REFERENCE_MAPPING.rawan_karhutla_2024.das_to_provinsi[req.query.dasName];
          columnName = 'provinsi';
        }
      } else if (tableName === 'rawan_limpasan') {
        if (REFERENCE_MAPPING.rawan_limpasan?.das_to_wil_kerja) {
          filterValue = REFERENCE_MAPPING.rawan_limpasan.das_to_wil_kerja[req.query.dasName];
          columnName = 'wil_kerja';
        }
      } else if (tableName === 'areal_karhutla_2024') {
        // Untuk areal_karhutla_2024, bisa menggunakan mapping yang sama dengan rawan_karhutla_2024
        if (REFERENCE_MAPPING.rawan_karhutla_2024?.das_to_provinsi) {
          filterValue = REFERENCE_MAPPING.rawan_karhutla_2024.das_to_provinsi[req.query.dasName];
          columnName = 'provinsi';
        }
      }
      
      
      if (filterValue && columnName) {
        query += buildWhereClause(columnName, filterValue, params);
        appliedFilter = `das: ${req.query.dasName} -> ${columnName}: ${JSON.stringify(filterValue)}`;
      } else {
        return res.json([]); // Return empty if no mapping
      }
    }
    
    query += ' LIMIT 1000';

    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }

    const features = createFeatures(result.rows, tableName);
    
    res.json(features);
  } catch (error) {
    console.error(`Error fetching ${req.params.tableName}:`, error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      endpoint: req.params.tableName
    });
  }
});

// Endpoint untuk mendapatkan informasi semua tabel dengan tahun dari column tahun_data
app.get('/api/tables-info', async (req, res) => {
  try {
    const tablesQuery = `
      SELECT 
        t.table_name,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass)) as ukuran,
        pg_total_relation_size(quote_ident(t.table_name)::regclass) as ukuran_bytes
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT IN ('file', 'kejadian', 'spatial_ref_sys')
        AND t.table_name NOT LIKE 'pg_%'
        AND t.table_name NOT LIKE 'sql_%'
      ORDER BY t.table_name ASC
    `;
    
    const tablesResult = await client.query(tablesQuery);
    
    // Untuk setiap tabel, dapatkan jumlah row dan tahun_data yang tersedia
    const tablesInfo = await Promise.all(
      tablesResult.rows.map(async (table) => {
        try {
          // Query untuk menghitung jumlah row
          const countQuery = `SELECT COUNT(*) as jumlah_row FROM ${table.table_name}`;
          const countResult = await client.query(countQuery);
          
          // Query untuk mendapatkan tahun_data yang unik (jika column ada)
          let tahunTersedia = [];
          try {
            const tahunQuery = `
              SELECT DISTINCT tahun_data 
              FROM ${table.table_name} 
              WHERE tahun_data IS NOT NULL 
              ORDER BY tahun_data ASC
            `;
            const tahunResult = await client.query(tahunQuery);
            tahunTersedia = tahunResult.rows.map(row => parseInt(row.tahun_data));
          } catch (tahunError) {
            // Jika column tahun_data tidak ada, gunakan default
            console.warn(`Table ${table.table_name} does not have tahun_data column`);
            tahunTersedia = []; // Fallback
          }
          
          return {
            nama_table: table.table_name,
            ukuran: table.ukuran,
            jumlah_row: parseInt(countResult.rows[0].jumlah_row),
            tahun_tersedia: tahunTersedia
          };
        } catch (error) {
          console.error(`Error processing table ${table.table_name}:`, error);
          return {
            nama_table: table.table_name,
            ukuran: table.ukuran,
            jumlah_row: 0,
            tahun_tersedia: []
          };
        }
      })
    );
    
    res.json(tablesInfo);
    
  } catch (error) {
    console.error('Error fetching tables info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tables information',
      message: error.message 
    });
  }
});

// NEW ENDPOINT: Get layer data by table name and year
app.get('/api/shp-layers/:tableName/year/:year', async (req, res) => {
  try {
    const { tableName, year } = req.params;
    
    console.log('📥 GET Layer by year request:', { tableName, year });
    
    // STEP 1: Validasi table name untuk keamanan - cek apakah tabel benar-benar ada di database
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = $1
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('file', 'kejadian', 'spatial_ref_sys')
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
    `;
    
    const tableCheck = await client.query(tableCheckQuery, [tableName]);
    
    if (tableCheck.rows.length === 0) {
      console.error('❌ Table not found or not accessible:', tableName);
      return res.status(404).json({ 
        error: 'Table not found',
        message: `Table '${tableName}' does not exist or is not accessible`
      });
    }
    
    console.log('✅ Table validation passed:', tableName);
    
    let query = `
      SELECT 
        *, ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json
      FROM ${tableName}
    `;
    
    const params = [];
    
    // Filter berdasarkan tahun_data jika column ada
    try {
      const checkColumnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'tahun_data'
      `;
      const columnCheck = await client.query(checkColumnQuery, [tableName]);
      
      if (columnCheck.rows.length > 0) {
        query += ` WHERE tahun_data = $1`;
        params.push(parseInt(year));
      }
    } catch (checkError) {
      console.warn(`Could not check for tahun_data column in ${tableName}`);
    }
    
    // Apply additional filters if provided
    if (req.query.filterType && req.query.filterName) {
      const filterConnector = params.length > 0 ? 'AND' : 'WHERE';
      
      if (req.query.filterType === 'province') {
        query += ` ${filterConnector} provinsi = $${params.length + 1}`;
        params.push(req.query.filterName);
      } else if (req.query.filterType === 'das') {
        query += ` ${filterConnector} das = $${params.length + 1}`;
        params.push(req.query.filterName);
      }
    }
    
    query += ' LIMIT 1000';
    
    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }
    
    const features = createFeatures(result.rows, tableName);
    
    res.json(features);
  } catch (error) {
    console.error(`Error fetching ${req.params.tableName} for year ${req.params.year}:`, error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// ================= ENDPOINT BARU #6 ================
// app.get('/api/layers/:tableName/year/:year', async (req, res) => {
//   const { tableName, year } = req.params;
//   const { bbox, filterType, provinceName, dasName } = req.query;
  
//   try {
//     console.log(`🔍 Fetching layer ${tableName} for year ${year}`);
    
//     let query = `
//       SELECT 
//         id,
//         ST_AsGeoJSON(geom) as geometry,
//         *
//       FROM ${tableName}
//       WHERE tahun_data = $1
//     `;
    
//     const params = [year];
    
//     // Gunakan reference_mapping untuk filter provinsi
//     if (filterType === 'province' && provinceName) {
//       const mappingQuery = `
//         SELECT target_value 
//         FROM reference_mapping 
//         WHERE target_table = $1 
//           AND target_column = 'provinsi'
//           AND UPPER(source_value) = UPPER($2)
//       `;
//       const mappingResult = await client.query(mappingQuery, [tableName, provinceName]);
      
//       if (mappingResult.rows.length > 0) {
//         const targetValue = mappingResult.rows[0].target_value;
//         params.push(targetValue);
//         query += ` AND UPPER(provinsi) = UPPER($${params.length})`;
//       } else {
//         params.push(provinceName);
//         query += ` AND UPPER(provinsi) = UPPER($${params.length})`;
//       }
//     }
    
//     // Gunakan reference_mapping untuk filter das
//     if (filterType === 'das' && dasName) {
//       const mappingQuery = `
//         SELECT target_value 
//         FROM reference_mapping 
//         WHERE target_table = $1 
//           AND target_column = 'nama_das'
//           AND UPPER(source_value) = UPPER($2)
//       `;
//       const mappingResult = await client.query(mappingQuery, [tableName, dasName]);
      
//       if (mappingResult.rows.length > 0) {
//         const targetValue = mappingResult.rows[0].target_value;
//         params.push(targetValue);
//         query += ` AND UPPER(nama_das) = UPPER($${params.length})`;
//       } else {
//         params.push(dasName);
//         query += ` AND UPPER(nama_das) = UPPER($${params.length})`;
//       }
//     }
    
//     if (bbox) {
//       const [minX, minY, maxX, maxY] = bbox.split(',').map(Number);
//       params.push(minX, minY, maxX, maxY);
//       query += ` AND ST_Intersects(geom, ST_MakeEnvelope($${params.length-3}, $${params.length-2}, $${params.length-1}, $${params.length}, 4326))`;
//     }
    
//     const result = await client.query(query, params);
    
//     const features = result.rows.map(row => ({
//       type: 'Feature',
//       geometry: JSON.parse(row.geometry),
//       properties: Object.keys(row)
//         .filter(key => key !== 'geometry' && key !== 'geom')
//         .reduce((obj, key) => {
//           obj[key] = row[key];
//           return obj;
//         }, {})
//     }));
    
//     console.log(`✅ Found ${features.length} features in ${tableName} for year ${year}`);
    
//     res.json({
//       type: 'FeatureCollection',
//       features: features,
//       metadata: {
//         table: tableName,
//         year: parseInt(year),
//         count: features.length
//       }
//     });
//   } catch (error) {
//     console.error(`❌ Error fetching layer ${tableName}:`, error);
//     res.status(500).json({ error: error.message });
//   }
// });

// app.get('/api/layers/:tableName/year/:year', async (req, res) => {
//   const { tableName, year } = req.params;
//   const { filterType, provinceName, dasName } = req.query;

//   console.log(`🔍 Fetching layer ${tableName} for year ${year}`);

//   try {
//     // ✅ FIX 1: Parse year ke INTEGER
//     const yearInt = parseInt(year, 10);
//     if (isNaN(yearInt)) {
//       return res.status(400).json({ error: 'Invalid year parameter' });
//     }

//     // --- Ambil daftar kolom tabel ---
//     const columnsRes = await client.query(`
//       SELECT column_name 
//       FROM information_schema.columns 
//       WHERE table_name = $1
//     `, [tableName]);
//     const columns = columnsRes.rows.map(r => r.column_name.toLowerCase());

//     // Check if tahun_data exists
//     if (!columns.includes('tahun_data')) {
//       console.warn(`⚠️ Table ${tableName} does not have tahun_data column`);
//       return res.status(400).json({ 
//         error: `Table ${tableName} does not have tahun_data column` 
//       });
//     }

//     // --- Deteksi kolom ID dan Nama ---
//     const idColumn = columns.includes('gid') ? 'gid' : 
//                      columns.includes('fid') ? 'fid' : 'id';
    
//     const nameColumn = await resolveNameColumn(tableName);

//     // ✅ FIX 2: Query dengan INTEGER comparison
//     let query = `
//       SELECT 
//         ${idColumn} AS id, 
//         ${nameColumn} AS name, 
//         tahun_data, 
//         ST_AsGeoJSON(geom) AS geometry 
//       FROM ${tableName}
//       WHERE tahun_data = $1 
//         AND geom IS NOT NULL
//     `;
    
//     const params = [yearInt];  // ✅ Use integer, not string

//     // --- Filter provinsi (jika ada) ---
//     if (filterType === 'province' && provinceName) {
//       // Check if provinsi column exists
//       if (!columns.includes('provinsi')) {
//         console.warn(`⚠️ Table ${tableName} does not have provinsi column`);
//       } else {
//         let mappedName = provinceName;

//         // Try to map province name
//         try {
//           const mappingQuery = `
//             SELECT target_value 
//             FROM reference_mapping 
//             WHERE target_table = $1 
//               AND target_column = 'provinsi'
//               AND UPPER(source_value) = UPPER($2)
//           `;
//           const mappingResult = await client.query(mappingQuery, [tableName, provinceName]);
          
//           if (mappingResult.rows.length > 0) {
//             mappedName = mappingResult.rows[0].target_value;
//             console.log(`📍 Mapped province: ${provinceName} → ${mappedName}`);
//           }
//         } catch (err) {
//           console.warn('⚠️ Province mapping lookup failed, using original name');
//         }

//         params.push(mappedName);
//         query += ` AND UPPER(provinsi) = UPPER($${params.length})`;
//       }
//     }

//     // --- Filter DAS (jika ada) ---
//     if (filterType === 'das' && dasName) {
//       if (!columns.includes('nama_das')) {
//         console.warn(`⚠️ Table ${tableName} does not have nama_das column`);
//       } else {
//         let mappedName = dasName;

//         // Try to map DAS name
//         try {
//           const mappingQuery = `
//             SELECT target_value 
//             FROM reference_mapping 
//             WHERE target_table = $1 
//               AND target_column = 'nama_das'
//               AND UPPER(source_value) = UPPER($2)
//           `;
//           const mappingResult = await client.query(mappingQuery, [tableName, dasName]);
          
//           if (mappingResult.rows.length > 0) {
//             mappedName = mappingResult.rows[0].target_value;
//             console.log(`📍 Mapped DAS: ${dasName} → ${mappedName}`);
//           }
//         } catch (err) {
//           console.warn('⚠️ DAS mapping lookup failed, using original name');
//         }

//         params.push(mappedName);
//         query += ` AND UPPER(nama_das) = UPPER($${params.length})`;
//       }
//     }

//     query += ` ORDER BY ${nameColumn}`;
    
//     console.log('📝 Executing query with params:', params);
//     let result = await client.query(query, params);
//     let rows = result.rows;

//     // --- Jika kosong, coba fallback ke tahun terdekat ---
//     if (!rows || rows.length === 0) {
//       console.log(`⚠️ No records found for ${tableName} in year ${yearInt}, trying closest lower year`);

//       const fallbackRes = await client.query(
//         `SELECT DISTINCT tahun_data 
//          FROM ${tableName} 
//          WHERE tahun_data < $1 
//            AND geom IS NOT NULL
//          ORDER BY tahun_data DESC 
//          LIMIT 1`,
//         [yearInt]
//       );

//       if (fallbackRes.rows.length > 0) {
//         const fallbackYear = fallbackRes.rows[0].tahun_data;
//         console.log(`↩️ Using fallback year ${fallbackYear} for ${tableName}`);

//         // Re-run query with fallback year
//         const fallbackParams = [fallbackYear];
//         let fallbackQuery = `
//           SELECT 
//             ${idColumn} AS id, 
//             ${nameColumn} AS name, 
//             tahun_data, 
//             ST_AsGeoJSON(geom) AS geometry 
//           FROM ${tableName}
//           WHERE tahun_data = $1 
//             AND geom IS NOT NULL
//         `;

//         // Add filters again if needed
//         if (filterType === 'province' && provinceName && columns.includes('provinsi')) {
//           fallbackParams.push(provinceName);
//           fallbackQuery += ` AND UPPER(provinsi) = UPPER($${fallbackParams.length})`;
//         }
        
//         if (filterType === 'das' && dasName && columns.includes('nama_das')) {
//           fallbackParams.push(dasName);
//           fallbackQuery += ` AND UPPER(nama_das) = UPPER($${fallbackParams.length})`;
//         }

//         fallbackQuery += ` ORDER BY ${nameColumn}`;

//         const fallbackResult = await client.query(fallbackQuery, fallbackParams);
//         rows = fallbackResult.rows;
//         console.log(`✅ Found ${rows.length} fallback record(s) in ${tableName} for year ${fallbackYear}`);
//       } else {
//         console.log(`⚠️ No fallback year found for ${tableName}`);
//       }
//     } else {
//       console.log(`✅ Found ${rows.length} record(s) in ${tableName} for year ${yearInt}`);
//     }

//     // --- Transform to GeoJSON features ---
//     const features = rows.map(row => ({
//       type: 'Feature',
//       geometry: JSON.parse(row.geometry),
//       properties: {
//         id: row.id,
//         name: row.name,
//         tahun_data: row.tahun_data
//       }
//     }));

//     // --- Return GeoJSON FeatureCollection ---
//     res.json({
//       type: 'FeatureCollection',
//       features: features,
//       metadata: {
//         table: tableName,
//         year: yearInt,
//         count: features.length
//       }
//     });

//   } catch (error) {
//     console.error(`❌ Error fetching layer ${tableName}:`, error);
//     res.status(500).json({ 
//       error: error.message,
//       table: tableName,
//       year: year
//     });
//   }
// });

const shapefile = require('shapefile');
const simplify = require('simplify-js');
const turf = require('@turf/turf');
const dbfParser = require('dbf-parser');

// Helper function to get all coordinates from geometry
function getAllCoordinates(geometry) {
  let coords = [];
  
  if (geometry.type === 'Point') {
    coords = [geometry.coordinates];
  } else if (geometry.type === 'LineString') {
    coords = geometry.coordinates;
  } else if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(ring => {
      coords = coords.concat(ring);
    });
  } else if (geometry.type === 'MultiPoint') {
    coords = geometry.coordinates;
  } else if (geometry.type === 'MultiLineString') {
    geometry.coordinates.forEach(line => {
      coords = coords.concat(line);
    });
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        coords = coords.concat(ring);
      });
    });
  }
  
  return coords;
}

function calculateReductionPercentage(originalPoints, simplifiedPoints) {
  if (originalPoints === 0) return 0;
  return ((originalPoints - simplifiedPoints) / originalPoints) * 100;
}

// ✅ FUNGSI BARU 2: Apply Douglas-Peucker dengan tolerance
function applyDouglasPeucker(geometry, tolerance, preventRemoval) {
  if (!geometry || !geometry.type) return geometry;
  
  if (geometry.type === 'Point') {
    return geometry;
  }
  
  if (geometry.type === 'LineString') {
    const points = geometry.coordinates.map(c => ({ x: c[0], y: c[1] }));
    const simplified = simplify(points, tolerance, true);
    
    if (preventRemoval && simplified.length < 3) {
      return geometry;
    }
    
    return {
      type: 'LineString',
      coordinates: simplified.map(p => [p.x, p.y])
    };
  }
  
  if (geometry.type === 'Polygon') {
    const simplifiedRings = geometry.coordinates.map((ring) => {
      const points = ring.map(c => ({ x: c[0], y: c[1] }));
      const simplified = simplify(points, tolerance, true);
      
      if (preventRemoval && simplified.length < 4) {
        return ring;
      }
      
      const coords = simplified.map(p => [p.x, p.y]);
      
      // Ensure ring is closed
      if (coords.length > 0 && 
          (coords[0][0] !== coords[coords.length-1][0] || 
           coords[0][1] !== coords[coords.length-1][1])) {
        coords.push(coords[0]);
      }
      
      if (coords.length < 4) {
        return ring;
      }
      
      return coords;
    });
    
    return {
      type: 'Polygon',
      coordinates: simplifiedRings
    };
  }
  
  if (geometry.type === 'MultiPolygon') {
    const simplifiedPolygons = geometry.coordinates.map((polygon) => {
      return polygon.map((ring) => {
        const points = ring.map(c => ({ x: c[0], y: c[1] }));
        const simplified = simplify(points, tolerance, true);
        
        if (preventRemoval && simplified.length < 4) {
          return ring;
        }
        
        const coords = simplified.map(p => [p.x, p.y]);
        
        if (coords.length > 0 && 
            (coords[0][0] !== coords[coords.length-1][0] || 
             coords[0][1] !== coords[coords.length-1][1])) {
          coords.push(coords[0]);
        }
        
        if (coords.length < 4) {
          return ring;
        }
        
        return coords;
      });
    });
    
    return {
      type: 'MultiPolygon',
      coordinates: simplifiedPolygons
    };
  }
  
  return geometry;
}

// ✅ FUNGSI BARU 3: Simplify dengan target persentase (BINARY SEARCH)
function simplifyDouglasPeuckerWithTargetPercentage(geometry, targetPercentage, preventRemoval) {
  try {
    if (!geometry || !geometry.type) {
      console.warn('Invalid geometry for Douglas-Peucker');
      return geometry;
    }
    
    if (geometry.type === 'Point') {
      return geometry;
    }
    
    const originalCoords = getAllCoordinates(geometry);
    const originalPoints = originalCoords.length;
    
    // Hitung target jumlah points
    const reductionFraction = targetPercentage / 100;
    const targetPoints = Math.ceil(originalPoints * (1 - reductionFraction));
    
    // Binary search untuk tolerance yang tepat
    let toleranceLow = 0.0001;
    let toleranceHigh = 1.0;
    let bestTolerance = toleranceLow;
    let bestGeometry = geometry;
    let iterations = 0;
    const maxIterations = 20;
    
    while (iterations < maxIterations && (toleranceHigh - toleranceLow) > 0.00001) {
      iterations++;
      const toleranceMid = (toleranceLow + toleranceHigh) / 2;
      
      const testGeometry = applyDouglasPeucker(geometry, toleranceMid, preventRemoval);
      const testCoords = getAllCoordinates(testGeometry);
      const testPoints = testCoords.length;
      
      if (testPoints < targetPoints) {
        toleranceHigh = toleranceMid;
      } else if (testPoints > targetPoints) {
        toleranceLow = toleranceMid;
        bestTolerance = toleranceMid;
        bestGeometry = testGeometry;
      } else {
        bestTolerance = toleranceMid;
        bestGeometry = testGeometry;
        break;
      }
    }
    
    const finalCoords = getAllCoordinates(bestGeometry);
    const finalPoints = finalCoords.length;
    const actualReduction = calculateReductionPercentage(originalPoints, finalPoints);
    
    // Jika hasil melebihi target dan preventRemoval aktif
    if (actualReduction > targetPercentage && preventRemoval) {
      return geometry;
    }
    
    return bestGeometry;
    
  } catch (error) {
    console.error('Error in Douglas-Peucker with target percentage:', error);
    return geometry;
  }
}

// Helper function: Visvalingam simplification (using turf)
function simplifyVisvalingam(geometry, tolerance, preventRemoval) {
  try {
    // Use turf.js for Visvalingam simplification
    const feature = turf.feature(geometry);
    const simplified = turf.simplify(feature, {
      tolerance: tolerance,
      highQuality: true,
      mutate: false
    });
    
    if (preventRemoval) {
      const originalCoords = getAllCoordinates(geometry);
      const simplifiedCoords = getAllCoordinates(simplified.geometry);
      
      // If too much simplification, return original
      if (simplifiedCoords.length < originalCoords.length * 0.1) {
        return geometry;
      }
    }
    
    return simplified.geometry;
  } catch (error) {
    console.error('Error in Visvalingam:', error);
    return geometry;
  }
}

app.post('/api/shp/simplify', multer({ 
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
}).array('shpFiles'), async (req, res) => {
  let uploadedFilePaths = [];
  
  try {
    const { method, percentage, preventShapeRemoval } = req.body;
    const files = req.files;
    
    console.log('🔄 Simplification request:', {
      method,
      percentage: `${percentage}%`,
      preventShapeRemoval,
      filesReceived: files?.length || 0
    });
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    uploadedFilePaths = files.map(f => f.path);
    
    const shpFile = files.find(f => f.originalname.toLowerCase().endsWith('.shp'));
    const dbfFile = files.find(f => f.originalname.toLowerCase().endsWith('.dbf'));
    
    if (!shpFile) {
      return res.status(400).json({ error: 'No .shp file found' });
    }
    
    console.log('📂 Processing files:', {
      shp: shpFile.filename,
      dbf: dbfFile?.filename || 'none'
    });
    
    const targetPercentage = parseFloat(percentage); // ✅ Gunakan langsung sebagai target persentase
    const statistics = [];
    
    const source = dbfFile 
      ? await shapefile.open(shpFile.path, dbfFile.path)
      : await shapefile.open(shpFile.path);
      
    let result = await source.read();
    let featureIndex = 0;
    
    console.log('📖 Reading and simplifying features...');
    console.log(`🎯 Target simplification: ${targetPercentage}% maximum reduction per feature`);
    
    while (!result.done) {
      const feature = result.value;
      
      if (feature && feature.geometry) {
        const originalCoords = getAllCoordinates(feature.geometry);
        const originalPoints = originalCoords.length;
        
        let simplifiedGeometry;
        
        // ✅ GUNAKAN FUNGSI BARU dengan target persentase
        if (method === 'douglas-peucker') {
          simplifiedGeometry = simplifyDouglasPeuckerWithTargetPercentage(
            feature.geometry, 
            targetPercentage, 
            preventShapeRemoval === 'true'
          );
        } else if (method === 'visvalingam-effective' || method === 'visvalingam-weighted') {
          // TODO: Implement Visvalingam dengan target persentase
          simplifiedGeometry = simplifyVisvalingam(
            feature.geometry, 
            (100 - targetPercentage) / 1000, 
            preventShapeRemoval === 'true'
          );
        } else {
          simplifiedGeometry = feature.geometry;
        }
        
        const simplifiedCoords = getAllCoordinates(simplifiedGeometry);
        const simplifiedPoints = simplifiedCoords.length;
        const actualReduction = calculateReductionPercentage(originalPoints, simplifiedPoints);
        
        const featureName = feature.properties 
          ? (feature.properties.name || feature.properties.PROVINSI || feature.properties.nama || 
             feature.properties.NAMOBJ || feature.properties.kab_kota || feature.properties.kecamatan || 
             `Feature ${featureIndex + 1}`)
          : `Feature ${featureIndex + 1}`;
        
        statistics.push({
          feature_name: featureName,
          original_points: originalPoints,
          simplified_points: simplifiedPoints,
          reduction: actualReduction.toFixed(1) + '%',
          target_percentage: targetPercentage + '%',
          within_target: actualReduction <= targetPercentage
        });
        
        if (featureIndex % 10 === 0) {
          console.log(`✅ Processed ${featureIndex + 1} features...`);
        }
      }
      
      result = await source.read();
      featureIndex++;
    }
    
    console.log(`✅ Simplification completed: ${statistics.length} features processed`);
    
    // Summary statistics
    const totalOriginal = statistics.reduce((sum, s) => sum + s.original_points, 0);
    const totalSimplified = statistics.reduce((sum, s) => sum + s.simplified_points, 0);
    const overallReduction = calculateReductionPercentage(totalOriginal, totalSimplified);
    const withinTargetCount = statistics.filter(s => s.within_target).length;
    
    console.log(`📊 Summary:`);
    console.log(`   - Total original points: ${totalOriginal}`);
    console.log(`   - Total simplified points: ${totalSimplified}`);
    console.log(`   - Overall reduction: ${overallReduction.toFixed(1)}%`);
    console.log(`   - Features within target: ${withinTargetCount}/${statistics.length}`);
    
    // ✅ PENTING: Store simplified data information untuk tracking
    const tempId = Date.now().toString();
    const tempData = {
      method,
      percentage: targetPercentage,
      preventShapeRemoval,
      statistics,
      originalFiles: files.map(f => f.filename),
      targetPercentage,  // Tambahkan untuk clarity
      summary: {
        totalOriginalPoints: totalOriginal,
        totalSimplifiedPoints: totalSimplified,
        overallReduction: overallReduction.toFixed(1) + '%',
        featuresWithinTarget: withinTargetCount,
        totalFeatures: statistics.length
      }
    };
    
    const tempPath = path.join(uploadDir, `simplified_${tempId}.json`);
    fs.writeFileSync(tempPath, JSON.stringify(tempData, null, 2));
    
    console.log('💾 Saved simplification metadata:', tempPath);
    
    res.json({ 
      statistics,
      tempId,
      message: `Simplification completed with ${targetPercentage}% maximum reduction target`,
      totalFeatures: statistics.length,
      summary: tempData.summary
    });
    
  } catch (error) {
    console.error('❌ Error during simplification:', error);
    console.error('Stack:', error.stack);
    
    uploadedFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    });
    
    res.status(500).json({ 
      error: 'Failed to simplify geometry', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

if (!global.progressClients) {
  global.progressClients = {};
}

// Helper function untuk send progress ke client
function sendProgress(sessionId, data) {
  const client = global.progressClients?.[sessionId];
  if (client) {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('Error sending progress:', err);
      delete global.progressClients[sessionId];
    }
  }
}

app.get('/api/upload-progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Store client connection
  if (!global.progressClients) {
    global.progressClients = {};
  }
  global.progressClients[sessionId] = res;

  req.on('close', () => {
    delete global.progressClients[sessionId];
  });
});

// NEW ENDPOINT: Upload to database after simplification
// NEW ENDPOINT: Upload to database after simplification
app.post('/api/shp/upload-to-db', multer({ 
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
}).array('shpFiles'), async (req, res) => {
  let uploadedFilePaths = [];
  
  try {
    const sessionId = req.headers['x-session-id'];
    const { 
      tableName, 
      year, 
      columnMapping, 
      simplificationApplied, 
      method, 
      percentage,              // ← Nilai dari slider (misal: "70")
      preventShapeRemoval 
    } = req.body;
    
    
    const files = req.files;
    
    console.log('📤 Upload to DB request:', {
      tableName,
      year,
      simplificationApplied,
      method,
      percentage: `${percentage}%`,
      filesCount: files?.length || 0
    });
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Track uploaded files for cleanup
    uploadedFilePaths = files.map(f => f.path);
    
    const mapping = JSON.parse(columnMapping);
    
    // Find .shp and .dbf files
    const shpFile = files.find(f => f.originalname.toLowerCase().endsWith('.shp'));
    const dbfFile = files.find(f => f.originalname.toLowerCase().endsWith('.dbf'));
    
    if (!shpFile || !dbfFile) {
      return res.status(400).json({ error: 'Missing required .shp or .dbf file' });
    }
    
    console.log('📂 Files found:', {
      shp: shpFile.filename,
      dbf: dbfFile.filename
    });
    
    // ✅ PERUBAHAN UTAMA: Konversi percentage ke targetPercentage
    const targetPercentage = simplificationApplied === 'true' && percentage
      ? parseFloat(percentage)
      : 0;
    
    console.log('🔧 Simplification settings:', {
      applied: simplificationApplied === 'true',
      method: method || 'none',
      targetPercentage: targetPercentage > 0 ? `${targetPercentage}%` : 'N/A'
    });
    
    // Read shapefile
    const source = await shapefile.open(shpFile.path, dbfFile.path);
    // First pass: count total features
    let totalFeatures = 0;
    let countResult = await source.read();
    while (!countResult.done) {
      totalFeatures++;
      countResult = await source.read();
    }
    
    console.log(`📊 Total features to process: ${totalFeatures}`);
    
    // Send initial progress
    sendProgress(sessionId, {
      type: 'start',
      total: totalFeatures,
      inserted: 0,
      percentage: 0,
      message: 'Memulai proses insert ke database...'
    });
    
    // Re-open shapefile untuk actual processing
    const sourceForInsert = await shapefile.open(shpFile.path, dbfFile.path);
    let result = await sourceForInsert.read();

    let insertedCount = 0;
    let simplifiedCount = 0;
    let errors = [];
    
    // Track simplification stats untuk summary
    let totalOriginalPoints = 0;
    let totalSimplifiedPoints = 0;
    
    while (!result.done) {
      const feature = result.value;
      
      if (feature && feature.geometry && feature.properties) {
        try {
          // Apply simplification if enabled
          let geometryToInsert = feature.geometry;
          
          // ✅ PERUBAHAN: Gunakan fungsi baru dengan target persentase
          if (simplificationApplied === 'true' && method && targetPercentage > 0) {
            const originalPoints = getAllCoordinates(feature.geometry).length;
            totalOriginalPoints += originalPoints;
            
            if (method === 'douglas-peucker') {
              // ✅ Gunakan fungsi baru dengan target persentase
              geometryToInsert = simplifyDouglasPeuckerWithTargetPercentage(
                feature.geometry, 
                targetPercentage,  // ← Gunakan targetPercentage langsung
                preventShapeRemoval === 'true'
              );
            } else if (method === 'visvalingam-effective' || method === 'visvalingam-weighted') {
              // TODO: Nanti akan diperbaiki dengan target percentage
              // Sementara gunakan tolerance-based
              const tolerance = (100 - targetPercentage) / 1000;
              geometryToInsert = simplifyVisvalingam(
                feature.geometry, 
                tolerance, 
                preventShapeRemoval === 'true'
              );
            }
            
            const simplifiedPoints = getAllCoordinates(geometryToInsert).length;
            totalSimplifiedPoints += simplifiedPoints;
            
            if (simplifiedPoints < originalPoints) {
              simplifiedCount++;
              
              // Log untuk debug (setiap 10 feature)
              if (simplifiedCount % 10 === 0) {
                const reduction = ((originalPoints - simplifiedPoints) / originalPoints * 100).toFixed(1);
                console.log(`  🔸 Feature ${insertedCount}: ${originalPoints} → ${simplifiedPoints} points (${reduction}% reduction)`);
              }
            }
          }
          
          // Build insert query based on column mapping
          const columns = [];
          const values = [];
          const placeholders = [];
          let paramIndex = 1;
          
          for (const [dbCol, mapConfig] of Object.entries(mapping)) {
            if (dbCol === 'geom' || !mapConfig.source || mapConfig.type === 'skip') continue;
            
            columns.push(dbCol);
            
            if (mapConfig.type === 'shp_column') {
              values.push(feature.properties[mapConfig.source]);
              placeholders.push(`$${paramIndex++}`);
            } else if (mapConfig.type === 'year_dropdown') {
              values.push(parseInt(year));
              placeholders.push(`$${paramIndex++}`);
            } else if (mapConfig.type === 'null') {
              values.push(null);
              placeholders.push(`$${paramIndex++}`);
            } else if (mapConfig.type === 'auto_generate') {
              if (mapConfig.config.mode === 'sequence') {
                values.push(mapConfig.config.startFrom + insertedCount * mapConfig.config.increment);
                placeholders.push(`$${paramIndex++}`);
              } else if (mapConfig.config.mode === 'continue') {
                const maxQuery = `SELECT COALESCE(MAX(${dbCol}), 0) as max_val FROM ${tableName}`;
                const maxResult = await client.query(maxQuery);
                const maxVal = maxResult.rows[0].max_val;
                values.push(maxVal + mapConfig.config.increment);
                placeholders.push(`$${paramIndex++}`);
              } else if (mapConfig.config.mode === 'random') {
                const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                let randomStr = '';
                for (let i = 0; i < mapConfig.config.length; i++) {
                  randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                values.push(randomStr);
                placeholders.push(`$${paramIndex++}`);
              } else {
                values.push(null);
                placeholders.push(`$${paramIndex++}`);
              }
            } else if (mapConfig.type === 'manual_table') {
                // Manual table data adalah array of objects dengan _rowId
                console.log(`🔧 Processing manual_table for column: ${dbCol}`);
                console.log(`📊 Manual data exists:`, !!mapConfig.data);
                console.log(`📊 Manual data is array:`, Array.isArray(mapConfig.data));
                console.log(`📊 Manual data length:`, mapConfig.data?.length || 0);
                console.log(`📊 Current insertedCount:`, insertedCount);
                
                if (mapConfig.data && Array.isArray(mapConfig.data)) {
                  // Coba cari berdasarkan _rowId
                  const rowData = mapConfig.data.find(row => row._rowId === insertedCount);
                  console.log(`🔍 Found row by _rowId (${insertedCount}):`, !!rowData);
                  
                  if (rowData && rowData[dbCol] !== undefined) {
                    console.log(`✅ Using value from _rowId match: "${rowData[dbCol]}"`);
                    values.push(rowData[dbCol]);
                  } else {
                    // Fallback: coba akses langsung by index
                    const directData = mapConfig.data[insertedCount];
                    console.log(`🔍 Trying direct index access [${insertedCount}]:`, !!directData);
                    
                    if (directData && directData[dbCol] !== undefined) {
                      console.log(`✅ Using value from direct index: "${directData[dbCol]}"`);
                      values.push(directData[dbCol]);
                    } else {
                      console.log(`⚠️ No data found for column ${dbCol}, using null`);
                      values.push(null);
                    }
                  }
                } else {
                  console.log(`❌ mapConfig.data is not valid array, using null`);
                  values.push(null);
                }
                placeholders.push(`$${paramIndex++}`);
              } else {
                values.push(null);
                placeholders.push(`$${paramIndex++}`);
              }
          }
          
          // Add geometry (simplified or original)
          columns.push('geom');
          values.push(JSON.stringify(geometryToInsert));
          placeholders.push(`ST_SetSRID(ST_GeomFromGeoJSON($${paramIndex}::json), 4326)`);
          
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
          `;
          
          // Debug log for first insert
          if (insertedCount === 0) {
            console.log('🔍 First insert debug:', {
              columns: columns.length,
              values: values.length,
              simplified: simplificationApplied === 'true',
              geometryType: geometryToInsert.type,
              targetPercentage: targetPercentage > 0 ? `${targetPercentage}%` : 'N/A'
            });
          }
          
          await client.query(insertQuery, values);
          insertedCount++;
          
          const progressInterval = Math.max(10, Math.floor(totalFeatures / 20)); // Update setiap 5% atau min 10 rows
          if (insertedCount % progressInterval === 0 || insertedCount === totalFeatures) {
            const progressPercentage = (insertedCount / totalFeatures) * 100;
            sendProgress(sessionId, {
              type: 'progress',
              total: totalFeatures,
              inserted: insertedCount,
              percentage: progressPercentage,
              message: `Memasukkan data ke database... ${insertedCount}/${totalFeatures}`
            });
            
            console.log(`✅ Progress: ${insertedCount}/${totalFeatures} (${progressPercentage.toFixed(1)}%)`);
          }
          
        } catch (insertError) {
          console.error(`❌ Error inserting feature ${insertedCount}:`, insertError.message);
          errors.push({
            feature: insertedCount,
            error: insertError.message
          });
          
          // Stop after first error for debugging
          if (insertedCount === 0) {
            throw insertError;
          }
        }
      }
      
      result = await source.read();
    }
    
    // Clean up uploaded files
    uploadedFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    });
    
    // ✅ TAMBAHAN: Hitung overall reduction jika ada simplifikasi
    let overallReduction = 0;
    if (simplificationApplied === 'true' && totalOriginalPoints > 0) {
      overallReduction = ((totalOriginalPoints - totalSimplifiedPoints) / totalOriginalPoints * 100);
    }
    
    console.log(`✅ Upload complete:`, {
      inserted: insertedCount,
      simplified: simplifiedCount,
      errors: errors.length,
      ...(simplificationApplied === 'true' && {
        simplificationStats: {
          targetPercentage: `${targetPercentage}%`,
          totalOriginalPoints,
          totalSimplifiedPoints,
          overallReduction: `${overallReduction.toFixed(1)}%`
        }
      })
    });
    
    sendProgress(sessionId, {
      type: 'complete',
      total: totalFeatures,
      inserted: insertedCount,
      percentage: 100,
      message: 'Upload selesai!'
    });
    
    // Small delay to ensure message is sent
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Cleanup SSE connection
    if (global.progressClients[sessionId]) {
      delete global.progressClients[sessionId];
    }

    // ✅ PERUBAHAN: Response dengan info lebih detail
    const responseMessage = simplificationApplied === 'true' 
      ? `Successfully uploaded ${insertedCount} features to ${tableName} (${simplifiedCount} features simplified with target ${targetPercentage}% max reduction, actual overall reduction: ${overallReduction.toFixed(1)}%)`
      : `Successfully uploaded ${insertedCount} features to ${tableName}`;
    
    res.json({
      success: true,
      message: responseMessage,
      insertedCount,
      simplifiedCount: simplificationApplied === 'true' ? simplifiedCount : 0,
      simplificationApplied: simplificationApplied === 'true',
      ...(simplificationApplied === 'true' && {
        simplificationDetails: {
          targetPercentage: `${targetPercentage}%`,
          totalOriginalPoints,
          totalSimplifiedPoints,
          overallReduction: `${overallReduction.toFixed(1)}%`,
          method
        }
      }),
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Error during upload to database:', error);
    console.error('Stack:', error.stack);
    
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      sendProgress(sessionId, {
        type: 'error',
        message: error.message,
        details: error.stack
      });
      
      // Cleanup SSE connection
      if (global.progressClients[sessionId]) {
        delete global.progressClients[sessionId];
      }
    }

    // Clean up uploaded files on error
    uploadedFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    });
    
    res.status(500).json({ 
      error: 'Failed to upload to database', 
      details: error.message 
    });
  }
});

app.get('/api/tables-list', async (req, res) => {
  try {
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('file', 'kejadian', 'spatial_ref_sys')
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
      ORDER BY table_name ASC
    `;
    
    const result = await client.query(query);
    const tableNames = result.rows.map(row => row.table_name);
    
    res.json(tableNames);
  } catch (error) {
    console.error('Error fetching tables list:', error);
    res.status(500).json({ error: 'Failed to fetch tables list' });
  }
});

// NEW ENDPOINT: Get columns for a specific table
app.get('/api/table-columns/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Validate table name to prevent SQL injection
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    `;
    const tableCheck = await client.query(tableCheckQuery, [tableName]);
    
    if (tableCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    const query = `
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = $1
        AND column_name NOT IN ('geom', 'geometry', 'geometry_json')
      ORDER BY ordinal_position
    `;
    
    const result = await client.query(query, [tableName]);
    
    const columns = result.rows.map(col => ({
      name: col.name,
      type: col.type.includes('int') ? 'integer' : 
            col.type.includes('char') || col.type.includes('text') ? 'string' : 
            col.type.includes('numeric') || col.type.includes('decimal') ? 'decimal' : 
            col.type,
      required: col.is_nullable === 'NO' && col.column_default === null,
      hasDefault: col.column_default !== null,
      shouldSkip: col.column_default !== null && 
                  (col.column_default.includes('nextval') || 
                   col.name === 'gid' || 
                   col.name === 'id' ||
                   col.name === 'fid')
    }));
    
    res.json(columns);
  } catch (error) {
    console.error('Error fetching table columns:', error);
    res.status(500).json({ error: 'Failed to fetch table columns' });
  }
});

// NEW ENDPOINT: Delete layer data by table name and year
app.delete('/api/shp-layers/:tableName/year/:year', async (req, res) => {
  try {
    const { tableName, year } = req.params;
    
    console.log('='.repeat(80));
    console.log('🗑️ DELETE Layer Data Request');
    console.log('='.repeat(80));
    console.log('📋 Table:', tableName);
    console.log('📅 Year:', year);
    console.log('='.repeat(80));
    
    // STEP 1: Validasi table name untuk keamanan - cek apakah tabel benar-benar ada di database
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = $1
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('file', 'kejadian', 'spatial_ref_sys')
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
    `;
    
    console.log('🔍 Checking if table exists...');
    const tableCheck = await client.query(tableCheckQuery, [tableName]);
    
    if (tableCheck.rows.length === 0) {
      console.error('❌ Table not found or not accessible:', tableName);
      console.log('='.repeat(80));
      return res.status(404).json({ 
        error: 'Table not found',
        message: `Table '${tableName}' does not exist or is not accessible`
      });
    }
    
    console.log('✅ Table exists:', tableName);
    
    // Cek apakah tabel memiliki kolom tahun_data
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = 'tahun_data'
    `;
    const columnCheck = await client.query(checkColumnQuery, [tableName]);
    
    if (columnCheck.rows.length === 0) {
      console.error('❌ Table does not have tahun_data column');
      return res.status(400).json({ 
        error: 'Table does not support year-based deletion',
        message: `Table ${tableName} does not have tahun_data column`
      });
    }
    
    // STEP 3: Cek berapa banyak tahun unik yang ada di tabel
    const countYearsQuery = `
      SELECT COUNT(DISTINCT tahun_data) as total_years 
      FROM ${tableName} 
      WHERE tahun_data IS NOT NULL
    `;
    const yearsResult = await client.query(countYearsQuery);
    const totalYears = parseInt(yearsResult.rows[0].total_years);
    
    console.log(`📊 Total unique years in table: ${totalYears}`);
    
    // STEP 4: Cek apakah tahun yang akan dihapus ada di tabel
    const checkYearQuery = `
      SELECT COUNT(*) as count 
      FROM ${tableName} 
      WHERE tahun_data = $1
    `;
    const checkYearResult = await client.query(checkYearQuery, [parseInt(year)]);
    const rowsToDelete = parseInt(checkYearResult.rows[0].count);
    
    if (rowsToDelete === 0) {
      console.warn('⚠️ No data found for deletion');
      console.log('='.repeat(80));
      return res.status(404).json({ 
        error: 'No data found',
        message: `No data found in '${tableName}' for year ${year}`
      });
    }
    
    console.log(`📊 Rows to delete: ${rowsToDelete}`);
    
    // ✅ FITUR BARU: Jika ini tahun terakhir, DROP TABLE instead of DELETE
    if (totalYears === 1) {
      console.log('='.repeat(80));
      console.log('🔥 THIS IS THE LAST YEAR IN TABLE!');
      console.log('🗑️ Dropping entire table instead of deleting rows...');
      console.log('='.repeat(80));
      
      const dropTableQuery = `DROP TABLE IF EXISTS ${tableName} CASCADE`;
      
      try {
        await client.query(dropTableQuery);
        
        console.log('='.repeat(80));
        console.log(`✅ TABLE DROPPED SUCCESSFULLY`);
        console.log(`📋 Table: ${tableName}`);
        console.log(`📅 Last year: ${year}`);
        console.log(`📊 Total rows removed: ${rowsToDelete}`);
        console.log('='.repeat(80));
        
        return res.json({
          success: true,
          message: `Table '${tableName}' has been dropped (was the last year: ${year})`,
          action: 'table_dropped',
          tableName,
          year: parseInt(year),
          deletedCount: rowsToDelete
        });
      } catch (dropError) {
        console.error('❌ Error dropping table:', dropError);
        return res.status(500).json({ 
          error: 'Failed to drop table',
          message: dropError.message 
        });
      }
    }
    
    // STEP 5: Jika bukan tahun terakhir, DELETE data seperti biasa
    console.log('ℹ️ Not the last year, deleting rows only...');
    
    const deleteQuery = `
      DELETE FROM ${tableName}
      WHERE tahun_data = $1
      RETURNING gid
    `;
    
    console.log('🗑️ Executing DELETE query...');
    console.log('Query:', deleteQuery);
    console.log('Param:', [parseInt(year)]);
    
    const deleteResult = await client.query(deleteQuery, [parseInt(year)]);
    
    if (deleteResult.rowCount === 0) {
      console.warn('⚠️ No data found for deletion');
      return res.status(404).json({ 
        error: 'No data found',
        message: `No data found in ${tableName} for year ${year}`
      });
    }
    
    console.log(`✅ Deleted ${deleteResult.rowCount} rows from ${tableName} for year ${year}`);
    
    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.rowCount} rows from '${tableName}' for year ${year}`,
      action: 'rows_deleted',
      deletedCount: deleteResult.rowCount,
      tableName,
      year: parseInt(year),
      remainingYears: totalYears - 1
    });
    
  } catch (error) {
    console.error('❌ Error deleting layer data:', error);
    res.status(500).json({ 
      error: 'Failed to delete layer data',
      message: error.message 
    });
  }
});


function getAllCoordinates(geometry) {
  let coords = [];
  
  if (!geometry || !geometry.type) {
    console.warn('Invalid geometry object:', geometry);
    return coords;
  }
  
  try {
    if (geometry.type === 'Point') {
      coords = [geometry.coordinates];
    } else if (geometry.type === 'LineString') {
      coords = geometry.coordinates || [];
    } else if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach(ring => {
        coords = coords.concat(ring);
      });
    } else if (geometry.type === 'MultiPoint') {
      coords = geometry.coordinates || [];
    } else if (geometry.type === 'MultiLineString') {
      geometry.coordinates.forEach(line => {
        coords = coords.concat(line);
      });
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          coords = coords.concat(ring);
        });
      });
    } else {
      console.warn('Unknown geometry type:', geometry.type);
    }
  } catch (error) {
    console.error('Error getting coordinates:', error);
  }
  
  return coords;
}

function simplifyDouglasPeucker(geometry, tolerance, preventRemoval) {
  try {
    if (!geometry || !geometry.type) {
      console.warn('Invalid geometry for Douglas-Peucker');
      return geometry;
    }
    
    if (geometry.type === 'Point') {
      return geometry;
    }
    
    if (geometry.type === 'LineString') {
      const points = geometry.coordinates.map(c => ({ x: c[0], y: c[1] }));
      const simplified = simplify(points, tolerance, true);
      
      // Prevent complete removal
      if (preventRemoval && simplified.length < 3) {
        console.log('Prevented removal - keeping original LineString');
        return geometry;
      }
      
      return {
        type: 'LineString',
        coordinates: simplified.map(p => [p.x, p.y])
      };
    }
    
    if (geometry.type === 'Polygon') {
      const simplifiedRings = geometry.coordinates.map((ring, ringIdx) => {
        const points = ring.map(c => ({ x: c[0], y: c[1] }));
        const simplified = simplify(points, tolerance, true);
        
        // Ensure ring is closed and has minimum points
        if (preventRemoval && simplified.length < 4) {
          console.log(`Ring ${ringIdx}: Prevented removal - keeping original`);
          return ring;
        }
        
        // Ensure ring is closed
        const coords = simplified.map(p => [p.x, p.y]);
        if (coords.length > 0 && (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1])) {
          coords.push(coords[0]);
        }
        
        // Validate minimum ring size
        if (coords.length < 4) {
          console.warn(`Ring ${ringIdx}: Too few points after simplification, keeping original`);
          return ring;
        }
        
        return coords;
      });
      
      return {
        type: 'Polygon',
        coordinates: simplifiedRings
      };
    }
    
    if (geometry.type === 'MultiPolygon') {
      const simplifiedPolygons = geometry.coordinates.map((polygon, polyIdx) => {
        return polygon.map((ring, ringIdx) => {
          const points = ring.map(c => ({ x: c[0], y: c[1] }));
          const simplified = simplify(points, tolerance, true);
          
          if (preventRemoval && simplified.length < 4) {
            console.log(`Polygon ${polyIdx}, Ring ${ringIdx}: Prevented removal`);
            return ring;
          }
          
          const coords = simplified.map(p => [p.x, p.y]);
          if (coords.length > 0 && (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1])) {
            coords.push(coords[0]);
          }
          
          if (coords.length < 4) {
            return ring;
          }
          
          return coords;
        });
      });
      
      return {
        type: 'MultiPolygon',
        coordinates: simplifiedPolygons
      };
    }
    
    console.log(`Unsupported geometry type for simplification: ${geometry.type}`);
    return geometry;
  } catch (error) {
    console.error('Error in Douglas-Peucker:', error);
    return geometry;
  }
}

// NEW ENDPOINT: Parse DBF file to get column names AND data
app.post('/api/shp/parse-dbf', multer({ storage: multer.memoryStorage() }).single('dbfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No DBF file uploaded' });
    }
    
    // Save buffer to temporary file
    const tempDir = path.join(__dirname, 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `temp_${Date.now()}.dbf`);
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    // Read DBF using shapefile library
    const source = await shapefile.openDbf(tempFilePath);
    const firstResult = await source.read();
    
    if (firstResult.done || !firstResult.value) {
      // Clean up
      fs.unlinkSync(tempFilePath);
      return res.status(400).json({ error: 'DBF file is empty or invalid' });
    }
    
    // Get column names from first record
    const columns = Object.keys(firstResult.value);
    
    // Collect all data records
    const allData = [firstResult.value]; // Start with first record
    let nextResult = await source.read();
    
    while (!nextResult.done) {
      allData.push(nextResult.value);
      nextResult = await source.read();
    }
    
    const recordCount = allData.length;
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);
    
    console.log('✅ DBF parsed successfully');
    console.log('📋 Columns:', columns);
    console.log('📊 Record count:', recordCount);
    console.log('📝 Sample data (first 3):', allData.slice(0, 3));
    
    res.json({ 
      columns: columns,
      recordCount: recordCount,
      data: allData  // ✅ Return all data
    });
    
  } catch (error) {
    console.error('❌ Error in parse-dbf:', error);
    res.status(500).json({ 
      error: 'Failed to parse DBF file',
      details: error.message 
    });
  }
});

  // NEW ENDPOINT: Upload directly to database (without simplification)
  app.post('/api/shp/upload-direct', multer({ 
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
      }
    })
  }).array('shpFiles'), async (req, res) => {
    try {
      const { tableName, year, columnMapping } = req.body;
      const files = req.files;
      
      console.log('📤 Upload Direct Request:');
      console.log('- Table:', tableName);
      console.log('- Year:', year);
      console.log('- Files:', files?.length || 0);
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      
      if (!tableName || !year || !columnMapping) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const mapping = JSON.parse(columnMapping);
      
      console.log('\n' + '='.repeat(80));
      console.log('🗺️ COLUMN MAPPING DETAIL:');
      console.log('='.repeat(80));
      for (const [dbCol, mapConfig] of Object.entries(mapping)) {
        console.log(`\n📋 Column: ${dbCol}`);
        console.log(`   Type: ${mapConfig.type}`);
        console.log(`   Source: ${mapConfig.source}`);
        if (mapConfig.type === 'manual_table') {
          console.log(`   Has data: ${!!mapConfig.data}`);
          console.log(`   Data is array: ${Array.isArray(mapConfig.data)}`);
          console.log(`   Data length: ${mapConfig.data?.length || 0}`);
          if (mapConfig.data && mapConfig.data.length > 0) {
            console.log(`   First row keys:`, Object.keys(mapConfig.data[0]));
            console.log(`   First row sample:`, JSON.stringify(mapConfig.data[0]).substring(0, 200));
          }
        }
        if (mapConfig.type === 'auto_generate') {
          console.log(`   Config:`, mapConfig.config);
        }
      }
      console.log('='.repeat(80) + '\n');

      // Find .shp and .dbf files
      const shpFile = files.find(f => f.originalname.toLowerCase().endsWith('.shp'));
      const dbfFile = files.find(f => f.originalname.toLowerCase().endsWith('.dbf'));
      
      if (!shpFile || !dbfFile) {
        return res.status(400).json({ error: 'Missing required .shp or .dbf file' });
      }
      
      console.log('📂 Reading shapefile...');
      console.log('📂 SHP file:', shpFile.path);
      console.log('📂 DBF file:', dbfFile.path);
      
      // Read shapefile
      const source = await shapefile.open(shpFile.path, dbfFile.path);
      let result = await source.read();
      let insertedCount = 0;
      let errors = [];
      
      while (!result.done) {
        const feature = result.value;
        
        if (feature && feature.geometry && feature.properties) {
          try {
            // Build insert query based on column mapping
            const columns = [];
            const values = [];
            const placeholders = [];
            let paramIndex = 1;
            
            for (const [dbCol, mapConfig] of Object.entries(mapping)) {
              if (dbCol === 'geom' || !mapConfig.source || mapConfig.type === 'skip') continue;
              
              columns.push(dbCol);
              
              if (mapConfig.type === 'shp_column') {
                values.push(feature.properties[mapConfig.source]);
                placeholders.push(`$${paramIndex++}`);
              } else if (mapConfig.type === 'year_dropdown') {
                values.push(parseInt(year));
                placeholders.push(`$${paramIndex++}`);
              } else if (mapConfig.type === 'null') {
                values.push(null);
                placeholders.push(`$${paramIndex++}`);
              } else if (mapConfig.type === 'auto_generate') {
                if (mapConfig.config.mode === 'sequence') {
                  values.push(mapConfig.config.startFrom + insertedCount * mapConfig.config.increment);
                  placeholders.push(`$${paramIndex++}`);
                } else if (mapConfig.config.mode === 'continue') {
                  const maxQuery = `SELECT COALESCE(MAX(${dbCol}), 0) as max_val FROM ${tableName}`;
                  const maxResult = await client.query(maxQuery);
                  const maxVal = maxResult.rows[0].max_val;
                  values.push(maxVal + mapConfig.config.increment);
                  placeholders.push(`$${paramIndex++}`);
                } else if (mapConfig.config.mode === 'random') {
                  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                  let randomStr = '';
                  for (let i = 0; i < mapConfig.config.length; i++) {
                    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
                  }
                  values.push(randomStr);
                  placeholders.push(`$${paramIndex++}`);
                } else {
                  values.push(null);
                  placeholders.push(`$${paramIndex++}`);
                }
              } else if (mapConfig.type === 'manual_table') {
                // Manual table data adalah array of objects dengan _rowId
                console.log(`🔧 Processing manual_table for column: ${dbCol}`);
                console.log(`📊 Manual data exists:`, !!mapConfig.data);
                console.log(`📊 Manual data is array:`, Array.isArray(mapConfig.data));
                console.log(`📊 Manual data length:`, mapConfig.data?.length || 0);
                console.log(`📊 Current insertedCount:`, insertedCount);
                
                if (mapConfig.data && Array.isArray(mapConfig.data)) {
                  // Coba cari berdasarkan _rowId
                  const rowData = mapConfig.data.find(row => row._rowId === insertedCount);
                  console.log(`🔍 Found row by _rowId (${insertedCount}):`, !!rowData);
                  
                  if (rowData && rowData[dbCol] !== undefined) {
                    console.log(`✅ Using value from _rowId match: "${rowData[dbCol]}"`);
                    values.push(rowData[dbCol]);
                  } else {
                    // Fallback: coba akses langsung by index
                    const directData = mapConfig.data[insertedCount];
                    console.log(`🔍 Trying direct index access [${insertedCount}]:`, !!directData);
                    
                    if (directData && directData[dbCol] !== undefined) {
                      console.log(`✅ Using value from direct index: "${directData[dbCol]}"`);
                      values.push(directData[dbCol]);
                    } else {
                      console.log(`⚠️ No data found for column ${dbCol}, using null`);
                      values.push(null);
                    }
                  }
                } else {
                  console.log(`❌ mapConfig.data is not valid array, using null`);
                  values.push(null);
                }
                placeholders.push(`$${paramIndex++}`);
              } else {
                values.push(null);
                placeholders.push(`$${paramIndex++}`);
              }
            }
            
            // Add geometry column
            columns.push('geom');
            values.push(JSON.stringify(feature.geometry));
            placeholders.push(`ST_SetSRID(ST_GeomFromGeoJSON($${paramIndex}::json), 4326)`);

            const insertQuery = `
              INSERT INTO ${tableName} (${columns.join(', ')})
              VALUES (${placeholders.join(', ')})
            `;

            // Debug log untuk first insert
            if (insertedCount === 0) {
              console.log('='.repeat(80));
              console.log('🔍 DEBUG INSERT QUERY:');
              console.log('='.repeat(80));
              console.log('📋 Table name:', tableName);
              console.log('📋 Columns:', columns);
              console.log('📋 Placeholders:', placeholders);
              console.log('📋 Values count:', values.length);
              console.log('📋 Query:', insertQuery);
              console.log('📋 First geometry (200 chars):', JSON.stringify(feature.geometry).substring(0, 200));
              console.log('='.repeat(80));
            }

            await client.query(insertQuery, values);
            insertedCount++;
            
            if (insertedCount % 10 === 0) {
              console.log(`✅ Inserted ${insertedCount} features...`);
            }
            
          } catch (insertError) {
            console.error(`❌ Error inserting feature ${insertedCount}:`, insertError.message);
            console.error('Full error:', insertError);
            errors.push({
              feature: insertedCount,
              error: insertError.message
            });
            // Stop after first error for debugging
            if (insertedCount === 0) {
              throw insertError;
            }
          }
        }
        
        result = await source.read();
      }
      
      // Clean up uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      console.log(`✅ Upload complete: ${insertedCount} features inserted`);
      if (errors.length > 0) {
        console.log(`⚠️ ${errors.length} errors occurred`);
      }
      
      res.json({
        success: true,
        message: `Successfully uploaded ${insertedCount} features to ${tableName}`,
        insertedCount,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      console.error('❌ Error during direct upload:', error);
      console.error('Stack:', error.stack);
      
      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to upload to database', 
        details: error.message 
      });
    }
  });

  app.post('/api/cleanup-temp-files', express.json(), async (req, res) => {
    try {
      const { filenames } = req.body;
      
      if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
        return res.status(400).json({ error: 'No filenames provided' });
      }
      
      console.log('🗑️ Cleanup request for files:', filenames);
      
      let deletedCount = 0;
      let notFoundCount = 0;
      let errors = [];
      
      // Baca semua file di folder uploads
      const uploadedFiles = fs.readdirSync(uploadDir);
      
      filenames.forEach(originalFilename => {
        // Cari file yang mengandung nama original atau sama extension
        const matchingFiles = uploadedFiles.filter(uploadedFile => {
          // Match by original filename atau extension
          return uploadedFile.includes(path.parse(originalFilename).name) ||
                (uploadedFile.endsWith(path.extname(originalFilename)) &&
                  uploadedFile.includes('17608')); // Prefix timestamp pattern
        });
        
        if (matchingFiles.length === 0) {
          notFoundCount++;
          console.warn(`⚠️ No matching files found for: ${originalFilename}`);
          return;
        }
        
        matchingFiles.forEach(filename => {
          const filePath = path.join(uploadDir, filename);
          
          try {
            const stats = fs.statSync(filePath);
            
            // Pastikan file dan extensionnya allowed (SHP related)
            if (stats.isFile()) {
              const ext = path.extname(filename).toLowerCase();
              const allowedExtensions = ['.shp', '.shx', '.dbf', '.prj', '.cpg', '.sbn', '.sbx'];
              
              if (allowedExtensions.includes(ext)) {
                fs.unlinkSync(filePath);
                deletedCount++;
                console.log(`🗑️ Deleted: ${filename}`);
              } else {
                console.warn(`⚠️ Skipped (not SHP file): ${filename}`);
              }
            }
          } catch (fileError) {
            errors.push({
              filename,
              error: fileError.message
            });
            console.error(`❌ Failed to delete ${filename}:`, fileError.message);
          }
        });
      });
      
      console.log(`✅ Cleanup summary: ${deletedCount} deleted, ${notFoundCount} not found, ${errors.length} errors`);
      
      res.json({
        success: true,
        message: `Cleanup complete: ${deletedCount} file(s) deleted`,
        deletedCount,
        notFoundCount,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      res.status(500).json({ 
        error: 'Failed to cleanup files',
        message: error.message 
      });
    }
  });

  function detectColumnType(columnName, sampleValues) {
  const lowerName = columnName.toLowerCase();
  
  // ✅ PERBAIKAN 1: Kolom khusus yang PASTI bukan serial
  // Kolom ID dari SHP adalah INTEGER biasa, bukan auto-increment
  if (lowerName.includes('objectid') || lowerName.includes('fid') || lowerName === 'id') {
    return 'integer';  // Bukan serial!
  }
  
  // ✅ PERBAIKAN 2: GlobalID/UUID selalu VARCHAR (bahkan jika sample-nya angka)
  if (lowerName.includes('globalid') || lowerName.includes('uuid') || lowerName.includes('guid')) {
    return 'varchar(255)';  // UUID bisa jadi string atau angka di SHP
  }
  
  // Kolom tahun
  if (lowerName.includes('tahun') || lowerName === 'year') {
    return 'integer';
  }
  
  // Kolom measurement (luas, panjang, area, dll)
  if (lowerName.includes('luas') || lowerName.includes('area') || 
      lowerName.includes('panjang') || lowerName.includes('length') ||
      lowerName.includes('shape_')) {
    return 'numeric(15,2)';
  }
  
  // ✅ PERBAIKAN 3: Analisis sample values dengan hati-hati
  if (!sampleValues || sampleValues.length === 0) {
    return 'text';
  }
  
  const nonNullValues = sampleValues.filter(v => v !== null && v !== undefined && v !== '');
  
  if (nonNullValues.length === 0) {
    return 'text';
  }
  
  // Cek apakah ada nilai string panjang (>50 char) → pasti text/varchar
  const hasLongString = nonNullValues.some(v => String(v).length > 50);
  if (hasLongString) {
    const maxLength = Math.max(...nonNullValues.map(v => String(v).length));
    const varcharLength = Math.min(maxLength + 50, 1000);
    return `varchar(${varcharLength})`;
  }
  
  // Cek apakah semua nilai adalah integer
  const allIntegers = nonNullValues.every(v => {
    const num = Number(v);
    return !isNaN(num) && Number.isInteger(num);
  });
  
  if (allIntegers) {
    return 'integer';  // INTEGER biasa, BUKAN serial
  }
  
  // Cek apakah semua nilai adalah numeric (float/decimal)
  const allNumeric = nonNullValues.every(v => !isNaN(Number(v)));
  
  if (allNumeric) {
    return 'numeric(15,2)';
  }
  
  // Default: varchar dengan panjang dinamis
  const maxLength = Math.max(...nonNullValues.map(v => String(v).length));
  const varcharLength = Math.min(Math.max(maxLength + 50, 100), 500);
  
  return `varchar(${varcharLength})`;
}

// ============================================================
// ENDPOINT 1: Analyze SHP structure untuk create table
// ============================================================
app.post('/api/shp/analyze-structure', multer({ 
  storage: multer.memoryStorage()
}).single('dbfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No DBF file uploaded' });
    }
    
    const tempDir = path.join(__dirname, 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `temp_${Date.now()}.dbf`);
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    const source = await shapefile.openDbf(tempFilePath);
    
    // Read sample data (first 100 records)
    const sampleData = [];
    let result = await source.read();
    let count = 0;
    
    while (!result.done && count < 100) {
      sampleData.push(result.value);
      result = await source.read();
      count++;
    }
    
    if (sampleData.length === 0) {
      fs.unlinkSync(tempFilePath);
      return res.status(400).json({ error: 'DBF file is empty' });
    }
    
    // Analyze columns
    const columns = Object.keys(sampleData[0]);
    const columnDefinitions = columns.map(colName => {
      const sampleValues = sampleData.map(row => row[colName]).slice(0, 20);
      const dataType = detectColumnType(colName, sampleValues);
      
      return {
        name: colName.toLowerCase(),
        originalName: colName,
        type: dataType,
        nullable: true
      };
    });
    
    fs.unlinkSync(tempFilePath);
    
    console.log('✅ Analyzed DBF structure:', columnDefinitions);
    
    res.json({
      columns: columnDefinitions,
      sampleCount: sampleData.length,
      totalColumns: columns.length
    });
    
  } catch (error) {
    console.error('❌ Error analyzing DBF structure:', error);
    res.status(500).json({ 
      error: 'Failed to analyze DBF structure',
      details: error.message 
    });
  }
});

// ============================================================
// ENDPOINT 2: Create table baru di database
// ============================================================
app.post('/api/tables/create', express.json(), async (req, res) => {
  try {
    const { tableName, columns, addDefaultColumns } = req.body;
    
    console.log('📋 Create table request:', {
      tableName,
      columnsCount: columns?.length || 0,
      addDefaultColumns
    });
    
    if (!tableName || !columns || columns.length === 0) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Validasi nama tabel
    const validPattern = /^[a-z][a-z0-9_]*$/;
    if (!validPattern.test(tableName)) {
      return res.status(400).json({ 
        error: 'Invalid table name format. Must be lowercase, start with letter, contain only letters, numbers, and underscores.' 
      });
    }
    
    // Cek apakah tabel sudah ada
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    `;
    const existing = await client.query(checkQuery, [tableName]);
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: `Table '${tableName}' already exists` 
      });
    }
    
    // Build CREATE TABLE query
    let columnDefs = [];
    
    // Add default columns jika diminta
    if (addDefaultColumns) {
      columnDefs.push('gid serial PRIMARY KEY');
    }
    
    // Add columns dari SHP
    columns.forEach(col => {
      const colDef = `${col.name} ${col.type}${col.nullable ? '' : ' NOT NULL'}`;
      columnDefs.push(colDef);
    });
    
    // Add geometry column
    columnDefs.push('geom geometry(Geometry, 4326)');
    
    const createTableQuery = `
      CREATE TABLE ${tableName} (
        ${columnDefs.join(',\n        ')}
      )
    `;
    
    console.log('🔨 Creating table with query:');
    console.log(createTableQuery);
    
    await client.query(createTableQuery);
    
    // Create spatial index
    const createIndexQuery = `
      CREATE INDEX ${tableName}_geom_idx 
      ON ${tableName} USING GIST (geom)
    `;
    
    await client.query(createIndexQuery);
    
    console.log(`✅ Table '${tableName}' created successfully with spatial index`);
    
    res.json({
      success: true,
      message: `Table '${tableName}' created successfully`,
      tableName,
      columnsCreated: columnDefs.length
    });
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    res.status(500).json({ 
      error: 'Failed to create table',
      details: error.message 
    });
  }
});

// ============================================================
// ENDPOINT 3: Create table + Upload SHP (Direct)
// ============================================================
app.post('/api/shp/create-table-and-upload', multer({ 
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
}).array('shpFiles'), async (req, res) => {
  let uploadedFilePaths = [];
  let tableCreated = false;
  
  try {
    const { tableName, year, columnMapping, isNewTable } = req.body;
    const files = req.files;
    
    console.log('🆕 Create table + upload request:', {
      tableName,
      year,
      isNewTable,
      filesCount: files?.length || 0
    });
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    uploadedFilePaths = files.map(f => f.path);
    
    const mapping = JSON.parse(columnMapping);
    
    const shpFile = files.find(f => f.originalname.toLowerCase().endsWith('.shp'));
    const dbfFile = files.find(f => f.originalname.toLowerCase().endsWith('.dbf'));
    
    if (!shpFile || !dbfFile) {
      return res.status(400).json({ error: 'Missing required .shp or .dbf file' });
    }
    
    // STEP 1: Jika tabel baru, create table dulu
    if (isNewTable === 'true') {
      console.log('🔨 Creating new table:', tableName);
      
      // Analyze DBF untuk detect column types
      const source = await shapefile.openDbf(dbfFile.path);
      const firstResult = await source.read();
      
      if (firstResult.done || !firstResult.value) {
        return res.status(400).json({ error: 'DBF file is empty' });
      }
      
      // Collect sample data
      const sampleData = [firstResult.value];
      let nextResult = await source.read();
      let sampleCount = 1;
      
      while (!nextResult.done && sampleCount < 20) {
        sampleData.push(nextResult.value);
        nextResult = await source.read();
        sampleCount++;
      }
      
      // Build column definitions
      const columnDefs = [];
      
      for (const [dbCol, mapConfig] of Object.entries(mapping)) {
        if (dbCol === 'geom' || mapConfig.type === 'skip') continue;
        
        let colType = 'text';
        
        if (mapConfig.type === 'shp_column') {
          const sampleValues = sampleData.map(row => row[mapConfig.source]);
          colType = detectColumnType(mapConfig.source, sampleValues);
        } else if (mapConfig.type === 'year_dropdown') {
          colType = 'integer';
        } else if (mapConfig.type === 'auto_generate') {
          if (mapConfig.config.mode === 'sequence' || mapConfig.config.mode === 'continue') {
            colType = 'integer';
          } else {
            colType = 'varchar(50)';
          }
        }
        
        columnDefs.push(`${dbCol} ${colType}`);
      }
      
      // Add geometry column
      columnDefs.push('geom geometry(Geometry, 4326)');
      
      const createTableQuery = `
        CREATE TABLE ${tableName} (
          gid serial PRIMARY KEY,
          ${columnDefs.join(',\n          ')}
        )
      `;
      
      console.log('📋 Creating table:', createTableQuery);
      
      await client.query(createTableQuery);
      tableCreated = true;
      
      // Create spatial index
      await client.query(`
        CREATE INDEX ${tableName}_geom_idx 
        ON ${tableName} USING GIST (geom)
      `);
      
      console.log(`✅ Table '${tableName}' created successfully`);
    }
    
    // STEP 2: Upload data ke table
    console.log('📤 Uploading data to table:', tableName);
    
    const source = await shapefile.open(shpFile.path, dbfFile.path);
    let result = await source.read();
    let insertedCount = 0;
    let errors = [];
    
    while (!result.done) {
      const feature = result.value;
      
      if (feature && feature.geometry && feature.properties) {
        try {
          const columns = [];
          const values = [];
          const placeholders = [];
          let paramIndex = 1;
          
          for (const [dbCol, mapConfig] of Object.entries(mapping)) {
            if (dbCol === 'geom' || !mapConfig.source || mapConfig.type === 'skip') continue;
            
            columns.push(dbCol);
            
            if (mapConfig.type === 'shp_column') {
              values.push(feature.properties[mapConfig.source]);
              placeholders.push(`$${paramIndex++}`);
            } else if (mapConfig.type === 'year_dropdown') {
              values.push(parseInt(year));
              placeholders.push(`$${paramIndex++}`);
            } else if (mapConfig.type === 'null') {
              values.push(null);
              placeholders.push(`$${paramIndex++}`);
            } else if (mapConfig.type === 'auto_generate') {
              if (mapConfig.config.mode === 'sequence') {
                values.push(mapConfig.config.startFrom + insertedCount * mapConfig.config.increment);
                placeholders.push(`$${paramIndex++}`);
              } else if (mapConfig.config.mode === 'continue') {
                const maxQuery = `SELECT COALESCE(MAX(${dbCol}), 0) as max_val FROM ${tableName}`;
                const maxResult = await client.query(maxQuery);
                const maxVal = maxResult.rows[0].max_val;
                values.push(maxVal + mapConfig.config.increment);
                placeholders.push(`$${paramIndex++}`);
              } else if (mapConfig.config.mode === 'random') {
                const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                let randomStr = '';
                for (let i = 0; i < mapConfig.config.length; i++) {
                  randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                values.push(randomStr);
                placeholders.push(`$${paramIndex++}`);
              } else {
                values.push(null);
                placeholders.push(`$${paramIndex++}`);
              }
            } else {
              values.push(null);
              placeholders.push(`$${paramIndex++}`);
            }
          }
          
          // Add geometry
          columns.push('geom');
          values.push(JSON.stringify(feature.geometry));
          placeholders.push(`ST_SetSRID(ST_GeomFromGeoJSON($${paramIndex}::json), 4326)`);
          
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
          `;
          
          if (insertedCount === 0) {
            console.log('='.repeat(80));
            console.log('🔍 DEBUG INSERT QUERY:');
            console.log('='.repeat(80));
            console.log('📋 Table name:', tableName);
            console.log('📋 Columns:', columns);
            console.log('📋 Placeholders:', placeholders);
            console.log('📋 Values types:', values.map((v, i) => `[${i}] ${typeof v}`));
            console.log('📋 Values preview:', values.map((v, i) => {
              if (typeof v === 'string' && v.length > 100) {
                return `[${i}] ${v.substring(0, 100)}... (${v.length} chars)`;
              }
              return `[${i}] ${v}`;
            }));
            console.log('📋 Query:', insertQuery);
            console.log('='.repeat(80));
          }

          await client.query(insertQuery, values);
          insertedCount++;
          
          if (insertedCount % 10 === 0) {
            console.log(`✅ Inserted ${insertedCount} features...`);
          }
          
        } catch (insertError) {
          console.error(`❌ Error inserting feature ${insertedCount}:`, insertError.message);
          errors.push({
            feature: insertedCount,
            error: insertError.message
          });
          
          if (insertedCount === 0) {
            throw insertError;
          }
        }
      }
      
      result = await source.read();
    }
    
    // Clean up files
    uploadedFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    });
    
    console.log(`✅ Upload complete: ${insertedCount} features inserted`);
    
    res.json({
      success: true,
      message: isNewTable === 'true' 
        ? `Table '${tableName}' created and ${insertedCount} features uploaded successfully`
        : `Successfully uploaded ${insertedCount} features to ${tableName}`,
      tableName,
      tableCreated: isNewTable === 'true',
      insertedCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Error during create table + upload:', error);
    
    // Rollback: Drop table jika sudah dibuat
    if (tableCreated && req.body.tableName) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${req.body.tableName} CASCADE`);
        console.log(`🔄 Rolled back: dropped table ${req.body.tableName}`);
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
    
    // Clean up files
    uploadedFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    });
    
    res.status(500).json({ 
      error: 'Failed to create table and upload',
      details: error.message 
    });
  }
});

// ============================================================
// ENDPOINT 4: Create table + Upload dengan Simplifikasi
// ============================================================
app.post('/api/shp/create-table-and-simplify', multer({ 
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
}).array('shpFiles'), async (req, res) => {
  let uploadedFilePaths = [];
  let tableCreated = false;
  
  try {
    const { 
      tableName, 
      year, 
      columnMapping, 
      isNewTable,
      simplificationApplied, 
      method, 
      percentage, 
      preventShapeRemoval 
    } = req.body;
    
    const files = req.files;
    
    console.log('🆕 Create table + simplify + upload request:', {
      tableName,
      year,
      isNewTable,
      simplificationApplied,
      method,
      percentage: `${percentage}%`,
      filesCount: files?.length || 0
    });
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    uploadedFilePaths = files.map(f => f.path);
    
    const mapping = JSON.parse(columnMapping);
    
    const shpFile = files.find(f => f.originalname.toLowerCase().endsWith('.shp'));
    const dbfFile = files.find(f => f.originalname.toLowerCase().endsWith('.dbf'));
    
    if (!shpFile || !dbfFile) {
      return res.status(400).json({ error: 'Missing required .shp or .dbf file' });
    }
    
    // STEP 1: Jika tabel baru, create table dulu (sama seperti endpoint sebelumnya)
    if (isNewTable === 'true') {
      console.log('🔨 Creating new table:', tableName);
      
      const source = await shapefile.openDbf(dbfFile.path);
      const firstResult = await source.read();
      
      if (firstResult.done || !firstResult.value) {
        return res.status(400).json({ error: 'DBF file is empty' });
      }
      
      const sampleData = [firstResult.value];
      let nextResult = await source.read();
      let sampleCount = 1;
      
      while (!nextResult.done && sampleCount < 20) {
        sampleData.push(nextResult.value);
        nextResult = await source.read();
        sampleCount++;
      }
      
      const columnDefs = [];
      
      for (const [dbCol, mapConfig] of Object.entries(mapping)) {
        if (dbCol === 'geom' || mapConfig.type === 'skip') continue;
        
        let colType = 'text';
        
        if (mapConfig.type === 'shp_column') {
          const sampleValues = sampleData.map(row => row[mapConfig.source]);
          colType = detectColumnType(mapConfig.source, sampleValues);
        } else if (mapConfig.type === 'year_dropdown') {
          colType = 'integer';
        } else if (mapConfig.type === 'auto_generate') {
          if (mapConfig.config.mode === 'sequence' || mapConfig.config.mode === 'continue') {
            colType = 'integer';
          } else {
            colType = 'varchar(50)';
          }
        }
        
        columnDefs.push(`${dbCol} ${colType}`);
      }
      
      columnDefs.push('geom geometry(Geometry, 4326)');
      
      const createTableQuery = `
        CREATE TABLE ${tableName} (
          gid serial PRIMARY KEY,
          ${columnDefs.join(',\n          ')}
        )
      `;
      
      console.log('📋 Creating table:', createTableQuery);
      
      await client.query(createTableQuery);
      tableCreated = true;
      
      await client.query(`
        CREATE INDEX ${tableName}_geom_idx 
        ON ${tableName} USING GIST (geom)
      `);
      
      console.log(`✅ Table '${tableName}' created successfully`);
    }
    
    // STEP 2: Upload data dengan simplifikasi
    console.log('📤 Uploading data with simplification to table:', tableName);
    
    const targetPercentage = simplificationApplied === 'true' && percentage
      ? parseFloat(percentage)
      : 0;
    
    const source = await shapefile.open(shpFile.path, dbfFile.path);
    let result = await source.read();
    let insertedCount = 0;
    let simplifiedCount = 0;
    let errors = [];
    
    let totalOriginalPoints = 0;
    let totalSimplifiedPoints = 0;
    
    while (!result.done) {
      const feature = result.value;
      
      if (feature && feature.geometry && feature.properties) {
        try {
          let geometryToInsert = feature.geometry;
          
          // Apply simplification
          if (simplificationApplied === 'true' && method && targetPercentage > 0) {
            const originalPoints = getAllCoordinates(feature.geometry).length;
            totalOriginalPoints += originalPoints;
            
            if (method === 'douglas-peucker') {
              geometryToInsert = simplifyDouglasPeuckerWithTargetPercentage(
                feature.geometry, 
                targetPercentage,
                preventShapeRemoval === 'true'
              );
            } else if (method === 'visvalingam-effective' || method === 'visvalingam-weighted') {
              const tolerance = (100 - targetPercentage) / 1000;
              geometryToInsert = simplifyVisvalingam(
                feature.geometry, 
                tolerance, 
                preventShapeRemoval === 'true'
              );
            }
            
            const simplifiedPoints = getAllCoordinates(geometryToInsert).length;
            totalSimplifiedPoints += simplifiedPoints;
            
            if (simplifiedPoints < originalPoints) {
              simplifiedCount++;
            }
          }
          
          const columns = [];
          const values = [];
          const placeholders = [];
          let paramIndex = 1;
          
          for (const [dbCol, mapConfig] of Object.entries(mapping)) {
            if (dbCol === 'geom' || !mapConfig.source || mapConfig.type === 'skip') continue;
            
            columns.push(dbCol);
            
            if (mapConfig.type === 'shp_column') {
              values.push(feature.properties[mapConfig.source]);
              placeholders.push(`$${paramIndex++}`);
            } else if (mapConfig.type === 'year_dropdown') {
              values.push(parseInt(year));
              placeholders.push(`$${paramIndex++}`);
            } else if (mapConfig.type === 'null') {
              values.push(null);
              placeholders.push(`$${paramIndex++}`);
            } else if (mapConfig.type === 'auto_generate') {
              if (mapConfig.config.mode === 'sequence') {
                values.push(mapConfig.config.startFrom + insertedCount * mapConfig.config.increment);
                placeholders.push(`$${paramIndex++}`);
              } else if (mapConfig.config.mode === 'continue') {
                const maxQuery = `SELECT COALESCE(MAX(${dbCol}), 0) as max_val FROM ${tableName}`;
                const maxResult = await client.query(maxQuery);
                const maxVal = maxResult.rows[0].max_val;
                values.push(maxVal + mapConfig.config.increment);
                placeholders.push(`$${paramIndex++}`);
              } else if (mapConfig.config.mode === 'random') {
                const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                let randomStr = '';
                for (let i = 0; i < mapConfig.config.length; i++) {
                  randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                values.push(randomStr);
                placeholders.push(`$${paramIndex++}`);
              } else {
                values.push(null);
                placeholders.push(`$${paramIndex++}`);
              }
            } else {
              values.push(null);
              placeholders.push(`$${paramIndex++}`);
            }
          }
          
          columns.push('geom');
          values.push(JSON.stringify(geometryToInsert));
          placeholders.push(`ST_SetSRID(ST_GeomFromGeoJSON($${paramIndex}::json), 4326)`);
          
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
          `;
          
          await client.query(insertQuery, values);
          insertedCount++;
          
          if (insertedCount % 10 === 0) {
            console.log(`✅ Inserted ${insertedCount} features...`);
          }
          
        } catch (insertError) {
          console.error(`❌ Error inserting feature ${insertedCount}:`, insertError.message);
          errors.push({
            feature: insertedCount,
            error: insertError.message
          });
          
          if (insertedCount === 0) {
            throw insertError;
          }
        }
      }
      
      result = await source.read();
    }
    
    // Clean up files
    uploadedFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    });
    
    let overallReduction = 0;
    if (simplificationApplied === 'true' && totalOriginalPoints > 0) {
      overallReduction = ((totalOriginalPoints - totalSimplifiedPoints) / totalOriginalPoints * 100);
    }
    
    console.log(`✅ Upload complete:`, {
      inserted: insertedCount,
      simplified: simplifiedCount,
      errors: errors.length,
      tableCreated: isNewTable === 'true'
    });
    
    const responseMessage = isNewTable === 'true'
      ? `Table '${tableName}' created and ${insertedCount} features uploaded successfully${simplificationApplied === 'true' ? ` (${simplifiedCount} features simplified, ${overallReduction.toFixed(1)}% overall reduction)` : ''}`
      : `Successfully uploaded ${insertedCount} features to ${tableName}${simplificationApplied === 'true' ? ` (${simplifiedCount} features simplified)` : ''}`;
    
    res.json({
      success: true,
      message: responseMessage,
      tableName,
      tableCreated: isNewTable === 'true',
      insertedCount,
      simplifiedCount: simplificationApplied === 'true' ? simplifiedCount : 0,
      simplificationApplied: simplificationApplied === 'true',
      ...(simplificationApplied === 'true' && {
        simplificationDetails: {
          targetPercentage: `${targetPercentage}%`,
          totalOriginalPoints,
          totalSimplifiedPoints,
          overallReduction: `${overallReduction.toFixed(1)}%`,
          method
        }
      }),
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Error during create table + simplify + upload:', error);
    
    // Rollback: Drop table jika sudah dibuat
    if (tableCreated && req.body.tableName) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${req.body.tableName} CASCADE`);
        console.log(`🔄 Rolled back: dropped table ${req.body.tableName}`);
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
    
    // Clean up files
    uploadedFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    });
    
    res.status(500).json({ 
      error: 'Failed to create table with simplification and upload',
      details: error.message 
    });
  }
});



const kegiatanStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'dokumen_terkait') {
      const docDir = path.join(__dirname, 'uploads/documents');
      if (!fs.existsSync(docDir)) {
        fs.mkdirSync(docDir, { recursive: true });
      }
      cb(null, docDir);
    } else {
      const imgDir = path.join(__dirname, 'uploads/images');
      if (!fs.existsSync(imgDir)) {
        fs.mkdirSync(imgDir, { recursive: true });
      }
      cb(null, imgDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const kegiatanUpload = multer({ 
  storage: kegiatanStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadKegiatanFields = kegiatanUpload.fields([
  { name: 'dokumen_terkait', maxCount: 5 },
  { name: 'foto_dokumentasi', maxCount: 5 },
  { name: 'peta_awal', maxCount: 1 },
  { name: 'peta_setelah', maxCount: 1 },
  { name: 'peta_kerentanan', maxCount: 1 }
]);

// Ganti endpoint GET /api/rekomendasi yang sudah ada dengan ini:
app.get('/api/rekomendasi', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT 
        r.id,
        r.provinsi,
        r.kabupaten,
        r.kecamatan,
        r.das,
        r.sub_das,
        r.banjir,
        r.longsor,
        r.kebakaran_hutan,
        r.kerawanan,
        r.created_at,
        r.updated_at,
        k.id as kegiatan_id,
        CASE WHEN k.id IS NOT NULL THEN TRUE ELSE FALSE END as has_kegiatan
      FROM rekomendasi_mitigasi_adaptasi r
      LEFT JOIN kegiatan_mitigasi k ON r.id = k.rekomendasi_id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rekomendasi:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Buat rekomendasi baru
app.post('/api/rekomendasi', express.json(), async (req, res) => {
  const { provinsi, kabupaten, kecamatan, das, sub_das, banjir, longsor, kebakaran_hutan, kerawanan } = req.body;
  
  if (!provinsi || !kabupaten || !kecamatan || !das) {
    return res.status(400).json({ error: 'Field wajib tidak lengkap' });
  }
  
  try {
    const result = await client.query(`
      INSERT INTO rekomendasi_mitigasi_adaptasi 
        (provinsi, kabupaten, kecamatan, das, sub_das, banjir, longsor, kebakaran_hutan, kerawanan)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [provinsi, kabupaten, kecamatan, das, sub_das, banjir, longsor, kebakaran_hutan, kerawanan]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating rekomendasi:', error);
    res.status(500).json({ error: 'Failed to create rekomendasi', details: error.message });
  }
});

// PUT: Edit rekomendasi
app.put('/api/rekomendasi/:id', express.json(), async (req, res) => {
  const { id } = req.params;
  const { provinsi, kabupaten, kecamatan, das, sub_das, banjir, longsor, kebakaran_hutan, kerawanan } = req.body;
  try {
    const result = await client.query(`
      UPDATE rekomendasi_mitigasi_adaptasi
      SET provinsi = $1, kabupaten = $2, kecamatan = $3, das = $4, sub_das = $5,
          banjir = $6, longsor = $7, kebakaran_hutan = $8, kerawanan = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [provinsi, kabupaten, kecamatan, das, sub_das, banjir, longsor, kebakaran_hutan, kerawanan, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rekomendasi not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating rekomendasi:', error);
    res.status(500).json({ error: 'Failed to update rekomendasi' });
  }
});

// DELETE: Hapus rekomendasi (otomatis hapus kegiatan terkait karena ON DELETE CASCADE)
app.delete('/api/rekomendasi/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query(`
      DELETE FROM rekomendasi_mitigasi_adaptasi
      WHERE id = $1
      RETURNING id
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rekomendasi not found' });
    }
    res.json({ success: true, message: 'Rekomendasi deleted' });
  } catch (error) {
    console.error('Error deleting rekomendasi:', error);
    res.status(500).json({ error: 'Failed to delete rekomendasi' });
  }
});

// GET: Detail kegiatan by ID
app.get('/api/kegiatan-mitigasi/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query(`
      SELECT * FROM kegiatan_mitigasi WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kegiatan tidak ditemukan' });
    }
    
    const kegiatan = result.rows[0];
    res.json(kegiatan);
  } catch (error) {
    console.error('Error fetching kegiatan:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Create kegiatan
// POST: Create kegiatan
app.post('/api/kegiatan-mitigasi', uploadKegiatanFields, async (req, res) => {
  try {
    const { rekomendasi_id, metode, analisis, monev } = req.body;
    
    // Check if rekomendasi already has kegiatan
    const checkQuery = await client.query(
      'SELECT id FROM kegiatan_mitigasi WHERE rekomendasi_id = $1',
      [rekomendasi_id]
    );
    
    if (checkQuery.rows.length > 0) {
      return res.status(400).json({ error: 'Rekomendasi ini sudah memiliki kegiatan' });
    }
    
    // ✅ Process files dengan path yang benar
    const dokumenTerkait = req.files['dokumen_terkait'] 
      ? req.files['dokumen_terkait'].map(f => `/uploads/documents/${f.filename}`)  // ✅ Ubah path
      : [];
    
    const fotoDokumentasi = req.files['foto_dokumentasi']
      ? req.files['foto_dokumentasi'].map(f => `/uploads/images/${f.filename}`)  // ✅ Ubah path
      : [];
    
    const petaAwal = req.files['peta_awal']
      ? `/uploads/images/${req.files['peta_awal'][0].filename}`  // ✅ Ubah path
      : null;
    
    const petaSetelah = req.files['peta_setelah']
      ? `/uploads/images/${req.files['peta_setelah'][0].filename}`  // ✅ Ubah path
      : null;
    
    const petaKerentanan = req.files['peta_kerentanan']
      ? `/uploads/images/${req.files['peta_kerentanan'][0].filename}`  // ✅ Ubah path
      : null;
    
    // Insert into database
    const insertQuery = `
      INSERT INTO kegiatan_mitigasi 
      (rekomendasi_id, metode, analisis, monev, dokumen_terkait, foto_dokumentasi, 
       peta_awal, peta_setelah, peta_kerentanan) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      rekomendasi_id,
      metode,
      analisis,
      monev,
      JSON.stringify(dokumenTerkait),
      JSON.stringify(fotoDokumentasi),
      petaAwal,
      petaSetelah,
      petaKerentanan
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating kegiatan:', error);
    res.status(500).json({ error: 'Gagal membuat kegiatan' });
  }
});

// PUT: Update kegiatan
// PUT: Update kegiatan
app.put('/api/kegiatan-mitigasi/:id', uploadKegiatanFields, async (req, res) => {
  try {
    const { id } = req.params;
    const { metode, analisis, monev } = req.body;
    
    // Get existing kegiatan
    const existingResult = await client.query(
      'SELECT * FROM kegiatan_mitigasi WHERE id = $1',
      [id]
    );
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kegiatan tidak ditemukan' });
    }
    
    const existingKegiatan = existingResult.rows[0];
    
    // ✅ Process files dengan path yang benar
    const dokumenTerkait = req.files['dokumen_terkait']
      ? req.files['dokumen_terkait'].map(f => `/uploads/documents/${f.filename}`)  // ✅ Ubah path
      : (existingKegiatan.dokumen_terkait ? JSON.parse(existingKegiatan.dokumen_terkait) : []);
    
    const fotoDokumentasi = req.files['foto_dokumentasi']
      ? req.files['foto_dokumentasi'].map(f => `/uploads/images/${f.filename}`)  // ✅ Ubah path
      : (existingKegiatan.foto_dokumentasi ? JSON.parse(existingKegiatan.foto_dokumentasi) : []);
    
    const petaAwal = req.files['peta_awal']
      ? `/uploads/images/${req.files['peta_awal'][0].filename}`  // ✅ Ubah path
      : existingKegiatan.peta_awal;
    
    const petaSetelah = req.files['peta_setelah']
      ? `/uploads/images/${req.files['peta_setelah'][0].filename}`  // ✅ Ubah path
      : existingKegiatan.peta_setelah;
    
    const petaKerentanan = req.files['peta_kerentanan']
      ? `/uploads/images/${req.files['peta_kerentanan'][0].filename}`  // ✅ Ubah path
      : existingKegiatan.peta_kerentanan;
    
    // Update database
    const updateQuery = `
      UPDATE kegiatan_mitigasi 
      SET metode = $1, analisis = $2, monev = $3, 
          dokumen_terkait = $4, foto_dokumentasi = $5,
          peta_awal = $6, peta_setelah = $7, peta_kerentanan = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [
      metode,
      analisis,
      monev,
      JSON.stringify(dokumenTerkait),
      JSON.stringify(fotoDokumentasi),
      petaAwal,
      petaSetelah,
      petaKerentanan,
      id
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating kegiatan:', error);
    res.status(500).json({ error: 'Gagal mengupdate kegiatan' });
  }
});

// DELETE: Delete kegiatan
app.delete('/api/kegiatan-mitigasi/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get kegiatan data untuk hapus files
    const kegiatanResult = await client.query(
      'SELECT * FROM kegiatan_mitigasi WHERE id = $1',
      [id]
    );
    
    if (kegiatanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kegiatan tidak ditemukan' });
    }
    
    const kegiatan = kegiatanResult.rows[0];
    
    // Delete files from disk (optional, untuk cleanup)
    const deleteFile = (filePath) => {
      if (filePath) {
        const fullPath = path.join(__dirname, 'uploads', filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    };
    
    // Delete dokumen terkait
    if (kegiatan.dokumen_terkait) {
      const docs = typeof kegiatan.dokumen_terkait === 'string' 
        ? JSON.parse(kegiatan.dokumen_terkait) 
        : kegiatan.dokumen_terkait;
      docs.forEach(deleteFile);
    }
    
    // Delete foto dokumentasi
    if (kegiatan.foto_dokumentasi) {
      const photos = typeof kegiatan.foto_dokumentasi === 'string'
        ? JSON.parse(kegiatan.foto_dokumentasi)
        : kegiatan.foto_dokumentasi;
      photos.forEach(deleteFile);
    }
    
    // Delete peta files
    deleteFile(kegiatan.peta_awal);
    deleteFile(kegiatan.peta_setelah);
    deleteFile(kegiatan.peta_kerentanan);
    
    // Delete from database
    await client.query('DELETE FROM kegiatan_mitigasi WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Kegiatan berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting kegiatan:', error);
    res.status(500).json({ error: 'Gagal menghapus kegiatan' });
  }
});

app.get('/api/kejadian-photos-by-location', async (req, res) => {
  try {
    const { disaster_type, level, location_name } = req.query;
    
    console.log('📸 Fetching photos for:', { disaster_type, level, location_name });
    
    if (!disaster_type || !level || !location_name) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    let query = `
      SELECT id, images_paths, thumbnail_path
      FROM kejadian
      WHERE disaster_type = $1
    `;
    const params = [disaster_type];

    // PENTING: Gunakan UPPER() dan TRIM() untuk konsistensi dengan risk-analysis
    if (level === 'Indonesia') {
      // Untuk Indonesia, tidak ada filter lokasi tambahan
      console.log('📍 Level: Indonesia - fetching all kejadian for disaster type');
    } else if (level === 'provinsi') {
      // Case-insensitive comparison untuk provinsi
      query += ` AND UPPER(TRIM(provinsi)) = UPPER(TRIM($2))`;
      params.push(location_name);
      console.log('📍 Level: provinsi -', location_name);
    } else if (level === 'Provinsi') {
      query += ` AND UPPER(TRIM(provinsi)) = UPPER(TRIM($2))`;
      params.push(location_name);
      console.log('📍 Level: Provinsi -', location_name);
    } else if (level === 'kabupaten') {
      query += ` AND UPPER(TRIM(kabupaten)) = UPPER(TRIM($2))`;
      params.push(location_name);
      console.log('📍 Level: kabupaten -', location_name);
    } else if (level === 'Kabupaten/Kota') {
      query += ` AND UPPER(TRIM(kabupaten)) = UPPER(TRIM($2))`;
      params.push(location_name);
      console.log('📍 Level: Kabupaten/Kota -', location_name);
    } else if (level === 'kecamatan') {
      query += ` AND UPPER(TRIM(kecamatan)) = UPPER(TRIM($2))`;
      params.push(location_name);
      console.log('📍 Level: kecamatan -', location_name);
    } else if (level === 'Kecamatan') {
      query += ` AND UPPER(TRIM(kecamatan)) = UPPER(TRIM($2))`;
      params.push(location_name);
      console.log('📍 Level: Kecamatan -', location_name);
    } else if (level === 'kelurahan') {
      query += ` AND UPPER(TRIM(kelurahan)) = UPPER(TRIM($2))`;
      params.push(location_name);
      console.log('📍 Level: kelurahan -', location_name);
    } else if (level === 'Kelurahan/Desa') {
      query += ` AND UPPER(TRIM(kelurahan)) = UPPER(TRIM($2))`;
      params.push(location_name);
      console.log('📍 Level: Kelurahan/Desa -', location_name);
    } else {
      return res.status(400).json({ error: 'Invalid level: ' + level });
    }
    
    console.log('🔍 Executing query:', query);
    console.log('📋 With params:', params);
    
    const result = await client.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} kejadian records`);
    
    // Kumpulkan semua foto dari kejadian-kejadian tersebut
    const allPhotos = [];
    result.rows.forEach((row, index) => {
      console.log(`Kejadian ${row.id}:`, {
        thumbnail: row.thumbnail_path,
        images_count: row.images_paths ? row.images_paths.length : 0
      });
      
      // Tambahkan thumbnail jika ada
      if (row.thumbnail_path) {
        // Jika thumbnail_path sudah berisi full path (e.g., /uploads/xxx.jpg)
        if (row.thumbnail_path.startsWith('/uploads/')) {
          allPhotos.push(row.thumbnail_path);
        } else {
          // Jika hanya filename, tambahkan prefix /uploads/
          allPhotos.push(`/uploads/${row.thumbnail_path}`);
        }
      }
      
      // Tambahkan semua images dari images_paths
      if (row.images_paths && Array.isArray(row.images_paths)) {
        row.images_paths.forEach(imgPath => {
          // Sama seperti thumbnail, pastikan path benar
          if (imgPath.startsWith('/uploads/')) {
            allPhotos.push(imgPath);
          } else {
            allPhotos.push(`/uploads/${imgPath}`);
          }
        });
      }
    });

    console.log(`📷 Returning ${allPhotos.length} photos:`, allPhotos.slice(0, 3), '...');
    res.json({ photos: allPhotos });
  } catch (error) {
    console.error('❌ Error fetching kejadian photos:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});