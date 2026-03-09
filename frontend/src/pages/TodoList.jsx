import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function TodoList() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const fetchTodos = () => {
    return fetch('/api/todos/')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load todos')
        return res.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.results ?? [])
        setTodos(list)
        setError(null)
      })
  }

  useEffect(() => {
    fetchTodos().catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (todoId) => {
    if (!window.confirm('Delete this todo?')) return
    setDeletingId(todoId)
    try {
      const res = await fetch(`/api/todos/${todoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setTodos((prev) => prev.filter((t) => t.id !== todoId))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <div className="loading">Loading todos…</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <>
      <header className="page-header">
        <h1>Todos</h1>
        <Link to="/add" className="btn btn-primary">
          Add todo
        </Link>
      </header>
      <ul className="todos-list">
        {todos.length === 0 ? (
          <li className="empty-state">No todos yet.</li>
        ) : (
          todos.map((todo) => (
            <li key={todo.id} className="todo-item">
              {todo.image && (
                <div className="todo-image-wrap">
                  <img
                    src={todo.image.startsWith('data:') ? todo.image : todo.image}
                    alt=""
                    className="todo-image"
                  />
                </div>
              )}
              <div className="todo-body">
                <h3>{todo.title}</h3>
                {todo.description && <p>{todo.description}</p>}
                <div className="todo-meta">
                  {todo.created_at && new Date(todo.created_at).toLocaleString()}
                </div>
                <div className="todo-actions">
                  <Link to={`/todos/${todo.id}/edit`} className="btn btn-small btn-secondary">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => handleDelete(todo.id)}
                    disabled={deletingId === todo.id}
                  >
                    {deletingId === todo.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </>
  )
}
