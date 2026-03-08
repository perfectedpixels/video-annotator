# Workspace Implementation Plan

## Overview
Add workspace-based filtering where URLs like `/aws`, `/hodgkin`, `/demo`, `/uw` show only videos uploaded to that workspace.

## Workspaces
- `/` - All videos (default)
- `/aws` - AWS workspace
- `/hodgkin` - Hodgkin workspace  
- `/demo` - Demo workspace
- `/uw` - UW workspace

## Changes Needed

### 1. Frontend Routing (src/main.tsx)
- Wrap App in BrowserRouter
- Add workspace context

### 2. App Component (src/App.tsx)
- Extract workspace from URL path
- Pass workspace to VideoLibrary and VideoUploadForm
- Update navigation to preserve workspace

### 3. VideoUploadForm (src/components/VideoUploadForm.tsx)
- Accept workspace prop
- Include workspace in upload payload

### 4. VideoLibrary (src/components/VideoLibrary.tsx)
- Accept workspace prop
- Filter videos by workspace
- Show workspace indicator

### 5. Backend (server/index.js)
- Add workspace field to video metadata
- Filter API responses by workspace query param

### 6. UI Enhancements
- Add workspace selector/indicator in header
- Show current workspace in navigation
- Add workspace badge to video cards
