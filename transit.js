export const stops = [
 {id:'kashmere',name:'Kashmere Gate ISBT',area:'North Delhi',lat:28.6675,lon:77.2282,hub:true},
 {id:'civil',name:'Civil Lines',area:'North Delhi',lat:28.6815,lon:77.2248},
 {id:'du',name:'Delhi University',area:'North Delhi',lat:28.6951,lon:77.2149,hub:true},
 {id:'azadpur',name:'Azadpur Terminal',area:'North-West Delhi',lat:28.7076,lon:77.1806,hub:true},
 {id:'pitampura',name:'Pitampura / NSP',area:'North-West Delhi',lat:28.6957,lon:77.1526,hub:true},
 {id:'karol',name:'Karol Bagh',area:'Central Delhi',lat:28.6442,lon:77.1885,hub:true},
 {id:'cp',name:'Connaught Place',area:'Central Delhi',lat:28.6295,lon:77.2145,hub:true},
 {id:'ito',name:'ITO',area:'Central Delhi',lat:28.6289,lon:77.2416,hub:true},
 {id:'anand',name:'Anand Vihar ISBT',area:'East Delhi',lat:28.6469,lon:77.3160,hub:true},
 {id:'laxmi',name:'Laxmi Nagar',area:'East Delhi',lat:28.6305,lon:77.2775},
 {id:'mayur',name:'Mayur Vihar Phase 1',area:'East Delhi',lat:28.6095,lon:77.2943},
 {id:'skk',name:'Sarai Kale Khan ISBT',area:'South-East Delhi',lat:28.5891,lon:77.2564,hub:true},
 {id:'lajpat',name:'Lajpat Nagar',area:'South Delhi',lat:28.5677,lon:77.2367,hub:true},
 {id:'aiims',name:'AIIMS',area:'South Delhi',lat:28.5672,lon:77.2100,hub:true},
 {id:'nehru',name:'Nehru Place',area:'South Delhi',lat:28.5494,lon:77.2519,hub:true},
 {id:'dwarka',name:'Dwarka Sector 10',area:'South-West Delhi',lat:28.5812,lon:77.0565},
 {id:'janakpuri',name:'Janakpuri District Centre',area:'West Delhi',lat:28.6289,lon:77.0795}
];
export const routes = [
 {id:'R-405',number:'405',name:'Kashmere Gate – Badarpur',stops:['kashmere','karol','cp','ito','skk','lajpat'],base:42,capacity:68,frequency:12},
 {id:'R-423',number:'423',name:'Kashmere Gate – Nehru Place',stops:['kashmere','civil','cp','ito','lajpat','nehru'],base:38,capacity:68,frequency:10},
 {id:'R-604',number:'604',name:'Anand Vihar – AIIMS',stops:['anand','laxmi','ito','cp','karol','aiims'],base:48,capacity:74,frequency:15},
 {id:'R-764',number:'764',name:'Dwarka – Nehru Place',stops:['dwarka','janakpuri','karol','cp','lajpat','nehru'],base:55,capacity:68,frequency:18},
 {id:'R-910',number:'910',name:'Azadpur – Anand Vihar',stops:['azadpur','pitampura','du','kashmere','ito','anand'],base:46,capacity:74,frequency:14},
 {id:'R-781',number:'781',name:'Pitampura – Lajpat Nagar',stops:['pitampura','du','kashmere','cp','lajpat'],base:44,capacity:68,frequency:12},
 {id:'R-611',number:'611',name:'Mayur Vihar – AIIMS',stops:['mayur','anand','laxmi','ito','skk','aiims'],base:41,capacity:68,frequency:13},
 {id:'R-894',number:'894',name:'Nehru Place – Dwarka',stops:['nehru','lajpat','cp','karol','janakpuri','dwarka'],base:58,capacity:74,frequency:16}
];
export const stopById = id => stops.find(s=>s.id===id);
export const crowdLevel = n => n <= 55 ? 'Seats available' : n <= 85 ? 'Standing room' : 'Crowded';
export function estimateLoad(route,hour,dayType='weekday') {
 const curve = [20,16,13,12,14,22,42,68,82,70,55,48,52,50,48,55,69,84,92,87,72,54,38,27];
 const factor = dayType==='weekend' ? 0.72 : 1;
 const routeFactor = [1.04,0.96,1.08,0.82,0.91,1.0,0.88,0.94][routes.findIndex(r=>r.id===route.id)] || 1;
 return Math.max(12,Math.min(98,Math.round(curve[hour]*factor*routeFactor)));
}
