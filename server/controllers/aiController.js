const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const aiAgentService = require('../services/ai-agent.service');

// @desc    Process AI Chat Message & History
// @route   POST /api/ai/chat
// @access  Public (or Authenticated)
exports.handleChat = async (req, res) => {
  try {
    // 1. Check MongoDB Connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database connection unavailable. Please try again in a moment.'
      });
    }

    // 2. Safely parse request body
    const body = req.body || {};
    const { conversationId } = body;
    let message = body.message;

    // 3. Message Validation
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required.'
      });
    }

    message = message.trim();

    // 4. Retrieve or Create Conversation Thread safely
    let conversation = null;

    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findById(conversationId);
    }

    // If conversation is missing or invalid, create a new conversation automatically
    if (!conversation) {
      const titleSnippet = message.length > 30 ? message.substring(0, 30) + '...' : message;
      conversation = await Conversation.create({
        userId: req.user ? req.user._id : null,
        title: titleSnippet,
        messages: []
      });
    }

    // 5. Save user message to history
    conversation.messages.push({
      sender: 'user',
      text: message,
      createdAt: new Date()
    });

    // 6. Generate AI Reply via service
    const aiReply = await aiAgentService.generateReply(message, conversation.messages);

    // 7. Save AI assistant reply to history
    conversation.messages.push({
      sender: 'assistant',
      text: aiReply,
      createdAt: new Date()
    });

    await conversation.save();

    // 8. Return formatted success response with conversationId
    return res.status(200).json({
      success: true,
      conversationId: conversation._id.toString(),
      reply: aiReply
    });
  } catch (error) {
    console.error('AI Controller Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while processing your AI chat message.'
    });
  }
};

// @desc    Get Chat History for a Conversation
// @route   GET /api/ai/conversation/:id
// @access  Public
exports.getConversationHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Valid Conversation ID is required.'
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation thread not found.'
      });
    }

    return res.status(200).json({
      success: true,
      conversationId: conversation._id.toString(),
      messages: conversation.messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch conversation history.'
    });
  }
};
