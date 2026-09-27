import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { Pool } from "pg";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Creates and drops its own database; never resets the supplied database.
test("reference migration, allocation, and MCP resolution", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const database = `vitals_refs_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE DATABASE "${database}"`);
  const url = new URL(process.env.TEST_DATABASE_URL!);
  url.pathname = `/${database}`;
  process.env.DATABASE_URL = url.toString();
  const pool = new Pool({ connectionString: url.toString() });
  const { projectsRepo, goalsRepo, todosRepo, notesRepo, journalRepo, closeDb } = await import("../src/index");
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;
  try {
    await pool.query('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY)');
    const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
    async function migrate(tag: string) {
      const sql = await readFile(new URL(`../drizzle/${tag}.sql`, import.meta.url), 'utf8');
      const connection = await pool.connect();
      try {
        await connection.query('BEGIN');
        for (const statement of sql.split('--> statement-breakpoint')) await connection.query(statement);
        await connection.query('COMMIT');
      } catch (error) { await connection.query('ROLLBACK'); throw error; }
      finally { connection.release(); }
    }
    for (const entry of journal.entries.slice(0, -1)) await migrate(entry.tag);
    const user = randomUUID(), workspace = randomUUID(), otherWorkspace = randomUUID();
    const projectId = randomUUID(), goalId = randomUUID();
    await pool.query('INSERT INTO auth.users VALUES ($1)', [user]);
    await pool.query("INSERT INTO workspaces(id,user_id,name) VALUES ($1,$3,'test'),($2,$3,'other')", [workspace,otherWorkspace,user]);
    await pool.query("INSERT INTO projects(id,user_id,workspace_id,name) VALUES ($1,$2,$3,'PrepVitals')", [projectId,user,workspace]);
    await pool.query("INSERT INTO goals(id,user_id,workspace_id,title,project_id) VALUES ($1,$2,$3,'Legacy goal',$4)", [goalId,user,workspace,projectId]);
    await pool.query("INSERT INTO todos(id,user_id,workspace_id,title,project_id,goal_id) VALUES ($1,$2,$3,'Legacy task',$4,$5)", [randomUUID(),user,workspace,projectId,goalId]);
    await pool.query("INSERT INTO notes(id,user_id,workspace_id,content,raw_content,domain,domain_id,content_type) VALUES ($1,$2,$3,'Idea','Idea','project',$4,'idea')", [randomUUID(),user,workspace,projectId]);
    await migrate(journal.entries.at(-1).tag);
    assert.equal((await projectsRepo.getProjectById(projectId,user,workspace))!.key, 'PVT');
    assert.equal((await goalsRepo.getGoalById(goalId,user,workspace))!.reference, 'PVT-G01');
    assert.equal((await todosRepo.listTodos(user,workspace))[0].reference, 'PVT-G01-T001');
    assert.equal((await notesRepo.listNotes(user,workspace))[0].reference, 'PVT-I001');
    const goal = await goalsRepo.createGoal({title:'Second',projectId},user,workspace);
    assert.equal(goal.reference,'PVT-G02');
    const tasks = await Promise.all(Array.from({length:20}, (_,i) => todosRepo.createTodo({title:`Task ${i}`,projectId,goalId:goal.id},user,workspace)));
    assert.equal(new Set(tasks.map(t=>t.reference)).size,20);
    assert.ok(tasks.some(t=>t.reference === 'PVT-G02-T014'));
    const last = tasks.find(t=>t.reference === 'PVT-G02-T020')!;
    await todosRepo.deleteTodo(last.id,user,workspace);
    assert.equal((await todosRepo.createTodo({title:'After delete',projectId,goalId:goal.id},user,workspace)).reference,'PVT-G02-T021');
    const inheritedProjectTask = await todosRepo.createTodo({title:'Inherited project task',goalId:goal.id},user,workspace);
    assert.equal(inheritedProjectTask.projectId,null);
    assert.ok((await todosRepo.listTodosByProjectId(projectId,user,workspace)).some(todo=>todo.id === inheritedProjectTask.id));
    await projectsRepo.updateProject(projectId,{name:'Renamed'},user,workspace);
    assert.equal((await projectsRepo.getProjectById(projectId,user,workspace))!.key,'PVT');
    const disposableGoal = await goalsRepo.createGoal({title:'Temporary',projectId},user,workspace);
    await goalsRepo.deleteGoal(disposableGoal.id,user,workspace);
    const afterGoalDelete = await goalsRepo.createGoal({title:'Next',projectId},user,workspace);
    assert.equal(afterGoalDelete.reference,'PVT-G04');
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      await tx.query("INSERT INTO todos(id,user_id,workspace_id,title,project_id) VALUES ($1,$2,$3,'Rollback',$4)",[randomUUID(),user,workspace,projectId]);
      await tx.query('ROLLBACK');
    } finally { tx.release(); }
    const duplicates = await Promise.all(Array.from({length:8},()=>projectsRepo.createProject({name:'Prep'},user,workspace)));
    assert.equal(new Set(duplicates.map(p=>p.key)).size,8);
    assert.equal((await projectsRepo.createProject({name:'Shopify'},user,workspace)).key,'SHP');
    const otherProject = await projectsRepo.createProject({name:'Prep'},user,otherWorkspace);
    assert.equal(otherProject.key,'PRP');
    assert.equal(await todosRepo.getTodoByReference('PVT-G02-T014',user,otherWorkspace),null);
    const decision = await notesRepo.createNote({content:'Decision',domain:'project',domainId:projectId,tags:['decision']},user,workspace);
    assert.equal(decision.reference,'PVT-D001');
    const free = await todosRepo.createTodo({title:'Unassigned'},user,workspace);
    assert.match(free.reference,/^WS-T\d{3}$/);
    const flat = await todosRepo.createTodo({title:'Project task',projectId},user,workspace);
    assert.equal(flat.reference,'PVT-T001');
    await todosRepo.updateTodo(flat.id,{goalId:goal.id},user,workspace);
    assert.equal((await todosRepo.getTodoById(flat.id,user,workspace))!.reference,'PVT-T001');
    await journalRepo.upsertJournalEntry({date:'2026-09-26',content:'Journal'},user,workspace);
    assert.ok((await notesRepo.listNotes(user,workspace)).some(n=>n.reference === 'WS-N001'));
    const recurring = await todosRepo.createTodo({title:'Recurring',projectId,goalId:goal.id,recurrenceFreq:'daily',dueDate:'2026-09-26'},user,workspace);
    const completion = await todosRepo.updateTodo(recurring.id,{status:'done'},user,workspace);
    assert.ok(completion?.nextTodo);
    assert.notEqual(completion.nextTodo.reference, recurring.reference);
    assert.equal(new Set((await todosRepo.listTodos(user,workspace)).map(t=>t.reference)).size,(await todosRepo.listTodos(user,workspace)).length);
    // Crossing padding boundaries must not truncate the reference number.
    await pool.query("UPDATE reference_counters SET value=999 WHERE workspace_id=$1 AND scope='ref:PVT-T'",[workspace]);
    assert.equal((await todosRepo.createTodo({title:'1000',projectId},user,workspace)).reference,'PVT-T1000');
    const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string,string] => entry[1] !== undefined));
    transport = new StdioClientTransport({command:process.execPath,args:['--import','tsx',fileURLToPath(new URL('../../../apps/mcp/src/index.ts',import.meta.url))],env:{...env,MCP_USER_ID:user,MCP_WORKSPACE_ID:workspace}});
    client = new Client({name:'references-test',version:'1'});
    await client.connect(transport);
    async function call(name:string,args:Record<string,unknown>) {
      const response = await client!.callTool({name,arguments:args});
      assert.ok(!response.isError,JSON.stringify(response));
      return JSON.parse((response.content as {text:string}[])[0].text);
    }
    const context = await call('vitals_context_for_task',{project:'pvt',task:'pvt-g02-t014'});
    assert.equal(context.task.reference,'PVT-G02-T014');
    const legacy = await call('vitals_context_for_task',{projectId,task:context.task.id});
    assert.equal(legacy.task.id,context.task.id);
    const created = await call('vitals_create_todo',{title:'From MCP',projectId:'PVT',goalId:'PVT-G02',ideaId:'PVT-I001',dependencyIds:['PVT-G02-T014']});
    assert.equal(created.created.projectId,projectId);
    const completed = await call('vitals_complete_todo',{id:created.created.reference});
    assert.equal(completed.completed.id,created.created.id);
    const conflicting = await client.callTool({name:'vitals_context_for_task',arguments:{project:'PVT',projectId:duplicates[1].id,task:context.task.reference}});
    assert.ok(conflicting.isError);
    await todosRepo.createTodo({title:'Duplicate title',projectId},user,workspace);
    await todosRepo.createTodo({title:'Duplicate title',projectId},user,workspace);
    const ambiguous = await client.callTool({name:'vitals_context_for_task',arguments:{project:'PVT',task:'Duplicate title'}});
    assert.ok(ambiguous.isError);
    const denied = await client.callTool({name:'vitals_context_for_task',arguments:{project:otherProject.id,task:context.task.reference}});
    assert.ok(denied.isError);
    const releasedKey = duplicates[0].key;
    await projectsRepo.deleteProject(duplicates[0].id,user,workspace);
    assert.equal((await projectsRepo.createProject({name:'Prep'},user,workspace)).key,releasedKey);
  } finally {
    await client?.close();
    await transport?.close();
    await closeDb();
    await pool.end();
    await admin.query(`DROP DATABASE "${database}"`);
    await admin.end();
  }
});
