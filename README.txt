IDE PRIORITY - Riset Ide, Pilih yang Terbaik
Kelompok 9 | Kelas XI PPLG 2 | Semester Ganjil 2026-2027
Mata Pelajaran: Kreativitas, Inovasi, dan Kewirausahaan

=====================================================
TENTANG APLIKASI
=====================================================
Aplikasi web untuk menilai 10 ide produk digital memakai Matriks
Feasibility vs Impact, menghitung Total Score, mengelompokkan ide ke
4 kuadran, menampilkan grafik, dan memilih ide terbaik.

Teknologi: React, TypeScript, CSS, Bootstrap, JavaScript, Chart.js,
Three.js, OrbitControls, Vite, Express, SQLite, dan LocalStorage untuk
preferensi tema. Entry point React
menggunakan TypeScript; logika interaksi yang sudah ada dipertahankan
di modul JavaScript dalam src/legacy. Data ide disimpan di database
SQLite lokal tanpa login.

=====================================================
STRUKTUR FILE
=====================================================
IDE-PRIORITY/
  index.html             -> dokumen HTML dan entry point Vite
  src/
    App.tsx              -> root React dan siklus hidup aplikasi
    main.tsx             -> mount React ke halaman
    App.css              -> gaya root React
    index.css            -> gaya aplikasi
    assets/app-shell.html -> markup halaman
    legacy/
      script.js          -> interaksi, perhitungan, grafik, dan API data
      matriks-3d.js      -> visualisasi 3D dan OrbitControls
  server/
    index.cjs            -> API Express dan database SQLite
  scripts/
    dev.cjs              -> menjalankan API dan Vite bersama-sama
  data/
    ide-priority.sqlite  -> database lokal (dibuat saat pertama dijalankan)
  vite.config.ts         -> konfigurasi Vite dan plugin React
  tsconfig*.json         -> konfigurasi TypeScript
  package.json       -> dependensi dan perintah npm
  package-lock.json  -> versi dependensi terkunci
  README.txt         -> petunjuk ini

=====================================================
CARA MENJALANKAN
=====================================================
Persyaratan: Node.js 20 atau lebih baru dan npm. Jalankan perintah berikut dari folder
IDE-PRIORITY:

  1. npm ci
  2. npm run dev
  3. Buka alamat lokal yang ditampilkan Vite di browser.

Untuk memeriksa tipe TypeScript dan membuat hasil produksi, jalankan
"npm run build". Bootstrap,
Bootstrap Icons, font, dan Chart.js lainnya masih dimuat lewat CDN,
jadi komputer perlu terhubung ke internet.

=====================================================
ATURAN PENILAIAN
=====================================================
Total Score = Feasibility + Impact (maksimal 10)
Nilai 4-5 = High, nilai 1-3 = Low

  PRIORITAS UTAMA : Feasibility 4-5, Impact 4-5 (hijau,  kanan atas)
  POTENSI         : Feasibility 1-3, Impact 4-5 (kuning, kiri atas)
  PERTIMBANGKAN   : Feasibility 4-5, Impact 1-3 (biru,   kanan bawah)
  TUNDA           : Feasibility 1-3, Impact 1-3 (merah,  kiri bawah)

Kuadran ditentukan dari Feasibility DAN Impact, bukan dari Total Score.

=====================================================
FITUR PER HALAMAN
=====================================================
Dashboard        : ringkasan jumlah ide per kuadran, ide skor tertinggi,
                   grafik kecil Total Score.
Data Ide         : tambah, edit, hapus, dan cari ide. Total Score dan
                   kuadran dihitung otomatis. Ada tombol Reset Data.
Matriks Kuadran  : matriks 3D interaktif. Seret untuk memutar, scroll
                   untuk zoom, dan pilih titik untuk melihat detail.
Grafik Total Score: grafik batang, urut dari skor tertinggi.
Ide Prioritas    : ide terpilih beserta alasannya (jika ada skor
                   seri, semua ide seri ditampilkan).
Laporan          : laporan lengkap + tombol Print Report (bisa dicetak
                   atau disimpan sebagai PDF lewat dialog cetak browser).

=====================================================
CATATAN PENYIMPANAN DATA
=====================================================
- Data ide disimpan di SQLite lokal pada file data/ide-priority.sqlite,
  jadi tetap ada setelah halaman atau server dimulai ulang.
- Saat pertama kali dibuka, aplikasi mengimpor data ide lama dari
  LocalStorage jika ada dan database masih kosong. Setelah berhasil,
  data ide lama di browser dihapus.
- Database berjalan di komputer yang menjalankan npm run dev dan tidak
  otomatis dibagikan ke perangkat lain.
- Preferensi tema masih disimpan di LocalStorage browser.
- Tombol "Reset Data" (halaman Data Ide) mengembalikan 10 ide awal
  dari LKPD 5 setelah ada konfirmasi.

=====================================================
DATA AWAL (LKPD 5)
=====================================================
 1. Fit Assistant & Size Recommendation AI          F4 I5 -> 9  Prioritas Utama
 2. Express 1-Click Buy & Instant Escrow Checkout   F5 I5 -> 10 Prioritas Utama
 3. Consolidated Shipping & Flat Rate Ongkir        F4 I5 -> 9  Prioritas Utama
 4. Real-Time Inventory & Size Sync System          F4 I4 -> 8  Prioritas Utama
 5. Sistem Pre-order Berbasis Kuota                 F3 I4 -> 7  Potensi
 6. 24/7 Contextual Chatbot CS                      F4 I4 -> 8  Prioritas Utama
 7. Virtual Try-On 3D Augmented Reality             F2 I5 -> 7  Potensi
 8. Video Review Reels                              F3 I4 -> 7  Potensi
 9. Gamified Cashback & Reviewer Poin               F4 I3 -> 7  Pertimbangkan
10. Smart Price Negotiation Bot                     F3 I2 -> 5  Tunda

Ide terpilih: Express 1-Click Buy & Instant Escrow Checkout (10/10)
