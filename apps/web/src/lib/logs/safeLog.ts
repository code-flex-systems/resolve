export async function safeLog<T = void>(fn: () => Promise<T>, context: string): Promise<T | void> {
	try {
		return await fn();
	} catch (err) {
		console.error(`[safeLog] Failed in ${context}:`, err);
	}
}
