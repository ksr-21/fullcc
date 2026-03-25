import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Unknown runtime error',
    };
  }

  componentDidCatch(error: Error) {
    console.error('App crashed:', error);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-xl w-full bg-card border border-border rounded-3xl shadow-xl p-8 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 mb-3">Runtime Error</p>
            <h1 className="text-3xl font-black tracking-tight mb-3">This page crashed</h1>
            <p className="text-sm text-muted-foreground mb-6">{this.state.message}</p>
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-foreground text-background rounded-xl font-black text-xs uppercase tracking-widest"
            >
              Return To Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
