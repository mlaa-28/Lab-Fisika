console.log("File script.js terhubung!");

// 1. Kunci Akses Supabase
const SUPABASE_URL = 'https://uptgwqpqanyytayaxmdm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwdGd3cXBxYW55eXRheWF4bWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMjY3NTgsImV4cCI6MjEwNzgwMjc1OH0.ssg0zVqFQs3519gB8ugfA2t_kvegVzJq2qU_3Qt3-jM';

// 2. Inisialisasi Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let semuaDataAlat = [];

// 3. Catat Log Aktivitas Otomatis ke Supabase
async function catatLog(pengguna, aktivitas, keterangan) {
    try {
        await supabaseClient
            .from('activity_logs')
            .insert([{ pengguna: pengguna, aktivitas: aktivitas, keterangan: keterangan }]);
        ambilDataLog();
    } catch (e) {
        console.error("Gagal mencatat log:", e);
    }
}

// 4. Ambil Data Inventaris dari Supabase
async function ambilDataInventaris() {
    const loadingElement = document.getElementById('loading');
    const tableElement = document.getElementById('tabel-inventaris');

    try {
        const { data, error } = await supabaseClient
            .from('inventaris')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error("Gagal mengambil data inventaris:", error);
            loadingElement.innerText = 'Gagal memuat data: ' + error.message;
            return;
        }

        semuaDataAlat = data;
        loadingElement.style.display = 'none';
        tableElement.style.display = 'table';
        
        tampilkanDataKeTabel(semuaDataAlat);
        updateDropdownSemuaAlat(semuaDataAlat);
        updateStatistik();

    } catch (err) {
        console.error("Terjadi kesalahan:", err);
        loadingElement.innerText = 'Terjadi kesalahan sistem.';
    }
}

// Update Angka Statistik Kartu Dashboard
function updateStatistik() {
    document.getElementById('stat-total-alat').innerText = semuaDataAlat.length;
    
    const jumlahPerbaikan = semuaDataAlat.filter(a => a.status === 'Perbaikan' || a.status === 'Rusak').length;
    document.getElementById('stat-perbaikan').innerText = jumlahPerbaikan;
}

// Render Data Inventaris ke Tabel
function tampilkanDataKeTabel(daftarAlat) {
    const tbodyElement = document.getElementById('data-alat');
    tbodyElement.innerHTML = '';

    if (daftarAlat.length === 0) {
        tbodyElement.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:#666;">Alat tidak ditemukan.</td></tr>`;
        return;
    }

    daftarAlat.forEach(alat => {
        let badgeClass = 'badge-tersedia';
        if (alat.status === 'Dipinjam') {
            badgeClass = 'badge-dipinjam';
        } else if (alat.status === 'Perbaikan' || alat.status === 'Rusak') {
            badgeClass = 'badge-perbaikan';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${alat.kode_alat}</strong></td>
            <td>${alat.nama_alat}</td>
            <td>${alat.kategori}</td>
            <td>${alat.jumlah} unit</td>
            <td>${alat.lokasi}</td>
            <td><span class="badge ${badgeClass}">${alat.status}</span></td>
            <td>
                <button onclick="hapusAlat(${alat.id}, '${alat.nama_alat}')" style="background-color:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">Hapus</button>
            </td>
        `;
        tbodyElement.appendChild(tr);
    });
}

// Update Dropdown Alat
function updateDropdownSemuaAlat(daftarAlat) {
    const selectPinjam = document.getElementById('pinjam-kode-alat');
    const selectRawat = document.getElementById('rawat-kode-alat');

    selectPinjam.innerHTML = '<option value="">-- Pilih Alat --</option>';
    selectRawat.innerHTML = '<option value="">-- Pilih Alat --</option>';

    daftarAlat.forEach(alat => {
        if (alat.status === 'Tersedia' && alat.jumlah > 0) {
            const optPinjam = document.createElement('option');
            optPinjam.value = alat.kode_alat;
            optPinjam.innerText = `${alat.kode_alat} - ${alat.nama_alat} (Stok: ${alat.jumlah})`;
            selectPinjam.appendChild(optPinjam);
        }

        const optRawat = document.createElement('option');
        optRawat.value = alat.kode_alat;
        optRawat.innerText = `${alat.kode_alat} - ${alat.nama_alat} (${alat.status})`;
        selectRawat.appendChild(optRawat);
    });
}

// Batas Max Input Peminjaman
const selectKodeAlat = document.getElementById('pinjam-kode-alat');
const inputJumlahPinjam = document.getElementById('pinjam-jumlah');

selectKodeAlat.addEventListener('change', function() {
    const kodeDipilih = this.value;
    const dataAlatTerpilih = semuaDataAlat.find(a => a.kode_alat === kodeDipilih);

    if (dataAlatTerpilih) {
        inputJumlahPinjam.max = dataAlatTerpilih.jumlah;
        inputJumlahPinjam.placeholder = `Maksimal ${dataAlatTerpilih.jumlah} unit`;
    } else {
        inputJumlahPinjam.removeAttribute('max');
        inputJumlahPinjam.placeholder = "Contoh: 1";
    }
});

// 5. Ambil Data Peminjaman
async function ambilDataPeminjaman() {
    const tbodyPeminjaman = document.getElementById('data-peminjaman');

    const { data, error } = await supabaseClient
        .from('peminjaman')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error("Gagal mengambil data peminjaman:", error);
        return;
    }

    tbodyPeminjaman.innerHTML = '';

    // Hitung statistik alat dipinjam
    const totalDipinjam = data ? data.filter(p => p.status_peminjaman === 'Disetujui').length : 0;
    document.getElementById('stat-dipinjam').innerText = totalDipinjam;

    if (!data || data.length === 0) {
        tbodyPeminjaman.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:#666;">Belum ada riwayat peminjaman.</td></tr>`;
        return;
    }

    data.forEach(p => {
        let badgeClass = 'badge-dipinjam';
        if (p.status_peminjaman === 'Disetujui') {
            badgeClass = 'badge-tersedia';
        } else if (p.status_peminjaman === 'Ditolak') {
            badgeClass = 'badge-perbaikan';
        } else if (p.status_peminjaman === 'Dikembalikan') {
            badgeClass = 'badge-tersedia';
        }

        let tombolAksi = '<span style="color:#666; font-size:0.85rem;">Selesai</span>';
        if (p.status_peminjaman === 'Pending') {
            tombolAksi = `
                <button onclick="prosesPeminjaman(${p.id}, 'Disetujui', '${p.kode_alat}', ${p.jumlah_pinjam})" style="background-color:#10b981; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-weight:bold; margin-right:5px; font-size:0.8rem;">Setujui</button>
                <button onclick="prosesPeminjaman(${p.id}, 'Ditolak', '${p.kode_alat}', ${p.jumlah_pinjam})" style="background-color:#ef4444; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">Tolak</button>
            `;
        } else if (p.status_peminjaman === 'Disetujui') {
            tombolAksi = `
                <button onclick="kembalikanAlat(${p.id}, '${p.kode_alat}', ${p.jumlah_pinjam}, '${p.nama_peminjam}')" style="background-color:#3b82f6; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">Kembalikan Alat</button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.nama_peminjam}</strong> (${p.peran})</td>
            <td>${p.kode_alat}</td>
            <td>${p.jumlah_pinjam} unit</td>
            <td>${p.tgl_pinjam}</td>
            <td>${p.keperluan}</td>
            <td><span class="badge ${badgeClass}">${p.status_peminjaman}</span></td>
            <td>${tombolAksi}</td>
        `;
        tbodyPeminjaman.appendChild(tr);
    });
}

// 6. Proses Persetujuan/Penolakan Peminjaman
async function prosesPeminjaman(id, statusBaru, kodeAlat, jumlahPinjam) {
    const konfirmasi = confirm(`Apakah Anda yakin ingin mengubah status peminjaman ini menjadi "${statusBaru}"?`);
    
    if (konfirmasi) {
        const { error } = await supabaseClient
            .from('peminjaman')
            .update({ status_peminjaman: statusBaru })
            .eq('id', id);

        if (error) {
            alert('Gagal memproses peminjaman: ' + error.message);
        } else {
            // Jika disetujui, kurangi jumlah stok ketersediaan di inventaris
            if (statusBaru === 'Disetujui') {
                const alatTerpilih = semuaDataAlat.find(a => a.kode_alat === kodeAlat);
                if (alatTerpilih) {
                    const sisaStok = Math.max(0, alatTerpilih.jumlah - jumlahPinjam);
                    await supabaseClient
                        .from('inventaris')
                        .update({ jumlah: sisaStok })
                        .eq('kode_alat', kodeAlat);
                }
            }

            alert(`Peminjaman berhasil diperbarui menjadi "${statusBaru}"!`);
            catatLog('Laboran', 'Persetujuan Peminjaman', `Peminjaman alat ${kodeAlat} sebanyak ${jumlahPinjam} unit ${statusBaru}.`);
            ambilDataInventaris();
            ambilDataPeminjaman();
        }
    }
}

// 7. Fitur Pengembalian Alat
async function kembalikanAlat(idPeminjaman, kodeAlat, jumlahPinjam, namaPeminjam) {
    const konfirmasi = confirm(`Konfirmasi pengembalian alat ${kodeAlat} (${jumlahPinjam} unit) oleh ${namaPeminjam}?`);

    if (konfirmasi) {
        // 1. Ubah status peminjaman jadi Dikembalikan
        const { error } = await supabaseClient
            .from('peminjaman')
            .update({ status_peminjaman: 'Dikembalikan' })
            .eq('id', idPeminjaman);

        if (error) {
            alert('Gagal memproses pengembalian: ' + error.message);
            return;
        }

        // 2. Tambah stok alat kembali ke inventaris
        const alatTerpilih = semuaDataAlat.find(a => a.kode_alat === kodeAlat);
        if (alatTerpilih) {
            const stokBaru = alatTerpilih.jumlah + jumlahPinjam;
            await supabaseClient
                .from('inventaris')
                .update({ jumlah: stokBaru })
                .eq('kode_alat', kodeAlat);
        }

        alert('Alat berhasil dikembalikan dan stok inventaris telah diperbarui!');
        catatLog('Laboran', 'Pengembalian Alat', `${namaPeminjam} telah mengembalikan alat ${kodeAlat} (${jumlahPinjam} unit).`);
        ambilDataInventaris();
        ambilDataPeminjaman();
    }
}

// 8. Submit Form Peminjaman
const formPinjamAlat = document.getElementById('form-pinjam-alat');
formPinjamAlat.addEventListener('submit', async function(event) {
    event.preventDefault();

    const kodeAlat = document.getElementById('pinjam-kode-alat').value;
    const jumlah = parseInt(document.getElementById('pinjam-jumlah').value);

    const dataAlatTerpilih = semuaDataAlat.find(a => a.kode_alat === kodeAlat);
    if (!dataAlatTerpilih) {
        alert('Silakan pilih alat terlebih dahulu!');
        return;
    }

    if (jumlah > dataAlatTerpilih.jumlah) {
        alert(`Peminjaman GAGAL! Jumlah unit yang dipinjam (${jumlah} unit) melebihi stok yang tersedia (${dataAlatTerpilih.jumlah} unit).`);
        return;
    }

    const btnPinjam = document.getElementById('btn-pinjam');
    btnPinjam.innerText = 'Mengirim Pengajuan...';
    btnPinjam.disabled = true;

    const nama = document.getElementById('pinjam-nama').value;
    const peran = document.getElementById('pinjam-peran').value;
    const keperluan = document.getElementById('pinjam-keperluan').value;

    const { data, error } = await supabaseClient
        .from('peminjaman')
        .insert([
            {
                nama_peminjam: nama,
                peran: peran,
                kode_alat: kodeAlat,
                jumlah_pinjam: jumlah,
                keperluan: keperluan,
                status_peminjaman: 'Pending'
            }
        ]);

    if (error) {
        alert('Gagal mengajukan peminjaman: ' + error.message);
    } else {
        alert('Pengajuan peminjaman berhasil terkirim!');
        catatLog(nama, 'Pengajuan Peminjaman', `Mengajukan pinjam ${kodeAlat} sebanyak ${jumlah} unit untuk ${keperluan}.`);
        formPinjamAlat.reset();
        inputJumlahPinjam.removeAttribute('max');
        inputJumlahPinjam.placeholder = "Contoh: 1";
        ambilDataPeminjaman();
    }

    btnPinjam.innerText = 'Ajukan Peminjaman';
    btnPinjam.disabled = false;
});

// 9. Ambil Data Pemeliharaan
async function ambilDataPemeliharaan() {
    const tbodyPemeliharaan = document.getElementById('data-pemeliharaan');

    const { data, error } = await supabaseClient
        .from('pemeliharaan')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error("Gagal mengambil data pemeliharaan:", error);
        return;
    }

    tbodyPemeliharaan.innerHTML = '';

    if (!data || data.length === 0) {
        tbodyPemeliharaan.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:#666;">Belum ada riwayat pemeliharaan.</td></tr>`;
        return;
    }

    data.forEach(pm => {
        let badgeClass = 'badge-perbaikan';
        if (pm.status_pengerjaan === 'Selesai') {
            badgeClass = 'badge-tersedia';
        }

        let tombolAksi = '<span style="color:#666; font-size:0.85rem;">Selesai</span>';
        if (pm.status_pengerjaan === 'Proses') {
            tombolAksi = `<button onclick="selesaikanPemeliharaan(${pm.id}, '${pm.kode_alat}')" style="background-color:#10b981; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">Tandai Selesai</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pm.tgl_pemeriksaan}</td>
            <td><strong>${pm.kode_alat}</strong></td>
            <td>${pm.jenis_tindakan}</td>
            <td>${pm.rincian_kendala}</td>
            <td>${pm.petugas}</td>
            <td><span class="badge ${badgeClass}">${pm.status_pengerjaan}</span></td>
            <td>${tombolAksi}</td>
        `;
        tbodyPemeliharaan.appendChild(tr);
    });
}

// Submit Form Pemeliharaan
const formPemeliharaan = document.getElementById('form-pemeliharaan');
formPemeliharaan.addEventListener('submit', async function(event) {
    event.preventDefault();

    const btnRawat = document.getElementById('btn-rawat');
    btnRawat.innerText = 'Menyimpan...';
    btnRawat.disabled = true;

    const kodeAlat = document.getElementById('rawat-kode-alat').value;
    const jenis = document.getElementById('rawat-jenis').value;
    const petugas = document.getElementById('rawat-petugas').value;
    const status = document.getElementById('rawat-status').value;
    const rincian = document.getElementById('rawat-rincian').value;

    const { data, error } = await supabaseClient
        .from('pemeliharaan')
        .insert([
            {
                kode_alat: kodeAlat,
                jenis_tindakan: jenis,
                petugas: petugas,
                status_pengerjaan: status,
                rincian_kendala: rincian
            }
        ]);

    if (error) {
        alert('Gagal menyimpan catat pemeliharaan: ' + error.message);
    } else {
        alert('Catatan pemeliharaan berhasil disimpan!');
        catatLog(petugas, 'Pencatatan Pemeliharaan', `${jenis} pada alat ${kodeAlat}: ${rincian}`);
        formPemeliharaan.reset();
        ambilDataPemeliharaan();
    }

    btnRawat.innerText = 'Simpan Catatan Pemeliharaan';
    btnRawat.disabled = false;
});

// Selesaikan Pemeliharaan
async function selesaikanPemeliharaan(id, kodeAlat) {
    const konfirmasi = confirm('Apakah Anda yakin pemeliharaan/perbaikan alat ini sudah selesai?');
    
    if (konfirmasi) {
        const { error } = await supabaseClient
            .from('pemeliharaan')
            .update({ status_pengerjaan: 'Selesai' })
            .eq('id', id);

        if (error) {
            alert('Gagal memperbarui status: ' + error.message);
        } else {
            alert('Status pemeliharaan diperbarui menjadi "Selesai"!');
            catatLog('Laboran', 'Pemeliharaan Selesai', `Pemeliharaan pada alat ${kodeAlat} dinyatakan Selesai.`);
            ambilDataPemeliharaan();
        }
    }
}

// 10. Ambil Data Log Aktivitas (Audit Trail)
async function ambilDataLog() {
    const tbodyLog = document.getElementById('data-log');

    const { data, error } = await supabaseClient
        .from('activity_logs')
        .select('*')
        .order('id', { ascending: false })
        .limit(10); // Tampilkan 10 transaksi terakhir

    if (error) {
        console.error("Gagal mengambil log:", error);
        return;
    }

    tbodyLog.innerHTML = '';

    if (!data || data.length === 0) {
        tbodyLog.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:#666;">Belum ada riwayat aktivitas.</td></tr>`;
        return;
    }

    data.forEach(log => {
        const waktuFormatted = new Date(log.waktu).toLocaleString('id-ID');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size:0.85rem; color:#64748b;">${waktuFormatted}</td>
            <td><strong>${log.pengguna}</strong></td>
            <td><span style="background-color:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem;">${log.aktivitas}</span></td>
            <td>${log.keterangan}</td>
        `;
        tbodyLog.appendChild(tr);
    });
}

// 11. Hapus Alat Inventaris
async function hapusAlat(id, namaAlat) {
    const konfirmasi = confirm(`Apakah Anda yakin ingin menghapus "${namaAlat}"?`);
    if (konfirmasi) {
        const { error } = await supabaseClient
            .from('inventaris')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Gagal menghapus data: ' + error.message);
        } else {
            alert(`Alat "${namaAlat}" berhasil dihapus!`);
            catatLog('Laboran', 'Hapus Alat', `Menghapus alat ${namaAlat} dari inventaris.`);
            ambilDataInventaris();
        }
    }
}

// 12. Pencarian & Filter Inventaris
const inputCari = document.getElementById('input-cari');
const filterKategori = document.getElementById('filter-kategori');

function saringData() {
    const kataKunci = inputCari.value.toLowerCase();
    const kategoriDipilih = filterKategori.value;

    const hasilSaring = semuaDataAlat.filter(alat => {
        const cocokNamaAtauKode = alat.nama_alat.toLowerCase().includes(kataKunci) || 
                                  alat.kode_alat.toLowerCase().includes(kataKunci);
        const cocokKategori = kategoriDipilih === '' || alat.kategori === kategoriDipilih;

        return cocokNamaAtauKode && cocokKategori;
    });

    tampilkanDataKeTabel(hasilSaring);
}

inputCari.addEventListener('input', saringData);
filterKategori.addEventListener('change', saringData);

// 13. Form Tambah Alat
const formTambahAlat = document.getElementById('form-tambah-alat');
formTambahAlat.addEventListener('submit', async function(event) {
    event.preventDefault();

    const btnSimpan = document.getElementById('btn-simpan');
    btnSimpan.innerText = 'Menyimpan...';
    btnSimpan.disabled = true;

    const kode = document.getElementById('input-kode').value;
    const nama = document.getElementById('input-nama').value;
    const kategori = document.getElementById('input-kategori').value;
    const jumlah = parseInt(document.getElementById('input-jumlah').value);
    const lokasi = document.getElementById('input-lokasi').value;
    const status = document.getElementById('input-status').value;

    const { data, error } = await supabaseClient
        .from('inventaris')
        .insert([
            {
                kode_alat: kode,
                nama_alat: nama,
                kategori: kategori,
                jumlah: jumlah,
                lokasi: lokasi,
                status: status
            }
        ]);

    if (error) {
        alert('Gagal menambah alat: ' + error.message);
    } else {
        alert('Berhasil menambah alat baru!');
        catatLog('Laboran', 'Tambah Alat Baru', `Menambahkan ${nama} (${kode}) sebanyak ${jumlah} unit ke inventaris.`);
        formTambahAlat.reset();
        ambilDataInventaris();
    }

    btnSimpan.innerText = 'Simpan Alat';
    btnSimpan.disabled = false;
});

// Jalankan fungsi awal saat halaman dimuat
ambilDataInventaris();
ambilDataPeminjaman();
ambilDataPemeliharaan();
ambilDataLog();