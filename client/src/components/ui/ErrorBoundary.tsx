import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-red-50/30 rounded-xl border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertOctagon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Something went wrong</h2>
          <div className="text-left bg-surface p-4 rounded w-full max-w-2xl overflow-auto mb-6 text-sm text-red-600 dark:text-red-400 font-mono">
            <p><strong>Error:</strong> {this.state.error?.message}</p>
            <p className="mt-2 text-gray-500 whitespace-pre-wrap">{this.state.error?.stack}</p>
          </div>
          <div className="space-x-4">
             <Button variant="outline" onClick={() => window.location.reload()}>
               Refresh Page
             </Button>
             <Button onClick={() => this.setState({ hasError: false, error: null })}>
               Try Again
             </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


