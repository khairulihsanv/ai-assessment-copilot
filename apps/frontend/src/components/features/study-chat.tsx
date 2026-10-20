"use client";
import { ArrowRight, Loader2, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DexMascot } from "@/components/brand/dex-mascot";
import { FeatureIcon } from "@/components/brand/feature-icon";

interface TaskChoice {
  id: string;
  title: string;
  className: string;
}
interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}
const suggestions = [
  "Bantu saya memahami kriteria rubrik tugas ini.",
  "Bantu pecah tugas ini menjadi langkah pengerjaan.",
  "Apa yang perlu saya periksa sebelum mengumpulkan draf?",
];
export function StudyChat({ tasks, name }: { tasks: TaskChoice[]; name: string }) {
  const [assignmentId, setAssignmentId] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const counter = useRef(0);
  useEffect(() => {
    if (messages.length || pending)
      end.current?.scrollIntoView({
        block: "nearest",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
  }, [messages, pending]);
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || pending) return;
    const question = draft.trim();
    const next: Message[] = [
      ...messages,
      { id: ++counter.current, role: "user", content: question },
    ];
    setMessages(next);
    setDraft("");
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/ai/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignmentId || undefined,
          messages: next
            .slice(-11)
            .map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
        }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.answer !== "string")
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : typeof data.error === "string"
              ? data.error
              : "Pertanyaan belum dapat diproses. Coba lagi.",
        );
      setMessages([...next, { id: ++counter.current, role: "assistant", content: data.answer }]);
    } catch (e) {
      setMessages(next.slice(0, -1));
      setDraft(question);
      setError(e instanceof Error ? e.message : "Layanan AI belum dapat dihubungi.");
    } finally {
      setPending(false);
      input.current?.focus();
    }
  }
  return (
    <div className="study-chat-page">
      <header className="study-header">
        <div>
          <p className="dashboard-kicker">TEMAN BERPIKIR ANDA</p>
          <h1>
            Halo, {name}.<br />
            <span>Mau memahami apa hari ini?</span>
          </h1>
          <p>
            Tanya konsep, pahami rubrik, dan rencanakan tugas. Jawaban AI tetap perlu Anda periksa.
          </p>
        </div>
        <DexMascot pose="wave" />
      </header>
      <section className="study-workspace">
        <div className="study-toolbar">
          <FeatureIcon name="copilot" tone="lilac" />
          <div>
            <strong>Study Copilot</strong>
            <span>Bertanya itu bagian dari belajar.</span>
          </div>
          <button
            type="button"
            aria-label="Mulai percakapan baru"
            disabled={pending || !messages.length}
            onClick={() => {
              setMessages([]);
              setError("");
              setDraft("");
            }}
          >
            <Trash2 size={16} />
            <span>Mulai baru</span>
          </button>
        </div>
        <div className="study-context">
          <label htmlFor="study-assignment">Konteks tugas</label>
          <select
            id="study-assignment"
            value={assignmentId}
            disabled={pending}
            onChange={(e) => {
              setAssignmentId(e.target.value);
              setMessages([]);
              setError("");
            }}
          >
            <option value="">Diskusi konsep umum</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.className} — {t.title}
              </option>
            ))}
          </select>
          <p>
            {assignmentId
              ? "Dex menggunakan instruksi dan rubrik publik tugas ini."
              : "Pilih tugas untuk membahas instruksi dan kriteria yang sesuai."}
          </p>
        </div>
        <div
          className="study-messages"
          role="log"
          aria-label="Percakapan dengan Study Copilot"
          aria-live="polite"
        >
          {!messages.length && !pending ? (
            <div className="study-start">
              <FeatureIcon name="copilot" tone="lilac" />
              <h2>Mulai dari satu pertanyaan.</h2>
              <p>
                Belum perlu punya jawaban sempurna.
                <br />
                Pilih ide di bawah atau tulis pertanyaanmu sendiri.
              </p>
              <div>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setDraft(s);
                      input.current?.focus();
                    }}
                  >
                    {s}
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <article className={`study-message study-message-${m.role}`} key={m.id}>
                <span>{m.role === "user" ? "Anda" : "Dex · jawaban AI"}</span>
                <p>{m.content}</p>
              </article>
            ))
          )}
          {pending && (
            <div className="study-thinking" role="status">
              <Loader2 size={15} className="animate-spin" />
              Dex sedang menyusun penjelasan…
            </div>
          )}
          <div ref={end} />
        </div>
        {error && (
          <p role="alert" className="study-error">
            {error}
          </p>
        )}
        <form onSubmit={send} className="study-composer">
          <label htmlFor="study-question" className="sr-only">
            Pertanyaan untuk Study Copilot
          </label>
          <textarea
            id="study-question"
            ref={input}
            value={draft}
            maxLength={4000}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tulis pertanyaan atau bagian draf yang ingin didiskusikan…"
            rows={2}
          />
          <button type="submit" disabled={pending || !draft.trim()} aria-label="Kirim pertanyaan">
            {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
        <p className="study-footnote">
          Percakapan ini tidak memberi nilai resmi. Riwayat tersimpan hanya selama halaman ini
          terbuka.
        </p>
      </section>
    </div>
  );
}
