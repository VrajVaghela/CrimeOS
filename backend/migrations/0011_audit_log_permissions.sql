
-- From Stage 1 Checkpoint 2
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crimeos_app') THEN
        EXECUTE 'REVOKE UPDATE, DELETE ON audit_log FROM crimeos_app';
    END IF;
END
$$;
