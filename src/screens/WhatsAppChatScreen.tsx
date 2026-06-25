import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  IWaveformRef,
  PermissionStatus,
  UpdateFrequency,
  useAudioPermission,
  Waveform,
} from '@simform_solutions/react-native-audio-waveform';
import ImageCropPicker, {
  ImageOrVideo,
} from 'react-native-image-crop-picker';
import {
  ChatMessage,
  ChatMessageBubble,
} from '../components/ChatMessageBubble';

type GalleryMediaKind = 'image' | 'video';

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeMediaUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }

  return `file://${uri}`;
}

function getFallbackName(
  kind: GalleryMediaKind | 'audio',
  index: number,
): string {
  return `${kind}-${Date.now()}-${index}`;
}

function isCropPickerCancel(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'E_PICKER_CANCELLED'
  );
}

export function WhatsAppChatScreen() {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const recorderRef = useRef<IWaveformRef>(null);
  const {
    checkHasAudioRecorderPermission,
    getAudioRecorderPermission,
  } = useAudioPermission();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createMessageId(),
      type: 'text',
      text: 'Hey, send text, images, videos, or a voice message from below.',
      createdAt: Date.now(),
      isOutgoing: false,
    },
  ]);
  const [messageText, setMessageText] = useState('');
  const [composerHint, setComposerHint] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const appendMessages = useCallback((nextMessages: ChatMessage[]) => {
    setMessages(currentMessages => [...currentMessages, ...nextMessages]);
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const sendTextMessage = useCallback(() => {
    const trimmedText = messageText.trim();

    if (!trimmedText) return;

    setMessageText('');
    setComposerHint('');
    appendMessages([
      {
        id: createMessageId(),
        type: 'text',
        text: trimmedText,
        createdAt: Date.now(),
        isOutgoing: true,
      },
    ]);
  }, [appendMessages, messageText]);

  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setRecordingSeconds(currentSeconds => currentSeconds + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const pickGalleryMedia = useCallback(
    async (kind: GalleryMediaKind) => {
      try {
        setComposerHint(`Choose ${kind}s to send`);

        const pickedMedia = await ImageCropPicker.openPicker({
          mediaType: kind === 'image' ? 'photo' : 'video',
          multiple: true,
          cropping: kind === 'image',
          compressImageQuality: 0.9,
        });
        const selectedMedia = Array.isArray(pickedMedia)
          ? pickedMedia
          : [pickedMedia];

        appendMessages(
          selectedMedia.map((media: ImageOrVideo, index) => ({
            id: createMessageId(),
            type: kind,
            uri: normalizeMediaUri(media.path),
            name: media.filename ?? getFallbackName(kind, index),
            createdAt: Date.now(),
            isOutgoing: true,
          })),
        );
        setComposerHint('');
      } catch (error) {
        if (isCropPickerCancel(error)) {
          setComposerHint('');
          return;
        }

        console.error(`Failed to pick ${kind}:`, error);
        setComposerHint(`Could not add ${kind}. Please try another file.`);
      }
    },
    [appendMessages],
  );

  const ensureRecorderPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
      const alreadyGranted = await PermissionsAndroid.check(permission);

      if (alreadyGranted) {
        return true;
      }

      const result = await PermissionsAndroid.request(permission, {
        title: 'Microphone permission',
        message: 'This app needs microphone access to record voice messages.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        setComposerHint(
          'Microphone permission is blocked. Enable it from app settings.',
        );
        await Linking.openSettings();
      }

      return false;
    }

    const currentStatus = await checkHasAudioRecorderPermission();

    if (currentStatus === PermissionStatus.granted) {
      return true;
    }

    if (currentStatus === PermissionStatus.undetermined) {
      const nextStatus = await getAudioRecorderPermission();
      return nextStatus === PermissionStatus.granted;
    }

    await Linking.openSettings();
    return false;
  }, [checkHasAudioRecorderPermission, getAudioRecorderPermission]);

  const startVoiceRecording = useCallback(async () => {
    try {
      const hasPermission = await ensureRecorderPermission();

      if (!hasPermission) {
        setComposerHint('Microphone permission is required to record audio.');
        return;
      }

      setIsRecording(true);
      setRecordingSeconds(0);
      setComposerHint('Recording voice message...');

      requestAnimationFrame(() => {
        recorderRef.current
          ?.startRecord({
            updateFrequency: UpdateFrequency.high,
          })
          .then(didStart => {
            if (!didStart) {
              setIsRecording(false);
              setComposerHint('Could not start recording. Please try again.');
            }
          })
          .catch(error => {
            console.error('Failed to start recording:', error);
            setIsRecording(false);
            setComposerHint('Could not start recording. Please try again.');
          });
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      setComposerHint('Could not start recording. Please try again.');
    }
  }, [ensureRecorderPermission]);

  const cancelVoiceRecording = useCallback(async () => {
    try {
      if (isRecording) {
        await recorderRef.current?.stopRecord();
      }

      setIsRecording(false);
      setRecordingSeconds(0);
      setComposerHint('');
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      setComposerHint('Could not cancel recording.');
    }
  }, [isRecording]);

  const sendVoiceRecording = useCallback(async () => {
    try {
      const recordedPath = await recorderRef.current?.stopRecord();

      setIsRecording(false);
      setRecordingSeconds(0);
      setComposerHint('');

      if (!recordedPath) return;

      const fileName = getFallbackName('audio', 0);
      appendMessages([
        {
          id: createMessageId(),
          type: 'audio',
          path: recordedPath,
          name: fileName,
          createdAt: Date.now(),
          isOutgoing: true,
        },
      ]);
    } catch (error) {
      console.error('Failed to send recording:', error);
      setComposerHint('Could not send recording. Please try again.');
    }
  }, [appendMessages]);

  const formattedRecordingTime = `${Math.floor(recordingSeconds / 60)}:${(
    recordingSeconds % 60
  )
    .toString()
    .padStart(2, '0')}`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>W</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>WhatsApp Chat</Text>
          <Text style={styles.headerSubtitle}>online</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ChatMessageBubble message={item} />}
        style={styles.messageListContainer}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
      />

      <View style={styles.footer}>
        {composerHint ? (
          <Text style={styles.composerHint}>{composerHint}</Text>
        ) : null}

        {isRecording ? (
          <View style={styles.recordingRow}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={cancelVoiceRecording}
              style={styles.cancelRecordingButton}
            >
              <Text style={styles.cancelRecordingText}>Cancel</Text>
            </TouchableOpacity>

            <View style={styles.recordingShell}>
              <Text style={styles.recordingDot}>●</Text>
              <Text style={styles.recordingTime}>{formattedRecordingTime}</Text>
              <Waveform
                ref={recorderRef}
                mode="live"
                candleSpace={2}
                candleWidth={3}
                candleHeightScale={4}
                maxCandlesToRender={42}
                waveColor="#008069"
                containerStyle={styles.liveWaveform}
              />
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={sendVoiceRecording}
              style={styles.stopRecordingButton}
            >
              <Text style={styles.sendButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.composerRow}>
            <View style={styles.inputShell}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => pickGalleryMedia('image')}
                style={styles.iconButton}
              >
                <Text style={styles.iconButtonText}>Img</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => pickGalleryMedia('video')}
                style={styles.iconButton}
              >
                <Text style={styles.iconButtonText}>Vid</Text>
              </TouchableOpacity>

              <TextInput
                multiline
                placeholder="Message"
                placeholderTextColor="#667781"
                style={styles.textInput}
                value={messageText}
                onChangeText={setMessageText}
              />
            </View>

            {messageText.trim() ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={sendTextMessage}
                style={styles.sendButton}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={startVoiceRecording}
                style={styles.sendButton}
              >
                <Text style={styles.sendButtonText}>Mic</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#efe7dd',
  },
  header: {
    height: 62,
    backgroundColor: '#008069',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#d9fdd3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#008069',
    fontSize: 18,
    fontWeight: '800',
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12,
    marginTop: 1,
  },
  messageListContainer: {
    flex: 1,
  },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingTop: 10,
    paddingBottom: 8,
  },
  footer: {
    backgroundColor: '#efe7dd',
    elevation: 12,
    zIndex: 10,
  },
  composerHint: {
    color: '#3b4a54',
    fontSize: 12,
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#efe7dd',
  },
  inputShell: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 5,
    gap: 4,
  },
  iconButton: {
    minWidth: 38,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  iconButtonText: {
    color: '#54656f',
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 96,
    color: '#111b21',
    fontSize: 16,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopRecordingButton: {
    width: 54,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#d92d20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#efe7dd',
  },
  cancelRecordingButton: {
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cancelRecordingText: {
    color: '#d92d20',
    fontSize: 12,
    fontWeight: '700',
  },
  recordingShell: {
    flex: 1,
    minWidth: 0,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  recordingDot: {
    color: '#d92d20',
    fontSize: 13,
  },
  recordingTime: {
    color: '#111b21',
    fontSize: 14,
    fontWeight: '700',
    width: 40,
  },
  liveWaveform: {
    flex: 1,
    height: 34,
  },
});
