import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Activity, Server, List, Leaf, ShieldCheck } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import NodeManagement from './pages/NodeManagement';
import EventLog from './pages/EventLog';
import JudgeView from './pages/JudgeView';
import ContestDashboard from './pages/ContestDashboard';
import './index.css';

function Sidebar() {
  return (
    <nav
      style={{
        width: 220,
        minWidth: 220,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 12px',
        minHeight: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ paddingLeft: 14, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #2e9474, #1a4d3d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--glow-brand)',
            }}
          >
            <Leaf size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1 }}>
              SourceSense
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Mumbai Pilot
            </div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <Activity size={15} /> Dashboard
        </NavLink>
        <NavLink to="/nodes" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <Server size={15} /> Node Management
        </NavLink>
        <NavLink to="/events" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <List size={15} /> Event Log
        </NavLink>
        <NavLink to="/judge" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <ShieldCheck size={15} /> Judge View
        </NavLink>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingLeft: 14 }}>
        <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <div>Sense → Understand → Act</div>
          <div style={{ marginTop: 4 }}>v1.0.0 · IIT Mumbai</div>
        </div>
      </div>
    </nav>
  );
}

function Layout() {
  const location = useLocation();
  const isContestDashboard = location.pathname === '/';

  if (isContestDashboard) {
    return (
      <Routes>
        <Route path="/" element={<ContestDashboard />} />
      </Routes>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: '28px 32px',
          maxWidth: 'calc(100vw - 220px)',
          overflowX: 'hidden',
        }}
      >
        <Routes>
          <Route path="/nodes" element={<NodeManagement />} />
          <Route path="/events" element={<EventLog />} />
          <Route path="/judge" element={<JudgeView />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
