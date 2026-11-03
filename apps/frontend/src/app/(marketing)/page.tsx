import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata: Metadata = {
  title: {
    absolute: "Dexa Assessment — draf AI per kriteria, keputusan nilai tetap di tangan dosen",
  },
};

const steps = [
  {
    title: "Dosen menyusun rubrik",
    body: "Kriteria, bobot, skor maksimal, dan kunci jawaban ditulis sekali lalu dipakai untuk setiap tugas.",
  },
  {
    title: "Mahasiswa mengumpulkan",
    body: "Teks, PDF, DOCX, atau foto lembar jawaban. Hasil OCR dikonfirmasi mahasiswa sebelum dikirim.",
  },
  {
    title: "Identitas disamarkan",
    body: "Nama, NIM, email, dan nomor telepon diganti token sebelum teks dikirim ke model.",
  },
  {
    title: "AI menyusun draf per kriteria",
    body: "Setiap kriteria diberi saran skor, alasan, dan kutipan dari jawaban. Kutipan yang tidak ditemukan di teks asli dibuang.",
  },
  {
    title: "Dosen meninjau",
    body: "Kutipan disorot langsung di jawaban. Setiap saran diterima, diubah, atau ditolak, kriteria demi kriteria.",
  },
  {
    title: "Dosen merilis nilai",
    body: "Mahasiswa hanya melihat nilai dan umpan balik yang dirilis dosen, tidak pernah draf AI.",
  },
];

const responsibilities = [
  ["Membaca jawaban terhadap setiap kriteria rubrik", "Menentukan skor akhir setiap kriteria"],
  [
    "Mengutip bagian jawaban yang menjadi dasar saran",
    "Memeriksa apakah kutipan benar-benar relevan",
  ],
  [
    "Menandai kriteria yang tidak didukung bukti",
    "Menilai manual bila AI tidak yakin atau tidak tersedia",
  ],
  ["Menyusun draf umpan balik", "Menulis umpan balik akhir untuk mahasiswa"],
  ["Menghitung total berbobot sebagai saran", "Merilis, memperbarui, atau menarik nilai"],
];

const roles = [
  {
    name: "Dosen",
    points: [
      "Menyusun rubrik dan tugas, menjalankan draf AI per pengumpulan.",
      "Meninjau kutipan bukti di samping jawaban, lalu memutuskan skor per kriteria.",
      "Melihat seberapa sering saran AI diterima atau diubah di halaman analitik.",
    ],
  },
  {
    name: "Mahasiswa",
    points: [
      "Bergabung ke kelas dengan kode, membaca instruksi dan kriteria penilaian.",
      "Mengumpulkan jawaban dalam bentuk teks, berkas, atau foto.",
      "Melihat nilai dan umpan balik per kriteria setelah dirilis dosen.",
    ],
  },
  {
    name: "Program studi",
    points: [
      "Menjalankan model bahasa di server sendiri (Ollama), sehingga jawaban tidak keluar dari institusi.",
      "Memiliki jejak siapa yang merilis nilai dan draf AI mana yang ditinjau.",
      "Dapat memakai penyedia cloud bila diizinkan, lewat konfigurasi server.",
    ],
  },
];

const limits = [
  "Saran AI bisa keliru. Skor, alasan, dan umpan balik wajib dibaca dosen sebelum dirilis.",
  "Kutipan diverifikasi ada di jawaban, tetapi relevansinya tetap perlu dinilai dosen.",
  "Kualitas draf bergantung pada model yang dipasang dan kejelasan rubrik.",
  "Model lokal di komputer tanpa GPU bisa membutuhkan beberapa menit per jawaban.",
  "Teks hasil OCR dari tulisan tangan bisa tidak lengkap; dosen dapat membuka halaman aslinya.",
  "Penyamaran identitas berbasis pola. Nama yang ditulis dengan ejaan lain mungkin tidak tersamarkan.",
];

function SectionHeading({ id, title, lead }: { id: string; title: string; lead?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="text-2xl font-semibold tracking-tight sm:text-[28px]">
        {title}
      </h2>
      {lead && <p className="mt-2 text-base text-muted-foreground">{lead}</p>}
    </div>
  );
}

function Illustration() {
  return (
    <figure
      aria-label="Ilustrasi tampilan peninjauan: jawaban dengan kutipan bukti di kiri, saran per kriteria di kanan"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-medium">Tinjau jawaban</span>
        <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
          Ilustrasi
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
        <div className="border-b border-border p-4 text-sm leading-relaxed md:border-r md:border-b-0">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Jawaban mahasiswa</p>
          <p>
            <mark className="evidence">
              Normalisasi bertujuan mengurangi redundansi data<sup>1</sup>
            </mark>{" "}
            sehingga perubahan cukup dilakukan di satu tempat. Pada tabel KRS dengan kunci (NIM,
            kode_mk),{" "}
            <mark className="evidence">
              nama mata kuliah dipindah ke tabel MataKuliah<sup>2</sup>
            </mark>{" "}
            karena hanya bergantung pada kode_mk.
          </p>
        </div>
        <ol className="divide-y divide-border text-sm">
          {[
            { n: 1, label: "Pemahaman konsep", ai: "8", final: "8", decision: "Diterima" },
            { n: 2, label: "Penerapan bentuk normal", ai: "7", final: "6", decision: "Diubah" },
            { n: 3, label: "Struktur argumen", ai: "—", final: "", decision: "Perlu dinilai" },
          ].map((row) => (
            <li key={row.n} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="tabular mr-1.5 text-muted-foreground">{row.n}.</span>
                {row.label}
                <span className="block text-xs text-muted-foreground">
                  Saran AI <span className="tabular">{row.ai}</span>/10 · {row.decision}
                </span>
              </span>
              <span className="tabular w-12 shrink-0 rounded-md border border-input px-2 py-1 text-right font-medium">
                {row.final || " "}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Dexa Assessment — beranda">
            <Brand />
          </Link>
          <nav aria-label="Navigasi halaman" className="hidden items-center gap-6 text-sm md:flex">
            <a href="#alur" className="text-muted-foreground hover:text-foreground">
              Alur
            </a>
            <a href="#pembagian" className="text-muted-foreground hover:text-foreground">
              Pembagian peran
            </a>
            <a href="#batasan" className="text-muted-foreground hover:text-foreground">
              Batasan
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="dexa-link min-h-10 px-4 py-2">
              Masuk
            </Link>
            <Link href="/register" className="dexa-link dexa-link-primary min-h-10 px-4 py-2">
              Daftar
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-20">
          <div>
            <h1 className="text-[32px] leading-tight font-semibold tracking-tight sm:text-[40px]">
              Koreksi tugas lebih cepat. Keputusan nilai tetap di tangan dosen.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Dexa membaca jawaban mahasiswa terhadap rubrik Anda dan menyiapkan draf skor per
              kriteria, lengkap dengan kutipan dari jawaban. Anda memeriksa, mengubah, lalu merilis.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="dexa-link dexa-link-primary">
                Daftar sebagai dosen
              </Link>
              <Link href="/login" className="dexa-link">
                Masuk ke ruang kerja
              </Link>
            </div>
          </div>
          <Illustration />
        </section>

        <section aria-labelledby="alur" className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <SectionHeading
              id="alur"
              title="Alur dari rubrik sampai nilai dirilis"
              lead="Enam langkah. AI hanya bekerja di langkah ketiga dan keempat."
            />
            <ol className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="border-t border-border pt-4">
                  <span className="tabular text-sm font-medium text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="pembagian" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <SectionHeading
              id="pembagian"
              title="AI menyiapkan, dosen memutuskan"
              lead="Pembagian kerja ini tertanam di aplikasi, bukan sekadar anjuran."
            />
            <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-border bg-muted/60">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      AI menyiapkan
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Dosen memutuskan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {responsibilities.map(([ai, dosen]) => (
                    <tr key={ai}>
                      <td className="px-4 py-3 text-muted-foreground">{ai}</td>
                      <td className="px-4 py-3">{dosen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section aria-labelledby="peran" className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <SectionHeading id="peran" title="Untuk siapa" />
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {roles.map((role) => (
                <div key={role.name}>
                  <h3 className="text-base font-semibold">{role.name}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {role.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary"
                        />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="batasan" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <SectionHeading
              id="batasan"
              title="Batasan yang perlu diketahui"
              lead="Kami lebih suka Anda tahu sejak awal."
            />
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {limits.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-fg"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Brand size={24} />
          <span>Draf AI bukan nilai. Nilai adalah keputusan dosen.</span>
        </div>
      </footer>
    </div>
  );
}
