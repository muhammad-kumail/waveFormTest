import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Video from 'react-native-video';
import { WhatsAppVoiceMessage } from './WhatsAppVoiceMessage';

export type ChatMessage =
  | {
      id: string;
      type: 'text';
      text: string;
      createdAt: number;
      isOutgoing: boolean;
    }
  | {
      id: string;
      type: 'image';
      uri: string;
      name?: string;
      createdAt: number;
      isOutgoing: boolean;
    }
  | {
      id: string;
      type: 'video';
      uri: string;
      name?: string;
      createdAt: number;
      isOutgoing: boolean;
    }
  | {
      id: string;
      type: 'audio';
      path: string;
      name?: string;
      createdAt: number;
      isOutgoing: boolean;
    };

type ChatMessageBubbleProps = {
  message: ChatMessage;
};

function formatClock(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

function MessageMeta({ timestamp }: { timestamp: number }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.timeText}>{formatClock(timestamp)}</Text>
      <Text style={styles.checkMarks}>✓✓</Text>
    </View>
  );
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  if (message.type === 'audio') {
    return (
      <View style={styles.messageRow}>
        <WhatsAppVoiceMessage
          path={message.path}
          fileName={message.name}
          isOutgoing={message.isOutgoing}
          onError={error => console.error('Voice message error:', error)}
        />
      </View>
    );
  }

  const isOutgoing = message.isOutgoing;
  const bubbleStyle = [
    styles.bubble,
    isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
  ];

  return (
    <View
      style={[
        styles.messageRow,
        isOutgoing ? styles.outgoingRow : styles.incomingRow,
      ]}
    >
      <View style={bubbleStyle}>
        {message.type === 'text' ? (
          <Text style={styles.messageText}>{message.text}</Text>
        ) : null}

        {message.type === 'image' ? (
          <>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setIsPreviewVisible(true)}
            >
              <Image source={{ uri: message.uri }} style={styles.image} />
            </TouchableOpacity>
            {message.name ? (
              <Text style={styles.mediaName} numberOfLines={1}>
                {message.name}
              </Text>
            ) : null}
          </>
        ) : null}

        {message.type === 'video' ? (
          <>
            <View style={styles.videoWrap}>
              <Video
                source={{ uri: message.uri }}
                style={styles.video}
                resizeMode="cover"
                controls
                paused
              />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setIsPreviewVisible(true)}
                style={styles.openVideoButton}
              >
                <Text style={styles.openVideoText}>Open</Text>
              </TouchableOpacity>
            </View>
            {message.name ? (
              <Text style={styles.mediaName} numberOfLines={1}>
                {message.name}
              </Text>
            ) : null}
          </>
        ) : null}

        <MessageMeta timestamp={message.createdAt} />
      </View>

      <Modal
        animationType="fade"
        visible={isPreviewVisible}
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <View style={styles.preview}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsPreviewVisible(false)}
            style={styles.closePreviewButton}
          >
            <Text style={styles.closePreviewText}>Close</Text>
          </Pressable>

          {message.type === 'image' ? (
            <Image
              source={{ uri: message.uri }}
              resizeMode="contain"
              style={styles.previewMedia}
            />
          ) : null}

          {message.type === 'video' ? (
            <Video
              source={{ uri: message.uri }}
              style={styles.previewMedia}
              resizeMode="contain"
              controls
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    width: '100%',
    marginVertical: 3,
    paddingHorizontal: 10,
  },
  outgoingRow: {
    alignItems: 'flex-end',
  },
  incomingRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  outgoingBubble: {
    backgroundColor: '#d9fdd3',
    borderTopRightRadius: 3,
  },
  incomingBubble: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 3,
  },
  messageText: {
    color: '#111b21',
    fontSize: 16,
    lineHeight: 21,
  },
  image: {
    width: 230,
    height: 260,
    borderRadius: 10,
    backgroundColor: '#dfe5e7',
  },
  mediaName: {
    color: '#3b4a54',
    fontSize: 12,
    marginTop: 6,
    maxWidth: 230,
  },
  videoWrap: {
    width: 250,
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111b21',
  },
  video: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  openVideoButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  openVideoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  timeText: {
    color: '#667781',
    fontSize: 11,
  },
  checkMarks: {
    color: '#53bdeb',
    fontSize: 11,
    fontWeight: '700',
  },
  preview: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  closePreviewButton: {
    position: 'absolute',
    right: 18,
    top: 52,
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  closePreviewText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
  },
});
