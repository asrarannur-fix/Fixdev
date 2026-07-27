import * as React from 'react';
import { Cpu } from 'lucide-react';

interface ServiceTicketInfoProps {
  ticket: any;
  customer?: any;
  onTechChange: (techId: string) => void;
}

export const ServiceTicketInfo: React.FC<ServiceTicketInfoProps> = ({
  ticket,
  customer,
  onTechChange,
}) => {
  return (
    <div className="bg-white p-3 border border-slate-100 rounded-2xl space-y-2 shadow-xs">
      <div className="space-y-1.5 text-xs text-slate-600">
        <p>
          <span className="text-slate-400 font-mono text-[10px]">PELANGGAN:</span>{' '}
          <strong className="text-slate-800">{customer?.name || 'Umum'}</strong>
        </p>
        <p>
          <span className="text-slate-400 font-mono text-[10px]">PHONE:</span>{' '}
          <span className="font-mono">{customer?.phone || '-'}</span>
        </p>
        <p>
          <span className="text-slate-400 font-mono text-[10px]">TIPE UNIT:</span>{' '}
          <strong className="text-slate-700">{ticket.deviceName}</strong>
        </p>
        {ticket.deviceBrandModel && (
          <p>
            <span className="text-slate-400 font-mono text-[10px]">BRAND/MODEL:</span>{' '}
            <span>{ticket.deviceBrandModel}</span>
          </p>
        )}
        <p>
          <span className="text-slate-400 font-mono text-[10px]">SERIAL NO:</span>{' '}
          <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
            {ticket.deviceSerial || 'N/A'}
          </span>
        </p>
        <p>
          <span className="text-slate-400 font-mono text-[10px]">MASA GARANSI:</span>{' '}
          <span className="font-bold text-accent">{ticket.warrantyMonths} Bulan</span>
        </p>

        {ticket.deviceCategory && (
          <p>
            <span className="text-slate-400 font-mono text-[10px]">KATEGORI:</span>{' '}
            <strong className="text-slate-700">{ticket.deviceCategory}</strong>
          </p>
        )}
        {ticket.physicalCondition && (
          <p>
            <span className="text-slate-400 font-mono text-[10px]">KONDISI FISIK:</span>{' '}
            <strong className="text-slate-700">{ticket.physicalCondition}</strong>
          </p>
        )}

        {ticket.technician && (
          <p>
            <span className="text-slate-400 font-mono text-[10px]">TEKNISI:</span>{' '}
            <strong className="text-slate-700">{ticket.technician.name || ticket.technician}</strong>
          </p>
        )}

        {!ticket.technician && onTechChange && (
          <p>
            <span className="text-slate-400 font-mono text-[10px]">TEKNISI:</span>{' '}
            <select
              defaultValue=""
              onChange={(e) => onTechChange(e.target.value)}
              className="font-bold text-accent text-[10px] bg-transparent border border-slate-200 rounded px-1 py-0.5 focus:outline-none"
            >
              <option value="" disabled>Pilih Teknisi</option>
              <option value="tech1">Budi (Elektro)</option>
              <option value="tech2">Siti (Hardware)</option>
              <option value="tech3">Andi (Software)</option>
            </select>
          </p>
        )}

        {ticket.estimatedCompletionDate && (
          <p>
            <span className="text-slate-400 font-mono text-[10px]">EST. SELESAI:</span>{' '}
            <strong className="text-emerald-700">
              {new Date(ticket.estimatedCompletionDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </strong>
          </p>
        )}
      </div>
    </div>
  );
};
