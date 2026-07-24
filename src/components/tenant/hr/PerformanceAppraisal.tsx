import React, { useState, useMemo } from "react";
import {
  Award,
  TrendingUp,
  PlusCircle,
  Trophy,
  BarChart3,
  User,
} from "lucide-react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { PerformanceReview } from "../../../types";

interface PerformanceAppraisalProps {
  activeSubTab: string;
}

const DEFAULT_CRITERIA = [
  { name: "Kualitas Kerja", weight: 30 },
  { name: "Ketepatan Waktu", weight: 25 },
  { name: "Kerjasama Tim", weight: 20 },
  { name: "Inisiatif", weight: 15 },
  { name: "Kepatuhan", weight: 10 },
];

const SCORE_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
];

function getScoreColor(score: number) {
  const idx = Math.min(Math.max(Math.round(score) - 1, 0), 9);
  return SCORE_COLORS[idx];
}

function getScoreLabel(score: number) {
  if (score >= 9) return "Sangat Baik";
  if (score >= 7) return "Baik";
  if (score >= 5) return "Cukup";
  if (score >= 3) return "Kurang";
  return "Sangat Kurang";
}

function calcWeightedAverage(
  criteria: { name: string; score: number; weight: number }[],
) {
  if (criteria.length === 0) return 0;
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = criteria.reduce((s, c) => s + c.score * c.weight, 0);
  return Math.round((weighted / totalWeight) * 100) / 100;
}

export const PerformanceAppraisal: React.FC<PerformanceAppraisalProps> = ({
  activeSubTab,
}) => {
  const { employees, updateEmployee, currentUser } = useSaaS();
  const { showToast } = useToast();
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [formPeriod, setFormPeriod] = useState("");
  const [formScores, setFormScores] = useState<Record<string, number>>(
    () => Object.fromEntries(DEFAULT_CRITERIA.map((c) => [c.name, 5])),
  );
  const [formComments, setFormComments] = useState("");
  const [formGoals, setFormGoals] = useState("");

  if (activeSubTab !== "performance") return null;

  const selectedEmp = employees.find((e) => e.id === selectedEmpId);
  const reviews = selectedEmp?.performanceReviews || [];

  const overallScore = useMemo(() => {
    const crit = DEFAULT_CRITERIA.map((c) => ({
      name: c.name,
      score: formScores[c.name] || 5,
      weight: c.weight,
    }));
    return calcWeightedAverage(crit);
  }, [formScores]);

  const avgScore = useMemo(() => {
    if (reviews.length === 0) return 0;
    return (
      Math.round(
        (reviews.reduce((s, r) => s + r.overallScore, 0) / reviews.length) *
          100,
      ) / 100
    );
  }, [reviews]);

  const leaderboard = useMemo(() => {
    return employees
      .filter((e) => e.performanceReviews && e.performanceReviews.length > 0)
      .map((e) => {
        const revs = e.performanceReviews!;
        const avg =
          revs.reduce((s, r) => s + r.overallScore, 0) / revs.length;
        return { id: e.id, name: e.name, position: e.position, avg, count: revs.length };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [employees]);

  const handleSave = () => {
    if (!selectedEmpId || !formPeriod.trim()) {
      showToast("Periode wajib diisi", "error");
      return;
    }
    const criteria = DEFAULT_CRITERIA.map((c) => ({
      name: c.name,
      score: formScores[c.name] || 5,
      weight: c.weight,
    }));
    const newReview: PerformanceReview = {
      id: "pr-" + Math.random().toString(36).substr(2, 9),
      reviewDate: new Date().toISOString(),
      period: formPeriod.trim(),
      overallScore: calcWeightedAverage(criteria),
      criteria,
      reviewedBy: currentUser.name,
      comments: formComments.trim() || undefined,
      goals: formGoals
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    };
    const existing = selectedEmp?.performanceReviews || [];
    updateEmployee(selectedEmpId, {
      performanceReviews: [...existing, newReview],
    });
    showToast("Penilaian kinerja berhasil disimpan", "success");
    setShowForm(false);
    setFormPeriod("");
    setFormScores(Object.fromEntries(DEFAULT_CRITERIA.map((c) => [c.name, 5])));
    setFormComments("");
    setFormGoals("");
  };

  const medalColors = [
    "text-amber-400",
    "text-slate-400",
    "text-orange-400",
  ];

  return (
    <div className="space-y-6 animate-fadeIn dark:text-zinc-300">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Karyawan",
            value: String(employees.length),
            color: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Rata-rata Skor",
            value: reviews.length > 0 ? avgScore.toFixed(1) : "-",
            color: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Total Penilaian",
            value: String(
              employees.reduce(
                (s, e) => s + (e.performanceReviews?.length || 0),
                0,
              ),
            ),
            color: "text-purple-600 dark:text-purple-400",
          },
          {
            label: "Pencapaian Tertinggi",
            value:
              leaderboard.length > 0 ? leaderboard[0].avg.toFixed(1) : "-",
            color: "text-amber-600 dark:text-amber-400",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 dark:bg-zinc-950 dark:border-zinc-800"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
              {kpi.label}
            </p>
            <p className={`text-lg font-extrabold font-mono ${kpi.color}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Selector Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
            Pilih Karyawan
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => {
              setSelectedEmpId(e.target.value);
              setShowForm(false);
            }}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
          >
            <option value="">-- Pilih Karyawan --</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.position}
              </option>
            ))}
          </select>
        </div>
        {selectedEmpId && (
          <div className="flex items-end">
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Buat Penilaian Baru
            </button>
          </div>
        )}
      </div>

      {/* New Review Form */}
      {showForm && selectedEmp && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 dark:bg-zinc-950 dark:border-zinc-800">
          <h3 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider mb-4">
            Penilaian Baru — {selectedEmp.name}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                Periode
              </label>
              <input
                type="text"
                placeholder="e.g. Q2 2026"
                value={formPeriod}
                onChange={(e) => setFormPeriod(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                Skor Keseluruhan (Otomatis)
              </label>
              <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                {overallScore.toFixed(2)} — {getScoreLabel(overallScore)}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
              Kriteria Penilaian
            </label>
            <div className="space-y-3">
              {DEFAULT_CRITERIA.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-40 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {c.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 w-10">
                    {c.weight}%
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={formScores[c.name]}
                    onChange={(e) =>
                      setFormScores((prev) => ({
                        ...prev,
                        [c.name]: Number(e.target.value),
                      }))
                    }
                    className="flex-1 h-1.5 accent-emerald-500"
                  />
                  <span className="w-8 text-center text-xs font-mono font-bold text-slate-700 dark:text-zinc-200">
                    {formScores[c.name]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                Komentar
              </label>
              <textarea
                rows={3}
                placeholder="Catatan penilaian..."
                value={formComments}
                onChange={(e) => setFormComments(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium resize-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                Target (koma-dipisah)
              </label>
              <textarea
                rows={3}
                placeholder="Target 1, Target 2, Target 3"
                value={formGoals}
                onChange={(e) => setFormGoals(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium resize-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Simpan Penilaian
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Review History */}
      {selectedEmp && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 flex justify-between items-center">
            <h3 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
              Riwayat Penilaian — {selectedEmp.name}
            </h3>
            <div className="flex items-center gap-3">
              {reviews.length > 0 && (
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Rata-rata: {avgScore.toFixed(1)}
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                {reviews.length} penilaian
              </span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">
                Belum ada penilaian kinerja untuk karyawan ini.
              </p>
              <p className="text-[10px] text-slate-300 dark:text-zinc-600 mt-1">
                Klik "Buat Penilaian Baru" untuk menambahkan penilaian.
              </p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {reviews
                .slice()
                .reverse()
                .map((review) => (
                  <div
                    key={review.id}
                    className="border border-slate-100 dark:border-zinc-800 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded text-[10px] font-bold font-mono text-slate-600 dark:text-zinc-300">
                          {review.period}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getScoreColor(review.overallScore)} text-white`}
                        >
                          {review.overallScore.toFixed(1)} — {getScoreLabel(review.overallScore)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                        {new Date(review.reviewDate).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        {" · "}
                        {review.reviewedBy}
                      </span>
                    </div>

                    {/* Criteria Bars */}
                    <div className="space-y-2 mb-3">
                      {review.criteria.map((c) => (
                        <div key={c.name} className="flex items-center gap-2">
                          <span className="w-32 text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            {c.name}
                          </span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getScoreColor(c.score)} transition-all`}
                              style={{ width: `${(c.score / 10) * 100}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-[10px] font-mono font-bold text-slate-700 dark:text-zinc-300">
                            {c.score}/10
                          </span>
                        </div>
                      ))}
                    </div>

                    {review.comments && (
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 italic mb-2">
                        "{review.comments}"
                      </p>
                    )}
                    {review.goals && review.goals.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {review.goals.map((g, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded text-[9px] font-medium"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Performance Trend */}
      {selectedEmp && reviews.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
              Tren Kinerja
            </h3>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-2 h-32">
              {reviews.map((review, i) => (
                <div key={review.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono font-bold text-slate-600 dark:text-zinc-300">
                    {review.overallScore.toFixed(1)}
                  </span>
                  <div
                    className={`w-full rounded-t ${getScoreColor(review.overallScore)} transition-all`}
                    style={{
                      height: `${(review.overallScore / 10) * 100}%`,
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-[8px] font-mono text-slate-400 dark:text-zinc-500 truncate w-full text-center">
                    {review.period}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
              Leaderboard Kinerja
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono dark:bg-zinc-900 dark:text-zinc-500">
                <tr>
                  <th className="px-4 py-3 w-12">Rank</th>
                  <th className="px-4 py-3">Karyawan</th>
                  <th className="px-4 py-3">Posisi</th>
                  <th className="px-4 py-3 text-right">Skor Rata-rata</th>
                  <th className="px-4 py-3 text-right">Jumlah Penilaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {leaderboard.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`font-extrabold font-mono text-sm ${
                          i < 3 ? medalColors[i] : "text-slate-400 dark:text-zinc-500"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-zinc-200">
                      {entry.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-400">
                      {entry.position}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${getScoreColor(entry.avg)} text-white`}
                      >
                        {entry.avg.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400 dark:text-zinc-500">
                      {entry.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
