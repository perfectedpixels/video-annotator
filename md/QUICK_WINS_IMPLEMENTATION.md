# Quick Wins Implementation Plan

## 1. Comment Resolution ✓ (Schema Updated)
- [x] Add `resolved` boolean to Comment interface
- [ ] Add "Resolve" button to comments
- [ ] Show resolved comments with strikethrough or different styling
- [ ] Filter to show only unresolved comments
- [ ] Update server to persist resolved status

## 2. Video Status ✓ (Schema Updated)
- [x] Add `status` field to Video interface
- [ ] Add status dropdown in video player
- [ ] Show status badge in video library
- [ ] Color-code statuses (Draft=gray, Ready=blue, Approved=green, Needs Changes=orange)
- [ ] Update server to persist status

## 3. Keyboard Shortcuts
- [ ] Space: Play/Pause video
- [ ] Left/Right arrows: Skip 5 seconds
- [ ] Up/Down arrows: Volume control
- [ ] J/K/L: Rewind/Pause/Fast-forward (YouTube style)
- [ ] C: Add comment at current timestamp
- [ ] F: Toggle fullscreen
- [ ] M: Mute/unmute
- [ ] Show keyboard shortcuts help (? key)

## 4. Better Sharing (Thumbnail Previews)
- [ ] Generate video thumbnail on upload
- [ ] Add Open Graph meta tags for link previews
- [ ] Show thumbnail in share dialog
- [ ] Include video title, description in meta tags

## 5. Dark Mode
- [ ] Add dark mode toggle in header
- [ ] Persist preference in localStorage
- [ ] Update all components with dark mode classes
- [ ] Smooth transition between modes

## Implementation Order
1. Comment Resolution (30 min)
2. Video Status (30 min)
3. Keyboard Shortcuts (45 min)
4. Dark Mode (60 min)
5. Better Sharing (45 min)

Total: ~3.5 hours
