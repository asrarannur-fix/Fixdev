import React from "react";
import { EmptyState } from "../../../ui/EmptyState";
import { Construction } from "lucide-react";

export const ComingSoonPanel: React.FC<{
  title?: string;
  description?: string;
}> = ({
  title = "Panel Dalam Pengembangan",
  description = "Fitur ini sedang disiapkan dan akan tersedia di pembaruan berikutnya.",
}) => (
  <div className="animate-fadeIn">
    <EmptyState
      icon={<Construction className="w-10 h-10" />}
      title={title}
      description={description}
    />
  </div>
);
