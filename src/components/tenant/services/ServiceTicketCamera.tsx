import * as React from 'react';
import { Camera } from 'lucide-react';

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
  onCapture: () => void;
  onDemo: () => void;
}

export const ServiceTicketCamera: React.FC<ServiceTicketCameraProps> = ({
  ticket,
  cameraActive,
  startCamera,
  stopCamera,
  videoRef,
  onCapture,
  onDemo,
}) => {
  const capturedConditions: Photo[] | undefined = ticket?.capturedConditions;

  return (
    <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-2 shadow-xs">
      <h4 className="font-bold text-[10px] text-slate-500 uppercase font-mono tracking-wider flex items-center justify-between">
        <span>Foto ({capturedConditions?.length || 0})</span>
        <span className="text-[8px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1 py-0.5 rounded-md">
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
              <img src={cap.url} alt={cap.category} className="w-full h-full object-cover" />
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
        <p className="text-[10px] text-slate-400 italic text-center">
          Belum ada foto rekam kondisi terlampir.
        </p>
      )}

      {/* Live Workstation Camera Trigger */}
      {cameraActive ? (
        <div className="border border-indigo-100 rounded-lg p-2 bg-slate-900 space-y-2">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-24 object-cover bg-black rounded"
          />
          <div className="flex gap-1.5">
            <button
              onClick={onCapture}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold py-1 rounded cursor-pointer"
            >
              Jepret
            </button>
            <button
              onClick={onDemo}
              className="bg-accent hover:bg-accent-hover text-white text-[9px] font-bold px-1.5 py-1 rounded cursor-pointer"
            >
              Demo
            </button>
            <button
              onClick={stopCamera}
              className="bg-slate-700 text-white text-[9px] font-bold px-1.5 py-1 rounded cursor-pointer"
            >
              X
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startCamera}
          className="w-full bg-slate-50 border border-dashed border-slate-200 hover:bg-accent-lighter text-[10.5px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-accent cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" /> Ambil Foto Kondisi Baru
        </button>
      )}
    </div>
  );
};
