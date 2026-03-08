import fetch from 'node-fetch';

class FigmaService {
  constructor() {
    this.accessToken = process.env.FIGMA_ACCESS_TOKEN;
    this.apiBase = 'https://api.figma.com/v1';
  }

  async createFile(fileName, annotations, videoTitle) {
    if (!this.accessToken) {
      throw new Error('Figma access token not configured. Please set FIGMA_ACCESS_TOKEN in .env');
    }

    try {
      // First, we need to upload images to Figma
      const imageNodes = await this.prepareImageNodes(annotations);
      
      // Create the file structure
      const fileData = {
        name: `${videoTitle} - Video Annotations`,
        document: {
          type: 'CANVAS',
          children: [
            {
              type: 'FRAME',
              name: 'Video Annotations',
              backgroundColor: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
              children: imageNodes
            }
          ]
        }
      };

      // Note: Figma's REST API doesn't support direct file creation
      // We need to use the Figma Plugin API or create via their web interface
      // For now, we'll create a FigJam file which has better API support
      
      const response = await fetch(`${this.apiBase}/files`, {
        method: 'POST',
        headers: {
          'X-Figma-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fileData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Figma API error: ${error.message || response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Figma service error:', error);
      throw error;
    }
  }

  async prepareImageNodes(annotations) {
    const nodes = [];
    let yOffset = 0;
    const spacing = 100;

    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i];
      
      // Create image node
      const imageNode = {
        type: 'RECTANGLE',
        name: `Screenshot ${i + 1}`,
        x: 0,
        y: yOffset,
        width: 800,
        height: 600,
        fills: [{
          type: 'IMAGE',
          imageRef: annotation.editedScreenshot || annotation.screenshot,
          scaleMode: 'FIT'
        }]
      };

      nodes.push(imageNode);

      // Create text node for comments
      if (annotation.comments && annotation.comments.length > 0) {
        const commentsText = annotation.comments
          .map(c => `${c.username}: ${c.text}`)
          .join('\n\n');

        const textNode = {
          type: 'TEXT',
          name: `Comments ${i + 1}`,
          x: 850,
          y: yOffset,
          width: 400,
          characters: commentsText,
          style: {
            fontSize: 14,
            fontFamily: 'Inter',
            fontWeight: 400
          }
        };

        nodes.push(textNode);
      }

      yOffset += 700 + spacing;
    }

    return nodes;
  }

  // Alternative: Export as Figma-compatible JSON
  async exportAsFigmaJSON(annotations, videoTitle) {
    const figmaJSON = {
      name: `${videoTitle} - Video Annotations`,
      lastModified: new Date().toISOString(),
      version: '1.0',
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [
          {
            id: '0:1',
            name: 'Page 1',
            type: 'CANVAS',
            backgroundColor: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
            prototypeStartNodeID: null,
            children: await this.createAnnotationFrames(annotations)
          }
        ]
      }
    };

    return figmaJSON;
  }

  async createAnnotationFrames(annotations) {
    const frames = [];
    let yOffset = 0;
    const spacing = 100;

    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i];
      
      const frame = {
        id: `1:${i + 1}`,
        name: `Annotation ${i + 1} - ${this.formatTime(annotation.timestamp)}`,
        type: 'FRAME',
        x: 0,
        y: yOffset,
        width: 1280,
        height: 800,
        backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
        children: [
          // Screenshot
          {
            id: `2:${i * 10 + 1}`,
            name: 'Screenshot',
            type: 'RECTANGLE',
            x: 20,
            y: 20,
            width: 800,
            height: 600,
            fills: [{
              type: 'IMAGE',
              imageRef: annotation.editedScreenshot || annotation.screenshot,
              scaleMode: 'FIT'
            }]
          },
          // Comments section
          ...(annotation.comments && annotation.comments.length > 0 ? [{
            id: `2:${i * 10 + 2}`,
            name: 'Comments',
            type: 'FRAME',
            x: 850,
            y: 20,
            width: 400,
            height: 600,
            backgroundColor: { r: 0.98, g: 0.98, b: 0.98, a: 1 },
            children: annotation.comments.map((comment, idx) => ({
              id: `3:${i * 100 + idx}`,
              name: `Comment ${idx + 1}`,
              type: 'TEXT',
              x: 20,
              y: 20 + (idx * 80),
              width: 360,
              characters: `${comment.username}:\n${comment.text}`,
              style: {
                fontSize: 14,
                fontFamily: 'Inter',
                fontWeight: 400,
                lineHeight: { value: 150, unit: 'PERCENT' }
              }
            }))
          }] : [])
        ]
      };

      frames.push(frame);
      yOffset += 900 + spacing;
    }

    return frames;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

const figmaService = new FigmaService();
export default figmaService;
