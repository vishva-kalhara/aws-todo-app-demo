import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function AddTodo() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (e.g. JPEG, PNG).')
      setImageFile(null)
      setImagePreview(null)
      return
    }
    setError(null)
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setSubmitting(true)
    try {
      let imageValue = ''
      if (imageFile) {
        imageValue = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(imageFile)
        })
      }
      const res = await fetch('/api/todos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          image: imageValue,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || data.title?.[0] || 'Failed to create todo')
      }
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to create todo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>Add todo</h1>
        <Link to="/" className="btn btn-secondary">
          Back to list
        </Link>
      </header>
      <form className="todo-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            rows={4}
          />
        </div>
        <div className="form-group">
          <label>Image (one image only)</label>
          <div className="image-upload">
            <label className="file-label">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
              />
              <span className="file-label-text">Choose image</span>
            </label>
            {imagePreview ? (
              <div className="image-preview-wrap">
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button
                  type="button"
                  className="btn btn-small btn-secondary"
                  onClick={handleRemoveImage}
                >
                  Remove image
                </button>
              </div>
            ) : (
              <p className="image-placeholder">No image selected</p>
            )}
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
          <Link to="/" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}
