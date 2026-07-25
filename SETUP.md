# Setup: Google Cloud (Sheets + Drive) & Deploy ke Vercel

Aplikasi ini memakai Google Sheets sebagai database dan Google Drive sebagai
penyimpanan foto absensi, lewat satu **service account**. Ikuti langkah di
bawah secara berurutan.

## 1. Buat Google Cloud Project & aktifkan API

1. Buka https://console.cloud.google.com/ dan buat project baru (atau pakai yang sudah ada).
2. Buka **APIs & Services > Library**, aktifkan dua API ini:
   - **Google Sheets API**
   - **Google Drive API**

## 2. Buat Service Account

1. Buka **APIs & Services > Credentials > Create Credentials > Service Account**.
2. Beri nama bebas, misal `absensi-training-sa`. Role project tidak perlu diisi (akses diatur lewat share spreadsheet/folder, bukan IAM project).
3. Setelah service account dibuat, buka tab **Keys > Add Key > Create new key > JSON**. File JSON akan terunduh — **simpan baik-baik, ini seperti password**.
4. Catat alamat email service account, formatnya seperti:
   `absensi-training-sa@nama-project.iam.gserviceaccount.com`

## 3. Siapkan Google Spreadsheet

1. Buat spreadsheet baru di Google Sheets (boleh kosong, tab akan dibuat otomatis oleh aplikasi).
2. Klik **Share**, tambahkan email service account dari langkah 2 dengan akses **Editor**.
3. Ambil Sheet ID dari URL:
   `https://docs.google.com/spreadsheets/d/`**`INI_SHEET_ID`**`/edit`

## 4. Siapkan folder Google Drive untuk foto

1. Buat folder baru di Google Drive, misal "Foto Absensi Training".
2. Klik **Share**, tambahkan email service account yang sama dengan akses **Editor**.
3. Ambil Folder ID dari URL:
   `https://drive.google.com/drive/folders/`**`INI_FOLDER_ID`**

## 5. Isi Environment Variables

Salin `.env.local.example` menjadi `.env.local`, lalu isi:

| Variabel | Isi dengan |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email service account (langkah 2) |
| `GOOGLE_PRIVATE_KEY` | Nilai `private_key` dari file JSON (langkah 2). Biarkan dalam tanda kutip dan simpan `\n` apa adanya |
| `GOOGLE_SHEET_ID` | Sheet ID (langkah 3) |
| `GOOGLE_DRIVE_FOLDER_ID` | Folder ID (langkah 4) |
| `SESSION_SECRET` | String acak panjang, contoh generate: `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Email login admin pertama |
| `ADMIN_PASSWORD` | Password admin pertama (hanya dipakai sekali saat setup, akan di-hash) |

Untuk deploy di Vercel, isi env vars yang sama di **Project Settings > Environment Variables**
(untuk `GOOGLE_PRIVATE_KEY`, tempel apa adanya termasuk `\n` literal — kode aplikasi
sudah menangani konversinya).

## 6. Jalankan setup sekali

Setelah env vars terisi (lokal dengan `npm run dev`, atau setelah deploy pertama di Vercel), panggil endpoint setup satu kali untuk membuat header tab spreadsheet dan admin pertama:

```bash
curl -X POST https://<domain-aplikasi-anda>/api/setup
```

Response sukses akan menyebutkan admin yang dibuat. Endpoint ini aman dipanggil berkali-kali — jika admin sudah ada, ia hanya memverifikasi header tab tanpa membuat admin baru.

## 7. Login & mulai pakai

1. Buka `https://<domain-aplikasi-anda>/admin/login`, masuk dengan `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Buat **Department**.
3. Tambahkan **Anak Training** (setiap anak otomatis dapat kode unik + QR — buka menu QR untuk cetak/kirim linknya).
4. Buat **Jadwal** per department: tanggal, sesi, jam, dan titik lokasi (pakai tombol "Gunakan lokasi saya sekarang" saat berada di lokasi training, atau isi lat/lng manual).
5. Anak training membuka link/scan QR mereka di `/absen/{code}` untuk absen masuk & pulang dengan foto + lokasi.
6. Lihat rekap di menu **Absensi**, atau buka spreadsheet Google Sheets langsung untuk export/analisa manual.

## Catatan keamanan

- Foto absensi **tidak dibuat publik** di Drive — hanya bisa dilihat lewat aplikasi (harus login admin).
- Kode absen tiap anak training (dipakai di URL `/absen/{code}`) bersifat rahasia seperti password sederhana — jangan disebar ke publik, cukup dibagikan ke anak training yang bersangkutan (lewat QR/link pribadi).
- Simpan file JSON service account dan `.env.local` dengan aman, jangan commit ke git (`.env*.local` sudah masuk `.gitignore`).
