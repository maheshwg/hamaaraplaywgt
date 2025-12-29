# Video Showcase Section - Video Files

This directory contains the demo videos displayed in the Video Showcase section on the landing page.

## Required Videos

Place the following video files in this directory:

1. **ai-test-generation.mp4** - Demo of AI automatically generating test cases
2. **natural-language.mp4** - Demo of writing tests in plain English
3. **auto-healing.mp4** - Demo of self-healing tests adapting to UI changes
4. **parallel-execution.mp4** - Demo of running tests in parallel
5. **visual-testing.mp4** - Demo of visual regression testing
6. **api-testing.mp4** - Demo of API testing integration

## Video Specifications

### Recommended:
- **Format:** MP4 (H.264 codec)
- **Resolution:** 1920x1080 (Full HD) or 1280x720 (HD)
- **Duration:** 1-3 minutes per video
- **Aspect Ratio:** 16:9
- **File Size:** Under 50MB per video for optimal loading
- **Frame Rate:** 30fps or 60fps

### Optimization Tips:
1. Use a video compression tool like HandBrake to reduce file size
2. Consider adding captions/text overlays to explain features
3. Keep audio optional (videos autoplay muted)
4. Add smooth transitions between scenes
5. Show real product interface (screen recordings)

## Placeholder Videos

If you don't have videos ready yet, you can use placeholder videos or screen recordings:

1. **Record your screen** showing the actual product features
2. **Use OBS Studio** (free) or QuickTime (Mac) for screen recording
3. **Edit with iMovie** (Mac), DaVinci Resolve (free), or Adobe Premiere Pro
4. **Add text overlays** to highlight key features

## Adding New Video Tabs

To add a new video tab, edit `/src/components/landing/VideoShowcaseSection.jsx`:

```javascript
const videoTabs = [
  // ... existing tabs ...
  {
    id: 'your-new-feature',
    title: 'Your New Feature',
    description: 'Description of the feature',
    videoUrl: '/videos/your-new-feature.mp4',
    icon: YourIcon, // Import from lucide-react
    color: 'from-color-500 to-color-500' // Tailwind gradient
  }
];
```

## Current Video Tabs

1. ✨ **AI Test Generation** (Violet/Purple gradient)
2. ⚡ **Natural Language Tests** (Blue/Cyan gradient)
3. 🛡️ **Self-Healing Tests** (Emerald/Green gradient)
4. 🚀 **Parallel Execution** (Orange/Red gradient)
5. 🎯 **Visual Testing** (Pink/Rose gradient)
6. 💻 **API Integration** (Indigo/Blue gradient)

## Video Player Features

- **Auto-play on tab switch** - Videos start automatically when tab is selected
- **Muted by default** - Videos play without sound initially
- **Looping** - Videos repeat continuously
- **Native controls** - Users can play/pause/seek/unmute
- **Smooth transitions** - Fade animation between video switches
- **Responsive** - Works on all screen sizes

## Testing Videos Locally

1. Place video files in `public/videos/`
2. Run the dev server: `npm run dev`
3. Visit the home page
4. Click on different tabs to test video switching
5. Check browser console for any loading errors

## Production Deployment

Videos in `/public/videos/` will be automatically included in the production build and served from the root URL path.

Make sure your hosting provider can handle video files:
- Verify file size limits
- Consider using a CDN for better performance
- Optionally use video hosting services (YouTube, Vimeo, Wistia) if preferred

## CDN Alternative (Optional)

If you prefer to host videos on a CDN or video platform:

1. Upload videos to your CDN/platform
2. Update the `videoUrl` in `VideoShowcaseSection.jsx` with the CDN URLs
3. For YouTube/Vimeo, you'll need to modify the video player component to use their embed API

Example:
```javascript
videoUrl: 'https://your-cdn.com/videos/ai-test-generation.mp4'
```


