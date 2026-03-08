import { useState, useEffect } from 'react'
import { PlayIcon, TrashIcon, MagnifyingGlassIcon, VideoCameraIcon, PencilIcon, XMarkIcon, ChatBubbleLeftIcon, ArchiveBoxIcon, ArchiveBoxArrowDownIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { API_BASE_URL } from '../config'

interface Video {
  id: string
  filename: string
  url: string
  title: string
  description: string
  tags: string[]
  username: string
  uploadedAt: number
  size: number
  workspace?: string | null
  archived?: boolean
}

interface AnnotationCounts {
  [videoId: string]: number
}

interface LastUpdated {
  [videoId: string]: number
}

interface VideoLibraryProps {
  username: string
  filterByUser?: boolean
  workspace?: string | null
  onSelectVideo: (video: Video) => void
}

export function VideoLibrary({ username, filterByUser = false, workspace = null, onSelectVideo }: VideoLibraryProps) {
  const [videos, setVideos] = useState<Video[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<{videoId: string, title: string, commentCount: number} | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<{videoId: string, title: string, isArchived: boolean} | null>(null)
  const [editVideo, setEditVideo] = useState<Video | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editTagInput, setEditTagInput] = useState('')
  const [editWorkspace, setEditWorkspace] = useState<string>('')
  const [annotationCounts, setAnnotationCounts] = useState<AnnotationCounts>({})
  const [lastUpdated, setLastUpdated] = useState<LastUpdated>({})
  const [showArchived, setShowArchived] = useState(false)

  const fetchVideos = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterByUser) {
        params.append('username', username)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }
      if (workspace) {
        params.append('workspace', workspace)
      }
      params.append('archived', showArchived.toString())

      const response = await fetch(`${API_BASE_URL}/api/videos?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setVideos(data.videos)
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAnnotationCounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/annotation-counts`)
      const data = await response.json()
      
      if (data.success) {
        setAnnotationCounts(data.counts)
        setLastUpdated(data.lastUpdated)
      }
    } catch (error) {
      console.error('Failed to fetch annotation counts:', error)
    }
  }

  useEffect(() => {
    fetchVideos()
    fetchAnnotationCounts()
  }, [filterByUser, username, workspace, showArchived])

  const isNewComments = (videoId: string): boolean => {
    const lastVisits = JSON.parse(localStorage.getItem('videoLastVisits') || '{}')
    const lastVisit = lastVisits[videoId]
    const lastUpdate = lastUpdated[videoId]
    
    // If never visited or has updates since last visit
    return Boolean(!lastVisit || (lastUpdate && lastUpdate > lastVisit))
  }

  const handleSearch = () => {
    fetchVideos()
    fetchAnnotationCounts()
  }

  const handleDelete = async (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    const video = videos.find(v => v.id === videoId)
    if (!video) return
    
    const commentCount = annotationCounts[videoId] || 0
    setDeleteConfirm({ videoId, title: video.title, commentCount })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/${deleteConfirm.videoId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setVideos(videos.filter(v => v.id !== deleteConfirm.videoId))
        setDeleteConfirm(null)
      } else {
        alert('Failed to delete video: ' + data.error)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete video')
    }
  }

  const handleEdit = (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    const video = videos.find(v => v.id === videoId)
    if (!video) return
    
    setEditVideo(video)
    setEditTitle(video.title)
    setEditTags(video.tags)
    setEditWorkspace(video.workspace || 'none')
    setEditTagInput('')
  }

  const handleArchive = async (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    const video = videos.find(v => v.id === videoId)
    if (!video) return
    
    setArchiveConfirm({ videoId, title: video.title, isArchived: video.archived || false })
  }

  const confirmArchive = async () => {
    if (!archiveConfirm) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/${archiveConfirm.videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          archived: !archiveConfirm.isArchived
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Remove from current list
        setVideos(videos.filter(v => v.id !== archiveConfirm.videoId))
        setArchiveConfirm(null)
      } else {
        alert('Failed to archive video: ' + data.error)
      }
    } catch (error) {
      console.error('Archive error:', error)
      alert('Failed to archive video')
    }
  }

  const handleSaveEdit = async () => {
    if (!editVideo || !editTitle.trim()) {
      alert('Title is required')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/${editVideo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editTitle,
          tags: editTags,
          workspace: editWorkspace === 'none' ? null : editWorkspace
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setVideos(videos.map(v => v.id === editVideo.id ? data.video : v))
        setEditVideo(null)
      } else {
        alert('Failed to update video: ' + data.error)
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update video')
    }
  }

  const handleAddEditTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !editTags.includes(trimmedTag)) {
      setEditTags([...editTags, trimmedTag])
      setEditTagInput('')
    }
  }

  const handleRemoveEditTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(t => t !== tagToRemove))
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Delete Video</h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete "{deleteConfirm.title}"?
            </p>
            {deleteConfirm.commentCount > 0 && (
              <p className="text-orange-600 font-medium mb-2">
                Warning: This video has {deleteConfirm.commentCount} comment{deleteConfirm.commentCount !== 1 ? 's' : ''} that will also be permanently deleted.
              </p>
            )}
            <p className="text-gray-600 mb-4">
              This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {archiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">
              {archiveConfirm.isArchived ? 'Unarchive Video' : 'Archive Video'}
            </h3>
            <p className="text-gray-600 mb-2">
              {archiveConfirm.isArchived 
                ? `Are you sure you want to unarchive "${archiveConfirm.title}"?`
                : `Are you sure you want to archive "${archiveConfirm.title}"?`
              }
            </p>
            {!archiveConfirm.isArchived && (
              <p className="text-gray-600 mb-4">
                Archived videos are hidden from the main library but can be accessed anytime by clicking the "View Archived Videos" button at the bottom of the video list.
              </p>
            )}
            {archiveConfirm.isArchived && (
              <p className="text-gray-600 mb-4">
                This video will be restored to the main library.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setArchiveConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmArchive}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {archiveConfirm.isArchived ? 'Unarchive' : 'Archive'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Modal */}
      {editVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Video</h3>
              <button onClick={() => setEditVideo(null)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Workspace */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace
                </label>
                <select
                  value={editWorkspace}
                  onChange={(e) => setEditWorkspace(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No Workspace</option>
                  <option value="aws">AWS</option>
                  <option value="hodgkin">Hodgkin</option>
                  <option value="demo">Demo</option>
                  <option value="uw">UW</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEditTag(editTagInput)
                      }
                    }}
                    placeholder="Add tags..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button onClick={() => handleAddEditTag(editTagInput)} variant="outline">
                    Add
                  </Button>
                </div>

                {/* Selected tags */}
                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveEditTag(tag)}
                          className="hover:text-blue-900"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setEditVideo(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by title or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading videos...</p>
        </div>
      ) : videos.length === 0 ? (
        <Card className="p-12 text-center">
          <VideoCameraIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No videos found</h3>
          <p className="text-gray-600">
            {filterByUser 
              ? "You haven't uploaded any videos yet" 
              : searchQuery 
                ? "No videos match your search" 
                : showArchived
                  ? "No archived videos"
                  : "No videos have been uploaded yet"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onSelectVideo(video)}
            >
              {/* Video Thumbnail */}
              <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
                <video
                  src={video.url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <PlayIcon className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Video Info */}
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">
                  {video.title}
                </h3>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    by {video.username}
                  </p>
                  
                  {/* Edit, Archive/Unarchive, and Delete Icons */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleEdit(video.id, e)}
                      className="text-gray-700 hover:text-blue-600 transition-colors"
                      title="Edit video"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    {showArchived ? (
                      <button
                        onClick={(e) => handleArchive(video.id, e)}
                        className="text-gray-700 hover:text-green-600 transition-colors"
                        title="Unarchive video"
                      >
                        <ArchiveBoxArrowDownIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleArchive(video.id, e)}
                        className="text-gray-700 hover:text-orange-600 transition-colors"
                        title="Archive video"
                      >
                        <ArchiveBoxIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(video.id, e)}
                      className="text-gray-700 hover:text-red-600 transition-colors"
                      title="Delete video"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Tags */}
                {video.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {video.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {video.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{video.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Comment Count */}
                {annotationCounts[video.id] > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      <span>{annotationCounts[video.id]} comment{annotationCounts[video.id] !== 1 ? 's' : ''}</span>
                    </div>
                    {isNewComments(video.id) && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-semibold">
                        NEW
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t">
                  <span>{formatDate(video.uploadedAt)}</span>
                  <span>{formatSize(video.size)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Archive Toggle Button */}
      {!showArchived ? (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setShowArchived(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-colors"
          >
            <ArchiveBoxIcon className="w-4 h-4" />
            View Archived Videos
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <button
            onClick={() => setShowArchived(false)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-colors"
          >
            ← Back to Library
          </button>
        </div>
      )}
    </div>
  )
}
