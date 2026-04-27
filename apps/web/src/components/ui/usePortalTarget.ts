import { useCallback, type RefObject } from 'react';

/**
 * Returns the appropriate portal target for floating UI (menus, tooltips).
 * If the trigger element is inside a <dialog>, portals into that dialog
 * so it stays within the dialog's top-layer stacking context.
 * Otherwise, portals into document.body.
 */
export function getPortalTarget(ref: RefObject<HTMLElement | null>): HTMLElement {
	if (typeof window === 'undefined') return null as unknown as HTMLElement;
	const el = ref.current;
	if (!el) return document.body;
	const dialog = el.closest('dialog');
	return dialog ?? document.body;
}

export function usePortalTarget(ref: RefObject<HTMLElement | null>) {
	return useCallback(() => getPortalTarget(ref), [ref]);
}
