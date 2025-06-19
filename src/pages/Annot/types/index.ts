export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: 'rectangle' | 'circle';
  label: string;
  color: string;
  points: Point[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Add transformation properties
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  confidence?: number;
  notes?: string;
}

export interface ImageData {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  annotations: Annotation[];
  thumbnail: string;
}

export interface Tool {
  type: 'rectangle' | 'circle' | 'select';
  name: string;
  icon: string;
  shortcut: string;
}

export interface Label {
  name: string;
  color: string;
  description?: string;
}

export interface ExportData {
  version: string;
  timestamp: string;
  images: Array<{
    filename: string;
    annotations: Annotation[];
  }>;
}

// Add transformation handle types
export interface TransformHandle {
  type: 'corner' | 'edge' | 'rotation';
  position: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'rotate';
  point: Point;
}