"use client";
import { Download } from "lucide-react";
import { FeatureIcon } from "@/components/brand/feature-icon";
export interface AnalyticsData {
  classesCount: number;
  assignmentsCount: number;
  submissionsCount: number;
  gradesCount: number;
  releasedCount: number;
  distribution: { label: string; count: number }[];
  gradeRows: {
    id: string;
    student: string;
    className: string;
    assignment: string;
    score: number;
    maxScore: number;
    releasedAt: string | null;
  }[];
}
function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
}
export function AnalyticsReport({ data }: { data: AnalyticsData }) {
  function download() {
    const rows = [
      ["Mahasiswa", "Kelas", "Tugas", "Nilai", "Skor maksimal", "Tanggal revisi rilis"],
      ...data.gradeRows.map((g) => [
        g.student,
        g.className,
        g.assignment,
        g.score,
        g.maxScore,
        g.releasedAt,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "dexa-rekap-nilai.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const total = data.distribution.reduce((n, g) => n + g.count, 0);
  return (
    <div className="analytics-page">
      <header className="dashboard-section-heading">
        <div>
          <p className="dashboard-kicker">DARI DATA KE PEMAHAMAN</p>
          <h1>Laporan kelas</h1>
          <p className="feature-page-description">
            Ringkasan kelas dan nilai resmi yang sudah Anda rilis.
          </p>
        </div>
        <button
          type="button"
          className="bounce-button bounce-small"
          onClick={download}
          disabled={!data.gradeRows.length}
        >
          <Download size={15} />
          Unduh CSV
        </button>
      </header>
      <div className="analytics-stats">
        {[
          ["Kelas", data.classesCount, "class"],
          ["Tugas", data.assignmentsCount, "task"],
          ["Pengumpulan", data.submissionsCount, "review"],
          ["Nilai dirilis", data.releasedCount, "grade"],
        ].map(([label, value, icon], i) => (
          <div key={label} className="dashboard-panel">
            <FeatureIcon
              name={icon as "class" | "task" | "review" | "grade"}
              tone={i === 1 ? "peach" : i === 3 ? "lime" : "blue"}
            />
            <strong>{value}</strong>
            <p>{label}</p>
          </div>
        ))}
      </div>
      <div className="analytics-detail-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Distribusi nilai resmi</h2>
              <p>Skor dinormalisasi ke skala 100.</p>
            </div>
          </div>
          <div className="analytics-distribution">
            {total ? (
              data.distribution.map((g, i) => {
                const percent = Math.round((g.count / total) * 100);
                return (
                  <div key={g.label}>
                    <div>
                      <span>{g.label}</span>
                      <strong>
                        {g.count} nilai · {percent}%
                      </strong>
                    </div>
                    <div className={`distribution-track distribution-${i}`}>
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="dashboard-empty">
                <FeatureIcon name="report" />
                <p>Distribusi muncul setelah ada nilai resmi yang dirilis.</p>
              </div>
            )}
          </div>
        </section>
        <section className="dashboard-progress-card">
          <FeatureIcon name="shield" tone="lime" />
          <h2>
            Data yang bisa
            <br />
            ditelusuri kembali.
          </h2>
          <p>
            Hanya revisi nilai yang saat ini dirilis ke mahasiswa yang masuk dalam distribusi dan
            ekspor. Draft AI tidak dihitung sebagai nilai resmi.
          </p>
          <p>Total revisi penilaian pada akun ini: {data.gradesCount}.</p>
        </section>
      </div>
      <section className="dashboard-panel">
        <div className="dashboard-panel-heading">
          <div>
            <h2>Rekap nilai dirilis</h2>
            <p>{data.gradeRows.length} pengumpulan memiliki nilai resmi.</p>
          </div>
        </div>
        {data.gradeRows.length ? (
          <div className="analytics-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mahasiswa</th>
                  <th>Tugas & kelas</th>
                  <th>Nilai</th>
                </tr>
              </thead>
              <tbody>
                {data.gradeRows.map((g) => (
                  <tr key={g.id}>
                    <td>{g.student}</td>
                    <td>
                      <strong>{g.assignment}</strong>
                      <small>{g.className}</small>
                    </td>
                    <td>
                      {g.score}
                      <span> / {g.maxScore}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-empty">
            <p>Belum ada nilai dirilis untuk diekspor.</p>
          </div>
        )}
      </section>
    </div>
  );
}
