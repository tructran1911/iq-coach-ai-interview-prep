import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Edit2, Check, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpeechToTextProps {
  onTranscriptChange: (text: string) => void;
  isListening: boolean;
  onStopListening: () => void;
  onStartListening: () => void;
}

export function useSpeechToText() {
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const onResultCallbackRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript && onResultCallbackRef.current) {
          onResultCallbackRef.current(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
      };

      recognition.onend = () => {
        // Tự động khởi động lại nếu người dùng chưa bấm dừng chủ động
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Đang start hoặc bận, bỏ qua
          }
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const start = (onResult: (text: string) => void) => {
    if (!recognitionRef.current) return;
    onResultCallbackRef.current = onResult;
    isListeningRef.current = true;
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Có thể đã start rồi
    }
  };

  const stop = () => {
    isListeningRef.current = false;
    onResultCallbackRef.current = null;
    try {
      recognitionRef.current?.stop();
    } catch (e) {}
  };

  return { isSupported, start, stop };
}

export function useTextToSpeech() {
  const speak = (text: string) => {
    // Force stop any current speech before starting new one
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    // Stable voice picking logic
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return null;
      
      return voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))) 
             || voices.find(v => v.lang.startsWith('en')) 
             || voices[0];
    };

    const attemptSpeak = () => {
      const voice = pickVoice();
      if (voice) {
        utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      } else if (window.speechSynthesis.onvoiceschanged === null) {
        // Only attach if not already waiting
        window.speechSynthesis.onvoiceschanged = () => {
          const v = pickVoice();
          if (v) {
            utterance.voice = v;
            window.speechSynthesis.speak(utterance);
            window.speechSynthesis.onvoiceschanged = null;
          }
        };
      }
    };

    attemptSpeak();
  };

  return { speak };
}
