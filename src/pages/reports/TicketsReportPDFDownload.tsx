import { PDFDownloadLink } from "@react-pdf/renderer";
import { TicketsReportPDF } from "./TicketsReportPDF";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  tickets: {
    id: string;
    service_date: string;
    requester_name: string;
    billed_hours: number;
    description: string;
  }[];
  contractedHours?: number;
}

export default function TicketsReportPDFDownload({
  clientName,
  periodStart,
  periodEnd,
  tickets,
  contractedHours,
}: Props) {
  return (
    <PDFDownloadLink
      document={
        <TicketsReportPDF
          clientName={clientName}
          periodStart={periodStart}
          periodEnd={periodEnd}
          tickets={tickets}
          contractedHours={contractedHours}
        />
      }
      fileName={`relatorio-atendimentos-${periodStart || "inicio"}-${periodEnd || "fim"}.pdf`}
    >
      {({ loading }) => (
        <Button
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10"
          disabled={loading}
        >
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Gerando..." : "Baixar PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
