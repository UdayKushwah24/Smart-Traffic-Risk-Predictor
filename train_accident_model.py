"""
Train XGBoost accident severity prediction model.
Run: python train_accident_model.py
Outputs: backend/models/accident_prediction_model.pkl
         backend/models/label_encoder.pkl
"""
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import xgboost as xgb

print("XGBoost version:", xgb.__version__)

STATES = ['Maharashtra','Tamil Nadu','Uttar Pradesh','Karnataka','Rajasthan',
          'Madhya Pradesh','Gujarat','Andhra Pradesh','Telangana','Kerala',
          'West Bengal','Bihar','Punjab','Haryana','Delhi']
ROAD_TYPES = ['Single carriageway','Dual carriageway','Roundabout','One way street','Slip road']
ROAD_SURFACES = ['Dry','Wet or damp','Frost or ice','Snow','Flood over 3cm. deep']
LIGHT_CONDITIONS = ['Daylight','Darkness - lights lit','Darkness - lights unlit','Darkness - no lighting']
WEATHER_OPTIONS = ['Fine no high winds','Raining no high winds','Raining + high winds',
                   'Fine + high winds','Snowing no high winds','Fog or mist']
VEHICLE_TYPES = ['Car','Motorcycle','Van / Goods 3.5 tonnes mgw or under',
                 'Bus or coach (17 or more pass seats)','Taxi/Private hire car',
                 'Agricultural vehicle','Goods over 3.5t. and under 7.5t',
                 'Goods 7.5 tonnes mgw and over','Pedal cycle']
CASUALTY_CLASSES = ['Driver or rider','Passenger','Pedestrian']
CASUALTY_SEXES = ['Male','Female']

rng = np.random.default_rng(42)
N = 6000

def sample(arr, n):
    return rng.choice(arr, n)

states        = sample(STATES, N)
cities        = [f"City_{i}" for i in rng.integers(0, 40, N)]
n_vehicles    = rng.integers(1, 6, N)
road_types    = sample(ROAD_TYPES, N)
road_surfaces = sample(ROAD_SURFACES, N)
light_conds   = sample(LIGHT_CONDITIONS, N)
weather       = sample(WEATHER_OPTIONS, N)
cas_class     = sample(CASUALTY_CLASSES, N)
cas_sex       = sample(CASUALTY_SEXES, N)
cas_age       = rng.integers(16, 80, N)
veh_types     = sample(VEHICLE_TYPES, N)

# Risk scores to drive realistic severity distribution
risk = np.zeros(N, dtype=float)
risk += np.where(np.isin(road_surfaces, ['Frost or ice','Snow','Flood over 3cm. deep']), 2.0, 0.0)
risk += np.where(np.isin(road_surfaces, ['Wet or damp']), 0.8, 0.0)
risk += np.where(np.isin(light_conds, ['Darkness - lights unlit','Darkness - no lighting']), 2.0, 0.0)
risk += np.where(np.isin(light_conds, ['Darkness - lights lit']), 0.8, 0.0)
risk += np.where(np.isin(weather, ['Raining + high winds','Snowing no high winds','Fog or mist']), 2.0, 0.0)
risk += np.where(np.isin(weather, ['Raining no high winds','Fine + high winds']), 0.8, 0.0)
risk += np.where(np.isin(road_types, ['Roundabout','One way street']), 0.5, 0.0)
risk += np.where(np.isin(veh_types, ['Motorcycle','Pedal cycle']), 1.5, 0.0)
risk += np.where(np.isin(veh_types, ['Bus or coach (17 or more pass seats)',
                                      'Goods 7.5 tonnes mgw and over']), 0.8, 0.0)
risk += np.where((cas_age < 22) | (cas_age > 65), 0.8, 0.0)
risk += (n_vehicles - 1) * 0.5
risk += rng.normal(0, 1.0, N)

# Use percentile-based thresholds for realistic distribution: ~55% Slight, ~30% Serious, ~15% Fatal
p55 = float(np.percentile(risk, 55))
p85 = float(np.percentile(risk, 85))
severity = np.where(risk < p55, 'Slight', np.where(risk < p85, 'Serious', 'Fatal'))
counts = dict(zip(*np.unique(severity, return_counts=True)))
print("Distribution:", counts)

df = pd.DataFrame({
    'State': states, 'City': cities, 'No_of_Vehicles': n_vehicles,
    'Road_Type': road_types, 'Road_Surface': road_surfaces,
    'Light_Condition': light_conds, 'Weather': weather,
    'Casualty_Class': cas_class, 'Casualty_Sex': cas_sex,
    'Casualty_Age': cas_age, 'Vehicle_Type': veh_types,
})

le = LabelEncoder()
y = le.fit_transform(severity)
print("Encoded classes:", list(le.classes_))

CAT_COLS = ['State','City','Road_Type','Road_Surface','Light_Condition',
            'Weather','Casualty_Class','Casualty_Sex','Vehicle_Type']
NUM_COLS = ['No_of_Vehicles','Casualty_Age']

enc = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1, categories='auto')
pre = ColumnTransformer([('cat', enc, CAT_COLS), ('num', 'passthrough', NUM_COLS)])

clf = xgb.XGBClassifier(
    n_estimators=200, max_depth=6, learning_rate=0.1,
    eval_metric='mlogloss', random_state=42, n_jobs=-1,
)
pipeline = Pipeline([('prep', pre), ('clf', clf)])
pipeline.fit(df, y)
print("Training complete.")

models_dir = Path('backend/models')
models_dir.mkdir(parents=True, exist_ok=True)
joblib.dump(pipeline, models_dir / 'accident_prediction_model.pkl')
joblib.dump(le, models_dir / 'label_encoder.pkl')
print("Saved:", models_dir / 'accident_prediction_model.pkl')
print("Saved:", models_dir / 'label_encoder.pkl')

# Smoke test with the exact scenario from the screenshot
test_row = pd.DataFrame([{
    'State': 'Uttar Pradesh', 'City': 'Agra', 'No_of_Vehicles': 2,
    'Road_Type': 'Roundabout', 'Road_Surface': 'Frost or ice',
    'Light_Condition': 'Darkness - lights lit', 'Weather': 'Raining + high winds',
    'Casualty_Class': 'Driver or rider', 'Casualty_Sex': 'Male',
    'Casualty_Age': 23, 'Vehicle_Type': 'Bus or coach (17 or more pass seats)',
}])
pred = pipeline.predict(test_row)
print("Smoke test prediction:", le.inverse_transform(pred))

# Second test — safe conditions
safe_row = pd.DataFrame([{
    'State': 'Maharashtra', 'City': 'Mumbai', 'No_of_Vehicles': 1,
    'Road_Type': 'Single carriageway', 'Road_Surface': 'Dry',
    'Light_Condition': 'Daylight', 'Weather': 'Fine no high winds',
    'Casualty_Class': 'Driver or rider', 'Casualty_Sex': 'Male',
    'Casualty_Age': 30, 'Vehicle_Type': 'Car',
}])
pred2 = pipeline.predict(safe_row)
print("Safe conditions prediction:", le.inverse_transform(pred2))
