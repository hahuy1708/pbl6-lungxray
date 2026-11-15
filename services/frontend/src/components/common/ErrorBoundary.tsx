import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleToLogin = () => {
    localStorage.removeItem('pbl6_token');
    localStorage.removeItem('pbl6_user');
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-chrome-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-chrome-200 p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-flag-50 text-flag-500 rounded-sm flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-chrome-900 mb-2">Đã xảy ra sự cố hiển thị</h2>
            <p className="text-chrome-600 text-sm mb-6">
              Ứng dụng gặp lỗi ngoài dự kiến và đã được chặn để tránh lỗi trắng màn hình.
            </p>

            {this.state.error && (
              <div className="bg-chrome-50 border border-chrome-200 rounded-sm p-3 text-left mb-6 text-xs text-flag-500 font-mono overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm bg-accent-600 hover:bg-accent-500 text-white font-medium transition text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Tải lại trang
              </button>
              <button
                onClick={this.handleToLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm bg-chrome-100 hover:bg-chrome-200 text-chrome-900 font-medium transition text-sm"
              >
                <LogOut className="w-4 h-4" />
                Về trang đăng nhập
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
