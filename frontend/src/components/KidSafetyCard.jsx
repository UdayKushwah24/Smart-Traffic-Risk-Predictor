export default function KidSafetyCard({ data, debug = false }) {
  const status = (data?.status || 'NO_FACE').toUpperCase();
  const statusClass = status.toLowerCase().replace(/_/g, '-');
  const boxes = Array.isArray(data?.debug_boxes)
    ? data.debug_boxes
    : Array.isArray(data?.boxes)
      ? data.boxes
      : [];
  const displayMessage = {
    SAFE: 'Adult present with child',
    WARNING: 'Child detected, monitoring...',
    DANGER: '⚠ Child alone in car!',
    NO_FACE: data?.active === false && data?.message ? data.message : 'No face detected',
    NORMAL: data?.message || 'No risk',
  }[status] || data?.message || 'No risk';
  const cardClass =
    status === 'DANGER'
      ? 'kid-danger'
      : status === 'WARNING'
        ? 'kid-warning'
        : status === 'SAFE'
          ? 'kid-safe'
          : status === 'NORMAL'
            ? 'kid-normal'
            : 'kid-no-face';
  const isOnline = Boolean(data?.active);

  return (
    <div className={`risk-module-card ${isOnline ? 'online' : 'offline'} ${cardClass}`}>
      <div className="module-header">
        <span className="module-icon">👶</span>
        <span className="module-title">Kid Safety Detection</span>
        <span className={`module-dot ${isOnline ? 'on' : 'off'}`}></span>
      </div>
      <div className="module-body">
        <div className="module-metric">
          <span>Kid Detected</span>
          <strong>{data?.kid_detected ? 'Yes' : 'No'}</strong>
        </div>
        <div className="module-metric">
          <span>Adult Present</span>
          <strong>{data?.adult_present ? 'Yes' : 'No'}</strong>
        </div>
        <div className="module-metric">
          <span>Status</span>
          <strong className={statusClass}>{status}</strong>
        </div>
        <div className="module-metric">
          <span>Message</span>
          <strong className={`kid-safety-message ${statusClass}`}>{displayMessage}</strong>
        </div>
        <div className="module-metric">
          <span>Risk</span>
          <strong>{Math.round(data?.risk ?? 0)}%</strong>
        </div>
        <div className="module-metric">
          <span>Alone For</span>
          <strong>{Number(data?.alone_seconds ?? 0).toFixed(1)}s</strong>
        </div>
        {debug && (
          <div className="module-metric">
            <span>Debug Boxes</span>
            <strong>{boxes.length}</strong>
          </div>
        )}
        {debug && boxes.length > 0 && (
          <div className="kid-debug-boxes">
            {boxes.slice(0, 3).map((box, index) => (
              <span key={`${box.left}-${box.top}-${index}`}>
                {box.category || 'face'} {box.age_bucket || 'age ?'} · {Math.round((box.confidence || 0) * 100)}%
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
