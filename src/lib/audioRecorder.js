/**
 * Audio recording utility.
 * Captures mic audio and yields blobs at configurable intervals.
 */

export class AudioRecorder {
  constructor({ onAudioChunk, intervalMs = 30000 }) {
    this.onAudioChunk = onAudioChunk;
    this.intervalMs = intervalMs;
    this.mediaRecorder = null;
    this.stream = null;
    this.intervalId = null;
    this.isRecording = false;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
    } catch (err) {
      throw new Error('Microphone access denied. Please allow mic access and try again.');
    }

    // Determine best supported format
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.isRecording = true;
    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      // handled per-flush
    };

    this.mediaRecorder.start();

    // Flush audio every interval
    this.intervalId = setInterval(() => this.flush(), this.intervalMs);
  }

  async flush() {
    if (!this.isRecording || !this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;

    return new Promise((resolve) => {
      // Stop triggers ondataavailable for remaining data
      this.mediaRecorder.onstop = () => {
        if (this.chunks.length > 0) {
          const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
          this.chunks = [];
          this.onAudioChunk(blob);
        }
        // Restart recording
        if (this.isRecording) {
          this.mediaRecorder.start();
        }
        resolve();
      };
      this.mediaRecorder.stop();
    });
  }

  stop() {
    this.isRecording = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    // Return any remaining audio
    if (this.chunks.length > 0) {
      const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
      this.chunks = [];
      this.onAudioChunk(blob);
    }
  }

  updateInterval(newMs) {
    this.intervalMs = newMs;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.flush(), this.intervalMs);
    }
  }
}
