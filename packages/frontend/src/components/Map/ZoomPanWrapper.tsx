import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ZoomPanWrapperProps {
  children: ReactNode;
  aspectRatio?: number;
}

/**
 * Control buttons for zoom/pan operations
 */
function Controls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
      <button
        onClick={() => zoomIn()}
        className="p-2 bg-white/90 hover:bg-white rounded shadow-md transition-colors"
        title="Zoom In"
        aria-label="Zoom In"
      >
        <ZoomIn size={18} className="text-gray-700" />
      </button>
      <button
        onClick={() => zoomOut()}
        className="p-2 bg-white/90 hover:bg-white rounded shadow-md transition-colors"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <ZoomOut size={18} className="text-gray-700" />
      </button>
      <button
        onClick={() => resetTransform()}
        className="p-2 bg-white/90 hover:bg-white rounded shadow-md transition-colors"
        title="Reset View"
        aria-label="Reset View"
      >
        <Maximize2 size={18} className="text-gray-700" />
      </button>
    </div>
  );
}

/**
 * Wrapper component providing zoom and pan functionality for the map.
 * Uses a ResizeObserver to measure the container and set explicit square
 * content dimensions matching the 1:1 SVG viewBox. This gives the library
 * correct content-vs-wrapper sizes so limitToBounds works properly.
 */
export function ZoomPanWrapper({ children, aspectRatio }: ZoomPanWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentSize, setContentSize] = useState<{ width: number; height: number } | null>(null);

  const updateSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;
    if (aspectRatio) {
      // Fit content to container while preserving the map's aspect ratio
      if (cw / ch > aspectRatio) {
        // Container is wider than content — height-constrained
        setContentSize({ width: ch * aspectRatio, height: ch });
      } else {
        // Container is taller than content — width-constrained
        setContentSize({ width: cw, height: cw / aspectRatio });
      }
    } else {
      const size = Math.min(cw, ch);
      setContentSize({ width: size, height: size });
    }
  }, [aspectRatio]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateSize]);

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.5}
      maxScale={4}
      centerOnInit={true}
      wheel={{ step: 0.1 }}
      pinch={{ step: 5 }}
      doubleClick={{ disabled: false, mode: 'zoomIn' }}
      panning={{ velocityDisabled: true }}
      limitToBounds={true}
      centerZoomedOut={true}
      alignmentAnimation={{
        sizeX: 0,
        sizeY: 0,
        animationTime: 200,
        animationType: 'easeOut',
      }}
    >
      <div ref={containerRef} className="relative w-full h-full">
        <Controls />
        <TransformComponent
          wrapperStyle={{
            width: '100%',
            height: '100%',
          }}
          contentStyle={
            contentSize != null
              ? { width: contentSize.width, height: contentSize.height }
              : { width: '100%', height: '100%' }
          }
        >
          {children}
        </TransformComponent>
      </div>
    </TransformWrapper>
  );
}
