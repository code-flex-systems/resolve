const config = {
	APP_NAME: 'Manifest',
	DEFAULT_PASSWORD: 'WelcomeToManifest',
	ROLES: {
		ADMIN: 'Admin',
		CONTRIBUTOR: 'Contributor',
	},
} as const;

export default Object.freeze(config);
