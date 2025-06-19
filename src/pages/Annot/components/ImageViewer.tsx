import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import type { ImageData, Annotation, Point, Label } from '../types';
import { CanvasUtils } from '../utils/canvas';

interface ImageViewerProps {
  image: ImageData | null;
  activeTool: string;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationSelect: (id: string) => void;
  selectedAnnotation: string | null;
  visibleAnnotations: Set<string>;
  labels: Label[];
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  image,
  activeTool,
  onAnnotationAdd,
  onAnnotationSelect,
  selectedAnnotation,
  visibleAnnotations,
  labels
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });

  const draw = useCallback(() => {
    if (!image || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context
    ctx.save();
    
    // Apply transformations
    ctx.scale(scale, scale);
    ctx.translate(offset.x, offset.y);
    
    // Draw image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      
      // Draw annotations (without labels)
      image.annotations.forEach(annotation => {
        if (visibleAnnotations.has(annotation.id)) {
          CanvasUtils.drawAnnotation(
            ctx, 
            annotation, 
            scale, 
            selectedAnnotation === annotation.id,
            false // Don't show labels on canvas
          );
        }
      });
      
      // Draw current annotation being created
      if (currentAnnotation) {
        CanvasUtils.drawAnnotation(ctx, currentAnnotation, scale, true, false);
      }
      
      ctx.restore();
    };
    img.src = image.url;
  }, [image, scale, offset, currentAnnotation, selectedAnnotation, visibleAnnotations]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (!image || !canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Set canvas size to container size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Calculate initial scale to fit image
    const scaleX = canvas.width / image.width;
    const scaleY = canvas.height / image.height;
    const initialScale = Math.min(scaleX, scaleY, 1);
    
    setScale(initialScale);
    setOffset({
      x: (canvas.width / initialScale - image.width) / 2,
      y: (canvas.height / initialScale - image.height) / 2
    });
  }, [image]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!image || !canvasRef.current) return;
    
    const point = CanvasUtils.getPointInCanvas(
      event.nativeEvent, 
      canvasRef.current, 
      scale, 
      offset
    );
    
    if (activeTool === 'select') {
      // Check if clicking on an annotation
      const clickedAnnotation = image.annotations.find(annotation =>
        visibleAnnotations.has(annotation.id) && 
        CanvasUtils.isPointInAnnotation(point, annotation)
      );
      
      if (clickedAnnotation) {
        onAnnotationSelect(clickedAnnotation.id);
      } else {
        setIsPanning(true);
        setLastMousePos({ x: event.clientX, y: event.clientY });
      }
    } else {
      // Start drawing
      setIsDrawing(true);
      const newAnnotation: Annotation = {
        id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: activeTool as any,
        label: '', // Will be set later via dropdown in annotation list
        color: '#3B82F6', // Default blue color
        points: [point]
      };
      setCurrentAnnotation(newAnnotation);
    }
  }, [image, activeTool, scale, offset, onAnnotationSelect, visibleAnnotations]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!image || !canvasRef.current) return;
    
    if (isPanning) {
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      
      setOffset(prev => ({
        x: prev.x + deltaX / scale,
        y: prev.y + deltaY / scale
      }));
      
      setLastMousePos({ x: event.clientX, y: event.clientY });
    } else if (isDrawing && currentAnnotation) {
      const point = CanvasUtils.getPointInCanvas(
        event.nativeEvent, 
        canvasRef.current, 
        scale, 
        offset
      );
      
      let updatedAnnotation = { ...currentAnnotation };
      
      switch (currentAnnotation.type) {
        case 'rectangle':
          updatedAnnotation.points = [currentAnnotation.points[0], point];
          updatedAnnotation.bounds = {
            x: Math.min(currentAnnotation.points[0].x, point.x),
            y: Math.min(currentAnnotation.points[0].y, point.y),
            width: Math.abs(point.x - currentAnnotation.points[0].x),
            height: Math.abs(point.y - currentAnnotation.points[0].y)
          };
          break;
        case 'circle':
          updatedAnnotation.points = [currentAnnotation.points[0], point];
          break;
      }
      
      setCurrentAnnotation(updatedAnnotation);
    }
  }, [image, isDrawing, isPanning, currentAnnotation, scale, offset, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }
    
    if (isDrawing && currentAnnotation) {
      setIsDrawing(false);
      
      // Add annotation directly without popup
      onAnnotationAdd(currentAnnotation);
      setCurrentAnnotation(null);
    }
  }, [isDrawing, isPanning, currentAnnotation, onAnnotationAdd]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(5, prev * 1.2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.1, prev / 1.2));
  };

  const handleResetView = () => {
    if (!image || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const scaleX = canvas.width / image.width;
    const scaleY = canvas.height / image.height;
    const newScale = Math.min(scaleX, scaleY, 1);
    
    setScale(newScale);
    setOffset({
      x: (canvas.width / newScale - image.width) / 2,
      y: (canvas.height / newScale - image.height) / 2
    });
  };

  const handleFitToScreen = () => {
    if (!image || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const scaleX = canvas.width / image.width;
    const scaleY = canvas.height / image.height;
    const newScale = Math.min(scaleX, scaleY);
    
    setScale(newScale);
    setOffset({
      x: (canvas.width / newScale - image.width) / 2,
      y: (canvas.height / newScale - image.height) / 2
    });
  };

  if (!image) {
    return (
      <div className="flex-1 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
        <p className="text-gray-500">Select an image to begin annotation</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900">{image.name}</h3>
          <span className="text-xs text-gray-500">
            {image.width} × {image.height}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomOut}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitToScreen}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Canvas */}
      <div 
        ref={containerRef}
        className="relative w-full h-full overflow-hidden cursor-crosshair"
        style={{ 
          cursor: activeTool === 'select' ? 'default' : 'crosshair',
          minHeight: '400px'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};