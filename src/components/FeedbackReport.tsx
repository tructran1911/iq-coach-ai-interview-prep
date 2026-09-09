import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Download, CheckCircle2, AlertTriangle, Target, MessageSquare, Info, Star, Award, ShieldCheck, ChevronRight, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';

interface Props {
  feedback: any;
  onRestart: () => void;
}

export default function FeedbackReport({ feedback, onRestart }: Props) {
  const [visibleSuggestions, setVisibleSuggestions] = useState<Record<number, boolean>>({});

  const downloadPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    
    // Prepare element for capture
    const originalStyle = element.getAttribute('style') || '';
    element.style.backgroundColor = '#ffffff';
    element.style.color = '#000000';
    element.style.padding = '40px';
    element.style.width = '1000px'; 
    element.style.borderRadius = '0'; // Flat for PDF
    
    // Reveal all suggestions for the PDF capture
    const hiddenElements = document.querySelectorAll('[data-pdf-reveal]');
    const originalDisplays: string[] = [];
    hiddenElements.forEach(el => {
      originalDisplays.push((el as HTMLElement).style.display);
      (el as HTMLElement).style.display = 'block';
      (el as HTMLElement).style.height = 'auto';
      (el as HTMLElement).style.opacity = '1';
    });

    try {
      // Use html-to-image to capture the element
      const dataUrl = await toJpeg(element, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        width: 1100, // Sufficient width for the 1000px content + padding
        style: {
          padding: '40px',
          borderRadius: '0',
          backgroundColor: '#ffffff'
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => img.onload = resolve);
      
      const totalImgHeightInPdf = (img.height * pdfWidth) / img.width;
      let heightLeft = totalImgHeightInPdf;
      let position = 0;

      // Thêm trang đầu tiên
      pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, totalImgHeightInPdf);
      heightLeft -= pageHeight;

      // Nếu báo cáo dài hơn 1 trang A4, tự động ngắt và thêm các trang tiếp theo
      while (heightLeft > 0) {
        position = heightLeft - totalImgHeightInPdf;
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, totalImgHeightInPdf);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`interview-coaching-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      element.setAttribute('style', originalStyle);
      // Restore hidden elements
      hiddenElements.forEach((el, i) => {
        (el as HTMLElement).style.display = originalDisplays[i];
        (el as HTMLElement).style.height = ''; 
        (el as HTMLElement).style.opacity = '';
      });
    }
  };

  const renderHighlightedAnswer = (answer: string, highlights: any[]) => {
    if (!highlights || highlights.length === 0) return answer;

    const sortedHighlights = [...highlights].sort((a, b) => answer.indexOf(a.text) - answer.indexOf(b.text));
    const elements: (string | React.ReactNode)[] = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, idx) => {
      const startIndex = answer.indexOf(highlight.text, lastIndex);
      if (startIndex === -1) return;

      if (startIndex > lastIndex) {
        elements.push(answer.substring(lastIndex, startIndex));
      }

      const isGrammar = highlight.type === 'grammar';
      elements.push(
        <span 
          key={idx} 
          className={`relative group cursor-help px-1 rounded-sm transition-colors font-medium border-b-2 ${
            isGrammar ? 'bg-red-50 text-red-900 border-red-300' : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}
        >
          {highlight.text}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case font-normal leading-relaxed">
            <span className="block font-black mb-1 uppercase tracking-widest text-[9px] text-blue-400">
              {isGrammar ? 'Linguistic' : 'Cultural'} Tip
            </span>
            {highlight.reason}
          </span>
        </span>
      );

      lastIndex = startIndex + highlight.text.length;
    });

    if (lastIndex < answer.length) {
      elements.push(answer.substring(lastIndex));
    }

    return elements;
  };

  const toggleSuggestion = (idx: number) => {
    setVisibleSuggestions(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!feedback) return null;

  // Calculate average scores
  const stepsList = feedback.steps || [];
  const avgEnglish = stepsList.length > 0 
    ? Math.round(stepsList.reduce((acc: number, s: any) => acc + (s.feedback?.englishScore || 0), 0) / stepsList.length)
    : 0;
  const avgCulture = stepsList.length > 0 
    ? Math.round(stepsList.reduce((acc: number, s: any) => acc + (s.feedback?.cultureScore || 0), 0) / stepsList.length)
    : 0;

  // Helper to render radial progress circle
  const renderRadialProgress = (score: number, colorClass: string, trackColorClass: string) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            className={`${trackColorClass} stroke-current`}
            strokeWidth="8"
            fill="transparent"
          />
          {/* Progress */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            className={`${colorClass} stroke-current`}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute font-black text-2xl tracking-tight text-slate-800">
          {score}%
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12">
      <style dangerouslySetInnerHTML={{ __html: `
        #report-content {
          --tw-bg-opacity: 1 !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          
          /* Override Tailwind v4 Default Color Variables with Hex */
          --color-slate-50: #f8fafc !important;
          --color-slate-100: #f1f5f9 !important;
          --color-slate-200: #e2e8f0 !important;
          --color-slate-300: #cbd5e1 !important;
          --color-slate-400: #94a3b8 !important;
          --color-slate-500: #64748b !important;
          --color-slate-600: #475569 !important;
          --color-slate-700: #334155 !important;
          --color-slate-800: #1e293b !important;
          --color-slate-900: #0f172a !important;
          
          --color-blue-50: #eff6ff !important;
          --color-blue-100: #dbeafe !important;
          --color-blue-200: #bfdbfe !important;
          --color-blue-300: #93c5fd !important;
          --color-blue-400: #60a5fa !important;
          --color-blue-500: #3b82f6 !important;
          --color-blue-600: #2563eb !important;
          --color-blue-700: #1d4ed8 !important;
          
          --color-red-50: #fef2f2 !important;
          --color-red-100: #fee2e2 !important;
          --color-red-400: #f87171 !important;
          --color-red-500: #ef4444 !important;
          
          --color-amber-50: #fffbeb !important;
          --color-amber-100: #fef3c7 !important;
          --color-amber-400: #fbbf24 !important;
          --color-amber-500: #f59e0b !important;

          /* Other common Tailwind UI variables */
          --tw-shadow: 0 0 #0000 !important;
          --tw-ring-color: transparent !important;
          --tw-border-opacity: 1 !important;
        }
        
        #report-content * {
          color-scheme: light !important;
          outline: none !important;
        }

        #report-content .bg-slate-900 { background-color: #0f172a !important; }
        #report-content .bg-blue-600 { background-color: #2563eb !important; }
        #report-content .bg-blue-50 { background-color: #eff6ff !important; }
        #report-content .bg-slate-50 { background-color: #f8fafc !important; }
        #report-content .bg-red-50 { background-color: #fef2f2 !important; }
        #report-content .bg-amber-50 { background-color: #fffbeb !important; }
        #report-content .bg-slate-900\\/20 { background-color: rgba(15, 23, 42, 0.2) !important; }
        #report-content .bg-blue-500\\/20 { background-color: rgba(37, 99, 235, 0.2) !important; }
        #report-content .bg-white\\/20 { background-color: rgba(255, 255, 255, 0.2) !important; }
        
        #report-content .text-blue-600 { color: #2563eb !important; }
        #report-content .text-blue-400 { color: #60a5fa !important; }
        #report-content .text-blue-100 { color: #dbeafe !important; }
        #report-content .text-blue-50 { color: #eff6ff !important; }
        #report-content .text-slate-900 { color: #0f172a !important; }
        #report-content .text-slate-800 { color: #1e293b !important; }
        #report-content .text-slate-700 { color: #334155 !important; }
        #report-content .text-slate-600 { color: #475569 !important; }
        #report-content .text-slate-500 { color: #64748b !important; }
        #report-content .text-slate-400 { color: #94a3b8 !important; }
        #report-content .text-slate-300 { color: #cbd5e1 !important; }
        #report-content .text-slate-100 { color: #f1f5f9 !important; }
        #report-content .text-red-900 { color: #7f1d1d !important; }
        #report-content .text-amber-900 { color: #78350f !important; }
        
        #report-content .border-blue-600 { border-color: #2563eb !important; }
        #report-content .border-slate-200 { border-color: #e2e8f0 !important; }
        #report-content .border-slate-100 { border-color: #f1f5f9 !important; }
        #report-content .border-red-100 { border-color: #fee2e2 !important; }
        #report-content .border-amber-100 { border-color: #fef3c7 !important; }
        #report-content .shadow-xl, #report-content .shadow-2xl, #report-content .shadow-lg, #report-content .shadow-md, #report-content .shadow-sm, #report-content .shadow { box-shadow: none !important; }
        
        /* Typography specifics */
        #report-content .prose { color: #334155 !important; }
        #report-content .prose-invert { color: #cbd5e1 !important; }
        #report-content .prose p { color: #334155 !important; }
        #report-content .prose-invert p { color: #cbd5e1 !important; }
        #report-content .prose strong { color: #0f172a !important; }
        #report-content .prose-invert strong { color: #ffffff !important; }
      `}} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Coaching Report</h1>
          <p className="text-slate-500 mt-1">Linguistic and cultural alignment analysis.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRestart}
            className="flex-1 md:flex-none px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 rounded-2xl transition-all border border-slate-200 shadow-sm"
          >
            Practice Again
          </button>
          <button
            onClick={downloadPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>

      <div id="report-content" className="space-y-12 bg-white">
        {/* Visual Analytics / Circular Progress Charts */}
        <section className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
          <div className="flex flex-col gap-2 items-center text-center mb-8">
            <span className="px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-[0.2em] rounded-full border border-blue-100">
              Part 1: Overall Analytics
            </span>
            <h2 className="text-3xl font-black text-slate-900">Your Average Scores</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 md:gap-16">
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              {renderRadialProgress(avgEnglish, "text-blue-600", "text-slate-200")}
              <div className="text-center sm:text-left space-y-1">
                <h3 className="font-black text-slate-900 text-lg">Linguistic Proficiency</h3>
                <p className="text-slate-500 text-sm">Aggregated grammar correctness, vocabulary richness, and syntactic diversity scores.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              {renderRadialProgress(avgCulture, "text-amber-500", "text-slate-200")}
              <div className="text-center sm:text-left space-y-1">
                <h3 className="font-black text-slate-900 text-lg">Cultural Fit Score</h3>
                <p className="text-slate-500 text-sm">Alignment with specified corporate environment, agile mindsets, and professional values.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Global Summary Cards */}
        <section className="space-y-8">
          <div className="flex flex-col gap-2 items-center text-center mb-4">
             <span className="px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-[0.2em] rounded-full border border-blue-100">
              Part 2: Qualitative Feedback
            </span>
            <h2 className="text-3xl font-black text-slate-900">Expert Evaluations</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 text-white rounded-[2rem] p-8 space-y-4 shadow-2xl relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-4 opacity-10">
                <Target size={120} strokeWidth={1} />
              </div>
              <div className="flex items-center gap-3 text-blue-400 font-black uppercase tracking-widest text-xs">
                <span className="p-1.5 bg-blue-500/20 rounded-lg">
                  <Star size={16} />
                </span>
                English Proficiency
              </div>
              <div className="text-slate-300 text-lg leading-relaxed relative z-10 font-medium prose prose-invert max-w-none">
                <ReactMarkdown>{feedback.overallEnglish}</ReactMarkdown>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-blue-600 text-white rounded-[2rem] p-8 space-y-4 shadow-2xl shadow-blue-100 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck size={120} strokeWidth={1} />
              </div>
              <div className="flex items-center gap-3 text-blue-100 font-black uppercase tracking-widest text-xs">
               <span className="p-1.5 bg-white/20 rounded-lg">
                  <Award size={16} />
                </span>
                Cultural Alignment
              </div>
              <div className="text-blue-50 text-lg leading-relaxed relative z-10 font-medium prose prose-invert max-w-none">
                <ReactMarkdown>{feedback.overallCulture}</ReactMarkdown>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Legend */}
        <div className="flex flex-wrap gap-6 text-[10px] md:text-xs font-bold text-slate-400 p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-red-100 border border-red-200" />
            LINGUISTIC ISSUE
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-amber-100 border border-amber-200" />
            CULTURAL GAP
          </div>
          <div className="flex items-center gap-2 ml-auto text-slate-500 italic">
            <Info size={16} className="text-blue-400" />
            Hover highlighted text for detailed coaching tips
          </div>
        </div>

        {/* Question Breakdown */}
        <section className="space-y-16">
          <div className="flex flex-col gap-2 items-center text-center mb-8">
             <span className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-[0.2em] rounded-full border border-slate-200">
              Part 2: Deep Dive Analysis
            </span>
            <h2 className="text-3xl font-black text-slate-900">Question-by-Question Feedback</h2>
          </div>
          {feedback.steps.map((step: any, idx: number) => (
            <motion.div
              key={idx}
              className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="bg-slate-50 p-6 md:p-8 border-b border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-lg shadow-slate-200">
                  {idx + 1}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Interviewer Question</p>
                  <div className="text-slate-800 font-bold text-lg leading-relaxed prose prose-slate max-w-none">
                    <ReactMarkdown>{step.question}</ReactMarkdown>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-10 space-y-12">
                {/* Answer Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Your Response Analysis</p>
                    <div className="flex gap-2">
                       <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-full border border-red-100">
                        GRAMMAR: {step.feedback.englishScore}%
                      </span>
                      <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full border border-amber-100">
                        CULTURE: {step.feedback.cultureScore}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-8 rounded-[1.5rem] border border-slate-100 text-slate-700 text-lg md:text-xl leading-loose italic font-serif">
                    {renderHighlightedAnswer(step.answer || "", step.feedback.highlights)}
                  </div>
                </div>

                {/* Analysis Sections */}
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="text-sm font-black text-slate-900 flex items-center gap-3 uppercase tracking-[0.15em] border-b-2 border-red-100 pb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-lg shadow-red-200" />
                      Linguistic Issues
                    </div>
                    <ul className="space-y-4">
                      {(step.feedback.grammarIssues || []).map((issue: string, i: number) => (
                        <li key={i} className="text-sm md:text-base text-slate-600 font-medium flex items-start gap-4 bg-red-50/20 p-4 rounded-2xl border border-red-50/50">
                          <AlertTriangle size={20} className="text-red-400 mt-0.5 shrink-0" />
                          {issue}
                        </li>
                      ))}
                      {(!step.feedback.grammarIssues || step.feedback.grammarIssues.length === 0) && (
                        <li className="text-sm text-slate-400 italic">No major grammar issues detected.</li>
                      )}
                    </ul>
                  </div>

                  <div className="space-y-6">
                    <div className="text-sm font-black text-slate-900 flex items-center gap-3 uppercase tracking-[0.15em] border-b-2 border-amber-100 pb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-lg shadow-amber-200" />
                      Culture Alignment
                    </div>
                    <ul className="space-y-4">
                      {(step.feedback.cultureIssues || []).map((issue: string, i: number) => (
                        <li key={i} className="text-sm md:text-base text-slate-600 font-medium flex items-start gap-4 bg-amber-50/20 p-4 rounded-2xl border border-amber-50/50">
                          <CheckCircle2 size={20} className="text-amber-400 mt-0.5 shrink-0" />
                          {issue}
                        </li>
                      ))}
                      {(!step.feedback.cultureIssues || step.feedback.cultureIssues.length === 0) && (
                        <li className="text-sm text-slate-400 italic">Excellent cultural alignment.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Suggested Answer Section */}
                <div className="pt-6">
                  <button 
                    onClick={() => toggleSuggestion(idx)}
                    className="flex items-center justify-between w-full p-6 bg-blue-50 text-blue-800 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Star size={20} className="text-blue-500" />
                      {visibleSuggestions[idx] ? 'Hide Suggestion' : 'Suggested Better Response'}
                    </div>
                    <ChevronRight className={`transition-transform duration-300 ${visibleSuggestions[idx] ? 'rotate-90' : ''}`} size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {visibleSuggestions[idx] && (
                      <motion.div
                        data-pdf-reveal
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-6 bg-slate-900 text-slate-100 p-8 md:p-12 rounded-[2.5rem] text-lg md:text-xl leading-relaxed font-serif italic relative shadow-2xl">
                           <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                            <Star size={80} />
                          </div>
                          <div className="relative z-10">
                             <p className="text-blue-400 text-xs font-black uppercase tracking-[0.3em] mb-6 not-italic font-sans">Ideal Execution</p>
                             <div className="prose prose-invert max-w-none prose-lg">
                               <ReactMarkdown>{`"${step.feedback.suggestedAnswer}"`}</ReactMarkdown>
                             </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </section>
      </div>
    </div>
  );
}
