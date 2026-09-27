-- Recognize CamelCase boundaries while deriving readable three-character acronyms. Multiword names start with their
-- initials and single-word names retain consonants (Prep Vitals and PrepVitals -> PVT,
-- Shopify -> SHP).
CREATE OR REPLACE FUNCTION vitals_project_key_base(project_name text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  separated text;
  cleaned text;
  words text[];
  word text;
  result text := '';
  tail text;
BEGIN
  separated := regexp_replace(coalesce(project_name, ''), '([a-z0-9])([A-Z])', '\1 \2', 'g');
  cleaned := trim(regexp_replace(upper(separated), '[^A-Z0-9]+', ' ', 'g'));
  IF cleaned = '' THEN RETURN 'PRO'; END IF;

  words := regexp_split_to_array(cleaned, '\s+');
  IF cardinality(words) = 1 THEN
    word := words[1];
    result := left(word, 1) || regexp_replace(substring(word FROM 2), '[AEIOU]', '', 'g');
    result := result || substring(word FROM 2);
  ELSE
    FOREACH word IN ARRAY words LOOP
      result := result || left(word, 1);
    END LOOP;
    IF length(result) < 3 THEN
      tail := substring(words[cardinality(words)] FROM 2);
      result := result || regexp_replace(tail, '[AEIOU]', '', 'g') || tail;
    END IF;
  END IF;

  result := left(result || replace(cleaned, ' ', '') || 'PRO', 3);
  IF result = 'WS' THEN RETURN 'PRO'; END IF;
  RETURN result;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION vitals_assign_project_key() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base text; candidate text; suffix integer := 1;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.key <> '' THEN
    NEW.key := OLD.key;
    RETURN NEW;
  END IF;
  base := vitals_project_key_base(NEW.name);
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
ALTER TABLE projects DISABLE TRIGGER projects_assign_key;
--> statement-breakpoint
ALTER TABLE goals DISABLE TRIGGER goals_assign_reference;
--> statement-breakpoint
ALTER TABLE todos DISABLE TRIGGER todos_assign_reference;
--> statement-breakpoint
ALTER TABLE notes DISABLE TRIGGER notes_assign_reference;
--> statement-breakpoint
CREATE TEMP TABLE camel_case_project_key_migration (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  old_key text NOT NULL,
  new_key text,
  name text NOT NULL,
  created_at timestamptz NOT NULL
) ON COMMIT DROP;
--> statement-breakpoint
INSERT INTO camel_case_project_key_migration (id, workspace_id, old_key, name, created_at)
SELECT id, workspace_id, key, name, created_at FROM projects;
--> statement-breakpoint
UPDATE projects SET key = 'TMP' || replace(id::text, '-', '');
--> statement-breakpoint
DO $$
DECLARE r record; base text; candidate text; suffix integer;
BEGIN
  FOR r IN SELECT * FROM camel_case_project_key_migration ORDER BY workspace_id, created_at, id LOOP
    base := vitals_project_key_base(r.name);
    candidate := base;
    suffix := 2;
    WHILE EXISTS (
      SELECT 1 FROM camel_case_project_key_migration
      WHERE workspace_id = r.workspace_id AND new_key = candidate
    ) LOOP
      candidate := base || suffix::text;
      suffix := suffix + 1;
    END LOOP;
    UPDATE camel_case_project_key_migration SET new_key = candidate WHERE id = r.id;
  END LOOP;
END $$;
--> statement-breakpoint
UPDATE projects p SET key = m.new_key
FROM camel_case_project_key_migration m WHERE p.id = m.id;
--> statement-breakpoint
CREATE TEMP TABLE camel_case_goal_reference_migration AS
SELECT g.id, m.new_key || substring(g.reference FROM length(m.old_key) + 1) AS new_reference
FROM goals g JOIN camel_case_project_key_migration m ON g.project_id = m.id
WHERE g.reference LIKE m.old_key || '-%';
--> statement-breakpoint
CREATE TEMP TABLE camel_case_todo_reference_migration AS
SELECT t.id, m.new_key || substring(t.reference FROM length(m.old_key) + 1) AS new_reference
FROM todos t JOIN camel_case_project_key_migration m ON t.project_id = m.id
WHERE t.reference LIKE m.old_key || '-%';
--> statement-breakpoint
CREATE TEMP TABLE camel_case_note_reference_migration AS
SELECT n.id, m.new_key || substring(n.reference FROM length(m.old_key) + 1) AS new_reference
FROM notes n JOIN camel_case_project_key_migration m ON n.domain = 'project' AND n.domain_id = m.id
WHERE n.reference LIKE m.old_key || '-%';
--> statement-breakpoint
CREATE TEMP TABLE camel_case_counter_scope_migration AS
SELECT c.workspace_id, c.scope AS old_scope,
  'ref:' || m.new_key || substring(c.scope FROM length('ref:' || m.old_key) + 1) AS new_scope
FROM reference_counters c JOIN camel_case_project_key_migration m ON c.workspace_id = m.workspace_id
WHERE c.scope LIKE 'ref:' || m.old_key || '-%';
--> statement-breakpoint
UPDATE goals SET reference = 'TMP-G-' || id::text
WHERE id IN (SELECT id FROM camel_case_goal_reference_migration);
--> statement-breakpoint
UPDATE todos SET reference = 'TMP-T-' || id::text
WHERE id IN (SELECT id FROM camel_case_todo_reference_migration);
--> statement-breakpoint
UPDATE notes SET reference = 'TMP-N-' || id::text
WHERE id IN (SELECT id FROM camel_case_note_reference_migration);
--> statement-breakpoint
UPDATE reference_counters c SET scope = 'tmp:' || c.scope
WHERE EXISTS (
  SELECT 1 FROM camel_case_counter_scope_migration m
  WHERE m.workspace_id = c.workspace_id AND m.old_scope = c.scope
);
--> statement-breakpoint
UPDATE goals g SET reference = m.new_reference
FROM camel_case_goal_reference_migration m WHERE g.id = m.id;
--> statement-breakpoint
UPDATE todos t SET reference = m.new_reference
FROM camel_case_todo_reference_migration m WHERE t.id = m.id;
--> statement-breakpoint
UPDATE notes n SET reference = m.new_reference
FROM camel_case_note_reference_migration m WHERE n.id = m.id;
--> statement-breakpoint
UPDATE reference_counters c SET scope = m.new_scope
FROM camel_case_counter_scope_migration m
WHERE c.workspace_id = m.workspace_id AND c.scope = 'tmp:' || m.old_scope;
--> statement-breakpoint
DELETE FROM reference_counters WHERE scope LIKE 'key:%';
--> statement-breakpoint
INSERT INTO reference_counters (workspace_id, scope, value)
SELECT workspace_id, 'key:' || key, 1 FROM projects
ON CONFLICT (workspace_id, scope) DO NOTHING;
--> statement-breakpoint
ALTER TABLE projects ENABLE TRIGGER projects_assign_key;
--> statement-breakpoint
ALTER TABLE goals ENABLE TRIGGER goals_assign_reference;
--> statement-breakpoint
ALTER TABLE todos ENABLE TRIGGER todos_assign_reference;
--> statement-breakpoint
ALTER TABLE notes ENABLE TRIGGER notes_assign_reference;
