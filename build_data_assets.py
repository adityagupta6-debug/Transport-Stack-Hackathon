from pathlib import Path
import sqlite3, pandas as pd, numpy as np, gzip, shutil, json, os
from datetime import datetime
ROOT=Path(__file__).resolve().parent
DATA=ROOT/'backend'/'data'/'october_etm_source.tsv.gz'
DB=ROOT/'backend'/'data'/'delhitransit.sqlite3'
DB.parent.mkdir(parents=True,exist_ok=True)
if not DATA.exists(): raise SystemExit(f'Missing input data: {DATA}')
con=sqlite3.connect(DB)
con.execute('PRAGMA journal_mode=WAL')
con.execute('PRAGMA synchronous=NORMAL')
con.execute('DROP TABLE IF EXISTS ticket_records')
con.execute('DROP TABLE IF EXISTS hourly_route_demand')
con.execute('DROP TABLE IF EXISTS data_metadata')
con.execute('''CREATE TABLE ticket_records (
 id INTEGER PRIMARY KEY, passenger_count INTEGER, amount REAL, vehicle_number TEXT,
 ticket_type_id TEXT, end_stop_name TEXT, route TEXT, start_stop_name TEXT,
 created_at TEXT, is_ac INTEGER, service_date TEXT, service_hour INTEGER, weekday INTEGER
)''')
con.execute('''CREATE TABLE hourly_route_demand (
 service_date TEXT NOT NULL, route TEXT NOT NULL, service_hour INTEGER NOT NULL,
 weekday INTEGER NOT NULL, is_weekend INTEGER NOT NULL, ticket_count INTEGER NOT NULL,
 passenger_total INTEGER NOT NULL, vehicle_count INTEGER NOT NULL,
 avg_fare REAL, ac_share REAL, PRIMARY KEY(service_date,route,service_hour)
)''')
con.execute('CREATE TABLE data_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
con.commit()
# The supplied source is retained as a gzip-compressed TSV in backend/data.
raw_rows=0; min_dt=None; max_dt=None; bad_ts=0; null_routes=0; unique_routes=set(); date_counts={};
for chunk in pd.read_csv(DATA,sep='\t',compression='infer',chunksize=50000,dtype=str,keep_default_na=False,na_values=[] ,on_bad_lines='skip'):
    # normalize NULL sentinels
    for c in chunk.columns:
        chunk[c]=chunk[c].replace({'NULL':None,'':None})
    ts=pd.to_datetime(chunk['created_at'],errors='coerce',utc=True)
    bad_ts += int(ts.isna().sum())
    valid=ts.notna()
    chunk=chunk.loc[valid].copy(); ts=ts.loc[valid]
    # preserve source timestamp as supplied; use local timestamp for service date/hour
    local=ts.dt.tz_convert('Asia/Kolkata')
    chunk['passenger_count']=pd.to_numeric(chunk['passenger_count'],errors='coerce').fillna(0).astype(int)
    chunk['amount']=pd.to_numeric(chunk['amount'],errors='coerce')
    chunk['is_ac']=chunk['is_ac'].astype(str).str.upper().map({'TRUE':1,'FALSE':0})
    chunk['service_date']=local.dt.strftime('%Y-%m-%d')
    chunk['service_hour']=local.dt.hour.astype(int)
    chunk['weekday']=local.dt.weekday.astype(int)
    chunk['created_at']=chunk['created_at'].astype(str)
    chunk['route']=chunk['route'].astype('string')
    null_routes += int(chunk['route'].isna().sum())
    unique_routes.update(chunk['route'].dropna().unique().tolist())
    raw_rows += len(chunk)
    lo=local.min(); hi=local.max()
    min_dt=lo if min_dt is None or lo<min_dt else min_dt
    max_dt=hi if max_dt is None or hi>max_dt else max_dt
    for d,n in chunk['service_date'].value_counts().items(): date_counts[d]=date_counts.get(d,0)+int(n)
    cols=['passenger_count','amount','vehicle_number','ticket_type_id','end_stop_name','route','start_stop_name','created_at','is_ac','service_date','service_hour','weekday']
    # bulk insert raw records
    chunk[cols].to_sql('ticket_records',con,if_exists='append',index=False,chunksize=10000,method='multi')
    con.commit()
con.execute('''INSERT INTO hourly_route_demand
SELECT service_date, route, service_hour, weekday, CASE WHEN weekday>=5 THEN 1 ELSE 0 END,
       COUNT(*), SUM(passenger_count), COUNT(DISTINCT vehicle_number), AVG(amount), AVG(is_ac)
FROM ticket_records WHERE route IS NOT NULL GROUP BY service_date,route,service_hour,weekday''')
con.execute('CREATE INDEX idx_ticket_date ON ticket_records(service_date)')
con.execute('CREATE INDEX idx_ticket_route_date ON ticket_records(route,service_date)')
con.execute('CREATE INDEX idx_ticket_vehicle ON ticket_records(vehicle_number)')
con.execute('CREATE INDEX idx_demand_route_date ON hourly_route_demand(route,service_date)')
# metadata + summary
summary={
 'source_file':'October ETM ticketing export supplied by user', 'source_rows':raw_rows,
 'source_bytes':DATA.stat().st_size,'valid_timestamp_rows':raw_rows,'invalid_timestamp_rows':bad_ts,
 'distinct_routes':len(unique_routes),'min_local_timestamp':min_dt.isoformat() if min_dt is not None else None,
 'max_local_timestamp':max_dt.isoformat() if max_dt is not None else None,
 'service_dates':len(date_counts),'date_row_counts':date_counts,
 'october_rows':sum(n for d,n in date_counts.items() if d.startswith('2026-10')),
 'september_rows':sum(n for d,n in date_counts.items() if d.startswith('2026-09')),
 'route_null_rows':null_routes,'timezone':'Asia/Kolkata',
 'missing_calendar_dates':[d.strftime('%Y-%m-%d') for d in pd.date_range(min(date_counts),max(date_counts),freq='D') if d.strftime('%Y-%m-%d') not in date_counts],
 'limitations':'Ticket transactions are demand proxies; they are not direct onboard occupancy or capacity measurements.'}
for k,v in summary.items(): con.execute('INSERT OR REPLACE INTO data_metadata VALUES (?,?)',(k,json.dumps(v)))
con.commit(); con.execute('VACUUM'); con.close()
(ROOT/'backend'/'data'/'data_audit.json').write_text(json.dumps(summary,indent=2))
print(json.dumps({k:summary[k] for k in ['source_rows','distinct_routes','min_local_timestamp','max_local_timestamp','service_dates','october_rows','september_rows','invalid_timestamp_rows','route_null_rows']},indent=2))
print('DB',DB.stat().st_size,'SOURCE_GZIP',DATA.stat().st_size)
