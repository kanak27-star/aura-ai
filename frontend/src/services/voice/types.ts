export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export type MicPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface VoiceCapabilities {
  speechRecognitionSupported: boolean;
  speechSynthesisSupported: boolean;
  audioMeteringSupported: boolean;
  browserName: string;
  isFirefox: boolean;
  permissionState: MicPermissionState;
}

export type VoiceErrorType =
  | 'permission_denied'
  | 'not_supported'
  | 'no_speech'
  | 'network'
  | 'aborted'
  | 'audio_capture'
  | 'unknown';

export interface VoiceError {
  type: VoiceErrorType;
  message: string;
  recoverable: boolean;
  details?: string;
}

export interface VoiceRecognitionCallbacks {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onAudioLevel?: (level: number, isActualMetering: boolean) => void;
  onError: (error: VoiceError) => void;
  onEnd: () => void;
  onStart?: () => void;
}

export interface VoiceSpeakOptions {
  rate?: number;
  pitch?: number;
  voiceName?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Pluggable Voice Agent Interface.
 * Allows swapping between browser Web Speech API and streaming Deepgram WebSocket agent seamlessly.
 */
export interface IVoiceAgent {
  readonly id: string;
  readonly name: string;
  getCapabilities(): Promise<VoiceCapabilities>;
  startListening(callbacks: VoiceRecognitionCallbacks): Promise<boolean>;
  stopListening(): void;
  speak(text: string, options?: VoiceSpeakOptions): void;
  stopSpeaking(): void;
  isSpeaking(): boolean;
  isListening(): boolean;
}
