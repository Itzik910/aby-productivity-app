const AIUsage = require('../models/AIUsage');
const User = require('../models/User');
const Task = require('../models/Task');
const { getPlaceSuggestions, isDIYTask } = require('./placeService');

let openai = null;

console.log('🔍 [AI SERVICE DEBUG] Checking OpenAI API Key...');
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('✅ [AI SERVICE DEBUG] OpenAI client initialized successfully');
} else {
  console.warn('❌ [AI SERVICE DEBUG] OPENAI_API_KEY environment variable is missing – AI features are disabled.');
}

class AIService {
  constructor() {
    // Upgraded from gpt-3.5-turbo for dramatically better instruction following
    this.defaultModel = 'gpt-4o-mini'; 
    this.maxTokens = 1000;
  }

  async generateFiveWays(task, user) {
    const taskCtx = this.buildDetailedTaskContext(task);
    const userCtx = this.buildDetailedUserContext(user);
    const taskIsDIY = isDIYTask(task);
    const placeSuggestions = await getPlaceSuggestions(task, user);
    const placeCtx = this.buildPlaceContext(placeSuggestions);
    const homeAddress = user?.addresses?.home || 'Not provided';
    const workAddress = user?.addresses?.work || 'Not provided';

    // For DIY/home tasks, weight approaches towards diy + timing + collaboration
    const defaultTypes = taskIsDIY
      ? ['diy', 'step_by_step', 'timing_based', 'collaboration', 'hire_service']
      : ['diy', 'hire_service', 'location_based', 'timing_based', 'collaboration'];

    const diyNote = taskIsDIY
      ? '\nNOTE: This is a HOME/DIY task. Do NOT suggest finding physical shops or external locations. Focus on: self-completion steps, gathering materials already at home, scheduling, online ordering, or hiring someone to come to the home address.'
      : '';

    console.log('[AI FIVE-WAYS DEBUG] Context snapshot:', {
      taskId: task?._id,
      taskTitle: task?.title,
      userId: user?._id,
      homeAddress,
      workAddress,
      placeSuggestionCount: placeSuggestions.length
    });
    console.log('[AI FIVE-WAYS DEBUG] Places sent to OpenAI:', JSON.stringify(placeSuggestions, null, 2));
    console.log('[AI FIVE-WAYS DEBUG] Place context:', placeCtx || 'No nearby businesses were found.');

    const defaultTypes = taskIsDIY
      ? ['diy', 'step_by_step', 'timing_based', 'collaboration', 'hire_service']
      : ['diy', 'hire_service', 'location_based', 'timing_based', 'collaboration'];

    const diyNote = taskIsDIY
      ? '\nNOTE: This is a HOME/DIY task. Do NOT suggest finding physical shops or external locations. Focus on: self-completion steps, gathering materials already at home, scheduling, online ordering, or hiring someone to come to the home address.'
      : '';

    if (!openai) {
      return this.enrichFiveWays(this.getFiveWaysFallback(task, placeSuggestions), task, user, placeSuggestions);
    }

    try {
      // Stage 1: decide which 5 approaches are best for this task
      const stage1 = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: `You are ABY, a smart productivity assistant. Given the task and user below, decide the 5 most natural, distinct ways to complete this task.
            Default approach types are: ${defaultTypes.join(', ')}. You MAY substitute a type if a better one exists for this specific task.
            Return ONLY a JSON array of exactly 5 type strings, e.g. ["diy","hire_service","location_based","timing_based","collaboration"]

TASK:\n${taskCtx}\n\nUSER:\n${userCtx}\n\nNEARBY BUSINESSES:\n${placeCtx || 'No nearby businesses were found.'}`
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      let approachTypes = defaultTypes;
      try {
        const parsed = this.parseJsonResponse(stage1.choices[0].message.content);
        if (Array.isArray(parsed) && parsed.length === 5) approachTypes = parsed;
      } catch {
        // keep defaults
      }

      // Stage 2: for each approach, generate title + steps + estimated time
      const stage2 = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: `You are ABY. For the task below, generate highly tailored, specific instructions for exactly ${approachTypes.length} ways to complete it.
            Approach types in order: ${approachTypes.join(', ')}
${diyNote}
TASK:\n${taskCtx}

HOME ADDRESS:\n${homeAddress}
WORK ADDRESS:\n${workAddress}

NEARBY BUSINESSES:\n${placeCtx || 'No nearby businesses were found.'}

CRITICAL RULES FOR LOCAL REALISM:
1. For 'location_based' or 'hire_service' options, you MUST use the actual real business names, addresses, and travel durations provided in the NEARBY BUSINESSES section.
2. NEVER invent an address. If a business address is not present in the context, say "address not provided" or avoid naming the address.
3. NEVER output generic steps like "Search for a shop near you" or "Go to the selected business". Instead, output hyper-specific actions using the provided business names and addresses.
4. Do not use fake addresses such as "123 Main St" or "123 Flower St" unless they appear in the context exactly.
5. Extrapolate specific details tailored to the task intent to make it authentic (e.g., if the task is "buy flowers", explicitly suggest buying items like "White Lilies" or "Roses" in the action steps).

Return ONLY a valid JSON array of exactly ${approachTypes.length} objects, each with:
- "wayId": index 0-4
- "wayTitle": short title featuring a specific local business name if applicable (max 50 chars)
- "type": the approach type string
- "estimatedMinutes": integer (including commute time if location-based)
- "estimatedCostRange": string like "$10-$25" matching the provided business costs
- "steps": array of 3-5 strings, each a clear hyper-specific action step`
          }
        ],
        max_tokens: 1800,
        temperature: 0.2
      });

      const ways = this.parseJsonResponse(stage2.choices[0].message.content);
      if (!Array.isArray(ways) || ways.length !== 5) throw new Error('Bad response length');
      const sanitizedWays = this.sanitizeFiveWays(ways, placeSuggestions);
      return this.enrichFiveWays(sanitizedWays, task, user, placeSuggestions);
    } catch (error) {
      console.error('generateFiveWays error:', error.message);
      return this.enrichFiveWays(this.getFiveWaysFallback(task, placeSuggestions), task, user, placeSuggestions);
    }
  }

  sanitizeFiveWays(ways, placeSuggestions = []) {
    const businessTypes = ['location_based', 'hire_service', 'service'];
    const fallbackPlaces = placeSuggestions.length > 0 ? placeSuggestions : [];

    return ways.map((way, index) => {
      const normalizedType = String(way.type || '').toLowerCase().replace(/[\s-]+/g, '_');
      if (!businessTypes.includes(normalizedType)) {
        return way;
      }

      const place = fallbackPlaces.find(p => p.address) || fallbackPlaces[0];
      if (!place || !place.address) return way;

      const actionVerb = normalizedType === 'hire_service' ? 'Contact' : 'Go to';
      const travelText = place.durationText || 'about 15-30 minutes away';
      const costText = place.costText || way.estimatedCostRange || 'Cost unknown';

      return {
        ...way,
        type: normalizedType,
        wayTitle: normalizedType === 'hire_service'
          ? `Hire ${place.name}`
          : `Visit ${place.name}`,
        estimatedMinutes: way.estimatedMinutes || 30,
        estimatedCostRange: costText,
        steps: [
          `${actionVerb} ${place.name} at ${place.address}.`,
          `Confirm the exact service you need and ask for the price estimate (${costText}).`,
          `Plan for ${travelText} and make sure the timing works for your schedule.`,
          `Complete the task with ${place.name} and keep the receipt or confirmation.`
        ]
      };
    });
  }

  async enrichFiveWays(ways, task, user, placeSuggestions = []) {
    return ways.map((way) => {
      const normalizedType = String(way.type || '').toLowerCase().replace(/[\s-]+/g, '_');
      const relevantPlaces = ['location_based', 'service', 'hire_service'].includes(normalizedType)
        ? placeSuggestions
        : [];
      const businessCostRange = this.buildCostRange(relevantPlaces);

      return {
        ...way,
        type: normalizedType || way.type,
        recommendedPlaces: relevantPlaces,
        estimatedCostRange: way.estimatedCostRange || businessCostRange
      };
    });
  }

  buildPlaceContext(placeSuggestions = []) {
    if (!placeSuggestions.length) return '';
    return placeSuggestions.map((place, index) => {
      const cost = place.costText || 'Cost unknown';
      const rating = place.rating ? `${place.rating.toFixed(1)}★` : 'No rating';
      
      // Captured travel metrics if your placeService evaluates distance/duration matrix properties
      const travelInfo = place.durationText ? ` | Travel Time: ${place.durationText} (${place.distanceText || ''})` : '';
      
      return `${index + 1}. Name: "${place.name}" | Address: ${place.address}${travelInfo} | Rating: ${rating} | Estimated Cost: ${cost}`;
    }).join('\n');
  }

  async planMyDay(tasks, user) {
    const today = new Date().toISOString().split('T')[0];
    const homeAddress = user?.addresses?.home || 'unknown';
    const workAddress = user?.addresses?.work || 'unknown';

    const taskList = tasks.slice(0, 20).map((t, i) => (
      `${i + 1}. "${t.title}" | priority: ${t.priority} | due: ${t.dueDate?.toString().split('T')[0] || 'no date'} | category: ${t.category}${t.location?.name ? ` | location: ${t.location.name}` : ''}`
    )).join('\n');

    const fallback = () => tasks
      .sort((a, b) => {
        const pOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      })
      .slice(0, 10)
      .map((t, i) => ({
        order: i + 1,
        taskId: String(t._id),
        title: t.title,
        reason: `Priority: ${t.priority}`,
        suggestedTime: `${9 + i}:00`,
        estimatedMinutes: t.estimatedDuration || 30,
      }));

    if (!openai) return { schedule: fallback(), morningBriefing: `Today you have ${tasks.length} tasks. Start with your highest priority items.` };

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{
          role: 'user',
          content: `You are ABY, a smart productivity assistant. Today is ${today}.
User's home: ${homeAddress}. Work: ${workAddress}.
Plan an optimized schedule for these tasks:
${taskList}

Return ONLY a valid JSON object with:
- "morningBriefing": string (1-2 sentences, motivational, mentions total tasks and key priority)
- "schedule": array of objects, each with: taskId (from list number, return as "task_N"), title, order (1-based), reason (why this order), suggestedTime ("HH:MM"), estimatedMinutes
Order by: urgency, deadline proximity, location efficiency.`
        }],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const parsed = this.parseJsonResponse(response.choices[0].message.content);
      return parsed;
    } catch (error) {
      console.error('planMyDay error:', error.message);
      return { schedule: fallback(), morningBriefing: `Today you have ${tasks.length} tasks. Start with your highest priority items.` };
    }
  }

  async breakdownTaskToSteps(task) {
    const fallback = () => [
      { title: 'Define the scope and requirements', description: '' },
      { title: 'Gather necessary resources or information', description: '' },
      { title: 'Execute the main work', description: '' },
      { title: 'Review and check quality', description: '' },
      { title: 'Mark complete or follow up', description: '' },
    ];

    if (!openai) return fallback();

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{
          role: 'user',
          content: `You are ABY. Break down this task into 4-6 concrete, actionable subtasks.
Task: "${task.title}"
Category: ${task.category}
Description: ${task.description || 'None'}

Return ONLY a JSON array of objects, each with "title" (max 80 chars) and "description" (optional, one sentence).`,
        }],
        max_tokens: 600,
        temperature: 0.2,
      });
      const steps = this.parseJsonResponse(response.choices[0].message.content);
      if (!Array.isArray(steps) || steps.length < 2) return fallback();
      return steps;
    } catch (error) {
      console.error('breakdownTaskToSteps error:', error.message);
      return fallback();
    }
  }

  parseJsonResponse(content) {
    const text = String(content || '').trim();
    const stripped = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(stripped);
  }

  buildCostRange(placeSuggestions = []) {
    if (!placeSuggestions.length) return 'unknown';
    const costs = placeSuggestions
      .map(place => place.costText)
      .filter(Boolean);
    return costs.length > 0 ? costs[0] : 'unknown';
  }

  getFiveWaysFallback(task, placeSuggestions = []) {
    const topBusiness = placeSuggestions[0];
    const secondBusiness = placeSuggestions[1];

    return [
      { wayId: 0, wayTitle: `DIY at ${task.title || 'home'}`, type: 'diy', estimatedMinutes: 45, estimatedCostRange: '$0-$20', steps: ['Break the task into small steps', 'Gather the tools or materials you already have', 'Work through each step methodically', 'Check the result and adjust if needed'] },
      { wayId: 1, wayTitle: topBusiness ? `Use ${topBusiness.name}` : 'Hire a local professional', type: 'hire_service', estimatedMinutes: 20, estimatedCostRange: topBusiness?.costText || '$25-$100', steps: topBusiness ? [`Visit or contact ${topBusiness.name} at ${topBusiness.address}`, `Ask for the exact help you need and confirm the price`, 'Book the fastest available slot', 'Bring any reference photos, measurements, or details'] : ['Search for local professionals online', 'Compare reviews and prices', 'Book an appointment', 'Prepare any necessary information or access'] },
      { wayId: 2, wayTitle: secondBusiness ? `Go to ${secondBusiness.name}` : 'Visit a nearby location', type: 'location_based', estimatedMinutes: 60, estimatedCostRange: secondBusiness?.costText || '$10-$50', steps: secondBusiness ? [`Go to ${secondBusiness.name} at ${secondBusiness.address}`, 'Confirm opening hours before you leave', 'Complete the task on-site with the staff or services there', 'Keep the receipt or confirmation for later'] : ['Find the nearest relevant location on Google Maps', 'Check opening hours', 'Plan your visit', 'Complete the task on-site'] },
      { wayId: 3, wayTitle: 'Schedule the best time', type: 'timing_based', estimatedMinutes: 30, estimatedCostRange: '$0', steps: ['Identify your peak productivity window', 'Block that time in your calendar', 'Eliminate distractions beforehand', 'Execute with full focus'] },
      { wayId: 4, wayTitle: 'Collaborate with someone', type: 'collaboration', estimatedMinutes: 50, estimatedCostRange: '$0-$30', steps: ['Identify 1-2 people who could help', 'Reach out and explain what you need', 'Coordinate a time to work together', 'Divide and conquer the task'] }
    ];
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
`;

      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.7,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating task suggestions:', error);
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
    if (!openai) {
      return {
        suggestions: this.getFallbackSuggestions(task),
        usageData: null
      };
    }
    
    try {
      const placeSuggestions = await getPlaceSuggestions(task, user);
      const enhancedPrompt = await this.generateEnhancedPrompt(task, user, placeSuggestions);
      const structuredSuggestions = await this.generateStructuredSuggestions(enhancedPrompt, task, user);
      return structuredSuggestions;
    } catch (error) {
      console.error('❌ [AI DEBUG] Error in two-stage AI generation:', error);
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

  async generateEnhancedPrompt(task, user, placeSuggestions = []) {
    const userContext = this.buildDetailedUserContext(user);
    const taskContext = this.buildDetailedTaskContext(task);
    const placeCtx = this.buildPlaceContext(placeSuggestions);
    
    const promptGeneratorPrompt = `
You are an AI prompt engineer for a productivity app called ABY. Your job is to create a detailed, personalized prompt that another AI agent will use to generate specific, actionable task completion suggestions.

USER PROFILE:
${userContext}

TASK TO COMPLETE:
${taskContext}

NEARBY LOCAL BUSINESSES AVAILABLE:
${placeCtx || 'No specific businesses found.'}

YOUR MISSION:
Create a comprehensive prompt string that another AI agent will use to generate 5 personalized, actionable suggestions. The prompt must explicitly mandate using the specific business names, specific items matching the intent, and concrete durations provided in the context above. Forbid generic placeholders.
`;

    const promptResponse = await openai.chat.completions.create({
      model: this.defaultModel,
      messages: [{ role: 'user', content: promptGeneratorPrompt }],
      max_tokens: 800,
      temperature: 0.4,
    });

    return promptResponse.choices[0].message.content.trim();
  }

  async generateStructuredSuggestions(enhancedPrompt, task, user) {
    const structuredPrompt = `
${enhancedPrompt}

CRITICAL RESPONSE FORMAT REQUIREMENTS:
You MUST respond with a valid JSON array of exactly 5 objects. Each object must have:
- "header": Short, compelling title referencing local businesses or precise actions (max 50 characters)
- "details": Specific, actionable instructions with real locations and tasks (100-200 characters) 
- "type": One of ["location", "diy", "service", "timing", "collaboration"]
- "actionable": Always true

Respond with ONLY the JSON array, no additional text:
`;

    const suggestionsResponse = await openai.chat.completions.create({
      model: this.defaultModel,
      messages: [{ role: 'user', content: structuredPrompt }],
      max_tokens: 1500,
      temperature: 0.2,
    });

    let suggestions;
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    if (suggestionsResponse.usage) {
      outputTokens = suggestionsResponse.usage.completion_tokens;
      inputTokens = suggestionsResponse.usage.prompt_tokens;
      totalTokens = suggestionsResponse.usage.total_tokens;
    }

    try {
      const rawContent = suggestionsResponse.choices[0].message.content.trim();
      suggestions = JSON.parse(rawContent);
      
      if (!Array.isArray(suggestions) || suggestions.length !== 5) {
        throw new Error(`Invalid suggestion format`);
      }
    } catch (parseError) {
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
    if (taskTitle.includes('haircut') || taskTitle.includes('hair')) {
      return [
        {"header": "Find nearby barber shops", "details": "Search Google Maps for highly-rated barber shops within 2 miles of your location", "type": "location", "actionable": true},
        {"header": "Book online appointment", "details": "Use apps like StyleSeat or Booksy to find and book appointments with available stylists", "type": "service", "actionable": true},
        {"header": "DIY trim at home", "details": "Watch YouTube tutorials for basic trimming techniques and use proper hair scissors", "type": "diy", "actionable": true},
        {"header": "Ask friends for recommendations", "details": "Text 3 friends who have great haircuts and ask for their stylist recommendations", "type": "collaboration", "actionable": true},
        {"header": "Schedule during lunch break", "details": "Book a 30-minute appointment during your lunch hour at a quick-service salon", "type": "timing", "actionable": true}
      ];
    }
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
Return as a JSON array of strings containing 3 distinct localized suggestions.
`;
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.6,
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      return ['Complete this task at a nearby library or café', 'Look for local meetups related to this task', 'Check if there are local services that could help'];
    }
  }

  async generateDailyReflectionPrompts(user) {
    try {
      const prompt = `Generate 3 thoughtful daily reflection prompts for a productivity app user. Professional: ${user.profession || 'Professional'}. Return JSON array of strings.`;
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.8,
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      return ['What was the highlight of your productive day today?'];
    }
  }

  async generateMotivationalMessage(user, context = {}) {
    try {
      const prompt = `Generate a personalized motivational message for ${user.name || 'User'}. Short 1-2 sentences.`;
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.8,
      });
      return response.choices[0].message.content.trim();
    } catch (error) {
      return "You're doing great! Keep going! 🌟";
    }
  }

  async generateTaskBreakdown(task) {
    try {
      const prompt = `Break down task into 3-5 structural JSON steps: "${task.title}"`;
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.6,
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      return [{ title: 'Plan and prepare', description: 'Gather necessary resources' }];
    }
  }

  async generateWeeklySummary(user, tasks, analytics) {
    try {
      const prompt = `Generate weekly summary for ${user.name}. Completed ${analytics.completedTasks} tasks.`;
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });
      return response.choices[0].message.content.trim();
    } catch (error) {
      return `Great week! 🎉 You completed ${analytics.completedTasks} tasks.`;
    }
  }

  buildUserContext(user) {
    return `Name: ${user.name || 'User'}\nLocation: ${user.location?.city || 'Not specified'}`;
  }

  buildTaskContext(task) {
    return `Title: ${task.title}\nCategory: ${task.category}`;
  }

  buildDetailedUserContext(user) {
    const location = user.location || {};
    const homeAddress = user.addresses?.home || 'Not provided';
    const workAddress = user.addresses?.work || 'Not provided';
    return `Name: ${user.name}\nLocation: ${location.city || 'Unknown City'}, ${location.country || 'Unknown Country'}\nHome Address: ${homeAddress}\nWork Address: ${workAddress}`;
  }

  buildDetailedTaskContext(task) {
    return `TASK DETAILS:\n- Title: "${task.title}"\n- Description: ${task.description || 'No description provided'}\n- Category: ${task.category}`;
  }

  async analyzeProductivityPatterns(user, tasks) {
    try {
      const prompt = `Analyze productivity: Completed ${tasks.filter(t => t.status === 'completed').length} tasks. Return JSON object with 'insights' and 'recommendations'.`;
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.6,
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      return { insights: ['Consistent approach'], recommendations: ['Batch similar tasks'] };
    }
  }

  async parseNaturalLanguageTask(text) {
    const today = new Date().toISOString().split('T')[0];
    const prompt = `You are a task-parsing assistant. Today's date is ${today}.
Parse the following natural-language task description into structured fields.
Return ONLY a valid JSON object with these fields:
- "title": string (required, the core task, max 100 chars)
- "dueDate": ISO date string YYYY-MM-DD or null if not mentioned
- "priority": one of "low","medium","high","urgent" (infer from words like "urgent","ASAP","important")
- "category": one of "work","personal","health","learning","social","finance","home","other"
- "description": string (any extra details not in title, or "")

INPUT: "${text.replace(/"/g, '\\"')}"`;

    if (!openai) {
      return this._nlpFallback(text);
    }

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.1,
      });
      return this.parseJsonResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('NLP parse error:', error.message);
      return this._nlpFallback(text);
    }
  }

  _nlpFallback(text) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateStr = tomorrow.toISOString().split('T')[0];

    const isUrgent = /urgent|asap|immediately|now/i.test(text);
    const isHigh = /important|critical|must|today/i.test(text);
    let priority = 'medium';
    if (isUrgent) priority = 'urgent';
    else if (isHigh) priority = 'high';

    return {
      title: text.slice(0, 100),
      dueDate: dueDateStr,
      priority,
      category: 'personal',
      description: '',
    };
  }

  async getStepHint(task, step) {
    const fallback = `To complete "${step.title}": break it into small actions, look up guidance online if needed, and set a time block.`;

    if (!openai) return fallback;

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{
          role: 'user',
          content: `You are ABY. The user is working on a task and needs a short, helpful inline hint for one specific step.

TASK: "${task.title}" (category: ${task.category})
STEP: "${step.title}"

Write 1-3 sentences of practical advice for this step. Be specific, concrete, and to the point. Do NOT repeat the step title. Use real-world knowledge (e.g. typical cost ranges, tools needed, time estimates). Max 60 words.`
        }],
        max_tokens: 120,
        temperature: 0.4,
      });
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('getStepHint error:', error.message);
      return fallback;
    }
  }
}

module.exports = { aiService: new AIService() };