import React from 'react';
import { X } from 'lucide-react';
import type { Label } from '../types';

interface AnnotationPopupProps {
  isOpen: boolean;
  position: { x: number; y: number };
  labels: Label[];
  onLabelSelect: (label: string) => void;
  onClose: () => void;
}

export const AnnotationPopup: React.FC<AnnotationPopupProps> = ({
  isOpen,
  position,
  labels,
  onLabelSelect,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-48"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Select Annotation Type</h4>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-2">
        {labels.map(label => (
          <button
            key={label.name}
            onClick={() => onLabelSelect(label.name)}
            className="w-full flex items-center px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <div 
              className="w-3 h-3 rounded-full mr-3" 
              style={{ backgroundColor: label.color }}
            />
            <div>
              <div className="font-medium">{label.name}</div>
              {label.description && (
                <div className="text-xs text-gray-500">{label.description}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};