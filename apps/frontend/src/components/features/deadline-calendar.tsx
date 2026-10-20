"use client";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FeatureIcon } from "@/components/brand/feature-icon";
export interface DeadlineTask {
  id: string;
  classId: string;
  title: string;
  className: string;
  dueDate: string;
}
export function DeadlineCalendar({ tasks }: { tasks: DeadlineTask[] }) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const year = month.getFullYear();
  const m = month.getMonth();
  const start = (new Date(year, m, 1).getDay() + 6) % 7;
  const days = new Date(year, m + 1, 0).getDate();
  const monthTasks = tasks.filter((t) => {
    const d = new Date(t.dueDate);
    return d.getFullYear() === year && d.getMonth() === m;
  });
  const visible = monthTasks
    .filter((t) => selected === null || new Date(t.dueDate).getDate() === selected)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const dateLabel = (d: number) =>
    new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(year, m, d),
    );
  return (
    <div className="calendar-page">
      <header className="dashboard-section-heading">
        <div>
          <p className="dashboard-kicker">SATU TENGGAT, SATU LANGKAH</p>
          <h1>Kalender tugas</h1>
          <p className="feature-page-description">
            Lihat tenggat tugas yang tersedia di kelas Anda.
          </p>
        </div>
        <FeatureIcon name="calendar" tone="blue" />
      </header>
      <div className="calendar-layout">
        <section className="dashboard-panel">
          <div className="calendar-toolbar">
            <h2>
              {new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month)}
            </h2>
            <div>
              <button
                type="button"
                onClick={() => {
                  setMonth(new Date(year, m - 1, 1));
                  setSelected(null);
                }}
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelected(null);
                }}
              >
                Bulan ini
              </button>
              <button
                type="button"
                onClick={() => {
                  setMonth(new Date(year, m + 1, 1));
                  setSelected(null);
                }}
                aria-label="Bulan berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="calendar-days">
              {["mon", "tue", "wed", "thu", "fri", "sat"].slice(0, start).map((day) => (
                <span className="calendar-blank" key={`blank-${day}`} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const day = i + 1;
                const count = monthTasks.filter(
                  (t) => new Date(t.dueDate).getDate() === day,
                ).length;
                const today = new Date();
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => setSelected(selected === day ? null : day)}
                    aria-label={`${dateLabel(day)}, ${count} tugas`}
                    aria-pressed={selected === day}
                    className={`${today.getFullYear() === year && today.getMonth() === m && today.getDate() === day ? "is-today" : ""} ${count ? "has-task" : ""}`}
                  >
                    <span>{day}</span>
                    {count > 0 && (
                      <small>
                        {count}
                        <span> tugas</span>
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="calendar-legend">
            Pilih tanggal untuk melihat tugas. Angka menunjukkan jumlah tenggat.
          </p>
        </section>
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>{selected ? dateLabel(selected) : "Tenggat bulan ini"}</h2>
              <p>{visible.length} tugas ditampilkan</p>
            </div>
            {selected && (
              <button
                type="button"
                className="text-xs text-primary"
                onClick={() => setSelected(null)}
              >
                Semua
              </button>
            )}
          </div>
          {visible.length ? (
            <div className="calendar-agenda">
              {visible.map((t) => (
                <Link key={t.id} href={`/classes/${t.classId}/assignments/${t.id}`}>
                  <span>{new Date(t.dueDate).getDate()}</span>
                  <div>
                    <small>{t.className}</small>
                    <strong>{t.title}</strong>
                    <p>
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(t.dueDate))}
                    </p>
                  </div>
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <FeatureIcon name="calendar" tone="lime" />
              <h3>Belum ada tenggat di sini.</h3>
              <p>Coba tanggal atau bulan lain untuk melihat tugas.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
