BEGIN;
ALTER TABLE public.protocol_assignments ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS publication_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.protocol_assignments DROP CONSTRAINT IF EXISTS protocol_assignments_delegate_id_portal_match_id_key;
DROP INDEX IF EXISTS public.protocol_one_active_match;
CREATE UNIQUE INDEX protocol_unique_unarchived_delegate_match ON public.protocol_assignments(delegate_id,portal_match_id) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX protocol_one_active_match ON public.protocol_assignments(portal_match_id) WHERE archived_at IS NULL AND state IN ('pending','accepted');
CREATE OR REPLACE FUNCTION public.protocol_check_active_delegate() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE enabled boolean;
BEGIN
 SELECT active INTO enabled FROM public.protocol_delegates WHERE id=NEW.delegate_id FOR SHARE;
 IF enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'Delegate not active' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protocol_require_active_delegate BEFORE INSERT OR UPDATE OF delegate_id ON public.protocol_assignments FOR EACH ROW EXECUTE FUNCTION public.protocol_check_active_delegate();
CREATE OR REPLACE FUNCTION public.protocol_deactivate_delegate(p_delegate_id uuid) RETURNS boolean LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 PERFORM 1 FROM public.protocol_delegates WHERE id=p_delegate_id AND active=true FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.protocol_assignments WHERE delegate_id=p_delegate_id AND archived_at IS NULL) THEN RAISE EXCEPTION 'Delegate has assignments' USING ERRCODE='P0001'; END IF;
 UPDATE public.protocol_delegates SET active=false WHERE id=p_delegate_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.protocol_deactivate_delegate(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protocol_deactivate_delegate(uuid) TO service_role;
COMMIT;
