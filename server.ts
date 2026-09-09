import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Endpoint 1: Start interview
app.post('/api/start', async (req, res) => {
  const { job_title, job_description } = req.body || {};
  if (!job_title) {
    return res.status(400).json({ error: 'job_title is required' });
  }

  const threadId = `thread-${Date.now()}`;
  const agentId = `agent-iq`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `You are an expert Interviewer conducting a job interview.
Job Title: ${job_title}
Job Description: ${job_description || 'N/A'}

Instructions:
- Generate ONE professional interview question to open the interview.
- Start with a polite greeting and ask an introductory question tailored to the role.
- Output ONLY the question text.`,
      });

      if (response.text) {
        return res.json({
          thread_id: threadId,
          agent_id: agentId,
          question: response.text.trim(),
        });
      }
    } catch (err) {
      console.warn('Gemini API error on /api/start, using fallback:', err);
    }
  }

  // Fallback response
  return res.json({
    thread_id: threadId,
    agent_id: agentId,
    question: `Hello! Welcome to the interview for the ${job_title} role. Could you please introduce yourself and tell me why you are interested in this position?`,
  });
});

// Endpoint 2: Next question
app.post('/api/next', async (req, res) => {
  const { job_title, job_description, answer, history_length = 1 } = req.body || {};

  // Cho phép phỏng vấn chuyên sâu tới 6-8 câu hỏi thực tế
  if (history_length >= 8) {
    return res.json({ question: 'INTERVIEW_COMPLETE' });
  }

  // Nếu ứng viên chủ động gõ/nói muốn kết thúc
  if (answer) {
    const ansClean = answer.trim().toLowerCase();
    const shortConfirm = ['wrap up', 'conclude interview', 'end interview', 'finish interview', 'stop interview', 'show my report', 'view report'];
    if (shortConfirm.some((c) => ansClean.includes(c))) {
      return res.json({ question: 'INTERVIEW_COMPLETE' });
    }
  }

  if (ai && answer) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `You are an expert Technical Hiring Lead conducting an interview for: "${job_title || 'Software Engineer'}".
Target Job Description:
"""
${job_description || 'N/A'}
"""

Candidate's latest response:
"""
${answer}
"""

Instructions:
- Analyze what the candidate just answered and connect it directly to the specific technical skills, challenges, or responsibilities mentioned in the Job Description.
- Generate ONE sharp, realistic follow-up interview question that probes deeper into their real-world technical execution, architectural tradeoffs, or behavioral problem-solving.
- If the candidate explicitly says they want to stop/end/conclude the interview, reply strictly with the text "INTERVIEW_COMPLETE".
- Output ONLY the question text without any markdown or conversational pleasantries.`,
      });

      if (response.text) {
        const text = response.text.trim();
        if (text.toUpperCase().includes('INTERVIEW_COMPLETE')) {
          return res.json({ question: 'INTERVIEW_COMPLETE' });
        }
        return res.json({ question: text });
      }
    } catch (err) {
      console.warn('Gemini API error on /api/next, using fallback:', err);
    }
  }

  // Fallback mock questions
  const mockQuestions = [
    'Can you describe a challenging technical project you worked on and how you resolved the obstacles using the STAR method?',
    'How do you handle disagreements within your team? Give a specific situation.',
    'Where do you see yourself in 3 years in terms of technology stack development?',
    'What is your approach to learning new technologies and staying updated with industry trends?',
    'Can you tell me about a time you had to make a difficult decision with limited information?',
  ];

  const selected = mockQuestions[(history_length - 1) % mockQuestions.length];
  return res.json({ question: selected });
});

// Endpoint 3: Feedback report
app.post('/api/feedback', async (req, res) => {
  const { job_title, job_description, history = [] } = req.body || {};

  if (ai && history.length > 0) {
    try {
      const historyText = history
        .map((h: any) => `Interviewer: ${h.question}\nCandidate: ${h.answer}`)
        .join('\n\n');

      const prompt = `You are an elite Executive Tech Recruiter and Communication Coach evaluating an interview session.
Target Role: "${job_title}"
Target Job Description (JD):
"""
${job_description}
"""

Candidate Interview Transcript:
${historyText}

Conduct an in-depth, rigorous, and highly actionable assessment tailored specifically to whether the candidate demonstrates the competencies, tech stack, and responsibilities demanded by the Job Description.

Provide structured feedback in JSON matching this schema:
{
  "overallEnglish": "Detailed 3-4 sentence assessment covering technical vocabulary range, grammatical accuracy, fluency, structure, and professional tone in a global corporate environment.",
  "overallCulture": "Detailed 3-4 sentence evaluation of how effectively the candidate addresses the real challenges in the Job Description, their alignment with proactive problem-solving, collaboration, and ownership.",
  "keyStrengths": [
    "Specific technical or communication strength referencing exact skills from the JD",
    "Evidence of strong problem-solving or delivery demonstrated in their answers"
  ],
  "areasForImprovement": [
    "Concrete gap between candidate's answers and the JD requirements (e.g. lack of quantifiable metrics, missing key architecture considerations)",
    "Actionable advice on delivery, phrasing, or STAR storytelling depth"
  ],
  "steps": [
    {
      "question": "The question asked...",
      "answer": "The candidate's response...",
      "feedback": {
        "englishScore": 85,
        "cultureScore": 90,
        "grammarIssues": [
          "Precise explanation of grammatical inaccuracy, clumsy phrasing, or awkward vocabulary choice",
          "Alternative natural professional phrase"
        ],
        "cultureIssues": [
          "How this answer missed hitting key responsibilities or expectations from the JD",
          "Evaluation against the STAR method: was the Situation, Task, Action, and measurable Result clearly stated?"
        ],
        "suggestedAnswer": "A complete, high-impact model answer (3-5 sentences) structured clearly with the STAR method (Situation, Task, Action, quantifiable Result) tailored directly to the JD requirements.",
        "highlights": [
          {
            "text": "exact substring from candidate's answer",
            "type": "grammar",
            "reason": "Clear explanation of why this wording should be improved"
          }
        ]
      }
    }
  ]
}

CRITICAL INSTRUCTIONS:
1. Output MUST be valid JSON only. Do not wrap in markdown code blocks.
2. Be constructively rigorous: provide tangible advice that truly transforms the candidate from average to top 1% applicant.
3. Every suggestedAnswer MUST be a fully fleshed-out STAR exemplar with realistic numbers and metrics.
4. "text" in "highlights" MUST be an exact substring from candidate's answer.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const cleanedText = response.text.replace(/```json\n?|\n?```/g, '').trim();
        const jsonFeedback = JSON.parse(cleanedText);
        return res.json(jsonFeedback);
      }
    } catch (err) {
      console.warn('Gemini API error on /api/feedback, using fallback:', err);
    }
  }

  // Fallback mock feedback report
  const steps_feedback = history.map((h: any) => {
    const q_text = (h.question || '').toLowerCase();
    let grammar_issues = [];
    let culture_issues = [];
    let suggested_answer = '';
    let english_score = 88;
    let culture_score = 90;

    if (q_text.includes('introduce') || q_text.includes('welcome')) {
      english_score = 85;
      culture_score = 88;
      grammar_issues = [
        "Try to avoid starting too many sentences with 'I'. Work on using active voice variations.",
        'Ensure you enunciate key technical metrics clearly.',
      ];
      culture_issues = [
        'Culture Fit: Highlight your core technical expertise and key achievements within the first 30 seconds.',
      ];
      suggested_answer = `Hello, I am a Software Engineer specializing in full-stack web development. In my previous role, I optimized front-end performance, reducing load times by 30%. I am excited about this opportunity to contribute to your team.`;
    } else if (q_text.includes('disagreement') || q_text.includes('conflict') || q_text.includes('team')) {
      english_score = 82;
      culture_score = 85;
      grammar_issues = [
        "Watch past tense consistency. Use 'resolved' instead of 'resolve' when describing past events.",
      ];
      culture_issues = [
        'Culture Fit: Explain how you actively listened and used data-driven decisions to align the team.',
      ];
      suggested_answer = `When my team disagreed on architecture, I scheduled a sync to compare tradeoffs objectively. By listing pros and cons, we reached consensus on a scalable solution and delivered on time.`;
    } else {
      english_score = 86;
      culture_score = 90;
      grammar_issues = ['Ensure proper prepositions and active verbs for maximum impact.'];
      culture_issues = [
        'Culture Fit: Follow the STAR method (Situation, Task, Action, Result) and include quantitative metrics.',
      ];
      suggested_answer = `Structure your response using the STAR method: describe the Situation, Task, your specific Action, and the measurable Result.`;
    }

    return {
      question: h.question || 'Mock question',
      answer: h.answer || 'Mock answer',
      feedback: {
        englishScore: english_score,
        cultureScore: culture_score,
        grammarIssues: grammar_issues,
        cultureIssues: culture_issues,
        suggestedAnswer: suggested_answer,
        highlights: [],
      },
    };
  });

  return res.json({
    overallEnglish: 'Good presentation skills. Clear vocabulary with minor phrasing suggestions.',
    overallCulture: 'Strong alignment with professional global workplace standards.',
    keyStrengths: ['Logical structure', 'Polite and professional tone'],
    areasForImprovement: ['Utilize the STAR method more thoroughly', 'Include quantitative results'],
    steps: steps_feedback,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
