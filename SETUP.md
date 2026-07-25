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

Service account **tidak punya kuota penyimpanan sendiri** di My Drive biasa —
upload foto akan gagal dengan error kuota jika tujuannya folder biasa. Karena
itu tujuan upload **harus** sebuah **Shared Drive** (dulu disebut Team Drive),
yang memakai kuota organisasi, bukan kuota akun.

1. Buat Shared Drive baru (atau pakai yang sudah ada), misal "Absensi Training".
   Di Google Drive: **Shared drives > New**.
2. Buka Shared Drive tsb → klik **Manage members** → tambahkan email service
   account (langkah 2) dengan role **Content Manager** (minimal, agar bisa
   upload & baca file — bukan sekadar "Share" pada satu folder seperti biasa,
   karena akses Shared Drive diatur lewat membership Drive itu sendiri).
3. Ambil ID-nya dari URL saat membuka Shared Drive tsb:
   `https://drive.google.com/drive/folders/`**`INI_DRIVE_ID`**
   (ID Shared Drive selalu diawali `0A`, berbeda dari ID folder biasa).
4. Boleh langsung pakai root Shared Drive ini sebagai `GOOGLE_DRIVE_FOLDER_ID`,
   atau buat subfolder di dalamnya dan pakai ID subfolder tsb (service account
   yang sudah jadi member Shared Drive otomatis punya akses ke semua isinya).

## 5. Google Sign-In untuk cegah titip absen (opsional tapi disarankan)

Fitur ini mewajibkan anak training sign in dengan **akun Google pribadi** (bukan
akun bersama/per-kamar) sebelum bisa absen, dan mencocokkan email akun tsb
dengan email yang didaftarkan admin — supaya link absen tidak bisa dipakai
orang lain seenaknya.

1. Di Google Cloud Project yang sama, buka **APIs & Services > Credentials >
   Create Credentials > OAuth client ID**.
2. Kalau diminta setup **OAuth consent screen** dulu: pilih **External**, isi
   nama app & email support, dan untuk scope cukup default (`email`,
   `profile`) — ini scope non-sensitif jadi tidak perlu proses verifikasi
   Google yang lama. Publish ke Production setelah selesai.
3. Application type: **Web application**. Tambahkan di **Authorized JavaScript
   origins**:
   - `http://localhost:3000` (untuk development)
   - `https://<domain-aplikasi-anda>` (domain Vercel produksi)
4. Setelah dibuat, copy **Client ID**-nya (bentuknya seperti
   `xxxxxxxx.apps.googleusercontent.com`) → isi ke `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
5. Fitur ini **per-trainee**: hanya aktif untuk anak training yang kolom
   email-nya sudah diisi admin (di menu Anak Training). Yang belum diisi
   emailnya tetap bisa absen tanpa Google Sign-In seperti biasa — jadi bisa
   diaktifkan bertahap begitu akun Google pribadi tiap anak training siap.

## 6. Isi Environment Variables

Salin `.env.local.example` menjadi `.env.local`, lalu isi:

| Variabel | Isi dengan |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email service account (langkah 2) |
| `GOOGLE_PRIVATE_KEY` | Nilai `private_key` dari file JSON (langkah 2). Biarkan dalam tanda kutip dan simpan `\n` apa adanya |
| `GOOGLE_SHEET_ID` | Sheet ID (langkah 3) |
| `GOOGLE_DRIVE_FOLDER_ID` | ID Shared Drive atau subfolder di dalamnya (langkah 4) |
| `SESSION_SECRET` | String acak panjang, contoh generate: `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Email login admin pertama |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Client ID dari langkah 5 (kosongkan jika belum mengaktifkan Google Sign-In) |
| `ADMIN_PASSWORD` | Password admin pertama (hanya dipakai sekali saat setup, akan di-hash) |

Untuk deploy di Vercel, isi env vars yang sama di **Project Settings > Environment Variables**
(untuk `GOOGLE_PRIVATE_KEY`, tempel apa adanya termasuk `\n` literal — kode aplikasi
sudah menangani konversinya).

## 7. Jalankan setup sekali

Setelah env vars terisi (lokal dengan `npm run dev`, atau setelah deploy pertama di Vercel), panggil endpoint setup satu kali untuk membuat header tab spreadsheet dan admin pertama:

```bash
curl -X POST https://<domain-aplikasi-anda>/api/setup
```

Response sukses akan menyebutkan admin yang dibuat. Endpoint ini aman dipanggil berkali-kali — jika admin sudah ada, ia hanya memverifikasi header tab tanpa membuat admin baru.

## 8. Login & mulai pakai

1. Buka `https://<domain-aplikasi-anda>/admin/login`, masuk dengan `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Buat **Department**.
3. Tambahkan **Anak Training** (setiap anak otomatis dapat kode unik + QR — buka menu QR untuk cetak/kirim linknya). Isi kolom **email** dengan akun Google pribadi mereka kalau ingin mengaktifkan Google Sign-In (langkah 5) untuk anak training tsb.
4. Buat **Jadwal** per department: tanggal, sesi, jam, dan titik lokasi (pakai tombol "Gunakan lokasi saya sekarang" saat berada di lokasi training, atau isi lat/lng manual).
5. Anak training membuka link/scan QR mereka di `/absen/{code}` untuk absen masuk & pulang dengan foto + lokasi.
6. Lihat rekap di menu **Absensi**, atau buka spreadsheet Google Sheets langsung untuk export/analisa manual.

## Catatan keamanan

- Foto absensi **tidak dibuat publik** di Drive — hanya bisa dilihat lewat aplikasi (harus login admin).
- Kode absen tiap anak training (dipakai di URL `/absen/{code}`) bersifat rahasia seperti password sederhana — jangan disebar ke publik, cukup dibagikan ke anak training yang bersangkutan (lewat QR/link pribadi).
- Simpan file JSON service account dan `.env.local` dengan aman, jangan commit ke git (`.env*.local` sudah masuk `.gitignore`).
