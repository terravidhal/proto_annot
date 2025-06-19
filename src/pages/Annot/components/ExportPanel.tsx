import React from 'react';
import { Download, FileImage, FileText, Package } from 'lucide-react';
import type { ImageData } from '../types';
import { ExportUtils } from '../utils/export';
import { CanvasUtils } from '../utils/canvas';

interface ExportPanelProps {
  images: ImageData[];
  currentImage: ImageData | null;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ images, currentImage }) => {
  const handleExportJSON = () => {
    const jsonData = ExportUtils.exportToJSON(images);
    ExportUtils.downloadJSON(jsonData);
  };

  const handleExportCurrentImage = async () => {
    if (!currentImage) return;
    
    // Create a temporary canvas to render the image with annotations
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = currentImage.width;
    canvas.height = currentImage.height;
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      
      // Draw annotations
      currentImage.annotations.forEach(annotation => {
        CanvasUtils.drawAnnotation(ctx, annotation, 1, false);
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const filename = `${currentImage.name.split('.')[0]}_annotated.png`;
      ExportUtils.downloadImage(dataUrl, filename);
    };
    img.src = currentImage.url;
  };

  const handleExportAll = () => {
    ExportUtils.createZipExport(images);
  };

  const getTotalAnnotations = () => {
    return images.reduce((total, img) => total + img.annotations.length, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
        <Download className="w-4 h-4 mr-2" />
        Export Options
      </h3>
      
      <div className="space-y-4">
        {/* Statistics */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Images</p>
              <p className="font-semibold text-gray-900">{images.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Annotations</p>
              <p className="font-semibold text-gray-900">{getTotalAnnotations()}</p>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleExportJSON}
            disabled={images.length === 0}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export JSON Annotations
          </button>
          
          <button
            onClick={handleExportCurrentImage}
            disabled={!currentImage || currentImage.annotations.length === 0}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileImage className="w-4 h-4 mr-2" />
            Export Current Image
          </button>
          
          <button
            onClick={handleExportAll}
            disabled={images.length === 0 || getTotalAnnotations() === 0}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Package className="w-4 h-4 mr-2" />
            Export All Data
          </button>
        </div>

        {/* Format Information */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>JSON:</strong> Structured annotation data for analysis</p>
          <p><strong>PNG:</strong> Visual overlay on original image</p>
          <p><strong>All Data:</strong> Complete export package</p>
        </div>
      </div>
    </div>
  );
};