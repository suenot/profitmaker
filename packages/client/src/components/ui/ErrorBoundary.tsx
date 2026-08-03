import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Flip to the fallback UI on the next render.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🛡️ Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Here you can send error to monitoring system
    // e.g. Sentry, LogRocket, etc.
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      const { fallbackTitle = "Something went wrong", showDetails = false } = this.props;

      return (
        <Card className="m-4 border-terminal-negative/40 bg-terminal-negative/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-terminal-negative">
              <AlertTriangle className="h-5 w-5" />
              {fallbackTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-terminal-text">
              The terminal hit an unexpected error. It was caught here, so the rest of
              your session is intact.
            </p>

            {showDetails && this.state.error && (
              <div className="bg-terminal-negative/10 border border-terminal-negative/30 p-3 rounded-lg text-sm">
                <strong className="text-terminal-text">Error details:</strong>
                <pre className="mt-2 text-terminal-negative overflow-auto">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant="default"
                size="sm"
              >
                Reload page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
} 