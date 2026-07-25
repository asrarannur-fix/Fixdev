import * as React from 'react';
import { useSaaS } from '../../../context/SaaSContext';
import { PlusCircle, Trash2, Clock } from 'lucide-react';

export const ShiftManagement: React.FC<{ activeSubTab: string }> = ({ activeSubTab }) => {
  const { workShifts, addWorkShift, deleteWorkShift, currentTenantId, currentBranchId } = useSaaS();
  const [name, setName] = React.useState('');
  const [startTime, setStartTime] = React.useState('08:00');
  const [endTime, setEndTime] = React.useState('17:00');
  const [lat, setLat] = React.useState('');
  const [lng, setLng] = React.useState('');
  const [radius, setRadius] = React.useState('100');

  if (activeSubTab !== 'shifts') return null;

  const tenantShifts = workShifts.filter(
    (s) => s.tenantId === currentTenantId && (!s.branchId || s.branchId === currentBranchId)
  );

  const handleAdd = () => {
    if (!name.trim()) return;
    addWorkShift({
      name: name.trim(),
      startTime,
      endTime,
      branchId: currentBranchId,
      latitude: lat ? Number(lat) : 0,
      longitude: lng ? Number(lng) : 0,
      radius: radius ? Number(radius) : 100,
    });
    setName('');
    setLat('');
    setLng('');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="font-bold text-lg text-slate-900 mb-1">Manajemen Shift Kerja</h3>
      <p className="text-xs text-slate-500 mb-4">
        Definisikan shift dan lokasi GPS valid untuk presensi staff.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <input
          placeholder="Nama shift (mis. Pagi)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Latitude (opsional)"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Longitude (opsional)"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Radius (m)"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <button
        onClick={handleAdd}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" /> Tambah Shift
      </button>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Nama</th>
              <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Mulai</th>
              <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Selesai</th>
              <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Radius</th>
              <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase"></th>
            </tr>
          </thead>
          <tbody>
            {tenantShifts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                  Belum ada shift. Tambah shift pertama di atas.
                </td>
              </tr>
            ) : (
              tenantShifts.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 text-xs font-semibold text-slate-700">{s.name}</td>
                  <td className="py-2 px-3 text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {s.startTime}
                  </td>
                  <td className="py-2 px-3 text-xs text-slate-600">{s.endTime}</td>
                  <td className="py-2 px-3 text-xs text-slate-600">{s.radius}m</td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => deleteWorkShift(s.id)}
                      className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[10px] font-bold"
                    >
                      <Trash2 className="w-3 h-3 inline" /> Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
