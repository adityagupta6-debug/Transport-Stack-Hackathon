import React,{useEffect,useMemo,useRef,useState} from 'react';
import {stops,routes,stopById,crowdLevel,estimateLoad} from './data/transit';
import {parseCSV,summarizeUploadedRows} from './utils/csv';

const Icon=({children})=><span className="icon" aria-hidden="true">{children}</span>;
const fmtTime=h=>`${String(h).padStart(2,'0')}:00`;
function App(){
 const [page,setPage]=useState('planner');
 const [origin,setOrigin]=useState('kashmere');
 const [destination,setDestination]=useState('nehru');
 const [time,setTime]=useState('08:00');
 const [day,setDay]=useState('weekday');
 const [priority,setPriority]=useState('balanced');
 const [uploaded,setUploaded]=useState(null);
 const [uploadError,setUploadError]=useState('');
 const [uploadRows,setUploadRows]=useState([]);
 const [selectedRoute,setSelectedRoute]=useState(null);
 const [backendSummary,setBackendSummary]=useState(null);
 const [modelMetrics,setModelMetrics]=useState(null);
 const [backendError,setBackendError]=useState('');
 useEffect(()=>{
  let alive=true;
  Promise.all([fetch('http://127.0.0.1:8000/api/summary'),fetch('http://127.0.0.1:8000/api/model/metrics')])
   .then(async responses=>{if(responses.some(r=>!r.ok))throw new Error('Backend API did not return a successful response.');return Promise.all(responses.map(r=>r.json()));})
   .then(([summary,metrics])=>{if(alive){setBackendSummary(summary);setModelMetrics(metrics);setBackendError('');}})
   .catch(()=>{if(alive)setBackendError('Backend not connected. Start the FastAPI service on port 8000 to load the October database and model metrics.');});
  return ()=>{alive=false;};
 },[]);
 const fileRef=useRef(null);
 const hour=Number(time.split(':')[0]);
 const options=useMemo(()=>{
  if(origin===destination)return [];
  return routes.map(route=>{
   const a=route.stops.indexOf(origin),b=route.stops.indexOf(destination);
   if(a<0||b<0||b<=a)return null;
   // Route stop lists are directional; reverse-direction trips need their own verified route record.
   const segments=b-a;
   const duration=Math.max(8,Math.round(route.base*(segments/(route.stops.length-1))));
   const load=estimateLoad(route,hour,day);
   const wait=Math.round(route.frequency/2);
   const score=priority==='less-crowded'?load*0.75+duration*0.25:priority==='fastest'?duration*0.75+load*0.25:duration*0.55+load*0.45;
   return {...route,duration,load,wait,total:duration+wait,score,fromIndex:a,toIndex:b};
  }).filter(Boolean).sort((a,b)=>a.score-b.score).slice(0,4);
 },[origin,destination,hour,day,priority]);
 const handleUpload=async e=>{
  const f=e.target.files?.[0]; if(!f)return;
  setUploadError('');
  setUploaded(null);
  setUploadRows([]);
  try{
   const text=await f.text(); const parsed=parseCSV(text);
   if(!parsed.records.length)throw new Error('No data rows found. Please select a valid CSV file.');
   setUploadRows(parsed.records);setUploaded({name:f.name,...summarizeUploadedRows(parsed.records),headers:parsed.headers});
  }catch(err){setUploadError(err.message||'Could not read this CSV.');}
  finally{if(fileRef.current)fileRef.current.value='';}
 };
 const best=options[0];
 const routeLoadCounts=[...routes].map(r=>({route:r,load:estimateLoad(r,hour,day)})).sort((a,b)=>b.load-a.load);
 const maxHour=Math.max(...Array(24).fill(0).map((_,i)=>estimateLoad(routes[0],i,day)));
 return <div className="app-shell">
  <aside className="sidebar">
   <div className="brand"><div className="brand-mark">D</div><div><b>DelhiTransit</b><small>SMARTER BUS JOURNEYS</small></div></div>
   <div className="side-label">WORKSPACE</div>
   {[['planner','⌁','Journey planner'],['analytics','▥','Crowding insights'],['data','⇧','Dataset workspace']].map(([id,ic,label])=><button key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>setPage(id)}><span>{ic}</span>{label}{id==='planner'&&<i/>}</button>)}
   <div className="sidebar-bottom"><div className="live-dot"/> Prototype environment <small>DEMO DATA MODE</small></div>
  </aside>
  <main className="main">
   <header className="topbar"><div className="crumb">Delhi / <b>{page==='planner'?'Journey planner':page==='analytics'?'Crowding insights':'Dataset workspace'}</b></div><div className="top-right"><span className="status-pill"><i/> Service concept</span><div className="avatar">DT</div></div></header>
   <div className="content">
    {page==='planner'&&<><section className="page-heading"><div><div className="eyebrow">COMMUTER TOOLS <span>•</span> DELHI NCR</div><h1>Plan a better journey.</h1><p>Compare bus options by travel time and estimated crowding before you leave.</p></div><div className="heading-date"><span>◷</span> ESTIMATES BY DEPARTURE TIME</div></section>
     <section className="planner-card">
      <div className="card-head"><div><h2>Where are you headed?</h2><p>Choose your stops and journey preferences</p></div><span className="step-tag">01 / PLAN</span></div>
      <div className="journey-fields">
       <label><span className="field-label">FROM</span><div className="select-wrap"><span className="pin from">●</span><select value={origin} onChange={e=>setOrigin(e.target.value)}>{stops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div></label>
       <button className="swap" title="Swap origin and destination" onClick={()=>{setOrigin(destination);setDestination(origin)}}>↕</button>
       <label><span className="field-label">TO</span><div className="select-wrap"><span className="pin to">●</span><select value={destination} onChange={e=>setDestination(e.target.value)}>{stops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div></label>
       <label><span className="field-label">DEPARTURE</span><div className="select-wrap"><span className="field-symbol">◷</span><input type="time" value={time} onChange={e=>setTime(e.target.value)}/></div></label>
       <label><span className="field-label">DAY TYPE</span><div className="select-wrap"><span className="field-symbol">▦</span><select value={day} onChange={e=>setDay(e.target.value)}><option value="weekday">Weekday</option><option value="weekend">Weekend</option></select></div></label>
      </div>
      <div className="planner-bottom"><div className="preference"><span className="field-label">OPTIMISE FOR</span><div className="segmented">{[['balanced','Balanced'],['less-crowded','Less crowded'],['fastest','Fastest']].map(([v,l])=><button key={v} className={priority===v?'chosen':''} onClick={()=>setPriority(v)}>{l}</button>)}</div></div><button className="primary-btn" onClick={()=>setSelectedRoute(best?.id||null)}>Find bus journeys <span>→</span></button></div>
     </section>
     <section className="results-head"><div><div className="eyebrow">YOUR OPTIONS</div><h2>{options.length} journey options <span className="muted">· {time} departure</span></h2></div><span className="demo-tag">DEMO ESTIMATES</span></section>
     {origin===destination?<div className="empty-state">Choose two different stops to compare bus journeys.</div>:options.length===0?<div className="empty-state">No sample route directly connects these stops. Try a different pair of stops.</div>:<div className="results-grid">{options.map((o,i)=><article key={o.id} className={`route-card ${i===0?'recommended':''}`}><div className="route-top"><div className="route-number">DTC / CLUSTER <b>{o.number}</b></div>{i===0&&<span className="recommended-label">BEST MATCH</span>}</div><h3>{o.name}</h3><div className="route-line"><div className="route-stop"><i className="start-dot"/><span><b>{stopById(origin)?.name}</b><small>Boarding stop</small></span></div><div className="line-mid"><span>{o.total} min total</span></div><div className="route-stop"><i className="end-dot"/><span><b>{stopById(destination)?.name}</b><small>Destination</small></span></div></div><div className="route-metrics"><div><small>TRAVEL + WAIT</small><b>{o.total} <em>min</em></b></div><div><small>EST. LOAD</small><b>{o.load}%</b></div><div><small>FREQUENCY</small><b>{o.frequency} <em>min</em></b></div></div><div className="load-row"><div className="load-label"><span className={`crowd-dot ${o.load>85?'high':o.load>55?'mid':'low'}`}/>{crowdLevel(o.load)}</div><div className="load-track"><div className={`load-fill ${o.load>85?'high':o.load>55?'mid':'low'}`} style={{width:o.load+'%'}}/></div></div><div className="route-foot"><span>Approx. {o.duration} min onboard · {o.wait} min wait</span><button onClick={()=>setSelectedRoute(selectedRoute===o.id?null:o.id)}>{selectedRoute===o.id?'Hide details':'View details'} ↗</button></div>{selectedRoute===o.id&&<div className="detail-panel"><b>Route details</b><p>{o.stops.map(id=>stopById(id)?.name).join('  →  ')}</p><small>Stop order and direction are illustrative in this demo. Confirm route direction against official GTFS before deployment.</small></div>}</article>)}</div>}
     <div className="notice"><span>ⓘ</span><div><b>About these crowding estimates</b><p>Demo mode uses a transparent, illustrative hourly demand curve and sample route factors. It does not represent live bus occupancy or measured October ticketing results. Upload the official dataset in Dataset workspace to inspect its rows and coverage.</p></div></div>
    </>}
    {page==='analytics'&&<><section className="page-heading"><div><div className="eyebrow">NETWORK PULSE <span>•</span> DELHI NCR</div><h1>Understand the rush.</h1><p>Explore how the sample demand profile changes through the day.</p></div><span className="demo-tag">ILLUSTRATIVE PROFILE</span></section>
     <div className="kpi-grid"><div className="kpi"><small>ROUTES IN SAMPLE</small><b>{routes.length}</b><span>Illustrative corridors</span></div><div className="kpi"><small>STOPS IN SAMPLE</small><b>{stops.length}</b><span>Delhi reference stops</span></div><div className="kpi"><small>PEAK PERIOD</small><b>18:00–20:00</b><span>Shaped demo demand curve</span></div><div className="kpi"><small>DATASET STATUS</small><b>{uploaded?'Uploaded':'Not connected'}</b><span>{uploaded?'CSV loaded in this session':'No official data loaded'}</span></div></div>
     <section className="panel"><div className="panel-heading"><div><h2>Hourly crowding profile</h2><p>Sample route · {day==='weekday'?'Weekday':'Weekend'} pattern</p></div><select className="compact-select" value={day} onChange={e=>setDay(e.target.value)}><option value="weekday">Weekday</option><option value="weekend">Weekend</option></select></div><div className="bar-chart">{Array.from({length:24},(_,h)=>{let v=estimateLoad(routes[0],h,day);return <div className="bar-col" key={h}><div className="bar-value">{v}%</div><div className="bar-bg"><div className={`bar ${v>85?'high':v>55?'mid':'low'}`} style={{height:v+'%'}}/></div><span>{h%3===0?String(h).padStart(2,'0'):''}</span></div>})}</div><div className="chart-legend"><span><i className="legend-low"/> Seats available ≤55%</span><span><i className="legend-mid"/> Standing room 56–85%</span><span><i className="legend-high"/> Crowded &gt;85%</span></div></section>
     <section className="panel"><div className="panel-heading"><div><h2>Route load comparison</h2><p>Estimated load at {time}</p></div><input type="time" className="compact-select" value={time} onChange={e=>setTime(e.target.value)}/></div><div className="route-table">{routeLoadCounts.map(({route,load})=><div className="table-row" key={route.id}><div><b>{route.number}</b><span>{route.name}</span></div><div className="table-track"><div className={`load-fill ${load>85?'high':load>55?'mid':'low'}`} style={{width:load+'%'}}/></div><strong>{load}%</strong><small>{crowdLevel(load)}</small></div>)}</div></section>
     <div className="notice"><span>ⓘ</span><div><b>Interpretation note</b><p>These charts are generated from a hand-shaped sample curve for interface demonstration. No MAPE, accuracy, occupancy, or weekly validation score is claimed.</p></div></div>
    </>}
    {page==='data'&&<><section className="page-heading"><div><div className="eyebrow">DATA WORKSPACE <span>•</span> INGESTION</div><h1>October data intelligence.</h1><p>Explore the supplied ETM database, model validation and optional CSV inspection.</p></div><span className="step-tag">02 / DATA</span></section>
     <section className="panel"><div className="panel-heading"><div><h2>October ETM database & ML service</h2><p>Aggregated transaction analytics from the supplied ticket export</p></div><span className={backendSummary?'success-tag':'step-tag'}>{backendSummary?'API CONNECTED':'API STATUS'}</span></div>
      {backendError&&<p className="muted-text">{backendError}</p>}
      {backendSummary&&<><div className="kpi-grid small-kpis"><div className="kpi"><small>OCTOBER TICKETS</small><b>{backendSummary.october_rows.toLocaleString()}</b></div><div className="kpi"><small>ROUTE IDENTIFIERS</small><b>{backendSummary.distinct_routes.toLocaleString()}</b></div><div className="kpi"><small>OBSERVED DATES</small><b>{backendSummary.service_dates}</b></div><div className="kpi"><small>HOURLY AGGREGATES</small><b>{backendSummary.hourly_aggregate_rows.toLocaleString()}</b></div></div><p className="muted-text">Coverage: {backendSummary.min_local_timestamp} to {backendSummary.max_local_timestamp} (Asia/Kolkata). Missing calendar dates are not treated as zero-demand days.</p></>}
      {modelMetrics&&<><h3>Model validation · chronological holdout</h3><div className="kpi-grid small-kpis"><div className="kpi"><small>MODEL</small><b style={{fontSize:'16px'}}>HistGradientBoosting</b></div><div className="kpi"><small>HOLDOUT MAE</small><b>{modelMetrics.mae_tickets_per_route_hour.toFixed(2)}</b><span>tickets / route-hour</span></div><div className="kpi"><small>BASELINE MAE</small><b>{modelMetrics.baseline_mae_global_mean.toFixed(2)}</b><span>global mean baseline</span></div><div className="kpi"><small>R²</small><b>{modelMetrics.r2.toFixed(2)}</b><span>negative = poor fit</span></div></div><p className="muted-text">Model target: ticket transaction volume, not passenger occupancy. The current model underperforms the simple baseline on the chronological holdout and is marked experimental/low-confidence. It must be improved and revalidated before claiming predictive accuracy.</p></>}
     </section>
     <section className="upload-panel"><div className="upload-icon">⇧</div><h2>Upload ticketing or ETM CSV</h2><p>Choose a CSV file from your computer. The selected file is inspected locally in your browser; the October ETM database is already loaded by the backend service.</p><input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleUpload} hidden/><button className="primary-btn" onClick={()=>fileRef.current?.click()}>Choose CSV file <span>→</span></button><small className="privacy-note">CSV is not sent to a server by this demo.</small>{uploadError&&<div className="error">{uploadError}</div>}</section>
     {uploaded&&<section className="panel uploaded-panel"><div className="panel-heading"><div><h2>File inspection complete</h2><p>{uploaded.name}</p></div><span className="success-tag">READ SUCCESSFULLY</span></div><div className="kpi-grid small-kpis"><div className="kpi"><small>ROWS READ</small><b>{uploaded.total.toLocaleString()}</b></div><div className="kpi"><small>ROUTE VALUES</small><b>{uploaded.routeCount||'—'}</b></div><div className="kpi"><small>TIME COVERAGE</small><b>{uploaded.min==='Not detected'?'Not found':uploaded.min+' – '+uploaded.max}</b></div></div><h3>Detected columns</h3><div className="chips">{uploaded.headers.map(h=><span key={h}>{h}</span>)}</div><p className="muted-text">This is a structural inspection only. It does not yet calculate passenger occupancy. A valid crowding model needs documented boarding/alighting or trip-level passenger counts, GTFS stop sequence, vehicle capacity assumptions and data-quality checks.</p><h3>Sample rows</h3><div className="table-scroll"><table><thead><tr>{uploaded.headers.slice(0,6).map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{uploadRows.slice(0,5).map((r,i)=><tr key={i}>{uploaded.headers.slice(0,6).map(h=><td key={h}>{r[h]}</td>)}</tr>)}</tbody></table></div></section>}
     <section className="panel"><div className="panel-heading"><div><h2>Data readiness checklist</h2><p>Items to confirm before publishing predictions</p></div></div><div className="check-list">{[['Ticket records','Actual October ticketing CSV from the organiser'],['Route and stop mapping','Official static GTFS files and direction identifiers'],['Passenger load method','Boarding/alighting or defensible passenger-count proxy'],['Vehicle capacity','Documented capacity by vehicle type'],['Validation','Holdout period and measured error calculation']].map(([a,b])=><div key={a}><span className="check-empty">○</span><div><b>{a}</b><small>{b}</small></div><em>To verify</em></div>)}</div></section>
    </>}
    <footer><span>DelhiTransit <b>·</b> Crowdedness-aware journey planning concept</span><span>Built for transparent, data-informed commuting</span></footer>
   </div>
  </main>
 </div>
}
export default App;
