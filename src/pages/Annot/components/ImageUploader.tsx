import React, { useCallback } from 'react';
import { Upload, FileImage, X } from 'lucide-react';
import type { ImageData } from '../types';

interface ImageUploaderProps {
  images: ImageData[];
  onImagesUpload: (images: ImageData[]) => void;
  onImageRemove: (imageId: string) => void;
  currentImageIndex: number;
  onImageSelect: (index: number) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onImagesUpload,
  onImageRemove,
  currentImageIndex,
  onImageSelect
}) => {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    Promise.all(
      imageFiles.map(file => {
        return new Promise<ImageData>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              // Create thumbnail
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d')!;
              const thumbSize = 100;
              canvas.width = thumbSize;
              canvas.height = thumbSize;
              
              const scale = Math.min(thumbSize / img.width, thumbSize / img.height);
              const width = img.width * scale;
              const height = img.height * scale;
              const x = (thumbSize - width) / 2;
              const y = (thumbSize - height) / 2;
              
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(0, 0, thumbSize, thumbSize);
              ctx.drawImage(img, x, y, width, height);
              
              resolve({
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                url: e.target?.result as string,
                width: img.width,
                height: img.height,
                annotations: [],
                thumbnail: canvas.toDataURL('image/jpeg', 0.8)
              });
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      })
    ).then(onImagesUpload);
    
    // Reset input
    event.target.value = '';
  }, [onImagesUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      const event = { target: { files: imageFiles } } as any;
      handleFileUpload(event);
    }
  }, [handleFileUpload]);

  const handleImageClick = (index: number) => {
    onImageSelect(index);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <FileImage className="w-5 h-5 mr-2" />
        Medical Images
      </h2>
      
      {images.length === 0 ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('image-upload')?.click()}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Upload medical images to begin annotation</p>
          <p className="text-sm text-gray-500">Drag and drop images here, or click to browse</p>
          <p className="text-xs text-gray-400 mt-2">Supports: PNG, JPEG, JPG</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map((image, index) => (
            <div key={image.id} className="relative group">
              <div 
                className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                  currentImageIndex === index 
                    ? 'border-blue-500 ring-2 ring-blue-200' 
                    : 'border-gray-200 hover:border-blue-400'
                }`}
                onClick={() => handleImageClick(index)}
              >
                <img
                  src={image.thumbnail}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageRemove(image.id);
                  }}
                  className="absolute -top-3 right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1 truncate">{image.name}</p>
              <p className="text-xs text-gray-400">
                {image.annotations.length} annotations
              </p>
            </div>
          ))}
          
          <div
            className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      )}
      
      <input
        id="image-upload"
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};