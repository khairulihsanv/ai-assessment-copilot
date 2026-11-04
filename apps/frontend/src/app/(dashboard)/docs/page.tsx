import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";

export const metadata = { title: "Cara kerja AI — Dexa Assessment" };

const sections = [
  {
    title: "Keputusan nilai ada di dosen",
    points: [
      "AI hanya menyusun draf. Draf tidak pernah menjadi nilai dengan sendirinya.",
      "Dosen menerima, mengubah, atau menolak saran untuk tiap kriteria.",
      "Mahasiswa hanya melihat nilai dan umpan balik yang sudah dirilis dosen.",
    ],
  },
  {
    title: "Rubrik menjadi acuan",
    points: [
      "Setiap kriteria punya bobot dan skor maksimal, dan boleh diberi kunci jawaban serta materi.",
      "Total yang disarankan dihitung oleh sistem dari bobot, bukan oleh model.",
    ],
  },
  {
    title: "Cara draf disusun",
    points: [
      "Jawaban dipecah menjadi beberapa bagian, lalu dicari bagian yang paling relevan untuk tiap kriteria.",
      "Nama, NIM, email, dan nomor telepon disamarkan sebelum jawaban dikirim ke model.",
      "Model menilai tiap kriteria dan mengutip bukti. Kutipan yang tidak ditemukan di jawaban asli dibuang.",
      "Kriteria tanpa bukti atau dengan keyakinan rendah ditandai agar dicek dosen.",
    ],
  },
  {
    title: "Batasannya",
    points: [
      "Draf bisa keliru, jadi selalu baca jawabannya sebelum merilis nilai.",
      "Model lokal tanpa GPU bisa butuh beberapa menit per jawaban. Halaman boleh ditutup selama draf diproses.",
      "Kalau model tidak tersedia, tidak ada skor pengganti. Dosen tetap bisa menilai manual.",
    ],
  },
];

export default async function DocsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-[26px] leading-tight lg:text-[32px]">Cara kerja AI di Dexa</h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Yang dikerjakan AI, yang diputuskan dosen, dan batasannya.
        </p>
      </header>
      {sections.map((section) => (
        <section key={section.title} className="rounded-3xl bg-card p-6">
          <h2 className="text-lg">{section.title}</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            {section.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
