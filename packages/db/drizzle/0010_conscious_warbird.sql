CREATE TABLE "reference_counters" (
	"workspace_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "reference" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "reference" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "reference" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "reference_counters" ADD CONSTRAINT "reference_counters_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_counters_workspace_scope_idx" ON "reference_counters" USING btree ("workspace_id","scope");--> statement-breakpoint
-- Counters are transactional and survive record deletion. WS is reserved for unassigned records.
CREATE FUNCTION vitals_next_reference_number(w uuid, scope_name text) RETURNS integer
LANGUAGE sql AS $$
  INSERT INTO reference_counters(workspace_id, scope, value) VALUES (w, scope_name, 1)
  ON CONFLICT (workspace_id, scope) DO UPDATE SET value = reference_counters.value + 1
  RETURNING value;
$$;
--> statement-breakpoint
CREATE FUNCTION vitals_assign_project_key() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base text; candidate text; suffix integer := 1;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.key <> '' THEN
    NEW.key := OLD.key;
    RETURN NEW;
  END IF;
  base := left(regexp_replace(upper(NEW.name), '[^A-Z0-9]', '', 'g'), 8);
  IF base = '' OR base = 'WS' THEN base := 'PROJECT'; END IF;
  LOOP
    candidate := base || CASE WHEN suffix = 1 THEN '' ELSE suffix::text END;
    INSERT INTO reference_counters(workspace_id, scope, value)
      VALUES (NEW.workspace_id, 'key:' || candidate, 1) ON CONFLICT DO NOTHING;
    IF FOUND THEN EXIT; END IF;
    suffix := suffix + 1;
  END LOOP;
  NEW.key := candidate;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER projects_assign_key BEFORE INSERT OR UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION vitals_assign_project_key();
--> statement-breakpoint
CREATE FUNCTION vitals_assign_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prefix text := 'WS'; marker text; project_id_value uuid; goal_reference text; n integer; width integer := 3;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.reference <> '' THEN
    NEW.reference := OLD.reference;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'notes' THEN
    IF NEW.domain = 'project' THEN project_id_value := NEW.domain_id; END IF;
    marker := CASE WHEN NEW.content_type = 'idea' THEN 'I'
      WHEN 'decision' = ANY(NEW.tags) THEN 'D' ELSE 'N' END;
  ELSE
    project_id_value := NEW.project_id;
    marker := CASE WHEN TG_TABLE_NAME = 'goals' THEN 'G' ELSE 'T' END;
  END IF;
  IF project_id_value IS NOT NULL THEN
    SELECT key INTO prefix FROM projects WHERE id = project_id_value
      AND workspace_id = NEW.workspace_id AND user_id = NEW.user_id;
    IF prefix IS NULL THEN RAISE EXCEPTION 'Project not found in the configured workspace'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'todos' THEN
    IF NEW.goal_id IS NOT NULL THEN
      SELECT reference INTO goal_reference FROM goals WHERE id = NEW.goal_id
        AND workspace_id = NEW.workspace_id AND user_id = NEW.user_id;
      IF goal_reference IS NULL THEN RAISE EXCEPTION 'Goal not found in the configured workspace'; END IF;
      prefix := goal_reference;
    END IF;
  END IF;
  IF marker = 'G' THEN width := 2; END IF;
  prefix := prefix || '-' || marker;
  n := vitals_next_reference_number(NEW.workspace_id, 'ref:' || prefix);
  NEW.reference := prefix || lpad(n::text, greatest(width, length(n::text)), '0');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER goals_assign_reference BEFORE INSERT OR UPDATE ON goals
FOR EACH ROW EXECUTE FUNCTION vitals_assign_reference();
--> statement-breakpoint
CREATE TRIGGER todos_assign_reference BEFORE INSERT OR UPDATE ON todos
FOR EACH ROW EXECUTE FUNCTION vitals_assign_reference();
--> statement-breakpoint
CREATE TRIGGER notes_assign_reference BEFORE INSERT OR UPDATE ON notes
FOR EACH ROW EXECUTE FUNCTION vitals_assign_reference();
--> statement-breakpoint
-- Backfill in stable creation order, parents first, using the same allocation rules.
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM projects ORDER BY created_at, id LOOP UPDATE projects SET key = '' WHERE id = r.id; END LOOP;
  FOR r IN SELECT id FROM goals ORDER BY created_at, id LOOP UPDATE goals SET reference = '' WHERE id = r.id; END LOOP;
  FOR r IN SELECT id FROM todos ORDER BY created_at, id LOOP UPDATE todos SET reference = '' WHERE id = r.id; END LOOP;
  FOR r IN SELECT id FROM notes ORDER BY created_at, id LOOP UPDATE notes SET reference = '' WHERE id = r.id; END LOOP;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "goals_workspace_id_reference_idx" ON "goals" USING btree ("workspace_id","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "notes_workspace_id_reference_idx" ON "notes" USING btree ("workspace_id","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_workspace_id_key_idx" ON "projects" USING btree ("workspace_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "todos_workspace_id_reference_idx" ON "todos" USING btree ("workspace_id","reference");
--> statement-breakpoint
ALTER TABLE reference_counters ENABLE ROW LEVEL SECURITY;
