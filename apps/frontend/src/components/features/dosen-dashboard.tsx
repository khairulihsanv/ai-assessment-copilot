"use client";

import {
  ArrowDownLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { formatRelativeTime, getInitials } from "@/shared/utils";
import styles from "./dosen-dashboard.module.css";

export interface DosenDashboardData {
  classes: Array<{
    id: string;
    name: string;
    subject: string | null;
    createdAt: string | Date;
    _count: { enrollments: number; assignments: number };
  }>;
  pending: number;
  released: number;
  queue: Array<{
    id: string;
    createdAt: string | Date;
    user: { name: string };
    assignment: { id: string; title: string; classId: string; class: { name: string } };
  }>;
}

export function DosenDashboard({
  name,
  data,
  dateLabel,
  unavailable = false,
}: {
  name: string;
  data: DosenDashboardData;
  dateLabel: string;
  unavailable?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const taskDialog = useRef<HTMLDialogElement>(null);
  const { classes, pending, released, queue } = data;
  const query = search.trim().toLocaleLowerCase("id-ID");
  const visibleQueue = queue.filter(
    (item) =>
      (!classFilter || item.assignment.classId === classFilter) &&
      `${item.user.name} ${item.assignment.title} ${item.assignment.class.name}`
        .toLocaleLowerCase("id-ID")
        .includes(query),
  );
  // The queue can include submissions from archived classes that are absent from the class list.
  const queueClasses = Array.from(
    new Map(queue.map((item) => [item.assignment.classId, item.assignment.class.name])),
  );

  return (
    <div className={styles.dashboard} data-dosen-dashboard>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Ringkasan / Dosen</p>
          <h1>
            Selamat datang, {name}
            {/[.!?]$/.test(name.trim()) ? "" : "."}
          </h1>
          <p className={styles.subtitle}>Tinjau pengumpulan dan lanjutkan penilaian kelas Anda.</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.date}>
            <CalendarDays size={15} aria-hidden="true" />
            {dateLabel}
          </span>
          {!unavailable &&
            (classes.length > 1 ? (
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => taskDialog.current?.showModal()}
              >
                <Plus size={17} aria-hidden="true" />
                Buat tugas
              </button>
            ) : (
              <Link
                className={styles.primaryAction}
                href={classes[0] ? `/classes/${classes[0].id}/assignments/new` : "/classes"}
              >
                <Plus size={17} aria-hidden="true" />
                {classes[0] ? "Buat tugas" : "Buat kelas pertama"}
              </Link>
            ))}
        </div>
      </header>

      {unavailable ? (
        <section className={styles.errorState} role="alert">
          <h2>Ringkasan belum dapat dimuat</h2>
          <p>
            Data kelas dan pengumpulan belum tersedia. Muat ulang halaman untuk mencoba kembali.
          </p>
          <a className={styles.secondaryAction} href="/dashboard">
            Muat ulang
          </a>
        </section>
      ) : (
        <>
          <section className={styles.metrics} aria-label="Ringkasan pekerjaan">
            <div className={styles.priorityMetric}>
              <div className={styles.metricLabel}>
                <span className={styles.blueDot} />
                Perlu dikoreksi
              </div>
              <div className={styles.metricValue}>
                {pending}
                <span>pengumpulan</span>
              </div>
              <Link href="/grading" className={styles.metricNote}>
                Buka ruang penilaian
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div>
              <div className={styles.metricLabel}>
                <CheckCheck size={16} aria-hidden="true" />
                Nilai dirilis
              </div>
              <div className={styles.metricValue}>
                {released}
                <span>pengumpulan</span>
              </div>
              <p className={styles.metricNote}>Sudah dapat dilihat mahasiswa</p>
            </div>
            <div>
              <div className={styles.metricLabel}>
                <BookOpen size={16} aria-hidden="true" />
                Kelas aktif
              </div>
              <div className={styles.metricValue}>
                {classes.length}
                <span>kelas</span>
              </div>
              <p className={styles.metricNote}>
                {classes.reduce((total, item) => total + item._count.enrollments, 0)} keanggotaan
                mahasiswa
              </p>
            </div>
          </section>

          <div className={styles.workGrid}>
            <section className={styles.queuePanel} aria-labelledby="review-heading">
              <div className={styles.sectionHeading}>
                <div>
                  <div className={styles.titleWithCount}>
                    <h2 id="review-heading">Antrean koreksi</h2>
                    <span className={styles.count}>{pending}</span>
                  </div>
                  <p>Pengumpulan terbaru yang belum memiliki nilai rilis.</p>
                </div>
                <Link href="/grading" className={styles.textLink}>
                  Lihat semua
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>

              {queue.length > 0 ? (
                <>
                  <div className={styles.toolbar}>
                    <div className={styles.searchField}>
                      <Search size={16} aria-hidden="true" />
                      <label htmlFor="review-search" className="sr-only">
                        Cari mahasiswa atau tugas
                      </label>
                      <input
                        id="review-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari mahasiswa atau tugas…"
                      />
                    </div>
                    <div className={styles.filterField}>
                      <SlidersHorizontal size={15} aria-hidden="true" />
                      <label htmlFor="review-class" className="sr-only">
                        Filter kelas
                      </label>
                      <select
                        id="review-class"
                        value={classFilter}
                        onChange={(event) => setClassFilter(event.target.value)}
                      >
                        <option value="">Semua kelas</option>
                        {queueClasses.map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={styles.queueLabels} aria-hidden="true">
                    <span>Mahasiswa & tugas</span>
                    <span>Pengumpulan</span>
                    <span />
                  </div>
                  {visibleQueue.length > 0 ? (
                    <ul className={styles.queueList}>
                      {visibleQueue.map((item) => (
                        <li key={item.id}>
                          <Link
                            className={styles.queueRow}
                            href={`/classes/${item.assignment.classId}/assignments/${item.assignment.id}/submissions/${item.id}`}
                          >
                            <span className={styles.avatar} aria-hidden="true">
                              {getInitials(item.user.name) || "M"}
                            </span>
                            <div className={styles.submissionInfo}>
                              <h3>{item.user.name || "Mahasiswa"}</h3>
                              <p>{item.assignment.title}</p>
                              <span>{item.assignment.class.name}</span>
                            </div>
                            <div className={styles.submissionTime}>
                              <span className={styles.reviewStatus}>Perlu ditinjau</span>
                              <time dateTime={new Date(item.createdAt).toISOString()}>
                                {formatRelativeTime(item.createdAt)}
                              </time>
                            </div>
                            <span className={styles.reviewArrow}>
                              <ArrowRight size={17} aria-hidden="true" />
                              <span className="sr-only">Tinjau jawaban</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={styles.emptyState} role="status">
                      <Search size={25} aria-hidden="true" />
                      <h3>Tidak ada hasil yang cocok</h3>
                      <p>Coba nama mahasiswa, judul tugas, atau kelas lain.</p>
                      <button
                        type="button"
                        className={styles.secondaryAction}
                        onClick={() => {
                          setSearch("");
                          setClassFilter("");
                        }}
                      >
                        Hapus filter
                      </button>
                    </div>
                  )}
                  <footer className={styles.queueFooter}>
                    Menampilkan {visibleQueue.length} dari {queue.length} pengumpulan terbaru.
                    {pending > queue.length && (
                      <Link href="/grading">
                        Lihat seluruh {pending} pengumpulan
                        <ChevronRight size={14} aria-hidden="true" />
                      </Link>
                    )}
                  </footer>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>
                    <Check size={23} aria-hidden="true" />
                  </span>
                  <h3>Belum ada jawaban yang perlu dikoreksi</h3>
                  <p>Pengumpulan mahasiswa akan muncul di sini saat siap untuk ditinjau.</p>
                  <Link href="/assignments" className={styles.secondaryAction}>
                    Lihat tugas
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </section>

            <aside className={styles.sideRail} aria-label="Perangkat penilaian">
              <section className={styles.toolsPanel}>
                <p className={styles.eyebrow}>Akses cepat</p>
                <h2>Rubrik & rekap nilai</h2>
                <p className={styles.toolsDescription}>
                  Kelola acuan dan ikuti hasil penilaian kelas Anda.
                </p>
                <Link href="/rubrics" className={styles.toolLink}>
                  <FileText size={18} aria-hidden="true" />
                  <span>
                    <strong>Acuan & rubrik</strong>
                    <small>Kriteria penilaian yang konsisten</small>
                  </span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/analytics" className={styles.toolLink}>
                  <ArrowDownLeft size={18} aria-hidden="true" />
                  <span>
                    <strong>Rekap nilai</strong>
                    <small>Lihat hasil dan analitik kelas</small>
                  </span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </section>
              <section className={styles.reviewNote}>
                <ClipboardCheck size={19} aria-hidden="true" />
                <div>
                  <h2>Anda yang menentukan nilai.</h2>
                  <p>
                    Rekomendasi AI adalah bahan pertimbangan. Mahasiswa hanya melihat nilai yang
                    sudah Anda rilis.
                  </p>
                </div>
              </section>
            </aside>
          </div>

          <section className={styles.classesSection} aria-labelledby="classes-heading">
            <div className={styles.sectionHeading}>
              <div>
                <h2 id="classes-heading">Kelas yang Anda ampu</h2>
                <p>Akses tugas dan pengumpulan di setiap kelas.</p>
              </div>
              <Link href="/classes" className={styles.textLink}>
                Kelola kelas
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            {classes.length > 0 ? (
              <ul className={styles.classList}>
                {classes.slice(0, 4).map((item, index) => (
                  <li key={item.id}>
                    <Link href={`/classes/${item.id}`} className={styles.classRow}>
                      <span className={styles.classNumber} aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className={styles.classInfo}>
                        <h3>{item.name}</h3>
                        <p>{item.subject || "Mata kuliah"}</p>
                      </div>
                      <span className={styles.classCounts}>
                        {item._count.enrollments} mahasiswa
                        <span>{item._count.assignments} tugas</span>
                      </span>
                      <span className={styles.classArrow}>
                        <ArrowRight size={17} aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyClasses}>
                <BookOpen size={25} aria-hidden="true" />
                <div>
                  <h3>Mulai dari kelas pertama Anda</h3>
                  <p>Buat kelas untuk membagikan tugas dan menerima jawaban mahasiswa.</p>
                </div>
                <Link href="/classes" className={styles.secondaryAction}>
                  Kelola kelas
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            )}
            {classes.length > 4 && (
              <p className={styles.classFootnote}>
                Menampilkan 4 dari {classes.length} kelas aktif.{" "}
                <Link href="/classes">Lihat semua kelas</Link>
              </p>
            )}
          </section>
        </>
      )}

      <dialog ref={taskDialog} className={styles.taskDialog} aria-labelledby="task-dialog-title">
        <div className={styles.dialogHeading}>
          <div>
            <h2 id="task-dialog-title">Buat tugas untuk kelas mana?</h2>
            <p>Pilih kelas tujuan untuk melanjutkan.</p>
          </div>
          <button
            type="button"
            aria-label="Tutup pilihan kelas"
            onClick={() => taskDialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <ul>
          {classes.map((item) => (
            <li key={item.id}>
              <Link
                href={`/classes/${item.id}/assignments/new`}
                onClick={() => taskDialog.current?.close()}
              >
                <BookOpen size={19} aria-hidden="true" />
                <span>{item.name}</span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </dialog>
    </div>
  );
}
