# UI/UX Specifications: Strict Nuxt UI Framework Rules

## 1. MANDATORY COMPONENT LIBRARY (NUXT UI ONLY)

- **Framework Rule:** Wajib menggunakan pustaka komponen [@nuxt/ui](https://ui.nuxt.com/) untuk semua elemen UI pada aplikasi frontend (`apps/web`). Dilarang keras menulis komponen dasar secara manual jika Nuxt UI sudah menyediakannya.
- **Syntax Rule:** Semua tag komponen wajib menggunakan prefix standar `U` (contoh: `<UButton>`, `<UInput>`, `<UCard>`, `<UTable>`).
- **App Wrapper Requirement:** Pastikan seluruh aplikasi di dalam `app.vue` dibungkus dengan komponen `<UApp>` agar fitur bawaan seperti sistem Toast, Tooltip, dan _overlays_ dapat bekerja dengan benar.

## 2. DASHBOARD ESTHETICS (THE ADMIN PANEL)

- **Layout Construction:** Gunakan komponen _layouting_ Nuxt UI yang bersih. Buat struktur halaman admin dengan sidebar navigasi statis dan area konten utama yang responsif.
- **Data Tables & Cards:** Manfaatkan `<UTable>` untuk menampilkan data tautan atau log analitik secara terstruktur. Bungkus setiap ringkasan metrik menggunakan `<UCard>` dengan gaya minimalis, mengandalkan border tipis bawaan daripada bayangan tebal.
- **Form Elements:** Gunakan komponen `<UForm>` dan `<UFormField>` untuk menangani validasi _input state_. Pastikan status eror ditangani langsung melalui properti bawaan dari ekosistem formulir Nuxt UI.

## 3. PUBLIC PAGE ESTHETICS (THE USER SITES)

- **Mobile-First Realism:** Halaman publik `/:username` harus dioptimalkan untuk ukuran ponsel menggunakan pembatas lebar maksimal `max-w-md` dan posisi tengah `mx-auto`.
- **Dynamic Theming via Inline Design Tokens:** Meskipun dashboard menggunakan skema warna tema bawaan Nuxt UI, halaman publik harus fleksibel. Gunakan properti `:ui` atau inline CSS variables untuk menerapkan warna dinamis dari database pengguna pada komponen Nuxt UI (misal: `<UButton :style="{ backgroundColor: profile.buttonColor }">`).
- **No Heavy Overrides:** Jangan menulis kode CSS global yang merombak total _design tokens_ dasar milik Nuxt UI. Modifikasi tampilan hanya boleh dilakukan secara lokal melalui modifikasi varian Tailwind Variants bawaan komponen.

## 4. STRICT UI STATES IMPLEMENTATION

Setiap fitur pengelolaan data wajib mengimplementasikan status UI bawaan dari Nuxt UI secara konsisten:

1. **Ideal State:** Tampilan data utama dengan baris tabel atau grid tautan yang raki.
2. **Loading State:** Dilarang menggunakan spinner generik. Wajib menggunakan komponen `<USkeleton>` yang disusun menyerupai komponen asli saat data sedang dimuat (_loading state_) [21].
3. **Empty State:** Manfaatkan status kosong pada tabel atau gunakan kartu dengan ikon bawaan Iconify untuk memandu pengguna menambahkan data pertama mereka.
4. **Error & Feedback:** Gunakan sistem pemberitahuan instan menggunakan metode `useToast()` bawaan dari modul `@nuxt/ui` untuk memberikan respons aksi sukses atau gagal setelah melakukan mutasi data.
