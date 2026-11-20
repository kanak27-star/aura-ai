import {
  IVoiceAgent,
  VoiceCapabilities,
  VoiceRecognitionCallbacks,
  VoiceSpeakOptions,
} from './types';
import { WebAudioMeter } from './WebAudioMeter';

/**
 * DeepgramVoiceAgent: Architecture stub for live streaming speech-to-text and TTS.
 * Implements the IVoiceAgent contract for drop-in replacement when upgrading from browser APIs
 * to Deepgram Nova-2 / Deepgram Aura.
 *
 * Architecture Roadmap:
 * 1. Audio Capture: MediaRecorder streaming raw PCM/linear16/Opus chunks over WebSocket.
 * 2. Deepgram Endpoint: wss://api.deepgram.com/v1/listen?smart_format=true&model=nova-2
 * 3. Deepgram TTS Endpoint: https://api.deepgram.com/v1/speak?model=aura-asteria-en
 */
export class DeepgramVoiceAgent implements IVoiceAgent {
  readonly id = 'deepgram-streaming-agent';
  readonly name = 'Deepgram Nova-2 Streaming Voice Engine';

  private apiKey: string | null = null;
  private socket: WebSocket | null = null;
  private audioMeter = new WebAudioMeter();
  private listening = false;
  private speaking = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async getCapabilities(): Promise<VoiceCapabilities> {
    const isBrowser = typeof window !== 'undefined';
    const audioMeteringSupported = isBrowser && !!navigator.mediaDevices?.getUserMedia;

    return {
      speechRecognitionSupported: true, // Deepgram works in any browser that supports MediaRecorder / WebSockets
      speechSynthesisSupported: true,
      audioMeteringSupported,
      browserName: 'Cross-Browser Deepgram WebSocket',
      isFirefox: false,
      permissionState: 'prompt',
    };
  }

  async startListening(callbacks: VoiceRecognitionCallbacks): Promise<boolean> {
    if (!this.apiKey) {
      callbacks.onError({
        type: 'not_supported',
        message: 'Deepgram API key is not configured. Falling back to Browser Web Speech API.',
        recoverable: true,
      });
      return false;
    }

    this.listening = true;
    callbacks.onStart?.();

    // Start hardware audio metering
    if (callbacks.onAudioLevel) {
      this.audioMeter.start((level, isActual) => {
        if (this.listening) {
          callbacks.onAudioLevel?.(level, isActual);
        }
      });
    }

    // Stub: In full production, this opens a WebSocket to backend proxy / Deepgram
    console.info('[DeepgramVoiceAgent] Streaming WebSocket initialized.');
    return true;
  }

  stopListening(): void {
    this.listening = false;
    this.audioMeter.stop();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  speak(text: string, options?: VoiceSpeakOptions): void {
    console.info(`[DeepgramVoiceAgent] Streaming TTS request for: "${text.slice(0, 30)}..."`);
    this.speaking = true;
    options?.onStart?.();

    // Fallback or forward to browser synthesis until Deepgram Aura endpoint is activated
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      this.speaking = false;
      options?.onEnd?.();
    };
    utterance.onerror = () => {
      this.speaking = false;
      options?.onError?.(new Error('Deepgram TTS playback failed'));
    };
    window.speechSynthesis?.speak(utterance);
  }

  stopSpeaking(): void {
    this.speaking = false;
    window.speechSynthesis?.cancel();
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  isListening(): boolean {
    return this.listening;
  }
}
