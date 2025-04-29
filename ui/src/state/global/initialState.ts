import config from '../../config/config';
import { GlobalSlice } from '../storeTypes';

const globalSlice: GlobalSlice = Object.freeze({
	navOpen: false,
	selectedPage: '',
	user: {
		email: 'fake_email@gmail.com',
		roles: [config.ROLES.ADMIN],
		userid: 1,
		username: 'fake_username',
	},
});

export default globalSlice;
