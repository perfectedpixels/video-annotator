import { useState, useRef, useEffect } from 'react'
import { 
  XMarkIcon, PencilIcon, ArrowDownTrayIcon, MapPinIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, 
  ArrowsPointingOutIcon, PaperAirplaneIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, CheckIcon 
} from '@heroicons/react/24/outline'
import { Button } from './ui/button'

interface Comment {
  id: string
  username: string
  text: string
  createdAt: number
  x?: number
  y?: number
  color?: string
}

interface PinMarker {
  x: number
  y: number
  id: string
  username: string
  color: string
  comments: Comment[]
}

interface DrawingState {
  imageData: ImageData
}

interface AnnotationModalProps {
  annotation: {
    id: string
    timestamp: number
    text: string
    screenshot: string
    username: string
    editedScreenshot?: string
    notes?: string
    comments?: Comment[]
  }
  transcript: string
  currentUsername: string  // Add current user's username
  onClose: () => void
  onSave: (editedScreenshot: string, notesOrText: string, comments?: Comment[]) => void
}

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
]

export function AnnotationModal({ annotation, currentUsername, onClose, onSave }: AnnotationModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<'pen' | 'marker'>('marker')
  const [color, setColor] = useState('#FF0000')
  const [lineWidth, setLineWidth] = useState(3)
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [markers, setMarkers] = useState<PinMarker[]>([])
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null)
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [showInitialInput, setShowInitialInput] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<DrawingState[]>([])
  const [redoStack, setRedoStack] = useState<DrawingState[]>([])

  // Keyboard shortcuts for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'TEXTAREA') {
        // Allow Escape to close even when in textarea
        if (e.key === 'Escape') {
          onClose()
        }
        return
      }

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Save when Enter is pressed (not in textarea)
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [markers]) // Include markers so handleClose has latest state

  // Load existing comments as markers when editing
  useEffect(() => {
    if (annotation.comments && annotation.comments.length > 0) {
      // Group comments by position to recreate markers
      const markerMap = new Map<string, PinMarker>()
      
      annotation.comments.forEach(comment => {
        const key = `${comment.x || 100}-${comment.y || 100}`
        
        if (!markerMap.has(key)) {
          markerMap.set(key, {
            x: comment.x || 100,
            y: comment.y || 100,
            id: `marker-${key}`,
            username: comment.username,
            color: comment.color || getRandomColor(),
            comments: []
          })
        }
        
        markerMap.get(key)!.comments.push(comment)
      })
      
      setMarkers(Array.from(markerMap.values()))
    }
  }, [annotation.comments])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // Maintain aspect ratio - use original dimensions
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      // Save initial state for undo
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setUndoStack([{ imageData }])
      setRedoStack([])
    }
    img.src = annotation.editedScreenshot || annotation.screenshot
  }, [annotation])

  const getRandomColor = () => {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  }

  const getUserInitial = (username: string) => {
    return username.charAt(0).toUpperCase()
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'marker') return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    
    // Calculate position relative to canvas, accounting for zoom
    const x = ((e.clientX - rect.left) / zoom) * (canvas.width / rect.width)
    const y = ((e.clientY - rect.top) / zoom) * (canvas.height / rect.height)

    const newMarker: PinMarker = {
      x,
      y,
      id: Date.now().toString(),
      username: currentUsername,  // Use current user's username
      color: getRandomColor(),
      comments: []
    }
    
    setMarkers([...markers, newMarker])
    setShowInitialInput(newMarker.id)
    setActiveMarkerId(newMarker.id)
  }

  const handleAddComment = (markerId: string) => {
    if (!newCommentText.trim()) return

    const newComment: Comment = {
      id: Date.now().toString(),
      username: currentUsername,  // Use current user's username
      text: newCommentText,
      createdAt: Date.now()
    }

    setMarkers(markers.map(m => 
      m.id === markerId 
        ? { ...m, comments: [...m.comments, newComment] }
        : m
    ))
    
    setNewCommentText('')
    setShowInitialInput(null)
    setActiveMarkerId(null)
  }

  const handleMarkerClick = (markerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMarkerId(activeMarkerId === markerId ? null : markerId)
    setHoveredMarkerId(null)
  }

  const saveDrawingState = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setUndoStack(prev => [...prev, { imageData }])
    setRedoStack([]) // Clear redo stack when new action is made
  }

  const handleUndo = () => {
    if (undoStack.length <= 1) return // Keep at least the initial state
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const currentState = undoStack[undoStack.length - 1]
    setRedoStack(prev => [...prev, currentState])
    
    const newUndoStack = undoStack.slice(0, -1)
    setUndoStack(newUndoStack)
    
    const previousState = newUndoStack[newUndoStack.length - 1]
    ctx.putImageData(previousState.imageData, 0, 0)
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const stateToRestore = redoStack[redoStack.length - 1]
    setUndoStack(prev => [...prev, stateToRestore])
    setRedoStack(prev => prev.slice(0, -1))
    
    ctx.putImageData(stateToRestore.imageData, 0, 0)
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'marker') return
    
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / (rect.width * zoom)
    const scaleY = canvas.height / (rect.height * zoom)
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'marker') return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / (rect.width * zoom)
    const scaleY = canvas.height / (rect.height * zoom)
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      saveDrawingState()
    }
    setIsDrawing(false)
  }

  const handleClose = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const editedScreenshot = canvas.toDataURL('image/png')
    
    // Extract all comments from markers with their positions
    const allComments = markers.flatMap(m => 
      m.comments.map(c => ({
        ...c,
        x: m.x,
        y: m.y,
        color: m.color
      }))
    )
    
    // Create a summary text for the annotation
    const summaryText = allComments.length > 0 
      ? `${allComments.length} comment${allComments.length !== 1 ? 's' : ''} added`
      : 'Annotation with markers'
    
    // Pass both the screenshot and comments data
    onSave(editedScreenshot, summaryText, allComments)
    onClose()
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `annotation-${annotation.timestamp}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg w-full max-h-[90vh] overflow-y-auto ${isFullscreen ? 'max-w-[95vw]' : 'max-w-7xl'}`}>
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold">Add Comments</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Tools */}
          <div className="mb-4 flex gap-2 flex-wrap items-center justify-between">
            <div className="flex gap-2 items-center">
              <Button
                size="sm"
                variant={tool === 'marker' ? 'default' : 'outline'}
                onClick={() => setTool('marker')}
              >
                <MapPinIcon className="w-4 h-4 mr-1" />
                Pin
              </Button>
              <Button
                size="sm"
                variant={tool === 'pen' ? 'default' : 'outline'}
                onClick={() => setTool('pen')}
              >
                <PencilIcon className="w-4 h-4 mr-1" />
                Draw
              </Button>
              
              {tool === 'pen' && (
                <>
                  <button
                    type="button"
                    onClick={() => document.getElementById('color-picker')?.click()}
                    className="w-10 h-10 rounded border-2 border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center"
                    style={{ backgroundColor: color }}
                    title="Choose color"
                  >
                    <input
                      id="color-picker"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-0 h-0 opacity-0 absolute"
                    />
                  </button>
                  
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">{lineWidth}px</span>
                  
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUndo}
                      disabled={undoStack.length <= 1}
                      title="Undo"
                    >
                      <ArrowUturnLeftIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRedo}
                      disabled={redoStack.length === 0}
                      title="Redo"
                    >
                      <ArrowUturnRightIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                <MagnifyingGlassMinusIcon className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2 py-1 bg-gray-100 rounded">{Math.round(zoom * 100)}%</span>
              <Button size="sm" variant="outline" onClick={handleZoomIn} disabled={zoom >= 3}>
                <MagnifyingGlassPlusIcon className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={toggleFullscreen}>
                <ArrowsPointingOutIcon className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <ArrowDownTrayIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Canvas with markers overlay */}
          <div className="relative">
            <div 
              ref={containerRef}
              className="border border-gray-300 rounded-lg overflow-auto relative"
              style={{ maxHeight: isFullscreen ? '70vh' : '600px', maxWidth: '100%' }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onClick={handleCanvasClick}
                className="cursor-crosshair"
                style={{ 
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  cursor: tool === 'marker' 
                    ? 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwNDg4ZGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOS02LTktMTNhOSA5IDAgMCAxIDE4IDB6Ij48L3BhdGg+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyI+PC9jaXJjbGU+PC9zdmc+") 12 24, pointer' 
                    : 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJtMTYuODYyIDQuNDg3IDEuNjg3LTEuNjg4YTEuODc1IDEuODc1IDAgMSAxIDIuNjUyIDIuNjUyTDEwLjU4MiAxNi4wN2EzLjM3NSAzLjM3NSAwIDAgMS0xLjQxNi44MzJsLTMuNDU3Ljg2NS44NjUtMy40NThhMy4zNzUgMy4zNzUgMCAwIDEgLjgzLTEuNDE1bDkuNTM4LTkuNTRaIi8+PHBhdGggZD0ibTE2Ljg2IDQuNDg4IDMuNjUzIDMuNjUyIi8+PC9zdmc+") 2 22, crosshair',
                  display: 'block'
                }}
              />
              
              {/* Marker overlays */}
              {markers.map((marker) => {
                const canvas = canvasRef.current
                if (!canvas) return null
                
                const rect = canvas.getBoundingClientRect()
                const containerRect = containerRef.current?.getBoundingClientRect()
                if (!containerRect) return null
                
                const displayX = (marker.x / canvas.width) * rect.width * zoom + (rect.left - containerRect.left)
                const displayY = (marker.y / canvas.height) * rect.height * zoom + (rect.top - containerRect.top)
                
                // Check if marker is near the top (within 190px)
                const isNearTop = marker.y <= 190
                
                const isActive = activeMarkerId === marker.id
                const isHovered = hoveredMarkerId === marker.id
                const showInput = showInitialInput === marker.id
                
                return (
                  <div
                    key={marker.id}
                    style={{
                      position: 'absolute',
                      left: `${displayX}px`,
                      top: isNearTop ? `${displayY + 40}px` : `${displayY - 40}px`,
                      transform: isNearTop ? 'translate(-50%, 0%)' : 'translate(-50%, -100%)',
                      zIndex: isActive ? 1000 : 100
                    }}
                  >
                    {/* Avatar circle */}
                    {!showInput && marker.comments.length > 0 && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer shadow-lg"
                        style={{ backgroundColor: marker.color }}
                        onClick={(e) => handleMarkerClick(marker.id, e)}
                        onMouseEnter={() => setHoveredMarkerId(marker.id)}
                        onMouseLeave={() => setHoveredMarkerId(null)}
                      >
                        {getUserInitial(marker.username)}
                      </div>
                    )}
                    
                    {/* Initial comment input */}
                    {showInput && (
                      <div className="bg-white rounded-lg shadow-xl p-3 w-64" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          autoFocus
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={3}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleAddComment(marker.id)
                            } else if (e.key === 'Escape') {
                              e.preventDefault()
                              setShowInitialInput(null)
                              setMarkers(markers.filter(m => m.id !== marker.id))
                            }
                          }}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            setShowInitialInput(null)
                            setMarkers(markers.filter(m => m.id !== marker.id))
                          }}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleAddComment(marker.id)} className="bg-purple-600 hover:bg-purple-700">
                            <PaperAirplaneIcon className="w-3 h-3 mr-1" />
                            Post
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Hover preview */}
                    {isHovered && !isActive && marker.comments.length > 0 && (
                      <div className={`absolute ${isNearTop ? 'top-full mt-2' : 'bottom-full mb-2'} bg-white rounded-lg shadow-xl p-3 w-64 pointer-events-none`}>
                        <div className="flex items-start gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                            style={{ backgroundColor: marker.color }}
                          >
                            {getUserInitial(marker.username)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900">{marker.username}</p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{marker.comments[0].text}</p>
                            {marker.comments.length > 1 && (
                              <p className="text-xs text-gray-400 mt-1">{marker.comments.length - 1} reply</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Full comment thread */}
                    {isActive && marker.comments.length > 0 && (
                      <div className={`absolute ${isNearTop ? 'top-full mt-2' : 'bottom-full mb-2'} bg-white rounded-lg shadow-2xl w-80 max-h-96 overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center">
                          <h3 className="font-semibold">Comment</h3>
                          <button onClick={() => setActiveMarkerId(null)} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4 space-y-4">
                          {marker.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-2">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                                style={{ backgroundColor: marker.color }}
                              >
                                {getUserInitial(comment.username)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                  <p className="text-sm font-semibold">{comment.username}</p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-700 mt-1">{comment.text}</p>
                              </div>
                            </div>
                          ))}
                          
                          {/* Reply input */}
                          <div className="flex gap-2 pt-2 border-t">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                              style={{ backgroundColor: marker.color }}
                            >
                              {getUserInitial(currentUsername)}
                            </div>
                            <div className="flex-1">
                              <textarea
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                placeholder="Reply..."
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                rows={2}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleAddComment(marker.id)
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    setActiveMarkerId(null)
                                    setNewCommentText('')
                                  }
                                }}
                              />
                              <div className="flex justify-end mt-1">
                                <Button size="sm" onClick={() => handleAddComment(marker.id)} disabled={!newCommentText.trim()}>
                                  Reply
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {tool === 'marker' && (
              <p className="text-xs text-gray-500 mt-2">
                Click on the image to drop a pin marker and add a comment
              </p>
            )}
          </div>

          {/* Save and Cancel buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClose}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              Save Comments
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
