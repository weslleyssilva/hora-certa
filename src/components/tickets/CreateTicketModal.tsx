import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { TICKET_STATUS, MIN_BILLED_HOURS } from "@/lib/constants";
import { calculateBilledHours } from "@/lib/utils";

const createTicketSchema = z.object({
  requester_name: z.string().min(1, "Nome do solicitante é obrigatório").max(100),
  service_date: z.string().min(1, "Data é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória").max(2000),
  duration_minutes: z.string().optional(),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

interface CreateTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateTicketModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateTicketModalProps) {
  const { profile, user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      requester_name: profile?.email || "",
      service_date: new Date().toISOString().split("T")[0],
      description: "",
      duration_minutes: "",
    },
  });

  const durationMinutes = watch("duration_minutes");
  const calculatedHours = durationMinutes
    ? calculateBilledHours(parseInt(durationMinutes) || 0)
    : 0;

  const onSubmit = async (data: CreateTicketFormData) => {
    if (!profile?.client_id || !user?.id) {
      toast({ title: "Erro de autenticação", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Calculate billed_hours: default to 0 for open tickets (admin will set on completion)
      // If duration_minutes is provided, calculate the hours for reference
      const billedHours = 0; // Open tickets start with 0, admin sets final value

      const { error } = await supabase.from("tickets").insert({
        client_id: profile.client_id,
        created_by_user_id: user.id,
        title: data.description.substring(0, 100),
        description: data.description,
        requester_name: data.requester_name,
        service_date: data.service_date,
        duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
        billed_hours: billedHours,
        status: TICKET_STATUS.OPEN,
      });

      if (error) throw error;

      toast({ title: "Chamado registrado com sucesso!" });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({ title: "Erro ao criar chamado", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Abrir Chamado</DialogTitle>
          <DialogDescription>
            Descreva sua solicitação. Nossa equipe irá atendê-lo em breve.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requester_name">Solicitante *</Label>
                <Input
                  id="requester_name"
                  {...register("requester_name")}
                  placeholder="Seu nome"
                />
                {errors.requester_name && (
                  <p className="text-sm text-destructive">
                    {errors.requester_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_date">Data *</Label>
                <Input
                  id="service_date"
                  type="date"
                  {...register("service_date")}
                />
                {errors.service_date && (
                  <p className="text-sm text-destructive">
                    {errors.service_date.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Descreva detalhadamente sua solicitação..."
                rows={6}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">
                Duração estimada (minutos) - opcional
              </Label>
              <Input
                id="duration_minutes"
                type="number"
                min="0"
                {...register("duration_minutes")}
                placeholder="Ex: 30"
              />
              {durationMinutes && parseInt(durationMinutes) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Horas estimadas: {calculatedHours}h (mínimo: {MIN_BILLED_HOURS}h)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Enviando..." : "Abrir Chamado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
