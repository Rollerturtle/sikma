// server.js - Updated with new schema and Excel processing + REFERENCE_MAPPING
const express = require('express');
const { Client } = require('pg');
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

const dbConfig = {
  host: 'localhost',
  port: 5433,
  database: 'gis_data',
  user: 'postgres',
  password: '12345678'
};

const client = new Client(dbConfig);

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
const createKejadianTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS kejadian (
      id SERIAL PRIMARY KEY,
      thumbnail_path VARCHAR(500),
      images_paths TEXT[],
      disaster_type VARCHAR(50) NOT NULL,
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
      
      -- Additional fields from Excel data
      curah_hujan DECIMAL(10,2),
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

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_kejadian_provinsi ON kejadian(provinsi);
    CREATE INDEX IF NOT EXISTS idx_kejadian_kabupaten ON kejadian(kabupaten);
    CREATE INDEX IF NOT EXISTS idx_kejadian_kecamatan ON kejadian(kecamatan);
    CREATE INDEX IF NOT EXISTS idx_kejadian_kelurahan ON kejadian(kelurahan);
    CREATE INDEX IF NOT EXISTS idx_kejadian_disaster_type ON kejadian(disaster_type);
    CREATE INDEX IF NOT EXISTS idx_kejadian_incident_date ON kejadian(incident_date);
    CREATE INDEX IF NOT EXISTS idx_kejadian_geom ON kejadian USING GIST(geom);

    -- Create composite indexes for common filter combinations
    CREATE INDEX IF NOT EXISTS idx_kejadian_filter_combo ON kejadian(provinsi, disaster_type);
    CREATE INDEX IF NOT EXISTS idx_kejadian_date_province ON kejadian(incident_date DESC, provinsi);

    -- Create trigger function for updating timestamp
    CREATE OR REPLACE FUNCTION update_kejadian_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger
    DROP TRIGGER IF EXISTS trigger_update_kejadian_timestamp ON kejadian;
    CREATE TRIGGER trigger_update_kejadian_timestamp
        BEFORE UPDATE ON kejadian
        FOR EACH ROW
        EXECUTE FUNCTION update_kejadian_timestamp();
  `;

  try {
    await client.query(createTableSQL);
    console.log('Updated kejadian table created successfully');
  } catch (error) {
    console.error('Error creating kejadian table:', error);
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

// Connect to database and create table
client.connect()
  .then(async () => {
    console.log('Connected to PostgreSQL');
    await createKejadianTable();
    await createFileTable();
  })
  .catch(err => console.error('Connection error:', err));

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
const processExcelData = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read specific cells based on your mapping
    const cellMapping = {
      'A3': 'curah_hujan',           // A3
      'B3': 'korban_meninggal',      // B3
      'C3': 'korban_luka_luka',      // C3
      'D3': 'korban_mengungsi',      // D3
      'E3': 'rumah_rusak_berat',     // E3
      'F3': 'rumah_rusak_sedang',    // F3
      'G3': 'rumah_rusak_ringan',    // G3
      'H3': 'rumah_rusak_terendam',  // H3
      'I3': 'infrastruktur_rusak_berat',   // I3
      'J3': 'infrastruktur_rusak_sedang',  // J3
      'K3': 'infrastruktur_rusak_ringan',  // K3
      'L3': 'dampak_kebakaran',      // L3
      'M3': 'luas_lokasi_kejadian',  // M3
      'N3': 'kejadian_ke'            // N3
    };

    const processedData = {};

    // Process each cell mapping
    Object.keys(cellMapping).forEach(cellAddress => {
      const dbColumn = cellMapping[cellAddress];
      const cell = worksheet[cellAddress];
            
      let value = null;
      if (cell && cell.v !== undefined) {
        value = cell.v;
      }
      
      // Handle different data types based on database column
      if (value !== null && value !== undefined && value !== '') {
        if (dbColumn === 'dampak_kebakaran') {
          // For text field
          processedData[dbColumn] = String(value);
        } else if (dbColumn === 'curah_hujan' || dbColumn === 'luas_lokasi_kejadian') {
          // For decimal fields
          const numValue = parseFloat(value);
          processedData[dbColumn] = isNaN(numValue) ? null : numValue;
        } else {
          // For integer fields
          const intValue = parseInt(value);
          processedData[dbColumn] = isNaN(intValue) ? 0 : intValue;
        }
      } else {
        // Set default values for missing/empty data
        if (dbColumn === 'dampak_kebakaran') {
          processedData[dbColumn] = null;
        } else if (dbColumn === 'curah_hujan' || dbColumn === 'luas_lokasi_kejadian') {
          processedData[dbColumn] = null;
        } else {
          processedData[dbColumn] = 0;
        }
      }
    });
    
    // Validate that we got some data
    const hasData = Object.values(processedData).some(value => 
      value !== null && value !== 0 && value !== ''
    );
    
    if (!hasData) {
      console.warn('No valid data found in Excel file. All values are null/0/empty.');
    }
    
    return processedData;
    
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw new Error(`Failed to process Excel file: ${error.message}`);
  }
};

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

// UPDATED ENDPOINT: Submit kejadian report with Excel processing (no report_type)
app.post('/api/kejadian', kejadianUpload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'dataFiles', maxCount: 5 }
]), async (req, res) => {
  try {

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

    // Updated validation for new required fields
    const requiredFields = ['disasterType', 'provinsi', 'kabupaten', 'kecamatan', 'kelurahan', 'title', 'longitude', 'latitude', 'description', 'incidentDate'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missing: missingFields,
        // required: requiredFields
      });
    }

    // Validate coordinates
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    
    if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({ 
        error: 'Invalid coordinates',
        // details: `Longitude: ${longitude}, Latitude: ${latitude}` 
      });
    }

    const lngRounded = Math.round(lng * 1000000) / 1000000;
    const latRounded = Math.round(lat * 1000000) / 1000000;

    // Process uploaded files
    let thumbnailPath = null;
    let imagesPaths = [];
    let excelData = {};

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
          // Process the first Excel file (you can modify this to process multiple files)
          const excelFile = req.files.dataFiles[0];
          const excelFilePath = path.join(uploadDir, excelFile.filename);
          excelData = processExcelData(excelFilePath);
          
          // Clean up Excel file after processing (optional)
          // fs.unlinkSync(excelFilePath);
        } catch (excelError) {
          console.error('Excel processing error:', excelError);
          // Continue without Excel data - it's optional
          excelData = {};
        }
      }
    }

    // Insert into database with new schema (no report_type)
    const insertQuery = `
      INSERT INTO kejadian (
        thumbnail_path, images_paths, disaster_type, 
        provinsi, kabupaten, kecamatan, kelurahan, das, title, description, incident_date, 
        longitude, latitude, geom,
        curah_hujan, korban_meninggal, korban_luka_luka, korban_mengungsi,
        rumah_rusak_berat, rumah_rusak_sedang, rumah_rusak_ringan, rumah_rusak_terendam,
        infrastruktur_rusak_berat, infrastruktur_rusak_sedang, infrastruktur_rusak_ringan,
        dampak_kebakaran, luas_lokasi_kejadian, kejadian_ke
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
        ST_SetSRID(ST_MakePoint($12, $13), 4326),
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      ) RETURNING id, created_at
    `;

    const values = [
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
      // Excel data fields
      excelData.curah_hujan || null,
      excelData.korban_meninggal || 0,
      excelData.korban_luka_luka || 0,
      excelData.korban_mengungsi || 0,
      excelData.rumah_rusak_berat || 0,
      excelData.rumah_rusak_sedang || 0,
      excelData.rumah_rusak_ringan || 0,
      excelData.rumah_rusak_terendam || 0,
      excelData.infrastruktur_rusak_berat || 0,
      excelData.infrastruktur_rusak_sedang || 0,
      excelData.infrastruktur_rusak_ringan || 0,
      excelData.dampak_kebakaran || null,
      excelData.luas_lokasi_kejadian || null,
      excelData.kejadian_ke || null
    ];

    const result = await client.query(insertQuery, values);
    invalidateRiskCache({
      disaster_type: disasterType,
      provinsi, kabupaten, kecamatan, kelurahan, das
    });
    
    res.status(201).json({
      success: true,
      message: 'Laporan kejadian berhasil disimpan',
      data: {
        id: result.rows[0].id,
        created_at: result.rows[0].created_at,
        coordinates: {
          longitude: lngRounded,
          latitude: latRounded
        },
        thumbnail_url: thumbnailPath ? `/uploads/${thumbnailPath}` : null,
        images_urls: imagesPaths.map(path => `/uploads/${path}`),
        excel_data_processed: Object.keys(excelData).length > 0
      }
    });

  } catch (error) {
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
          fs.unlinkSync(filePath);
        }
      });
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
});

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
    let query = `
      SELECT 
        id, thumbnail_path, images_paths, disaster_type,
        provinsi, kabupaten, kecamatan, kelurahan, das, title, description, incident_date,
        longitude, latitude, created_at, updated_at,
        curah_hujan, korban_meninggal, korban_luka_luka, korban_mengungsi,
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
        curah_hujan, korban_meninggal, korban_luka_luka, korban_mengungsi,
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

app.delete('/api/kejadian/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid kejadian ID'
      });
    }

    // Get the kejadian data first untuk cache invalidation
    const selectQuery = 'SELECT * FROM kejadian WHERE id = $1';
    const selectResult = await client.query(selectQuery, [id]);

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Kejadian not found'
      });
    }

    const kejadianData = selectResult.rows[0];

    // Delete the record from database

    const deleteQuery = 'DELETE FROM kejadian WHERE id = $1 RETURNING id, title, disaster_type';
    const deleteResult = await client.query(deleteQuery, [id]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Failed to delete kejadian'
      });
    }

    const deletedKejadian = deleteResult.rows[0];

    // TAMBAHAN: Invalidate risk cache setelah menghapus kejadian
    invalidateRiskCache({
      disaster_type: kejadianData.disaster_type,
      provinsi: kejadianData.provinsi,
      kabupaten: kejadianData.kabupaten, 
      kecamatan: kejadianData.kecamatan,
      kelurahan: kejadianData.kelurahan,
      das: kejadianData.das
    });

    // Clean up associated files
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
      message: 'Kejadian berhasil dihapus',
      data: {
        id: deletedKejadian.id,
        title: deletedKejadian.title,
        disaster_type: deletedKejadian.disaster_type,
        files_deleted: filesToDelete.length,
        cache_invalidated: true
      }
    });

  } catch (error) {
    console.error('Error deleting kejadian:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
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
    if (level === 'Provinsi') {
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
    const [kejadianResult, layerResult] = await Promise.all([
      client.query(kejadianQuery, params),
      client.query(layerQuery, [location_name])
    ]);


    // Create incident count map
    const incidentMap = new Map();
    kejadianResult.rows.forEach(row => {
      const key = level === 'DAS' ? row.kelurahan : row[groupByField.toLowerCase()];
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
      if (level === 'Provinsi') {
        matchField = row.kab_kota;
      } else if (level === 'Kabupaten/Kota') {
        matchField = row.kecamatan;
      } else if (level === 'Kecamatan' || level === 'DAS') {
        matchField = row.kel_desa;
      }

      const incidentCount = incidentMap.get(matchField) || 0;
      
      // Determine risk level and color
      let riskLevel, riskColor;
      if (incidentCount <= 1) {
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
    
    // Validasi table name untuk keamanan
    const allowedTables = [
      'areal_karhutla_2024', 'lahan_kritis', 'penutupan_lahan_2024',
      'rawan_karhutla_2024', 'rawan_erosi', 'rawan_limpasan'
    ];
    
    if (!allowedTables.includes(tableName)) {
      console.error('Invalid table name:', tableName);
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});