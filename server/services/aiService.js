const OpenAI = require('openai');
const AIUsage = require('../models/AIUsage');
const User = require('../models/User');
const Task = require('../models/Task');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.prompts = {
      taskSuggestion: this.getTaskSuggestionPrompt(),
      completionHelp: this.getCompletionHelpPrompt(),
      optimization: this.getOptimizationPrompt(),
      locationBased: this.getLocationBasedPrompt(),
      moodAnalysis: this.getMoodAnalysisPrompt(),
      productivityInsight: this.getProductivityInsightPrompt()
    };
  }

  // Task Suggestion Prompt
  getTaskSuggestionPrompt() {
    return `You are an intelligent productivity assistant helping users complete their tasks more effectively. 

Given a task and user context, provide 5 personalized suggestions to help complete the task. Each suggestion should be:
1. Specific and actionable
2. Tailored to the user's context (location, time, mood, profession)
3. Different in approach (DIY, location-based, collaboration, optimization, timing)

User Context:
- Profession: {profession}
- Location: {location}
- Time of day: {timeOfDay}
- Current mood: {mood}
- Energy level: {energy}
- Recent completed tasks: {recentTasks}

Task: {taskTitle}
Description: {taskDescription}

Provide suggestions in this JSON format:
{
  "suggestions": [
    {
      "text": "suggestion text",
      "type": "completion|optimization|location|timing|collaboration",
      "confidence": 0.85,
      "reasoning": "why this suggestion is relevant"
    }
  ],
  "stepByStepBreakdown": [
    {
      "step": "step description",
      "estimatedTime": 15,
      "difficulty": "easy|medium|hard"
    }
  ],
  "motivationalMessage": "encouraging message",
  "relatedTasks": ["related task 1", "related task 2"]
}`;
  }

  // Completion Help Prompt
  getCompletionHelpPrompt() {
    return `You are helping a user complete a task that they're struggling with. 

User Context:
- Task: {taskTitle}
- Current progress: {progress}%
- Time spent: {timeSpent} minutes
- Current mood: {mood}
- Energy level: {energy}

Provide specific, actionable advice to help them complete this task. Focus on:
1. Breaking down remaining work into smaller steps
2. Motivation and encouragement
3. Practical tips based on their current state
4. Alternative approaches if they're stuck

Format your response as JSON with:
{
  "suggestions": [
    {
      "text": "specific advice",
      "type": "completion",
      "confidence": 0.9,
      "reasoning": "why this will help"
    }
  ],
  "stepByStepBreakdown": [
    {
      "step": "next action to take",
      "estimatedTime": 10,
      "difficulty": "easy"
    }
  ],
  "motivationalMessage": "encouraging message",
  "blockerAnalysis": "what might be blocking progress"
}`;
  }

  // Optimization Prompt
  getOptimizationPrompt() {
    return `You are a productivity optimization expert. Analyze the user's task and suggest ways to make it more efficient.

User Context:
- Task: {taskTitle}
- Estimated duration: {estimatedDuration} minutes
- Category: {category}
- Priority: {priority}
- User's profession: {profession}

Suggest optimizations that:
1. Reduce time and effort
2. Improve quality of outcome
3. Leverage user's strengths and context
4. Consider available tools and resources

Provide JSON response with:
{
  "suggestions": [
    {
      "text": "optimization suggestion",
      "type": "optimization",
      "confidence": 0.8,
      "reasoning": "why this optimization works"
    }
  ],
  "timeSavings": "estimated time saved",
  "qualityImprovement": "how this improves quality",
  "toolsNeeded": ["tool1", "tool2"]
}`;
  }

  // Location-Based Prompt
  getLocationBasedPrompt() {
    return `You are a location-aware productivity assistant. The user is at {location} and has a task to complete.

Location Context:
- City: {city}
- Country: {country}
- Time: {timeOfDay}
- Weather: {weather}

Task: {taskTitle}

Suggest location-specific approaches that:
1. Use nearby resources and services
2. Consider local context and timing
3. Optimize for the user's current location
4. Suggest nearby places that could help

Provide JSON response with:
{
  "suggestions": [
    {
      "text": "location-specific suggestion",
      "type": "location",
      "confidence": 0.85,
      "reasoning": "why this location approach works"
    }
  ],
  "nearbyPlaces": [
    {
      "name": "place name",
      "type": "store|service|facility",
      "distance": "0.5km",
      "relevance": "why this place helps"
    }
  ],
  "localTips": ["tip1", "tip2"],
  "timingAdvice": "best time to do this locally"
}`;
  }

  // Mood Analysis Prompt
  getMoodAnalysisPrompt() {
    return `You are analyzing the user's mood and energy to suggest the best approach for their task.

Current State:
- Mood: {mood}
- Energy: {energy}
- Time of day: {timeOfDay}
- Recent activity: {recentActivity}

Task: {taskTitle}
Priority: {priority}

Based on their current state, suggest:
1. Whether to proceed with the task now or later
2. How to approach the task given their mood
3. Energy-appropriate task modifications
4. Mood-boosting activities if needed

Provide JSON response with:
{
  "suggestions": [
    {
      "text": "mood-appropriate suggestion",
      "type": "timing",
      "confidence": 0.9,
      "reasoning": "why this fits their current state"
    }
  ],
  "recommendedTiming": "now|later|tomorrow",
  "energyLevel": "low|medium|high",
  "moodBoosters": ["activity1", "activity2"],
  "taskModifications": "how to adjust the task"
}`;
  }

  // Productivity Insight Prompt
  getProductivityInsightPrompt() {
    return `You are analyzing the user's productivity patterns to provide personalized insights.

User Stats:
- Total tasks completed: {totalTasks}
- Current streak: {currentStreak}
- Average completion time: {avgCompletionTime}
- Preferred categories: {preferredCategories}
- Most productive time: {mostProductiveTime}

Recent Performance:
- Tasks completed today: {todayCompleted}
- Tasks overdue: {overdueTasks}
- Focus score: {focusScore}

Provide insights that:
1. Celebrate achievements
2. Identify patterns and trends
3. Suggest improvements
4. Motivate continued progress

Provide JSON response with:
{
  "insights": [
    {
      "text": "insight about their productivity",
      "type": "achievement|pattern|improvement",
      "confidence": 0.8
    }
  ],
  "achievements": ["achievement1", "achievement2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "motivationalMessage": "encouraging message"
}`;
  }

  // Main method to generate AI suggestions
  async generateSuggestions(userId, taskId, requestType, additionalContext = {}) {
    const startTime = Date.now();
    
    try {
      // Get user and task data
      const user = await User.findById(userId);
      const task = await Task.findById(taskId);
      
      if (!user || !task) {
        throw new Error('User or task not found');
      }

      // Prepare context
      const context = await this.buildContext(user, task, additionalContext);
      
      // Get appropriate prompt
      const prompt = this.prompts[requestType];
      if (!prompt) {
        throw new Error(`Unknown request type: ${requestType}`);
      }

      // Fill prompt template
      const filledPrompt = this.fillPromptTemplate(prompt, context);

      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful productivity assistant. Always respond with valid JSON."
          },
          {
            role: "user",
            content: filledPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0].message.content;
      const parsedResponse = JSON.parse(response);

      // Calculate tokens and cost
      const tokens = {
        input: completion.usage.prompt_tokens,
        output: completion.usage.completion_tokens,
        total: completion.usage.total_tokens
      };

      const cost = this.calculateCost(tokens);

      // Log AI usage
      const aiUsage = new AIUsage({
        user: userId,
        requestType,
        input: {
          taskTitle: task.title,
          taskDescription: task.description,
          userContext: context.userContext,
          userPreferences: context.userPreferences
        },
        response: parsedResponse,
        tokens,
        cost,
        performance: {
          responseTime: Date.now() - startTime
        },
        context: {
          userLevel: user.stats.level,
          userStreak: user.stats.currentStreak,
          totalTasksCompleted: user.stats.completedTasks,
          averageTaskCompletionTime: context.avgCompletionTime,
          preferredCategories: context.preferredCategories,
          activeChallenges: context.activeChallenges
        }
      });

      await aiUsage.save();

      // Update user AI usage stats
      await this.updateUserAIStats(userId, tokens, cost);

      return {
        success: true,
        data: parsedResponse,
        usage: {
          tokens,
          cost,
          responseTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Log failed request
      const aiUsage = new AIUsage({
        user: userId,
        requestType,
        performance: {
          responseTime: Date.now() - startTime,
          errorOccurred: true,
          errorMessage: error.message
        }
      });
      await aiUsage.save();

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Build context for AI requests
  async buildContext(user, task, additionalContext) {
    // Get user's recent tasks
    const recentTasks = await Task.find({ 
      user: user._id, 
      status: 'completed' 
    })
    .sort({ completedAt: -1 })
    .limit(5)
    .select('title');

    // Get user's preferred categories
    const categoryStats = await Task.aggregate([
      { $match: { user: user._id, status: 'completed' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    // Calculate average completion time
    const avgCompletionTime = await Task.aggregate([
      { $match: { user: user._id, status: 'completed', actualDuration: { $exists: true } } },
      { $group: { _id: null, avgTime: { $avg: '$actualDuration' } } }
    ]);

    return {
      userContext: {
        location: user.location,
        timeOfDay: this.getTimeOfDay(),
        weather: additionalContext.weather || 'unknown',
        mood: additionalContext.mood || 'neutral',
        energy: additionalContext.energy || 'medium',
        profession: user.profession,
        recentTasks: recentTasks.map(t => t.title)
      },
      userPreferences: {
        theme: user.preferences.theme,
        language: user.preferences.language,
        notificationFrequency: user.preferences.notifications.frequency
      },
      taskContext: {
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        dueDate: task.dueDate,
        progress: task.progress.percentage,
        estimatedDuration: task.estimatedDuration,
        actualDuration: task.actualDuration
      },
      userStats: {
        totalTasks: user.stats.totalTasks,
        completedTasks: user.stats.completedTasks,
        currentStreak: user.stats.currentStreak,
        longestStreak: user.stats.longestStreak,
        level: user.stats.level
      },
      preferredCategories: categoryStats.map(cat => cat._id),
      avgCompletionTime: avgCompletionTime[0]?.avgTime || 30,
      activeChallenges: additionalContext.activeChallenges || []
    };
  }

  // Fill prompt template with context
  fillPromptTemplate(prompt, context) {
    return prompt
      .replace('{profession}', context.userContext.profession)
      .replace('{location}', context.userContext.location?.city || 'unknown')
      .replace('{timeOfDay}', context.userContext.timeOfDay)
      .replace('{mood}', context.userContext.mood)
      .replace('{energy}', context.userContext.energy)
      .replace('{recentTasks}', context.userContext.recentTasks.join(', '))
      .replace('{taskTitle}', context.taskContext.title)
      .replace('{taskDescription}', context.taskContext.description || '')
      .replace('{progress}', context.taskContext.progress)
      .replace('{timeSpent}', context.taskContext.actualDuration || 0)
      .replace('{estimatedDuration}', context.taskContext.estimatedDuration || 30)
      .replace('{category}', context.taskContext.category)
      .replace('{priority}', context.taskContext.priority)
      .replace('{city}', context.userContext.location?.city || 'unknown')
      .replace('{country}', context.userContext.location?.country || 'unknown')
      .replace('{weather}', context.userContext.weather)
      .replace('{totalTasks}', context.userStats.totalTasks)
      .replace('{currentStreak}', context.userStats.currentStreak)
      .replace('{avgCompletionTime}', context.avgCompletionTime)
      .replace('{preferredCategories}', context.preferredCategories.join(', '))
      .replace('{mostProductiveTime}', 'morning') // This would be calculated from analytics
      .replace('{todayCompleted}', 0) // This would be calculated
      .replace('{overdueTasks}', 0) // This would be calculated
      .replace('{focusScore}', 75); // This would be calculated
  }

  // Calculate cost based on tokens
  calculateCost(tokens) {
    // GPT-4 pricing (approximate)
    const inputCostPer1K = 0.03;
    const outputCostPer1K = 0.06;
    
    const inputCost = (tokens.input / 1000) * inputCostPer1K;
    const outputCost = (tokens.output / 1000) * outputCostPer1K;
    const totalCost = inputCost + outputCost;
    
    return {
      inputCost: Math.round(inputCost * 100) / 100,
      outputCost: Math.round(outputCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      currency: 'USD'
    };
  }

  // Update user AI usage statistics
  async updateUserAIStats(userId, tokens, cost) {
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'aiUsage.totalRequests': 1,
        'aiUsage.tokensUsed': tokens.total,
        'aiUsage.monthlyRequests': 1,
        'aiUsage.monthlyTokens': tokens.total
      },
      $set: {
        'aiUsage.lastRequestDate': new Date()
      }
    });
  }

  // Get time of day
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  // Get AI usage analytics
  async getUsageAnalytics(userId, days = 30) {
    return await AIUsage.getUserStats(userId, days);
  }

  // Get popular request types
  async getPopularRequestTypes(days = 7) {
    return await AIUsage.getPopularRequestTypes(days);
  }

  // Get feedback insights
  async getFeedbackInsights(days = 30) {
    return await AIUsage.getFeedbackInsights(days);
  }
}

module.exports = new AIService(); 