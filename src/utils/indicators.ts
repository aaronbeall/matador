import { Candlestick } from '../types/Candlestick';
import { vwap, ema, sma, MACD, RSI } from 'technicalindicators';
import { MACDResult } from '../types/TechnicalIndicators';

export type Indicator = 'vwap' | 'ema9' | 'ema21' | 'sma20' | 'sma50' | 'sma200' | 'macd' | 'rsi';

export const calculateVWAP = (candles: Candlestick[]): number[] => {
  if (candles.length === 0) return [];
  return vwap({
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
    volume: candles.map(c => c.volume),
  })
};

export const calculateEMA = (candles: Candlestick[], period: number): number[] => {
  if (candles.length === 0) return [];
  return ema({ 
    period, 
    values: candles.map(c => c.close),
  })
};

export const calculateSMA = (candles: Candlestick[], period: number): number[] => {
  if (candles.length === 0) return [];
  return sma({
    period,
    values: candles.map(c => c.close)
  });
};

export const calculateMACD = (candles: Candlestick[]): MACDResult[] => {
  if (candles.length === 0) return [];
  
  const macdInput = {
    values: candles.map(c => c.close),
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  };

  const results = MACD.calculate(macdInput);
  const lastIndex = candles.length - 1;
  const getIndex = (i: number) => lastIndex - (results.length - 1 - i);
  
  return results.map((r, i) => ({ 
    macd: r.MACD ?? 0, 
    signal: r.signal ?? 0, 
    histogram: r.histogram ?? 0,
    timestamp: candles[lastIndex - (results.length - 1 - i)].timestamp
  }));
};

export const calculateRSI = (candles: Candlestick[], period: number = 14): number[] => {
  if (candles.length === 0) return [];
  
  return RSI.calculate({
    values: candles.map(c => c.close),
    period
  });
};