import { useState } from 'react';
import '../styles/upload.css';

const modelHistory = [
  { name: 'risk_model_v3.pkl', date: 'Feb 28, 2026', size: '24.3 MB', status: 'active' },
  { name: 'risk_model_v2.pkl', date: 'Jan 12, 2026', size: '22.1 MB', status: 'archived' },
  { name: 'weather_model_v1.pkl', date: 'Dec 05, 2025', size: '18.7 MB', status: 'archived' },
];

export default function ModelUpload() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile({ name: file.name, size: (file.size / 1024 / 1024).toFixed(2) });
    }
  };

  return (
    <div className="page-wrapper upload-page">
      <div className="page-header">
        <h1>Model Upload</h1>
        <p>Upload trained machine learning models for deployment</p>
      </div>

      <div className="upload-area">
        {/* Folder Upload */}
        <div className="folder-upload-container">
          <div className="upload-folder">
            <div className="front-side">
              <div className="tip"></div>
              <div className="cover"></div>
            </div>
            <div className="back-side cover"></div>
          </div>
          <label className="custom-file-upload">
            <input type="file" accept=".pkl,.h5,.pt,.onnx" onChange={handleFileChange} />
            Upload Trained Model (.pkl)
          </label>
        </div>

        {/* File selected info */}
        {selectedFile && (
          <div className="file-selected-info" key={selectedFile.name}>
            <div className="file-name">📄 {selectedFile.name}</div>
            <div className="file-size">{selectedFile.size} MB</div>
          </div>
        )}

        {/* Instructions */}
        <div className="upload-instructions">
          <h3>Upload Guidelines</h3>
          <ul>
            <li>
              <span className="step-num">1</span>
              Supported formats: .pkl, .h5, .pt, .onnx
            </li>
            <li>
              <span className="step-num">2</span>
              Maximum file size: 500 MB
            </li>
            <li>
              <span className="step-num">3</span>
              Model will be validated before deployment
            </li>
            <li>
              <span className="step-num">4</span>
              Previous models are automatically archived
            </li>
          </ul>
        </div>

        {/* Model History */}
        <div className="upload-history">
          <h3>Model History</h3>
          <table className="history-table">
            <thead>
              <tr>
                <th>Model Name</th>
                <th>Date</th>
                <th>Size</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {modelHistory.map((m, i) => (
                <tr key={i}>
                  <td>{m.name}</td>
                  <td>{m.date}</td>
                  <td>{m.size}</td>
                  <td>
                    <span className={`model-badge ${m.status}`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
