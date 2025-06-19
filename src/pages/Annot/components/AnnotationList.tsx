import React from 'react';
import { Eye, EyeOff, Trash2, Tag, Square, Circle } from 'lucide-react';
import type { Annotation, Label } from '../types';

interface AnnotationListProps {
  annotations: Annotation[];
  selectedAnnotation: string | null;
  onAnnotationSelect: (id: string) => void;
  onAnnotationDelete: (id: string) => void;
  onAnnotationToggleVisibility: (id: string) => void;
  onAnnotationLabelChange: (id: string, label: string) => void;
  visibleAnnotations: Set<string>;
  labels: Label[];
}

export const AnnotationList: React.FC<AnnotationListProps> = ({
  annotations,
  selectedAnnotation,
  onAnnotationSelect,
  onAnnotationDelete,
  onAnnotationToggleVisibility,
  onAnnotationLabelChange,
  visibleAnnotations,
  labels
}) => {
  const getShapeIcon = (type: string) => {
    switch (type) {
      case 'rectangle':
        return <Square className="w-4 h-4" />;
      case 'circle':
        return <Circle className="w-4 h-4" />;
      default:
        return <Square className="w-4 h-4" />;
    }
  };

  const handleLabelChange = (annotationId: string, newLabel: string) => {
    onAnnotationLabelChange(annotationId, newLabel);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
        <Tag className="w-4 h-4 mr-2" />
        Annotations ({annotations.length})
      </h3>
      
      {annotations.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No annotations yet. Start drawing on the image to create annotations.
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {annotations.map((annotation, index) => (
            <div
              key={annotation.id}
              className={`border rounded-lg p-3 transition-colors ${
                selectedAnnotation === annotation.id
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="flex items-center mr-3">
                    <div
                      className="mr-2"
                      style={{ color: annotation.color }}
                    >
                      {getShapeIcon(annotation.type)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Annotation ({annotation.label || 'Unlabeled'})
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {annotation.type}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnnotationToggleVisibility(annotation.id);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title={visibleAnnotations.has(annotation.id) ? 'Hide' : 'Show'}
                  >
                    {visibleAnnotations.has(annotation.id) ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnnotationDelete(annotation.id);
                    }}
                    className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    title="Delete annotation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Label Selection Dropdown */}
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nature de l'annotation:
                </label>
                <select
                  value={annotation.label || ''}
                  onChange={(e) => handleLabelChange(annotation.id, e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Sélectionner...</option>
                  {labels.map(label => (
                    <option key={label.name} value={label.name}>
                      {label.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {annotation.confidence && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Confidence</span>
                    <span>{Math.round(annotation.confidence * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div
                      className="bg-green-500 h-1 rounded-full"
                      style={{ width: `${annotation.confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              {annotation.notes && (
                <p className="text-xs text-gray-600 mt-2 italic">
                  {annotation.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};