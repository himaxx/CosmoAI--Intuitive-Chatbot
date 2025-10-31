
import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: LiveSession is not an exported member of @google/genai.
import type { LiveServerMessage } from '@google/genai';
import { GoogleGenAI, Modality } from '@google/genai';
import { ConnectionState, ConversationTurn } from './types';
import { decode, decodeAudioData, createBlob } from './utils/audioUtils';

// FIX: Infer the LiveSession type since it's not exported from the library.
type LiveSession = Awaited<
  ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>
>;

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const sessionRef = useRef<LiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const cleanupSession = useCallback(() => {
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();

    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    sessionRef.current = null;
    
    setConnectionState(ConnectionState.IDLE);
    setIsSpeaking(false);
  }, []);

  const handleStop = useCallback(() => {
    if (sessionRef.current) {
      setConnectionState(ConnectionState.DISCONNECTING);
      sessionRef.current.close();
    } else {
      cleanupSession();
    }
  }, [cleanupSession]);
  
  const onMessageHandler = useCallback(async (message: LiveServerMessage) => {
    if (message.serverContent?.outputTranscription) {
      const text = message.serverContent.outputTranscription.text;
      setTranscript(prev => {
        const last = prev[prev.length - 1];
        if (last?.speaker === 'model') {
            return [...prev.slice(0, -1), { ...last, text: last.text + text }];
        }
        return [...prev, { speaker: 'model', text }];
      });
    }
    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      setTranscript(prev => {
        const last = prev[prev.length - 1];
        if (last?.speaker === 'user') {
            return [...prev.slice(0, -1), { ...last, text: last.text + text }];
        }
        return [...prev, { speaker: 'user', text }];
      });
    }

    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && outputAudioContextRef.current) {
      setIsSpeaking(true);
      const outputAudioContext = outputAudioContextRef.current;
      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);

      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1
      );

      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContext.destination);

      const currentSources = audioSourcesRef.current;
      source.addEventListener('ended', () => {
        currentSources.delete(source);
        if(currentSources.size === 0) {
            setIsSpeaking(false);
        }
      });
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      currentSources.add(source);
    }
    
    if(message.serverContent?.interrupted) {
        for (const source of audioSourcesRef.current.values()) {
          source.stop();
          audioSourcesRef.current.delete(source);
        }
        setIsSpeaking(false);
        nextStartTimeRef.current = 0;
    }

  }, []);

  const handleStart = useCallback(async () => {
    setConnectionState(ConnectionState.CONNECTING);
    setTranscript([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (!inputAudioContextRef.current) return;
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
            setConnectionState(ConnectionState.CONNECTED);
          },
          onmessage: onMessageHandler,
          onerror: (e: ErrorEvent) => {
            console.error('API Error:', e);
            alert(`An error occurred: ${e.message}. Please try again.`);
            cleanupSession();
          },
          onclose: (e: CloseEvent) => {
            cleanupSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'You are a futuristic AI entity named Cosmo, an expert on the cosmos, stars, and space exploration. Your voice is calm and synthesized. Your purpose is to provide fascinating and accurate knowledge about the universe in an engaging, conversational manner. Respond to queries with wonder and clarity.',
        },
      });
      
      sessionRef.current = await sessionPromise;

    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Could not start the session. Please ensure you have given microphone permissions.');
      setConnectionState(ConnectionState.IDLE);
    }
  }, [cleanupSession, onMessageHandler]);
  
  useEffect(() => {
    // @ts-ignore
    window.initParticles?.();
  }, []);

  useEffect(() => {
    return () => {
      handleStop();
    };
  }, [handleStop]);
  
  const handleOrbClick = () => {
    if (connectionState === ConnectionState.IDLE || connectionState === ConnectionState.DISCONNECTING) {
      handleStart();
    } else if (connectionState === ConnectionState.CONNECTED) {
      handleStop();
    }
  };

  const isListening = connectionState === ConnectionState.CONNECTED && !isSpeaking;

  let orbState = 'idle';
  if (connectionState === ConnectionState.CONNECTING) orbState = 'listening';
  if (isListening) orbState = 'listening';
  if (isSpeaking) orbState = 'speaking';

  const lastTurn = transcript.filter(t => t.text.trim() !== '').pop();
  const displayText =
    connectionState === ConnectionState.IDLE
      ? 'Tap the orb and ask about the cosmos'
      : (lastTurn?.text || 'Tell me about Neutron Stars.');


  let statusText = "";
  if (connectionState === ConnectionState.CONNECTING) statusText = "Connecting...";
  else if (isListening) statusText = "Listening...";
  else if (isSpeaking) statusText = "Speaking...";
  else if (connectionState === ConnectionState.DISCONNECTING) statusText = "Disconnecting...";

  return (
    <div className="relative flex h-screen w-full flex-col dark group/design-root overflow-hidden bg-background-dark">
      <div id="particles-js"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-background-dark/20 to-transparent"></div>
      <header className="relative z-10 flex items-center bg-transparent p-4 pb-2 justify-between">
        <div className="flex size-12 shrink-0 items-center justify-start">
          <span className="material-symbols-outlined text-white/80">menu</span>
        </div>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">CosmoAI</h2>
        <div className="flex w-12 items-center justify-end">
          <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-transparent text-white/80 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>
      <main className="relative z-10 flex flex-1 flex-col justify-center items-center px-4 pb-4 pt-0">
        <div className="flex flex-col items-center justify-center w-full flex-1 space-y-6">
          <div className="w-full max-w-2xl text-center flex-grow flex flex-col justify-end items-center pb-6 min-h-[120px]">
            <p className="text-2xl md:text-3xl font-medium leading-normal text-center glowing-text transition-all duration-500">
              {displayText}
            </p>
          </div>
          <div 
            className="relative w-full max-w-[300px] aspect-square flex items-center justify-center my-4 cursor-pointer"
            onClick={handleOrbClick}
            role="button"
            aria-label={connectionState === ConnectionState.IDLE ? "Start session" : "Stop session"}
            tabIndex={0}
            data-state={orbState}
          >
            <div className="orb w-full h-full rounded-full"></div>
          </div>
          <div className="w-full max-w-sm flex-grow flex flex-col justify-start pt-6 min-h-[120px]">
            {isListening && (
              <>
                <div className="waveform">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="waveform-bar"></div>
                  ))}
                </div>
                <p className="text-cyan-300/80 text-sm font-normal leading-normal text-center pt-4 animate-pulse">
                  Listening...
                </p>
              </>
            )}
            {!isListening && statusText && (
               <p className="text-cyan-300/80 text-sm font-normal leading-normal text-center pt-4">
                  {statusText}
                </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;