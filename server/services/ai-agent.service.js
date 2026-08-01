const axios = require('axios');

class AIAgentService {
  /**
   * Generate AI response using Grok / OpenAI / Fallback
   * @param {string} userMessage - User prompt
   * @param {Array} history - Previous messages array
   * @returns {Promise<string>} AI reply text
   */
  async generateReply(userMessage, history = []) {
    const cleanPrompt = (userMessage || '').trim();

    // 1. Try Grok / xAI API if GROK_API_KEY is present
    if (process.env.GROK_API_KEY) {
      try {
        const grokEndpoint = process.env.GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
        const formattedMessages = [
          {
            role: 'system',
            content: 'You are the official AI Assistant for the AI Forum Logo Design Competition platform. Be helpful, concise, friendly, and knowledgeable about logo design, competition rules, blind voting, and AI aesthetics.'
          },
          ...history.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          })),
          { role: 'user', content: cleanPrompt }
        ];

        const response = await axios.post(
          grokEndpoint,
          {
            model: process.env.GROK_MODEL || 'grok-3-mini',
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 500
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.GROK_API_KEY}`
            },
            timeout: 10000
          }
        );

        if (
          response.data &&
          response.data.choices &&
          response.data.choices[0] &&
          response.data.choices[0].message
        ) {
          return response.data.choices[0].message.content.trim();
        }
      } catch (error) {
        console.error('Grok API Error (falling back to intelligent responder):', error.message);
      }
    }

    // 2. Try OpenAI API if OPENAI_API_KEY is present
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are the official AI Assistant for the AI Forum Logo Design Competition platform.'
              },
              { role: 'user', content: cleanPrompt }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            timeout: 8000
          }
        );

        if (response.data?.choices?.[0]?.message?.content) {
          return response.data.choices[0].message.content.trim();
        }
      } catch (error) {
        console.error('OpenAI API Error:', error.message);
      }
    }

    // 3. Intelligent Fallback Responder for AI Forum Platform
    const lower = cleanPrompt.toLowerCase();

    if (lower.includes('hello') || lower.includes('hi') || lower === 'hello ai forum') {
      return 'Hello! How can I help you?';
    }

    if (lower.includes('rule') || lower.includes('how to vote') || lower.includes('blind')) {
      return 'Our Blind Voting System conceals student identity. Voters evaluate logos strictly by unique Entry IDs (e.g. AI-001) on a 1–5 star rating scale.';
    }

    if (lower.includes('submit') || lower.includes('upload') || lower.includes('logo')) {
      return 'Students can submit exactly ONE logo design with a title and description. Submissions can be edited until the registration phase closes.';
    }

    if (lower.includes('admin') || lower.includes('winner')) {
      return 'Admins monitor live analytics, leaderboard ratings, and student-to-entry ID mappings, and officially announce the competition winner.';
    }

    return `Welcome to AI Forum! I am your AI competition assistant. You asked: "${cleanPrompt}". Feel free to ask about logo submissions, blind voting, or competition guidelines!`;
  }
}

module.exports = new AIAgentService();
