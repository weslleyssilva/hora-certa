ALTER TABLE public.access_audit_logs ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
UPDATE public.access_audit_logs log SET client_id = COALESCE(u.client_id, d.client_id)
FROM public.access_users u, public.access_directories d
WHERE log.access_user_id = u.id AND log.directory_id = d.id AND log.client_id IS NULL;
CREATE INDEX access_audit_logs_client_idx ON public.access_audit_logs(client_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_access_permission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _directory_id uuid;
  _user_name text;
  _directory_name text;
  _client_id uuid;
BEGIN
  _user_id := COALESCE(NEW.access_user_id, OLD.access_user_id);
  _directory_id := COALESCE(NEW.directory_id, OLD.directory_id);
  SELECT name, client_id INTO _user_name, _client_id FROM public.access_users WHERE id = _user_id;
  SELECT name INTO _directory_name FROM public.access_directories WHERE id = _directory_id;
  IF _client_id IS NULL THEN
    SELECT client_id INTO _client_id FROM public.access_directories WHERE id = _directory_id;
  END IF;

  INSERT INTO public.access_audit_logs (
    client_id, access_user_id, directory_id, user_name, directory_name, action,
    previous_read_status, previous_write_status, new_read_status, new_write_status, changed_by
  ) VALUES (
    _client_id, _user_id, _directory_id, COALESCE(_user_name, 'Colaborador removido'), COALESCE(_directory_name, 'Diretório removido'), TG_OP,
    OLD.read_status, OLD.write_status, NEW.read_status, NEW.write_status, auth.uid()
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;