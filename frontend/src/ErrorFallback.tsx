import { useEffect } from "react";
import databaseService from '@/lib/database'

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
  // When encountering an error in the development mode, rethrow it and don't display the boundary.
  // The parent UI will take care of showing a more helpful dialog.
  if (import.meta.env.DEV) {
    console.error('Development error:', error);
    throw error;
  }

  // Log production errors to the DB once when the fallback mounts
  useEffect(() => {
    ;(async () => {
      try {
        await databaseService.logError('ErrorBoundary', error, { stack: error.stack })
      } catch (e) {
        console.error('[ErrorFallback] failed to log error', e)
      }
    })()
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg">
          <h2 className="font-semibold text-red-800 mb-2">This spark has encountered a runtime error</h2>
          <p className="text-red-700 text-sm">
            Something unexpected happened while running the application. The error details are shown below. Contact the spark author and let them know about this issue.
          </p>
        </div>
        
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-sm text-gray-600 mb-2">Error Details:</h3>
          <pre className="text-xs text-red-600 bg-gray-50 p-3 rounded border overflow-auto max-h-32">
            {error.message}
          </pre>
        </div>
        
        <button 
          onClick={resetErrorBoundary} 
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
