import React from 'react';
import { Square, Circle, MousePointer, Undo, Redo, Save } from 'lucide-react';
import type  { Tool } from '../types';

interface ToolPanelProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const tools: Tool[] = [
  { type: 'select', name: 'Select', icon: 'MousePointer', shortcut: 'V' },
  { type: 'rectangle', name: 'Rectangle', icon: 'Square', shortcut: 'R' },
  { type: 'circle', name: 'Circle', icon: 'Circle', shortcut: 'C' }
];

const iconMap = {
  MousePointer,
  Square,
  Circle
};

export const ToolPanel: React.FC<ToolPanelProps> = ({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onSave,
  canUndo,
  canRedo
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-md font-semibold text-gray-900 mb-4">Annotation Tools</h3>
      
      {/* Drawing Tools */}
      <div className="space-y-2 mb-6">
        {tools.map(tool => {
          const IconComponent = iconMap[tool.icon as keyof typeof iconMap];
          return (
            <button
              key={tool.type}
              onClick={() => onToolChange(tool.type)}
              className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTool === tool.type
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={`${tool.name} (${tool.shortcut})`}
            >
              <IconComponent className="w-4 h-4 mr-2" />
              {tool.name}
              <span className="ml-auto text-xs text-gray-500">{tool.shortcut}</span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex space-x-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4 mr-1" />
            Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4 mr-1" />
            Redo
          </button>
        </div>
        
        <button
          onClick={onSave}
          className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
          title="Save (Ctrl+S)"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Annotations
        </button>
      </div>
    </div>
  );
};