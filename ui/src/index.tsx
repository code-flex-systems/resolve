import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const app = document.getElementById('root');

if (app) {
	ReactDOM.createRoot(app).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}

