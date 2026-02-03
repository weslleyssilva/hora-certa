import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaLabel: {
    fontWeight: "bold",
    width: 80,
  },
  metaValue: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    backgroundColor: "#f3f4f6",
    padding: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 10,
  },
  summaryItem: {
    width: "22%",
  },
  summaryLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  colDate: {
    width: "15%",
  },
  colRequester: {
    width: "20%",
  },
  colHours: {
    width: "10%",
    textAlign: "center",
  },
  colDescription: {
    width: "55%",
  },
  headerCell: {
    fontWeight: "bold",
    fontSize: 9,
  },
  cell: {
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  positiveBalance: {
    color: "#059669",
  },
  negativeBalance: {
    color: "#dc2626",
  },
});

interface TicketData {
  id: string;
  service_date: string;
  requester_name: string;
  billed_hours: number;
  description: string;
}

interface TicketsReportPDFProps {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  tickets: TicketData[];
  contractedHours?: number;
}

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function formatHours(hours: number): string {
  return `${hours}h`;
}

export function TicketsReportPDF({
  clientName,
  periodStart,
  periodEnd,
  tickets,
  contractedHours,
}: TicketsReportPDFProps) {
  const totalTickets = tickets.length;
  const totalHours = tickets.reduce((sum, t) => sum + t.billed_hours, 0);
  const remainingHours = contractedHours ? Math.max(0, contractedHours - totalHours) : null;
  const emissionDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RELATÓRIO DE ATENDIMENTOS</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Cliente:</Text>
            <Text style={styles.metaValue}>{clientName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Período:</Text>
            <Text style={styles.metaValue}>
              {formatDate(periodStart)} - {formatDate(periodEnd)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Emissão:</Text>
            <Text style={styles.metaValue}>{emissionDate}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESUMO</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total de Atendimentos</Text>
              <Text style={styles.summaryValue}>{totalTickets}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Horas Consumidas</Text>
              <Text style={styles.summaryValue}>{formatHours(totalHours)}</Text>
            </View>
            {contractedHours !== undefined && (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Horas Contratadas</Text>
                  <Text style={styles.summaryValue}>
                    {formatHours(contractedHours)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Saldo</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      remainingHours !== null && remainingHours <= 0
                        ? styles.negativeBalance
                        : styles.positiveBalance,
                    ]}
                  >
                    {formatHours(remainingHours || 0)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Tickets Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ATENDIMENTOS</Text>
          {tickets.length > 0 ? (
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.colDate]}>Data</Text>
                <Text style={[styles.headerCell, styles.colRequester]}>
                  Solicitante
                </Text>
                <Text style={[styles.headerCell, styles.colHours]}>Horas</Text>
                <Text style={[styles.headerCell, styles.colDescription]}>
                  Descrição
                </Text>
              </View>

              {/* Table Rows */}
              {tickets.map((ticket) => (
                <View key={ticket.id} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.colDate]}>
                    {formatDate(ticket.service_date)}
                  </Text>
                  <Text style={[styles.cell, styles.colRequester]}>
                    {ticket.requester_name}
                  </Text>
                  <Text style={[styles.cell, styles.colHours]}>
                    {formatHours(ticket.billed_hours)}
                  </Text>
                  <Text style={[styles.cell, styles.colDescription]}>
                    {ticket.description.length > 100
                      ? ticket.description.substring(0, 100) + "..."
                      : ticket.description}
                  </Text>
                </View>
              ))}

              {/* Total Row */}
              <View style={[styles.tableRow, { backgroundColor: "#f3f4f6" }]}>
                <Text style={[styles.headerCell, styles.colDate]}>Total</Text>
                <Text style={[styles.cell, styles.colRequester]}></Text>
                <Text style={[styles.headerCell, styles.colHours]}>
                  {formatHours(totalHours)}
                </Text>
                <Text style={[styles.cell, styles.colDescription]}></Text>
              </View>
            </View>
          ) : (
            <Text style={{ textAlign: "center", padding: 20, color: "#6b7280" }}>
              Nenhum atendimento encontrado no período selecionado.
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Relatório gerado automaticamente pelo sistema
        </Text>
      </Page>
    </Document>
  );
}
