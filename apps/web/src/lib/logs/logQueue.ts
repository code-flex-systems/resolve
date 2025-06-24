const queue: (() => Promise<void>)[] = [];
let isRunning = false;

export function enqueueLog(fn: () => Promise<void>) {
	queue.push(fn);
	if (!isRunning) processQueue();
}

async function processQueue() {
	isRunning = true;

	while (queue.length > 0) {
		const job = queue.shift();
		if (!job) continue;

		try {
			await job();
		} catch (err) {
			console.error('[logQueue] Job error:', err);
		}
	}

	isRunning = false;
}
