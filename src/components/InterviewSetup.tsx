import { useState } from 'react';
import { Briefcase, FileText, Play } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onStart: (title: string, jd: string) => void;
}

export default function InterviewSetup({ onStart }: Props) {
  const [title, setTitle] = useState('');
  const [jd, setJd] = useState('');

  const isDisabled = !title.trim() || !jd.trim();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Prepare for Success</h1>
        <p className="text-slate-500">Master your interview with AI coaching specialized for international firms.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-6"
      >
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Briefcase size={16} className="text-blue-500" />
            Job Title
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="e.g. Senior Software Engineer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FileText size={16} className="text-blue-500" />
            Job Description (JD)
          </label>
          <textarea
            className="w-full h-48 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
            placeholder="Paste the job description here (max 5000 characters)..."
            maxLength={5000}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <div className="text-right text-xs text-slate-400">
            {jd.length}/5000
          </div>
        </div>

        <button
          onClick={() => onStart(title, jd)}
          disabled={isDisabled}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            isDisabled 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-[0.98]'
          }`}
        >
          <Play size={18} fill="currentColor" />
          Start Interview
        </button>
      </motion.div>
    </div>
  );
}
