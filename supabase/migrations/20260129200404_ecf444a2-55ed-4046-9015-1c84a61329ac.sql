-- Criar enum para status de ticket
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'completed');

-- Adicionar coluna status aos tickets
ALTER TABLE public.tickets 
ADD COLUMN status public.ticket_status NOT NULL DEFAULT 'completed';

-- Adicionar coluna para título do chamado (para chamados abertos pelo cliente)
ALTER TABLE public.tickets 
ADD COLUMN title TEXT;

-- Criar política para permitir que clientes criem seus próprios chamados
CREATE POLICY "Client users can create their own tickets" 
ON public.tickets 
FOR INSERT 
WITH CHECK (client_id = get_user_client_id(auth.uid()));

-- Criar política para permitir que clientes atualizem apenas título e descrição de chamados abertos
CREATE POLICY "Client users can update their open tickets" 
ON public.tickets 
FOR UPDATE 
USING (
  client_id = get_user_client_id(auth.uid()) 
  AND status = 'open'
  AND created_by_user_id = auth.uid()
)
WITH CHECK (
  client_id = get_user_client_id(auth.uid()) 
  AND status = 'open'
);