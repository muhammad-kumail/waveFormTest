import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {
  IWaveformRef,
  PlayerState,
  Waveform,
} from '@simform_solutions/react-native-audio-waveform';

type WhatsAppVoiceMessageProps = {
  path: string;
  fileName?: string;
  isOutgoing?: boolean;
  maxBars?: number;
  candleSpace?: number;
  candleWidth?: number;
  bubbleColor?: string;
  playButtonColor?: string;
  playedColor?: string;
  waveformColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  onPlaybackStateChange?: (state: PlayerState) => void;
  onProgressChange?: (currentMs: number, durationMs: number) => void;
  onLoadStateChange?: (isLoading: boolean) => void;
  onError?: (error: unknown) => void;
};

function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function WhatsAppVoiceMessage({
  path,
  fileName,
  isOutgoing = true,
  maxBars = 48,
  candleSpace = 2,
  candleWidth,
  bubbleColor,
  playButtonColor = '#00a884',
  playedColor = '#008069',
  waveformColor = 'rgba(17, 27, 33, 0.3)',
  textColor = '#111b21',
  style,
  onPlaybackStateChange,
  onProgressChange,
  onLoadStateChange,
  onError,
}: WhatsAppVoiceMessageProps) {
  const waveformRef = useRef<IWaveformRef>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [playerState, setPlayerState] = useState<PlayerState>(
    PlayerState.stopped,
  );
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const isPlaying = playerState === PlayerState.playing;
  const resolvedBubbleColor =
    bubbleColor ?? (isOutgoing ? '#d9fdd3' : '#ffffff');
  const resolvedCandleWidth = candleWidth ?? clamp(214 / maxBars, 2, 6);

  useEffect(() => {
    setIsLoading(true);
    setCurrentMs(0);
    setDurationMs(0);
    setPlayerState(PlayerState.stopped);
    const waveform = waveformRef.current;

    return () => {
      waveform?.stopPlayer().catch(() => {});
    };
  }, [path]);

  const togglePlayback = useCallback(async () => {
    if (!waveformRef.current || isLoading) return;

    if (isPlaying) {
      await waveformRef.current.pausePlayer();
      return;
    }

    await waveformRef.current.startPlayer({
      finishMode: 0,
    });
  }, [isLoading, isPlaying]);

  const handlePlayerStateChange = useCallback(
    (state: PlayerState) => {
      setPlayerState(state);
      onPlaybackStateChange?.(state);

      if (state === PlayerState.stopped) {
        setCurrentMs(0);
      }
    },
    [onPlaybackStateChange],
  );

  const handleProgressChange = useCallback(
    (current: number, total: number) => {
      setCurrentMs(current);
      setDurationMs(total);
      onProgressChange?.(current, total);
    },
    [onProgressChange],
  );

  const handleLoadStateChange = useCallback(
    (loading: boolean) => {
      setIsLoading(loading);
      onLoadStateChange?.(loading);
    },
    [onLoadStateChange],
  );

  const handleError = useCallback(
    (error: unknown) => {
      setIsLoading(false);
      onError?.(error);
    },
    [onError],
  );

  return (
    <View
      style={[
        styles.wrapper,
        isOutgoing ? styles.outgoingWrapper : styles.incomingWrapper,
        style,
      ]}
    >
      <View style={[styles.bubble, { backgroundColor: resolvedBubbleColor }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            isPlaying ? 'Pause voice message' : 'Play voice message'
          }
          activeOpacity={0.8}
          disabled={isLoading}
          onPress={togglePlayback}
          style={[styles.playButton, { backgroundColor: playButtonColor }]}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.playIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.messageBody}>
          {fileName ? (
            <Text
              style={[styles.fileName, { color: textColor }]}
              numberOfLines={1}
            >
              {fileName}
            </Text>
          ) : null}

          <Waveform
            ref={waveformRef}
            mode="static"
            path={path}
            candleSpace={candleSpace}
            candleWidth={resolvedCandleWidth}
            waveColor={waveformColor}
            scrubColor={playedColor}
            containerStyle={styles.waveform}
            onPlayerStateChange={handlePlayerStateChange}
            onCurrentProgressChange={handleProgressChange}
            onChangeWaveformLoadState={handleLoadStateChange}
            onPanStateChange={() => {}}
            onError={handleError}
          />

          <View style={styles.metaRow}>
            <Text style={[styles.timeText, { color: textColor }]}>
              {formatTime(currentMs || durationMs)}
            </Text>
            <Text style={[styles.checkMarks, { color: playedColor }]}>✓✓</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  outgoingWrapper: {
    alignItems: 'flex-end',
  },
  incomingWrapper: {
    alignItems: 'flex-start',
  },
  bubble: {
    width: 286,
    minHeight: 76,
    borderRadius: 18,
    borderTopRightRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 2,
  },
  messageBody: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    opacity: 0.75,
  },
  waveform: {
    height: 50,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    opacity: 0.65,
  },
  checkMarks: {
    fontSize: 12,
    fontWeight: '700',
  },
});
