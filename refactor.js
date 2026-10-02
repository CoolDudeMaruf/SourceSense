const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Dashboard.jsx', 'utf8');

// 1. Default Node
content = content.replace(
  /const defaultNode = nodeList\.find\(n => n\.name\.includes\("Gulshan"\) && n\.name\.startsWith\("Node-01"\)\)[\s\S]*?setSelectedNodeId\(defaultNode\.id\);/,
  const defaultNode = nodeList.find(n => n.zone === '"Demo"') || nodeList[0];\n          setSelectedNodeId(defaultNode.id);
);

// 2. Add 'Live AI Simulation' badge
content = content.replace(
  /<div className="osen-page-title">Live Dashboard<\/div>/,
  <div className="osen-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>\n                    Live Dashboard\n                    <span className="osen-badge osen-badge-success" style={{ animation: 'ws-pulse 2s infinite', fontSize: '0.65rem' }}>Live AI Simulation</span>\n                  </div>
);

// 3. Simplify KPIs
const kpi_replacement = 
              {/* ── KPI Row ── */}
              <div className="osen-kpi-grid osen-section">
                <div className="osen-kpi-card" style={{ background: currentReading?.relay_state ? 'rgba(220,53,69,0.05)' : 'rgba(25,135,84,0.05)', border: currentReading?.relay_state ? '1px solid rgba(220,53,69,0.3)' : '1px solid var(--be)' }}>
                  <div className="osen-kpi-label">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentReading?.relay_state ? 'var(--ogd)' : 'var(--ogs)', display: 'inline-block' }} />
                    AI Brain Status
                  </div>
                  <div className="osen-kpi-value" style={{ color: currentReading?.relay_state ? 'var(--ogd)' : 'var(--ogs)', fontSize: '1.4rem' }}>
                    {currentReading?.relay_state ? '● AUTONOMOUS ACTION' : '○ MONITORING STANDBY'}
                  </div>
                  <div className="osen-kpi-trend">
                    Node {selectedNode?.name ?? '—'}
                  </div>
                </div>

                <div className="osen-kpi-card">
                  <div className="osen-kpi-label">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--op)', display: 'inline-block' }} />
                    Active City Interventions
                  </div>
                  <div className="osen-kpi-value">{activeNodes}</div>
                  <div className="osen-kpi-trend osen-trend-neutral">
                    ∑ Nodes currently mitigated
                  </div>
                </div>

                <div className="osen-kpi-card">
                  <div className="osen-kpi-label">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0dcaf0', display: 'inline-block' }} />
                    Total Dust Suppressed
                  </div>
                  <div className="osen-kpi-value" style={{ color: 'var(--oi)' }}>
                    {dustSuppressedKg} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ts)' }}>gram</span>
                  </div>
                  <div className="osen-kpi-trend">
                    Since session start
                  </div>
                </div>
                
                <div className="osen-kpi-card">
                  <div className="osen-kpi-label">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                    Current AI Confidence
                  </div>
                  <div className="osen-kpi-value" style={{ color: '#f59e0b' }}>
                    {currentReading?.classifier_confidence ? ((currentReading.classifier_confidence) * 100).toFixed(1) : '—'}%
                  </div>
                  <div className="osen-kpi-trend">
                    Source: {currentReading?.classifier_label?.replace(/_/g, ' ') || 'None'}
                  </div>
                </div>
              </div>
;
content = content.replace(/\{\/\* ── KPI Row ── \*\/[\s\S]*?\{\/\* ── Node selector bar ── \*\/\}/, kpi_replacement + '              {/* ── Node selector bar ── */}');

// 4. Highlight the map/action container
content = content.replace(
  /<div className="osen-card">\s*<div className="osen-card-inner" style=\{\{ padding: 0 \}\}>\s*<div className="osen-card-header"[\s\S]*?Action Window/,
  <div className="osen-card" style={{ border: currentReading?.relay_state ? '2px solid var(--ogd)' : '1px solid var(--be)', boxShadow: currentReading?.relay_state ? '0 0 20px rgba(220,53,69,0.15)' : 'var(--osha)', transition: 'all 0.3s' }}>\n                      <div className="osen-card-inner" style={{ padding: 0 }}>\n                        <div className="osen-card-header" style={{ padding: '0.85rem 1.25rem' }}>\n                          <span className="osen-card-title">\n                            <span className="osen-card-title-dot" style={{ background: currentReading?.relay_state ? 'var(--ogd)' : 'var(--ogs)' }} />\n                            Action Window
);

// 5. Remove Data Quality Panel Tab entirely
const tabs_removal = /\{\/\* Row 5: Recent Readings \/ Data Quality tabs \*\/\}[\s\S]*?<div>External systems feature temporarily disabled<\/div>\s*\) : \(/;
const tabs_replacement = {/* Row 5: Recent Readings */}
                  <div className="osen-card osen-section" style={{ padding: 0 }}>
                    <div className="osen-tab-bar" style={{ padding: '0 1.25rem' }}>
                      <button className="osen-tab active">Recent Readings</button>
                    </div>
                    <div style={{ padding: '1.25rem' }}>(;
content = content.replace(tabs_removal, tabs_replacement);

// 6. Fix closing bracket for tab removal
// Find the )}</div> matching the end of the tabs block
content = content.replace(/<\/div>\s*\)\s*<\/div>/, '</div>\n                      )\n                    </div>');

fs.writeFileSync('frontend/src/pages/Dashboard.jsx', content);
console.log('Done script execution');
