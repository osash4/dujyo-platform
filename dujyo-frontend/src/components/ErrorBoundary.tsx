import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
// Removed useNavigate and useLocation to avoid Router context issues

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Always log to console, even in production
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('🚨 Error name:', error.name);
    console.error('🚨 Error message:', error.message);
    console.error('🚨 Error stack:', error.stack);
    console.error('🚨 Component stack:', errorInfo.componentStack);
    console.error('🚨 Full error info:', errorInfo);
    
    // Also log to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).__LAST_ERROR__ = {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      };
    }
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  // Use window.location instead of useNavigate to avoid Router context issues
  const handleGoHome = () => {
    onReset();
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-orange-500/10" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Error Icon */}
          <motion.div
            className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </motion.div>

          {/* Error Message */}
          <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
          <p className="text-gray-400 text-lg mb-6">
            We're sorry, but something unexpected happened. Don't worry, your data is safe.
          </p>

          {/* Error Details (always show for debugging) */}
          <motion.div
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-left max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-red-400 font-semibold mb-2">Error Details:</p>
            {error ? (
              <>
                <p className="text-sm text-gray-300 font-mono break-all mb-2">
                  <strong>Error:</strong> {error.toString()}
                </p>
                <p className="text-sm text-gray-400 mb-2">
                  <strong>Name:</strong> {error.name}
                </p>
                {error.message && (
                  <p className="text-sm text-gray-400 mb-2">
                    <strong>Message:</strong> {error.message}
                  </p>
                )}
                {error.stack && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 mb-2">
                      Stack Trace (Click to expand)
                    </summary>
                    <pre className="mt-2 text-xs text-gray-400 overflow-auto max-h-60 bg-black/30 p-2 rounded">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-300">
                Error object is null. Check browser console (F12) for details.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-4">
              💡 Tip: Open browser console (F12) to see more details. Error is also saved to window.__LAST_ERROR__
            </p>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.button
              onClick={onReset}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-amber-500/25"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </motion.button>

            <motion.button
              onClick={handleGoHome}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Home className="w-5 h-5" />
              Go Home
            </motion.button>
          </div>

          {/* Help Text */}
          <p className="mt-8 text-sm text-gray-500">
            If this problem persists, please contact support or try refreshing the page.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ErrorBoundary;

