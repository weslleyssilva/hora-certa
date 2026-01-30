-- Remove the old constraint that requires billed_hours >= 1
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_billed_hours_check;

-- Add a new constraint that allows 0 for open/in_progress tickets
-- billed_hours must be >= 0 (0 for open tickets, >=1 for completed)
ALTER TABLE public.tickets ADD CONSTRAINT tickets_billed_hours_check 
CHECK (billed_hours >= 0);