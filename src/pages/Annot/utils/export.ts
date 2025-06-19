import type  { ImageData, ExportData } from '../types';

export class ExportUtils {
  static exportToJSON(images: ImageData[]): string {
    const exportData: ExportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      images: images.map(img => ({
        filename: img.name,
        annotations: img.annotations
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  static downloadJSON(data: string, filename: string = 'annotations.json') {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async exportImageWithAnnotations(
    imageData: ImageData,
    canvas: HTMLCanvasElement
  ): Promise<string> {
    return new Promise((resolve) => {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      
      // Draw original image
      const img = new Image();
      img.onload = () => {
        tempCtx.drawImage(img, 0, 0);
        
        // Draw annotations
        imageData.annotations.forEach(annotation => {
          const utils = require('./canvas').CanvasUtils;
          utils.drawAnnotation(tempCtx, annotation, 1, false);
        });
        
        resolve(tempCanvas.toDataURL('image/png'));
      };
      img.src = imageData.url;
    });
  }

  static downloadImage(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  static async createZipExport(images: ImageData[]): Promise<void> {
    // For a simple implementation without external libraries,
    // we'll download files individually
    const jsonData = this.exportToJSON(images);
    this.downloadJSON(jsonData, 'medical_annotations.json');
    
    // Note: In a production environment, you would use a library like JSZip
    // to create actual zip files with all images and annotations
  }
}