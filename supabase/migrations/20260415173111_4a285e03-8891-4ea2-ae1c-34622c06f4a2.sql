
-- Machines table
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  usuario TEXT,
  setor TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all machines" ON public.machines
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Client users can view their machines" ON public.machines
  FOR SELECT USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Client users can manage their machines" ON public.machines
  FOR ALL USING (client_id = public.get_user_client_id(auth.uid()));

CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Diagnostics table
CREATE TABLE public.diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('OK', 'Atenção', 'Crítico')) DEFAULT 'OK',
  problemas TEXT,
  recomendacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all diagnostics" ON public.diagnostics
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Client users can view their diagnostics" ON public.diagnostics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = maquina_id AND m.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Client users can manage their diagnostics" ON public.diagnostics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = maquina_id AND m.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE TRIGGER update_diagnostics_updated_at
  BEFORE UPDATE ON public.diagnostics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tests table
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostico_id UUID NOT NULL REFERENCES public.diagnostics(id) ON DELETE CASCADE,
  disco_ok BOOLEAN NOT NULL DEFAULT false,
  ram_ok BOOLEAN NOT NULL DEFAULT false,
  sistema_ok BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all tests" ON public.tests
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Client users can view their tests" ON public.tests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.diagnostics d
      JOIN public.machines m ON m.id = d.maquina_id
      WHERE d.id = diagnostico_id AND m.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Client users can manage their tests" ON public.tests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.diagnostics d
      JOIN public.machines m ON m.id = d.maquina_id
      WHERE d.id = diagnostico_id AND m.client_id = public.get_user_client_id(auth.uid())
    )
  );
