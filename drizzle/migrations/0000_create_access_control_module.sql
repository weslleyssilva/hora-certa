CREATE TYPE public.access_permission_status AS ENUM ('granted', 'denied', 'limited', 'undefined');

CREATE TABLE public.access_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  department text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  user_id uuid UNIQUE,
  is_quality_manager boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_users_name_length CHECK (char_length(name) BETWEEN 1 AND 255),
  CONSTRAINT access_users_department_length CHECK (department IS NULL OR char_length(department) <= 255),
  CONSTRAINT access_users_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
  UNIQUE (client_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_users TO authenticated;
GRANT ALL ON public.access_users TO service_role;
ALTER TABLE public.access_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.access_directories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.access_directories(id) ON DELETE SET NULL,
  notes text,
  active boolean NOT NULL DEFAULT true,
  is_quality_only boolean NOT NULL DEFAULT false,
  source_sheet text,
  source_row integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_directories_name_length CHECK (char_length(name) BETWEEN 1 AND 255),
  CONSTRAINT access_directories_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
  CONSTRAINT access_directories_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id),
  UNIQUE (client_id, parent_id, name)
);
CREATE UNIQUE INDEX access_directories_root_name_unique ON public.access_directories (client_id, name) WHERE parent_id IS NULL;
CREATE INDEX access_directories_parent_idx ON public.access_directories(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_directories TO authenticated;
GRANT ALL ON public.access_directories TO service_role;
ALTER TABLE public.access_directories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.access_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_user_id uuid NOT NULL REFERENCES public.access_users(id) ON DELETE CASCADE,
  directory_id uuid NOT NULL REFERENCES public.access_directories(id) ON DELETE CASCADE,
  read_status public.access_permission_status NOT NULL DEFAULT 'undefined',
  write_status public.access_permission_status NOT NULL DEFAULT 'undefined',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (access_user_id, directory_id),
  CONSTRAINT access_permissions_write_requires_read CHECK (write_status <> 'granted' OR read_status IN ('granted', 'limited'))
);
CREATE INDEX access_permissions_directory_idx ON public.access_permissions(directory_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_permissions TO authenticated;
GRANT ALL ON public.access_permissions TO service_role;
ALTER TABLE public.access_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.access_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_id uuid NOT NULL REFERENCES public.access_permissions(id) ON DELETE CASCADE,
  path text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_scopes_path_length CHECK (char_length(path) BETWEEN 1 AND 1000),
  CONSTRAINT access_scopes_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
  UNIQUE (permission_id, path)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_scopes TO authenticated;
GRANT ALL ON public.access_scopes TO service_role;
ALTER TABLE public.access_scopes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.access_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_user_id uuid REFERENCES public.access_users(id) ON DELETE SET NULL,
  directory_id uuid REFERENCES public.access_directories(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  directory_name text NOT NULL,
  action text NOT NULL,
  previous_read_status public.access_permission_status,
  previous_write_status public.access_permission_status,
  new_read_status public.access_permission_status,
  new_write_status public.access_permission_status,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_audit_logs_changed_at_idx ON public.access_audit_logs(changed_at DESC);
GRANT SELECT ON public.access_audit_logs TO authenticated;
GRANT ALL ON public.access_audit_logs TO service_role;
ALTER TABLE public.access_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_access_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.access_users WHERE user_id = auth.uid() AND active = true LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_read_directory(_directory_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.access_directories d
    JOIN public.access_permissions p ON p.directory_id = d.id
    JOIN public.access_users u ON u.id = p.access_user_id
    WHERE d.id = _directory_id
      AND d.active = true
      AND d.client_id = u.client_id
      AND u.user_id = auth.uid()
      AND u.active = true
      AND (p.read_status IN ('granted', 'limited') OR p.write_status IN ('granted', 'limited'))
      AND (NOT d.is_quality_only OR u.is_quality_manager)
  )
$$;

CREATE POLICY "Admins manage access collaborators" ON public.access_users
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Users view own access collaborator" ON public.access_users
FOR SELECT TO authenticated USING (id = public.current_access_user_id());

CREATE POLICY "Admins manage access directories" ON public.access_directories
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Users view authorized directories" ON public.access_directories
FOR SELECT TO authenticated USING (public.can_read_directory(id));

CREATE POLICY "Admins manage access permissions" ON public.access_permissions
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Users view own authorized permissions" ON public.access_permissions
FOR SELECT TO authenticated USING (access_user_id = public.current_access_user_id() AND public.can_read_directory(directory_id));

CREATE POLICY "Admins manage access scopes" ON public.access_scopes
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Users view own authorized scopes" ON public.access_scopes
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.access_permissions p
    WHERE p.id = permission_id
      AND p.access_user_id = public.current_access_user_id()
      AND public.can_read_directory(p.directory_id)
  )
);

CREATE POLICY "Admins view access audit logs" ON public.access_audit_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

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
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_permission(
  p_access_user_id uuid,
  p_directory_id uuid,
  p_read_status public.access_permission_status,
  p_write_status public.access_permission_status,
  p_scope_notes text DEFAULT NULL,
  p_scope_paths text[] DEFAULT ARRAY[]::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _permission_id uuid;
  _user_client_id uuid;
  _directory_client_id uuid;
  _path text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar permissões';
  END IF;
  SELECT client_id INTO _user_client_id FROM public.access_users WHERE id = p_access_user_id;
  SELECT client_id INTO _directory_client_id FROM public.access_directories WHERE id = p_directory_id;
  IF _user_client_id IS NULL OR _directory_client_id IS NULL OR _user_client_id <> _directory_client_id THEN
    RAISE EXCEPTION 'Colaborador e diretório devem pertencer ao mesmo cliente';
  END IF;
  IF p_write_status = 'granted' AND p_read_status NOT IN ('granted', 'limited') THEN
    RAISE EXCEPTION 'Alteração exige permissão de leitura';
  END IF;
  IF (p_read_status = 'limited' OR p_write_status = 'limited') AND COALESCE(array_length(p_scope_paths, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos uma pasta ou subpasta para acesso limitado';
  END IF;
  IF p_scope_notes IS NOT NULL AND char_length(p_scope_notes) > 2000 THEN
    RAISE EXCEPTION 'Observação do escopo excede 2000 caracteres';
  END IF;

  INSERT INTO public.access_permissions (access_user_id, directory_id, read_status, write_status)
  VALUES (p_access_user_id, p_directory_id, p_read_status, p_write_status)
  ON CONFLICT (access_user_id, directory_id)
  DO UPDATE SET read_status = EXCLUDED.read_status, write_status = EXCLUDED.write_status, updated_at = now()
  RETURNING id INTO _permission_id;

  DELETE FROM public.access_scopes WHERE permission_id = _permission_id;
  IF p_read_status = 'limited' OR p_write_status = 'limited' THEN
    FOREACH _path IN ARRAY p_scope_paths LOOP
      IF char_length(trim(_path)) NOT BETWEEN 1 AND 1000 THEN
        RAISE EXCEPTION 'Cada caminho deve ter entre 1 e 1000 caracteres';
      END IF;
      INSERT INTO public.access_scopes (permission_id, path, notes) VALUES (_permission_id, trim(_path), p_scope_notes);
    END LOOP;
  END IF;
  RETURN _permission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_batch_save_permissions(p_changes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _change jsonb;
  _paths text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar permissões';
  END IF;
  IF jsonb_typeof(p_changes) <> 'array' OR jsonb_array_length(p_changes) = 0 OR jsonb_array_length(p_changes) > 1000 THEN
    RAISE EXCEPTION 'O lote deve conter entre 1 e 1000 alterações';
  END IF;
  FOR _change IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
    SELECT COALESCE(array_agg(value), ARRAY[]::text[]) INTO _paths
    FROM jsonb_array_elements_text(COALESCE(_change->'scope_paths', '[]'::jsonb));
    PERFORM public.admin_save_permission(
      (_change->>'access_user_id')::uuid,
      (_change->>'directory_id')::uuid,
      (_change->>'read_status')::public.access_permission_status,
      (_change->>'write_status')::public.access_permission_status,
      _change->>'scope_notes',
      _paths
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_permission(uuid, uuid, public.access_permission_status, public.access_permission_status, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_batch_save_permissions(jsonb) TO authenticated;

CREATE TRIGGER update_access_users_updated_at BEFORE UPDATE ON public.access_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_access_directories_updated_at BEFORE UPDATE ON public.access_directories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_access_permissions_updated_at BEFORE UPDATE ON public.access_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_access_scopes_updated_at BEFORE UPDATE ON public.access_scopes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();