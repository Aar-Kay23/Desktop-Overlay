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

    const setInteractiveSafe = (interactive: boolean) => {
      // Guard: while user is holding mouse or actively dragging, keep window interactive
      if (!interactive && (isPointerDownRef.current || globalIsDragging)) {
        return;
      }

      if (currentInteractiveRef.current === interactive) return;
      currentInteractiveRef.current = interactive;
      electron.setInteractive(interactive);
    };

    const handlePointerDown = () => {
      isPointerDownRef.current = true;
      setInteractiveSafe(true);
    };

    const handlePointerUp = (e: PointerEvent) => {
      isPointerDownRef.current = false;
      // Re-evaluate what element sits under the cursor upon release
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const isOverInteractive = Boolean(el?.closest('[data-interactive="true"]'));
      setInteractiveSafe(isOverInteractive);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerDownRef.current || globalIsDragging) return;

      const target = e.target as HTMLElement | null;
      const isOverInteractive = Boolean(target?.closest?.('[data-interactive="true"]'));
      setInteractiveSafe(isOverInteractive);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Initial state: pass-through to desktop
    setInteractiveSafe(false);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mode, isModalOpen]);
}
