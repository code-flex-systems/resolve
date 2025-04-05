import { BrowserRouter, Route, Routes } from 'react-router';
import Home from './components/pages/Home';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from './styles/theme';
import './styles/global-styles.css';
import Checklist from './components/pages/Checklist';

const queryClient = new QueryClient();

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider theme={theme}>
				<BrowserRouter>
					<Routes>
						<Route path="/" element={<Home />} />
						<Route path="/checklist" element={<Checklist />} />
					</Routes>
				</BrowserRouter>
			</ThemeProvider>
		</QueryClientProvider>
	);
}
