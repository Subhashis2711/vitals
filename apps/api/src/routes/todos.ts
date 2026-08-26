import { createTodoInputSchema, fromGid, reorderTodosInputSchema, updateTodoInputSchema } from "@vitals/shared";
import { todosRepo } from "@vitals/db";
import type { FastifyInstance } from "fastify";
import { serializeTodo } from "../serializers";

export async function todosRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { sourceNoteId?: string; projectId?: string } }>("/", async (req) => {
    let todos;
    if (req.query.sourceNoteId) {
      todos = await todosRepo.listTodosBySourceNoteId(fromGid(req.query.sourceNoteId).id, req.userId, req.workspaceId);
    } else if (req.query.projectId) {
      todos = await todosRepo.listTodosByProjectId(fromGid(req.query.projectId).id, req.userId, req.workspaceId);
    } else {
      todos = await todosRepo.listTodos(req.userId, req.workspaceId);
    }
    return { todos: todos.map(serializeTodo) };
  });

  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const todo = await todosRepo.getTodoById(id, req.userId, req.workspaceId);
    if (!todo) return reply.code(404).send({ error: "Todo not found" });
    return { todo: serializeTodo(todo) };
  });

  app.post("/", async (req, reply) => {
    const parsed = createTodoInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const todo = await todosRepo.createTodo(parsed.data, req.userId, req.workspaceId);
    return reply.code(201).send({ todo: serializeTodo(todo) });
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = updateTodoInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { id } = fromGid(req.params.id);
    const result = await todosRepo.updateTodo(id, parsed.data, req.userId, req.workspaceId);
    if (!result) return reply.code(404).send({ error: "Todo not found" });
    return { todo: serializeTodo(result.todo), nextTodo: result.nextTodo ? serializeTodo(result.nextTodo) : null };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const todo = await todosRepo.deleteTodo(id, req.userId, req.workspaceId);
    if (!todo) return reply.code(404).send({ error: "Todo not found" });
    return { todo: serializeTodo(todo) };
  });

  app.post("/reorder", async (req, reply) => {
    const parsed = reorderTodosInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const result = await todosRepo.swapTodoPositions(parsed.data.firstId, parsed.data.secondId, req.userId, req.workspaceId);
    if (!result) return reply.code(404).send({ error: "Todo not found" });
    return { todos: result.map(serializeTodo) };
  });
}
