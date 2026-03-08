import { useState, useRef, useEffect } from 'react'
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { API_BASE_URL } from '../config'

interface VideoUploadFormProps {
  username: string
  workspace?: string | null
  onUploadComplete: (video: any) => void
  onCancel: () => void
}

// File size and format constants
const MAX_FILE_SIZE_GB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_GB * 1024 * 1024 * 1024;
const ACCEPTED_FORMATS = ['MP4', 'MOV', 'AVI', 'MKV', 'WebM', 'FLV', 'WMV'];

export function VideoUploadForm({ username, workspace = null, onUploadComplete, onCancel }: VideoUploadFormProps) {
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Fetch suggested tags
    fetch(`${API_BASE_URL}/api/tags`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSuggestedTags(data.tags)
        }
      })
      .catch(err => console.error('Failed to fetch tags:', err))
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const validateAndSetFile = (file: File) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
      setFileError(`File size (${fileSizeGB}GB) exceeds maximum allowed size of ${MAX_FILE_SIZE_GB}GB`);
      setSelectedFile(null);
      return;
    }
    
    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      setFileError('Please select a valid video file');
      setSelectedFile(null);
      return;
    }
    
    setFileError('');
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      validateAndSetFile(files[0])
    }
  }

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) {
      alert('Please select a file and enter a title')
      return
    }

    setIsUploading(true)

    const formData = new FormData()
    formData.append('video', selectedFile)
    formData.append('title', title)
    formData.append('tags', tags.join(','))
    formData.append('username', username)
    formData.append('uploadToBroadcast', 'false')
    if (workspace) {
      formData.append('workspace', workspace)
    }

    try {
      console.log('Starting upload...', {
        filename: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      })
      
      const response = await fetch(`${API_BASE_URL}/api/upload-video`, {
        method: 'POST',
        body: formData,
      })

      console.log('Upload response status:', response.status)
      
      const data = await response.json()
      console.log('Upload response data:', data)
      
      if (data.success) {
        onUploadComplete(data.video)
      } else {
        const errorMsg = data.error || 'Unknown error'
        console.error('Upload failed:', errorMsg)
        alert('Upload failed: ' + errorMsg)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Network error'))
    } finally {
      setIsUploading(false)
    }
  }

  const filteredSuggestions = suggestedTags.filter(tag => 
    !tags.includes(tag) && 
    tag.toLowerCase().includes(tagInput.toLowerCase())
  )

  return (
    <Card className="p-6 max-w-2xl mx-auto bg-white/10 backdrop-blur-md border-white/20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Upload Video</h2>
        <button onClick={onCancel} className="text-white/70 hover:text-white">
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        {/* File Selection - Drag and Drop */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            Video File *
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
              ${isDragging 
                ? 'border-purple-400 bg-purple-500/20 scale-[1.02]' 
                : 'border-white/30 bg-white/5 hover:bg-white/10 hover:border-white/50'
              }
            `}
          >
            <CameraIcon className={`w-12 h-12 mx-auto mb-3 transition-colors ${isDragging ? 'text-purple-300' : 'text-white/70'}`} />
            {selectedFile ? (
              <div className="space-y-2">
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-sm text-white/60">Click or drag to replace</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-white font-medium">
                  {isDragging ? 'Drop video here' : 'Drag and drop video here'}
                </p>
                <p className="text-sm text-white/60">or click to browse</p>
              </div>
            )}
          </div>
          
          {/* File info and error messages */}
          <div className="mt-2 space-y-1">
            {fileError && (
              <p className="text-sm text-red-300 flex items-start gap-1">
                <span className="text-red-400">⚠️</span>
                {fileError}
              </p>
            )}
            {selectedFile && !fileError && (
              <p className="text-sm text-green-300 flex items-center gap-1">
                <span>✓</span>
                File size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
            <p className="text-xs text-white/60">
              Maximum file size: {MAX_FILE_SIZE_GB}GB • Accepted formats: {ACCEPTED_FORMATS.join(', ')}
            </p>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-white/50"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag(tagInput)
                }
              }}
              placeholder="Add tags..."
              className="flex-1 px-4 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-white/50"
            />
            <Button onClick={() => handleAddTag(tagInput)} variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
              Add
            </Button>
          </div>

          {/* Tag suggestions */}
          {tagInput && filteredSuggestions.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg p-2 mb-2">
              <p className="text-xs text-white/60 mb-1">Suggestions:</p>
              <div className="flex flex-wrap gap-1">
                {filteredSuggestions.slice(0, 10).map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    className="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/30 text-white rounded-full text-sm backdrop-blur-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-white/80"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={isUploading || !selectedFile || !title.trim()}
            className="flex-1 bg-white/30 hover:bg-white/40 text-white shadow-lg backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Video'}
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1 bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border-white/20 backdrop-blur-sm">
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  )
}
