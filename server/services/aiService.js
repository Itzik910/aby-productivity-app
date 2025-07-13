const OpenAI = require('openai');
const AIUsage = require('../models/AIUsage');
const User = require('../models/User');
const Task = require('../models/Task');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class AIService {
  constructor() {
    this.defaultModel = 'gpt-3.5-turbo';
    this.maxTokens = 1000;
  }

  async generateTaskSuggestions(task, user) {
    try {
      const context = this.buildUserContext(user);
      const taskContext = this.buildTaskContext(task);
      
      const prompt = `
You are ABY, an intelligent productivity assistant. Generate 5 personalized task completion suggestions for the user.

User Context:
${context}

Task Details:
${taskContext}

Generate 5 diverse suggestions that are:
1. Actionable and specific
2. Tailored to the user's profile and location
3. Consider the task's priority and deadline
4. Include different approaches (DIY, collaborative, location-based, time-based, resource-based)
5. Are emotionally engaging and motivating

Format each suggestion as a clear, concise action item (max 100 characters each).
Return as a JSON array of strings.

Example format:
["Break task into 3 smaller 25-minute focused sessions", "Find a coworking space nearby to boost productivity", "Schedule task for your most productive time (morning)", "Ask a colleague to be your accountability partner", "Use the Pomodoro technique with 5-minute breaks"]
`;

      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.7,
      });

      const suggestions = JSON.parse(response.choices[0].message.content);
      return suggestions;
    } catch (error) {
      console.error('Error generating task suggestions:', error);
      // Fallback suggestions
      return [
        'Break this task into smaller, manageable steps',
        'Set a specific time block to focus on this task',
        'Find a quiet environment to work on this',
        'Use the Pomodoro technique for better focus',
        'Consider collaborating with someone for accountability'
      ];
    }
  }

  async generateLocationBasedSuggestions(task, userLocation) {
    try {
      const prompt = `
Given this task: "${task.title}" - ${task.description}
User location: ${userLocation.city}, ${userLocation.country}
Task category: ${task.category}
Priority: ${task.priority}

Generate 3 location-based suggestions that consider:
1. Nearby venues or services that could help
2. Location-specific opportunities
3. Local resources or communities

Return as a JSON array of strings.
`;

      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.6,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating location suggestions:', error);
      return ['Complete this task at a nearby library or café', 'Look for local meetups related to this task', 'Check if there are local services that could help'];
    }
  }

  async generateDailyReflectionPrompts(user) {
    try {
      const prompt = `
Generate 3 thoughtful daily reflection prompts for a productivity app user.
User profile: ${user.profession || 'Professional'}, Age: ${user.age || 'Adult'}

The prompts should:
1. Be engaging and not feel like work
2. Help users reflect on their productivity and well-being
3. Be answerable in 1-2 sentences
4. Encourage positive thinking and growth mindset

Return as a JSON array of strings.
`;

      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.8,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating reflection prompts:', error);
      return [
        'What was the highlight of your productive day today?',
        'What challenge did you overcome, and how did it make you feel?',
        'What are you most looking forward to accomplishing tomorrow?'
      ];
    }
  }

  async generateMotivationalMessage(user, context = {}) {
    try {
      const prompt = `
Generate a personalized motivational message for a user of a productivity app.
User: ${user.name || 'User'}
Context: ${context.type || 'general'} - ${context.details || ''}
Tone: Encouraging, friendly, and energizing
Length: 1-2 sentences maximum

Make it personal and actionable.
`;

      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.8,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating motivational message:', error);
      return "You're doing great! Every small step forward is progress worth celebrating. Keep going! 🌟";
    }
  }

  async generateTaskBreakdown(task) {
    try {
      const prompt = `
Break down this task into 3-5 actionable steps:
Task: "${task.title}"
Description: ${task.description || 'No description provided'}
Category: ${task.category}
Priority: ${task.priority}
Estimated Duration: ${task.estimatedDuration || 'Not specified'} minutes

Generate clear, sequential steps that:
1. Are specific and actionable
2. Follow a logical order
3. Are appropriately sized (15-45 minutes each)
4. Include any necessary preparation or follow-up

Return as a JSON array of objects with 'title' and 'description' fields.
`;

      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.6,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating task breakdown:', error);
      return [
        { title: 'Plan and prepare', description: 'Gather necessary resources and plan your approach' },
        { title: 'Begin execution', description: 'Start working on the main task components' },
        { title: 'Review and finalize', description: 'Check your work and make final adjustments' }
      ];
    }
  }

  async generateWeeklySummary(user, tasks, analytics) {
    try {
      const prompt = `
Generate a personalized weekly productivity summary for:
User: ${user.name}
Tasks completed: ${analytics.completedTasks}/${analytics.totalTasks}
Most productive day: ${analytics.bestDay || 'N/A'}
Top category: ${analytics.topCategory || 'N/A'}
Completion rate: ${analytics.completionRate}%

Create an encouraging summary that:
1. Celebrates achievements
2. Identifies patterns and insights
3. Provides gentle suggestions for improvement
4. Maintains a positive, motivating tone
5. Is 2-3 sentences long

Include relevant emojis to make it engaging.
`;

      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating weekly summary:', error);
      return `Great week! 🎉 You completed ${analytics.completedTasks} tasks and showed real dedication to your goals. Keep up the momentum! 💪`;
    }
  }

  buildUserContext(user) {
    return `
Name: ${user.name || 'User'}
Age: ${user.age || 'Not specified'}
Location: ${user.location?.city || 'Not specified'}, ${user.location?.country || ''}
Profession: ${user.profession || 'Not specified'}
Premium: ${user.premium?.isPremium ? 'Yes' : 'No'}
Productivity Level: ${user.stats?.completionRate || 0}%
Preferred Work Time: ${user.preferences?.workingHours || 'Not specified'}
Current Goals: ${user.goals?.join(', ') || 'Not specified'}
`;
  }

  buildTaskContext(task) {
    return `
Title: ${task.title}
Description: ${task.description || 'No description'}
Category: ${task.category}
Priority: ${task.priority}
Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
Estimated Duration: ${task.estimatedDuration || 'Not specified'} minutes
Location: ${task.location?.name || 'Not specified'}
Current Status: ${task.status}
Tags: ${task.tags?.join(', ') || 'None'}
`;
  }

  async analyzeProductivityPatterns(user, tasks) {
    try {
      const prompt = `
Analyze this user's productivity patterns and provide insights:

User: ${user.name}
Total tasks: ${tasks.length}
Completed tasks: ${tasks.filter(t => t.status === 'completed').length}
Most common category: ${this.getMostCommonCategory(tasks)}
Average completion time: ${this.getAverageCompletionTime(tasks)} minutes
Most productive time: ${this.getMostProductiveTime(tasks)}

Provide 3 personalized insights about their productivity patterns and 2 actionable recommendations.
Be encouraging and focus on growth opportunities.

Return as JSON object with 'insights' and 'recommendations' arrays.
`;

      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.6,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing productivity patterns:', error);
      return {
        insights: [
          'You have a consistent approach to task completion',
          'Your productivity varies throughout the week',
          'You work well with structured tasks'
        ],
        recommendations: [
          'Try batching similar tasks together for better efficiency',
          'Consider setting specific time blocks for different task categories'
        ]
      };
    }
  }

  getMostCommonCategory(tasks) {
    const categories = tasks.map(t => t.category);
    return categories.sort((a, b) =>
      categories.filter(v => v === a).length - categories.filter(v => v === b).length
    ).pop();
  }

  getAverageCompletionTime(tasks) {
    const completedTasks = tasks.filter(t => t.actualDuration);
    if (completedTasks.length === 0) return 0;
    return Math.round(completedTasks.reduce((sum, t) => sum + t.actualDuration, 0) / completedTasks.length);
  }

  getMostProductiveTime(tasks) {
    const completedTasks = tasks.filter(t => t.completedAt);
    if (completedTasks.length === 0) return 'Not enough data';
    
    const hours = completedTasks.map(t => new Date(t.completedAt).getHours());
    const hourCounts = {};
    hours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1);
    
    const mostProductiveHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b
    );
    
    return `${mostProductiveHour}:00`;
  }
}

module.exports = { aiService: new AIService() }; 