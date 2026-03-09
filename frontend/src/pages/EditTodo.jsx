import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'

export default function EditTodo() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [existingImageUrl, setExistingImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`/api/todos/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Todo not found')
        return res.json()
      })
      .then((todo) => {
        setTitle(todo.title || '')
        setDescription(todo.description || '')
        setExistingImageUrl(todo.image || '')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

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

  const handleRemoveNewImage = () => {
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
      let imageUrl = existingImageUrl
      if (imageFile) {
        const presignRes = await fetch('/api/todos/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: imageFile.name,
            content_type: imageFile.type || 'image/jpeg',
          }),
        })
        if (!presignRes.ok) {
          const data = await presignRes.json().catch(() => ({}))
          throw new Error(data.detail || 'Failed to get upload URL')
        }
        const { upload_url, object_url } = await presignRes.json()
        const uploadRes = await fetch(upload_url, {
          method: 'PUT',
          body: imageFile,
          headers: { 'Content-Type': imageFile.type || 'image/jpeg' },
        })
        if (!uploadRes.ok) throw new Error('Failed to upload image to S3')
        imageUrl = object_url
      }
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          image: imageUrl,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || data.title?.[0] || 'Failed to update todo')
      }
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to update todo')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading">Loading…</div>
  if (error && !title) return <div className="error">Error: {error}</div>

  return (
    <>
      <header className="page-header">
        <h1>Edit todo</h1>
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
                  onClick={handleRemoveNewImage}
                >
                  Remove new image
                </button>
              </div>
            ) : existingImageUrl ? (
              <div className="image-preview-wrap">
                <img src={existingImageUrl} alt="Current" className="image-preview" />
                <p className="image-placeholder">Current image. Choose a new file to replace.</p>
              </div>
            ) : (
              <p className="image-placeholder">No image. Choose a file to add one.</p>
            )}
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <Link to="/" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}
