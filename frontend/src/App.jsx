import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TodoList from './pages/TodoList'
import AddTodo from './pages/AddTodo'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<TodoList />} />
          <Route path="/add" element={<AddTodo />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
