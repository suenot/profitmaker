export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartData {
  ohlcv: OHLCVData[];
}

export interface ChartTimeframeOption {
  id: string;
  label: string;
  value: string;
}

export interface ChartColors {
  back: string;
  grid: string;
  candleUp: string;
  candleDw: string;
  wickUp: string;
  wickDw: string;
  volUp: string;
  volDw: string;
} 