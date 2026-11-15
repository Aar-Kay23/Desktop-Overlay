import { useEffect, useRef } from 'react';
import { useTelemetry } from '../context/TelemetryContext';

// Global dragging lock: prevents losing mouse capture during rapid mouse gestures
let globalIsDragging = false;

export const setGlobalDragging = (dragging: boolean) => {
  globalIsDragging = dragging;
  if (dragging && window.electronAPI?.setInteractive) {
    window.electronAPI.setInteractive(true);
  }
};

export function useClickThrough(isModalOpen: boolean = false) {
  const { mode } = useTelemetry();
  const isPointerDownRef = useRef(false);
  const currentInteractiveRef = useRef<boolean | null>(null);

  useEffect(() => {
    const electron = window.electronAPI;
    if (!electron?.setInteractive) return;

    // Full dashboard mode or open modal requires full interactive coverage
    if (mode === 'dashboard' || isModalOpen) {
      if (currentInteractiveRef.current !== true) {
        currentInteractiveRef.current = true;
        electron.setInteractive(true);
      }
      return;
    }

    let rafId: number | null = null;
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;

    const setInteractiveSafe = (interactive: boolean) => {
      // Guard: while user is holding mouse or actively dragging, keep window interactive
      if (!interactive && (isPointerDownRef.current || globalIsDragging)) {
        return;
      }

      if (interactive) {
        // Entering interactive element: clear any pending leave timer and activate immediately
        if (leaveTimer) {
          clearTimeout(leaveTimer);
          leaveTimer = null;
        }
        if (currentInteractiveRef.current !== true) {
          currentInteractiveRef.current = true;
          electron.setInteractive(true);
        }
      } else {
        // Leaving interactive element: debounce by 50ms so rapid cursor motion doesn't thrash OS DWM
        if (currentInteractiveRef.current === false) return;
        if (leaveTimer) return;
        leaveTimer = setTimeout(() => {
          leaveTimer = null;
          if (!isPointerDownRef.current && !globalIsDragging) {
            currentInteractiveRef.current = false;
            electron.setInteractive(false);
          }
        }, 50);
      }
    };

    const handlePointerDown = () => {
      isPointerDownRef.current = true;
      setInteractiveSafe(true);
    };

    const handlePointerUp = (e: PointerEvent) => {
      isPointerDownRef.current = false;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const isOverInteractive = Boolean(el?.closest('[data-interactive="true"]'));
      setInteractiveSafe(isOverInteractive);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerDownRef.current || globalIsDragging) return;
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        const target = e.target as HTMLElement | null;
        const isOverInteractive = Boolean(target?.closest?.('[data-interactive="true"]'));
        setInteractiveSafe(isOverInteractive);
      });
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Initial state: pass-through to desktop
    setInteractiveSafe(false);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (leaveTimer !== null) clearTimeout(leaveTimer);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mode, isModalOpen]);
}

