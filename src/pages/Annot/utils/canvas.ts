import type { Point, Annotation } from '../types';

export class CanvasUtils {
  static drawAnnotation(
    ctx: CanvasRenderingContext2D, 
    annotation: Annotation, 
    scale: number = 1,
    isSelected: boolean = false,
    showLabel: boolean = true
  ) {
    ctx.save();
    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color + '20';
    ctx.lineWidth = 2 / scale;
    
    if (isSelected) {
      ctx.setLineDash([5 / scale, 5 / scale]);
      ctx.lineWidth = 3 / scale;
    }

    switch (annotation.type) {
      case 'rectangle':
        this.drawRectangle(ctx, annotation.points, annotation.bounds);
        break;
      case 'circle':
        this.drawCircle(ctx, annotation.points);
        break;
    }

    // Only draw label if showLabel is true and label exists
    if (showLabel && annotation.label) {
      this.drawLabel(ctx, annotation.label, annotation.points[0], scale);
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

  private static drawCircle(ctx: CanvasRenderingContext2D, points: Point[]) {
    if (points.length >= 2) {
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

  private static drawLabel(
    ctx: CanvasRenderingContext2D, 
    label: string, 
    position: Point, 
    scale: number
  ) {
    ctx.font = `${12 / scale}px Arial`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(position.x, position.y - 20 / scale, 
                 ctx.measureText(label).width + 8 / scale, 16 / scale);
    ctx.fillStyle = 'white';
    ctx.fillText(label, position.x + 4 / scale, position.y - 8 / scale);
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
    switch (annotation.type) {
      case 'rectangle':
        if (annotation.bounds) {
          return point.x >= annotation.bounds.x && 
                 point.x <= annotation.bounds.x + annotation.bounds.width &&
                 point.y >= annotation.bounds.y && 
                 point.y <= annotation.bounds.y + annotation.bounds.height;
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
}