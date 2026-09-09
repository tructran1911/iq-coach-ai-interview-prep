import ReactMarkdown from 'react-markdown';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Edit2, Check, AlertCircle, Loader2, RefreshCcw, Pause, Play, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpeechToText, useTextToSpeech } from '../lib/speechHooks';
import { generateNextQuestion } from '../services/geminiService';
import { InterviewStep } from '../types';

interface Props {
  jobTitle: string;
  jobDescription: string;
  onComplete: (history: InterviewStep[]) => void;
  onRestart: () => void;
  initialQuestion: string;
}

export default function InterviewSession({ jobTitle, jobDescription, onComplete, onRestart, initialQuestion }: Props) {
  const speakTriggeredRef = useRef(false);
  
  const [history, setHistory] = useState<InterviewStep[]>(() => {
    const saved = localStorage.getItem('iq_coach_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved history", e);
      }
    }
    return [{ question: initialQuestion, answer: '' }];
  });

  useEffect(() => {
    localStorage.setItem('iq_coach_history', JSON.stringify(history));
  }, [history]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [silenceCounter, setSilenceCounter] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { isSupported, start, stop } = useSpeechToText();
  const { speak } = useTextToSpeech();
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only speak the very first question if it's new and hasn't been spoken
    if (initialQuestion && !speakTriggeredRef.current) {
      speak(initialQuestion);
      speakTriggeredRef.current = true;
    }
  }, [initialQuestion]);

  useEffect(() => {
    if (isListening && !isPaused) {
      silenceTimerRef.current = setInterval(() => {
        setSilenceCounter(prev => prev + 1);
      }, 1000);
    } else {
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
      setSilenceCounter(0);
    }
    return () => {
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    };
  }, [isListening, isPaused]);

  // Đã loại bỏ cơ chế tự động ngắt sau 15s để ứng viên có đủ thời gian tư duy và diễn đạt trọn vẹn câu trả lời

  const handleStartListening = () => {
    if (isPaused) setIsPaused(false);
    setError(null);
    setIsListening(true);
    start((text) => {
      setCurrentAnswer(prev => prev + (prev ? ' ' : '') + text);
      setSilenceCounter(0);
    });
  };

  const handleStopListening = () => {
    setIsListening(false);
    stop();
  };

  const togglePause = () => {
    if (isListening) {
      handleStopListening();
      setIsPaused(true);
    } else if (isPaused) {
      handleStartListening();
      setIsPaused(false);
    }
  };

  const currentStep = history.length - 1;

  const handleSend = async () => {
    try {
      if (!currentAnswer.trim()) return;

      try {
        if (isListening) {
          setIsListening(false);
          stop();
        }
      } catch (speechErr) {
        console.error("Speech stop error", speechErr);
      }

      setIsLoading(true);
      setError(null);

      const updatedHistory = history.map((h, i) => 
        i === currentStep ? { ...h, answer: currentAnswer } : { ...h }
      );
      
      setHistory(updatedHistory);
      setCurrentAnswer('');

      const nextQ = await generateNextQuestion(jobTitle, jobDescription, updatedHistory.map(h => ({
        question: h.question,
        answer: h.answer
      })));

      if (nextQ && nextQ.includes("INTERVIEW_COMPLETE")) {
        onComplete(updatedHistory);
      } else {
        const finalNextQ = nextQ || "Could you tell me about a time you had to deal with a difficult situation at work and how you handled it?";
        setHistory([...updatedHistory, { question: finalNextQ, answer: '' }]);
        speak(finalNextQ);
      }
    } catch (err: any) {
      console.error("Submit error detail:", err);
      setError(`Lỗi khi gửi dữ liệu: ${err?.message || "Vui lòng kiểm tra console hoặc log backend."}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Download transcript function
  const downloadTranscript = () => {
    const transcriptText = history
      .map((step, i) => `Q${i + 1}: ${step.question}\nA: ${step.answer || '(In progress...)'}`)
      .join('\n\n');
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-transcript-${jobTitle.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col h-[calc(100vh-8rem)]">
      {/* Session Header Controls */}
      <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <RefreshCcw size={14} />
            Restart
          </button>
          <button
            onClick={() => onComplete(history)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all shadow-sm"
            title="Finish interview and generate AI feedback report"
          >
            <Check size={14} className="text-emerald-600" />
            Finish & View Report
          </button>
        </div>
        <button
          onClick={downloadTranscript}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
        >
          <Download size={14} />
          Txt Transcript
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pb-40 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
        <AnimatePresence mode="popLayout">
          {history.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Interviewer */}
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-none p-4 max-w-[85%]">
                  <p className="text-slate-800 font-bold text-xs mb-1 text-blue-600 tracking-wide uppercase">Interviewer</p>
                  <div className="text-slate-700 leading-relaxed text-sm md:text-base prose-sm prose-slate">
                    <ReactMarkdown>{step.question}</ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Candidate */}
              {step.answer && (
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none p-4 max-w-[85%] shadow-lg shadow-blue-100">
                    <p className="text-blue-100 font-bold text-xs mb-1 tracking-wide uppercase">You</p>
                    <p className="leading-relaxed text-sm md:text-base text-white">{step.answer}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start items-center gap-2 text-slate-400 text-sm italic py-2"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
              Coach is typing...
            </motion.div>
          )}
        </AnimatePresence>
        <div className="h-4" /> {/* Spacer */}
      </div>

      {/* Control Panel */}
      <div className="fixed bottom-8 left-0 right-0 px-4">
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 md:p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-xl text-sm border border-slate-100 mb-2">
              <AlertCircle size={16} className="text-amber-500" />
              {error}
            </div>
          )}

          <div className="flex items-stretch gap-3 md:gap-4">
            <div className="flex-1 relative">
              {isEditing ? (
                <textarea
                  autoFocus
                  className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] text-sm md:text-base leading-relaxed"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                />
              ) : (
                <div className="w-full p-4 bg-slate-50 min-h-[100px] rounded-xl flex items-center text-slate-500 text-sm md:text-base leading-relaxed">
                  {currentAnswer || (isListening ? 'Interviewer is listening...' : (isPaused ? 'Recording paused' : 'Click the microphone icon and speak your answer'))}
                </div>
              )}
              
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="absolute top-2 right-2 p-2 text-slate-400 hover:text-blue-600 transition-colors bg-white shadow-sm rounded-lg border border-slate-100"
                title={isEditing ? 'Save edits' : 'Edit answer manually'}
              >
                {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
              </button>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex gap-2">
                 <button
                  disabled={isLoading || (!isListening && !isPaused)}
                  onClick={togglePause}
                  className={`p-4 rounded-xl border transition-all ${
                    isPaused 
                      ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' 
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                  }`}
                  title={isPaused ? "Resume Recording" : "Pause Recording"}
                >
                  {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                </button>
                <button
                  disabled={isLoading}
                  onClick={isListening ? handleStopListening : handleStartListening}
                  className={`p-4 rounded-xl border transition-all ${
                    isListening 
                      ? 'bg-red-500 border-red-600 text-white animate-pulse' 
                      : 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'
                  }`}
                  title={isListening ? "Stop listening" : "Start listening"}
                >
                  {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
              </div>
              
              <button
                disabled={isLoading || !currentAnswer.trim() || isListening}
                onClick={handleSend}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
                  isLoading || !currentAnswer.trim() || isListening
                    ? 'bg-slate-100 text-slate-300 border border-slate-200'
                    : 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200'
                }`}
              >
                <Send size={20} />
                <span className="text-xs md:text-sm">Submit</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
