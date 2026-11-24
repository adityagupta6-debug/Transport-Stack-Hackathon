export type CrowdingLevel = 'Seats available' | 'Standing room' | 'Crowded';

export type DayType = 'weekday' | 'weekend';

export type OptimizationPreference = 'balanced' | 'least_crowded' | 'fastest';

export type FleetType = 'DTC Electric AC' | 'DTC Low-Floor' | 'DIMTS Cluster';

export type BusSize = '12m Standard' | '9m Midi';

export type ConfidenceTier = 'High' | 'Moderate' | 'Low';

export interface BusStop {
  id: string;
  code: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  isMajorHub: boolean;
  landmarks: string;
}

export interface BusRoute {
  id: string;
  corridorId: string;
  routeNumber: string;
  direction: 'UP' | 'DOWN' | 'CW' | 'ACW';
  name: string;
  corridor: string;
  fleetType: FleetType;
  busSize: BusSize;
  isAc: boolean;
  seatedCapacity: number;
  crushCapacity: number;
  baseHeadwayMin: number;
  avgSpeedKmh: number;
  color: string;
  stopIds: string[];
  directionalBias:
    | 'southbound_am'
    | 'northbound_am'
    | 'inbound_am'
    | 'outbound_pm'
    | 'orbital';
}

export interface TransportStackRecord {
  id: string;
  timestamp: string;
  hour: number;
  dayType: DayType;
  routeId: string;
  routeNumber: string;
  direction: string;
  busSize: BusSize;
  crushCapacity: number;
  stopId: string;
  stopName: string;
  stopSequence: number;
  etmBoardings: number;
  eticketBoardings: number;
  paidBoardings: number;
  passUpliftFactor: number;
  totalBoardingsWithPasses: number;
  alightings: number;
  cumulativeLoad: number;
  alightingUncertaintyPax: number;
  loadPercentage: number;
  crowdingLevel: CrowdingLevel;
  gpsSpeedKmh: number;
  headwayMin: number;
  sampleTrips: number;
  confidence: ConfidenceTier;
  busId: string;
  dataQualityFlag: 'verified' | 'imputed_alighting' | 'low_sample_smoothed';
}

export interface StopLoadPoint {
  stopId: string;
  stopName: string;
  stopCode: string;
  stopIndex: number;
  cumulativeMinutes: number;
  boardings: number;
  alightings: number;
  estimatedPassengers: number;
  uncertaintyBandPax: number;
  loadPercentage: number;
  crowdingLevel: CrowdingLevel;
  gpsSpeedKmh: number;
  sampleTrips: number;
  confidence: ConfidenceTier;
}

export interface JourneySegment {
  route: BusRoute;
  fromStop: BusStop;
  toStop: BusStop;
  stopCount: number;
  distanceKm: number;
  travelMinutes: number;
  waitMinutes: number;
  peakLoadPercentage: number;
  avgLoadPercentage: number;
  estimatedPassengers: number;
  crowdingLevel: CrowdingLevel;
  seatProbability: number;
  nextBusArrivalMin: number;
  busId: string;
  sampleTrips: number;
  confidence: ConfidenceTier;
  stopLoads: StopLoadPoint[];
}

export interface JourneyOption {
  id: string;
  segments: JourneySegment[];
  transfers: number;
  transferStop?: BusStop;
  transferWaitMinutes: number;
  totalDurationMinutes: number;
  totalDistanceKm: number;
  peakLoadPercentage: number;
  avgLoadPercentage: number;
  overallCrowding: CrowdingLevel;
  seatProbability: number;
  fareInr: number;
  confidence: ConfidenceTier;
  sampleTrips: number;
  comfortTimeScore: number;
  recommendationReason: string;
  isRecommended: boolean;
  isFastest: boolean;
  isLeastCrowded: boolean;
}

export interface DepartureShiftAdvice {
  recommendedTime: string;
  offsetMinutes: number;
  originalCrowding: CrowdingLevel;
  originalPeakPct: number;
  shiftedCrowding: CrowdingLevel;
  shiftedPeakPct: number;
  shiftedDurationMin: number;
  durationDeltaMin: number;
  routeLabel: string;
  summary: string;
}

export interface HourlyDemandPoint {
  hour: number;
  label: string;
  etmVolume: number;
  eticketVolume: number;
  totalVolume: number;
  avgLoadPercentage: number;
  weekendAvgLoadPercentage: number;
  weekendTotalVolume: number;
  avgGpsSpeedKmh: number;
  crowdingLevel: CrowdingLevel;
}

export interface WeeklyStabilityPoint {
  weekLabel: string;
  dateRange: string;
  meanLoadPct: number;
  amPeakLoadPct: number;
  pmPeakLoadPct: number;
  ticketCount: number;
  mapeVsBaselinePct: number;
}

export interface OperatorDispatchPriority {
  routeId: string;
  routeLabel: string;
  corridor: string;
  busSize: BusSize;
  hour: number;
  peakLoadPct: number;
  excessPaxPerBus: number;
  sampleTrips: number;
  confidence: ConfidenceTier;
  recommendedAction: string;
}

export interface DatasetPipelineStats {
  sourceLabel: string;
  isCustomDataset: boolean;
  dateRange: string;
  rawTicketRows: number;
  gtfsMatchedTrips: number;
  imputedAlightings: number;
  lowSampleCells: number;
  cleanedStretchRecords: number;
}