-- Add recurring contract fields
ALTER TABLE public.contracts 
ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
ADD COLUMN recurrence_months integer NOT NULL DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.contracts.is_recurring IS 'Whether this contract should automatically renew when expired';
COMMENT ON COLUMN public.contracts.recurrence_months IS 'Number of months for each renewal period (default: 1 = monthly)';