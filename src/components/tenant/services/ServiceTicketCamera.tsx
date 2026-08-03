import * as React from 'react';
import { Camera, Upload } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  category: string;
  timestamp: string;
}

interface ServiceTicketCameraProps {
  ticket: any;
  cameraActive: boolean;
  startCamera: () => void;
  stopCamera: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  onCapture: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
}

const photoSrc = (ticketId: string, value: string) => value.startsWith('blob:') || value.startsWith('data:') || value.startsWith('http') || value.startsWith('/')
  ? value
  : `/api/services/${encodeURIComponent(ticketId)}/photos/${encodeURIComponent(value.split('/').pop() || '')}`;

export const ServiceTicketCamera: React.FC<ServiceTicketCameraProps> = ({
  ticket,
  cameraActive,
  startCamera,
  stopCamera,
  videoRef,
  onCapture,
  onUpload,
}) => {
  const capturedConditions: Photo[] | undefined = ticket?.capturedConditions;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const capture = async () => {
    setPending(true);
    setError('');
    try {
      await onCapture();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mengunggah foto.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-2 shadow-xs">
      <h4 id={`service-camera-${ticket?.id || 'ticket'}`} className="font-bold text-xs text-slate-500 uppercase font-mono tracking-wider flex items-center justify-between">
        <span>Foto ({capturedConditions?.length || 0})</span>
        <span className="text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1 py-0.5 rounded-md">
          Live Capture
        </span>
      </h4>

      {capturedConditions && capturedConditions.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
          {capturedConditions.map((cap) => (
            <div
              key={cap.id}
              className="relative rounded-lg overflow-hidden border border-slate-200 h-16 group bg-slate-900"
            >
              {cap.url && <img src={photoSrc(ticket.id, cap.url)} alt={cap.category} className="w-full h-full object-cover" />}
              <div className="absolute inset-x-0 bottom-0 bg-black/75 p-0.5 flex items-center justify-between">
                <span className="text-[7px] font-mono font-bold text-white uppercase truncate max-w-[50px]">
                  {cap.category}
                </span>
                <span className="text-[6.5px] font-mono text-slate-300">{cap.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic text-center">
          Belum ada foto rekam kondisi terlampir.
        </p>
      )}

      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      {/* Live Workstation Camera Trigger */}
      {cameraActive ? (
        <div className="border border-indigo-100 rounded-lg p-2 bg-slate-900 space-y-2" aria-labelledby={`service-camera-${ticket?.id || 'ticket'}`}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            aria-label="Pratinjau kamera"
            className="w-full aspect-video max-h-64 object-cover bg-black rounded"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => void capture()}
              disabled={pending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1 rounded cursor-pointer"
            >
              Jepret
            </button>
            <button
              type="button"
              onClick={stopCamera}
              aria-label="Tutup kamera"
              className="bg-slate-700 text-white text-xs font-bold px-2 py-1 rounded cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={startCamera}
            className="bg-slate-50 border border-dashed border-slate-200 hover:bg-accent-lighter text-[10.5px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-accent cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" /> Ambil Foto
          </button>
          <label className="bg-slate-50 border border-dashed border-slate-200 hover:bg-accent-lighter text-[10.5px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-accent cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Pilih Foto
            <input
              type="file"
              accept="image/jpeg,image/png"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void onUpload(file).catch((cause) => setError(cause instanceof Error ? cause.message : 'Gagal mengunggah foto.'));
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
};
