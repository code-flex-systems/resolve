const config = {
	APP_NAME: 'Manifest',
	CLAIM_FIELDS: [
		{ key: 'claim_number', label: 'Claim Number' },
		{ key: 'client', label: 'Client' },
		{ key: 'client_adjuster', label: 'Client Adjuster' },
		{ key: 'insured', label: 'Insured' },
		{ key: 'claim_amount', label: 'Claim Amount' },
		{ key: 'total_incurred', label: 'Total Incurred' },
		{ key: 'date_of_loss', label: 'Date of Loss' },
		{ key: 'loss_location', label: 'Loss Location' },
		{ key: 'last_updated_by', label: 'Last Updated By' },
		{ key: 'last_update', label: 'Last Update' },
		{ key: 'expected_recovery', label: 'Expected Recovery' },
	],
	USER_FIELDS: [
		{ key: 'first', label: 'First' },
		{ key: 'last', label: 'Last' },
		{ key: 'email', label: 'Email' },
	],
	ROLES: {
		ADMIN: 'Admin',
		CONTRIBUTOR: 'Contributor',
	},
} as const;

export default Object.freeze(config);
