import { Component } from 'react';
import i18n from '../i18n/i18n.js';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-zinc-300">
          <div className="text-center max-w-md px-8">
            <div className="text-4xl mb-6 opacity-30">&#9888;</div>
            <h2 className="text-lg font-light tracking-wide mb-3">{i18n.t('error.title')}</h2>
            <p className="text-sm text-slate-500 font-light mb-6">
              {this.state.error?.message || i18n.t('error.message')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
            >
              {i18n.t('error.reload')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
