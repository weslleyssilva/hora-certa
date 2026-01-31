import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCompetenceOptions, formatCompetence, getCurrentCompetence } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ProductData {
  id: string;
  client_id: string;
  competence_month: string;
  product_name: string;
  quantity: number;
  notes: string | null;
  clients?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

export default function AdminProducts() {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    competence_month: getCurrentCompetence(),
    product_name: "",
    quantity: "",
    notes: "",
  });
  const [filterClient, setFilterClient] = useState("");
  const [filterCompetence, setFilterCompetence] = useState(getCurrentCompetence());
  const [isSaving, setIsSaving] = useState(false);

  const competenceOptions = getCompetenceOptions(24);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, clientsRes] = await Promise.all([
        supabase.from("products_used").select("*, clients(name)").order("competence_month", { ascending: false }),
        supabase.from("clients").select("id, name").eq("status", "active").order("name"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setProducts(productsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      client_id: "",
      competence_month: getCurrentCompetence(),
      product_name: "",
      quantity: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: ProductData) => {
    setEditingProduct(product);
    setFormData({
      client_id: product.client_id,
      competence_month: product.competence_month,
      product_name: product.product_name,
      quantity: product.quantity.toString(),
      notes: product.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.client_id || !formData.competence_month || !formData.product_name || !formData.quantity) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({ title: "Quantidade deve ser maior que zero", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        client_id: formData.client_id,
        competence_month: formData.competence_month,
        product_name: formData.product_name,
        quantity,
        notes: formData.notes || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products_used")
          .update(data)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast({ title: "Produto atualizado com sucesso" });
      } else {
        const { error } = await supabase.from("products_used").insert(data);
        if (error) throw error;
        toast({ title: "Produto adicionado com sucesso" });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({ title: "Erro ao salvar produto", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("products_used").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Produto excluído com sucesso" });
      loadData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({ title: "Erro ao excluir produto", variant: "destructive" });
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesClient = !filterClient || p.client_id === filterClient;
    const matchesCompetence = !filterCompetence || p.competence_month === filterCompetence;
    return matchesClient && matchesCompetence;
  });

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title="Produtos"
        description="Gerenciar produtos utilizados por clientes"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              <DialogDescription>
                {editingProduct ? "Atualize as informações do produto" : "Adicione um novo produto utilizado"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="competence">Competência *</Label>
                <Select
                  value={formData.competence_month}
                  onValueChange={(value) => setFormData({ ...formData, competence_month: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {competenceOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_name">Nome do Produto *</Label>
                <Input
                  id="product_name"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="Ex: Licença Office 365"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Ex: 5"
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
                />
              </div>
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

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
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
            <div>
              <Label>Competência</Label>
              <Select
                value={filterCompetence || "all"}
                onValueChange={(value) => setFilterCompetence(value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {competenceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterClient("");
                  setFilterCompetence("");
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{formatCompetence(product.competence_month)}</TableCell>
                    <TableCell>{product.clients?.name || "N/A"}</TableCell>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{product.notes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(product)}
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
                              <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir "{product.product_name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(product.id)}
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
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhum produto encontrado"
              description="Adicione um produto para começar."
              action={
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Produto
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
