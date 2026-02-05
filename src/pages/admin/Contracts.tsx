import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";
 import { RefreshCw } from "lucide-react";
 import { Switch } from "@/components/ui/switch";
 import { supabase } from "@/integrations/supabase/client";
import { formatDate, isContractActive } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
 import { contractSchema, getValidationError } from "@/lib/validations";

interface Contract {
  id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  contracted_hours: number;
  notes: string | null;
   is_recurring: boolean;
   recurrence_months: number;
  clients?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

export default function AdminContracts() {
  const [isLoading, setIsLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    start_date: "",
    end_date: "",
    contracted_hours: "",
    notes: "",
     is_recurring: false,
     recurrence_months: "1",
  });
  const [filterClient, setFilterClient] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contractsRes, clientsRes] = await Promise.all([
        supabase.from("contracts").select("*, clients(name)").order("start_date", { ascending: false }),
        supabase.from("clients").select("id, name").eq("status", "active").order("name"),
      ]);

      if (contractsRes.error) throw contractsRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setContracts(contractsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingContract(null);
    setFormData({
      client_id: "",
      start_date: "",
      end_date: "",
      contracted_hours: "",
      notes: "",
       is_recurring: false,
       recurrence_months: "1",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      client_id: contract.client_id,
      start_date: contract.start_date,
      end_date: contract.end_date,
      contracted_hours: contract.contracted_hours.toString(),
      notes: contract.notes || "",
       is_recurring: contract.is_recurring,
       recurrence_months: contract.recurrence_months.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
     const hours = parseInt(formData.contracted_hours) || 0;
     const recurrenceMonths = parseInt(formData.recurrence_months) || 1;
 
     // Validation
     const result = contractSchema.safeParse({
       client_id: formData.client_id,
       start_date: formData.start_date,
       end_date: formData.end_date,
       contracted_hours: hours,
       notes: formData.notes.trim() || null,
       is_recurring: formData.is_recurring,
       recurrence_months: recurrenceMonths,
     });
     const error = getValidationError(result);
     if (error) {
       toast({ title: error, variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        client_id: formData.client_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        contracted_hours: hours,
         notes: formData.notes.trim() || null,
         is_recurring: formData.is_recurring,
          recurrence_months: recurrenceMonths,
      };

      if (editingContract) {
        const { error } = await supabase
          .from("contracts")
          .update(data)
          .eq("id", editingContract.id);
        if (error) throw error;
        toast({ title: "Contrato atualizado com sucesso" });
      } else {
        const { error } = await supabase.from("contracts").insert(data);
        if (error) throw error;
        toast({ title: "Contrato criado com sucesso" });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving contract:", error);
      toast({ title: "Erro ao salvar contrato", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Contrato excluído com sucesso" });
      loadData();
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast({ title: "Erro ao excluir contrato", variant: "destructive" });
    }
  };

  const getContractStatus = (start: string, end: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (today > endDate) return "expired";
    if (today < startDate) return "future";
    return "active";
  };

  const filteredContracts = filterClient
    ? contracts.filter((c) => c.client_id === filterClient)
    : contracts;

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title="Contratos"
        description="Gerenciar contratos de clientes"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingContract ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
              <DialogDescription>
                {editingContract ? "Atualize as informações do contrato" : "Preencha os dados do novo contrato"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data Fim</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contracted_hours">Horas Contratadas</Label>
                <Input
                  id="contracted_hours"
                  type="number"
                  min="0"
                  value={formData.contracted_hours}
                  onChange={(e) => setFormData({ ...formData, contracted_hours: e.target.value })}
                  placeholder="Ex: 40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações opcionais..."
                  rows={3}
                   maxLength={2000}
                />
              </div>
               <div className="flex items-center justify-between rounded-lg border p-4">
                 <div className="space-y-0.5">
                   <Label htmlFor="is_recurring">Contrato Recorrente</Label>
                   <p className="text-sm text-muted-foreground">
                     Renova automaticamente quando vencer
                   </p>
                 </div>
                 <Switch
                   id="is_recurring"
                   checked={formData.is_recurring}
                   onCheckedChange={(checked) =>
                     setFormData({ ...formData, is_recurring: checked })
                   }
                 />
               </div>
               {formData.is_recurring && (
                 <div className="space-y-2">
                   <Label htmlFor="recurrence_months">Período de Renovação</Label>
                   <Select
                     value={formData.recurrence_months}
                     onValueChange={(value) =>
                       setFormData({ ...formData, recurrence_months: value })
                     }
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="1">Mensal</SelectItem>
                       <SelectItem value="3">Trimestral</SelectItem>
                       <SelectItem value="6">Semestral</SelectItem>
                       <SelectItem value="12">Anual</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filtro */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="max-w-xs">
            <Label>Filtrar por Cliente</Label>
            <Select
              value={filterClient || "all"}
              onValueChange={(value) => setFilterClient(value === "all" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredContracts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Horas</TableHead>
                   <TableHead>Recorrência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const status = getContractStatus(contract.start_date, contract.end_date);
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {contract.clients?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                      </TableCell>
                      <TableCell>{contract.contracted_hours}h</TableCell>
                       <TableCell>
                         {contract.is_recurring ? (
                           <span className="inline-flex items-center gap-1 text-sm text-primary">
                             <RefreshCw className="h-3 w-3" />
                             {contract.recurrence_months === 1
                               ? "Mensal"
                               : contract.recurrence_months === 3
                               ? "Trimestral"
                               : contract.recurrence_months === 6
                               ? "Semestral"
                               : contract.recurrence_months === 12
                               ? "Anual"
                               : `${contract.recurrence_months} meses`}
                           </span>
                         ) : (
                           <span className="text-sm text-muted-foreground">—</span>
                         )}
                       </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            status === "active"
                              ? "active"
                              : status === "expired"
                              ? "inactive"
                              : "warning"
                          }
                        >
                          {status === "active" ? "Ativo" : status === "expired" ? "Vencido" : "Futuro"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(contract)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Contrato</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(contract.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhum contrato encontrado"
              description="Adicione um contrato para começar."
              action={
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Contrato
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
