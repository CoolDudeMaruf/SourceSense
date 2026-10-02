import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NodeManagement from './pages/NodeManagement';
import EventLog from './pages/EventLog';
import JudgeView from './pages/JudgeView';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/nodes" element={<NodeManagement />} />
        <Route path="/events" element={<EventLog />} />
        <Route path="/judge" element={<JudgeView />} />
      </Routes>
    </BrowserRouter>
  );
}
