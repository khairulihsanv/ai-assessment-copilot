import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn, formatRelativeTime } from "@/shared/utils";
import { pickByKey } from "./class-cover";
import { DeadlineScene } from "./deadline-scene";
import { JoinClassInline } from "./join-class-inline";

export interface StudentDashboardData {
  enrollments: Array<{ id: string; class: { id: string; name: string } }>;
  tasks: Array<{
    id: string;
    title: string;
    dueDate: string | Date;
    classId: string;
    class: { name: string };
    submissions: Array<{ id: string }>;
  }>;
  grades: Array<{
    id: string;
    finalScore: number;
    status: string;
    createdAt: string | Date;
    submission: {
      releasedGradeId: string | null;
      assignment: { id: string; classId: string; title: string; maxScore: number };
    };
  }>;
}

const TIME_ZONE = "Asia/Jakarta";
const TILES = ["--tile-1", "--tile-2", "--tile-3", "--tile-4", "--tile-5"];
const DAY_MS = 24 * 60 * 60 * 1000;

const dateKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
const formatDue = (date: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(date);

/** Monday to Sunday of the current week, in campus time. */
function currentWeek(now: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: TIME_ZONE,
  }).format(now);
  const fromMonday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday);
  return Array.from({ length: 7 }, (_, i) => new Date(now.getTime() + (i - fromMonday) * DAY_MS));
}

const taskPath = (task: StudentDashboardData["tasks"][number]) =>
  `/classes/${task.classId}/assignments/${task.id}`;

function WeekCalendar({ tasks, now }: { tasks: StudentDashboardData["tasks"]; now: Date }) {
  const week = currentWeek(now);
  const today = dateKey(now);
  const dayFormat = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    timeZone: TIME_ZONE,
  });
  const rangeFormat = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  });

  return (
    <section aria-labelledby="week-heading" className="rounded-3xl bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="week-heading" className="text-xl">
          Tenggat minggu ini
        </h2>
        <span className="text-[13px] font-bold text-muted-foreground">
          {rangeFormat.format(week[0])} – {rangeFormat.format(week[6])}
        </span>
      </div>
      <div className="mt-3.5 overflow-x-auto">
        <ul className="grid min-w-[840px] grid-cols-7 gap-2 lg:min-w-0">
          {week.map((day) => {
            const key = dateKey(day);
            const isToday = key === today;
            const due = tasks.filter((t) => dateKey(new Date(t.dueDate)) === key);
            return (
              <li
                key={key}
                className={cn(
                  "flex min-h-32 min-w-0 flex-col gap-1.5 rounded-2xl p-2",
                  isToday ? "bg-secondary text-secondary-foreground" : "bg-muted",
                )}
              >
                <span
                  className={cn("text-[13px] font-extrabold", !isToday && "text-muted-foreground")}
                >
                  {dayFormat.format(day)}
                </span>
                {due.map((task) => (
                  <Link
                    key={task.id}
                    href={taskPath(task)}
                    className="block rounded-xl p-2 text-[var(--tile-ink)]"
                    style={{ background: `var(${TILES[pickByKey(task.classId, TILES.length)]})` }}
                  >
                    <span className="block text-[13px] leading-tight font-extrabold break-words">
                      {task.title}
                    </span>
                    <span className="mt-1 block text-xs leading-tight font-semibold break-words opacity-85">
                      {task.submissions.length ? "Sudah dikumpulkan" : task.class.name}
                    </span>
                  </Link>
                ))}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function StudentDashboard({
  name,
  greeting,
  data,
}: {
  name: string;
  greeting: string;
  data: StudentDashboardData;
}) {
  const { enrollments, tasks, grades } = data;
  const now = new Date();
  const waiting = tasks.filter((t) => !t.submissions.length && new Date(t.dueDate) >= now);
  const next = waiting[0];

  return (
    <div className="flex flex-wrap items-stretch gap-4">
      <div className="flex min-w-0 flex-[999_1_540px] flex-col gap-4">
        <section className="relative min-h-72 overflow-hidden rounded-3xl bg-[#fbd3b0]">
          <DeadlineScene className="absolute inset-0 size-full" />
          <div className="relative p-4 sm:p-5">
            <div className="w-full max-w-sm rounded-[22px] bg-card/95 p-5">
              {next ? (
                <>
                  <p className="text-xs font-extrabold text-primary">Tenggat terdekat</p>
                  <h1 className="mt-1 text-2xl leading-tight break-words">{next.title}</h1>
                  <p className="mt-1.5 text-[13px] font-semibold text-muted-foreground">
                    {next.class.name} · {formatDue(new Date(next.dueDate))}
                  </p>
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <Link
                      href={taskPath(next)}
                      className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
                    >
                      Kumpulkan tugas
                    </Link>
                    <Link
                      href="/assignments"
                      className="inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-bold hover:bg-muted"
                    >
                      Semua tugas
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-extrabold text-primary">Tenggat terdekat</p>
                  <h1 className="mt-1 text-2xl leading-tight">Tidak ada tugas yang menunggu</h1>
                  <p className="mt-1.5 text-[13px] font-semibold text-muted-foreground">
                    {enrollments.length
                      ? "Tugas baru dari dosen akan muncul di sini."
                      : "Gabung ke kelas dengan kode dari dosen Anda untuk mulai."}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        <WeekCalendar tasks={tasks} now={now} />
      </div>

      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
        <section className="rounded-3xl bg-card p-6 text-center">
          <h2 className="text-2xl leading-tight lg:text-[28px]">
            {greeting},
            <br />
            {name}
          </h2>
          <p className="mx-auto mt-2.5 max-w-72 text-sm leading-relaxed font-medium text-muted-foreground">
            {waiting.length} tugas menunggu, {grades.length} nilai sudah dirilis, dari{" "}
            {enrollments.length} kelas yang Anda ikuti.
          </p>
          <JoinClassInline />
        </section>

        <section aria-labelledby="grades-heading" className="flex-1 rounded-3xl bg-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="grades-heading" className="text-xl">
              Nilai terbaru
            </h2>
            <Link
              href="/grades"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary"
            >
              Semua
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          {grades.length ? (
            <ul className="space-y-2">
              {grades.slice(0, 4).map((grade) => {
                const assignment = grade.submission.assignment;
                return (
                  <li key={grade.id}>
                    <Link
                      href={`/classes/${assignment.classId}/assignments/${assignment.id}/result`}
                      className="flex items-center gap-3 rounded-2xl bg-muted p-2.5"
                    >
                      <span
                        className="flex size-13 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-[var(--tile-ink)] tabular-nums"
                        style={{
                          background: `var(${TILES[pickByKey(grade.id, TILES.length)]})`,
                        }}
                      >
                        {grade.finalScore}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold">
                          {assignment.title}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
                          Dari {assignment.maxScore} · dirilis{" "}
                          {formatRelativeTime(grade.createdAt).toLowerCase()}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Nilai dan umpan balik akan tampil di sini setelah dirilis dosen.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
