import React, { useState, useEffect, useCallback } from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import { ImageViewer } from './components/ImageViewer';
import { ToolPanel } from './components/ToolPanel';
import { AnnotationList } from './components/AnnotationList';
import { ExportPanel } from './components/ExportPanel';
import type { ImageData, Annotation, Label } from './types';

const medicalLabels: Label[] = [
  { name: 'Normal Tissue', color: '#10B981', description: 'Healthy tissue region' },
  { name: 'Tumor', color: '#EF4444', description: 'Malignant or suspicious mass' },
  { name: 'Lesion', color: '#F59E0B', description: 'Abnormal tissue change' },
  { name: 'Inflammation', color: '#F97316', description: 'Inflammatory region' },
  { name: 'Calcification', color: '#8B5CF6', description: 'Calcium deposits' },
  { name: 'Fibrosis', color: '#06B6D4', description: 'Fibrous tissue' },
  { name: 'Necrosis', color: '#64748B', description: 'Dead tissue area' },
  { name: 'Blood Vessel', color: '#DC2626', description: 'Vascular structure' },
  { name: 'Organ Boundary', color: '#059669', description: 'Anatomical boundary' },
  { name: 'Artifact', color: '#6B7280', description: 'Imaging artifact' }
];

function ImageAnnotationTool() {
  // State management
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTool, setActiveTool] = useState('select');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [visibleAnnotations, setVisibleAnnotations] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<ImageData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const currentImage = images[currentImageIndex] || null;

  // Initialize visible annotations when images change
  useEffect(() => {
    if (images.length > 0) {
      const allAnnotationIds = new Set<string>();
      images.forEach(img => {
        img.annotations.forEach(ann => allAnnotationIds.add(ann.id));
      });
      setVisibleAnnotations(allAnnotationIds);
    }
  }, [images]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            handleUndo();
            break;
          case 'y':
            event.preventDefault();
            handleRedo();
            break;
          case 's':
            event.preventDefault();
            handleSave();
            break;
        }
      } else {
        switch (event.key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            break;
          case 'r':
            setActiveTool('rectangle');
            break;
          case 'c':
            setActiveTool('circle');
            break;
          case 'arrowleft':
            if (images.length > 1) {
              setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
            }
            break;
          case 'arrowright':
            if (images.length > 1) {
              setCurrentImageIndex(prev => (prev + 1) % images.length);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length]);

  // Save to history
  const saveToHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(images)));
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [images, historyIndex]);

  // Event handlers
  const handleImagesUpload = (newImages: ImageData[]) => {
    setImages(prev => [...prev, ...newImages]);
    if (images.length === 0 && newImages.length > 0) {
      setCurrentImageIndex(0);
    }
    saveToHistory();
  };

  const handleImageRemove = (imageId: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== imageId);
      if (currentImageIndex >= filtered.length) {
        setCurrentImageIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
    saveToHistory();
  };

  const handleImageSelect = (index: number) => {
    setCurrentImageIndex(index);
  };

  const handleAnnotationAdd = (annotation: Annotation) => {
    if (!currentImage) return;

    setImages(prev => prev.map(img => 
      img.id === currentImage.id
        ? { ...img, annotations: [...img.annotations, annotation] }
        : img
    ));
    
    setVisibleAnnotations(prev => new Set([...prev, annotation.id]));
    saveToHistory();
  };

  const handleAnnotationSelect = (id: string) => {
    setSelectedAnnotation(prev => prev === id ? null : id);
  };

  const handleAnnotationDelete = (id: string) => {
    if (!currentImage) return;

    setImages(prev => prev.map(img => 
      img.id === currentImage.id
        ? { ...img, annotations: img.annotations.filter(ann => ann.id !== id) }
        : img
    ));
    
    setVisibleAnnotations(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    if (selectedAnnotation === id) {
      setSelectedAnnotation(null);
    }
    
    saveToHistory();
  };

  const handleAnnotationLabelChange = (id: string, newLabel: string) => {
    if (!currentImage) return;

    const labelColor = medicalLabels.find(l => l.name === newLabel)?.color || '#3B82F6';

    setImages(prev => prev.map(img => 
      img.id === currentImage.id
        ? { 
            ...img, 
            annotations: img.annotations.map(ann => 
              ann.id === id 
                ? { ...ann, label: newLabel, color: labelColor }
                : ann
            )
          }
        : img
    ));
    
    saveToHistory();
  };

  const handleAnnotationToggleVisibility = (id: string) => {
    setVisibleAnnotations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setImages(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setImages(history[historyIndex + 1]);
    }
  };

  const handleSave = () => {
    // Auto-save functionality - in a real app, this would save to a server
    localStorage.setItem('medicalAnnotations', JSON.stringify(images));
    console.log('Annotations saved to localStorage');
  };

  // Load saved data on startup
  useEffect(() => {
    const saved = localStorage.getItem('medicalAnnotations');
    if (saved) {
      try {
        const parsedImages = JSON.parse(saved);
        setImages(parsedImages);
        if (parsedImages.length > 0) {
          setCurrentImageIndex(0);
        }
      } catch (error) {
        console.error('Error loading saved annotations:', error);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Medical Image Annotation Platform
              </h1>
            </div>
            
            {images.length > 0 && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentImageIndex(prev => 
                      (prev - 1 + images.length) % images.length
                    )}
                    disabled={images.length <= 1}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    {currentImageIndex + 1} of {images.length}
                  </span>
                  
                  <button
                    onClick={() => setCurrentImageIndex(prev => 
                      (prev + 1) % images.length
                    )}
                    disabled={images.length <= 1}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <ToolPanel
              activeTool={activeTool}
              onToolChange={setActiveTool}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onSave={handleSave}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
            />
            
            <ExportPanel
              images={images}
              currentImage={currentImage}
            />
          </div>

          {/* Center - Image Viewer */}
          <div className="lg:col-span-2">
            <ImageViewer
              image={currentImage}
              activeTool={activeTool}
              onAnnotationAdd={handleAnnotationAdd}
              onAnnotationSelect={handleAnnotationSelect}
              selectedAnnotation={selectedAnnotation}
              visibleAnnotations={visibleAnnotations}
              labels={medicalLabels}
            />
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <ImageUploader
              images={images}
              onImagesUpload={handleImagesUpload}
              onImageRemove={handleImageRemove}
              currentImageIndex={currentImageIndex}
              onImageSelect={handleImageSelect}
            />
            
            {currentImage && (
              <AnnotationList
                annotations={currentImage.annotations}
                selectedAnnotation={selectedAnnotation}
                onAnnotationSelect={handleAnnotationSelect}
                onAnnotationDelete={handleAnnotationDelete}
                onAnnotationLabelChange={handleAnnotationLabelChange}
                onAnnotationToggleVisibility={handleAnnotationToggleVisibility}
                visibleAnnotations={visibleAnnotations}
                labels={medicalLabels}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ImageAnnotationTool;