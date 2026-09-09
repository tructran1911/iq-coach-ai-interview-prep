/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InterviewSetup from './components/InterviewSetup';
import InterviewSession from './components/InterviewSession';
import FeedbackReport from './components/FeedbackReport';
import { generateFirstQuestion, generateFeedback } from './services/geminiService';
import { InterviewStep } from './types';

type AppState = 'setup' | 'loading' | 'interviewing' | 'feedback';

export default function App() {
  // Restore from localStorage on initialization
  const [state, setState] = useState<AppState>(() => {
    return (localStorage.getItem('iq_coach_state') as AppState) || 'setup';
  });
  const [jobTitle, setJobTitle] = useState(() => {
    return localStorage.getItem('iq_coach_job_title') || '';
  });
  const [jobDescription, setJobDescription] = useState(() => {
    return localStorage.getItem('iq_coach_job_desc') || '';
  });
  const [initialQuestion, setInitialQuestion] = useState(() => {
    return localStorage.getItem('iq_coach_init_q') || '';
  });
  const [feedback, setFeedback] = useState<any>(() => {
    const saved = localStorage.getItem('iq_coach_feedback');
    return saved ? JSON.parse(saved) : null;
  });

  // Synchronize state changes to localStorage
  useEffect(() => {
    localStorage.setItem('iq_coach_state', state);
  }, [state]);

  useEffect(() => {
    localStorage.setItem('iq_coach_job_title', jobTitle);
  }, [jobTitle]);

  useEffect(() => {
    localStorage.setItem('iq_coach_job_desc', jobDescription);
  }, [jobDescription]);

  useEffect(() => {
    localStorage.setItem('iq_coach_init_q', initialQuestion);
  }, [initialQuestion]);

  useEffect(() => {
    if (feedback) {
      localStorage.setItem('iq_coach_feedback', JSON.stringify(feedback));
    } else {
      localStorage.removeItem('iq_coach_feedback');
    }
  }, [feedback]);

  const startInterview = async (title: string, jd: string) => {
    setJobTitle(title);
    setJobDescription(jd);
    setState('loading');
    
    try {
      const q = await generateFirstQuestion(title, jd);
      setInitialQuestion(q);
      setState('interviewing');
    } catch (err) {
      console.error(err);
      setState('setup');
    }
  };

  const finishInterview = async (history: InterviewStep[]) => {
    setState('loading');
    try {
      const report = await generateFeedback(jobTitle, jobDescription, history.map(h => ({
        question: h.question,
        answer: h.answer
      })));
      setFeedback(report);
      setState('feedback');
    } catch (err) {
      console.error(err);
    }
  };

  const restart = () => {
    // Clear localStorage values
    localStorage.removeItem('iq_coach_state');
    localStorage.removeItem('iq_coach_job_title');
    localStorage.removeItem('iq_coach_job_desc');
    localStorage.removeItem('iq_coach_init_q');
    localStorage.removeItem('iq_coach_feedback');
    localStorage.removeItem('iq_coach_history');

    setState('setup');
    setJobTitle('');
    setJobDescription('');
    setInitialQuestion('');
    setFeedback(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* Dynamic Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={restart}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Compass className="text-white" size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">IQ Coach</span>
          </div>

          <div className="flex items-center gap-4">
            {state === 'interviewing' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium border border-red-100 italic animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                In Session
              </div>
            )}
            <div className="h-8 w-px bg-slate-100 mx-2 hidden sm:block" />
            <div className="text-sm font-medium text-slate-500 hidden sm:block">
              For International Candidates
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-10 pb-20">
        <AnimatePresence mode="wait">
          {state === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <InterviewSetup onStart={startInterview} />
            </motion.div>
          )}

          {state === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] space-y-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
                <Loader2 className="animate-spin text-blue-600 relative z-10" size={64} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-slate-800">Synthesizing Session...</p>
                <p className="text-slate-500 text-sm">Google Gemini is preparing your personalized interview session...</p>
              </div>
            </motion.div>
          )}

          {state === 'interviewing' && (
            <motion.div
              key="interview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <InterviewSession
                jobTitle={jobTitle}
                jobDescription={jobDescription}
                initialQuestion={initialQuestion}
                onComplete={finishInterview}
                onRestart={restart}
              />
            </motion.div>
          )}

          {state === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <FeedbackReport feedback={feedback} onRestart={restart} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-30" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[30%] h-[30%] bg-indigo-100 rounded-full blur-[120px] opacity-30" />
      </div>
    </div>
  );
}

