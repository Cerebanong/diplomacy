import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ZoomPanWrapperProps {
  children: ReactNode;
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
export function ZoomPanWrapper({ children }: ZoomPanWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState<number | null>(null);

  const updateSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setMapSize(Math.min(el.offsetWidth, el.offsetHeight));
  }, []);

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
            mapSize != null
              ? { width: mapSize, height: mapSize }
              : { width: '100%', height: '100%' }
          }
        >
          {children}
        </TransformComponent>
      </div>
    </TransformWrapper>
  );
}
