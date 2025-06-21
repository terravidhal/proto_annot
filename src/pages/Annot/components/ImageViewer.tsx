import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import type { ImageData, Annotation, Point, Label, TransformHandle } from '../types';
import { CanvasUtils } from '../utils/canvas';

interface ImageViewerProps {
  image: ImageData | null;
  activeTool: string;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (annotation: Annotation) => void;
  onAnnotationSelect: (id: string) => void;
  selectedAnnotation: string | null;
  visibleAnnotations: Set<string>;
  labels: Label[];
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  image,
  activeTool,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationSelect,
  selectedAnnotation,
  visibleAnnotations,
  labels
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  
  // Transform states
  const [transformHandle, setTransformHandle] = useState<TransformHandle | null>(null);
  const [transformStartPoint, setTransformStartPoint] = useState<Point | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [originalAnnotation, setOriginalAnnotation] = useState<Annotation | null>(null);
  
  // View states
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const [cursor, setCursor] = useState('default');
  
  // Rendering optimization - single source of truth
  const [renderState, setRenderState] = useState({
    needsRedraw: true,
    isRendering: false
  });

  // Preload and cache image with stable reference
  useEffect(() => {
    if (!image) {
      imageRef.current = null;
      return;
    }

    // Only create new image if URL changed
    if (!imageRef.current || imageRef.current.src !== image.url) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        requestRender();
      };
      img.onerror = () => {
        console.error('Failed to load image:', image.url);
      };
      img.src = image.url;
    }
  }, [image?.url]);

  // Optimized render request function
  const requestRender = useCallback(() => {
    if (renderState.isRendering) return;
    
    setRenderState(prev => ({ ...prev, needsRedraw: true }));
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (!renderState.needsRedraw) return;
      
      setRenderState({ needsRedraw: false, isRendering: true });
      performRender();
      setRenderState(prev => ({ ...prev, isRendering: false }));
    });
  }, [renderState.isRendering, renderState.needsRedraw]);

  // Stable render function
  const performRender = useCallback(() => {
    if (!image || !canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Disable image smoothing for crisp rendering
    ctx.imageSmoothingEnabled = false;
    
    // Clear with solid background - no transparency
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save context state
    ctx.save();
    
    try {
      // Apply view transformations
      ctx.scale(scale, scale);
      ctx.translate(offset.x, offset.y);
      
      // Draw image with stable reference
      ctx.drawImage(imageRef.current, 0, 0, image.width, image.height);
      
      // Draw all visible annotations in one pass
      const annotationsToDraw = image.annotations.filter(ann => visibleAnnotations.has(ann.id));
      
      annotationsToDraw.forEach(annotation => {
        const isSelected = selectedAnnotation === annotation.id;
        const showTransformHandles = isSelected && activeTool === 'select' && !isDrawing && !isTransforming && !isDragging;
        
        CanvasUtils.drawAnnotation(
          ctx, 
          annotation, 
          scale, 
          isSelected,
          false, // No labels on canvas
          showTransformHandles
        );
      });
      
      // Draw current annotation being created (only during drawing)
      if (currentAnnotation && isDrawing) {
        CanvasUtils.drawAnnotation(ctx, currentAnnotation, scale, true, false, false);
      }
      
    } catch (error) {
      console.error('Render error:', error);
    } finally {
      ctx.restore();
    }
  }, [image, scale, offset, currentAnnotation, selectedAnnotation, visibleAnnotations, activeTool, isDrawing, isTransforming, isDragging]);

  // Request render when dependencies change
  useEffect(() => {
    requestRender();
  }, [image, selectedAnnotation, visibleAnnotations, activeTool, scale, offset, currentAnnotation]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Initialize canvas and view
  useEffect(() => {
    if (!image || !canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Set canvas size to container size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
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
      // Check for transform handle first
      const selectedAnnotationObj = image.annotations.find(ann => ann.id === selectedAnnotation);
      if (selectedAnnotationObj && selectedAnnotationObj.bounds) {
        const handle = CanvasUtils.getHandleAtPoint(point, selectedAnnotationObj.bounds, 8 / scale);
        if (handle) {
          setIsTransforming(true);
          setTransformHandle(handle);
          setTransformStartPoint(point);
          setOriginalAnnotation({ ...selectedAnnotationObj });
          return;
        }
      }

      // Check for annotation dragging
      if (selectedAnnotationObj && CanvasUtils.isPointInAnnotation(point, selectedAnnotationObj)) {
        setIsDragging(true);
        setDragStartPoint(point);
        setOriginalAnnotation({ ...selectedAnnotationObj });
        return;
      }

      // Check for annotation selection
      const clickedAnnotation = image.annotations.find(annotation =>
        visibleAnnotations.has(annotation.id) && 
        CanvasUtils.isPointInAnnotation(point, annotation)
      );
      
      if (clickedAnnotation) {
        onAnnotationSelect(clickedAnnotation.id);
      } else {
        onAnnotationSelect('');
        // Start panning
        setIsPanning(true);
        setLastMousePos({ x: event.clientX, y: event.clientY });
      }
    } else {
      // Start drawing new annotation
      setIsDrawing(true);
      const newAnnotation: Annotation = {
        id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: activeTool as any,
        label: '',
        color: '#3B82F6',
        points: [point],
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      };
      setCurrentAnnotation(newAnnotation);
    }
  }, [image, activeTool, scale, offset, onAnnotationSelect, visibleAnnotations, selectedAnnotation]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!image || !canvasRef.current) return;
    
    const point = CanvasUtils.getPointInCanvas(
      event.nativeEvent, 
      canvasRef.current, 
      scale, 
      offset
    );

    // Update cursor (without triggering render)
    if (activeTool === 'select') {
      let newCursor = 'default';
      
      if (selectedAnnotation) {
        const selectedAnnotationObj = image.annotations.find(ann => ann.id === selectedAnnotation);
        if (selectedAnnotationObj && selectedAnnotationObj.bounds) {
          const handle = CanvasUtils.getHandleAtPoint(point, selectedAnnotationObj.bounds, 8 / scale);
          if (handle) {
            newCursor = CanvasUtils.getCursorForHandle(handle);
          } else if (CanvasUtils.isPointInAnnotation(point, selectedAnnotationObj)) {
            newCursor = 'move';
          }
        }
      }
      
      if (newCursor === 'default') {
        const hoveredAnnotation = image.annotations.find(annotation =>
          visibleAnnotations.has(annotation.id) && 
          CanvasUtils.isPointInAnnotation(point, annotation)
        );
        if (hoveredAnnotation) {
          newCursor = 'pointer';
        }
      }
      
      if (cursor !== newCursor) {
        setCursor(newCursor);
      }
    } else if (activeTool !== 'select' && cursor !== 'crosshair') {
      setCursor('crosshair');
    }
    
    // Handle interactions with batched updates
    let shouldRender = false;
    
    if (isPanning) {
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      
      setOffset(prev => ({
        x: prev.x + deltaX / scale,
        y: prev.y + deltaY / scale
      }));
      
      setLastMousePos({ x: event.clientX, y: event.clientY });
      shouldRender = true;
      
    } else if (isTransforming && transformHandle && transformStartPoint && originalAnnotation) {
      const transformedAnnotation = CanvasUtils.transformAnnotation(
        originalAnnotation,
        transformHandle,
        transformStartPoint,
        point
      );
      onAnnotationUpdate(transformedAnnotation);
      shouldRender = true;
      
    } else if (isDragging && dragStartPoint && originalAnnotation && originalAnnotation.bounds) {
      const deltaX = point.x - dragStartPoint.x;
      const deltaY = point.y - dragStartPoint.y;
      
      const draggedAnnotation = {
        ...originalAnnotation,
        bounds: {
          ...originalAnnotation.bounds,
          x: originalAnnotation.bounds.x + deltaX,
          y: originalAnnotation.bounds.y + deltaY
        },
        points: originalAnnotation.points.map(p => ({
          x: p.x + deltaX,
          y: p.y + deltaY
        }))
      };
      
      onAnnotationUpdate(draggedAnnotation);
      shouldRender = true;
      
    } else if (isDrawing && currentAnnotation) {
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
          const centerX = currentAnnotation.points[0].x;
          const centerY = currentAnnotation.points[0].y;
          const radiusX = Math.abs(point.x - centerX);
          const radiusY = Math.abs(point.y - centerY);
          updatedAnnotation.bounds = {
            x: centerX - radiusX,
            y: centerY - radiusY,
            width: radiusX * 2,
            height: radiusY * 2
          };
          break;
      }
      
      setCurrentAnnotation(updatedAnnotation);
      shouldRender = true;
    }
    
    // Single render request for all changes
    if (shouldRender) {
      requestRender();
    }
  }, [image, isDrawing, isPanning, isTransforming, isDragging, currentAnnotation, scale, offset, 
      lastMousePos, transformHandle, transformStartPoint, dragStartPoint, selectedAnnotation, 
      originalAnnotation, onAnnotationUpdate, activeTool, visibleAnnotations, cursor, requestRender]);

  const handleMouseUp = useCallback(() => {
    let shouldRender = false;
    
    if (isPanning) {
      setIsPanning(false);
    }
    
    if (isTransforming) {
      setIsTransforming(false);
      setTransformHandle(null);
      setTransformStartPoint(null);
      setOriginalAnnotation(null);
      shouldRender = true;
    }
    
    if (isDragging) {
      setIsDragging(false);
      setDragStartPoint(null);
      setOriginalAnnotation(null);
      shouldRender = true;
    }
    
    if (isDrawing && currentAnnotation) {
      setIsDrawing(false);
      
      // Only add annotation if it has meaningful size
      if (currentAnnotation.bounds && 
          currentAnnotation.bounds.width > 5 && 
          currentAnnotation.bounds.height > 5) {
        onAnnotationAdd(currentAnnotation);
      }
      setCurrentAnnotation(null);
      shouldRender = true;
    }
    
    if (shouldRender) {
      requestRender();
    }
  }, [isDrawing, isPanning, isTransforming, isDragging, currentAnnotation, onAnnotationAdd, requestRender]);

  // Zoom controls with render optimization
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(5, prev * 1.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(0.1, prev / 1.2));
  }, []);

  const handleResetView = useCallback(() => {
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
  }, [image]);

  const handleFitToScreen = useCallback(() => {
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
  }, [image]);

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
          {selectedAnnotation && (
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              Selected - Use handles to transform or drag to move
            </span>
          )}
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
        className="relative w-full h-full overflow-hidden bg-gray-100"
        style={{ 
          cursor: cursor,
          minHeight: '400px'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full block"
          style={{ 
            imageRendering: 'pixelated',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        />
      </div>
    </div>
  );
};