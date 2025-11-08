import React, { useState, useCallback, useRef, useEffect } from 'react';
import { HackathonIdea } from './types';
import { generateIdeas } from './services/geminiService';
import { textToSpeech } from './services/elevenLabsService';
import Header from './components/Header';
import IdeaCard from './components/IdeaCard';
import LoadingSpinner from './components/LoadingSpinner';

// Fix for Web Speech API types not being available in default TypeScript lib
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

const initialHackathonRules = `Your mission: build an AI-powered app that’s original, useful, or delightfully weird. Whether you create a voice agent, productivity tool, creative assistant, or something no one expects — we want to see what you can ship.

Brought to you by LiquidMetal AI, in partnership with Vultr, Cerebras, ElevenLabs, Netlify, WorkOS, Stripe, Searchable and Cloudflare, this hackathon celebrates imagination, speed, and technical execution.

Core Requirements:
- Working AI application built on Raindrop Platform (via Raindrop MCP Server)
- Must use an AI coding assistant (Claude Code or Gemini CLI) to build on Raindrop
- Must integrate at least one of the Vultr services 
- For Voice Agent Category ONLY: Must integrate with ElevenLabs`;

const App: React.FC = () => {
  const [rules, setRules] = useState<string>(initialHackathonRules);
  const [ideas, setIdeas] = useState<HackathonIdea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isFetchingAudio, setIsFetchingAudio] = useState<boolean>(false);
  const [speechApiSupported, setSpeechApiSupported] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load ideas from local storage on initial render
  useEffect(() => {
    try {
      const savedIdeas = localStorage.getItem('hackathonIdeas');
      if (savedIdeas) {
        setIdeas(JSON.parse(savedIdeas));
        setSaved(true);
      }
    } catch (error) {
      console.error("Failed to load ideas from local storage:", error);
      // If parsing fails, remove the corrupted item
      localStorage.removeItem('hackathonIdeas');
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    // Fix: Rename to avoid shadowing the SpeechRecognition interface type
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechApiSupported(true);
      // Fix: Add type annotation
      const recognition: SpeechRecognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        setRules((prevRules) => (prevRules.trim() ? prevRules + ' ' : '') + finalTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        setError(`Speech recognition error: ${event.error}`);
        if(isRecording) setIsRecording(false);
      };

      recognition.onend = () => {
        if(isRecording) setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      setSpeechApiSupported(false);
    }
  }, [isRecording]);

  const handleToggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      // Fix: Update state immediately for better UX.
      setIsRecording(false);
    } else {
      setRules(''); // Clear previous rules
      setError(null);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }, [isRecording]);

  const handleGenerateClick = useCallback(async () => {
    if (!rules.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const generatedIdeas = await generateIdeas(rules);
      setIdeas(generatedIdeas);
      setSaved(false); // New ideas are not saved yet
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [rules, isLoading]);

  const handleSaveIdeas = useCallback(() => {
    if (ideas.length === 0) return;
    try {
        localStorage.setItem('hackathonIdeas', JSON.stringify(ideas));
        setSaved(true);
    } catch (e) {
        console.error("Failed to save ideas to local storage:", e);
        setError("Could not save ideas. Your browser's storage might be full.");
    }
  }, [ideas]);
  
  const handleReadAloud = useCallback(async () => {
    if (isSpeaking && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsSpeaking(false);
        return;
    }
    if (ideas.length === 0 || isLoading || isFetchingAudio) return;

    setIsFetchingAudio(true);
    setError(null);
    try {
        const textToRead = ideas.map((idea, index) => 
            `Idea ${index + 1}: ${idea.title}. \n${idea.description}. \nSuggested tech stack includes ${idea.techStack.join(', ')}. \nJustification: ${idea.justification}`
        ).join('\n\n');

        const audioBlob = await textToSpeech(textToRead);
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        setIsFetchingAudio(false);
        audio.play();
        setIsSpeaking(true);

        audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
            setError('Failed to play audio.');
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate audio.');
        setIsFetchingAudio(false);
        setIsSpeaking(false);
    }
  }, [ideas, isSpeaking, isLoading, isFetchingAudio]);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans antialiased relative">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-gray-700/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <Header />

        <main className="mt-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 shadow-xl">
            <label htmlFor="hackathon-rules" className="block text-sm font-medium text-gray-300 mb-2">
              Paste or Dictate Hackathon Rules & Description
            </label>
            <div className="relative">
              <textarea
                id="hackathon-rules"
                rows={12}
                className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-4 pr-12 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder-gray-500"
                placeholder="Enter the hackathon details here..."
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                disabled={isRecording}
              />
              {speechApiSupported && (
                 <button 
                    onClick={handleToggleRecording} 
                    title={isRecording ? "Stop Recording" : "Start Recording"}
                    className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors duration-200 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-700 hover:bg-indigo-600 text-gray-300'}`}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7v1h6v-1h-2v-2.07z" clipRule="evenodd" />
                    </svg>
                 </button>
              )}
            </div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleGenerateClick}
                disabled={isLoading || isRecording}
                title="Generate creative hackathon ideas based on the rules above"
                className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative px-8 py-3 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
                  {isLoading ? 'Sparking Ideas...' : '✨ Generate Ideas'}
                </span>
              </button>
            </div>
          </div>
          
          <div className="mt-12">
            {isLoading && ideas.length === 0 && <LoadingSpinner />}
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-center">
                <p><strong>Error:</strong> {error}</p>
              </div>
            )}
            {!isLoading && ideas.length === 0 && !error && (
               <div className="text-center text-gray-500">
                  <p>Your generated ideas will appear here.</p>
               </div>
            )}
            {ideas.length > 0 && (
              <>
                <div className="text-center mb-8 flex flex-wrap justify-center items-center gap-4">
                   <button
                     onClick={handleReadAloud}
                     disabled={isLoading}
                     className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-green-400 to-blue-600 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <span className="relative px-8 py-3 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0 flex items-center gap-2">
                        {isFetchingAudio ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : isSpeaking ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M5 5h10v10H5V5z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.383-.217zM14.5 8a1 1 0 011.5 0v4a1 1 0 11-1.5 0V8z" clipRule="evenodd" />
                            </svg>
                        )}
                       {isFetchingAudio ? 'Preparing Audio...' : isSpeaking ? 'Stop Reading' : 'Read Ideas Aloud'}
                     </span>
                   </button>
                   <button
                     onClick={handleSaveIdeas}
                     disabled={isLoading || saved}
                     title={saved ? "Ideas are saved in your browser" : "Save these ideas to your browser's local storage"}
                     className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-cyan-500 to-blue-500 group-hover:from-cyan-500 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <span className="relative px-8 py-3 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0 flex items-center gap-2">
                       {saved ? '✓ Saved' : '💾 Save Ideas'}
                     </span>
                   </button>
                </div>
                <div className="grid gap-8">
                  {ideas.map((idea, index) => (
                    <IdeaCard key={index} idea={idea} />
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;