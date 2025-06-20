import type { Point, Annotation, TransformHandle } from '../types';

export class CanvasUtils {
  static drawAnnotation(
    ctx: CanvasRenderingContext2D, 
    annotation: Annotation, 
    scale: number = 1,
    isSelected: boolean = false,
    showLabel: boolean = true,
    showTransformHandles: boolean = false
  ) {
    ctx.save();
    
    // Set styles
    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color + '20';
    ctx.lineWidth = 2 / scale;
    
    if (isSelected) {
      ctx.setLineDash([5 / scale, 5 / scale]);
      ctx.lineWidth = 3 / scale;
      ctx.strokeStyle = '#3B82F6'; // Blue for selected
    } else {
      ctx.setLineDash([]);
    }

    // Draw the shape without transformations first
    switch (annotation.type) {
      case 'rectangle':
        this.drawRectangle(ctx, annotation.points, annotation.bounds);
        break;
      case 'circle':
        this.drawCircle(ctx, annotation.points, annotation.bounds);
        break;
    }

    // Draw transform handles if selected and in transform mode
    if (isSelected && showTransformHandles && annotation.bounds) {
      this.drawTransformHandles(ctx, annotation.bounds, scale);
    }

    // Draw label if needed
    if (showLabel && annotation.label && annotation.bounds) {
      this.drawLabel(ctx, annotation.label, 
        { x: annotation.bounds.x, y: annotation.bounds.y }, scale);
    }

    ctx.restore();
  }

  private static drawRectangle(
    ctx: CanvasRenderingContext2D, 
    points: Point[], 
    bounds?: Annotation['bounds']
  ) {
    if (bounds) {
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    } else if (points.length >= 2) {
      const width = points[1].x - points[0].x;
      const height = points[1].y - points[0].y;
      ctx.fillRect(points[0].x, points[0].y, width, height);
      ctx.strokeRect(points[0].x, points[0].y, width, height);
    }
  }

  private static drawCircle(
    ctx: CanvasRenderingContext2D, 
    points: Point[], 
    bounds?: Annotation['bounds']
  ) {
    if (bounds) {
      // Draw ellipse using bounds
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const radiusX = bounds.width / 2;
      const radiusY = bounds.height / 2;
      
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (points.length >= 2) {
      const center = points[0];
      const radius = Math.sqrt(
        Math.pow(points[1].x - center.x, 2) + Math.pow(points[1].y - center.y, 2)
      );
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  }

  private static drawTransformHandles(
    ctx: CanvasRenderingContext2D,
    bounds: NonNullable<Annotation['bounds']>,
    scale: number
  ) {
    const handleSize = 8 / scale;
    const handles = this.getTransformHandles(bounds);
    
    ctx.save();
    ctx.fillStyle = '#3B82F6';
    ctx.strokeStyle = '#1E40AF';
    ctx.lineWidth = 1 / scale;
    ctx.setLineDash([]);

    handles.forEach(handle => {
      if (handle.type === 'rotation') {
        // Draw rotation handle as a circle
        ctx.beginPath();
        ctx.arc(handle.point.x, handle.point.y, handleSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw line connecting to shape
        ctx.beginPath();
        ctx.moveTo(handle.point.x, handle.point.y + handleSize / 2);
        ctx.lineTo(bounds.x + bounds.width / 2, bounds.y);
        ctx.stroke();
      } else {
        // Draw resize handles as squares
        ctx.fillRect(
          handle.point.x - handleSize / 2,
          handle.point.y - handleSize / 2,
          handleSize,
          handleSize
        );
        ctx.strokeRect(
          handle.point.x - handleSize / 2,
          handle.point.y - handleSize / 2,
          handleSize,
          handleSize
        );
      }
    });

    ctx.restore();
  }

  static getTransformHandles(bounds: NonNullable<Annotation['bounds']>): TransformHandle[] {
    const { x, y, width, height } = bounds;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    return [
      // Corner handles
      { type: 'corner', position: 'nw', point: { x, y } },
      { type: 'corner', position: 'ne', point: { x: x + width, y } },
      { type: 'corner', position: 'sw', point: { x, y: y + height } },
      { type: 'corner', position: 'se', point: { x: x + width, y: y + height } },
      
      // Edge handles
      { type: 'edge', position: 'n', point: { x: centerX, y } },
      { type: 'edge', position: 's', point: { x: centerX, y: y + height } },
      { type: 'edge', position: 'e', point: { x: x + width, y: centerY } },
      { type: 'edge', position: 'w', point: { x, y: centerY } },
      
      // Rotation handle (above the shape)
      { type: 'rotation', position: 'rotate', point: { x: centerX, y: y - 30 } }
    ];
  }

  static getHandleAtPoint(point: Point, bounds: NonNullable<Annotation['bounds']>, tolerance: number = 8): TransformHandle | null {
    const handles = this.getTransformHandles(bounds);
    
    for (const handle of handles) {
      const distance = Math.sqrt(
        Math.pow(point.x - handle.point.x, 2) + Math.pow(point.y - handle.point.y, 2)
      );
      if (distance <= tolerance) {
        return handle;
      }
    }
    
    return null;
  }

  static transformAnnotation(
    annotation: Annotation,
    handle: TransformHandle,
    startPoint: Point,
    currentPoint: Point
  ): Annotation {
    if (!annotation.bounds) return annotation;

    const deltaX = currentPoint.x - startPoint.x;
    const deltaY = currentPoint.y - startPoint.y;
    const newBounds = { ...annotation.bounds };

    switch (handle.type) {
      case 'corner':
        switch (handle.position) {
          case 'nw':
            newBounds.x += deltaX;
            newBounds.y += deltaY;
            newBounds.width -= deltaX;
            newBounds.height -= deltaY;
            break;
          case 'ne':
            newBounds.y += deltaY;
            newBounds.width += deltaX;
            newBounds.height -= deltaY;
            break;
          case 'sw':
            newBounds.x += deltaX;
            newBounds.width -= deltaX;
            newBounds.height += deltaY;
            break;
          case 'se':
            newBounds.width += deltaX;
            newBounds.height += deltaY;
            break;
        }
        break;

      case 'edge':
        switch (handle.position) {
          case 'n':
            newBounds.y += deltaY;
            newBounds.height -= deltaY;
            break;
          case 's':
            newBounds.height += deltaY;
            break;
          case 'e':
            newBounds.width += deltaX;
            break;
          case 'w':
            newBounds.x += deltaX;
            newBounds.width -= deltaX;
            break;
        }
        break;

      case 'rotation':
        const centerX = annotation.bounds.x + annotation.bounds.width / 2;
        const centerY = annotation.bounds.y + annotation.bounds.height / 2;
        
        const startAngle = Math.atan2(startPoint.y - centerY, startPoint.x - centerX);
        const currentAngle = Math.atan2(currentPoint.y - centerY, currentPoint.x - centerX);
        const rotation = currentAngle - startAngle;
        
        return {
          ...annotation,
          rotation: (annotation.rotation || 0) + rotation
        };
    }

    // Ensure minimum size
    newBounds.width = Math.max(10, Math.abs(newBounds.width));
    newBounds.height = Math.max(10, Math.abs(newBounds.height));

    // Handle negative dimensions
    if (newBounds.width < 0) {
      newBounds.x += newBounds.width;
      newBounds.width = Math.abs(newBounds.width);
    }
    if (newBounds.height < 0) {
      newBounds.y += newBounds.height;
      newBounds.height = Math.abs(newBounds.height);
    }

    return {
      ...annotation,
      bounds: newBounds,
      points: [
        { x: newBounds.x, y: newBounds.y },
        { x: newBounds.x + newBounds.width, y: newBounds.y + newBounds.height }
      ]
    };
  }

  private static drawLabel(
    ctx: CanvasRenderingContext2D, 
    label: string, 
    position: Point, 
    scale: number
  ) {
    ctx.save();
    ctx.font = `${12 / scale}px Arial`;
    ctx.setLineDash([]);
    
    const textWidth = ctx.measureText(label).width;
    const padding = 4 / scale;
    const height = 16 / scale;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(position.x, position.y - height - padding, textWidth + padding * 2, height);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.fillText(label, position.x + padding, position.y - padding);
    
    ctx.restore();
  }

  static getPointInCanvas(
    event: MouseEvent, 
    canvas: HTMLCanvasElement, 
    scale: number, 
    offset: Point
  ): Point {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale - offset.x,
      y: (event.clientY - rect.top) / scale - offset.y
    };
  }

  static isPointInAnnotation(point: Point, annotation: Annotation): boolean {
    if (annotation.bounds) {
      return point.x >= annotation.bounds.x && 
             point.x <= annotation.bounds.x + annotation.bounds.width &&
             point.y >= annotation.bounds.y && 
             point.y <= annotation.bounds.y + annotation.bounds.height;
    }

    switch (annotation.type) {
      case 'rectangle':
        if (annotation.points.length >= 2) {
          const minX = Math.min(annotation.points[0].x, annotation.points[1].x);
          const maxX = Math.max(annotation.points[0].x, annotation.points[1].x);
          const minY = Math.min(annotation.points[0].y, annotation.points[1].y);
          const maxY = Math.max(annotation.points[0].y, annotation.points[1].y);
          return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
        }
        return false;
      case 'circle':
        if (annotation.points.length >= 2) {
          const center = annotation.points[0];
          const radius = Math.sqrt(
            Math.pow(annotation.points[1].x - center.x, 2) + 
            Math.pow(annotation.points[1].y - center.y, 2)
          );
          const distance = Math.sqrt(
            Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
          );
          return distance <= radius;
        }
        return false;
      default:
        return false;
    }
  }

  static getCursorForHandle(handle: TransformHandle): string {
    switch (handle.type) {
      case 'corner':
        switch (handle.position) {
          case 'nw':
          case 'se':
            return 'nw-resize';
          case 'ne':
          case 'sw':
            return 'ne-resize';
        }
        break;
      case 'edge':
        switch (handle.position) {
          case 'n':
          case 's':
            return 'ns-resize';
          case 'e':
          case 'w':
            return 'ew-resize';
        }
        break;
      case 'rotation':
        return 'grab';
    }
    return 'default';
  }
}