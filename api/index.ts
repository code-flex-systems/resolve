'use strict';

import cors from 'cors';
import http from 'http';
import https from 'https';
import express from 'express';
import 'dotenv/config';

import { router } from './routes/router';

async function startup() {
	const app = express();

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	app.use(cors());

	app.use('/api', router);

	http.createServer(app).listen(8080);
	console.log('\n\nListening on port 8080\n\n');
	console.log('\nenv = ' + process.env.ENV);
}

startup().catch((err) => {
	console.error(err.stack);
	console.error(err.toString());
	process.exit(1);
});
