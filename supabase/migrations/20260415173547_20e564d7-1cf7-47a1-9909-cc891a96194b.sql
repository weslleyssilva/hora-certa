
-- Add hardware fields to machines
ALTER TABLE public.machines ADD COLUMN processador TEXT;
ALTER TABLE public.machines ADD COLUMN ram_gb INTEGER;
ALTER TABLE public.machines ADD COLUMN armazenamento_gb INTEGER;
ALTER TABLE public.machines ADD COLUMN tipo_disco TEXT;
ALTER TABLE public.machines ADD COLUMN sistema_operacional TEXT;

-- Add extra test fields
ALTER TABLE public.tests ADD COLUMN temperatura TEXT CHECK (temperatura IN ('Normal', 'Alta', 'Crítica'));
ALTER TABLE public.tests ADD COLUMN antivirus BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tests ADD COLUMN atualizacoes BOOLEAN NOT NULL DEFAULT false;
