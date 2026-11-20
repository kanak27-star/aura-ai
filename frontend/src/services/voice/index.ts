import { DeepgramVoiceAgent } from './DeepgramVoiceAgentStub';
import { IVoiceAgent } from './types';
import { WebSpeechVoiceAgent } from './WebSpeechVoiceAgent';

export * from './types';
export * from './WebAudioMeter';
export * from './WebSpeechVoiceAgent';
export * from './DeepgramVoiceAgentStub';

// Active voice agent instance (defaults to WebSpeechVoiceAgent, easily swapped to Deepgram)
export const activeVoiceAgent: IVoiceAgent = new WebSpeechVoiceAgent();
export const deepgramVoiceAgentStub = new DeepgramVoiceAgent();
