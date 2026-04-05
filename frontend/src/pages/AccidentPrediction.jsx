import { useState } from 'react';
import '../styles/accident.css';
import AccidentOrbWidget from '../components/AccidentOrbWidget';

const STATES = [
  'Maharashtra', 'Tamil Nadu', 'Uttar Pradesh', 'Karnataka', 'Rajasthan',
  'Madhya Pradesh', 'Gujarat', 'Andhra Pradesh', 'Telangana', 'Kerala',
  'West Bengal', 'Bihar', 'Punjab', 'Haryana', 'Delhi',
];

const ROAD_TYPES = [
  'Single carriageway', 'Dual carriageway', 'Roundabout',
  'One way street', 'Slip road',
];

const ROAD_SURFACES = [
  'Dry', 'Wet or damp', 'Frost or ice', 'Snow', 'Flood over 3cm. deep',
];

const LIGHT_CONDITIONS = [
  'Daylight', 'Darkness - lights lit', 'Darkness - lights unlit',
  'Darkness - no lighting',
];

const WEATHER_OPTIONS = [
  'Fine no high winds', 'Raining no high winds', 'Raining + high winds',
  'Fine + high winds', 'Snowing no high winds', 'Fog or mist',
];

const VEHICLE_TYPES = [
  'Car', 'Motorcycle', 'Van / Goods 3.5 tonnes mgw or under',
  'Bus or coach (17 or more pass seats)', 'Taxi/Private hire car',
  'Agricultural vehicle', 'Goods over 3.5t. and under 7.5t',
  'Goods 7.5 tonnes mgw and over', 'Pedal cycle',
];

const CASUALTY_CLASSES = ['Driver or rider', 'Passenger', 'Pedestrian'];
const CASUALTY_SEXES = ['Male', 'Female'];

const initialForm = {
  State: '', City: '', No_of_Vehicles: '',
  Road_Type: '', Road_Surface: '', Light_Condition: '',
  Weather: '', Casualty_Class: '', Casualty_Sex: '',
  Casualty_Age: '', Vehicle_Type: '',
};

export default function AccidentPrediction() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        ...form,
        No_of_Vehicles: parseInt(form.No_of_Vehicles, 10),
        Casualty_Age: parseInt(form.Casualty_Age, 10),
      };

      const resp = await fetch('/api/accident/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setResult(null);
    setError(null);
  };

  const getSeverityClass = (prediction) => {
    if (!prediction) return '';
    const p = prediction.toLowerCase();
    if (p.includes('fatal')) return 'fatal';
    if (p.includes('serious')) return 'serious';
    return 'slight';
  };

  return (
    <div className="page-wrapper accident-page">
      <div className="page-header">
        <h1>Road Accident Severity Predictor</h1>
        <p>Predict accident severity using AI & Machine Learning</p>
      </div>

      {/* Warning Banner */}
      <div className="accident-warning">
        <span className="warning-icon">⚠️</span>
        <span>Enter accurate details for the most reliable prediction</span>
      </div>

      <AccidentOrbWidget />

      {/* Result Display */}
      {result && (
        <div className={`accident-result ${getSeverityClass(result.prediction)}`}>
          <div className="result-crash-scene">
            <span className="crash-car-l">🚗</span>
            <span className="crash-spark">💥</span>
            <span className="crash-car-r">🚙</span>
          </div>
          <h2>Prediction Result</h2>
          <div className={`severity-badge ${getSeverityClass(result.prediction)}`}>
            <span>
              {getSeverityClass(result.prediction) === 'fatal' && '💀'}
              {getSeverityClass(result.prediction) === 'serious' && '🚑'}
              {getSeverityClass(result.prediction) === 'slight' && '🩹'}
            </span>
            {result.prediction}
          </div>

          {/* Input summary */}
          <div className="result-details">
            <h3>📋 Input Details</h3>
            <div className="detail-grid">
              {Object.entries(result.input_data).map(([key, val]) => (
                <div className="detail-item" key={key}>
                  <span className="detail-label">{key.replace(/_/g, ' ')}</span>
                  <span className="detail-value">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="result-timestamp">
            🕐 Predicted at {new Date().toLocaleString()}
          </div>

          <button className="btn-another" onClick={handleReset}>
            ⬅️ Make Another Prediction
          </button>
        </div>
      )}

      {/* Form */}
      {!result && (
        <form className="accident-form" onSubmit={handleSubmit}>
          {/* Section 1: Location */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">📍</span> Location Information
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label><span className="label-icon">🏛️</span> State</label>
                <select name="State" value={form.State} onChange={handleChange} required>
                  <option value="" disabled>Select State</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><span className="label-icon">🏙️</span> City</label>
                <input type="text" name="City" value={form.City}
                  onChange={handleChange} placeholder="e.g. Mumbai, Chennai..." required />
              </div>
            </div>
          </div>

          {/* Section 2: Road & Environment */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">🛣️</span> Road & Environment
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label><span className="label-icon">🛤️</span> Road Type</label>
                <select name="Road_Type" value={form.Road_Type} onChange={handleChange} required>
                  <option value="" disabled>Select Road Type</option>
                  {ROAD_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><span className="label-icon">🧱</span> Road Surface</label>
                <select name="Road_Surface" value={form.Road_Surface} onChange={handleChange} required>
                  <option value="" disabled>Select Surface</option>
                  {ROAD_SURFACES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><span className="label-icon">💡</span> Light Condition</label>
                <select name="Light_Condition" value={form.Light_Condition} onChange={handleChange} required>
                  <option value="" disabled>Select Light</option>
                  {LIGHT_CONDITIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><span className="label-icon">🌦️</span> Weather</label>
                <select name="Weather" value={form.Weather} onChange={handleChange} required>
                  <option value="" disabled>Select Weather</option>
                  {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Vehicle Info */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">🚘</span> Vehicle Information
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label><span className="label-icon">🔢</span> Number of Vehicles</label>
                <input type="number" name="No_of_Vehicles" value={form.No_of_Vehicles}
                  onChange={handleChange} min="1" max="20" placeholder="e.g. 2" required />
              </div>
              <div className="form-group">
                <label><span className="label-icon">🚐</span> Vehicle Type</label>
                <select name="Vehicle_Type" value={form.Vehicle_Type} onChange={handleChange} required>
                  <option value="" disabled>Select Vehicle</option>
                  {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Casualty Info */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">🧑‍⚕️</span> Casualty Information
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label><span className="label-icon">🎭</span> Casualty Class</label>
                <select name="Casualty_Class" value={form.Casualty_Class} onChange={handleChange} required>
                  <option value="" disabled>Select Class</option>
                  {CASUALTY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><span className="label-icon">⚧</span> Casualty Sex</label>
                <select name="Casualty_Sex" value={form.Casualty_Sex} onChange={handleChange} required>
                  <option value="" disabled>Select Sex</option>
                  {CASUALTY_SEXES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><span className="label-icon">🎂</span> Casualty Age</label>
                <input type="number" name="Casualty_Age" value={form.Casualty_Age}
                  onChange={handleChange} min="0" max="120" placeholder="e.g. 30" required />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="btn-container">
            <button type="submit" className="btn-predict" disabled={loading}>
              <span className="btn-icon">🚨</span>
              {loading ? 'Predicting…' : 'Predict Severity'}
            </button>
          </div>

          {error && (
            <div className="accident-error">
              <span>❌</span> {error}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
