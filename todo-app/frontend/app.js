const API_BASE = "http://localhost:3000";

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");

function renderTodo(todo) {
  const li = document.createElement("li");
  li.dataset.id = String(todo.id);
  li.className = todo.completed ? "completed" : "";

  const text = document.createElement("span");
  text.textContent = todo.text;

  const controls = document.createElement("div");

  const toggleBtn = document.createElement("button");
  toggleBtn.textContent = todo.completed ? "Undo" : "Done";
  toggleBtn.addEventListener("click", async () => {
    await fetch(`${API_BASE}/api/todos/${todo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !todo.completed })
    });
    loadTodos();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", async () => {
    await fetch(`${API_BASE}/api/todos/${todo.id}`, { method: "DELETE" });
    loadTodos();
  });

  controls.append(toggleBtn, deleteBtn);
  li.append(text, controls);
  return li;
}

async function loadTodos() {
  const response = await fetch(`${API_BASE}/api/todos`);
  const todos = await response.json();
  list.innerHTML = "";
  todos.forEach((todo) => list.appendChild(renderTodo(todo)));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  await fetch(`${API_BASE}/api/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  input.value = "";
  loadTodos();
});

loadTodos();
