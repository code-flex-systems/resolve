import { BrowserRouter, Route, Routes } from 'react-router';
import Home from './components/pages/Home';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from './styles/theme';
import './styles/global-styles.css';
import Checklist from './components/pages/Checklist';
import ChecklistPageBreakdown from './components/pages/ChecklistPageBreakdown';
import Checklists from './components/pages/Checklists';

const queryClient = new QueryClient();

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider theme={theme}>
				<BrowserRouter>
					<Routes>
						<Route path="/" element={<Checklists />} />
						<Route path="/checklists/*" element={<Checklists />} />
						<Route path="/checklist/*" element={<Checklist />} />
						<Route path="/checklist/:checklistId/*" element={<Checklist />} />
						<Route path="/checklist/:checklistId/claim/:claimId/*" element={<Checklist />} />
						<Route
							path="/checklist/:checklistId/page-instances/:instanceId/*"
							element={<ChecklistPageBreakdown />}
						/>
					</Routes>
				</BrowserRouter>
			</ThemeProvider>
		</QueryClientProvider>
	);
}
