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
        <div
          style={{
            minHeight: '100-screen',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#050a14', // Fallback navy
            color: '#e0f7fa', // Fallback cyan
            padding: '24px',
            fontFamily: 'system-ui, sans-serif'
          }}
          className="min-h-screen flex items-center justify-center bg-background text-foreground p-6"
        >
          <div
            style={{
                maxWidth: '560px',
                width: '100%',
                backgroundColor: '#0a1628',
                border: '1px solid #1e293b',
                borderRadius: '24px',
                padding: '32px',
                textAlign: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
            className="max-w-xl w-full bg-card border border-border rounded-3xl shadow-xl p-8 text-center"
          >
            <p
                style={{
                    fontSize: '12px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    color: '#f43f5e',
                    marginBottom: '12px'
                }}
                className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 mb-3"
            >
                Runtime Error
            </p>
            <h1
                style={{
                    fontSize: '30px',
                    fontWeight: 900,
                    letterSpacing: '-0.025em',
                    marginBottom: '12px',
                    color: 'white'
                }}
                className="text-3xl font-black tracking-tight mb-3"
            >
                This page crashed
            </h1>
            <p
                style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    marginBottom: '24px'
                }}
                className="text-sm text-muted-foreground mb-6"
            >
                {this.state.message}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                color: 'black',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                border: 'none',
                cursor: 'pointer'
              }}
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
