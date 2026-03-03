import { useState, useEffect, RefObject } from 'react';

interface UseVirtualizerProps {
  count: number;
  itemHeight: number;
  containerRef: RefObject<HTMLElement | null>;
  overscan?: number;
}

export function useVirtualizer({ count, itemHeight, containerRef, overscan = 5 }: UseVirtualizerProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    // Initial measurement
    setContainerHeight(container.clientHeight);

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  const totalHeight = count * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const renderCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(count, startIndex + renderCount);

  const paddingTop = startIndex * itemHeight;
  const paddingBottom = Math.max(0, totalHeight - (endIndex * itemHeight));

  const virtualItems = [];
  for (let i = startIndex; i < endIndex; i++) {
    virtualItems.push(i);
  }

  return {
    virtualItems,
    paddingTop,
    paddingBottom,
    startIndex,
  };
}