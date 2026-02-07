'use client';

import { useState, useRef, useEffect } from 'react';

type DemoState = 'idle' | 'recording' | 'processing' | 'done';

export default function VoiceDemo() {
  const [state, setState] = useState<DemoState>('idle');
  const [transcript, setTranscript] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setState('recording');
      setSeconds(0);
      
      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);

    } catch (err) {
      setError('Microphone access denied');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('processing');
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok && data.text) {
        setTranscript(data.text);
        setState('done');
      } else {
        throw new Error(data.error || 'Transcription failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to transcribe');
      setState('idle');
    }
  };

  const reset = () => {
    setState('idle');
    setTranscript('');
    setSeconds(0);
    setError('');
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gray-50 dark:bg-[#1a1a1e] rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Try it now</span>
          {state === 'recording' && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-500">RECORDING</span>
            </div>
          )}
        </div>

        {/* Main Button */}
        <div className="flex flex-col items-center">
          {state === 'idle' && (
            <button
              onClick={startRecording}
              className="w-24 h-24 rounded-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition-all flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105"
            >
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          )}

          {state === 'recording' && (
            <button
              onClick={stopRecording}
              className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 transition-all flex items-center justify-center shadow-lg animate-pulse"
            >
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
          )}

          {state === 'processing' && (
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          )}

          {state === 'done' && (
            <button
              onClick={reset}
              className="w-24 h-24 rounded-full bg-green-500 hover:bg-green-600 transition-all flex items-center justify-center shadow-lg"
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            </button>
          )}

          {/* Timer */}
          {state === 'recording' && (
            <p className="mt-4 text-2xl font-mono text-gray-900 dark:text-white">{formatTime(seconds)}</p>
          )}

          {/* Instructions */}
          {state === 'idle' && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Tap to start recording</p>
          )}
          {state === 'recording' && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Tap to stop</p>
          )}
          {state === 'processing' && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Transcribing...</p>
          )}
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="mt-6 p-4 bg-white dark:bg-[#0d0d0f] rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Your task:</p>
            <p className="text-gray-900 dark:text-white font-medium">{transcript}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
        )}

        {/* Reset */}
        {state === 'done' && (
          <button
            onClick={reset}
            className="mt-4 w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
