const BACKEND_URL = "/api";

export async function generateFirstQuestion(jobTitle: string, jobDescription: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_title: jobTitle, job_description: jobDescription })
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }
    
    const data = await response.json();
    // Save state for follow-up questions
    sessionStorage.setItem("thread_id", data.thread_id);
    sessionStorage.setItem("agent_id", data.agent_id);
    return data.question;
  } catch (error) {
    console.error("Failed to generate first question", error);
    // Fallback if backend is down
    return `Hello! Welcome to the interview for the ${jobTitle} role. Could you please introduce yourself and tell me why you are interested in this position?`;
  }
}

export async function generateNextQuestion(
  jobTitle: string,
  jobDescription: string,
  history: { question: string; answer: string }[]
) {
  try {
    const threadId = sessionStorage.getItem("thread_id") || "mock-thread";
    const agentId = sessionStorage.getItem("agent_id") || "mock-agent";
    const lastAnswer = history[history.length - 1]?.answer || "";

    const response = await fetch(`${BACKEND_URL}/next`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thread_id: threadId,
        agent_id: agentId,
        job_title: jobTitle,
        job_description: jobDescription,
        answer: lastAnswer,
        history_length: history.length
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.question;
  } catch (error) {
    console.error("Failed to generate next question", error);
    // Fallback ending if error occurs
    if (history.length >= 3) {
      return "INTERVIEW_COMPLETE";
    }
    return "Could you tell me about a time you had to deal with a difficult situation at work and how you handled it?";
  }
}

export async function generateFeedback(
  jobTitle: string,
  jobDescription: string,
  history: { question: string; answer: string }[]
) {
  try {
    const response = await fetch(`${BACKEND_URL}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_title: jobTitle,
        job_description: jobDescription,
        history: history
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to generate feedback", error);
    // Fallback mockup response
    return {
      overallEnglish: "Good presentation skills. Grammar was clean with minor formatting issues.",
      overallCulture: "Excellent alignment with professional values stated in the job description.",
      keyStrengths: ["Logical structure", "Polite and professional tone"],
      areasForImprovement: ["Utilize the STAR method more thoroughly", "Expand on key project outcomes"],
      steps: history.map(h => ({
        question: h.question,
        answer: h.answer,
        feedback: {
          englishScore: 85,
          cultureScore: 90,
          grammarIssues: [],
          cultureIssues: [],
          suggestedAnswer: "Your answer was good. To improve, ensure you clearly state the quantitative Result of your actions.",
          highlights: []
        }
      }))
    };
  }
}
