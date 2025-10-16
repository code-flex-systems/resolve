'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useChecklistStore } from '@/stores/useChecklistStore';

const cloneSearch = (sp: URLSearchParams) => new URLSearchParams(sp.toString());
const toNum = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export function useChecklistDeepLink(initReady: boolean) {
	const router = useRouter();
	const pathname = usePathname();
	const sp = useSearchParams();
	const question = sp.get('question');
	const instance = sp.get('instance');
	const focus = sp.get('focus');

	// read stable primitives
	const target = useMemo(() => {
		const questionId = toNum(question);
		const instanceId = toNum(instance);
		return { questionId, instanceId, focus };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [question, instance, focus]);

	const appliedRef = useRef(false); // gates strict mode double effects

	useEffect(() => {
		if (!initReady) return; // wait until data (pages/questions) is loaded
		if (appliedRef.current) return;
		useChecklistStore.getState().toggleChecklistProgressDialog(true);

		const { questionId, instanceId, focus } = target;

		// Nothing to apply? bail early (prevents URL replace when no params present)
		const hasActionable = instanceId !== undefined || questionId !== undefined || focus !== undefined;
		if (!hasActionable) return;

		// Apply in the right order so UI can expand tree cleanly
		if (instanceId !== undefined) useChecklistStore.getState().updateSelectedPage(instanceId);
		if (instanceId !== undefined && questionId !== undefined) {
			useChecklistStore.getState().updateSelectedQuestion(questionId);
			useChecklistStore.getState().toggleHighlightedQuestion(questionId);
		}
		// Focus various features
		if (focus !== undefined) {
			switch (focus) {
				case 'comments':
					useChecklistStore.getState().toggleComments();
					break;
				default:
					break;
			}
		}

		// Mark applied before URL change to avoid re-running on the resulting render
		appliedRef.current = true;

		// Build the cleaned URL and only replace if it would actually change
		const next = cloneSearch(sp);
		next.delete('question');
		next.delete('instance');
		next.delete('focus');

		const currentQs = sp.toString();
		const nextQs = next.toString();

		if (nextQs !== currentQs) {
			const hash = typeof window !== 'undefined' ? window.location.hash : '';
			router.replace(nextQs ? `${pathname}?${nextQs}${hash}` : `${pathname}${hash}`, { scroll: false });
		}
	}, [initReady, target, pathname, router, sp]);

	useEffect(() => {
		appliedRef.current = false;
	}, []);
}
