import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Tooltip as MuiTooltip,
  Menu,
  MenuItem,
  Checkbox,
  Tabs,
  Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Brightness4,
  Brightness7,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  ShowChart as LineChartIcon,
  CandlestickChart as CandleChartIcon,
  StackedLineChart as OhlcChartIcon,
  Timer as TimerIcon,
  DateRange as DateRangeIcon,
  ArrowDropUp as ArrowUpIcon,
  ArrowDropDown as ArrowDownIcon,
  Settings as SettingsIcon,
  Star as WatchlistIcon,
  MenuBook as StrategyIcon,
  Psychology as ThesisIcon,
  Lightbulb as IdeasIcon,
  Timeline as LevelsIcon,
  Notifications as AlertsIcon,
  History as ActivityIcon,
  Extension as SkillsIcon,
  AutoStories as JournalIcon,
  AccountBalanceWallet as PortfolioIcon,
  Cable as ConnectionsIcon,
  SmartToy as InstructionsIcon,
  NotificationsActive as NotificationsOnIcon,
  NotificationsOff as NotificationsOffIcon,
  ChevronRight as CollapseIcon,
  Bookmarks as PresetsIcon,
  Bolt as ScalpPresetIcon,
  TrendingUp as MomentumPresetIcon,
  SyncAlt as MeanReversionPresetIcon,
  StackedLineChart as SwingTrendPresetIcon,
  CallSplit as DivergencePresetIcon,
  CandlestickChart as CleanPriceActionPresetIcon,
  Stairs as MarketStructurePresetIcon,
} from '@mui/icons-material';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { MarketDataClient, ExternalDataStatus } from './services/MarketDataClient';
import { Trade } from './types/Trade';
import { Candlestick, TimeInterval } from './types/Candlestick';
import {
  ComposedChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Bar, ReferenceLine, Customized, Scatter
} from 'recharts';
import { Logo } from './components/Logo';
import { MarketHoursIndicator } from './components/MarketHoursIndicator';
import { SymbolBadge } from './components/SymbolBadge';
import { Indicator, ALL_INDICATORS, findSwingHighs, findSwingLows } from './utils/indicators';
import { DIRECTION_COLOR, Direction } from './constants/direction';
import { CandlestickBar } from './components/CandlestickBar';
import { OhlcvLegend } from './components/OhlcvLegend';
import { IndicatorLegend, IndicatorLegendItem } from './components/IndicatorLegend';
import { PatternMarkerShape, PatternMarkerPoint } from './components/PatternMarker';
import { PatternBadges } from './components/PatternBadges';
import { PatternTooltip } from './components/PatternTooltip';
import { getPatternColor } from './components/PatternVisuals';
import { PatternIllustration, PATTERN_ILLUSTRATIONS, DivergenceIllustration, DIVERGENCE_ILLUSTRATIONS } from './components/PatternIllustration';
import { CrossMarkerShape, CrossMarkerPoint } from './components/CrossMarker';
import { BreakMarkerShape, BreakMarkerPoint } from './components/BreakMarker';
import { BreakTooltip } from './components/BreakTooltip';
import { DivergenceConnectorLayer, DivergenceConnectorPair } from './components/DivergenceConnector';
import { SignalIllustration, SIGNAL_ILLUSTRATIONS } from './components/SignalIllustration';
import { CrossTooltip } from './components/CrossTooltip';
import { classifyStructure, detectStructureBreaks } from './utils/marketStructure';
import { describeTrendAction, describeBreakAction } from './utils/marketStructureAction';
import { computeAutoLevels } from './utils/autoLevels';
import { CHART_COLORS } from './constants/colors';
import { PATTERN_INFO, PatternStrength } from './constants/patterns';
import { SIGNAL_INFO, SignalKey } from './constants/signals';
import { formatPrice, formatVolume, formatDelta, formatPercent, formatTimestamp, formatRelativeTime } from './utils/formatters';
import { isAlertLive } from './utils/alerts';
import { INDICATOR_DEFS } from './constants/indicators';
import { MACDHistogramBar } from './components/MACDHistogramBar';
import { WatchlistPanel } from './components/Watchlist/WatchlistPanel';
import { StrategyPanel } from './components/Strategy/StrategyPanel';
import { IdeasPanel } from './components/TradeIdeas/IdeasPanel';
import { ThesisPanel } from './components/Thesis/ThesisPanel';
import { LevelsPanel } from './components/Levels/LevelsPanel';
import { AlertsPanel } from './components/Alerts/AlertsPanel';
import { ActivityPanel } from './components/Activity/ActivityPanel';
import { SkillsPanel } from './components/Skills/SkillsPanel';
import { JournalPanel } from './components/Journal/JournalPanel';
import { PortfolioPanel } from './components/Portfolio/PortfolioPanel';
import { ConnectionsPanel } from './components/Connections/ConnectionsPanel';
import { InstructionsPanel } from './components/Instructions/InstructionsPanel';
import { SidebarNav, SidebarNavItem } from './components/Sidebar/SidebarNav';
import { SkillTip } from './components/Sidebar/SkillTip';
import { ConnectionDiagnostics } from './components/ConnectionDiagnostics/ConnectionDiagnostics';
import { WatchlistEntry } from './types/Watchlist';
import { TradeIdea } from './types/TradeIdea';
import { Level as LevelType } from './types/Level';
import { Alert as AlertType } from './types/Alert';
import { AnalysisLogEntry } from './types/AnalysisLog';
import { Thesis } from './types/Thesis';
import { Skill } from './types/Skill';
import { JournalEntry } from './types/Journal';
import { Position, AccountBalance } from './types/Portfolio';
import { Connection } from './types/Connection';
import { AgentActivity } from './types/AgentActivity';
import {
  getWatchlist,
  saveWatchlist,
  getStrategy,
  getQuote,
  getTradeIdeas,
  getLevels,
  getAlerts,
  getThesis,
  getAnalysisLog,
  getSkills,
  getJournal,
  saveJournal,
  getPortfolioPositions,
  getAccountBalances,
  getConnections,
  getAgentInstructions,
  getAgentActivity,
  rebuildMarketData,
  subscribeToDataEvents,
} from './services/dataApi';
import { LastEvaluatedIndicator } from './components/Sidebar/LastEvaluatedIndicator';
import { TimeFrame, ChartPreset, CHART_PRESETS, TIME_INTERVAL_HELP, TIME_FRAME_HELP } from './constants/chartPresets';

// 'price' — just the close line, the plain "line chart" read. 'ohlc' — all
// four open/high/low/close lines together (the old 'lines' mode, renamed
// now that 'price' exists as the simpler single-line option). 'all' —
// candles plus the full OHLC line set (the old 'both').
type ChartMode = 'candles' | 'price' | 'ohlc' | 'all';
type SidebarTab = 'watchlist' | 'strategy' | 'thesis' | 'ideas' | 'levels' | 'alerts' | 'journal' | 'portfolio' | 'connections' | 'activity' | 'skills' | 'instructions';
// Tabs whose "new since last looked" state is worth tracking — Watchlist
// and Strategy are directly user/Claude-edited, not "arrived" content.
const TRACKED_TABS: SidebarTab[] = ['thesis', 'ideas', 'levels', 'journal', 'portfolio', 'activity'];
const LAST_SEEN_STORAGE_KEY = 'matador-sidebar-last-seen';
const SIDEBAR_WIDTH_STORAGE_KEY = 'matador-sidebar-width';
const SIDEBAR_DEFAULT_WIDTH = 420;
const SIDEBAR_MIN_WIDTH = 320;
const SIDEBAR_MAX_WIDTH = 720;
const INDICATORS_STORAGE_KEY = 'matador-indicators';
const PATTERNS_STORAGE_KEY = 'matador-patterns';
const SIGNALS_STORAGE_KEY = 'matador-signals';
const INDICATORS_VISIBLE_STORAGE_KEY = 'matador-indicators-visible';
const PATTERNS_VISIBLE_STORAGE_KEY = 'matador-patterns-visible';
const SIGNALS_VISIBLE_STORAGE_KEY = 'matador-signals-visible';
// MACD divergence ships off by default (requested explicitly) — everything
// else in PATTERN_INFO defaults to on. Only affects a fresh install with no
// stored selection yet; an existing user's stored array is untouched.
const DEFAULT_DISABLED_PATTERNS = new Set(['bullish-divergence-macd', 'bearish-divergence-macd']);

// Remaining UI-state persistence keys — same read-once-with-validation,
// write-on-change pattern as sidebarWidth/indicators/enabledPatterns
// above, just for the rest of the "remember what I was looking at"
// surface: symbol, chart interval/range/mode, and sidebar open/tab.
const SYMBOL_STORAGE_KEY = 'matador-symbol';
const TIME_INTERVAL_STORAGE_KEY = 'matador-time-interval';
const TIME_FRAME_STORAGE_KEY = 'matador-time-frame';
const CHART_MODE_STORAGE_KEY = 'matador-chart-mode';
const SIDEBAR_OPEN_STORAGE_KEY = 'matador-sidebar-open';
const SIDEBAR_TAB_STORAGE_KEY = 'matador-sidebar-tab';

const VALID_TIME_INTERVALS: TimeInterval[] = ['1m', '5m', '15m', '1h', '1d', '1w'];
const VALID_TIME_FRAMES: TimeFrame[] = ['today', '15m', '1h', '3h', '6h', '1d', '1w', '1mo', '3mo'];
const VALID_CHART_MODES: ChartMode[] = ['candles', 'price', 'ohlc', 'all'];
const VALID_SIDEBAR_TABS: SidebarTab[] = ['watchlist', 'strategy', 'thesis', 'ideas', 'levels', 'alerts', 'journal', 'portfolio', 'connections', 'activity', 'skills', 'instructions'];

function readStoredString<T extends string>(key: string, valid: T[], fallback: T): T {
  const stored = localStorage.getItem(key);
  return valid.includes(stored as T) ? (stored as T) : fallback;
}
const STRENGTH_RANK: Record<PatternStrength, number> = { weak: 1, moderate: 2, strong: 3 };

// One calm neutral for the OHLC chart's Open/High/Low lines — see the
// 'ohlc' chartMode render, where they're told apart by dash pattern
// rather than each getting its own hue.
const OHLC_LINE_COLOR = '#90a4ae';

// One row per divergence pattern key, driving the connector-line
// computation below (see the divergencePairs/rsiDivergencePairs/
// macdDivergencePairs useMemo). Every divergence variant — regular/hidden,
// RSI/MACD — needs the exact same three things done with it: check its own
// visiblePatterns toggle, draw a price-panel line between its two swing
// points, and draw a second line on whichever oscillator panel it belongs
// to. Expressing that as data here, rather than a hand-written if-block
// per variant (which is what this used to be), is what keeps adding a new
// divergence variant a one-line change instead of a new copy of the whole
// pairs-building loop — the same lesson attachDivergence's own
// DIVERGENCE_RULES table applies server-side.
interface DivergenceRoute {
  tag: string;
  direction: 'bullish' | 'bearish';
  panel: 'rsi' | 'macd';
  oscillatorField: 'rsi' | 'histogram';
}
const DIVERGENCE_ROUTES: DivergenceRoute[] = [
  { tag: 'bearish-divergence-rsi', direction: 'bearish', panel: 'rsi', oscillatorField: 'rsi' },
  { tag: 'bullish-divergence-rsi', direction: 'bullish', panel: 'rsi', oscillatorField: 'rsi' },
  { tag: 'bearish-divergence-macd', direction: 'bearish', panel: 'macd', oscillatorField: 'histogram' },
  { tag: 'bullish-divergence-macd', direction: 'bullish', panel: 'macd', oscillatorField: 'histogram' },
  { tag: 'bearish-divergence-hidden-rsi', direction: 'bearish', panel: 'rsi', oscillatorField: 'rsi' },
  { tag: 'bullish-divergence-hidden-rsi', direction: 'bullish', panel: 'rsi', oscillatorField: 'rsi' },
  { tag: 'bearish-divergence-hidden-macd', direction: 'bearish', panel: 'macd', oscillatorField: 'histogram' },
  { tag: 'bullish-divergence-hidden-macd', direction: 'bullish', panel: 'macd', oscillatorField: 'histogram' },
];

// Settings-menu swatch color per signal — tied to its source indicator's
// own chart color (ema9's yellow, macd's blue) rather than a new color, so
// the swatch hints at which series it's derived from.
// One glyph per preset id, shown in the Presets menu row itself so a
// preset is distinguishable at a glance without hovering — the fuller
// candle-silhouette illustration (see chartPresets.ts's `thumbnail` field)
// stays reserved for the tooltip, where there's room to actually read it.
const PRESET_ICON: Record<string, React.ComponentType<{ fontSize?: 'small' | 'inherit' }>> = {
  'opening-range-scalp': ScalpPresetIcon,
  'intraday-momentum': MomentumPresetIcon,
  'mean-reversion': MeanReversionPresetIcon,
  'swing-trend': SwingTrendPresetIcon,
  'divergence-watch': DivergencePresetIcon,
  'clean-price-action': CleanPriceActionPresetIcon,
  'market-structure': MarketStructurePresetIcon,
};

const SIGNAL_SWATCH: Record<SignalKey, string> = {
  'ema-cross': CHART_COLORS.ema9,
  'macd-cross': CHART_COLORS.macd,
  'swing-high': DIRECTION_COLOR.bearish,
  'swing-low': DIRECTION_COLOR.bullish,
  'structure-lines': '#90a4ae',
  bos: '#26c6da',
  choch: '#ab47bc',
};

// 'today' isn't a fixed trailing duration (see getTodayWindow below) — 24h
// here is only a harmless fallback for the rare empty-candles case (the
// initial x-axis domain before any data has loaded at all).
const getTimeFrameMs = (timeFrame: TimeFrame) =>
  timeFrame === '15m' ? 15 * 60 * 1000 :
  timeFrame === '1h' ? 60 * 60 * 1000 :
  timeFrame === '3h' ? 3 * 60 * 60 * 1000 :
  timeFrame === '6h' ? 6 * 60 * 60 * 1000 :
  timeFrame === '1d' || timeFrame === 'today' ? 24 * 60 * 60 * 1000 :
  timeFrame === '1w' ? 7 * 24 * 60 * 60 * 1000 :
  timeFrame === '1mo' ? 30 * 24 * 60 * 60 * 1000 :
  90 * 24 * 60 * 60 * 1000; // '3mo'

const ET_TIMEZONE = 'America/New_York';

// Any instant's calendar date as seen in America/New_York, independent of
// the browser's own local zone.
function getEtDateParts(timestamp: number): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

// The UTC instant for a given ET calendar date + wall-clock hour/minute —
// correct across the EDT/EST boundary by measuring the real UTC offset for
// that specific date (a noon-UTC probe), not just whatever offset applies
// "now."
function etWallClockToUtc(year: number, month: number, day: number, hour: number, minute: number): number {
  const noonUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
  const etHour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: ET_TIMEZONE, hour: '2-digit', hour12: false })
      .formatToParts(new Date(noonUtc))
      .find((p) => p.type === 'hour')!.value
  ) % 24;
  const offsetHours = 12 - etHour; // 4 (EDT) or 5 (EST)
  return Date.UTC(year, month - 1, day, hour + offsetHours, minute, 0);
}

// Regular-session bounds (9:30am-4:00pm ET) for whichever ET calendar day
// contains `anchorTimestamp` — backs the "Today" time frame. Anchored on
// the data itself, same principle as getFilteredCandles below, not on
// wall-clock now: with the market closed, "today" still resolves to the
// actual last trading day's real session bounds instead of an empty or
// wrong-day window.
function getTodayWindow(anchorTimestamp: number): { start: number; end: number } {
  const { year, month, day } = getEtDateParts(anchorTimestamp);
  return {
    start: etWallClockToUtc(year, month, day, 9, 30),
    end: etWallClockToUtc(year, month, day, 16, 0),
  };
}

// Anchored on the latest candle actually present, not on wall-clock now —
// with the market closed overnight/weekend, "now" can sit hours past the
// last real trade, so a wall-clock trailing window would filter out all
// the data even though it's right there. Anchoring on the data itself
// means the window always contains the most recent bars we have. 'today'
// is the one exception to "trailing duration": it's an absolute window
// (this session's actual open/close), not a rolling lookback — filtering
// naturally caps at "now" mid-session (there's simply no candle data past
// the anchor yet) and at the real close once the session's over, rather
// than spilling into after-hours prints.
const getFilteredCandles = (candles: Candlestick[], timeFrame: TimeFrame) => {
  if (!candles.length) return candles;
  const anchor = candles[candles.length - 1].timestamp;
  if (timeFrame === 'today') {
    const { start, end } = getTodayWindow(anchor);
    return candles.filter((c) => c.timestamp >= start && c.timestamp <= end);
  }
  return candles.filter(c => c.timestamp > anchor - getTimeFrameMs(timeFrame));
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

// Tab label + inline count bubble — neutral-toned (not MUI's red attention
// Badge used elsewhere for "needs attention") since this is just "here's
// how many are selected," not a call to action.
const TabCountLabel = ({ text, count }: { text: string; count: number }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
    <span>{text}</span>
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 16,
        height: 16,
        px: 0.5,
        borderRadius: '999px',
        fontSize: '0.62rem',
        fontWeight: 700,
        lineHeight: 1,
        bgcolor: 'action.selected',
        color: 'text.secondary',
      }}
    >
      {count}
    </Box>
  </Box>
);

const AppContent = () => {
  const [symbol, setSymbol] = useState(() => localStorage.getItem(SYMBOL_STORAGE_KEY) || 'QQQ');
  useEffect(() => {
    localStorage.setItem(SYMBOL_STORAGE_KEY, symbol);
  }, [symbol]);
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
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(() =>
    readStoredString(TIME_INTERVAL_STORAGE_KEY, VALID_TIME_INTERVALS, '1m')
  );
  useEffect(() => {
    localStorage.setItem(TIME_INTERVAL_STORAGE_KEY, timeInterval);
  }, [timeInterval]);

  const [timeFrame, setTimeFrame] = useState<TimeFrame>(() =>
    readStoredString(TIME_FRAME_STORAGE_KEY, VALID_TIME_FRAMES, '1h')
  );
  useEffect(() => {
    localStorage.setItem(TIME_FRAME_STORAGE_KEY, timeFrame);
  }, [timeFrame]);

  const [chartMode, setChartMode] = useState<ChartMode>(() =>
    readStoredString(CHART_MODE_STORAGE_KEY, VALID_CHART_MODES, 'candles')
  );
  useEffect(() => {
    localStorage.setItem(CHART_MODE_STORAGE_KEY, chartMode);
  }, [chartMode]);
  const [candles, setCandles] = useState<Candlestick[]>([]);
  // Persisted the same way sidebarWidth/notifications-enabled already are
  // — read once at init with a validating fallback, written back on every
  // change, so indicator/pattern picks survive a reload instead of
  // resetting to nothing each time.
  const [indicators, setIndicators] = useState<Indicator[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(INDICATORS_STORAGE_KEY) ?? '[]');
      return Array.isArray(stored) ? stored.filter((i): i is Indicator => ALL_INDICATORS.includes(i)) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem(INDICATORS_STORAGE_KEY, JSON.stringify(indicators));
  }, [indicators]);

  const [enabledPatterns, setEnabledPatterns] = useState<string[]>(() => {
    const defaultEnabled = Object.keys(PATTERN_INFO).filter((p) => !DEFAULT_DISABLED_PATTERNS.has(p));
    try {
      const stored = JSON.parse(localStorage.getItem(PATTERNS_STORAGE_KEY) ?? 'null');
      return Array.isArray(stored) ? stored.filter((p): p is string => p in PATTERN_INFO) : defaultEnabled;
    } catch {
      return defaultEnabled;
    }
  });
  useEffect(() => {
    localStorage.setItem(PATTERNS_STORAGE_KEY, JSON.stringify(enabledPatterns));
  }, [enabledPatterns]);
  const handlePatternToggle = (patternKey: string) => {
    setEnabledPatterns((prev) =>
      prev.includes(patternKey) ? prev.filter((p) => p !== patternKey) : [...prev, patternKey]
    );
  };

  // Crossover signals — a third category alongside indicators (continuous
  // overlays) and patterns (single-candle tags): a crossover is a detected
  // *event* between two indicator series, computed purely client-side (see
  // emaCrossMarkers/macdCrossMarkers below) since every input field is
  // already on each candle. Same selection/mute/persistence shape as
  // patterns above.
  const [enabledSignals, setEnabledSignals] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SIGNALS_STORAGE_KEY) ?? 'null');
      return Array.isArray(stored) ? stored.filter((s): s is string => s in SIGNAL_INFO) : Object.keys(SIGNAL_INFO);
    } catch {
      return Object.keys(SIGNAL_INFO);
    }
  });
  useEffect(() => {
    localStorage.setItem(SIGNALS_STORAGE_KEY, JSON.stringify(enabledSignals));
  }, [enabledSignals]);
  const handleSignalToggle = (signalKey: string) => {
    setEnabledSignals((prev) =>
      prev.includes(signalKey) ? prev.filter((s) => s !== signalKey) : [...prev, signalKey]
    );
  };

  // A wholesale mute per category, layered on top of the actual
  // indicator/pattern/signal selection rather than touching it — flipping
  // this off hides everything in that category from the chart without
  // losing which specific ones you'd chosen, so switching it back on
  // restores exactly what you had. Quick way to isolate one category or
  // mute the other for a bit.
  const [indicatorsVisible, setIndicatorsVisible] = useState(() => {
    const stored = localStorage.getItem(INDICATORS_VISIBLE_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  useEffect(() => {
    localStorage.setItem(INDICATORS_VISIBLE_STORAGE_KEY, String(indicatorsVisible));
  }, [indicatorsVisible]);
  const [patternsVisible, setPatternsVisible] = useState(() => {
    const stored = localStorage.getItem(PATTERNS_VISIBLE_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  useEffect(() => {
    localStorage.setItem(PATTERNS_VISIBLE_STORAGE_KEY, String(patternsVisible));
  }, [patternsVisible]);
  const [signalsVisible, setSignalsVisible] = useState(() => {
    const stored = localStorage.getItem(SIGNALS_VISIBLE_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  useEffect(() => {
    localStorage.setItem(SIGNALS_VISIBLE_STORAGE_KEY, String(signalsVisible));
  }, [signalsVisible]);
  // What the chart actually renders — the real selection, filtered
  // through the mute switch. Keep `indicators`/`enabledPatterns`/
  // `enabledSignals` themselves untouched everywhere else (checkboxes,
  // counts) so they always reflect the real configuration.
  const visibleIndicators = indicatorsVisible ? indicators : [];
  const visiblePatterns = patternsVisible ? enabledPatterns : [];
  const visibleSignals = signalsVisible ? enabledSignals : [];

  // Applying a preset replaces the real selection wholesale (not a merge)
  // and force-unmutes all three categories — the point of picking a named
  // setup is seeing exactly what it specifies, not have it silently hidden
  // by whatever mute state was left on from before.
  const handleApplyPreset = (preset: ChartPreset) => {
    setTimeInterval(preset.timeInterval);
    setTimeFrame(preset.timeFrame);
    setIndicators(preset.indicators);
    setEnabledPatterns(preset.patterns);
    setEnabledSignals(preset.signals);
    setIndicatorsVisible(true);
    setPatternsVisible(true);
    setSignalsVisible(true);
  };

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  // Separate from menuAnchor (Indicators/Patterns/Signals) — presets are a
  // one-click "apply this whole setup" action, not a toggle list to leave
  // open while you fine-tune, so they get their own menu rather than a tab
  // sharing chrome (the "Show on chart" mute switch, tab counts) that
  // doesn't mean anything for a preset.
  const [presetsMenuAnchor, setPresetsMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTab, setMenuTab] = useState<'indicators' | 'patterns' | 'signals'>('indicators');
  // Horizontal price crosshair on the main chart — Recharts' Tooltip only
  // gives a vertical, nearest-candle crosshair out of the box; Y is
  // continuous, not categorical, so there's no built-in equivalent for
  // "price under the cursor." priceScaleRef captures the chart's live d3
  // Y scale (via the Customized child below) so the mouse handler can
  // invert a pixel position back into a price.
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const priceScaleRef = useRef<{ invert: (y: number) => number } | null>(null);
  // Recharts' own auto barSize computation (used whenever a <Bar> doesn't
  // get an explicit one) derives it from the smallest gap between adjacent
  // data points' raw x-VALUES on a type="number"/scale="time" XAxis — not
  // from rendered pixels. A single anomalous gap anywhere in the series
  // (e.g. a live-merged in-progress candle landing a few seconds after the
  // prior bar, instead of a full interval later) makes that one outlier
  // the basis for every bar's width, which can round all the way down to 0
  // px — every candle silently loses its body and only the wick <line>
  // remains, which is exactly what a dense, live-connected view (Today,
  // 15m, 1h) can trigger. Tracking the chart's actual rendered width here
  // and handing the Bar an explicit pixel barSize (see the candlestick
  // panel below) sidesteps Recharts' data-gap heuristic entirely.
  const [mainChartWidth, setMainChartWidth] = useState(800);
  // Replaces the old hover-following tooltips: anchored overlay panels
  // (OhlcvLegend/IndicatorLegend) show this candle's values instead — the
  // hovered one if the mouse is over any of the three chart panes (they
  // all share one state, so hovering any pane updates all three legends
  // together), or the latest candle otherwise, so the overlays are never
  // empty.
  const [hoveredCandle, setHoveredCandle] = useState<Candlestick | null>(null);
  const handleChartMouseMove = useCallback((state: any) => {
    // Don't just take activePayload[0] — the pattern-marker Scatter layer
    // shares the same x-position and contributes its own entry (a
    // PatternMarkerPoint, not a Candlestick) whose payload can land first
    // in the array, which crashed OhlcvLegend reading fields (volume,
    // open, ...) that only exist on the real candle payload.
    const entry = state?.activePayload?.find((p: any) => p?.payload && typeof p.payload.open === 'number');
    if (entry) setHoveredCandle(entry.payload);
  }, []);
  const handleChartMouseLeave = useCallback(() => {
    setHoveredCandle(null);
    setCrosshairPrice(null);
  }, []);

  // Direct hover on a pattern marker — separate from hoveredCandle since
  // it drives a cursor-following tooltip (PatternTooltip) positioned via
  // viewport coordinates, not tied to the chart's own x/y scales.
  const [hoveredPatternMarker, setHoveredPatternMarker] = useState<{
    point: PatternMarkerPoint;
    x: number;
    y: number;
  } | null>(null);
  const handlePatternMarkerHover = useCallback((point: PatternMarkerPoint, evt: React.MouseEvent) => {
    setHoveredPatternMarker({ point, x: evt.clientX, y: evt.clientY });
  }, []);
  const handlePatternMarkerLeave = useCallback(() => setHoveredPatternMarker(null), []);

  // Same hover-tooltip shape as pattern markers, for crossover markers.
  const [hoveredCrossMarker, setHoveredCrossMarker] = useState<{
    point: CrossMarkerPoint;
    x: number;
    y: number;
  } | null>(null);
  const handleCrossMarkerHover = useCallback((point: CrossMarkerPoint, evt: React.MouseEvent) => {
    setHoveredCrossMarker({ point, x: evt.clientX, y: evt.clientY });
  }, []);
  const handleCrossMarkerLeave = useCallback(() => setHoveredCrossMarker(null), []);

  // Same hover-tooltip shape as cross/pattern markers, for BOS/CHoCH break
  // markers.
  const [hoveredBreakMarker, setHoveredBreakMarker] = useState<{
    point: BreakMarkerPoint;
    x: number;
    y: number;
  } | null>(null);
  const handleBreakMarkerHover = useCallback((point: BreakMarkerPoint, evt: React.MouseEvent) => {
    setHoveredBreakMarker({ point, x: evt.clientX, y: evt.clientY });
  }, []);
  const handleBreakMarkerLeave = useCallback(() => setHoveredBreakMarker(null), []);

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
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY) === 'true');
  useEffect(() => {
    localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(() =>
    readStoredString(SIDEBAR_TAB_STORAGE_KEY, VALID_SIDEBAR_TABS, 'watchlist')
  );
  useEffect(() => {
    localStorage.setItem(SIDEBAR_TAB_STORAGE_KEY, sidebarTab);
  }, [sidebarTab]);

  // The nav rail is always visible — clicking an item opens the panel to
  // that tab; clicking the tab that's already open collapses the panel
  // instead (same as VSCode's activity bar), rather than needing a
  // separate open/close control.
  const handleSidebarNavClick = useCallback(
    (value: string) => {
      const tab = value as SidebarTab;
      if (sidebarOpen && sidebarTab === tab) {
        setSidebarOpen(false);
      } else {
        setSidebarTab(tab);
        setSidebarOpen(true);
      }
    },
    [sidebarOpen, sidebarTab]
  );
  // Docked, resizable pane (not an overlay drawer) — width persists across
  // sessions the same way notification/last-seen preferences already do.
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return stored >= SIDEBAR_MIN_WIDTH && stored <= SIDEBAR_MAX_WIDTH ? stored : SIDEBAR_DEFAULT_WIDTH;
  });
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);
  const handleSidebarResizeStart = useCallback((downEvent: React.MouseEvent) => {
    downEvent.preventDefault();
    const startX = downEvent.clientX;
    const startWidth = sidebarWidth;
    const onMove = (moveEvent: MouseEvent) => {
      const next = startWidth + (startX - moveEvent.clientX); // dragging left (toward chart) widens the pane
      setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, next)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [strategyPath, setStrategyPath] = useState<string | null>(null);
  const [strategyText, setStrategyText] = useState<string | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [agentInstructionsPath, setAgentInstructionsPath] = useState<string | null>(null);
  const [agentInstructionsText, setAgentInstructionsText] = useState<string | null>(null);
  const [agentInstructionsLoading, setAgentInstructionsLoading] = useState(false);
  const [agentInstructionsError, setAgentInstructionsError] = useState<string | null>(null);
  const [tradeIdeas, setTradeIdeas] = useState<TradeIdea[]>([]);
  const [thesis, setThesis] = useState<Thesis[]>([]);
  const [levels, setLevels] = useState<LevelType[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [analysisLog, setAnalysisLog] = useState<AnalysisLogEntry[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [agentActivity, setAgentActivity] = useState<AgentActivity>({});
  const [portfolioPositions, setPortfolioPositions] = useState<Position[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
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
  }, [sidebarOpen, sidebarTab, thesis, tradeIdeas, levels, journal, portfolioPositions, analysisLog]);

  const thesisNewCount = thesis.filter((t) => t.updatedAt > (lastSeenAt.thesis ?? '')).length;
  const ideasNewCount = tradeIdeas.filter(
    (i) => i.status === 'proposed' && i.createdAt > (lastSeenAt.ideas ?? '')
  ).length;
  const levelsNewCount = levels.filter(
    (l) => l.active && l.createdAt > (lastSeenAt.levels ?? '')
  ).length;
  // A `triggered` alert whose own `expiresAt` has since passed is stale,
  // not still active — the engine never revisits an already-triggered
  // alert to notice that, so isAlertLive checks it here instead. This is
  // what keeps the badge from just counting every trigger that's ever
  // fired.
  const alertsActiveCount = alerts.filter(isAlertLive).length;
  const journalNewCount = journal.filter((e) => e.timestamp > (lastSeenAt.journal ?? '')).length;
  const portfolioNewCount = portfolioPositions.filter(
    (p) => (p.exitAt ?? p.entryAt) > (lastSeenAt.portfolio ?? '')
  ).length;
  const activityNewCount = analysisLog.filter((e) => e.timestamp > (lastSeenAt.activity ?? '')).length;

  // Whether it's worth labeling "current symbol" vs. "other watchlist
  // symbols" sections at all — with only one active symbol there's
  // nothing to distinguish, so panels that group by symbol (Levels) skip
  // the section header entirely rather than labeling a group of one.
  const multiSymbol = watchlist.filter((w) => w.active).length > 1;

  const sidebarNavItems: SidebarNavItem[] = [
    { value: 'watchlist', label: 'Watchlist', icon: <WatchlistIcon /> },
    { value: 'strategy', label: 'Strategy', icon: <StrategyIcon /> },
    { value: 'thesis', label: 'Thesis', icon: <ThesisIcon />, badgeCount: thesisNewCount },
    { value: 'ideas', label: 'Ideas', icon: <IdeasIcon />, badgeCount: ideasNewCount },
    { value: 'levels', label: 'Levels', icon: <LevelsIcon />, badgeCount: levelsNewCount },
    { value: 'alerts', label: 'Alerts', icon: <AlertsIcon />, badgeCount: alertsActiveCount },
    { value: 'journal', label: 'Journal', icon: <JournalIcon />, badgeCount: journalNewCount },
    { value: 'portfolio', label: 'Portfolio', icon: <PortfolioIcon />, badgeCount: portfolioNewCount },
    { value: 'connections', label: 'Connections', icon: <ConnectionsIcon /> },
    { value: 'activity', label: 'Activity', icon: <ActivityIcon />, badgeCount: activityNewCount },
    { value: 'skills', label: 'Skills', icon: <SkillsIcon /> },
    { value: 'instructions', label: 'Agent', icon: <InstructionsIcon /> },
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
          .then(({ path, content }) => {
            setStrategyPath(path);
            setStrategyText(content);
            setStrategyError(null);
          })
          .catch(() => setStrategyError('Failed to load data/strategy.md'))
          .finally(() => setStrategyLoading(false))
      );
    }
    if (!only || only === 'agent-instructions') {
      setAgentInstructionsLoading((prev) => (only ? prev : true));
      tasks.push(
        getAgentInstructions()
          .then(({ path, content }) => {
            setAgentInstructionsPath(path);
            setAgentInstructionsText(content);
            setAgentInstructionsError(null);
          })
          .catch(() => setAgentInstructionsError('Failed to load CLAUDE.md'))
          .finally(() => setAgentInstructionsLoading(false))
      );
    }
    if (!only || only === 'trade-ideas') {
      tasks.push(getTradeIdeas().then(setTradeIdeas).catch(() => {}));
    }
    if (!only || only === 'thesis') {
      tasks.push(getThesis().then(setThesis).catch(() => {}));
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
    if (!only || only === 'journal') {
      tasks.push(getJournal().then(setJournal).catch(() => {}));
    }
    if (!only || only === 'agent-activity') {
      tasks.push(getAgentActivity().then(setAgentActivity).catch(() => {}));
    }
    if (!only || only === 'portfolio-positions') {
      tasks.push(getPortfolioPositions().then(setPortfolioPositions).catch(() => {}));
    }
    if (!only || only === 'portfolio-balances') {
      tasks.push(getAccountBalances().then(setAccountBalances).catch(() => {}));
    }
    if (!only || only === 'connections') {
      tasks.push(getConnections().then(setConnections).catch(() => {}));
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

  const handleAddJournalEntry = useCallback((entry: JournalEntry) => {
    setJournal((prev) => {
      const next = [...prev, entry];
      saveJournal(next).catch(() => {});
      return next;
    });
  }, []);

  const handleUpdateJournalEntry = useCallback((entry: JournalEntry) => {
    setJournal((prev) => {
      const next = prev.map((e) => (e.id === entry.id ? entry : e));
      saveJournal(next).catch(() => {});
      return next;
    });
  }, []);

  const handleDeleteJournalEntry = useCallback((id: string) => {
    setJournal((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveJournal(next).catch(() => {});
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
  // alert resolves (superseded/expired/invalidated) or is removed — `tag`
  // alone only stops duplicate popups, it doesn't dismiss one already on
  // screen. This is also what the Alerts panel's faded state reflects —
  // no acknowledge flag, just "is this alert still live."
  const openNotifications = useRef<Map<string, Notification>>(new Map());

  useEffect(() => {
    for (const [id, notification] of openNotifications.current) {
      const alert = alerts.find((a) => a.id === id);
      const stale =
        !alert || alert.status === 'superseded' || alert.status === 'expired' || alert.status === 'invalidated';
      if (stale) {
        notification.close();
        openNotifications.current.delete(id);
      }
    }

    // Wait for the initial load to actually land before establishing the
    // "already seen" baseline. `alerts` starts as `[]` until
    // refreshAnalysisData's first fetch resolves — seeding the baseline
    // from that empty snapshot instead of the real one meant every
    // already-triggered alert on disk got treated as brand new the instant
    // real data arrived, notifying for all of them at once on every single
    // page load.
    if (!analysisDataUpdatedAt) return;

    // First run (now against real data): remember every alert already
    // triggered on disk without notifying for them — only genuinely new
    // triggers after this point should pop.
    if (notifiedAlertIds.current === null) {
      notifiedAlertIds.current = new Set(alerts.filter((a) => a.status === 'triggered').map((a) => a.id));
      return;
    }

    if (!notificationsEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    for (const alert of alerts) {
      if (alert.status !== 'triggered') continue;
      if (notifiedAlertIds.current.has(alert.id)) continue;
      notifiedAlertIds.current.add(alert.id);

      const notification = new Notification(`Matador · ${alert.symbol}`, {
        // Triggered time leads, so it's the first thing visible in the
        // popup — you shouldn't have to open it to tell whether this is
        // fresh or something from hours ago.
        body: alert.triggeredAt
          ? `Triggered ${formatTimestamp(alert.triggeredAt)}\n${alert.headline}`
          : alert.headline,
        tag: alert.id,
      });
      notification.onclick = () => {
        window.focus();
        setSidebarOpen(true);
        setSidebarTab('alerts');
      };
      openNotifications.current.set(alert.id, notification);
    }
  }, [alerts, notificationsEnabled, analysisDataUpdatedAt]);

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

  const handleToggleWatchlistActive = useCallback((toggledSymbol: string, active: boolean) => {
    setWatchlist((prev) => {
      const next = prev.map((e) => (e.symbol === toggledSymbol ? { ...e, active } : e));
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

  // Computed once and shared by all three chart panels (main/MACD/RSI)
  // instead of each calling getFilteredCandles independently — and the
  // X-axis domain is derived from this same array's actual bounds rather
  // than a separately-computed wall-clock window, so the axis can never
  // disagree with what's actually plotted (which was letting data render
  // squished or entirely outside the visible domain, hiding levels along
  // with it, whenever the trading day had a gap in it).
  const filteredCandles = useMemo(
    () => getFilteredCandles(candles, timeFrame),
    [candles, timeFrame],
  );

  const xAxisDomain = useMemo<[number, number]>(() => {
    if (!filteredCandles.length) {
      const now = Date.now();
      return [now - getTimeFrameMs(timeFrame), now];
    }
    return [filteredCandles[0].timestamp, filteredCandles[filteredCandles.length - 1].timestamp];
  }, [filteredCandles, timeFrame]);

  // Median gap between consecutive candles' timestamps — shared by
  // mainBarSize and candleBodyWidth below. Median (not mean/min) because
  // it's insensitive to a single outlier in either direction: one
  // anomalously tiny gap (a live-merged in-progress candle a few seconds
  // after the prior bar, which is what let Recharts' own auto-sizing
  // collapse to 0px) can't drag it down, and one huge gap (an overnight/
  // weekend break between trading sessions) can't drag it up.
  const medianCandleDeltaMs = useMemo(() => {
    if (filteredCandles.length < 2) return 0;
    const deltas = filteredCandles.slice(1).map((c, i) => c.timestamp - filteredCandles[i].timestamp).sort((a, b) => a - b);
    return deltas[Math.floor(deltas.length / 2)];
  }, [filteredCandles]);

  // Explicit pixel barSize for the candlestick Bar (see its render site
  // below), applied uniformly across the whole series. Recharts' own
  // auto-sizing derives width from timestamp gaps directly and degenerates
  // exactly the way medianCandleDeltaMs above guards against; passing a
  // fixed number instead makes `props.x`/`props.width` inside
  // CandlestickBar reliable again — `x + width/2` is a stable, correctly-
  // spaced center point regardless of local density. It does NOT need to
  // be locally accurate itself (see candleBodyWidth below for the value
  // that actually drives visual fill); it only has to be a sane, nonzero
  // constant Recharts won't collapse.
  const mainBarSize = useMemo(() => {
    const domainDuration = xAxisDomain[1] - xAxisDomain[0];
    if (!(domainDuration > 0) || !(medianCandleDeltaMs > 0)) return Math.max(2, mainChartWidth / Math.max(1, filteredCandles.length));
    return Math.max(2, (mainChartWidth / domainDuration) * medianCandleDeltaMs);
  }, [filteredCandles, xAxisDomain, mainChartWidth, medianCandleDeltaMs]);

  // Per-candle pixel width, keyed by timestamp — what actually drives each
  // body/wick's visual fill (see CandlestickBar's widthByTimestamp prop).
  // mainBarSize above is one GLOBAL number applied uniformly across the
  // whole series, but real candle spacing isn't uniform: a multi-day view's
  // domain spans overnight/weekend gaps with no candles in them at all, so
  // any single global width is systematically too wide inside the
  // densely-traded clusters (where real neighbor spacing is much tighter
  // than the domain-wide average) — bars overlap there even though the
  // same width looks fine in a sparser stretch. Using each candle's own
  // actual neighbor gap (averaged across both sides where available) scales
  // correctly with real local density instead of one span-wide average —
  // but the candle sitting right next to a real session gap would
  // otherwise inherit half that gap as "its" width (ballooning to well
  // over 100px), so any local gap wider than 3x the series' typical
  // spacing is clamped back down to typical: a real gap should render as
  // empty space between two normal-width candles, not get absorbed into
  // one candle's own body.
  const candleBodyWidth = useMemo(() => {
    const map = new Map<number, number>();
    if (filteredCandles.length === 0) return map;
    const domainDuration = xAxisDomain[1] - xAxisDomain[0];
    const pxPerMs = domainDuration > 0 ? mainChartWidth / domainDuration : 0;
    const maxDeltaMs = medianCandleDeltaMs > 0 ? medianCandleDeltaMs * 3 : Infinity;
    filteredCandles.forEach((c, i) => {
      const prev = filteredCandles[i - 1];
      const next = filteredCandles[i + 1];
      const localDeltaMs = Math.min(
        maxDeltaMs,
        prev && next ? (next.timestamp - prev.timestamp) / 2 :
        next ? next.timestamp - c.timestamp :
        prev ? c.timestamp - prev.timestamp :
        0,
      );
      map.set(c.timestamp, pxPerMs > 0 && localDeltaMs > 0 ? pxPerMs * localDeltaMs : mainBarSize);
    });
    return map;
  }, [filteredCandles, xAxisDomain, mainChartWidth, mainBarSize, medianCandleDeltaMs]);

  // Only the bottom-most rendered panel shows time-axis tick labels — the
  // panels above it keep their gridlines (for alignment) but not the
  // labels, so three stacked charts don't each print their own row of
  // (redundant, slightly misaligned) timestamps.
  const bottomPanel: 'main' | 'macd' | 'rsi' = visibleIndicators.includes('rsi')
    ? 'rsi'
    : visibleIndicators.includes('macd')
      ? 'macd'
      : 'main';

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

  // The candle the chart overlays (OhlcvLegend/IndicatorLegend) describe —
  // whichever one's hovered, across any of the three panes, falling back
  // to the latest so the overlays are never empty.
  const displayCandle = hoveredCandle ?? (candles.length ? candles[candles.length - 1] : null);

  const MAIN_OVERLAY_INDICATORS: Indicator[] = ['vwap', 'ema9', 'ema21', 'sma20', 'sma50', 'sma200'];
  const mainIndicatorItems: IndicatorLegendItem[] = displayCandle
    ? MAIN_OVERLAY_INDICATORS.filter((id) => visibleIndicators.includes(id)).map((id) => ({
        key: id,
        label: INDICATOR_DEFS[id].name,
        value: displayCandle[id] != null ? INDICATOR_DEFS[id].format(displayCandle[id]!) : '—',
        color: CHART_COLORS[id],
      }))
    : [];

  const macdIndicatorItems: IndicatorLegendItem[] = displayCandle
    ? [
        { key: 'macd', label: 'MACD', value: displayCandle.macd != null ? INDICATOR_DEFS.macd.format(displayCandle.macd) : '—', color: CHART_COLORS.macdLine },
        { key: 'signal', label: 'Signal', value: displayCandle.signal != null ? INDICATOR_DEFS.macd.format(displayCandle.signal) : '—', color: CHART_COLORS.macdSignal },
        {
          key: 'histogram',
          label: 'Histogram',
          value: displayCandle.histogram != null ? INDICATOR_DEFS.macd.format(displayCandle.histogram) : '—',
          color: (displayCandle.histogram ?? 0) >= 0 ? CHART_COLORS.priceUp : CHART_COLORS.priceDown,
        },
      ]
    : [];

  const rsiIndicatorItems: IndicatorLegendItem[] = displayCandle && displayCandle.rsi != null
    ? [{ key: 'rsi', label: 'RSI', value: INDICATOR_DEFS.rsi.format(displayCandle.rsi), color: CHART_COLORS.rsi }]
    : [];

  // "Price is stretched from fair value" — a close outside whichever
  // mean-reversion band is actually enabled (VWAP's ±2σ takes priority when
  // both are on, since it's the intraday-specific read; Bollinger is the
  // any-timeframe fallback). Not its own chart line — same "numeric context
  // read alongside price" convention as ATR/RVOL in OhlcvLegend, just a
  // derived boolean instead of a raw field.
  const stretchInfo: { direction: 'above' | 'below'; band: string } | null = (() => {
    if (!displayCandle) return null;
    if (visibleIndicators.includes('vwapBands') && displayCandle.vwapUpper2 != null && displayCandle.vwapLower2 != null) {
      if (displayCandle.close > displayCandle.vwapUpper2) return { direction: 'above', band: 'VWAP +2σ' };
      if (displayCandle.close < displayCandle.vwapLower2) return { direction: 'below', band: 'VWAP -2σ' };
      return null;
    }
    if (visibleIndicators.includes('bollingerBands') && displayCandle.bollingerUpper != null && displayCandle.bollingerLower != null) {
      if (displayCandle.close > displayCandle.bollingerUpper) return { direction: 'above', band: 'Bollinger +2σ' };
      if (displayCandle.close < displayCandle.bollingerLower) return { direction: 'below', band: 'Bollinger -2σ' };
      return null;
    }
    return null;
  })();

  // Hover-only, unlike displayCandle's OHLCV/indicator readouts which fall
  // back to the latest candle — a persistent "Doji" badge for whatever the
  // latest candle happens to be is noise more often than not (doji is by
  // far the most common pattern), so this only shows on a deliberate hover,
  // matching the marker's own tooltip behavior exactly.
  const displayPatterns: string[] = (hoveredCandle?.patterns ?? []).filter((p) => visiblePatterns.includes(p));

  // One entry per candle (not just the ones with a hit) — positioned above
  // the high for a bearish read, below the low for bullish, at the
  // midpoint for neutral/mixed, or `price: null` for a candle with nothing
  // to show. Every marker/signal Scatter on this chart is built this way,
  // full-length and index-aligned with filteredCandles: a shorter,
  // pre-filtered array breaks Recharts' shared hover/crosshair tracking on
  // this chart's continuous time-scale XAxis (it can snap the crosshair to
  // the wrong candle entirely once a sibling series has fewer points than
  // the main data) — see PatternMarker.tsx for the shape,
  // PatternTooltip.tsx for the hover detail.
  const patternMarkers: PatternMarkerPoint[] = filteredCandles.map((c) => {
    const patterns = (c.patterns ?? []).filter((p) => visiblePatterns.includes(p));
    if (patterns.length === 0) return { timestamp: c.timestamp, price: null, direction: 'neutral', strength: 'weak', patterns: [] };
    const dirs = patterns.map((p) => PATTERN_INFO[p]?.direction ?? 'neutral');
    const hasBullish = dirs.includes('bullish');
    const hasBearish = dirs.includes('bearish');
    const direction: PatternMarkerPoint['direction'] =
      hasBullish && hasBearish ? 'mixed' : hasBullish ? 'bullish' : hasBearish ? 'bearish' : 'neutral';
    const price = direction === 'bearish' ? c.high : direction === 'bullish' ? c.low : (c.high + c.low) / 2;
    // The marker's brightness follows the strongest signal at this
    // candle, not just the first pattern found — a candle carrying both
    // a doji and a morning-star should read as strong, not weak.
    const strength = patterns.reduce<PatternStrength>((best, p) => {
      const s = PATTERN_INFO[p]?.strength ?? 'weak';
      return STRENGTH_RANK[s] > STRENGTH_RANK[best] ? s : best;
    }, 'weak');
    return { timestamp: c.timestamp, price, direction, strength, patterns };
  });

  // One entry per candle for each enabled crossover signal — computed
  // purely client-side (a simple sign-change scan over adjacent candles)
  // since ema9/ema21/macd/signal are already on every candle; no backend
  // change needed, same edge-trigger shape alertsEngine.ts uses for the
  // equivalent alert conditions. `value` positions the marker at the
  // midpoint of the two crossing series so it sits right at the visual
  // cross, not off to one side; `null` (see patternMarkers above for why
  // every candle needs an entry either way) for a non-crossing candle.
  const emaCrossMarkers: CrossMarkerPoint[] = filteredCandles.map((curr, i) => {
    if (!visibleSignals.includes('ema-cross')) return { timestamp: curr.timestamp, value: null, direction: 'neutral' };
    const prev = filteredCandles[i - 1];
    if (!prev || prev.ema9 == null || prev.ema21 == null || curr.ema9 == null || curr.ema21 == null) {
      return { timestamp: curr.timestamp, value: null, direction: 'neutral' };
    }
    const prevDiff = prev.ema9 - prev.ema21;
    const currDiff = curr.ema9 - curr.ema21;
    const value = (curr.ema9 + curr.ema21) / 2;
    if (prevDiff <= 0 && currDiff > 0) return { timestamp: curr.timestamp, value, direction: 'bullish', signal: 'ema-cross' };
    if (prevDiff >= 0 && currDiff < 0) return { timestamp: curr.timestamp, value, direction: 'bearish', signal: 'ema-cross' };
    return { timestamp: curr.timestamp, value: null, direction: 'neutral' };
  });

  const macdCrossMarkers: CrossMarkerPoint[] = filteredCandles.map((curr, i) => {
    if (!visibleSignals.includes('macd-cross')) return { timestamp: curr.timestamp, value: null, direction: 'neutral' };
    const prev = filteredCandles[i - 1];
    if (!prev || prev.macd == null || prev.signal == null || curr.macd == null || curr.signal == null) {
      return { timestamp: curr.timestamp, value: null, direction: 'neutral' };
    }
    const prevDiff = prev.macd - prev.signal;
    const currDiff = curr.macd - curr.signal;
    const value = (curr.macd + curr.signal) / 2;
    if (prevDiff <= 0 && currDiff > 0) return { timestamp: curr.timestamp, value, direction: 'bullish', signal: 'macd-cross' };
    if (prevDiff >= 0 && currDiff < 0) return { timestamp: curr.timestamp, value, direction: 'bearish', signal: 'macd-cross' };
    return { timestamp: curr.timestamp, value: null, direction: 'neutral' };
  });

  // Market-structure pivots — every confirmed swing high/low in the
  // visible window (see findSwingHighs/findSwingLows), not just the subset
  // that happen to form a divergence. A swing high is positioned at
  // direction 'bearish' (the top of a move — same convention patternMarkers
  // already uses for a bearish read) and a swing low at 'bullish', purely
  // for marker color/shape; it's not a directional call on what happens
  // next. Recomputed over filteredCandles itself rather than pulling from
  // server-side data (findSwingHighs/Lows only need high/low, always
  // present) — see the export comment on those functions for the resulting
  // window-edge caveat.
  const swingHighIndices = useMemo(() => new Set(findSwingHighs(filteredCandles)), [filteredCandles]);
  const swingLowIndices = useMemo(() => new Set(findSwingLows(filteredCandles)), [filteredCandles]);

  const swingHighMarkers: CrossMarkerPoint[] = filteredCandles.map((c, i) => {
    if (!visibleSignals.includes('swing-high') || !swingHighIndices.has(i)) {
      return { timestamp: c.timestamp, value: null, direction: 'neutral' };
    }
    return { timestamp: c.timestamp, value: c.high, direction: 'bearish', signal: 'swing-high' };
  });

  const swingLowMarkers: CrossMarkerPoint[] = filteredCandles.map((c, i) => {
    if (!visibleSignals.includes('swing-low') || !swingLowIndices.has(i)) {
      return { timestamp: c.timestamp, value: null, direction: 'neutral' };
    }
    return { timestamp: c.timestamp, value: c.low, direction: 'bullish', signal: 'swing-low' };
  });

  // Whether each full-length marker array actually has anything to show —
  // gates whether its Scatter renders at all. An all-null Scatter (every
  // signal/pattern off) broke the rest of its own chart panel entirely
  // (MACD's Line series disappeared along with the cross markers) rather
  // than just rendering nothing, since Recharts computes a shared axis
  // domain across every series in the panel and an all-null series
  // corrupts that — so when there's truly nothing to plot, omit the
  // Scatter tag outright instead of handing it an empty dataset.
  const hasPatternMarkers = patternMarkers.some((m) => m.price != null);
  const hasEmaCrossMarkers = emaCrossMarkers.some((m) => m.value != null);
  const hasMacdCrossMarkers = macdCrossMarkers.some((m) => m.value != null);
  const hasSwingHighMarkers = swingHighMarkers.some((m) => m.value != null);
  const hasSwingLowMarkers = swingLowMarkers.some((m) => m.value != null);

  // Market structure: a real, lookback-based trend classification off the
  // swing-pivot sequence above, plus Break-of-Structure/Change-of-Character
  // event detection (see src/utils/marketStructure.ts) — both purely
  // client-side over filteredCandles, same as every other signal on this
  // chart, no backend change needed.
  const structure = useMemo(() => classifyStructure(filteredCandles), [filteredCandles]);
  const structureBreaks = useMemo(() => detectStructureBreaks(filteredCandles), [filteredCandles]);
  const trendActionSentence = useMemo(
    () => (displayCandle ? describeTrendAction(structure, displayCandle.close) : null),
    [structure, displayCandle]
  );

  const breakMarkers: BreakMarkerPoint[] = filteredCandles.map((c, i) => {
    const showBos = visibleSignals.includes('bos');
    const showChoch = visibleSignals.includes('choch');
    if (!showBos && !showChoch) return { timestamp: c.timestamp, value: null, direction: 'neutral' };
    const brk = structureBreaks.find((b) => b.index === i && ((b.kind === 'bos' && showBos) || (b.kind === 'choch' && showChoch)));
    if (!brk) return { timestamp: c.timestamp, value: null, direction: 'neutral' };
    return {
      timestamp: c.timestamp,
      value: c.close,
      direction: brk.direction,
      kind: brk.kind,
      brokenLevel: brk.brokenLevel,
      brokenLevelTimestamp: brk.brokenLevelTimestamp,
    };
  });
  const hasBreakMarkers = breakMarkers.some((m) => m.value != null);

  // Structure connector lines — the actual "see the structure" zigzag, not
  // just isolated swing dots. Two separate polylines (highs connected to
  // highs, lows connected to lows, not alternating high-low) so the
  // higher-high/higher-low (or lower-high/lower-low) staircase reads
  // correctly; reuses DivergenceConnectorLayer as-is (already fully
  // generic over any two chart points, see its own component comment).
  // Independent toggle from swing-high/swing-low themselves.
  const structurePairs: DivergenceConnectorPair[] = useMemo(() => {
    if (!visibleSignals.includes('structure-lines')) return [];
    const pairs: DivergenceConnectorPair[] = [];
    const highIdxs = findSwingHighs(filteredCandles);
    const lowIdxs = findSwingLows(filteredCandles);
    for (let i = 1; i < highIdxs.length; i++) {
      const prev = filteredCandles[highIdxs[i - 1]];
      const curr = filteredCandles[highIdxs[i]];
      const direction: Direction = curr.high > prev.high ? 'bullish' : curr.high < prev.high ? 'bearish' : 'neutral';
      pairs.push({ id: `struct-high-${prev.timestamp}-${curr.timestamp}`, fromTimestamp: prev.timestamp, fromValue: prev.high, toTimestamp: curr.timestamp, toValue: curr.high, direction });
    }
    for (let i = 1; i < lowIdxs.length; i++) {
      const prev = filteredCandles[lowIdxs[i - 1]];
      const curr = filteredCandles[lowIdxs[i]];
      const direction: Direction = curr.low > prev.low ? 'bullish' : curr.low < prev.low ? 'bearish' : 'neutral';
      pairs.push({ id: `struct-low-${prev.timestamp}-${curr.timestamp}`, fromTimestamp: prev.timestamp, fromValue: prev.low, toTimestamp: curr.timestamp, toValue: curr.low, direction });
    }
    return pairs;
  }, [filteredCandles, visibleSignals]);

  // Auto-computed reference levels (prior day H/L/C, premarket H/L,
  // opening range) — only meaningful zoomed into intraday granularity,
  // not on the 1d/1w interval where "yesterday" is just the adjacent bar.
  const autoLevels = timeInterval === '1d' || timeInterval === '1w' ? [] : computeAutoLevels(candles);

  // Connector lines between each divergence tag's two swing points — one
  // pair per panel, since price's swing lives on the main chart's scale
  // while RSI's/MACD's matching swing lives on that panel's own scale (see
  // DivergenceConnectorLayer). Built from the partner timestamp
  // attachDivergence recorded server-side (src/utils/indicators.ts), not
  // re-derived here — only pairs whose partner candle is also in the
  // currently visible window get drawn (an off-screen partner has nowhere
  // to place its end of the line). One generic pass over DIVERGENCE_ROUTES
  // × filteredCandles replaces what used to be a hand-written branch per
  // oscillator/direction/variant combination — adding hidden divergence on
  // top of regular only meant adding rows to that table, not touching this
  // loop. Two or more active routes can point at the identical two swing
  // points (RSI and MACD divergence sharing a partner, see
  // attachDivergence's comment) and all want the same price-panel line —
  // pricePairIds dedupes that rather than drawing the same segment twice.
  const { divergencePairs, rsiDivergencePairs, macdDivergencePairs } = useMemo(() => {
    const price: DivergenceConnectorPair[] = [];
    const rsi: DivergenceConnectorPair[] = [];
    const macd: DivergenceConnectorPair[] = [];
    const activeRoutes = DIVERGENCE_ROUTES.filter((r) => visiblePatterns.includes(r.tag));
    if (activeRoutes.length === 0) return { divergencePairs: price, rsiDivergencePairs: rsi, macdDivergencePairs: macd };

    const byTimestamp = new Map(filteredCandles.map((c) => [c.timestamp, c]));
    const pricePairIds = new Set<string>();

    filteredCandles.forEach((c) => {
      const patterns = c.patterns ?? [];
      for (const route of activeRoutes) {
        if (!patterns.includes(route.tag)) continue;
        const partnerTs = route.direction === 'bearish' ? c.bearishDivergencePartner : c.bullishDivergencePartner;
        if (partnerTs == null) continue;
        const partner = byTimestamp.get(partnerTs);
        if (!partner) continue;

        const priceId = `${route.direction}-${partner.timestamp}-${c.timestamp}`;
        if (!pricePairIds.has(priceId)) {
          pricePairIds.add(priceId);
          const priceKey = route.direction === 'bearish' ? 'high' : 'low';
          price.push({ id: priceId, fromTimestamp: partner.timestamp, fromValue: partner[priceKey], toTimestamp: c.timestamp, toValue: c[priceKey], direction: route.direction });
        }

        const fromOsc = partner[route.oscillatorField];
        const toOsc = c[route.oscillatorField];
        if (fromOsc != null && toOsc != null) {
          const target = route.panel === 'rsi' ? rsi : macd;
          target.push({ id: `${route.tag}-${partner.timestamp}-${c.timestamp}`, fromTimestamp: partner.timestamp, fromValue: fromOsc, toTimestamp: c.timestamp, toValue: toOsc, direction: route.direction });
        }
      }
    });
    return { divergencePairs: price, rsiDivergencePairs: rsi, macdDivergencePairs: macd };
  }, [filteredCandles, visiblePatterns]);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="static"
        sx={{
          // Reproduce MuiAppBar's own default light/dark behavior
          // (`enableColorOnDark` defaults to false, so dark mode normally
          // uses background.paper instead of primary.main) — an explicit
          // sx.bgcolor bypasses that built-in switch entirely, which is
          // what was turning the dark-mode header solid green.
          bgcolor: (theme) =>
            alpha(theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.primary.main, 0.85),
          backdropFilter: 'blur(6px)',
        }}
      >
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ConnectionDiagnostics
              connectionState={connectionState}
              externalDataStatus={externalDataStatus}
              symbol={symbol}
              onReconnectClient={handleReconnectClient}
              onReconnectExternal={handleReconnectExternal}
              onRebuildCache={handleRebuildCache}
            />
            <MuiTooltip title={notificationsEnabled ? 'Desktop alerts on — click to disable' : 'Enable desktop alerts for new alerts'}>
              <IconButton onClick={handleToggleNotifications} color="inherit">
                {notificationsEnabled ? <NotificationsOnIcon /> : <NotificationsOffIcon />}
              </IconButton>
            </MuiTooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5 }} />
            <IconButton onClick={toggleTheme} color="inherit">
              {isDarkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <MarketHoursIndicator />
      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
      <Container
        maxWidth={false}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: 3,
          height: '100%',
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
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
          <SymbolBadge symbol={symbol} size="large" />
          {(connectionState === 'connecting' || currentPriceValue == null) ? (
            <Skeleton variant="text" width={100} sx={{ fontSize: '1.5rem' }} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
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
          {trade && (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, ml: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                <Typography variant="caption" color="text.secondary">Last</Typography>
                <Typography variant="body2">{formatVolume(trade.volume)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                <Typography variant="caption" color="text.secondary">at</Typography>
                <Typography variant="body2">
                  {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
              {trade.conditions?.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                  <Typography variant="caption" color="text.secondary">Conditions</Typography>
                  <Typography variant="body2">{trade.conditions.join(', ')}</Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
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
              <MuiTooltip title="Line Chart — just the close price">
                <ToggleButton value="price">
                  <LineChartIcon />
                </ToggleButton>
              </MuiTooltip>
              <MuiTooltip title="OHLC Line Chart — open, high, low, and close lines">
                <ToggleButton value="ohlc">
                  <OhlcChartIcon />
                </ToggleButton>
              </MuiTooltip>
              <MuiTooltip title="All — candles plus OHLC lines">
                <ToggleButton value="all">
                  <Box sx={{ display: 'flex', gap: 0 }}>
                    <CandleChartIcon />
                    <OhlcChartIcon />
                  </Box>
                </ToggleButton>
              </MuiTooltip>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MuiTooltip title="Candle Interval — what each bar on the chart represents (a minute, an hour, a day...)" placement="top" arrow>
              <TimerIcon sx={{ color: 'text.secondary' }} />
            </MuiTooltip>
            <ToggleButtonGroup
              value={timeInterval}
              exclusive
              onChange={handleTimeIntervalChange}
              size="small"
            >
              {(['1m', '5m', '15m', '1h'] as const).map((iv) => (
                <MuiTooltip key={iv} title={TIME_INTERVAL_HELP[iv]} placement="top" arrow>
                  <ToggleButton value={iv}>{iv.toUpperCase()}</ToggleButton>
                </MuiTooltip>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MuiTooltip title="Display Range — how far back the chart shows, independent of candle size" placement="top" arrow>
              <DateRangeIcon sx={{ color: 'text.secondary' }} />
            </MuiTooltip>
            <ToggleButtonGroup
              value={timeFrame}
              exclusive
              onChange={handleTimeFrameChange}
              size="small"
            >
              {(['today', '15m', '1h', '3h', '6h', '1d', '1w', '1mo', '3mo'] as const).map((tf) => (
                <MuiTooltip key={tf} title={TIME_FRAME_HELP[tf]} placement="top" arrow>
                  <ToggleButton value={tf}>{tf === 'today' ? 'Today' : tf.toUpperCase()}</ToggleButton>
                </MuiTooltip>
              ))}
            </ToggleButtonGroup>
          </Box>
          <MuiTooltip title="Chart Presets — one-click setups bundling interval, range, and indicators/patterns/signals for a specific kind of read">
            <IconButton size="small" onClick={(e) => setPresetsMenuAnchor(e.currentTarget)}>
              <PresetsIcon />
            </IconButton>
          </MuiTooltip>
          <Menu
            anchorEl={presetsMenuAnchor}
            open={Boolean(presetsMenuAnchor)}
            onClose={() => setPresetsMenuAnchor(null)}
            MenuListProps={{ dense: true, sx: { py: 0.5 } }}
            slotProps={{ paper: { sx: { width: 320 } } }}
          >
            {CHART_PRESETS.map((preset) => (
              <MuiTooltip
                key={preset.id}
                placement="right"
                arrow
                title={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 0.5, maxWidth: 280 }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignSelf: 'center',
                        justifyContent: 'center',
                        bgcolor: '#161616',
                        borderRadius: 1,
                        px: 1.5,
                        py: 0.75,
                      }}
                    >
                      <PatternIllustration candles={preset.thumbnail} />
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{preset.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{preset.description}</Typography>
                    <Typography variant="caption" sx={{ fontStyle: 'italic' }}>{preset.howToUse}</Typography>
                  </Box>
                }
              >
                <MenuItem
                  sx={{ minHeight: 26, py: 0.6, px: 1.5, gap: 1 }}
                  onClick={() => {
                    handleApplyPreset(preset);
                    setPresetsMenuAnchor(null);
                  }}
                >
                  {(() => {
                    const Icon = PRESET_ICON[preset.id];
                    return Icon ? <Icon fontSize="small" /> : null;
                  })()}
                  <Typography variant="caption" noWrap>{preset.label}</Typography>
                </MenuItem>
              </MuiTooltip>
            ))}
          </Menu>
          <MuiTooltip title="Indicators">
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <SettingsIcon />
            </IconButton>
          </MuiTooltip>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            MenuListProps={{ dense: true, sx: { py: 0 } }}
            slotProps={{ paper: { sx: { maxHeight: 420, width: 320 } } }}
          >
            <Tabs
              value={menuTab}
              onChange={(_e, v) => setMenuTab(v)}
              variant="fullWidth"
              sx={{ minHeight: 32, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, '& .MuiTab-root': { minHeight: 32, py: 0, fontSize: '0.7rem' } }}
            >
              <Tab value="indicators" label={<TabCountLabel text="Indicators" count={indicators.length} />} />
              <Tab value="patterns" label={<TabCountLabel text="Patterns" count={enabledPatterns.length} />} />
              <Tab value="signals" label={<TabCountLabel text="Signals" count={enabledSignals.length} />} />
            </Tabs>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1,
                py: 0.25,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Show on chart
              </Typography>
              <Switch
                size="small"
                checked={
                  menuTab === 'indicators' ? indicatorsVisible : menuTab === 'patterns' ? patternsVisible : signalsVisible
                }
                onChange={() =>
                  menuTab === 'indicators'
                    ? setIndicatorsVisible((v) => !v)
                    : menuTab === 'patterns'
                      ? setPatternsVisible((v) => !v)
                      : setSignalsVisible((v) => !v)
                }
              />
            </Box>
            {menuTab === 'indicators' &&
              Object.values(INDICATOR_DEFS).map(indicator => (
                <MuiTooltip
                  key={indicator.id}
                  placement="right"
                  arrow
                  title={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 0.5, maxWidth: 240 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{indicator.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{indicator.description}</Typography>
                      <Typography variant="caption" sx={{ fontStyle: 'italic' }}>{indicator.why}</Typography>
                    </Box>
                  }
                >
                  <MenuItem sx={{ minHeight: 26, py: 0.25, px: 1 }} onClick={() => handleIndicatorChange(indicator.id)}>
                    <Checkbox
                      size="small"
                      checked={indicators.includes(indicator.id)}
                      onChange={() => {}}
                      sx={{ p: 0.25, mr: 0.75 }}
                    />
                    <Box
                      sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CHART_COLORS[indicator.id], mr: 0.75, flexShrink: 0 }}
                    />
                    <Typography variant="caption" noWrap>{indicator.name}</Typography>
                  </MenuItem>
                </MuiTooltip>
              ))}
            {menuTab === 'patterns' &&
              Object.entries(PATTERN_INFO).map(([key, info]) => (
                <MuiTooltip
                  key={key}
                  placement="right"
                  arrow
                  title={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 0.5, maxWidth: 240 }}>
                      {(PATTERN_ILLUSTRATIONS[key] || DIVERGENCE_ILLUSTRATIONS[key]) && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignSelf: 'center',
                            justifyContent: 'center',
                            bgcolor: '#161616',
                            borderRadius: 1,
                            px: 1.5,
                            py: 0.75,
                          }}
                        >
                          {DIVERGENCE_ILLUSTRATIONS[key] ? (
                            <DivergenceIllustration spec={DIVERGENCE_ILLUSTRATIONS[key]} />
                          ) : (
                            <PatternIllustration candles={PATTERN_ILLUSTRATIONS[key]} />
                          )}
                        </Box>
                      )}
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{info.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{info.description}</Typography>
                      <Typography variant="caption" sx={{ fontStyle: 'italic' }}>{info.why}</Typography>
                    </Box>
                  }
                >
                  <MenuItem sx={{ minHeight: 26, py: 0.25, px: 1 }} onClick={() => handlePatternToggle(key)}>
                    <Checkbox
                      size="small"
                      checked={enabledPatterns.includes(key)}
                      onChange={() => {}}
                      sx={{ p: 0.25, mr: 0.75 }}
                    />
                    <Box
                      sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getPatternColor(info.direction, info.strength), mr: 0.75, flexShrink: 0 }}
                    />
                    <Typography variant="caption" noWrap>{info.label}</Typography>
                  </MenuItem>
                </MuiTooltip>
              ))}
            {menuTab === 'signals' &&
              Object.entries(SIGNAL_INFO).map(([key, info]) => (
                <MuiTooltip
                  key={key}
                  placement="right"
                  arrow
                  title={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 0.5, maxWidth: 240 }}>
                      {SIGNAL_ILLUSTRATIONS[key] && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignSelf: 'center',
                            justifyContent: 'center',
                            bgcolor: '#161616',
                            borderRadius: 1,
                            px: 1.5,
                            py: 0.75,
                          }}
                        >
                          <SignalIllustration spec={SIGNAL_ILLUSTRATIONS[key]} />
                        </Box>
                      )}
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{info.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{info.description}</Typography>
                      <Typography variant="caption" sx={{ fontStyle: 'italic' }}>{info.why}</Typography>
                    </Box>
                  }
                >
                  <MenuItem sx={{ minHeight: 26, py: 0.25, px: 1 }} onClick={() => handleSignalToggle(key)}>
                    <Checkbox
                      size="small"
                      checked={enabledSignals.includes(key)}
                      onChange={() => {}}
                      sx={{ p: 0.25, mr: 0.75 }}
                    />
                    <Box
                      sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SIGNAL_SWATCH[key as SignalKey], mr: 0.75, flexShrink: 0 }}
                    />
                    <Typography variant="caption" noWrap>{info.label}</Typography>
                  </MenuItem>
                </MuiTooltip>
              ))}
          </Menu>
        </Box>
        <Box sx={{ flexGrow: 1, minHeight: '400px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ flexGrow: 1, minHeight: '60%', position: 'relative' }}>
            {displayCandle && (
              <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
                <OhlcvLegend
                  candle={displayCandle}
                  indicators={indicators}
                  stretched={stretchInfo}
                  structure={trendActionSentence ? { trend: structure.trend, action: trendActionSentence } : null}
                />
                <IndicatorLegend items={mainIndicatorItems} />
                <PatternBadges patterns={displayPatterns} />
              </Box>
            )}
            {filteredCandles.length === 0 ? (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">No data for this range yet</Typography>
              </Box>
            ) : (
            <ResponsiveContainer width="100%" height="100%" onResize={(w) => setMainChartWidth(w)}>
              <ComposedChart
                data={filteredCandles}
                onMouseMove={(state: any) => {
                  handleChartMouseMove(state);
                  if (state?.chartY != null && priceScaleRef.current) {
                    setCrosshairPrice(priceScaleRef.current.invert(state.chartY));
                  }
                }}
                onMouseLeave={handleChartMouseLeave}
              >
                <Customized
                  component={({ yAxisMap }: any) => {
                    const axis = yAxisMap && (Object.values(yAxisMap)[0] as any);
                    if (axis?.scale) priceScaleRef.current = axis.scale;
                    return null;
                  }}
                />
                {divergencePairs.length > 0 && (
                  <Customized component={(chartProps: any) => <DivergenceConnectorLayer {...chartProps} pairs={divergencePairs} />} />
                )}
                {structurePairs.length > 0 && (
                  <Customized component={(chartProps: any) => <DivergenceConnectorLayer {...chartProps} pairs={structurePairs} />} />
                )}
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(128, 128, 128, 0.2)"
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxisTick}
                  tick={bottomPanel === 'main'}
                  domain={xAxisDomain}
                  type="number"
                  scale="time"
                  interval="preserveStartEnd"
                  minTickGap={60}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  orientation="right"
                  tickFormatter={formatPrice}
                />
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
                {crosshairPrice != null && (
                  <ReferenceLine
                    y={crosshairPrice}
                    stroke="#9e9e9e"
                    strokeDasharray="2 2"
                    label={{
                      value: formatPrice(crosshairPrice),
                      position: 'right',
                      fill: '#9e9e9e',
                      fontSize: 11,
                    }}
                  />
                )}
                {hoveredCandle && (
                  <ReferenceLine
                    x={hoveredCandle.timestamp}
                    stroke="#9e9e9e"
                    strokeDasharray="2 2"
                    label={{
                      value: formatRelativeTime(new Date(hoveredCandle.timestamp).toISOString()),
                      position: 'top',
                      fill: '#9e9e9e',
                      fontSize: 11,
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
                {autoLevels.map((level) => (
                  <ReferenceLine
                    key={level.id}
                    y={level.price}
                    stroke="#9e9e9e"
                    strokeDasharray="2 2"
                    strokeOpacity={0.4}
                    label={{
                      value: `${level.label} ${formatPrice(level.price)}`,
                      position: 'insideLeft',
                      fill: '#9e9e9e',
                      fontSize: 10,
                    }}
                  />
                ))}
                {(chartMode === 'candles' || chartMode === 'all') && (
                  <Bar
                    dataKey={d => [d.low, d.high]}
                    shape={<CandlestickBar maxVolume={Math.max(...candles.map(c => c.volume))} widthByTimestamp={candleBodyWidth} />}
                    name="Range"
                    isAnimationActive={false}
                    barSize={mainBarSize}
                  />
                )}
                {chartMode === 'price' && (
                  <Line
                    type="linear"
                    dataKey="close"
                    stroke={isPriceUp(candles) ? CHART_COLORS.priceUp : CHART_COLORS.priceDown}
                    strokeWidth={3}
                    dot={false}
                    name="Close"
                    isAnimationActive={false}
                  />
                )}
                {(chartMode === 'ohlc' || chartMode === 'all') && (
                  <>
                    {/* Open/High/Low are supporting context, not each their
                        own headline color — one calm neutral hue for all
                        three, told apart by dash pattern (not hue) so Close
                        (still the real green/red focal line below) stays
                        the one thing your eye actually locks onto. */}
                    <Line
                      type="linear"
                      dataKey="open"
                      stroke={OHLC_LINE_COLOR}
                      strokeOpacity={0.45}
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      dot={false}
                      name="Open"
                      isAnimationActive={false}
                    />
                    <Line
                      type="linear"
                      dataKey="high"
                      stroke={OHLC_LINE_COLOR}
                      strokeOpacity={0.65}
                      strokeWidth={1}
                      strokeDasharray="5 2"
                      dot={false}
                      name="High"
                      isAnimationActive={false}
                    />
                    <Line
                      type="linear"
                      dataKey="low"
                      stroke={OHLC_LINE_COLOR}
                      strokeOpacity={0.65}
                      strokeWidth={1}
                      strokeDasharray="2 5"
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
                {visibleIndicators.includes('vwap') && (
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
                {visibleIndicators.includes('vwapBands') && (
                  <>
                    <Line
                      key="vwapUpper1"
                      type="monotone"
                      dataKey="vwapUpper1"
                      stroke={CHART_COLORS.vwap}
                      strokeOpacity={0.4}
                      strokeWidth={1}
                      dot={false}
                      name="VWAP +1σ"
                      isAnimationActive={false}
                    />
                    <Line
                      key="vwapLower1"
                      type="monotone"
                      dataKey="vwapLower1"
                      stroke={CHART_COLORS.vwap}
                      strokeOpacity={0.4}
                      strokeWidth={1}
                      dot={false}
                      name="VWAP -1σ"
                      isAnimationActive={false}
                    />
                    <Line
                      key="vwapUpper2"
                      type="monotone"
                      dataKey="vwapUpper2"
                      stroke={CHART_COLORS.vwap}
                      strokeOpacity={0.2}
                      strokeWidth={1}
                      dot={false}
                      name="VWAP +2σ"
                      isAnimationActive={false}
                    />
                    <Line
                      key="vwapLower2"
                      type="monotone"
                      dataKey="vwapLower2"
                      stroke={CHART_COLORS.vwap}
                      strokeOpacity={0.2}
                      strokeWidth={1}
                      dot={false}
                      name="VWAP -2σ"
                      isAnimationActive={false}
                    />
                  </>
                )}
                {visibleIndicators.includes('bollingerBands') && (
                  <>
                    <Line
                      key="bollingerUpper"
                      type="monotone"
                      dataKey="bollingerUpper"
                      stroke={CHART_COLORS.bollingerBands}
                      strokeOpacity={0.5}
                      strokeWidth={1}
                      dot={false}
                      name="Bollinger +2σ"
                      isAnimationActive={false}
                    />
                    <Line
                      key="bollingerMiddle"
                      type="monotone"
                      dataKey="bollingerMiddle"
                      stroke={CHART_COLORS.bollingerBands}
                      strokeOpacity={0.3}
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      dot={false}
                      name="Bollinger SMA(20)"
                      isAnimationActive={false}
                    />
                    <Line
                      key="bollingerLower"
                      type="monotone"
                      dataKey="bollingerLower"
                      stroke={CHART_COLORS.bollingerBands}
                      strokeOpacity={0.5}
                      strokeWidth={1}
                      dot={false}
                      name="Bollinger -2σ"
                      isAnimationActive={false}
                    />
                  </>
                )}
                {visibleIndicators.includes('ema9') && (
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
                {visibleIndicators.includes('ema21') && (
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
                {visibleIndicators.includes('sma20') && (
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
                {visibleIndicators.includes('sma50') && (
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
                {visibleIndicators.includes('sma200') && (
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
                {hasPatternMarkers && (
                  <Scatter
                    data={patternMarkers}
                    dataKey="price"
                    shape={(props: any) => (
                      <PatternMarkerShape {...props} onHover={handlePatternMarkerHover} onLeave={handlePatternMarkerLeave} />
                    )}
                    isAnimationActive={false}
                    legendType="none"
                  />
                )}
                {hasEmaCrossMarkers && (
                  <Scatter
                    data={emaCrossMarkers}
                    dataKey="value"
                    shape={(props: any) => (
                      <CrossMarkerShape {...props} onHover={handleCrossMarkerHover} onLeave={handleCrossMarkerLeave} />
                    )}
                    isAnimationActive={false}
                    legendType="none"
                  />
                )}
                {hasSwingHighMarkers && (
                  <Scatter
                    data={swingHighMarkers}
                    dataKey="value"
                    shape={(props: any) => (
                      <CrossMarkerShape {...props} onHover={handleCrossMarkerHover} onLeave={handleCrossMarkerLeave} />
                    )}
                    isAnimationActive={false}
                    legendType="none"
                  />
                )}
                {hasSwingLowMarkers && (
                  <Scatter
                    data={swingLowMarkers}
                    dataKey="value"
                    shape={(props: any) => (
                      <CrossMarkerShape {...props} onHover={handleCrossMarkerHover} onLeave={handleCrossMarkerLeave} />
                    )}
                    isAnimationActive={false}
                    legendType="none"
                  />
                )}
                {hasBreakMarkers && (
                  <Scatter
                    data={breakMarkers}
                    dataKey="value"
                    shape={(props: any) => (
                      <BreakMarkerShape {...props} onHover={handleBreakMarkerHover} onLeave={handleBreakMarkerLeave} />
                    )}
                    isAnimationActive={false}
                    legendType="none"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            )}
          </Box>
          {hoveredPatternMarker && (
            <PatternTooltip
              point={hoveredPatternMarker.point}
              x={hoveredPatternMarker.x}
              y={hoveredPatternMarker.y}
            />
          )}
          {hoveredCrossMarker && (
            <CrossTooltip
              point={hoveredCrossMarker.point}
              x={hoveredCrossMarker.x}
              y={hoveredCrossMarker.y}
            />
          )}
          {hoveredBreakMarker && hoveredBreakMarker.point.kind && (
            <BreakTooltip
              point={hoveredBreakMarker.point}
              action={describeBreakAction(
                {
                  index: 0,
                  timestamp: hoveredBreakMarker.point.timestamp,
                  kind: hoveredBreakMarker.point.kind,
                  direction: hoveredBreakMarker.point.direction,
                  brokenLevel: hoveredBreakMarker.point.brokenLevel ?? 0,
                  brokenLevelTimestamp: hoveredBreakMarker.point.brokenLevelTimestamp ?? 0,
                },
                structure
              )}
              x={hoveredBreakMarker.x}
              y={hoveredBreakMarker.y}
            />
          )}

          {visibleIndicators.includes('macd') && (
            <Box sx={{ height: '20%', position: 'relative' }}>
              {displayCandle && (
                <Box sx={{ position: 'absolute', top: 4, left: 8, zIndex: 2 }}>
                  <IndicatorLegend items={macdIndicatorItems} />
                </Box>
              )}
              {filteredCandles.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={filteredCandles}
                  onMouseMove={handleChartMouseMove}
                  onMouseLeave={handleChartMouseLeave}
                >
                  {macdDivergencePairs.length > 0 && (
                    <Customized component={(chartProps: any) => <DivergenceConnectorLayer {...chartProps} pairs={macdDivergencePairs} />} />
                  )}
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatXAxisTick}
                    tick={bottomPanel === 'macd'}
                    domain={xAxisDomain}
                    type="number"
                    scale="time"
                    interval="preserveStartEnd"
                    minTickGap={60}
                  />
                  <YAxis orientation="right" />
                  {hoveredCandle && (
                    <ReferenceLine x={hoveredCandle.timestamp} stroke="#9e9e9e" strokeDasharray="2 2" />
                  )}
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
                  {hasMacdCrossMarkers && (
                    <Scatter
                      data={macdCrossMarkers}
                      dataKey="value"
                      shape={(props: any) => (
                        <CrossMarkerShape {...props} onHover={handleCrossMarkerHover} onLeave={handleCrossMarkerLeave} />
                      )}
                      isAnimationActive={false}
                      legendType="none"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
              )}
            </Box>
          )}
          
          {visibleIndicators.includes('rsi') && (
            <Box sx={{ height: '20%', position: 'relative' }}>
              {displayCandle && (
                <Box sx={{ position: 'absolute', top: 4, left: 8, zIndex: 2 }}>
                  <IndicatorLegend items={rsiIndicatorItems} />
                </Box>
              )}
              {filteredCandles.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={filteredCandles}
                  onMouseMove={handleChartMouseMove}
                  onMouseLeave={handleChartMouseLeave}
                >
                  {rsiDivergencePairs.length > 0 && (
                    <Customized component={(chartProps: any) => <DivergenceConnectorLayer {...chartProps} pairs={rsiDivergencePairs} />} />
                  )}
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatXAxisTick}
                    tick={bottomPanel === 'rsi'}
                    domain={xAxisDomain}
                    type="number"
                    scale="time"
                    interval="preserveStartEnd"
                    minTickGap={60}
                  />
                  <YAxis
                    orientation="right"
                    domain={[0, 100]}
                    ticks={[0, 30, 70, 100]}
                  />
                  <ReferenceLine y={30} stroke="rgba(255,0,0,0.3)" />
                  <ReferenceLine y={70} stroke="rgba(255,0,0,0.3)" />
                  {hoveredCandle && (
                    <ReferenceLine x={hoveredCandle.timestamp} stroke="#9e9e9e" strokeDasharray="2 2" />
                  )}
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
              )}
            </Box>
          )}
        </Box>
      </Container>
      {sidebarOpen && (
        <>
          <Box
            onMouseDown={handleSidebarResizeStart}
            sx={{
              width: 6,
              flexShrink: 0,
              cursor: 'col-resize',
              bgcolor: 'divider',
              '&:hover': { bgcolor: 'primary.main' },
              transition: 'background-color 0.15s',
            }}
          />
          <Box
            sx={{
              width: sidebarWidth,
              flexShrink: 0,
              height: '100%',
              display: 'flex',
              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.85),
              backdropFilter: 'blur(6px)',
              position: 'relative',
            }}
          >
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <MuiTooltip title="Collapse panel">
                  <IconButton size="small" onClick={() => setSidebarOpen(false)}>
                    <CollapseIcon fontSize="small" />
                  </IconButton>
                </MuiTooltip>
              </Box>
              {sidebarTab === 'watchlist' && (
                <>
                  <SkillTip>
                    Add/remove symbols here directly, or just ask the agent to add one to the watchlist. The
                    switch pauses a symbol entirely — no market data caching, no find-trades analysis —
                    without removing it.
                  </SkillTip>
                  <WatchlistPanel
                    watchlist={watchlist}
                    activeSymbol={symbol}
                    onSelectSymbol={handleSelectWatchlistSymbol}
                    onAdd={handleAddWatchlistSymbol}
                    onRemove={handleRemoveWatchlistSymbol}
                    onToggleActive={handleToggleWatchlistActive}
                  />
                </>
              )}
              {sidebarTab === 'strategy' && (
                <>
                  <SkillTip>
                    Edited by the agent directly when you discuss strategy changes in chat — no skill needed, just talk
                    through the change.
                  </SkillTip>
                  <StrategyPanel
                    strategyPath={strategyPath}
                    strategyText={strategyText}
                    loading={strategyLoading}
                    error={strategyError}
                  />
                </>
              )}
              {sidebarTab === 'thesis' && (
                <>
                  <SkillTip>
                    The agent's standing read on each symbol — written directly in chat when you ask for an
                    analysis or a prediction, no skill needed. Distinct from Ideas (a concrete trade
                    proposal) and Alerts (a one-shot trigger) — this is the running "why" behind them.
                  </SkillTip>
                  <LastEvaluatedIndicator iso={agentActivity.thesis} />
                  <ThesisPanel thesis={thesis} currentSymbol={symbol} multiSymbol={multiSymbol} />
                </>
              )}
              {sidebarTab === 'ideas' && (
                <>
                  <SkillTip>
                    Populated by the <code>find-trades</code> skill — ask the agent to "scan for trades" or run{' '}
                    <code>/find-trades</code>.
                  </SkillTip>
                  <IdeasPanel ideas={tradeIdeas} lastUpdated={analysisDataUpdatedAt} currentSymbol={symbol} multiSymbol={multiSymbol} />
                </>
              )}
              {sidebarTab === 'levels' && (
                <>
                  <SkillTip>
                    Also written by <code>find-trades</code> — support/resistance levels get flagged even when no
                    trade idea qualifies.
                  </SkillTip>
                  <LastEvaluatedIndicator iso={agentActivity.levels} />
                  <LevelsPanel levels={levels} currentSymbol={symbol} multiSymbol={multiSymbol} />
                </>
              )}
              {sidebarTab === 'alerts' && (
                <>
                  <SkillTip>
                    Also written by <code>find-trades</code> — notable events like a new idea or price nearing a
                    level. Enable the bell icon (top right) for real desktop notifications on new ones. Faded
                    ones have already resolved (invalidated, expired, or superseded) — nothing to act on.
                  </SkillTip>
                  <LastEvaluatedIndicator iso={agentActivity.alerts} />
                  <AlertsPanel alerts={alerts} />
                </>
              )}
              {sidebarTab === 'journal' && (
                <>
                  <SkillTip>
                    Freeform notes worth remembering, plus the agent's own self-graded reviews of past thesis/
                    alert calls against what actually happened. Kept up to date by the agent in chat, or add/
                    edit/delete entries directly here. For real trades and account balance, see Portfolio
                    instead.
                  </SkillTip>
                  <LastEvaluatedIndicator iso={agentActivity.journal} />
                  <JournalPanel
                    journal={journal}
                    onAdd={handleAddJournalEntry}
                    onUpdate={handleUpdateJournalEntry}
                    onDelete={handleDeleteJournalEntry}
                  />
                </>
              )}
              {sidebarTab === 'portfolio' && (
                <>
                  <SkillTip>
                    Actual account state only — real open/closed positions and real cash. Just tell the agent
                    ("bought 5 QQQ 715c", "closed for +\$340", "deposited \$2k") and it's kept up to date. No
                    analysis or plans here — see Thesis/Ideas/Journal for that.
                  </SkillTip>
                  <PortfolioPanel positions={portfolioPositions} balances={accountBalances} />
                </>
              )}
              {sidebarTab === 'connections' && (
                <>
                  <SkillTip>
                    External systems this app reflects — market data and brokerage accounts. Configured
                    conversationally, same as the rest of this app: tell the agent what to change.
                  </SkillTip>
                  <ConnectionsPanel connections={connections} />
                </>
              )}
              {sidebarTab === 'activity' && (
                <>
                  <SkillTip>
                    The run history of <code>find-trades</code> (and any future analysis skills) — including "no
                    setup found" results, so you can see what actually ran.
                  </SkillTip>
                  <LastEvaluatedIndicator iso={agentActivity.activity} />
                  <ActivityPanel entries={analysisLog} />
                </>
              )}
              {sidebarTab === 'skills' && (
                <>
                  <SkillTip>
                    Documentation for every agent skill available in this project, read straight from{' '}
                    <code>.claude/skills/*/SKILL.md</code> — ask the agent to add or edit a skill and this updates
                    itself.
                  </SkillTip>
                  <SkillsPanel skills={skills} />
                </>
              )}
              {sidebarTab === 'instructions' && (
                <>
                  <SkillTip>
                    The standing project instructions the agent actually follows in every session — this
                    is what governs when Journal/Portfolio/Thesis get kept up to date without a skill run.
                    Read-only here; edited directly in the repo (<code>CLAUDE.md</code>) when the
                    conventions change.
                  </SkillTip>
                  <InstructionsPanel
                    path={agentInstructionsPath}
                    text={agentInstructionsText}
                    loading={agentInstructionsLoading}
                    error={agentInstructionsError}
                  />
                </>
              )}
            </Box>
          </Box>
        </>
      )}
      <SidebarNav items={sidebarNavItems} value={sidebarOpen ? sidebarTab : false} onChange={handleSidebarNavClick} />
      </Box>
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
