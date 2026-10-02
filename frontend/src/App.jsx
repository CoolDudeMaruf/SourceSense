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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0f1a', color: '#f8fafc', fontFamily: 'monospace', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️ SourceSense Error</div>
          <div style={{ color: '#f87171', marginBottom: '1rem', maxWidth: 600 }}>{String(this.state.error)}</div>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '1rem' }}>
            Reload Dashboard
          </button>
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
