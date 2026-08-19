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
  Drawer,
  Badge,
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
  ListAlt as ListAltIcon,
  Star as WatchlistIcon,
  MenuBook as StrategyIcon,
  Lightbulb as IdeasIcon,
  Timeline as LevelsIcon,
  Notifications as AlertsIcon,
  History as ActivityIcon,
  Extension as SkillsIcon,
  NotificationsActive as NotificationsOnIcon,
  NotificationsOff as NotificationsOffIcon,
} from '@mui/icons-material';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { MarketDataClient, ExternalDataStatus } from './services/MarketDataClient';
import { Trade } from './types/Trade';
import { Candlestick, TimeInterval } from './types/Candlestick';
import { styled } from '@mui/material/styles';
import { TooltipProps } from 'recharts';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Bar, ReferenceLine
} from 'recharts';
import { Logo } from './components/Logo';
import { Indicator } from './utils/indicators';
import { CandlestickBar } from './components/CandlestickBar';
import { ChartTooltip } from './components/ChartTooltip';
import { CHART_COLORS } from './constants/colors';
import { formatPrice, formatVolume, formatDelta, formatPercent } from './utils/formatters';
import { INDICATOR_DEFS } from './constants/indicators';
import { MACDHistogramBar } from './components/MACDHistogramBar';
import { MACDTooltip } from './components/MACDTooltip';
import { WatchlistPanel } from './components/Watchlist/WatchlistPanel';
import { StrategyPanel } from './components/Strategy/StrategyPanel';
import { IdeasPanel } from './components/TradeIdeas/IdeasPanel';
import { LevelsPanel } from './components/Levels/LevelsPanel';
import { AlertsPanel } from './components/Alerts/AlertsPanel';
import { ActivityPanel } from './components/Activity/ActivityPanel';
import { SkillsPanel } from './components/Skills/SkillsPanel';
import { SidebarNav, SidebarNavItem } from './components/Sidebar/SidebarNav';
import { SkillTip } from './components/Sidebar/SkillTip';
import { ConnectionDiagnostics } from './components/ConnectionDiagnostics/ConnectionDiagnostics';
import { WatchlistEntry } from './types/Watchlist';
import { TradeIdea } from './types/TradeIdea';
import { Level as LevelType } from './types/Level';
import { Alert as AlertType } from './types/Alert';
import { AnalysisLogEntry } from './types/AnalysisLog';
import { Skill } from './types/Skill';
import {
  getWatchlist,
  saveWatchlist,
  getStrategy,
  getQuote,
  getTradeIdeas,
  getLevels,
  getAlerts,
  saveAlerts,
  getAnalysisLog,
  getSkills,
  rebuildMarketData,
  subscribeToDataEvents,
} from './services/dataApi';

type TimeFrame = '15m' | '1h' | '3h' | '6h' | '1d' | '1w';
type ChartMode = 'candles' | 'lines' | 'both';
type SidebarTab = 'watchlist' | 'strategy' | 'ideas' | 'levels' | 'alerts' | 'activity' | 'skills';
// Tabs whose "new since last looked" state is worth tracking — Watchlist
// and Strategy are directly user/Claude-edited, not "arrived" content.
const TRACKED_TABS: SidebarTab[] = ['ideas', 'levels', 'activity'];
const LAST_SEEN_STORAGE_KEY = 'matador-sidebar-last-seen';

const getTimeFrameMs = (timeFrame: TimeFrame) => 
  timeFrame === '15m' ? 15 * 60 * 1000 :
  timeFrame === '1h' ? 60 * 60 * 1000 :
  timeFrame === '3h' ? 3 * 60 * 60 * 1000 :
  timeFrame === '6h' ? 6 * 60 * 60 * 1000 :
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

const AppContent = () => {
  const [symbol, setSymbol] = useState('QQQ');
  const { isDarkMode, toggleTheme } = useTheme();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  // Node's connection to Alpaca, distinct from the browser↔Node
  // connection above — Node pushes this through since the browser can't
  // observe it any other way. Drives the connection-diagnostics UI.
  const [externalDataStatus, setExternalDataStatus] = useState<ExternalDataStatus>('disconnected');
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
  const [candles, setCandles] = useState<Candlestick[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const marketDataClient = useRef<MarketDataClient | null>(null);
  const [wsEnabled, setWsEnabled] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const currentPriceRef = useRef<number | null>(null);

  // Update ref when price changes
  useEffect(() => {
    currentPriceRef.current = currentPrice;
  }, [currentPrice]);

  const [isLoading, setIsLoading] = useState(false);
  const refreshInterval = useRef<number>(0);

  // Trade analysis sidebar state (Watchlist / Strategy / Ideas / Levels /
  // Alerts / Activity) — see docs/trade-analysis-plan.md and
  // data/strategy.md. All of this is a single source of truth loaded from
  // the data/ bridge and kept fresh three ways: an SSE push whenever the
  // find-trades skill (or anything else) writes a file, a refetch on
  // window focus, and a slow poll as a fallback if the SSE connection
  // ever drops. See vite-plugins/localDataApi.ts.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('watchlist');
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [strategyText, setStrategyText] = useState<string | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [tradeIdeas, setTradeIdeas] = useState<TradeIdea[]>([]);
  const [levels, setLevels] = useState<LevelType[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [analysisLog, setAnalysisLog] = useState<AnalysisLogEntry[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [analysisDataUpdatedAt, setAnalysisDataUpdatedAt] = useState<Date | null>(null);

  // When each tracked tab was last actually looked at (open drawer + that
  // tab selected) — drives the "new" badges on the sidebar rail.
  // Persisted so badges survive a page refresh instead of resetting.
  const [lastSeenAt, setLastSeenAt] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(LAST_SEEN_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore malformed/unavailable storage
    }
    const now = new Date().toISOString();
    return Object.fromEntries(TRACKED_TABS.map((tab) => [tab, now]));
  });

  useEffect(() => {
    try {
      localStorage.setItem(LAST_SEEN_STORAGE_KEY, JSON.stringify(lastSeenAt));
    } catch {
      // ignore unavailable storage (e.g. private browsing)
    }
  }, [lastSeenAt]);

  // Mark the currently-open tracked tab as seen whenever its data updates
  // — covers both "just switched to this tab" and "already on this tab
  // when new data streamed in via SSE."
  useEffect(() => {
    if (sidebarOpen && TRACKED_TABS.includes(sidebarTab)) {
      setLastSeenAt((prev) => ({ ...prev, [sidebarTab]: new Date().toISOString() }));
    }
  }, [sidebarOpen, sidebarTab, tradeIdeas, levels, analysisLog]);

  const ideasNewCount = tradeIdeas.filter(
    (i) => i.status === 'proposed' && i.createdAt > (lastSeenAt.ideas ?? '')
  ).length;
  const levelsNewCount = levels.filter(
    (l) => l.active && l.createdAt > (lastSeenAt.levels ?? '')
  ).length;
  const alertsUnacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const activityNewCount = analysisLog.filter((e) => e.timestamp > (lastSeenAt.activity ?? '')).length;
  const hasAnyNewAnalysisData =
    ideasNewCount > 0 || levelsNewCount > 0 || alertsUnacknowledgedCount > 0 || activityNewCount > 0;

  const sidebarNavItems: SidebarNavItem[] = [
    { value: 'watchlist', label: 'Watchlist', icon: <WatchlistIcon /> },
    { value: 'strategy', label: 'Strategy', icon: <StrategyIcon /> },
    { value: 'ideas', label: 'Ideas', icon: <IdeasIcon />, badgeCount: ideasNewCount },
    { value: 'levels', label: 'Levels', icon: <LevelsIcon />, badgeCount: levelsNewCount },
    { value: 'alerts', label: 'Alerts', icon: <AlertsIcon />, badgeCount: alertsUnacknowledgedCount },
    { value: 'activity', label: 'Activity', icon: <ActivityIcon />, badgeCount: activityNewCount },
    { value: 'skills', label: 'Skills', icon: <SkillsIcon /> },
  ];

  const fetchCurrentPrice = useCallback(async () => {
    setIsLoading(true);
    try {
      const quote = await getQuote(symbol);
      if (quote) setCurrentPrice(quote.c);
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

  // Connects to Node's local market-data service (vite-plugins/marketData/service.ts)
  // instead of Alpaca directly — Node owns the external connection,
  // candle aggregation, and indicator computation now; this effect just
  // owns the connect/disconnect lifecycle itself. Symbol and interval
  // changes while already connected are handled by the effects below
  // (they tell Node, they don't tear down and reopen this connection).
  useEffect(() => {
    if (!wsEnabled) {
      marketDataClient.current?.disconnect();
      marketDataClient.current = null;
      setConnectionState('disconnected');
      return;
    }

    setConnectionState('connecting');
    const client = new MarketDataClient({
      onConnected: () => {
        setConnectionState('connected');
        setSnackbar({ open: true, message: 'Connected to server', severity: 'success' });
      },
      onDisconnected: () => {
        setConnectionState('disconnected');
        setSnackbar({ open: true, message: 'Disconnected from server', severity: 'info' });
      },
      onError: () => {
        setConnectionState('disconnected');
        setSnackbar({ open: true, message: 'Connection error', severity: 'error' });
      },
      onCandles: (newCandles) => setCandles(newCandles),
      onTrade: (newTrade, newCandles) => {
        setTrade(newTrade);
        setCandles(newCandles);
      },
      onExternalStatus: (status) => setExternalDataStatus(status),
    });
    marketDataClient.current = client;
    client.connect(symbol, timeInterval);

    return () => {
      client.disconnect();
      setConnectionState('disconnected');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsEnabled]);

  // Switching symbols (e.g. clicking a different one in the Watchlist
  // panel) while already connected: tell Node rather than tearing down
  // and reopening the whole browser↔Node connection — Node handles
  // unsubscribing the old symbol and subscribing the new one on the same
  // connection. Also clear the previous symbol's trade/candles
  // immediately so stale data doesn't linger on screen during the
  // round-trip to Node's response.
  useEffect(() => {
    setTrade(null);
    setCandles([]);
    if (wsEnabled) marketDataClient.current?.changeSymbol(symbol, timeInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

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

  // Reload the shared data/ state from the local bridge. `only` scopes it
  // to a single route (used by the SSE handler below); omitted, it
  // refreshes everything (used on mount, window focus, and poll fallback).
  const refreshAnalysisData = useCallback(async (only?: string) => {
    const tasks: Promise<unknown>[] = [];
    if (!only || only === 'watchlist') {
      tasks.push(getWatchlist().then(setWatchlist).catch(() => {}));
    }
    if (!only || only === 'strategy') {
      setStrategyLoading((prev) => (only ? prev : true));
      tasks.push(
        getStrategy()
          .then((text) => {
            setStrategyText(text);
            setStrategyError(null);
          })
          .catch(() => setStrategyError('Failed to load data/strategy.md'))
          .finally(() => setStrategyLoading(false))
      );
    }
    if (!only || only === 'trade-ideas') {
      tasks.push(getTradeIdeas().then(setTradeIdeas).catch(() => {}));
    }
    if (!only || only === 'levels') {
      tasks.push(getLevels().then(setLevels).catch(() => {}));
    }
    if (!only || only === 'alerts') {
      tasks.push(getAlerts().then(setAlerts).catch(() => {}));
    }
    if (!only || only === 'analysis-log') {
      tasks.push(getAnalysisLog().then(setAnalysisLog).catch(() => {}));
    }
    if (!only || only === 'skills') {
      tasks.push(getSkills().then(setSkills).catch(() => {}));
    }
    await Promise.all(tasks);
    setAnalysisDataUpdatedAt(new Date());
  }, []);

  // Load once on mount.
  useEffect(() => {
    refreshAnalysisData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push: refetch just the file that changed, as soon as the bridge's SSE
  // stream reports it (e.g. the find-trades skill just wrote levels.json).
  useEffect(() => {
    return subscribeToDataEvents((route) => {
      if (route.startsWith('candles/')) return; // chart data has its own path
      refreshAnalysisData(route);
    });
  }, [refreshAnalysisData]);

  // Refresh-on-focus: catches anything missed while the tab was in the
  // background (e.g. SSE briefly dropped).
  useEffect(() => {
    const handleFocus = () => refreshAnalysisData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshAnalysisData]);

  // Slow poll fallback, independent of push/focus, in case both miss a change.
  useEffect(() => {
    const interval = window.setInterval(() => refreshAnalysisData(), 60000);
    return () => clearInterval(interval);
  }, [refreshAnalysisData]);

  const handleAcknowledgeAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
      saveAlerts(next).catch(() => {});
      return next;
    });
  }, []);

  // Real desktop notifications (the Web Notifications API — an actual
  // OS-level popup, not just an in-app badge). Fires only when an alert
  // actually *triggers* (status transitions to 'triggered'), not when
  // Claude first writes it as a pending condition to watch — see
  // alertsEngine.ts for what flips that status. The find-trades skill
  // still never needs to know notifications exist, it just writes
  // data/alerts.json as usual.
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted' && localStorage.getItem('matador-notifications-enabled') === 'true'
  );
  const notifiedAlertIds = useRef<Set<string> | null>(null);
  // Tracks currently-open OS notifications by alert id so a stale one can
  // be actively closed (not just prevented from popping again) once its
  // alert is superseded/expired/acknowledged/removed — `tag` alone only
  // stops duplicate popups, it doesn't dismiss one already on screen.
  const openNotifications = useRef<Map<string, Notification>>(new Map());

  useEffect(() => {
    for (const [id, notification] of openNotifications.current) {
      const alert = alerts.find((a) => a.id === id);
      const stale = !alert || alert.status === 'superseded' || alert.status === 'expired' || alert.acknowledged;
      if (stale) {
        notification.close();
        openNotifications.current.delete(id);
      }
    }

    // First run: remember every alert already triggered on disk without
    // notifying for them — only genuinely new triggers after this point
    // should pop.
    if (notifiedAlertIds.current === null) {
      notifiedAlertIds.current = new Set(alerts.filter((a) => a.status === 'triggered').map((a) => a.id));
      return;
    }

    if (!notificationsEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    for (const alert of alerts) {
      if (alert.status !== 'triggered' || alert.acknowledged) continue;
      if (notifiedAlertIds.current.has(alert.id)) continue;
      notifiedAlertIds.current.add(alert.id);

      const notification = new Notification(`Matador · ${alert.symbol}`, {
        body: alert.headline,
        tag: alert.id,
      });
      notification.onclick = () => {
        window.focus();
        setSidebarOpen(true);
        setSidebarTab('alerts');
      };
      openNotifications.current.set(alert.id, notification);
    }
  }, [alerts, notificationsEnabled]);

  const handleToggleNotifications = useCallback(async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      localStorage.setItem('matador-notifications-enabled', 'false');
      return;
    }
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      localStorage.setItem('matador-notifications-enabled', 'true');
    }
  }, [notificationsEnabled]);

  const handleReconnectClient = useCallback(() => {
    if (wsEnabled) marketDataClient.current?.connect(symbol, timeInterval);
  }, [wsEnabled, symbol, timeInterval]);

  const handleReconnectExternal = useCallback(() => {
    marketDataClient.current?.reconnectExternal();
  }, []);

  const handleRebuildCache = useCallback(async (symbolToRebuild: string) => {
    await rebuildMarketData(symbolToRebuild);
  }, []);

  const handleAddWatchlistSymbol = useCallback((newSymbol: string) => {
    setWatchlist((prev) => {
      if (prev.some((e) => e.symbol === newSymbol)) return prev;
      const next = [...prev, { symbol: newSymbol, addedAt: new Date().toISOString(), active: true }];
      saveWatchlist(next).catch(() => {});
      return next;
    });
  }, []);

  const handleRemoveWatchlistSymbol = useCallback((removedSymbol: string) => {
    setWatchlist((prev) => {
      const next = prev.filter((e) => e.symbol !== removedSymbol);
      saveWatchlist(next).catch(() => {});
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const newSymbol = symbolInput.toUpperCase();
    setSymbol(newSymbol);
    // Blur after state is updated
    requestAnimationFrame(() => {
      (document.activeElement as HTMLElement)?.blur();
    });
  }, [symbolInput]);

  const handleRevert = () => {
    setSymbolInput(symbol);
  };

  const handleSelectWatchlistSymbol = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
    setSymbolInput(newSymbol);
  }, []);

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
      if (wsEnabled) marketDataClient.current?.setInterval(newInterval);
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
                onChange={(e) => setWsEnabled(e.target.checked)}
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
              <MuiTooltip title="Refresh price">
                <span>
                  <IconButton size="small" onClick={fetchCurrentPrice} disabled={isLoading} color="primary">
                    <RefreshIcon />
                  </IconButton>
                </span>
              </MuiTooltip>
            )}
            {wsEnabled && connectionState === 'connecting' && (
              <CircularProgress size={16} />
            )}
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <ConnectionDiagnostics
            connectionState={connectionState}
            externalDataStatus={externalDataStatus}
            symbol={symbol}
            onReconnectClient={handleReconnectClient}
            onReconnectExternal={handleReconnectExternal}
            onRebuildCache={handleRebuildCache}
          />
          <MuiTooltip title={notificationsEnabled ? 'Desktop alerts on — click to disable' : 'Enable desktop alerts for new alerts'}>
            <IconButton onClick={handleToggleNotifications} color="inherit" sx={{ mr: 1 }}>
              {notificationsEnabled ? <NotificationsOnIcon /> : <NotificationsOffIcon />}
            </IconButton>
          </MuiTooltip>
          <MuiTooltip title="Watchlist / Strategy / Ideas">
            <IconButton onClick={() => setSidebarOpen(true)} color="inherit" sx={{ mr: 1 }}>
              <Badge variant="dot" color="error" overlap="circular" invisible={!hasAnyNewAnalysisData}>
                <ListAltIcon />
              </Badge>
            </IconButton>
          </MuiTooltip>
          <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 2 }}>
            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer anchor="right" open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <Box sx={{ width: 500, height: '100%', display: 'flex' }}>
          <SidebarNav items={sidebarNavItems} value={sidebarTab} onChange={(v) => setSidebarTab(v as SidebarTab)} />
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, width: 412 }}>
            {sidebarTab === 'watchlist' && (
              <>
                <SkillTip>
                  Add/remove symbols here directly, or just ask Claude to add one to the watchlist.
                </SkillTip>
                <WatchlistPanel
                  watchlist={watchlist}
                  activeSymbol={symbol}
                  onSelectSymbol={handleSelectWatchlistSymbol}
                  onAdd={handleAddWatchlistSymbol}
                  onRemove={handleRemoveWatchlistSymbol}
                />
              </>
            )}
            {sidebarTab === 'strategy' && (
              <>
                <SkillTip>
                  Edited by Claude directly when you discuss strategy changes in chat — no skill needed, just talk
                  through the change.
                </SkillTip>
                <StrategyPanel strategyText={strategyText} loading={strategyLoading} error={strategyError} />
              </>
            )}
            {sidebarTab === 'ideas' && (
              <>
                <SkillTip>
                  Populated by the <code>find-trades</code> skill — ask Claude to "scan for trades" or run{' '}
                  <code>/find-trades</code>.
                </SkillTip>
                <IdeasPanel ideas={tradeIdeas} lastUpdated={analysisDataUpdatedAt} />
              </>
            )}
            {sidebarTab === 'levels' && (
              <>
                <SkillTip>
                  Also written by <code>find-trades</code> — support/resistance levels get flagged even when no
                  trade idea qualifies.
                </SkillTip>
                <LevelsPanel levels={levels} />
              </>
            )}
            {sidebarTab === 'alerts' && (
              <>
                <SkillTip>
                  Also written by <code>find-trades</code> — notable events like a new idea or price nearing a
                  level. Enable the bell icon (top right) for real desktop notifications on new ones. Acknowledging
                  one here doesn't need a skill.
                </SkillTip>
                <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledgeAlert} />
              </>
            )}
            {sidebarTab === 'activity' && (
              <>
                <SkillTip>
                  The run history of <code>find-trades</code> (and any future analysis skills) — including "no
                  setup found" results, so you can see what actually ran.
                </SkillTip>
                <ActivityPanel entries={analysisLog} />
              </>
            )}
            {sidebarTab === 'skills' && (
              <>
                <SkillTip>
                  Documentation for every Claude skill available in this project, read straight from{' '}
                  <code>.claude/skills/*/SKILL.md</code> — ask Claude to add or edit a skill and this updates
                  itself.
                </SkillTip>
                <SkillsPanel skills={skills} />
              </>
            )}
          </Box>
        </Box>
      </Drawer>
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
            Lost connection to the server. Use the connection icon (top right) to reconnect or check its diagnostics.
          </Alert>
        )}
        {wsEnabled && connectionState === 'connected' && externalDataStatus !== 'connected' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Market Data Unavailable</AlertTitle>
            Connected to the server, but it can't reach the live data provider ({externalDataStatus}). Use the
            connection icon (top right) to retry.
          </Alert>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h5">
            Current Price for {symbol}:
          </Typography>
          {(connectionState === 'connecting' || currentPriceValue == null) ? (
            <Skeleton variant="text" width={100} sx={{ fontSize: '1.5rem' }} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            </Box>
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
              <ToggleButton value="3h">3H</ToggleButton>
              <ToggleButton value="6h">6H</ToggleButton>
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
              <ComposedChart data={getFilteredCandles(candles, timeFrame)}>
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
                {levels
                  .filter((level) => level.active && level.symbol === symbol)
                  .map((level) => (
                    <ReferenceLine
                      key={level.id}
                      y={level.price}
                      stroke={level.type === 'resistance' ? CHART_COLORS.priceDown : CHART_COLORS.priceUp}
                      strokeDasharray="6 3"
                      strokeOpacity={0.5}
                      label={{
                        value: level.label,
                        position: 'insideLeft',
                        fill: level.type === 'resistance' ? CHART_COLORS.priceDown : CHART_COLORS.priceUp,
                        fontSize: 11,
                      }}
                    />
                  ))}
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
                <ComposedChart data={getFilteredCandles(candles, timeFrame)} >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
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
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="macd"
                    stroke={CHART_COLORS.macdLine}
                    name="MACD"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="signal"
                    stroke={CHART_COLORS.macdSignal}
                    name="Signal"
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          )}
          
          {indicators.includes('rsi') && (
            <Box sx={{ height: '20%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={getFilteredCandles(candles, timeFrame)} >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
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
                    isAnimationActive={false}
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
                Conditions: {trade.conditions?.join(', ') || '—'}
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
