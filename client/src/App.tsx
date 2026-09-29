
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from 'next-themes';

function App() {
 return (
 <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
 <BrowserRouter>
 <AuthProvider>
 <AppRoutes />
 <Toaster position="top-right" />
 </AuthProvider>
 </BrowserRouter>
 </ThemeProvider>
 );
}

export default App;
