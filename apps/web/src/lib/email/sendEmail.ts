export type SendEmailOptions = {
	to: string;
	subject: string;
	html: string;
	from?: string;
};

/**
 * Sends an email using the current provider (e.g., Resend, Postmark, SES)
 */
export async function sendEmail({ to, subject, html, from }: SendEmailOptions): Promise<void> {
	const provider = process.env.EMAIL_PROVIDER ?? 'resend';
	const sender = from ?? process.env.EMAIL_FROM ?? 'no-reply@yourdomain.com';

	switch (provider) {
		case 'resend': {
			const { Resend } = await import('resend');
			const resend = new Resend(process.env.RESEND_API_KEY);
			await resend.emails.send({ from: sender, to, subject, html });
			return;
		}
		// case 'postmark': {
		// 	const postmark = await import('postmark');
		// 	const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY!);
		// 	await client.sendEmail({ From: sender, To: to, Subject: subject, HtmlBody: html });
		// 	return;
		// }
		// case 'ses': {
		// 	const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
		// 	const client = new SESClient({ region: process.env.AWS_REGION });
		// 	await client.send(
		// 		new SendEmailCommand({
		// 			Destination: { ToAddresses: [to] },
		// 			Message: {
		// 				Body: { Html: { Charset: 'UTF-8', Data: html } },
		// 				Subject: { Charset: 'UTF-8', Data: subject },
		// 			},
		// 			Source: sender,
		// 		})
		// 	);
		// 	return;
		// }
		default:
			throw new Error(`Unsupported email provider: ${provider}`);
	}
}
