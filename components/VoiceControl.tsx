import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { interpretCommand } from '../services/geminiService';
import { RemoteKey } from '../types';

interface VoiceControlProps {
  onCommand: (key: RemoteKey) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ onCommand, onClose, isOpen }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const processWithGemini = async (text: string) => {
    setStatus("processing");
    const result = await interpretCommand(text);
    
    if (result.action) {
      setStatus("success");
      const repeat = result.repeat || 1;
      
      // Execute command(s)
      for (let i = 0; i < repeat; i++) {
        onCommand(result.action);
        // Small delay between repeats
        if (repeat > 1) await new Promise(r => setTimeout(r, 300));
      }
      
      // Auto close after success
      setTimeout(() => {
        onClose();
        setStatus("idle");
        setTranscript("");
        setErrorMessage("");
      }, 1500);
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;

    // @ts-ignore
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorMessage("Not supported in this browser.");
      setStatus("error");
      return;
    }

    try {
      // Abort any existing instance
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("listening");
        setErrorMessage("");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        processWithGemini(text);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          setStatus("error");
          setErrorMessage("Microphone access denied. Check permissions.");
        } else if (event.error === 'no-speech') {
          setStatus("idle");
          setErrorMessage("");
        } else {
          setStatus("error");
          setErrorMessage("Voice recognition failed.");
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setStatus("error");
      setErrorMessage("Could not start microphone.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setTranscript("");
      startListening();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center gap-6">
        
        <h3 className="text-xl font-semibold text-white">Gemini Voice Command</h3>
        
        <div className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-colors duration-500 ${isListening ? 'bg-red-500/20' : 'bg-gray-800'}`}>
          {isListening && <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-50"></div>}
          <button 
            onClick={toggleListening}
            className={`z-10 w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg ${isListening ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>

        <div className="text-center min-h-[3rem] w-full">
          {status === 'listening' && <p className="text-gray-400 animate-pulse">Listening...</p>}
          {status === 'processing' && <p className="text-yellow-400 animate-pulse">Consulting Gemini...</p>}
          {status === 'success' && <p className="text-green-400">Command Recognized!</p>}
          {status === 'error' && <p className="text-red-400 font-medium">{errorMessage || "Could not understand."}</p>}
          {status === 'idle' && !errorMessage && <p className="text-gray-500 text-sm">Tap mic to speak</p>}
          
          {transcript && <p className="text-white mt-2 italic text-lg font-light">"{transcript}"</p>}
        </div>

        <Button variant="ghost" onClick={onClose} className="w-full">Cancel</Button>
      </div>
    </div>
  );
};