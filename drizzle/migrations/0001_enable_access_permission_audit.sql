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
BEGIN
  _user_id := COALESCE(NEW.access_user_id, OLD.access_user_id);
  _directory_id := COALESCE(NEW.directory_id, OLD.directory_id);
  SELECT name INTO _user_name FROM public.access_users WHERE id = _user_id;
  SELECT name INTO _directory_name FROM public.access_directories WHERE id = _directory_id;

  INSERT INTO public.access_audit_logs (
    access_user_id, directory_id, user_name, directory_name, action,
    previous_read_status, previous_write_status, new_read_status, new_write_status, changed_by
  ) VALUES (
    _user_id, _directory_id, COALESCE(_user_name, 'Colaborador removido'), COALESCE(_directory_name, 'Diretório removido'), TG_OP,
    OLD.read_status, OLD.write_status, NEW.read_status, NEW.write_status, auth.uid()
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_access_permission_changes
AFTER INSERT OR UPDATE OR DELETE ON public.access_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_access_permission_change();