// src/hooks/useSpeechInput.ts
// Voice input via the browser's Web Speech API (Chrome, Edge, Safari).
// No API key and no server call from AeroDAG; the browser does the speech-to-text.
import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechStatus = 'idle' | 'listening' | 'error';

interface Options {
  /** Called with the final text of each finished phrase. */
  onFinalText: (text: string) => void;
  /** BCP-47 language, default Indian English. */
  lang?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked. Allow the mic in your browser settings, or type instead.',
  'service-not-allowed': 'Microphone access was blocked. Allow the mic in your browser settings, or type instead.',
  'no-speech': "We didn't hear anything. Tap the mic and try again.",
  'audio-capture': 'No microphone was found on this device.',
  network: 'Voice input needs an internet connection. Please type instead.'
};

export function getSpeechRecognitionCtor(): any {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechInput({ onFinalText, lang = 'en-IN' }: Options) {
  const isSupported = !!getSpeechRecognitionCtor();
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [interimText, setInterimText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onFinalRef = useRef(onFinalText);
  onFinalRef.current = onFinalText;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus('error');
      setErrorText('Voice input isn\'t supported in this browser. Try Chrome or Edge, or type instead.');
      return;
    }
    recognitionRef.current?.abort();
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setStatus('listening');
      setErrorText(null);
      setInterimText('');
    };
    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          if (text.trim()) onFinalRef.current(text.trim());
        } else {
          interim += text;
        }
      }
      setInterimText(interim);
    };
    rec.onerror = (event: any) => {
      if (event.error === 'aborted') return;
      setStatus('error');
      setErrorText(ERROR_MESSAGES[event.error] || 'Voice input stopped unexpectedly. Please try again or type instead.');
    };
    rec.onend = () => {
      setInterimText('');
      setStatus((s) => (s === 'error' ? 'error' : 'idle'));
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setStatus('error');
      setErrorText('Voice input could not start. Please try again.');
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (status === 'listening') stop();
    else start();
  }, [status, start, stop]);

  const clearError = useCallback(() => {
    setErrorText(null);
    setStatus((s) => (s === 'error' ? 'idle' : s));
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { isSupported, status, interimText, errorText, start, stop, toggle, clearError };
}
