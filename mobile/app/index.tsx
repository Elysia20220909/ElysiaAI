import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL_KEY = '@elysia_api_url';
const DEFAULT_API_URL = 'http://192.168.1.100:3000'; // Replace with your local IP

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function IndexScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [showSettings, setShowSettings] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadApiUrl();
  }, []);

  const loadApiUrl = async () => {
    try {
      const saved = await AsyncStorage.getItem(API_URL_KEY);
      if (saved) setApiUrl(saved);
    } catch (e) {
      console.error('Failed to load API URL', e);
    }
  };

  const saveApiUrl = async (url: string) => {
    try {
      await AsyncStorage.setItem(API_URL_KEY, url);
      setApiUrl(url);
      setShowSettings(false);
    } catch (e) {
      console.error('Failed to save API URL', e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/elysia-love`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;
          
          // Update assistant message in real-time
          setMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: assistantContent || 'No response' }]);
    } catch (error) {
      console.error('API Error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `ごめんね…エラーが起きちゃった💦\n${error instanceof Error ? error.message : String(error)}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (showSettings) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FFB7D5', '#FF8AC6']}
          style={styles.gradient}
        >
          <View style={styles.settingsContainer}>
            <Text style={styles.settingsTitle}>API Settings</Text>
            <Text style={styles.settingsLabel}>Server URL:</Text>
            <TextInput
              style={styles.settingsInput}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://192.168.1.100:3000"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.settingsHint}>
              Tip: Use your computer's local IP address.{'\n'}
              Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find it.
            </Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => saveApiUrl(apiUrl)}
            >
              <Text style={styles.saveButtonText}>Save & Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <LinearGradient
        colors={['#FFB7D5', '#FF8AC6']}
        style={styles.gradient}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>
                ฅ(՞៸៸&gt; ᗜ &lt;៸៸՞)ฅ♡{'\n\n'}
                やっほー！エリシアだよ♡{'\n'}
                何でも話してね〜！
              </Text>
            </View>
          )}
          {messages.map((msg, idx) => (
            <View
              key={idx}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={styles.messageText}>{msg.content}</Text>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FF69B4" />
              <Text style={styles.loadingText}>エリシアが考え中…♡</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.settingsIconButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="メッセージを入力…♡"
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={loading || !input.trim()}
          >
            <Text style={styles.sendButtonText}>💌</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
  },
  settingsIconButton: {
    padding: 8,
    marginRight: 8,
  },
  settingsIcon: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#FF69B4',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 24,
  },
  settingsContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  settingsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  settingsLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '600',
  },
  settingsInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  settingsHint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#fff',
  },
});
