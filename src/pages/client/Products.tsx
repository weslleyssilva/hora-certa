import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCompetenceOptions, formatCompetence, getCurrentCompetence } from "@/lib/utils";

interface ProductData {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
}

export default function ClientProducts() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [competence, setCompetence] = useState(getCurrentCompetence());

  const competenceOptions = getCompetenceOptions(12);

  useEffect(() => {
    if (profile?.client_id) {
      loadProducts();
    }
  }, [profile?.client_id, competence]);

  const loadProducts = async () => {
    if (!profile?.client_id) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("products_used")
        .select("*")
        .eq("client_id", profile.client_id)
        .eq("competence_month", competence)
        .order("product_name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Produtos"
        description="Produtos e itens utilizados por mês"
      />

      {/* Seletor de Mês */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="max-w-xs">
            <Label htmlFor="competence">Mês de Competência</Label>
            <Select value={competence} onValueChange={setCompetence}>
              <SelectTrigger id="competence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {competenceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos de {formatCompetence(competence)}</CardTitle>
          <CardDescription>
            {products.length} produto(s) registrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageLoader />
          ) : products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.product_name}
                    </TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhum produto encontrado"
              description={`Não há produtos registrados para ${formatCompetence(competence)}.`}
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
