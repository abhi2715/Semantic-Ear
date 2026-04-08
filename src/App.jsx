import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeText, generateSummary, getRelativeTime, tokenizeText } from './nlpService';
import { loadMemories, saveMemories, clearAllMemories } from './memoryStore';
import { searchMemories } from './searchService';
import { generateChatResponse } from './chatService';

// ─── Speech Recognition Hook ────────────────────────────────────────────────

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);

  // accumulatedTextRef: persists finalized text ACROSS recognition restarts.
  // When the browser auto-stops and restarts recognition (continuous mode),
  // event.results resets. This ref keeps all previously finalized text.
  const accumulatedTextRef = useRef('');

  // sessionFinalsRef: finalized text from the CURRENT recognition session only.
  const sessionFinalsRef = useRef('');

  // interimRef: current interim (in-progress) text
  const interimRef = useRef('');

  useEffect(() => {
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let sessionFinals = '';
      let currentInterim = '';

      // Process ALL results in the current session
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          sessionFinals += result[0].transcript + ' ';
        } else {
          currentInterim += result[0].transcript;
        }
      }

      sessionFinalsRef.current = sessionFinals.trim();
      interimRef.current = currentInterim;

      // Full transcript = accumulated from previous sessions + current session finals
      const fullFinal = (accumulatedTextRef.current + ' ' + sessionFinalsRef.current).trim();
      setTranscript(fullFinal);
      setInterimTranscript(currentInterim);

      console.log('[SemanticEar] onresult — accumulated:', accumulatedTextRef.current,
        '| session finals:', sessionFinalsRef.current,
        '| interim:', currentInterim);
    };

    recognition.onerror = (event) => {
      console.warn('[SemanticEar] error:', event.error);
      if (event.error === 'not-allowed') {
        setIsSupported(false);
      }
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setIsListening(false);
        shouldRestartRef.current = false;
      }
    };

    recognition.onend = () => {
      console.log('[SemanticEar] onend — shouldRestart:', shouldRestartRef.current);
      if (shouldRestartRef.current) {
        // Browser auto-stopped. Accumulate finalized text from this session
        // before restarting so it's not lost when event.results resets.
        if (sessionFinalsRef.current) {
          accumulatedTextRef.current = (accumulatedTextRef.current + ' ' + sessionFinalsRef.current).trim();
          sessionFinalsRef.current = '';
          console.log('[SemanticEar] Accumulated before restart:', accumulatedTextRef.current);
        }
        try {
          recognition.start();
        } catch (e) {
          console.warn('[SemanticEar] Failed to restart:', e);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      try { recognition.stop(); } catch (e) { /* ok */ }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) return;

    // Reset everything for a fresh recording session
    accumulatedTextRef.current = '';
    sessionFinalsRef.current = '';
    interimRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    shouldRestartRef.current = true;

    try {
      recognitionRef.current.start();
      setIsListening(true);
      console.log('[SemanticEar] Started listening');
    } catch (e) {
      setIsListening(true);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    console.log('[SemanticEar] stopListening called');
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ok */ }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Returns the FULL transcript: accumulated + current session finals + interim
  const getFullTranscript = useCallback(() => {
    const accumulated = accumulatedTextRef.current || '';
    const sessionFinals = sessionFinalsRef.current || '';
    const interim = interimRef.current || '';
    const full = (accumulated + ' ' + sessionFinals + ' ' + interim).trim();
    console.log('[SemanticEar] getFullTranscript:', { accumulated, sessionFinals, interim, full });
    return full;
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    setTranscript,
    getFullTranscript
  };
}

// ─── Audio Visualizer Hook (real microphone waveform) ────────────────────────

function useAudioAnalyser(isListening) {
  const [waveformData, setWaveformData] = useState(new Array(32).fill(0));
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isListening) {
      // Cleanup
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setWaveformData(new Array(32).fill(0));
      setIsVoiceActive(false);
      return;
    }

    let mounted = true;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!mounted) return;
          analyser.getByteFrequencyData(dataArray);

          // Normalize to 0-100 range
          const normalized = Array.from(dataArray).map(v => (v / 255) * 100);
          setWaveformData(normalized);

          // Detect voice activity (if average energy is above threshold)
          const avg = normalized.reduce((a, b) => a + b, 0) / normalized.length;
          setIsVoiceActive(avg > 8);

          animationRef.current = requestAnimationFrame(tick);
        };

        tick();
      } catch (err) {
        console.warn('Could not access microphone for visualizer:', err);
      }
    }

    setup();

    return () => {
      mounted = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [isListening]);

  return { waveformData, isVoiceActive };
}

// ─── UI Components ───────────────────────────────────────────────────────────

const CustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseOver = (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' ||
        e.target.closest('button') || e.target.closest('a')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <>
      <motion.div
        className="fixed pointer-events-none z-50 mix-blend-difference"
        animate={{
          x: mousePosition.x - 20,
          y: mousePosition.y - 20,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 200, mass: 0.5 }}
      >
        <div
          className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${isHovering ? 'border-pink-300 scale-150' : 'border-purple-300'
            } ${isClicking ? 'scale-75' : 'scale-100'}`}
          style={{
            boxShadow: isHovering
              ? '0 0 30px rgba(255, 182, 255, 0.6)'
              : '0 0 20px rgba(200, 180, 255, 0.4)'
          }}
        />
      </motion.div>
      <motion.div
        className="fixed pointer-events-none z-50"
        animate={{
          x: mousePosition.x - 4,
          y: mousePosition.y - 4,
        }}
        transition={{ type: "spring", damping: 50, stiffness: 500, mass: 0.1 }}
      >
        <div
          className={`w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 transition-all duration-150 ${isClicking ? 'scale-150' : 'scale-100'
            }`}
          style={{ boxShadow: '0 0 15px rgba(255, 182, 255, 0.8)' }}
        />
      </motion.div>
    </>
  );
};

const FloatingBlobs = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-pink-200/30 to-purple-200/30 blur-3xl"
        animate={{ x: [0, 100, 0], y: [0, -100, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{ top: '10%', left: '10%' }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full bg-gradient-to-br from-blue-200/30 to-pink-200/30 blur-3xl"
        animate={{ x: [0, -80, 0], y: [0, 100, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{ top: '60%', right: '10%' }}
      />
      <motion.div
        className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-purple-200/30 to-blue-200/30 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, -80, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{ bottom: '10%', left: '50%' }}
      />
    </div>
  );
};

const Hero = ({ onStartListening, isSupported }) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <FloatingBlobs />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="text-8xl md:text-9xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: '1.1' }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          >
            Semantic Ear
          </motion.h1>

          <motion.p
            className="text-2xl md:text-3xl text-gray-600 mb-12 font-light"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Your AI that listens, remembers, and understands
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <button onClick={onStartListening} className="group relative">
              <motion.div
                className="absolute -inset-4 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative w-32 h-32 bg-white rounded-full shadow-2xl flex items-center justify-center backdrop-blur-sm border border-white/50">
                <svg className="w-12 h-12 text-purple-500 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
          </motion.div>

          <motion.p
            className="mt-6 text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {isSupported
              ? 'Click to start listening & create memories'
              : '⚠️ Speech recognition requires Chrome or Edge browser'}
          </motion.p>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.div>
    </div>
  );
};

const VoiceInput = ({ isListening, onStop, transcript, interimTranscript, waveformData, isVoiceActive }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (isListening) {
      const durationInterval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(durationInterval);
    } else {
      setDuration(0);
    }
  }, [isListening]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Take 16 bars from the waveformData for display
  const displayBars = waveformData.slice(0, 16);
  const fullTranscript = ((transcript || '') + ' ' + (interimTranscript || '')).trim();

  return (
    <AnimatePresence>
      {isListening && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onStop}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="relative z-10"
          >
            <motion.div className="w-[420px] max-w-[90vw] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">
              <div className="flex flex-col items-center">
                {/* Mic icon with pulse */}
                <motion.div
                  animate={{
                    scale: isVoiceActive ? [1, 1.1, 1] : 1,
                    boxShadow: isVoiceActive
                      ? ['0 0 0 0 rgba(168,85,247,0.4)', '0 0 0 20px rgba(168,85,247,0)', '0 0 0 0 rgba(168,85,247,0)']
                      : '0 0 0 0 rgba(168,85,247,0)'
                  }}
                  transition={{ duration: 1, repeat: isVoiceActive ? Infinity : 0 }}
                  className={`w-20 h-20 rounded-full bg-gradient-to-br ${isVoiceActive ? 'from-pink-400 to-purple-500' : 'from-gray-300 to-gray-400'
                    } flex items-center justify-center mb-4 transition-colors duration-300`}
                >
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </motion.div>

                {/* Status */}
                <div className="flex items-center gap-2 mb-1">
                  <motion.div
                    animate={{
                      scale: isVoiceActive ? [1, 1.3, 1] : 1,
                      opacity: isVoiceActive ? [0.5, 1, 0.5] : 0.3,
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-green-500' : 'bg-gray-400'}`}
                  />
                  <p className="text-lg font-semibold text-gray-700">
                    {isVoiceActive ? 'Voice Detected' : 'Listening...'}
                  </p>
                </div>

                <p className="text-xs text-purple-600 font-mono mb-4">{formatDuration(duration)}</p>

                {/* Real audio waveform */}
                <div className="flex gap-[3px] mb-4 h-16 items-center w-full justify-center">
                  {displayBars.map((value, i) => (
                    <motion.div
                      key={i}
                      className={`w-[6px] rounded-full ${isVoiceActive
                        ? 'bg-gradient-to-t from-pink-400 to-purple-400'
                        : 'bg-gray-300'
                        }`}
                      animate={{ height: Math.max(4, value * 0.6) }}
                      transition={{ duration: 0.05 }}
                    />
                  ))}
                </div>

                {/* Live transcript */}
                <div className="w-full bg-gray-50/80 rounded-2xl p-4 mb-5 min-h-[80px] max-h-[160px] overflow-y-auto border border-gray-100">
                  {fullTranscript ? (
                    <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {transcript}
                      {interimTranscript && (
                        <span className="text-gray-400 italic"> {interimTranscript}</span>
                      )}
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-0.5 h-4 bg-purple-400 ml-1 align-text-bottom"
                      />
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Start speaking — your words will appear here...
                    </p>
                  )}
                </div>

                <button
                  onClick={onStop}
                  className="w-full px-6 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-2xl font-semibold hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  Stop & Save Memory
                </button>

                <p className="text-xs text-gray-400 mt-3">Click to save what you&apos;ve said</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Toast Notification ──────────────────────────────────────────────────────

const Toast = ({ toast }) => {
  if (!toast) return null;
  const bgColor = toast.type === 'warning'
    ? 'from-yellow-400 to-orange-400'
    : 'from-pink-400 to-purple-400';

  return (
    <AnimatePresence>
      <motion.div
        key={toast.id}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
      >
        <div className={`px-6 py-3 bg-gradient-to-r ${bgColor} text-white rounded-2xl shadow-2xl font-medium flex items-center gap-2`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <span>{toast.message}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Memory Card ─────────────────────────────────────────────────────────────

const MemoryCard = ({ memory, index, onDelete }) => {
  const getCategoryColor = (category) => {
    const colors = {
      food: 'from-pink-200 to-pink-300',
      meeting: 'from-purple-200 to-purple-300',
      work: 'from-indigo-200 to-indigo-300',
      reminder: 'from-blue-200 to-blue-300',
      moment: 'from-yellow-200 to-yellow-300',
      discovery: 'from-green-200 to-green-300',
      achievement: 'from-orange-200 to-orange-300',
      fitness: 'from-emerald-200 to-emerald-300',
      personal: 'from-rose-200 to-rose-300',
      travel: 'from-cyan-200 to-cyan-300',
      learning: 'from-violet-200 to-violet-300',
      general: 'from-gray-200 to-gray-300',
    };
    return colors[category] || 'from-gray-200 to-gray-300';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      food: '🍽️', meeting: '📋', work: '💼', reminder: '📌',
      moment: '✨', discovery: '🔍', achievement: '🏆', fitness: '💪',
      personal: '❤️', travel: '✈️', learning: '📚', general: '💭'
    };
    return icons[category] || '💭';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ scale: 1.03, y: -5 }}
      className="group"
    >
      <div className="relative bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/50 hover:shadow-2xl transition-all duration-300">
        <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor(memory.category)} opacity-0 group-hover:opacity-20 rounded-3xl transition-opacity duration-300`} />

        <button
          onClick={() => onDelete(memory.id)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
          title="Delete memory"
        >
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{getCategoryIcon(memory.category)}</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100/80 text-purple-700 capitalize">
              {memory.category}
            </span>
            <span className="text-xs text-gray-400 ml-auto">{getRelativeTime(memory.timestamp)}</span>
          </div>

          {memory.summary && (
            <p className="text-xs text-purple-500 italic mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {memory.summary}
            </p>
          )}

          <p className="text-gray-700 leading-relaxed mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {memory.text}
          </p>

          <div className="flex gap-1.5 flex-wrap">
            {memory.tags.map(tag => (
              <span
                key={tag}
                className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-600 border border-purple-100"
              >
                #{tag}
              </span>
            ))}
          </div>

          <motion.div
            className="absolute -bottom-1 left-0 h-1 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full"
            initial={{ width: 0 }}
            whileHover={{ width: '100%' }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

const SearchBar = ({ onSearch, searchResults, onClearSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    onClearSearch();
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-16">
      <motion.form
        onSubmit={handleSearch}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your memories... e.g. 'pizza', 'meeting', 'gym'"
            className="w-full px-8 py-6 text-lg rounded-3xl bg-white/70 backdrop-blur-xl border-2 border-white/50 focus:border-purple-300 focus:outline-none shadow-lg transition-all"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-2">
            {(searchResults !== null) && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-3 bg-gray-200 text-gray-600 rounded-2xl font-medium hover:bg-gray-300 transition-all text-sm"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-2xl font-medium hover:shadow-lg transition-all hover:scale-105"
            >
              Search
            </button>
          </div>
        </div>
      </motion.form>

      <AnimatePresence>
        {searchResults !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mt-6 space-y-4"
          >
            {searchResults.length > 0 ? (
              <>
                <p className="text-sm text-gray-500 text-center mb-2">
                  Found <span className="font-semibold text-purple-600">{searchResults.length}</span> matching
                  {searchResults.length === 1 ? ' memory' : ' memories'}
                </p>
                {searchResults.map(({ memory, score }, i) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-6 shadow-lg border border-white/50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {i === 0 && (
                        <>
                          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-xs font-semibold text-purple-700">Best Match</span>
                        </>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">relevance: {score}</span>
                    </div>
                    <p className="text-gray-800 mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {memory.text}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {memory.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-white/80 text-purple-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 bg-white/50 backdrop-blur-xl rounded-3xl border border-white/50"
              >
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-600 font-medium">No matching memories found</p>
                <p className="text-gray-400 text-sm mt-1">Try different keywords or check your spelling</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Timeline = ({ memories, onDelete }) => {
  return (
    <div className="max-w-4xl mx-auto px-4">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-5xl font-bold mb-16 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Memory Timeline
      </motion.h2>

      {memories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-6xl mb-4">🎙️</p>
          <p className="text-xl text-gray-500">No memories yet. Start listening to create your first memory!</p>
        </motion.div>
      ) : (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-300 via-purple-300 to-blue-300" />

          {memories.map((memory, index) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="relative pl-20 pb-12 group"
            >
              <motion.div
                className="absolute left-6 w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 shadow-lg"
                whileHover={{ scale: 1.5 }}
              />

              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/50 hover:shadow-2xl transition-all">
                <button
                  onClick={() => onDelete(memory.id)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                  title="Delete memory"
                >
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center justify-between mb-3 pr-8">
                  <span className="text-sm font-semibold text-purple-600">{getRelativeTime(memory.timestamp)}</span>
                  <div className="flex gap-1.5">
                    {memory.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-gray-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {memory.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const AnimatedCounter = ({ target, duration = 2 }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const increment = target / (duration * 60);
          const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 1000 / 60);
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return <span ref={ref}>{count}</span>;
};

const InsightsPanel = ({ memories }) => {
  // Compute real stats from actual memories
  const categoryCount = {};
  const tagFrequency = {};
  const allPeople = {};
  const allPlaces = {};
  const allVerbs = {};
  let totalWords = 0;

  memories.forEach(m => {
    categoryCount[m.category] = (categoryCount[m.category] || 0) + 1;
    totalWords += (m.text || '').split(/\s+/).filter(Boolean).length;

    (m.tags || []).forEach(tag => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });

    if (m.entities) {
      (m.entities.people || []).forEach(p => { allPeople[p] = (allPeople[p] || 0) + 1; });
      (m.entities.places || []).forEach(p => { allPlaces[p] = (allPlaces[p] || 0) + 1; });
      (m.entities.verbs || []).forEach(v => { allVerbs[v] = (allVerbs[v] || 0) + 1; });
    }
  });

  const topCategory = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)[0];

  // Calculate unique active days
  const uniqueDays = new Set(
    memories.map(m => new Date(m.timestamp).toDateString())
  );

  // Top tags sorted by frequency
  const topTags = Object.entries(tagFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);
  const maxTagCount = topTags.length > 0 ? topTags[0][1] : 1;

  // Top entities
  const topPeople = Object.entries(allPeople).sort(([, a], [, b]) => b - a).slice(0, 5);
  const topPlaces = Object.entries(allPlaces).sort(([, a], [, b]) => b - a).slice(0, 5);
  const topVerbs = Object.entries(allVerbs).sort(([, a], [, b]) => b - a).slice(0, 5);

  const avgWords = memories.length > 0 ? Math.round(totalWords / memories.length) : 0;

  const insights = [
    {
      title: 'Total Memories',
      value: memories.length,
      suffix: '',
      icon: '🧠',
      color: 'from-purple-400 to-indigo-400',
      isNumber: true
    },
    {
      title: 'Total Words',
      value: totalWords,
      suffix: '',
      icon: '📝',
      color: 'from-emerald-400 to-teal-400',
      isNumber: true
    },
    {
      title: 'Avg. Words/Memory',
      value: avgWords,
      suffix: '',
      icon: '📏',
      color: 'from-blue-400 to-cyan-400',
      isNumber: true
    },
    {
      title: 'Active Days',
      value: uniqueDays.size,
      suffix: uniqueDays.size === 1 ? ' day' : ' days',
      icon: '📅',
      color: 'from-sky-400 to-blue-400',
      isNumber: true
    },
    {
      title: 'Categories Used',
      value: Object.keys(categoryCount).length,
      suffix: '',
      icon: '🏷️',
      color: 'from-pink-400 to-rose-400',
      isNumber: true
    },
    {
      title: 'Top Category',
      value: topCategory ? `${topCategory[0]} (${topCategory[1]})` : 'None yet',
      suffix: '',
      icon: '⭐',
      color: 'from-yellow-400 to-orange-400',
      isNumber: false
    }
  ];

  const entitySection = (title, icon, items) => {
    if (items.length === 0) return null;
    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
          <span>{icon}</span> {title}
        </h4>
        <div className="flex flex-wrap gap-2">
          {items.map(([name, count]) => (
            <span
              key={name}
              className="px-3 py-1 text-xs font-medium rounded-full bg-white/80 text-gray-700 border border-gray-200 shadow-sm"
            >
              {name} <span className="text-purple-500 font-bold">×{count}</span>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 mb-20">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-5xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Smart Insights
      </motion.h2>

      {memories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-5xl mb-4">📊</p>
          <p className="text-lg text-gray-500">Create some memories to see your insights!</p>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {insights.map((insight, index) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative group"
              >
                <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/50 hover:shadow-2xl transition-all">
                  <div className={`absolute inset-0 bg-gradient-to-br ${insight.color} opacity-0 group-hover:opacity-20 rounded-3xl transition-opacity`} />

                  <div className="relative">
                    <div className="text-3xl mb-2">{insight.icon}</div>
                    <h3 className="text-xs font-medium text-gray-500 mb-1">{insight.title}</h3>
                    <p className="text-xl font-bold text-gray-800 capitalize" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {insight.isNumber ? (
                        <>
                          <AnimatedCounter target={insight.value} />
                          {insight.suffix}
                        </>
                      ) : (
                        insight.value
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tag Cloud */}
          {topTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/60 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-white/50"
            >
              <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                🏷️ Tag Cloud
              </h3>
              <div className="flex flex-wrap gap-2 items-center justify-center">
                {topTags.map(([tag, count]) => {
                  const scale = 0.7 + (count / maxTagCount) * 0.8;
                  const opacity = 0.5 + (count / maxTagCount) * 0.5;
                  return (
                    <motion.span
                      key={tag}
                      whileHover={{ scale: 1.2 }}
                      className="px-3 py-1 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 font-medium border border-purple-200/50 cursor-default"
                      style={{
                        fontSize: `${scale}rem`,
                        opacity,
                        fontFamily: "'DM Sans', sans-serif"
                      }}
                    >
                      #{tag}
                      <span className="text-xs text-purple-400 ml-1">({count})</span>
                    </motion.span>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Entity Breakdown */}
          {(topPeople.length > 0 || topPlaces.length > 0 || topVerbs.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/60 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-white/50"
            >
              <h3 className="text-lg font-bold text-gray-700 mb-5 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                🔬 Entity Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {entitySection('People Mentioned', '👤', topPeople)}
                {entitySection('Places', '📍', topPlaces)}
                {entitySection('Key Actions', '⚡', topVerbs)}
              </div>
            </motion.div>
          )}

          {/* Under the Hood — NLP Pipeline Preview */}
          {memories.length > 0 && (() => {
            const latest = memories[0];
            const tokens = tokenizeText(latest.text);
            if (tokens.length === 0) return null;

            const posColors = {
              noun: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' },
              verb: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
              person: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-400' },
              place: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
              adj: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-400' },
              adv: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
              det: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-300' },
              pron: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-300' },
              prep: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-300' },
              conj: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-300' },
              word: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-300' },
            };

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white/60 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-white/50"
              >
                <h3 className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  🧪 Under the Hood
                </h3>
                <p className="text-xs text-gray-400 mb-4">How our NLP engine tokenizes your latest memory</p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {tokens.map((token, i) => {
                    const colors = posColors[token.pos] || posColors.word;
                    const changed = token.text.toLowerCase() !== token.root;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.04 }}
                        whileHover={{ scale: 1.1, y: -2 }}
                        className={`relative flex flex-col items-center px-3 py-1.5 rounded-xl border ${colors.bg} ${colors.border} cursor-default`}
                      >
                        <span className={`text-sm font-semibold ${colors.text}`}>
                          {token.text}
                        </span>
                        {changed && (
                          <span className="text-[10px] text-gray-400 -mt-0.5">→ {token.root}</span>
                        )}
                        <span className={`absolute -top-1.5 -right-1.5 text-[8px] px-1.5 py-0.5 rounded-full ${colors.dot} text-white font-bold uppercase leading-none`}>
                          {token.tag}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-2 pt-3 border-t border-gray-100">
                  {[
                    { label: 'Noun', color: 'bg-blue-400' },
                    { label: 'Verb', color: 'bg-emerald-400' },
                    { label: 'Person', color: 'bg-pink-400' },
                    { label: 'Place', color: 'bg-orange-400' },
                    { label: 'Adj', color: 'bg-violet-400' },
                    { label: 'Other', color: 'bg-gray-300' },
                  ].map(item => (
                    <span key={item.label} className="flex items-center gap-1 text-[10px] text-gray-500">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
// ─── Chat Panel ─────────────────────────────────────────────────────────────

const ChatPanel = ({ memories }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: "Hey! 👋 I'm your memory assistant. Ask me anything about your memories — like \"What did I eat recently?\" or \"Summarize my week\".",
      relatedMemories: []
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg = { id: Date.now(), role: 'user', text, relatedMemories: [] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate a small delay for natural feel
    setTimeout(() => {
      const response = generateChatResponse(text, memories);
      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        text: response.text,
        relatedMemories: response.relatedMemories || []
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 400 + Math.random() * 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple markdown-like rendering for bold text and code
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
      }
      if (part === '\n') return <br key={i} />;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 mb-20">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-5xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Ask Your Memories
      </motion.h2>

      {/* Chat Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/50 flex flex-col"
        style={{ height: '500px' }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${msg.role === 'user'
                ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-2xl rounded-br-md'
                : 'bg-white/80 text-gray-700 rounded-2xl rounded-bl-md border border-gray-100'
                } px-5 py-3 shadow-sm`}>
                {msg.role === 'bot' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs">🤖</span>
                    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Memory Bot</span>
                  </div>
                )}
                <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-gray-700'}`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {renderText(msg.text)}
                </div>

                {/* Related memories preview */}
                {msg.relatedMemories && msg.relatedMemories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100/50 space-y-2">
                    {msg.relatedMemories.slice(0, 2).map((m) => (
                      <div key={m.id} className="bg-purple-50/80 rounded-xl px-3 py-2 text-xs text-gray-600">
                        <div className="font-medium text-purple-600 mb-0.5">{m.summary || m.category}</div>
                        <div className="truncate opacity-70">{m.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white/80 rounded-2xl rounded-bl-md px-5 py-3 border border-gray-100 shadow-sm">
                <div className="flex gap-1.5 items-center">
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/30">
          <div className="flex gap-3 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Try "What did I eat?" or "Summarize my memories"'
              className="flex-1 bg-white/70 rounded-2xl px-5 py-3 text-sm text-gray-700 placeholder-gray-400 border border-gray-200/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all cursor-text"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-gradient-to-r from-pink-400 to-purple-400 text-white p-3 rounded-2xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Suggested questions */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {[
          'Summarize my memories',
          'What did I eat?',
          'How many memories do I have?',
          'What categories do I have?'
        ].map(q => (
          <motion.button
            key={q}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setInput(q);
              inputRef.current?.focus();
            }}
            className="text-xs px-4 py-2 bg-white/60 backdrop-blur rounded-full text-purple-600 border border-purple-200/50 hover:bg-purple-50 transition-colors cursor-pointer"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {q}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [memories, setMemories] = useState(() => loadMemories());
  const [searchResults, setSearchResults] = useState(null);
  const [showContent, setShowContent] = useState(false);
  const [activeTab, setActiveTab] = useState('recent');
  const [toast, setToast] = useState(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    setTranscript,
    getFullTranscript
  } = useSpeechRecognition();

  const { waveformData, isVoiceActive } = useAudioAnalyser(isListening);

  // Show a toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Persist memories whenever they change
  useEffect(() => {
    saveMemories(memories);
  }, [memories]);

  // Show content section if there are saved memories
  useEffect(() => {
    if (memories.length > 0 && !showContent) {
      setShowContent(true);
    }
  }, [memories, showContent]);

  const handleStartListening = () => {
    if (!isSupported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    startListening();

    if (!showContent) {
      setShowContent(true);
      setTimeout(() => {
        const element = document.getElementById('content-section');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  const handleStopListening = () => {
    // Read the full transcript BEFORE stopping (refs are synchronous)
    const finalText = getFullTranscript();
    console.log('[SemanticEar] handleStopListening — finalText:', finalText);

    // Stop recognition
    stopListening();

    if (finalText && finalText.length > 0) {
      try {
        // Run NLP analysis on the spoken text
        const { tags, category, entities } = analyzeText(finalText);
        const summary = generateSummary(finalText, category, entities);

        const newMemory = {
          id: Date.now(),
          text: finalText,
          summary,
          tags,
          category,
          entities,
          timestamp: Date.now()
        };

        console.log('[SemanticEar] Saving memory:', newMemory);
        setMemories(prev => [newMemory, ...prev]);
        showToast(`✨ Memory saved — "${category}" with ${tags.length} tags`);
      } catch (err) {
        console.error('[SemanticEar] NLP error, saving raw memory:', err);
        // Fallback: save memory even if NLP fails
        const newMemory = {
          id: Date.now(),
          text: finalText,
          summary: '💭 ' + finalText.slice(0, 60) + (finalText.length > 60 ? '...' : ''),
          tags: ['unprocessed'],
          category: 'general',
          entities: {},
          timestamp: Date.now()
        };
        setMemories(prev => [newMemory, ...prev]);
        showToast('✨ Memory saved (raw)');
      }
    } else {
      showToast('No speech detected. Try again!', 'warning');
    }

    setTranscript('');

    if (!showContent) {
      setShowContent(true);
    }

    // Switch to recent tab so user sees the new memory
    setActiveTab('recent');

    setTimeout(() => {
      const element = document.getElementById('content-section');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  const handleDeleteMemory = (id) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    showToast('🗑️ Memory deleted');
  };

  const handleSearch = (query) => {
    const results = searchMemories(query, memories);
    setSearchResults(results);
  };

  const handleClearSearch = () => {
    setSearchResults(null);
  };

  const handleClearAllMemories = () => {
    if (window.confirm('Are you sure you want to delete ALL memories? This cannot be undone.')) {
      setMemories([]);
      clearAllMemories();
      showToast('All memories cleared');
    }
  };

  const handleExportMemories = () => {
    if (memories.length === 0) return;
    const data = JSON.stringify(memories, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `semantic-ear-memories-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📥 Memories exported!');
  };

  const tabs = [
    { id: 'recent', label: 'Recent Memories', icon: '🧠' },
    { id: 'chat', label: 'Ask Memory', icon: '💬' },
    { id: 'insights', label: 'Smart Insights', icon: '⚡' },
    { id: 'timeline', label: 'Memory Timeline', icon: '📅' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 cursor-none overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { cursor: none !important; }
        body { overflow-x: hidden; }
      `}</style>

      <CustomCursor />
      <VoiceInput
        isListening={isListening}
        onStop={handleStopListening}
        transcript={transcript}
        interimTranscript={interimTranscript}
        waveformData={waveformData}
        isVoiceActive={isVoiceActive}
      />

      <Hero onStartListening={handleStartListening} isSupported={isSupported} />

      <AnimatePresence>
        {showContent && (
          <motion.div
            id="content-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="py-20"
          >
            <div className="max-w-7xl mx-auto px-4">
              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-12 flex items-center justify-center gap-4 flex-wrap"
              >
                <button
                  onClick={handleStartListening}
                  className="group relative inline-block"
                  disabled={isListening}
                >
                  <div className="absolute -inset-2 bg-gradient-to-r from-pink-400 to-purple-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative px-8 py-4 bg-white rounded-2xl shadow-lg">
                    <span className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">
                      {isListening ? '🎙️ Listening...' : '🎙️ Add New Memory'}
                    </span>
                  </div>
                </button>

                {memories.length > 0 && (
                  <>
                    <button
                      onClick={handleExportMemories}
                      className="px-5 py-3 text-sm text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-2xl transition-all border border-transparent hover:border-purple-200"
                    >
                      📥 Download All
                    </button>
                    <button
                      onClick={handleClearAllMemories}
                      className="px-5 py-3 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-200"
                    >
                      Clear All Memories
                    </button>
                  </>
                )}
              </motion.div>

              <SearchBar onSearch={handleSearch} searchResults={searchResults} onClearSearch={handleClearSearch} />

              {/* Tab Navigation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center mb-12"
              >
                <div className="inline-flex bg-white/60 backdrop-blur-xl rounded-3xl p-2 shadow-lg border border-white/50">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-6 py-3 rounded-2xl font-medium transition-all ${activeTab === tab.id
                        ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'recent' && (
                  <motion.div
                    key="recent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.h2
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-5xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      Recent Memories
                    </motion.h2>

                    {memories.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                      >
                        <p className="text-6xl mb-4">🎧</p>
                        <p className="text-xl text-gray-500 mb-2">No memories yet</p>
                        <p className="text-gray-400">Click the microphone to start listening and create your first memory</p>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32">
                        {memories.map((memory, index) => (
                          <MemoryCard
                            key={memory.id}
                            memory={memory}
                            index={index}
                            onDelete={handleDeleteMemory}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'insights' && (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <InsightsPanel memories={memories} />
                  </motion.div>
                )}

                {activeTab === 'chat' && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChatPanel memories={memories} />
                  </motion.div>
                )}

                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Timeline memories={memories} onDelete={handleDeleteMemory} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast toast={toast} />

      <footer className="py-12 text-center text-gray-500">
        <p style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Made with 💜 by Semantic Ear
        </p>
      </footer>
    </div>
  );
}
