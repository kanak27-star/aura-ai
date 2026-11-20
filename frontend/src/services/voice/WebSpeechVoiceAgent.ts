import {
  IVoiceAgent,
  VoiceCapabilities,
  VoiceError,
  VoiceRecognitionCallbacks,
  VoiceSpeakOptions,
} from './types';
import { WebAudioMeter } from './WebAudioMeter';

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): ISpeechRecognition };
    webkitSpeechRecognition?: { new (): ISpeechRecognition };
  }
}

export class WebSpeechVoiceAgent implements IVoiceAgent {
  readonly id = 'web-speech-agent';
  readonly name = 'Browser Web Speech Engine';

  private recognition: ISpeechRecognition | null = null;
  private audioMeter = new WebAudioMeter();
  private synth: SpeechSynthesis | null = null;
  private listeningActive = false;
  private speakingActive = false;
  private currentTranscript = '';

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
      }
    }
  }

  async getCapabilities(): Promise<VoiceCapabilities> {
    const isBrowser = typeof window !== 'undefined';
    const userAgent = isBrowser ? navigator.userAgent.toLowerCase() : '';
    const isFirefox = userAgent.includes('firefox');
    const isEdge = userAgent.includes('edg');
    const isChrome = !isEdge && userAgent.includes('chrome');
    const isSafari = !isChrome && !isEdge && userAgent.includes('safari');

    const browserName = isFirefox
      ? 'Firefox'
      : isEdge
      ? 'Microsoft Edge'
      : isChrome
      ? 'Google Chrome'
      : isSafari
      ? 'Apple Safari'
      : 'Other Browser';

    const speechRecSupported = isBrowser && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const speechSynSupported = isBrowser && 'speechSynthesis' in window;
    const audioMeteringSupported = isBrowser && !!navigator.mediaDevices?.getUserMedia;

    let permissionState: VoiceCapabilities['permissionState'] = 'prompt';
    if (isBrowser && navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permissionState = status.state as VoiceCapabilities['permissionState'];
      } catch {
        permissionState = speechRecSupported ? 'prompt' : 'unsupported';
      }
    }

    return {
      speechRecognitionSupported: speechRecSupported,
      speechSynthesisSupported: speechSynSupported,
      audioMeteringSupported,
      browserName,
      isFirefox,
      permissionState,
    };
  }

  async startListening(callbacks: VoiceRecognitionCallbacks): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Interrupt any active speech before listening
    this.stopSpeaking();

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      callbacks.onError({
        type: 'not_supported',
        message: 'Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.',
        recoverable: false,
        details: 'The Web Speech Recognition API is unavailable in this environment (e.g. Firefox or Safari with flag disabled).',
      });
      return false;
    }

    // Stop previous instance if running
    this.stopListening();
    this.currentTranscript = '';

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.listeningActive = true;
        callbacks.onStart?.();

        // Start real-time audio metering if callback is provided
        if (callbacks.onAudioLevel) {
          this.audioMeter.start((level, isActual) => {
            if (this.listeningActive) {
              callbacks.onAudioLevel?.(level, isActual);
            }
          });
        }
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        if (final) {
          this.currentTranscript = final.trim();
          callbacks.onTranscript(this.currentTranscript, true);
        } else if (interim) {
          this.currentTranscript = interim.trim();
          callbacks.onTranscript(this.currentTranscript, false);
        }
      };

      this.recognition.onerror = (event: { error: string; message?: string }) => {
        this.listeningActive = false;
        this.audioMeter.stop();

        const errType = event.error;
        let voiceError: VoiceError;

        switch (errType) {
          case 'not-allowed':
          case 'service-not-allowed':
            voiceError = {
              type: 'permission_denied',
              message: 'Microphone access was denied. Please allow microphone permissions in your browser URL bar.',
              recoverable: true,
              details: 'The browser blocked access to the microphone.',
            };
            break;
          case 'no-speech':
            voiceError = {
              type: 'no_speech',
              message: 'No speech was detected. Tap the mic and speak clearly.',
              recoverable: true,
            };
            break;
          case 'audio-capture':
            voiceError = {
              type: 'audio_capture',
              message: 'No microphone was found on your device. Please plug in a microphone and retry.',
              recoverable: false,
            };
            break;
          case 'network':
            voiceError = {
              type: 'network',
              message: 'Network error encountered during speech recognition. Please check your connection.',
              recoverable: true,
            };
            break;
          case 'aborted':
            voiceError = {
              type: 'aborted',
              message: 'Voice listening was cancelled.',
              recoverable: true,
            };
            break;
          default:
            voiceError = {
              type: 'unknown',
              message: event.message || `Speech recognition error: ${errType}`,
              recoverable: true,
            };
            break;
        }

        callbacks.onError(voiceError);
      };

      this.recognition.onend = () => {
        this.listeningActive = false;
        this.audioMeter.stop();
        callbacks.onEnd();
      };

      this.recognition.start();
      return true;
    } catch (e) {
      this.listeningActive = false;
      this.audioMeter.stop();
      callbacks.onError({
        type: 'unknown',
        message: e instanceof Error ? e.message : 'Could not initialize microphone.',
        recoverable: true,
      });
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.listeningActive) {
      try {
        this.recognition.stop();
      } catch {
        // Safe ignore
      }
      this.listeningActive = false;
    }
    this.audioMeter.stop();
  }

  speak(text: string, options?: VoiceSpeakOptions): void {
    if (!this.synth) {
      options?.onEnd?.();
      return;
    }

    // Immediately stop any prior speech
    this.stopSpeaking();

    // Sanitize message: strip markdown code blocks and symbols
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*_#`[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;

    // Pick suitable voice
    const voices = this.synth.getVoices();
    if (options?.voiceName) {
      const selected = voices.find((v) => v.name === options.voiceName);
      if (selected) utterance.voice = selected;
    } else {
      const natural = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Premium'))
      );
      if (natural) utterance.voice = natural;
    }

    utterance.onstart = () => {
      this.speakingActive = true;
      options?.onStart?.();
    };

    utterance.onend = () => {
      this.speakingActive = false;
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.speakingActive = false;
      options?.onError?.(new Error(`Speech synthesis error: ${e.error}`));
    };

    this.speakingActive = true;
    this.synth.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.synth) {
      this.synth.cancel();
      this.speakingActive = false;
    }
  }

  isSpeaking(): boolean {
    return this.speakingActive || (this.synth ? this.synth.speaking : false);
  }

  isListening(): boolean {
    return this.listeningActive;
  }
}
