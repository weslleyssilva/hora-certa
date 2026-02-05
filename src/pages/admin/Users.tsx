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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRoleLabel } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { USER_ROLES, AppRole } from "@/lib/constants";
 import { userCreateSchema, userUpdateSchema, getValidationError } from "@/lib/validations";

interface Profile {
  id: string;
  email: string;
  role: AppRole;
  client_id: string | null;
  clients?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

export default function AdminUsers() {
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: USER_ROLES.CLIENT_USER as AppRole,
    client_id: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profilesRes, clientsRes] = await Promise.all([
        supabase.from("profiles").select("*, clients(name)").order("email"),
        supabase.from("clients").select("id, name").eq("status", "active").order("name"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setProfiles(profilesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingProfile(null);
    setFormData({
      email: "",
      password: "",
      role: USER_ROLES.CLIENT_USER,
      client_id: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      email: profile.email,
      password: "",
      role: profile.role,
      client_id: profile.client_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
     // Validation
     if (editingProfile) {
       const result = userUpdateSchema.safeParse({
         role: formData.role,
         client_id: formData.role === USER_ROLES.CLIENT_USER ? formData.client_id : null,
       });
       const error = getValidationError(result);
       if (error) {
         toast({ title: error, variant: "destructive" });
         return;
       }
     } else {
       const result = userCreateSchema.safeParse({
         email: formData.email.trim(),
         password: formData.password,
         role: formData.role,
         client_id: formData.role === USER_ROLES.CLIENT_USER ? formData.client_id : null,
       });
       const error = getValidationError(result);
       if (error) {
         toast({ title: error, variant: "destructive" });
         return;
       }
     }

    setIsSaving(true);
    try {
      if (editingProfile) {
        // Atualizar profile existente
        const { error } = await supabase
          .from("profiles")
          .update({
            role: formData.role,
            client_id: formData.role === USER_ROLES.CLIENT_USER ? formData.client_id : null,
          })
          .eq("id", editingProfile.id);
        
        if (error) throw error;

        // Atualizar role na tabela user_roles
        await supabase.from("user_roles").delete().eq("user_id", editingProfile.id);
        await supabase.from("user_roles").insert({ user_id: editingProfile.id, role: formData.role });

        toast({ title: "Usuário atualizado com sucesso" });
      } else {
         // Criar novo usuário via edge function segura
         const { data, error } = await supabase.functions.invoke("admin-create-user", {
           body: {
             email: formData.email.trim(),
             password: formData.password,
             role: formData.role,
             client_id: formData.role === USER_ROLES.CLIENT_USER ? formData.client_id : null,
           },
        });

         if (error) {
           throw new Error(error.message || "Erro ao criar usuário");
         }
 
         if (data?.error) {
           throw new Error(data.error);
        }

        toast({ title: "Usuário criado com sucesso" });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving user:", error);
      if (error.message?.includes("already registered")) {
        toast({ title: "Este email já está cadastrado", variant: "destructive" });
      } else {
        toast({ title: "Erro ao salvar usuário", variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    toast({ title: "Exclusão de usuários requer acesso ao painel de administração", variant: "destructive" });
  };

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title="Usuários"
        description="Gerenciar usuários do sistema"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProfile ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
              <DialogDescription>
                {editingProfile ? "Atualize as informações do usuário" : "Preencha os dados do novo usuário"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  disabled={!!editingProfile}
                />
              </div>
              {!editingProfile && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: AppRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={USER_ROLES.ADMIN}>Administrador</SelectItem>
                    <SelectItem value={USER_ROLES.CLIENT_USER}>Usuário Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.role === USER_ROLES.CLIENT_USER && (
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.email}</TableCell>
                    <TableCell>
                      <StatusBadge status={profile.role === USER_ROLES.ADMIN ? "active" : "inactive"}>
                        {getRoleLabel(profile.role)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>{profile.clients?.name || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(profile)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhum usuário cadastrado"
              description="Adicione seu primeiro usuário para começar."
              action={
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
