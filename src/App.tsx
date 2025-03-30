import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  TextField,
  Box,
  CssBaseline,
  IconButton,
  Skeleton,
  CircularProgress,
  Alert,
  AlertTitle,
  Snackbar,
  Alert as MuiAlert,
  InputAdornment,
  Divider,
  ToggleButton, 
  ToggleButtonGroup,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip as MuiTooltip,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { 
  Brightness4, 
  Brightness7, 
  SmartToy,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  ShowChart as LineChartIcon,
  CandlestickChart as CandleChartIcon,
  Timer as TimerIcon,
  DateRange as DateRangeIcon,
  ArrowDropUp as ArrowUpIcon,
  ArrowDropDown as ArrowDownIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { WebSocketManager } from './services/WebSocketManager';
import { Trade } from './types/Trade';
import { CandleStore } from './services/CandleStore';
import { Candlestick, TimeInterval } from './types/Candlestick';
import { styled } from '@mui/material/styles';
import { TooltipProps } from 'recharts';
import { 
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Bar, ReferenceLine 
} from 'recharts';
import { Logo } from './components/Logo';
import { calculateVWAP, calculateEMA, Indicator, calculateSMA, calculateMACD, calculateRSI } from './utils/indicators';
import { CandlestickBar } from './components/CandlestickBar';
import { ChartTooltip } from './components/ChartTooltip';
import { CHART_COLORS } from './constants/colors';
import { formatPrice, formatVolume, formatDelta, formatPercent } from './utils/formatters';
import { INDICATOR_DEFS } from './constants/indicators';
import { MACDHistogramBar } from './components/MACDHistogramBar';
import { MACDTooltip } from './components/MACDTooltip';

type TimeFrame = '15m' | '1h' | '1d' | '1w';
type ChartMode = 'candles' | 'lines' | 'both';

const FINHUB_API_KEY = import.meta.env.VITE_FINHUB_API_KEY;

const getTimeFrameMs = (timeFrame: TimeFrame) => 
  timeFrame === '15m' ? 15 * 60 * 1000 :
  timeFrame === '1h' ? 60 * 60 * 1000 :
  timeFrame === '1d' ? 24 * 60 * 60 * 1000 :
  7 * 24 * 60 * 60 * 1000;

const getFilteredCandles = (candles: Candlestick[], timeFrame: TimeFrame) => {
  const now = Date.now();
  return candles.filter(c => c.timestamp > now - getTimeFrameMs(timeFrame));
};

const calculateChanges = (candles: Candlestick[], timeFrame: TimeFrame) => {
  const filteredCandles = getFilteredCandles(candles, timeFrame);
  if (filteredCandles.length < 2) return { delta: 0, percent: 0 };
  
  const first = filteredCandles[0];
  const last = filteredCandles[filteredCandles.length - 1];
  const delta = last.close - first.open;
  const percent = (delta / first.open) * 100;
  
  return { delta, percent };
};

const indicatorCalculators: Record<Indicator, (candles: Candlestick[]) => number[]> = {
  vwap: calculateVWAP,
  ema9: (candles) => calculateEMA(candles, 9),
  ema21: (candles) => calculateEMA(candles, 21),
  sma20: (candles) => calculateSMA(candles, 20),
  sma50: (candles) => calculateSMA(candles, 50),
  sma200: (candles) => calculateSMA(candles, 200),
  macd: (candles) => calculateMACD(candles).map(v => v.macd),
  rsi: (candles) => calculateRSI(candles),
};

// Add these calculations to the calculateIndicators function
const calculateIndicators = (
  candles: Candlestick[],
  activeIndicators: Indicator[]
): Candlestick[] => {
  if (candles.length === 0) return candles;

  return activeIndicators.reduce((candlesWithIndicators, indicator) => {
    if (indicator === 'macd') {
      const macdValues = calculateMACD(candles);
      const offset = candlesWithIndicators.length - macdValues.length;
      macdValues.forEach(({ macd }, i) => {
        candlesWithIndicators[i + offset].macd = macd;
      });
    } else {
      const values = indicatorCalculators[indicator](candles);
      const offset = candlesWithIndicators.length - values.length;
      values.forEach((value, i) => {
        candlesWithIndicators[i + offset][indicator] = value;
      });
    }
    
    return candlesWithIndicators;
  }, [...candles]);
};

const AppContent = () => {
  const [symbol, setSymbol] = useState('QQQ');
  const { isDarkMode, toggleTheme } = useTheme();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const [symbolInput, setSymbolInput] = useState(symbol);
  const [isFocused, setIsFocused] = useState(false);
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('1m');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1h');
  const [chartMode, setChartMode] = useState<ChartMode>('candles');
  const candleStore = useRef(new CandleStore());
  const [candles, setCandles] = useState<Candlestick[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const wsManager = useRef<WebSocketManager | null>(null);
  const [wsEnabled, setWsEnabled] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const currentPriceRef = useRef<number | null>(null);

  // Update ref when price changes
  useEffect(() => {
    currentPriceRef.current = currentPrice;
  }, [currentPrice]);

  const [isLoading, setIsLoading] = useState(false);
  const refreshInterval = useRef<number>(0);
  const [isPriceHovered, setIsPriceHovered] = useState(false);
  const [dummyEnabled, setDummyEnabled] = useState(false);
  const dummyInterval = useRef<number>(0);

  const PriceContainer = styled(Box)(({ theme }) => ({
    position: 'relative',
    '& .refresh-button': {
      position: 'absolute',
      right: -40,
      opacity: 0,
      transition: theme.transitions.create(['opacity']),
    },
    '&:hover .refresh-button': {
      opacity: 1,
    }
  }));

  const fetchCurrentPrice = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINHUB_API_KEY}`
      );
      const data = await response.json();
      setCurrentPrice(data.c);
    } catch (error) {
      console.error('Error fetching price:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching price data',
        severity: 'error'
      });
    }
    setIsLoading(false);
  }, [symbol]);

  const generateHistoricalCandles = useCallback((basePrice: number, hours: number = 1) => {
    const now = Date.now();
    const data: Trade[] = [];
    let currentPrice = basePrice;
    
    // Generate one hour of minute data
    for (let i = hours * 60; i >= 0; i--) {
      const minuteTimestamp = now - (i * 60 * 1000); // step back by minutes
      const volatility = currentPrice * 0.0002;
      
      // Generate 50-150 trades for this minute
      const tradesCount = 50 + Math.floor(Math.random() * 100);
      for (let j = 0; j < tradesCount; j++) {
        const change = (Math.random() - 0.5) * volatility;
        currentPrice += change;
        
        // Spread trades across the minute
        const tradeTimestamp = minuteTimestamp + Math.floor(Math.random() * 60000);
        
        data.push({
          price: currentPrice,
          volume: 100 + Math.floor(Math.random() * 900),
          timestamp: tradeTimestamp,
          conditions: ['Historical']
        });
      }
    }
    
    return data;
  }, []);

  const generateDummyPrice = useCallback(() => {
    const basePrice = currentPriceRef.current;
    if (!basePrice) return;
    
    const volatility = basePrice * 0.0002; // 0.02% volatility
    const now = Date.now();
    
    // Generate 3-5 trades per second (roughly 50-150 per minute)
    const tradesCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < tradesCount; i++) {
      const change = (Math.random() - 0.5) * volatility;
      const newPrice = basePrice + change;
      setCurrentPrice(newPrice);
      
      candleStore.current.addTrade({
        price: newPrice,
        volume: 100 + Math.floor(Math.random() * 900),
        timestamp: now + (i * 10), // Spread trades slightly within the second
        conditions: ['Simulated']
      });
    }
    
    setCandles(candleStore.current.getCandles(timeInterval));
  }, [timeInterval]);

  useEffect(() => {
    if (wsEnabled) {
      setConnectionState('connecting');
      wsManager.current = new WebSocketManager(
        import.meta.env.VITE_FINHUB_API_KEY,
        {
          onConnected: () => {
            setConnectionState('connected');
            setSnackbar({
              open: true,
              message: 'Connected to WebSocket server',
              severity: 'success'
            });
          },
          onDisconnected: () => {
            setConnectionState('disconnected');
            setSnackbar({
              open: true,
              message: 'Disconnected from WebSocket server',
              severity: 'info'
            });
          },
          onError: () => {
            setConnectionState('disconnected');
            setSnackbar({
              open: true,
              message: 'WebSocket connection error',
              severity: 'error'
            });
          },
          onTrade: (newTrade) => {
            setTrade(newTrade);
            candleStore.current.addTrade(newTrade);
            setCandles(candleStore.current.getCandles(timeInterval));
          }
        }
      );

      wsManager.current.connect(symbol);
      return () => {
        wsManager.current?.disconnect();
        setConnectionState('disconnected');
      };
    } else {
      wsManager.current?.disconnect();
      setConnectionState('disconnected');
    }
  }, [wsEnabled, symbol]);

  useEffect(() => {
    if (!wsEnabled) {
      fetchCurrentPrice();
      const interval = window.setInterval(fetchCurrentPrice, 
        timeInterval === '1m' ? 60000 :
        timeInterval === '5m' ? 300000 :
        timeInterval === '15m' ? 900000 : 3600000
      );
      refreshInterval.current = interval;
      return () => {
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current);
        }
      };
    }
  }, [wsEnabled, timeInterval, fetchCurrentPrice]);

  useEffect(() => {
    if (!wsEnabled && dummyEnabled) {
      const interval = window.setInterval(generateDummyPrice, 1000);
      dummyInterval.current = interval;
      return () => {
        if (dummyInterval.current) {
          clearInterval(dummyInterval.current);
        }
      };
    }
  }, [dummyEnabled, wsEnabled, generateDummyPrice]);

  const handleConfirm = useCallback(() => {
    const newSymbol = symbolInput.toUpperCase();
    setSymbol(prevSymbol => {
      wsManager.current?.changeSymbol(newSymbol);
      // Blur after state is updated
      requestAnimationFrame(() => {
        (document.activeElement as HTMLElement)?.blur();
      });
      return newSymbol;
    });
  }, [symbolInput]);

  const handleRevert = () => {
    setSymbolInput(symbol);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleConfirm();
    } else if (event.key === 'Escape') {
      handleRevert();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setSymbolInput(symbol);
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleTimeIntervalChange = (
    _event: React.MouseEvent<HTMLElement>,
    newInterval: TimeInterval,
  ) => {
    if (newInterval !== null) {
      setTimeInterval(newInterval);
      setCandles(candleStore.current.getCandles(newInterval));
    }
  };

  const handleTimeFrameChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeFrame: TimeFrame,
  ) => {
    if (newTimeFrame !== null) {
      setTimeFrame(newTimeFrame);
    }
  };

  const handleSimulationToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setDummyEnabled(enabled);
    
    if (enabled && currentPrice) {
      // Reset candle store
      candleStore.current = new CandleStore();
      
      // Generate and load historical data
      const historicalData = generateHistoricalCandles(currentPrice);
      historicalData.forEach(trade => {
        candleStore.current.addTrade(trade);
      });
      
      setCandles(candleStore.current.getCandles(timeInterval));
    }
  }, [currentPrice, generateHistoricalCandles, timeInterval]);

  const handleIndicatorChange = (indicator: Indicator) => {
    setIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  const currentPriceValue = wsEnabled ? trade?.price : currentPrice;

  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    padding: '6px 16px',
  }));

  const formatXAxisTick = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    switch (timeFrame) {
      case '15m':
      case '1h':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case '1d':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case '1w':
        return date.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
      default:
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }, [timeFrame]);

  const getXAxisDomain = useCallback(() => {
    const now = Date.now();
    return [now - getTimeFrameMs(timeFrame), now] as [number, number];
  }, [timeFrame]);

  const isPriceUp = useCallback((candles: Candlestick[]) => {
    const filteredCandles = getFilteredCandles(candles, timeFrame);
    if (filteredCandles.length < 2) return true;
    
    const first = filteredCandles[0];
    const last = filteredCandles[filteredCandles.length - 1];
    return last.close >= first.open;
  }, [timeFrame]);

  const isPriceUpFromLast = useCallback((candles: Candlestick[]) => {
    if (candles.length < 2) return true;
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    return lastCandle.close >= prevCandle.close;
  }, []);

  const isCurrentCandleBullish = useCallback((candles: Candlestick[]) => {
    if (!candles.length) return true;
    const currentCandle = candles[candles.length - 1];
    return currentCandle.close >= currentCandle.open;
  }, []);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <Logo 
            sx={{ 
              mr: 1,
              fontSize: '2rem',
              color: '#002200',
              '& g': { stroke: '#4caf50' }
            }} 
          />
          <Typography 
            variant="h6" 
            component="div"
            sx={{ 
              color: theme => theme.palette.mode === 'dark' ? '#4caf50' : '#1b5e20',
              fontWeight: 'bold',
              letterSpacing: 2,
              textShadow: theme => 
                theme.palette.mode === 'dark' 
                  ? '1px 1px 1px rgba(0,0,0,0.5)' 
                  : '1px 1px 1px rgba(76,225,80,0.5)',
              fontFamily: 'system-ui',
              fontSize: '1.5rem'
            }}
          >
            MATADOR
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
          <TextField
            size="small"
            label="Symbol"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            sx={{ 
              width: isFocused ? 200 : 140,
              bgcolor: 'rgba(255,255,255,0.1)', 
              borderRadius: 1,
              transition: 'width 0.2s ease-in-out',
            }}
            InputProps={{
              endAdornment: symbolInput !== symbol ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleConfirm}
                    sx={{ color: 'success.main' }}
                  >
                    <CheckIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={handleRevert}
                    sx={{ color: 'error.main' }}
                  >
                    <CancelIcon />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Switch
                checked={wsEnabled}
                onChange={(e) => {
                  setWsEnabled(e.target.checked);
                  if (e.target.checked) {
                    setDummyEnabled(false);
                  }
                }}
                color="success"
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  color: wsEnabled ? 'success.main' : 'text.secondary',
                  fontWeight: wsEnabled ? 'bold' : 'normal'
                }}
              >
                Live
              </Typography>
            </Box>
            {!wsEnabled && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Switch
                  checked={dummyEnabled}
                  onChange={handleSimulationToggle}
                  color="warning"
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: dummyEnabled ? 'warning.main' : 'text.secondary',
                    fontWeight: dummyEnabled ? 'bold' : 'normal'
                  }}
                >
                  Simulate
                </Typography>
              </Box>
            )}
            {wsEnabled && connectionState === 'connecting' && (
              <CircularProgress size={16} />
            )}
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 2 }}>
            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container 
        maxWidth={false} 
        sx={{ 
          flexGrow: 1,
          p: 3,
          height: 'calc(100vh - 64px)', // 64px is AppBar height
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {wsEnabled && connectionState === 'disconnected' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Connection Error</AlertTitle>
            WebSocket connection failed. Please check your internet connection or try again later.
          </Alert>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h5">
            Current Price for {symbol}:
          </Typography>
          {(connectionState === 'connecting' || currentPriceValue == null) ? (
            <Skeleton variant="text" width={100} sx={{ fontSize: '1.5rem' }} />
          ) : (
            <PriceContainer 
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              onMouseEnter={() => setIsPriceHovered(true)}
              onMouseLeave={() => setIsPriceHovered(false)}
            >
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 'bold',
                  color: isPriceUp(candles) ? CHART_COLORS.priceUp : CHART_COLORS.priceDown,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {formatPrice(currentPriceValue)}
                {candles.length > 0 && (
                  <>
                    {(() => {
                      const { delta } = calculateChanges(candles, timeFrame);
                      return delta >= 0 ? (
                        <ArrowUpIcon sx={{ color: CHART_COLORS.priceUp }} />
                      ) : (
                        <ArrowDownIcon sx={{ color: CHART_COLORS.priceDown }} />
                      );
                    })()}
                    <Typography 
                      component="span" 
                      sx={{ 
                        fontSize: '0.8em',
                        color: theme => {
                          const { delta } = calculateChanges(candles, timeFrame);
                          return delta >= 0 ? CHART_COLORS.priceUp : CHART_COLORS.priceDown;
                        }
                      }}
                    >
                      {(() => {
                        const { delta, percent } = calculateChanges(candles, timeFrame);
                        return `${formatDelta(delta, formatPrice)} (${formatDelta(percent, formatPercent)})`;
                      })()}
                    </Typography>
                  </>
                )}
              </Typography>
              {!wsEnabled && !dummyEnabled && (
                <IconButton 
                  className="refresh-button"
                  size="small" 
                  onClick={fetchCurrentPrice} 
                  disabled={isLoading}
                  color="primary"
                >
                  <RefreshIcon />
                </IconButton>
              )}
            </PriceContainer>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={chartMode}
              exclusive
              onChange={(_, newMode) => newMode && setChartMode(newMode)}
              size="small"
            >
              <MuiTooltip title="Candle Chart">
                <ToggleButton value="candles">
                  <CandleChartIcon />
                </ToggleButton>
              </MuiTooltip>
              <MuiTooltip title="Line Chart">
                <ToggleButton value="lines">
                  <LineChartIcon />
                </ToggleButton>
              </MuiTooltip>
              <MuiTooltip title="Both">
                <ToggleButton value="both">
                  <Box sx={{ display: 'flex', gap: 0 }}>
                    <CandleChartIcon />
                    <LineChartIcon />
                  </Box>
                </ToggleButton>
              </MuiTooltip>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MuiTooltip title="Candle Interval">
              <TimerIcon sx={{ color: 'text.secondary' }} />
            </MuiTooltip>
            <ToggleButtonGroup
              value={timeInterval}
              exclusive
              onChange={handleTimeIntervalChange}
              size="small"
            >
              <ToggleButton value="1m">1M</ToggleButton>
              <ToggleButton value="5m">5M</ToggleButton>
              <ToggleButton value="15m">15M</ToggleButton>
              <ToggleButton value="1h">1H</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MuiTooltip title="Display Range">
              <DateRangeIcon sx={{ color: 'text.secondary' }} />
            </MuiTooltip>
            <ToggleButtonGroup
              value={timeFrame}
              exclusive
              onChange={handleTimeFrameChange}
              size="small"
            >
              <ToggleButton value="15m">15M</ToggleButton>
              <ToggleButton value="1h">1H</ToggleButton>
              <ToggleButton value="1d">1D</ToggleButton>
              <ToggleButton value="1w">1W</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <MuiTooltip title="Indicators">
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <SettingsIcon />
            </IconButton>
          </MuiTooltip>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            {Object.values(INDICATOR_DEFS).map(indicator => (
              <MuiTooltip
                key={indicator.id}
                title={indicator.description}
                placement="right"
                arrow
              >
                <MenuItem>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={indicators.includes(indicator.id)}
                        onChange={() => handleIndicatorChange(indicator.id)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: CHART_COLORS[indicator.id],
                          }}
                        />
                        {indicator.name}
                      </Box>
                    }
                  />
                </MenuItem>
              </MuiTooltip>
            ))}
          </Menu>
        </Box>
        <Box sx={{ flexGrow: 1, minHeight: '400px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ flexGrow: 1, minHeight: '60%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={calculateIndicators(getFilteredCandles(candles, timeFrame), indicators)}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(128, 128, 128, 0.2)" 
                />
                <XAxis 
                  dataKey="timestamp"
                  tickFormatter={formatXAxisTick}
                  domain={getXAxisDomain()}
                  type="number"
                  scale="time"
                  interval={timeFrame === '1w' ? 24 : 'preserveStartEnd'}
                  minTickGap={50}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  orientation="right"
                  tickFormatter={formatPrice}
                />
                <Tooltip content={<ChartTooltip />} />
                {currentPriceValue && (
                  <ReferenceLine 
                    y={currentPriceValue}
                    stroke={isCurrentCandleBullish(candles) ? CHART_COLORS.priceUp : CHART_COLORS.priceDown}
                    strokeDasharray="3 3"
                    label={{
                      value: formatPrice(currentPriceValue),
                      position: 'right',
                      fill: isCurrentCandleBullish(candles) ? CHART_COLORS.priceUp : CHART_COLORS.priceDown,
                    }}
                  />
                )}
                {(chartMode === 'candles' || chartMode === 'both') && (
                  <Bar
                    dataKey={d => [d.low, d.high]}
                    shape={<CandlestickBar maxVolume={Math.max(...candles.map(c => c.volume))} />}
                    name="Range"
                    isAnimationActive={false}
                  />
                )}
                {(chartMode === 'lines' || chartMode === 'both') && (
                  <>
                    <Line
                      type="linear"
                      dataKey="open"
                      stroke={CHART_COLORS.open}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      name="Open"
                      isAnimationActive={false}
                    />
                    <Line
                      type="linear"
                      dataKey="high"
                      stroke={CHART_COLORS.high}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      name="High"
                      isAnimationActive={false}
                    />
                    <Line
                      type="linear"
                      dataKey="low"
                      stroke={CHART_COLORS.low}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      name="Low"
                      isAnimationActive={false}
                    />
                    <Line
                      type="linear"
                      dataKey="close"
                      stroke={isPriceUp(candles) ? CHART_COLORS.priceUp : CHART_COLORS.priceDown}
                      strokeWidth={3}
                      dot={false}
                      name="Close"
                      isAnimationActive={false}
                    />
                  </>
                )}
                {indicators.includes('vwap') && (
                  <Line
                    key="vwap"
                    type="monotone"
                    dataKey="vwap"
                    stroke={CHART_COLORS.vwap}
                    strokeWidth={1}
                    dot={false}
                    name="VWAP"
                    isAnimationActive={false}
                  />
                )}
                {indicators.includes('ema9') && (
                  <Line
                    key="ema9"
                    type="monotone"
                    dataKey="ema9"
                    stroke={CHART_COLORS.ema9}
                    strokeWidth={1}
                    dot={false}
                    name="EMA(9)"
                    isAnimationActive={false}
                  />
                )}
                {indicators.includes('ema21') && (
                  <Line
                    key="ema21"
                    type="monotone"
                    dataKey="ema21"
                    stroke={CHART_COLORS.ema21}
                    strokeWidth={1}
                    dot={false}
                    name="EMA(21)"
                    isAnimationActive={false}
                  />
                )}
                {indicators.includes('sma20') && (
                  <Line
                    key="sma20"
                    type="monotone"
                    dataKey="sma20"
                    stroke={CHART_COLORS.sma20}
                    strokeWidth={1}
                    dot={false}
                    name="SMA(20)"
                    isAnimationActive={false}
                  />
                )}
                {indicators.includes('sma50') && (
                  <Line
                    key="sma50"
                    type="monotone"
                    dataKey="sma50"
                    stroke={CHART_COLORS.sma50}
                    strokeWidth={1}
                    dot={false}
                    name="SMA(50)"
                    isAnimationActive={false}
                  />
                )}
                {indicators.includes('sma200') && (
                  <Line
                    key="sma200"
                    type="monotone"
                    dataKey="sma200"
                    stroke={CHART_COLORS.sma200}
                    strokeWidth={1}
                    dot={false}
                    name="SMA(200)"
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
          
          {indicators.includes('macd') && (
            <Box sx={{ height: '20%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={calculateMACD(getFilteredCandles(candles, timeFrame))}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp"
                    tickFormatter={formatXAxisTick}
                    domain={getXAxisDomain()}
                    type="number"
                    scale="time"
                  />
                  <YAxis orientation="right" />
                  <Tooltip content={<MACDTooltip />} />
                  <Bar
                    dataKey="histogram"
                    shape={<MACDHistogramBar />}
                    name="MACD Histogram"
                  />
                  <Line
                    type="monotone"
                    dataKey="macd"
                    stroke={CHART_COLORS.macdLine}
                    name="MACD"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="signal"
                    stroke={CHART_COLORS.macdSignal}
                    name="Signal"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          )}
          
          {indicators.includes('rsi') && (
            <Box sx={{ height: '20%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={calculateIndicators(getFilteredCandles(candles, timeFrame), ['rsi'])}
                  // margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp"
                    tickFormatter={formatXAxisTick}
                    domain={getXAxisDomain()}
                    type="number"
                    scale="time"
                  />
                  <YAxis 
                    orientation="right" 
                    domain={[0, 100]}
                    ticks={[0, 30, 70, 100]}
                  />
                  <ReferenceLine y={30} stroke="rgba(255,0,0,0.3)" />
                  <ReferenceLine y={70} stroke="rgba(255,0,0,0.3)" />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    stroke={CHART_COLORS.rsi}
                    name="RSI"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
        <TableContainer 
          component={Paper} 
          sx={{ 
            maxHeight: 200,
            backgroundColor: 'background.default',
            '& .MuiTableCell-root': { borderColor: 'divider' }
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <StyledTableCell>Time</StyledTableCell>
                <StyledTableCell align="right">Open</StyledTableCell>
                <StyledTableCell align="right">High</StyledTableCell>
                <StyledTableCell align="right">Low</StyledTableCell>
                <StyledTableCell align="right">Close</StyledTableCell>
                <StyledTableCell align="right">Volume</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...candles].reverse().map((candle) => (
                <TableRow key={candle.timestamp}>
                  <StyledTableCell>
                    {new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </StyledTableCell>
                  <StyledTableCell align="right">
                    {formatPrice(candle.open)}
                  </StyledTableCell>
                  <StyledTableCell align="right">
                    {formatPrice(candle.high)}
                  </StyledTableCell>
                  <StyledTableCell align="right">
                    {formatPrice(candle.low)}
                  </StyledTableCell>
                  <StyledTableCell align="right">
                    {formatPrice(candle.close)}
                  </StyledTableCell>
                  <StyledTableCell align="right">
                    {formatVolume(candle.volume)}
                  </StyledTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {trade && (
            <>
              <Typography variant="body1">
                Volume: {formatVolume(trade.volume)}
              </Typography>
              <Typography variant="body1">
                Time: {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              <Typography variant="body1">
                Conditions: {trade.conditions.join(', ')}
              </Typography>
            </>
          )}
        </Box>
      </Container>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export const App = () => (
  <ThemeProvider>
    <CssBaseline />
    <AppContent />
  </ThemeProvider>
);
