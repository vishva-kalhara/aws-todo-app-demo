import { useState, useEffect } from 'react'

function App() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/todos/')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load todos')
        return res.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.results ?? [])
        setTodos(list)
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading todos…</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <>
      <h1>Todos</h1>
      <ul className="todos-list">
        {todos.length === 0 ? (
          <li className="loading">No todos yet.</li>
        ) : (
          todos.map((todo) => (
            <li key={todo.id} className="todo-item">
              <h3>{todo.title}</h3>
              {todo.description && <p>{todo.description}</p>}
              <div className="todo-meta">
                {todo.created_at && new Date(todo.created_at).toLocaleString()}
                {todo.image && <> · {todo.image}</>}
              </div>
            </li>
          ))
        )}
      </ul>
    </>
  )
}

export default App
