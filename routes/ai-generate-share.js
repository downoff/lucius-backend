router.post('/api/ai/generate', authMiddleware, rateLimitShare, async (req, res) => {
  try {
    const { prompt, tool = 'Social Studio', publicShare = false, title } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check credits
    if (!user.isPro && user.credits <= 0) {
      return res.status(402).json({ message: 'Out of credits' });
    }

    // STREAM START
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    let cleanText = '';

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: user.brandVoicePrompt || "You are an expert social media writer." },
        { role: 'user', content: prompt }
      ],
      stream: true,
    });

    for await (const part of stream) {
      const token = part.choices[0]?.delta?.content || '';
      if (token) {
        cleanText += token;
        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
      }
    }

    // Save after stream ends
    const conv = new Conversation({ user: user._id, prompt, response: cleanText, tool });
    if (!user.isPro) user.credits -= 1;

    let share = null;
    if (publicShare) {
      share = new Share({
        userId: user._id,
        tool,
        content: { text: cleanText, title: title || cleanText.slice(0, 120) },
        public: true,
        watermark: !user.isPro
      });
      await share.save();
    }

    await Promise.all([conv.save(), user.save()]);

    res.write(`data: ${JSON.stringify({
      done: true,
      shareId: share ? share.shareId : null,
      shareUrl: share ? `${process.env.BASE_URL}/s/${share.shareId}` : null
    })}\n\n`);
    res.end();
  } catch (err) {
    console.error('generate route error', err);
    res.status(500).json({ message: 'Generation failed' });
  }
});
