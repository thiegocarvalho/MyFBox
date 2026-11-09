import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';

export interface InsightAudioPlayerProps {
  title: string;
  paragraphs: string[];
  highlights?: string[];
  monthLabel: string;
  currentReadingIndex?: number;
  onReadingIndexChange?: (index: number | null) => void;
}

const RATES = [1, 1.25, 1.5, 2] as const;
type PlaybackRate = (typeof RATES)[number];
type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended';

interface SegmentItem {
  id: number;
  label: string;
  text: string;
}

interface LanguageVoiceOption {
  langCode: string;
  flag: string;
  label: string;
  voice: SpeechSynthesisVoice;
}

const LANG_FLAG_MAP: Record<string, string> = {
  pt: '🇧🇷',
  'pt-br': '🇧🇷',
  'pt-pt': '🇵🇹',
  en: '🇺🇸',
  'en-us': '🇺🇸',
  'en-gb': '🇬🇧',
  'en-ca': '🇨🇦',
  'en-au': '🇦🇺',
  es: '🇪🇸',
  'es-es': '🇪🇸',
  'es-mx': '🇲🇽',
  'es-ar': '🇦🇷',
  fr: '🇫🇷',
  'fr-fr': '🇫🇷',
  'fr-ca': '🇨🇦',
  de: '🇩🇪',
  'de-de': '🇩🇪',
  it: '🇮🇹',
  'it-it': '🇮🇹',
  ja: '🇯🇵',
  'ja-jp': '🇯🇵',
  zh: '🇨🇳',
  'zh-cn': '🇨🇳',
  'zh-tw': '🇹🇼',
  ru: '🇷🇺',
  'ru-ru': '🇷🇺',
  ko: '🇰🇷',
  'ko-kr': '🇰🇷',
  nl: '🇳🇱',
  'nl-nl': '🇳🇱',
  sv: '🇸🇪',
  da: '🇩🇰',
  no: '🇳🇴',
  fi: '🇫🇮',
  pl: '🇵🇱',
  tr: '🇹🇷',
  el: '🇬🇷',
  hi: '🇮🇳',
  ar: '🇸🇦',
};

const LANG_NAME_MAP: Record<string, string> = {
  pt: 'Português',
  en: 'Inglês',
  es: 'Espanhol',
  fr: 'Francês',
  de: 'Alemão',
  it: 'Italiano',
  ja: 'Japonês',
  zh: 'Chinês',
  ru: 'Russo',
  ko: 'Coreano',
  nl: 'Holandês',
  sv: 'Sueco',
  da: 'Dinamarquês',
  no: 'Norueguês',
  fi: 'Finlandês',
  pl: 'Polonês',
  tr: 'Turco',
  el: 'Grego',
  hi: 'Hindi',
  ar: 'Árabe',
};

function getLanguageFlag(lang: string): string {
  if (!lang) return '🌐';
  const normalized = lang.replace('_', '-').toLowerCase();
  if (LANG_FLAG_MAP[normalized]) {
    return LANG_FLAG_MAP[normalized];
  }
  const base = normalized.split('-')[0];
  if (LANG_FLAG_MAP[base]) {
    return LANG_FLAG_MAP[base];
  }

  const parts = normalized.split('-');
  if (parts.length > 1 && parts[1].length === 2) {
    const country = parts[1].toUpperCase();
    if (/^[A-Z]{2}$/.test(country)) {
      return String.fromCodePoint(...country.split('').map((c) => 127397 + c.charCodeAt(0)));
    }
  }

  return '🌐';
}

const LANG_DISPLAY_NAMES =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['pt-BR'], { type: 'language' })
    : null;

function getLanguageLabel(lang: string): string {
  const base = lang.replace('_', '-').split('-')[0].toLowerCase();
  if (LANG_NAME_MAP[base]) {
    return LANG_NAME_MAP[base];
  }
  try {
    const name = LANG_DISPLAY_NAMES?.of(base);
    if (name) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  } catch {
    return lang.toUpperCase();
  }
  return lang.toUpperCase();
}

function getBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'pt-BR';
  return navigator.language || (navigator.languages && navigator.languages[0]) || 'pt-BR';
}

export const InsightAudioPlayer: React.FC<InsightAudioPlayerProps> = ({
  title,
  paragraphs,
  highlights,
  monthLabel,
  onReadingIndexChange,
}) => {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [rate, setRate] = useState<PlaybackRate>(1.25);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [currentSegment, setCurrentSegment] = useState(0);

  const isMountedRef = useRef(true);
  const segmentRef = useRef(0);
  const rateRef = useRef(rate);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    segmentRef.current = currentSegment;
  }, [currentSegment]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  const segments: SegmentItem[] = useMemo(() => {
    const list: SegmentItem[] = [
      {
        id: 0,
        label: 'Introdução & Título',
        text: `Análise financeira de ${monthLabel}. ${title}.`,
      },
    ];

    paragraphs.forEach((p, idx) => {
      const clean = p.trim();
      if (!clean) return;
      list.push({
        id: list.length,
        label: `Parágrafo ${idx + 1}`,
        text: clean,
      });
    });

    if (highlights && highlights.length > 0) {
      list.push({
        id: list.length,
        label: 'Destaques',
        text: `Pontos de destaque: ${highlights.join('. ')}.`,
      });
    }

    return list;
  }, [monthLabel, title, paragraphs, highlights]);

  useEffect(() => {
    if (playbackState === 'playing') {
      onReadingIndexChange?.(currentSegment);
    } else {
      onReadingIndexChange?.(null);
    }
  }, [playbackState, currentSegment, onReadingIndexChange]);

  useEffect(() => {
    isMountedRef.current = true;
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      !('SpeechSynthesisUtterance' in window)
    ) {
      return;
    }

    const checkAndInitVoices = () => {
      if (!isMountedRef.current) return false;
      try {
        const allVoices = window.speechSynthesis.getVoices();
        const localVoices = allVoices ? allVoices.filter((v) => v.localService) : [];
        if (localVoices.length > 0) {
          setVoices(localVoices);
          setIsAvailable(true);

          const browserLang = getBrowserLanguage().toLowerCase();
          const browserPrefix = browserLang.split('-')[0];

          const preferred =
            localVoices.find((v) => v.lang.toLowerCase() === browserLang) ||
            localVoices.find((v) => v.lang.toLowerCase().startsWith(browserPrefix)) ||
            localVoices.find((v) => v.lang.toLowerCase().startsWith('pt')) ||
            localVoices.find((v) => v.default) ||
            localVoices[0] ||
            null;

          setSelectedVoice(preferred);
          return true;
        }
      } catch {
        return false;
      }
      return false;
    };

    const ready = checkAndInitVoices();

    const handleVoicesChanged = () => {
      checkAndInitVoices();
    };

    window.speechSynthesis.addEventListener?.('voiceschanged', handleVoicesChanged);
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

    const timer = setTimeout(() => {
      if (!ready && isMountedRef.current) {
        const finalCheck = checkAndInitVoices();
        if (!finalCheck) {
          setIsAvailable(false);
        }
      }
    }, 400);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener?.('voiceschanged', handleVoicesChanged);
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const uniqueLanguageVoices = useMemo<LanguageVoiceOption[]>(() => {
    if (voices.length === 0) return [];

    const browserLang = getBrowserLanguage().toLowerCase();
    const browserBase = browserLang.split('-')[0];

    const groups = new Map<string, SpeechSynthesisVoice[]>();
    for (const v of voices) {
      const base = v.lang.replace('_', '-').split('-')[0].toLowerCase();
      const bucket = groups.get(base);
      if (bucket) {
        bucket.push(v);
      } else {
        groups.set(base, [v]);
      }
    }

    const result: LanguageVoiceOption[] = [];

    for (const [base, list] of groups.entries()) {
      const bestVoice =
        list.find((v) => v.lang.toLowerCase() === browserLang) ||
        list.find((v) => v.default) ||
        list[0];

      const flag = getLanguageFlag(bestVoice.lang || base);
      const label = getLanguageLabel(base);

      result.push({
        langCode: base,
        flag,
        label,
        voice: bestVoice,
      });
    }

    return result.sort((a, b) => {
      const aIsBrowser = a.langCode === browserBase;
      const bIsBrowser = b.langCode === browserBase;
      if (aIsBrowser && !bIsBrowser) return -1;
      if (!aIsBrowser && bIsBrowser) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [voices]);

  if (!isAvailable || uniqueLanguageVoices.length === 0) {
    return null;
  }

  const playSegment = (idx: number) => {
    if (!('speechSynthesis' in window)) return;
    const voice = selectedVoiceRef.current;
    if (!voice || !voice.localService) return;
    if (idx >= segments.length) {
      setPlaybackState('ended');
      setCurrentSegment(0);
      return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(segments[idx].text);
    utterance.rate = rateRef.current;
    utterance.lang = (voice.lang || getBrowserLanguage()).replace('_', '-');
    utterance.voice = voice;

    utterance.onend = () => {
      if (!isMountedRef.current) return;
      const nextIdx = idx + 1;
      if (nextIdx < segments.length) {
        setCurrentSegment(nextIdx);
        playSegment(nextIdx);
      } else {
        setPlaybackState('ended');
        setCurrentSegment(0);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        if (isMountedRef.current) {
          setPlaybackState('idle');
          if (
            e.error === 'synthesis-failed' ||
            e.error === 'synthesis-unavailable' ||
            e.error === 'not-allowed'
          ) {
            setIsAvailable(false);
          }
        }
      }
    };

    setCurrentSegment(idx);
    setPlaybackState('playing');
    window.speechSynthesis.speak(utterance);
  };

  const handleSeek = (targetIdx: number) => {
    const safeIdx = Math.max(0, Math.min(segments.length - 1, targetIdx));
    setCurrentSegment(safeIdx);

    if (playbackState === 'playing') {
      playSegment(safeIdx);
    }
  };

  const handlePrev = () => {
    handleSeek(currentSegment - 1);
  };

  const handleNext = () => {
    handleSeek(currentSegment + 1);
  };

  const handleTogglePlay = () => {
    if (playbackState === 'playing') {
      window.speechSynthesis.cancel();
      setPlaybackState('paused');
    } else if (playbackState === 'paused') {
      playSegment(segmentRef.current);
    } else {
      playSegment(currentSegment);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setCurrentSegment(0);
    setPlaybackState('idle');
  };

  const handleRateChange = (newRate: PlaybackRate) => {
    setRate(newRate);
    rateRef.current = newRate;
    if (playbackState === 'playing') {
      playSegment(segmentRef.current);
    }
  };

  const isLocalVoice = selectedVoice?.localService;
  const currentLangBase = selectedVoice
    ? selectedVoice.lang.replace('_', '-').split('-')[0].toLowerCase()
    : getBrowserLanguage().split('-')[0].toLowerCase();

  return (
    <div className="cmp-audio-player compact">
      <div className="cmp-audio-controls">
        <button
          type="button"
          className="cmp-audio-nav-btn"
          onClick={handlePrev}
          disabled={currentSegment === 0}
          title="Retroceder trecho anterior"
          aria-label="Trecho anterior"
        >
          <SkipBack size={13} />
        </button>

        <button
          type="button"
          className={`btn-primary cmp-audio-play-btn ${playbackState === 'playing' ? 'is-playing' : ''}`}
          onClick={handleTogglePlay}
          title={playbackState === 'playing' ? 'Pausar leitura' : 'Ouvir insight em áudio'}
        >
          {playbackState === 'playing' ? <Pause size={13} /> : <Play size={13} />}
          <span>
            {playbackState === 'playing'
              ? 'Pausar'
              : playbackState === 'paused'
              ? 'Continuar'
              : 'Ouvir'}
          </span>
        </button>

        <button
          type="button"
          className="cmp-audio-nav-btn"
          onClick={handleNext}
          disabled={currentSegment >= segments.length - 1}
          title="Avançar próximo trecho"
          aria-label="Próximo trecho"
        >
          <SkipForward size={13} />
        </button>

        {(playbackState === 'playing' || playbackState === 'paused') && (
          <button
            type="button"
            className="btn-secondary cmp-audio-icon-btn"
            onClick={handleStop}
            title="Reiniciar leitura"
            aria-label="Reiniciar áudio"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>

      <div className="cmp-audio-status">
        {playbackState === 'playing' && (
          <div className="cmp-audio-wave" aria-hidden="true">
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
          </div>
        )}
        <span
          className="cmp-audio-segment-tag mono"
          title={`Trecho ${currentSegment + 1} de ${segments.length}: ${segments[currentSegment]?.label || ''}`}
        >
          {currentSegment + 1}/{segments.length}
        </span>
      </div>

      <div className="cmp-audio-settings">
        <select
          className="cmp-audio-select mono"
          value={rate}
          onChange={(e) => handleRateChange(Number(e.target.value) as PlaybackRate)}
          title="Velocidade de leitura"
          aria-label="Velocidade de leitura"
        >
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r}x
            </option>
          ))}
        </select>

        <select
          className="cmp-audio-select cmp-voice-select"
          value={currentLangBase}
          onChange={(e) => {
            const opt = uniqueLanguageVoices.find((item) => item.langCode === e.target.value);
            if (opt) {
              setSelectedVoice(opt.voice);
              selectedVoiceRef.current = opt.voice;
              if (playbackState === 'playing') {
                playSegment(segmentRef.current);
              }
            }
          }}
          aria-label="Idioma de leitura"
          title={`Idioma: ${selectedVoice ? getLanguageLabel(selectedVoice.lang) : 'Padrão'}`}
        >
          {uniqueLanguageVoices.map((item) => (
            <option key={item.langCode} value={item.langCode}>
              {item.flag} {item.label}
            </option>
          ))}
        </select>

        {isLocalVoice && (
          <span className="cmp-offline-badge" title="Processado localmente no dispositivo">
            Offline
          </span>
        )}
      </div>
    </div>
  );
};
