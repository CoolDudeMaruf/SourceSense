import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Component } from 'react';
import Dashboard from './pages/Dashboard';
import NodeManagement from './pages/NodeManagement';
import EventLog from './pages/EventLog';
import JudgeView from './pages/JudgeView';
import './index.css';

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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
          <div className="glass-card p-8 max-w-lg w-full flex flex-col items-center gap-4">
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#ef4444' }}>
              ⚠️
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>System Exception Encountered</div>
            <div className="font-mono text-xs p-3 rounded-lg w-full text-left overflow-auto" style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#dc2626' }}>
              {String(this.state.error)}
            </div>
            <button onClick={() => window.location.reload()} className="glass-btn px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Reload Platform Console
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nodes" element={<NodeManagement />} />
          <Route path="/events" element={<EventLog />} />
          <Route path="/judge" element={<JudgeView />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
