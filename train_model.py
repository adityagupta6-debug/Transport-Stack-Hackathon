from pathlib import Path
import sqlite3, json, joblib, numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
ROOT=Path(__file__).resolve().parent
DB=ROOT/'backend'/'data'/'delhitransit.sqlite3'
OUT=ROOT/'backend'/'models'/'hourly_demand_model.joblib'
OUT.parent.mkdir(parents=True,exist_ok=True)
con=sqlite3.connect(DB)
df=pd.read_sql_query('''SELECT service_date,route,service_hour,weekday,is_weekend,ticket_count,passenger_total,vehicle_count
FROM hourly_route_demand WHERE service_date >= '2026-10-01' AND service_date <= '2026-10-30' ''',con)
con.close()
if len(df)<100: raise SystemExit('Not enough aggregate rows to train.')
df['service_date']=pd.to_datetime(df.service_date)
df['day_of_month']=df.service_date.dt.day
# Chronological holdout: latest 4 observed service dates are never used for fitting.
dates=sorted(df.service_date.dt.date.unique())
holdout_dates=set(dates[-4:])
train=df[~df.service_date.dt.date.isin(holdout_dates)].copy()
test=df[df.service_date.dt.date.isin(holdout_dates)].copy()
route_means=train.groupby('route').ticket_count.mean().to_dict()
global_mean=float(train.ticket_count.mean())
def features(frame):
    route_prior=frame.route.map(route_means).fillna(global_mean).astype(float)
    hour=frame.service_hour.astype(float)
    dow=frame.weekday.astype(float)
    return pd.DataFrame({
      'route_historical_mean_tickets':route_prior,
      'hour_sin':np.sin(2*np.pi*hour/24), 'hour_cos':np.cos(2*np.pi*hour/24),
      'weekday_sin':np.sin(2*np.pi*dow/7), 'weekday_cos':np.cos(2*np.pi*dow/7),
      'day_of_month':frame.day_of_month.astype(float),
      'is_weekend':frame.is_weekend.astype(float)
    })
X_train=features(train); X_test=features(test)
y_train=train.ticket_count.astype(float); y_test=test.ticket_count.astype(float)
model=HistGradientBoostingRegressor(max_iter=180,learning_rate=0.07,max_leaf_nodes=20,l2_regularization=1.0,random_state=42)
model.fit(X_train,y_train)
pred=np.maximum(0,model.predict(X_test))
mae=float(mean_absolute_error(y_test,pred)); rmse=float(np.sqrt(mean_squared_error(y_test,pred)))
metrics={'model':'HistGradientBoostingRegressor','target':'hourly ticket transaction count per route','training_rows':int(len(train)),'holdout_rows':int(len(test)),'training_dates':[str(d) for d in sorted(train.service_date.dt.date.unique())],'holdout_dates':[str(d) for d in sorted(holdout_dates)],'mae_tickets_per_route_hour':mae,'rmse_tickets_per_route_hour':rmse,'r2':float(r2_score(y_test,pred)) if len(test)>1 else None,'baseline_mae_global_mean':float(mean_absolute_error(y_test,np.full(len(y_test),global_mean))),'routes_seen_in_training':len(route_means),'limitations':'Predicts ticket transaction volume, not onboard occupancy. Sparse route-hours may have zero observed tickets; this is a demand proxy. Holdout is chronological but limited to this one-month extract.'}
artifact={'model':model,'route_means':route_means,'global_mean':global_mean,'metrics':metrics,'features':['route_historical_mean_tickets','hour_sin','hour_cos','weekday_sin','weekday_cos','day_of_month','is_weekend']}
joblib.dump(artifact,OUT,compress=3)
(ROOT/'backend'/'models'/'model_metrics.json').write_text(json.dumps(metrics,indent=2))
print(json.dumps(metrics,indent=2)); print('MODEL_BYTES',OUT.stat().st_size)
