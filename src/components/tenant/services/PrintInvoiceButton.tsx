import React from 'react';
import { Button } from '../../ui/Button';
import { Printer } from 'lucide-react';

interface PrintInvoiceButtonProps {
  ticketId: string;
  hasInvoice?: boolean;
  onPrint?: (ticketId: string) => void;
}

export const PrintInvoiceButton: React.FC<PrintInvoiceButtonProps> = ({
  ticketId,
  hasInvoice = false,
  onPrint,
}) => {
  const handleClick = () => {
    if (onPrint) {
      onPrint(ticketId);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="gap-1"
      title="Cetak Invoice"
    >
      <Printer className="h-4 w-4" />
      Invoice
    </Button>
  );
};