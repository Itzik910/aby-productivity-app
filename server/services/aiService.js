const AIUsage = require('../models/AIUsage');
const User = require('../models/User');
const Task = require('../models/Task');

// Only initialize OpenAI if a valid API key is provided. This prevents the
// application from crashing during startup in development or testing
// environments where the key might be absent. All downstream calls are already
// wrapped in try/catch blocks with sensible fallbacks, so disabling the client
// here gracefully degrades AI-powered features without affecting core flows.
let openai = null;

console.log('🔍 [AI SERVICE DEBUG] Checking OpenAI API Key...');
console.log('🔑 [AI SERVICE DEBUG] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('🔑 [AI SERVICE DEBUG] OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
console.log('🔑 [AI SERVICE DEBUG] OPENAI_API_KEY preview:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 20)}...` : 'NOT SET');

if (process.env.OPENAI_API_KEY) {
  // eslint-disable-next-line global-require
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('✅ [AI SERVICE DEBUG] OpenAI client initialized successfully');
} else {
  console.warn('❌ [AI SERVICE DEBUG] OPENAI_API_KEY environment variable is missing – AI features are disabled.');
}

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

  async generateTaskSuggestionsWithUsage(task, user) {
    console.log('🤖 [AI DEBUG] generateTaskSuggestionsWithUsage called');
    console.log('🤖 [AI DEBUG] OpenAI client status:', !!openai);
    console.log('🤖 [AI DEBUG] Task:', task.title);
    console.log('🤖 [AI DEBUG] User:', user.name);
    
    if (!openai) {
      console.log('❌ [AI DEBUG] No OpenAI client available, using fallback suggestions');
      // No OpenAI client available, return fallback suggestions
      return {
        suggestions: this.getFallbackSuggestions(task),
        usageData: null
      };
    }

    console.log('✅ [AI DEBUG] OpenAI client available, attempting two-stage generation');
    
    try {
      // STAGE 1: Generate enhanced prompt using first AI agent
      console.log('🔄 [AI DEBUG] Stage 1: Generating enhanced prompt...');
      const enhancedPrompt = await this.generateEnhancedPrompt(task, user);
      console.log('✅ [AI DEBUG] Stage 1 completed, prompt length:', enhancedPrompt.length);
      
      // STAGE 2: Use enhanced prompt to generate structured suggestions
      console.log('🔄 [AI DEBUG] Stage 2: Generating structured suggestions...');
      const structuredSuggestions = await this.generateStructuredSuggestions(enhancedPrompt, task, user);
      console.log('✅ [AI DEBUG] Stage 2 completed, suggestions:', structuredSuggestions.suggestions.length);
      
      return structuredSuggestions;
    } catch (error) {
      console.error('❌ [AI DEBUG] Error in two-stage AI generation:', error);
      
      // Return fallback suggestions with error tracking
      return {
        suggestions: this.getFallbackSuggestions(task),
        usageData: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          model: this.defaultModel,
          error: true,
          errorMessage: error.message
        }
      };
    }
  }

  // STAGE 1: First AI Agent - Create enhanced prompt
  async generateEnhancedPrompt(task, user) {
    const userContext = this.buildDetailedUserContext(user);
    const taskContext = this.buildDetailedTaskContext(task);
    
    const promptGeneratorPrompt = `
You are an AI prompt engineer for a productivity app called ABY. Your job is to create a detailed, personalized prompt that another AI agent will use to generate specific, actionable task completion suggestions.

USER PROFILE:
${userContext}

TASK TO COMPLETE:
${taskContext}

YOUR MISSION:
Create a comprehensive prompt string that another AI agent will use to generate 5 personalized, actionable suggestions for completing this specific task. The prompt should:

1. Include all relevant user context (location, age, lifestyle, etc.)
2. Specify the exact task requirements
3. Consider user's constraints and preferences
4. Focus on real-world, immediately actionable solutions
5. Request specific local businesses, services, or resources when applicable

EXAMPLE OUTPUT FORMAT:
"Generate 5 specific, actionable suggestions for a 30-year-old software engineer in New York City to complete the task 'lose weight'. Consider their sedentary job, limited time due to long work hours, and preference for efficient solutions. Include specific gym recommendations near their work area (Manhattan Financial District), meal delivery services that cater to their dietary needs, time-efficient workout routines that fit their schedule, and collaborative options like finding workout partners. Focus on practical, immediately implementable solutions rather than generic advice."

Generate a similar detailed prompt for the given user and task:
`;

    const promptResponse = await openai.chat.completions.create({
      model: this.defaultModel,
      messages: [{ role: 'user', content: promptGeneratorPrompt }],
      max_tokens: 800,
      temperature: 0.4,
    });

    return promptResponse.choices[0].message.content.trim();
  }

  // STAGE 2: Second AI Agent - Generate structured suggestions
  async generateStructuredSuggestions(enhancedPrompt, task, user) {
    const structuredPrompt = `
${enhancedPrompt}

CRITICAL RESPONSE FORMAT REQUIREMENTS:
You MUST respond with a valid JSON array of exactly 5 objects. Each object must have:
- "header": Short, compelling title (max 50 characters)
- "details": Specific, actionable instructions (100-200 characters) 
- "type": One of ["location", "diy", "service", "timing", "collaboration"]
- "actionable": Always true

EXAMPLES:
[
  {"header": "Planet Fitness Downtown - $10/month", "details": "Join Planet Fitness at 123 Main St. Open 24/7, perfect for your late work schedule. Black Card membership includes massage chairs.", "type": "location", "actionable": true},
  {"header": "HelloFresh meal delivery service", "details": "Order HelloFresh for portion-controlled, healthy meals delivered weekly. Saves 5+ hours of meal planning and grocery shopping.", "type": "service", "actionable": true},
  {"header": "15-min morning bodyweight routine", "details": "Start with 5 push-ups, 10 squats, 30-sec plank daily at 6:30 AM before work. Gradually increase reps each week.", "type": "diy", "actionable": true}
]

Respond with ONLY the JSON array, no additional text:
`;

    const suggestionsResponse = await openai.chat.completions.create({
      model: this.defaultModel,
      messages: [{ role: 'user', content: structuredPrompt }],
      max_tokens: 1500,
      temperature: 0.2, // Very low temperature for consistent JSON formatting
    });

    let suggestions;
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    // Calculate total token usage from both API calls
    if (suggestionsResponse.usage) {
      outputTokens = suggestionsResponse.usage.completion_tokens;
      inputTokens = suggestionsResponse.usage.prompt_tokens;
      totalTokens = suggestionsResponse.usage.total_tokens;
    }

    try {
      const rawContent = suggestionsResponse.choices[0].message.content.trim();
      suggestions = JSON.parse(rawContent);
      
      // Validate structure
      if (!Array.isArray(suggestions) || suggestions.length !== 5) {
        throw new Error(`Invalid suggestion format: expected array of 5, got ${suggestions?.length || 'non-array'}`);
      }
      
      // Validate each suggestion has required fields
      suggestions.forEach((suggestion, index) => {
        if (!suggestion.header || !suggestion.details || !suggestion.type) {
          throw new Error(`Missing required fields in suggestion ${index + 1}`);
        }
        if (!['location', 'diy', 'service', 'timing', 'collaboration'].includes(suggestion.type)) {
          throw new Error(`Invalid type "${suggestion.type}" in suggestion ${index + 1}`);
        }
      });
      
    } catch (parseError) {
      console.error('Error parsing structured AI response:', parseError);
      console.error('Raw response:', suggestionsResponse.choices[0].message.content);
      suggestions = this.getFallbackSuggestions(task);
    }
    
    return {
      suggestions,
      usageData: {
        inputTokens,
        outputTokens,
        totalTokens,
        model: suggestionsResponse.model || this.defaultModel,
        error: false
      }
    };
  }

  getFallbackSuggestions(task) {
    const taskTitle = task.title.toLowerCase();
    const category = task.category;
    
    // Generate contextual fallbacks based on task content
    if (taskTitle.includes('haircut') || taskTitle.includes('hair')) {
      return [
        {"header": "Find nearby barber shops", "details": "Search Google Maps for highly-rated barber shops within 2 miles of your location", "type": "location", "actionable": true},
        {"header": "Book online appointment", "details": "Use apps like StyleSeat or Booksy to find and book appointments with available stylists", "type": "service", "actionable": true},
        {"header": "DIY trim at home", "details": "Watch YouTube tutorials for basic trimming techniques and use proper hair scissors", "type": "diy", "actionable": true},
        {"header": "Ask friends for recommendations", "details": "Text 3 friends who have great haircuts and ask for their stylist recommendations", "type": "collaboration", "actionable": true},
        {"header": "Schedule during lunch break", "details": "Book a 30-minute appointment during your lunch hour at a quick-service salon", "type": "timing", "actionable": true}
      ];
    }
    
    if (taskTitle.includes('grocery') || taskTitle.includes('shopping')) {
      return [
        {"header": "Order for pickup", "details": "Use store app to order groceries for pickup on your way home from work", "type": "service", "actionable": true},
        {"header": "Shop during off-peak hours", "details": "Go early morning (7-8am) or late evening (8-9pm) to avoid crowds and long lines", "type": "timing", "actionable": true},
        {"header": "Use delivery service", "details": "Order through Instacart, DoorDash, or store delivery for convenient home delivery", "type": "service", "actionable": true},
        {"header": "Make detailed shopping list", "details": "Organize list by store sections (produce, dairy, etc.) to shop efficiently", "type": "diy", "actionable": true},
        {"header": "Shop with family/roommate", "details": "Coordinate with household members to split the shopping or make it a joint trip", "type": "collaboration", "actionable": true}
      ];
    }
    
    // Generic fallbacks for other tasks
    return [
      {"header": "Break into smaller steps", "details": "Divide this task into 3-4 smaller, manageable actions you can complete one at a time", "type": "diy", "actionable": true},
      {"header": "Schedule specific time block", "details": "Block 1-2 hours in your calendar when you're most productive to focus on this task", "type": "timing", "actionable": true},
      {"header": "Find relevant resources online", "details": "Search for tutorials, guides, or tools that can help you complete this task more efficiently", "type": "service", "actionable": true},
      {"header": "Ask someone for help", "details": "Identify a friend, colleague, or expert who could provide guidance or assistance", "type": "collaboration", "actionable": true},
      {"header": "Set up your environment", "details": "Prepare your workspace with all necessary tools and materials before starting", "type": "diy", "actionable": true}
    ];
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

  buildDetailedUserContext(user) {
    const location = user.location || {};
    const premiumDetails = user.premiumDetails || {};
    const preferences = user.preferences || {};
    const stats = user.stats || {};
    
    // Calculate user behavior patterns
    const completionRate = stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
    const experienceLevel = stats.level >= 5 ? 'Advanced' : stats.level >= 3 ? 'Intermediate' : 'Beginner';
    const activityLevel = stats.currentStreak >= 7 ? 'Highly Active' : stats.currentStreak >= 3 ? 'Moderately Active' : 'New/Sporadic';
    
    return `
PERSONAL INFORMATION:
- Name: ${user.name}
- Age: ${user.age || 'Not specified'}
- Gender: ${premiumDetails.gender || 'Not specified'}
- Profession: ${user.profession || 'Not specified'}
- Location: ${location.city || 'Unknown City'}, ${location.country || 'Unknown Country'}
- Address Area: ${premiumDetails.address?.city || location.city || 'Not specified'}

LIFESTYLE & SCHEDULE:
- Work Schedule: ${premiumDetails.workSchedule || 'Standard 9-5'}
- Sleep Pattern: ${premiumDetails.sleepPattern || 'Regular'}
- Stress Level: ${premiumDetails.stressLevel || 'Moderate'}
- Energy Level: Generally ${premiumDetails.stressLevel === 'low' ? 'High' : premiumDetails.stressLevel === 'very_high' ? 'Low' : 'Moderate'}

INTERESTS & GOALS:
- Primary Interests: ${premiumDetails.interests?.slice(0, 3).join(', ') || 'Not specified'}
- Life Goals: ${premiumDetails.goals?.slice(0, 3).join(', ') || 'Not specified'}
- Dietary Restrictions: ${premiumDetails.dietaryRestrictions?.join(', ') || 'None'}

PRODUCTIVITY & BEHAVIOR PATTERNS:
- Experience Level: ${experienceLevel} (Level ${stats.level || 1})
- Activity Level: ${activityLevel} (${stats.currentStreak || 0} day streak)
- Task Completion Rate: ${completionRate}% (${stats.completedTasks || 0}/${stats.totalTasks || 0} completed)
- Preferred Communication: ${premiumDetails.preferredCommunication || 'In-app notifications'}
- Premium Features: ${user.premium?.isPremium ? 'Available' : 'Limited to free tier'}

ACCESSIBILITY & PREFERENCES:
- Accessibility Needs: ${premiumDetails.accessibilityNeeds?.join(', ') || 'None specified'}
- Language: ${preferences.language || 'English'}
- Theme Preference: ${preferences.theme || 'Auto'}
`;
  }

  buildDetailedTaskContext(task) {
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const timeUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    const urgencyLevel = timeUntilDue <= 1 ? 'URGENT' : timeUntilDue <= 3 ? 'SOON' : 'NORMAL';
    
    return `
TASK DETAILS:
- Title: "${task.title}"
- Description: ${task.description || 'No description provided'}
- Category: ${task.category}
- Priority: ${task.priority}
- Current Status: ${task.status}

TIMING:
- Due Date: ${dueDate.toLocaleDateString()}
- Days Until Due: ${timeUntilDue} days
- Urgency Level: ${urgencyLevel}
- Estimated Duration: ${task.estimatedDuration || 'Not specified'} minutes

CONTEXT:
- This is a ${task.category} task with ${task.priority} priority
- User needs specific, actionable suggestions to complete: "${task.title}"
- Focus on real-world, immediate solutions the user can execute
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