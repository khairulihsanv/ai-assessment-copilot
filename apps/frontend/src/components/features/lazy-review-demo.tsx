"use client";
import { Check, RotateCcw } from "lucide-react";
import { useState } from "react";
export default function LazyReviewDemo() {
  const [score, setScore] = useState(85);
  const [released, setReleased] = useState(false);
  return (
    <div className={`review-playground ${released ? "is-released" : ""}`}>
      <div className="playground-head">
        <span className="playground-avatar">NP</span>
        <div>
          <strong>Nadia Putri</strong>
          <p>Analisis kebutuhan sistem</p>
        </div>
        <span className={`motion-badge ${released ? "badge-lime" : "badge-peach"}`}>
          {released ? "Nilai dirilis" : "Draft saran AI"}
        </span>
      </div>
      <p className="playground-feedback">
        Analisis sudah terstruktur. Tambahkan contoh yang menghubungkan kebutuhan pengguna dengan
        keputusan rancangan Anda.
      </p>
      <div className="playground-score">
        <div>
          <label htmlFor="demo-score">Skor setelah tinjauan Anda</label>
          <p>Keputusan akhir tetap milik dosen.</p>
        </div>
        <div>
          <input
            id="demo-score"
            type="number"
            min="0"
            max="100"
            value={score}
            disabled={released}
            onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value))))}
          />
          <span>/100</span>
        </div>
      </div>
      <div role="status" className="playground-status">
        {released
          ? "✓ Simulasi: mahasiswa kini bisa membaca nilai dan catatan."
          : "Ubah skor, lalu coba tombol rilis di bawah."}
      </div>
      <button
        type="button"
        className={`bounce-button ${released ? "bounce-secondary" : ""}`}
        onClick={() => {
          if (released) {
            setScore(85);
            setReleased(false);
          } else setReleased(true);
        }}
      >
        {released ? (
          <>
            <RotateCcw size={17} />
            Ulangi simulasi
          </>
        ) : (
          <>
            Setujui & rilis (simulasi)
            <Check size={18} />
          </>
        )}
      </button>
      <p className="playground-note">Data contoh · tidak merilis nilai sungguhan.</p>
    </div>
  );
}
