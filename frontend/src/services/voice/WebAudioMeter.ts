/**
 * WebAudioMeter: Real-time microphone audio metering using Web Audio API.
 * Honestly differentiates between actual hardware audio metering and fallback states.
 */
export class WebAudioMeter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isMetering = false;

  /**
   * Start analyzing microphone audio levels.
   * @param onLevel Callback receiving normalized level (0.0 - 1.0) and whether it's actual hardware metering.
   */
  async start(onLevel: (level: number, isActualMetering: boolean) => void): Promise<boolean> {
    this.stop();

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onLevel(0, false);
      return false;
    }

    try {
      // Request audio stream for metering
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        onLevel(0, false);
        return false;
      }

      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;
      source.connect(this.analyser);

      this.isMetering = true;
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!this.isMetering || !this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average audio level across speech frequencies
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize between 0.0 and 1.0
        const normalized = Math.min(1.0, Math.max(0.0, average / 128.0));

        // Report real hardware audio level
        onLevel(normalized, true);

        this.animationFrameId = requestAnimationFrame(updateMeter);
      };

      updateMeter();
      return true;
    } catch (err) {
      console.warn('AudioContext metering unavailable:', err);
      // Explicitly notify that actual audio metering is not available
      onLevel(0, false);
      this.stop();
      return false;
    }
  }

  /**
   * Stop audio metering and release microphone device.
   */
  stop(): void {
    this.isMetering = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }
      this.audioContext = null;
    }

    this.analyser = null;
  }
}
