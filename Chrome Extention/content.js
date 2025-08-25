console.log('=== AI Misuse Detection extension loaded! ===');

function isExtensionContextValid() {
    try {
        return chrome && chrome.runtime && chrome.runtime.id;
    } catch (error) {
        return false;
    }
}

function sendMessageToBackground(message, callback) {
    if (!isExtensionContextValid()) {
        console.log('Extension context invalid, skipping message:', message);
        return;
    }
    
    try {
        chrome.runtime.sendMessage(message, function(response) {
            if (chrome.runtime.lastError) {
                console.log('Runtime error:', chrome.runtime.lastError);
                return;
            }
            if (callback) callback(response);
        });
    } catch (error) {
        console.log('Error sending message to background:', error);
    }
}

// Enhanced element detection for chatbots and AI interfaces
function findChatElements() {
    const selectors = [
        // Traditional inputs
        'input[type="text"]',
        'input[type="email"]',
        'input[type="search"]',
        'input[type="url"]',
        'textarea',
        
        // Contenteditable elements (common in chatbots)
        '[contenteditable="true"]',
        '[contenteditable]',
        
        // Common chatbot selectors
        '[data-testid*="chat"]',
        '[data-testid*="input"]',
        '[data-testid*="message"]',
        '[data-testid*="prompt"]',
        '[data-testid*="composer"]',
        
        // ChatGPT specific
        '[data-id="root"] textarea',
        '[data-id="root"] [contenteditable]',
        '#prompt-textarea',
        '.prompt-textarea',
        '[placeholder*="Message"]',
        '[placeholder*="Send a message"]',
        '[placeholder*="Ask me anything"]',
        
        // Claude specific
        '[data-testid="composer-input"]',
        '[data-testid="composer-textarea"]',
        
        // Bard/Gemini specific
        '[data-testid="chat-input"]',
        '[data-testid="input-box"]',
        
        // Generic AI chat patterns
        '.chat-input',
        '.message-input',
        '.prompt-input',
        '.composer',
        '.input-area',
        '.chat-composer',
        '.message-composer',
        
        // Role-based selectors
        '[role="textbox"]',
        '[role="combobox"]',
        '[role="searchbox"]',
        
        // Common class patterns
        '.ProseMirror',
        '.ql-editor',
        '.DraftEditor-root',
        '.public-DraftEditor-content',
        
        // Iframe content (for embedded chatbots)
        'iframe'
    ];
    
    let elements = [];
    
    // Find elements using selectors
    selectors.forEach(selector => {
        try {
            const found = document.querySelectorAll(selector);
            elements = elements.concat(Array.from(found));
        } catch (error) {
            console.log('Selector error:', selector, error);
        }
    });
    
    // Simple fallback: ensure all textareas and contenteditable elements are included
    const allTextareas = document.querySelectorAll('textarea');
    const allContentEditable = document.querySelectorAll('[contenteditable]');
    
    elements = elements.concat(Array.from(allTextareas));
    elements = elements.concat(Array.from(allContentEditable));
    
    // Remove duplicates
    elements = [...new Set(elements)];
    
    console.log('Found chat elements:', elements.length);
    return elements;
}

// Intelligent content analysis
async function analyzeTextIntelligently(text) {
    return new Promise((resolve, reject) => {
        // Check if extension context is still valid
        if (!isExtensionContextValid()) {
            console.log('Extension context invalid, using fallback analysis');
            // Fallback to local analysis
            const fallbackResult = analyzeTextLocally(text);
            resolve(fallbackResult);
            return;
        }
        
        try {
            chrome.runtime.sendMessage({
                action: 'analyzeText',
                text: text
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error in intelligent analysis:', chrome.runtime.lastError);
                    // Fallback to local analysis
                    const fallbackResult = analyzeTextLocally(text);
                    resolve(fallbackResult);
                } else {
                    resolve(response);
                }
            });
        } catch (error) {
            console.error('Exception in message sending:', error);
            // Fallback to local analysis
            const fallbackResult = analyzeTextLocally(text);
            resolve(fallbackResult);
        }
    });
}

// Local fallback analysis (simplified version of background.js logic)
function analyzeTextLocally(text) {
    console.log('Using local fallback analysis for:', text.substring(0, 50));
    
    if (!text || text.trim().length < 5) {
        return {
            result: 'safe',
            confidence: 0.5,
            intent: 'unknown',
            reasoning: ['Text too short'],
            risk_level: 'low'
        };
    }
    
    const text_lower = text.toLowerCase();
    
    // Check for safe patterns first
    const safe_patterns = [
        'how to kill mosquitos', 'how to kill bugs', 'how to kill insects',
        'how to kill pests', 'how to kill weeds', 'how to kill time',
        'how to kill bacteria', 'how to kill germs', 'how to kill viruses',
        'how to get rid of mosquitos', 'how to get rid of bugs',
        'how to control mosquitos', 'how to control pests',
        'how to eliminate mosquitos', 'how to eliminate bugs'
    ];
    
    for (const pattern of safe_patterns) {
        if (text_lower.includes(pattern)) {
            return {
                result: 'safe',
                confidence: 0.1,
                intent: 'educational',
                reasoning: [`Safe pattern detected: ${pattern}`],
                risk_level: 'low'
            };
        }
    }
    
    // Check for high risk patterns
    const high_risk_patterns = [
        'how to kill a person', 'how to kill someone', 'how to murder', 'how to assassinate',
        'how to make a bomb', 'how to create explosives', 'how to build a bomb',
        'how to hack into', 'how to steal', 'how to create a scam',
        'how do i kill myself', 'how to commit suicide', 'how to end my life',
        'how to poison someone', 'how to poison food',
        'create deepfake', 'generate deepfake',
        'create fake', 'make fake', 'generate fake'
    ];
    
    for (const pattern of high_risk_patterns) {
        if (text_lower.includes(pattern)) {
            return {
                result: 'malicious',
                confidence: 0.95,
                intent: 'malicious',
                reasoning: [`High risk pattern detected: ${pattern}`],
                risk_level: 'high'
            };
        }
    }
    
    // Check for personal information
    const personal_info_patterns = [
        'my credit card', 'my social security', 'my password',
        'my bank account', 'my phone number', 'my address',
        'my birthday', 'my driver license', 'my email',
        'credit card number', 'social security number', 'bank account number',
        'phone number', 'driver license number', 'email address',
        'aadhaar', 'aadhar', 'passport number', 'student id',
        'zip code', 'postal code', 'date of birth', 'my name is',
        'i live at', 'my email is', 'my password is'
    ];
    
    for (const pattern of personal_info_patterns) {
        if (text_lower.includes(pattern)) {
            return {
                result: 'personal_info_blocked',
                confidence: 0.9,
                intent: 'personal_info',
                reasoning: [`Personal information detected: ${pattern}`],
                risk_level: 'high'
            };
        }
    }
    
    // Default safe
    return {
        result: 'safe',
        confidence: 0.3,
        intent: 'unknown',
        reasoning: ['No malicious patterns detected'],
        risk_level: 'low'
    };
}

// Extract text from various element types
function extractTextFromElement(element) {
    if (element.contentEditable === 'true' || element.contentEditable === '') {
        return element.textContent || element.innerText || '';
    } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        return element.value || '';
    } else if (element.tagName === 'DIV' || element.tagName === 'P' || element.tagName === 'SPAN') {
        return element.textContent || element.innerText || '';
    }
    return '';
}

// Observe and monitor an element
function observeElement(element) {
    if (element.hasAttribute('data-ai-detector-monitored')) {
        return; // Already monitored
    }
    
    element.setAttribute('data-ai-detector-monitored', 'true');
    
    // Initialize detection flag to false (default state)
    detectionFlags.set(element, false);
    
    console.log('Monitoring element:', element.tagName, element.className, 'Detection flag initialized to false (enabled)');
    
    // Add input event listeners
    const events = ['input', 'keyup', 'paste', 'drop'];
    events.forEach(eventType => {
        element.addEventListener(eventType, handleElementInput, true);
    });
    
    // Add event listener for Enter key to re-enable detection
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // User pressed Enter (likely submitting), clear restored text
            if (detectionFlags.get(element) === true) {
                detectionFlags.set(element, false);
                console.log('🔄 Detection enabled for element (Enter pressed):', element.tagName, element.className);
                // Only clear stored text if this element is not the one that was just cleared
                if (lastClearedElement !== element) {
                    lastClearedText = '';
                    lastClearedElement = null;
                } else {
                    console.log('🔄 Preserving undo reference for recently cleared element (observeElement)');
                }
            }
        }
    }, true);
    
    // Add event listener for form submission
    const form = element.closest('form');
    if (form) {
        form.addEventListener('submit', () => {
            // User submitted form, clear restored text
            if (detectionFlags.get(element) === true) {
                detectionFlags.set(element, false);
                console.log('🔄 Detection enabled for element (form submitted):', element.tagName, element.className);
                // Only clear stored text if this element is not the one that was just cleared
                if (lastClearedElement !== element) {
                    lastClearedText = '';
                    lastClearedElement = null;
                } else {
                    console.log('🔄 Preserving undo reference for recently cleared element (observeElement)');
                }
            }
        }, true);
    }
    
    // Add event listener for when field is cleared (backspace, delete, etc.)
    element.addEventListener('input', (e) => {
        const currentText = extractTextFromElement(element);
        // If field becomes empty and we have restored text for this element, clear it
        if ((!currentText || currentText.trim() === '') && detectionFlags.get(element) === true) {
            detectionFlags.set(element, false);
            console.log('🔄 Detection enabled for element (field cleared):', element.tagName, element.className);
            // Only clear stored text if this element is not the one that was just cleared
            if (lastClearedElement !== element) {
                lastClearedText = '';
                lastClearedElement = null;
            } else {
                console.log('🔄 Preserving undo reference for recently cleared element (observeElement)');
            }
        }
    }, true);
}

// Performance optimizations
let analysisCache = new Map(); // Cache analysis results
let lastAnalysisTime = 0;
const ANALYSIS_COOLDOWN = 100; // Minimum time between analyses

// Function to clear analysis cache (for debugging)
function clearAnalysisCache() {
    analysisCache.clear();
    console.log('🧹 Analysis cache cleared');
}

// Optimized text analysis with caching
async function analyzeTextOptimized(text) {
    const textHash = text.toLowerCase().trim();
    
    // Check cache first
    if (analysisCache.has(textHash)) {
        const cachedResult = analysisCache.get(textHash);
        console.log('📋 Using cached result for:', textHash, '->', cachedResult);
        return cachedResult;
    }
    
    // Rate limiting
    const now = Date.now();
    if (now - lastAnalysisTime < ANALYSIS_COOLDOWN) {
        return { 
            result: 'safe', 
            is_malicious: false, 
            confidence: 0.5, 
            reason: 'Rate limited',
            method: 'rate_limited'
        };
    }
    lastAnalysisTime = now;
    
    // Quick check for obvious patterns first
    const quickResult = quickAnalysis(text);
    if (quickResult.confidence > 0.8) {
        // Standardize the format to match what content script expects
        const standardizedResult = {
            result: quickResult.malicious ? 'malicious' : 'safe',
            is_malicious: quickResult.malicious,
            confidence: quickResult.confidence,
            reason: quickResult.reason,
            method: 'quick_analysis'
        };
        console.log('💾 Caching quick result for:', textHash, '->', standardizedResult);
        analysisCache.set(textHash, standardizedResult);
        return standardizedResult;
    }
    
    // Full analysis only if needed
    const result = await analyzeTextIntelligently(text);
    console.log('💾 Caching full result for:', textHash, '->', result);
    analysisCache.set(textHash, result);
    
    // Limit cache size
    if (analysisCache.size > 100) {
        const firstKey = analysisCache.keys().next().value;
        analysisCache.delete(firstKey);
    }
    
    // Ensure the result has the expected format
    if (result && (result.result || result.is_malicious)) {
        return result;
    } else {
        // Fallback format if result is missing expected properties
        return {
            result: 'safe',
            is_malicious: false,
            confidence: 0.3,
            reason: 'Analysis failed, defaulting to safe',
            method: 'fallback'
        };
    }
}

// Quick analysis for obvious patterns
function quickAnalysis(text) {
    const text_lower = text.toLowerCase();
    
    // Check safe patterns FIRST (priority over malicious patterns)
    const obvious_safe = [
        'how to kill mosquitos', 'how to become rich', 'how to create a website',
        'what is deepfake', 'why people commit suicide',
        
        // Educational and academic content
        'calculate average', 'calculate mean', 'calculate median', 'calculate mode',
        'calculate percentage', 'calculate grade', 'calculate score', 'calculate marks',
        'calculate gpa', 'calculate cgpa', 'calculate total', 'calculate sum',
        'calculate the average', 'calculate the mean', 'calculate the median',
        'calculate the percentage', 'calculate the grade', 'calculate the score',
        'math problem', 'mathematics', 'mathematical', 'algebra', 'geometry',
        'statistics', 'statistical', 'probability', 'probability calculation',
        'homework help', 'assignment help', 'study help', 'academic help',
        'school work', 'college work', 'university work', 'student help',
        'exam preparation', 'test preparation', 'quiz preparation',
        'solve equation', 'solve problem', 'solve math', 'solve mathematics',
        'formula', 'equation', 'calculation', 'compute', 'compute average',
        'my marks', 'my grades', 'my scores', 'my results', 'my performance',
        'my ma', 'my math', 'my mathematics', 'my subject', 'my course',
        'my assignment', 'my homework', 'my project', 'my test', 'my exam',
        'my quiz', 'my assessment', 'my evaluation', 'my grade', 'my score',
        'academic performance', 'grade calculation', 'score calculation',
        'educational content', 'learning material', 'study material',
        'tutorial', 'lesson', 'course', 'subject', 'topic', 'chapter',
        
        // Educational questions about technology (research/understanding)
        'what is deepfake', 'why people make deepfake', 'why they make deepfake',
        'how deepfake works', 'what are deepfakes', 'why do people make deepfakes',
        'what is artificial intelligence', 'how ai works', 'what is machine learning',
        'why people use', 'why they use', 'what is the purpose of',
        'how does technology work', 'what is the technology behind',
        'why do people create', 'why they create', 'what is the reason for',
        'research about', 'study about', 'learn about', 'understand',
        'explain how', 'explain why', 'explain what', 'explain when',
        'what causes', 'what leads to', 'what results in', 'what happens when',
        
        // Health and medical (legitimate)
        'how to treat', 'how to cure', 'how to heal', 'how to recover',
        'medical advice', 'health advice', 'doctor appointment', 'hospital visit',
        'symptoms', 'diagnosis', 'treatment', 'medicine', 'medication',
        'how to prevent', 'how to avoid', 'how to manage', 'how to control',
        'how to reduce', 'how to lower', 'how to increase', 'how to improve',
        'how to maintain', 'how to keep', 'how to stay', 'how to remain',
        
        // Gaming and entertainment (legitimate)
        'how to play', 'how to win', 'how to beat', 'how to complete',
        'game strategy', 'game guide', 'game walkthrough', 'game tutorial',
        'how to level up', 'how to unlock', 'how to get', 'how to find',
        'how to collect', 'how to earn', 'how to gain', 'how to obtain',
        'how to achieve', 'how to reach', 'how to access', 'how to open',
        
        // Sports and fitness (legitimate)
        'how to score', 'how to win', 'how to play', 'how to train',
        'sports training', 'fitness routine', 'workout plan', 'exercise program',
        'how to improve', 'how to enhance', 'how to boost', 'how to strengthen',
        'how to develop', 'how to build', 'how to increase', 'how to maximize',
        
        // Cooking and food (legitimate) - More specific patterns
        'how to cook', 'how to prepare', 'how to make food', 'how to make meal',
        'how to make dinner', 'how to make lunch', 'how to make breakfast',
        'how to make pasta', 'how to make rice', 'how to make soup',
        'how to make salad', 'how to make sandwich', 'how to make pizza',
        'how to bake', 'recipe', 'cooking instructions', 'food preparation',
        'meal planning', 'how to season', 'how to flavor', 'how to spice',
        'how to garnish', 'how to serve', 'how to present', 'how to plate',
        'how to arrange food', 'how to arrange meal', 'how to arrange dinner',
        
        // Travel and navigation (legitimate)
        'how to travel', 'how to navigate', 'how to find', 'how to reach',
        'travel guide', 'travel tips', 'travel advice', 'travel planning',
        'how to book', 'how to reserve', 'how to schedule', 'how to plan',
        'how to get to', 'how to go to', 'how to reach', 'how to access',
        
        // Professional and work (legitimate)
        'how to work', 'how to perform', 'how to execute', 'how to complete',
        'job interview', 'career advice', 'professional development', 'work skills',
        'how to manage', 'how to lead', 'how to supervise', 'how to coordinate',
        'how to organize', 'how to plan', 'how to schedule', 'how to prioritize',
        
        // Social and communication (legitimate)
        'how to communicate', 'how to talk', 'how to speak', 'how to present',
        'how to negotiate', 'how to persuade', 'how to convince', 'how to influence',
        'how to network', 'how to connect', 'how to socialize', 'how to interact',
        'how to build', 'how to maintain', 'how to improve', 'how to strengthen',
        
        // Creative and artistic (legitimate) - More specific patterns
        'how to draw', 'how to paint', 'how to write', 'how to compose', 'how to produce',
        'how to make art', 'how to make music', 'how to make video', 'how to make film',
        'how to make content', 'how to make design', 'how to make drawing',
        'how to make painting', 'how to make sculpture', 'how to make craft',
        'art tutorial', 'creative guide', 'design tips', 'artistic advice',
        'how to express', 'how to show', 'how to display', 'how to present',
        'create a book', 'create a story', 'create a novel', 'create a poem',
        'create a song', 'create a painting', 'create a drawing', 'create a design',
        'create a website', 'create a blog', 'create a video', 'create a presentation',
        'create a document', 'create a report', 'create a project', 'create a portfolio',
        'create content', 'create art', 'create music', 'create literature',
        'create for children', 'create for students', 'create for learning',
        'create for education', 'create for entertainment', 'create for fun',
        
        // Technical and software (legitimate)
        'how to install', 'how to configure', 'how to setup', 'how to set up',
        'how to update', 'how to upgrade', 'how to fix', 'how to repair',
        'how to optimize', 'how to improve', 'how to enhance', 'how to boost',
        'software tutorial', 'technical guide', 'programming help', 'coding tutorial',
        
        // Financial and business (legitimate)
        'how to invest', 'how to save', 'how to budget', 'how to manage money',
        'how to start business', 'how to run business', 'how to manage business',
        'how to market products', 'how to advertise products', 'how to promote products', 'how to sell products',
        'how to market services', 'how to advertise services', 'how to promote services', 'how to sell services',
        'how to market online', 'how to advertise online', 'how to promote online', 'how to sell online',
        'how to market your business', 'how to advertise your business', 'how to promote your business', 'how to sell your business',
        'financial planning', 'investment advice', 'business strategy', 'market analysis',
        
        // Home and lifestyle (legitimate)
        'how to clean', 'how to organize', 'how to decorate', 'how to arrange',
        'how to maintain', 'how to repair', 'how to fix', 'how to improve',
        'home improvement', 'lifestyle tips', 'home organization', 'cleaning guide',
        'how to store', 'how to keep', 'how to preserve', 'how to protect'
    ];
    
    // Check safe patterns FIRST - More specific matching
    for (const pattern of obvious_safe) {
        // Use more specific matching to avoid false positives
        const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(text_lower)) {
            console.log('🔍 Safe pattern matched in content script:', pattern, 'for text:', text_lower);
            return { malicious: false, confidence: 0.8, reason: 'Obvious safe pattern' };
        }
    }
    
    // Then check malicious patterns
    const obvious_malicious = [
        'how to kill a person', 'how to kill someone', 'how to murder someone',
        'how to assassinate', 'how to murder', 'how to kill myself',
        'how to commit suicide', 'how to end my life', 'how to die',
        'how to make a bomb', 'how to create explosives', 'how to build a bomb',
        'how to make explosives', 'how to create a bomb', 'how to build explosives',
        'how to hack', 'how to hack into', 'how to hack computer',
        'how to hack system', 'how to hack network', 'how to hack website',
        'create nude image', 'make nude image', 'generate nude image',
        'create porn video', 'make porn video', 'generate porn video',
        'create porn', 'make porn', 'generate porn',
        'create a porn', 'make a porn', 'generate a porn',
        'create porn content', 'make porn content', 'generate porn content',
        'create deepfake', 'generate deepfake',
        'how to poison someone', 'how to poison food', 'how to poison drink',
        'how to make drugs', 'how to create drugs', 'how to manufacture drugs',
        'how to make a drug', 'how to create a drug', 'how to manufacture a drug',
        'how to sell drugs', 'how to distribute drugs', 'how to traffic drugs',
        'how to sell a drug', 'how to distribute a drug', 'how to traffic a drug',
        'how to market drugs', 'how to advertise drugs', 'how to promote drugs',
        'how to market a drug', 'how to advertise a drug', 'how to promote a drug',
        'how to make cocaine', 'how to make heroin', 'how to make meth',
        'how to make lsd', 'how to make ecstasy', 'how to make marijuana',
        'how to make weed', 'how to make pot', 'how to make cannabis',
        'how to cheat', 'how to scam', 'how to fraud', 'how to steal',
        'how to steal identity', 'how to steal personal info', 'how to steal data',
        'child porn', 'child pornography', 'child exploitation',
        'how to torture animal', 'how to hurt animal', 'how to harm animal',
        'create a deepfake', 'generate a deepfake', 'produce a deepfake',
        'make a deepfake',
        'poison someone', 'poison food', 'poison water',
        'how do i kill myself', 'how do i commit suicide', 'how do i end my life', 'how do i take my own life',
        'how to poison ourselves', 'artemin'
    ];
    
    const matchedMaliciousPattern = obvious_malicious.find(pattern => text_lower.includes(pattern));
    if (matchedMaliciousPattern) {
        console.log('🚨 Malicious pattern matched in content script:', matchedMaliciousPattern, 'for text:', text_lower);
        return { malicious: true, confidence: 0.9, reason: 'Obvious malicious pattern' };
    }
    
    // Check for incomplete phrases that are likely safe
    if (text_lower.length < 20 && (
        text_lower.endsWith(' a ') || text_lower.endsWith(' an ') || text_lower.endsWith(' the ') || 
        text_lower.endsWith(' a') || text_lower.endsWith(' an') || text_lower.endsWith(' the') ||
        text_lower.endsWith(' for ') || text_lower.endsWith(' to ') || text_lower.endsWith(' of ') ||
        text_lower.endsWith(' for') || text_lower.endsWith(' to') || text_lower.endsWith(' of'))) {
        console.log('🔍 Incomplete phrase detected in content script - likely safe:', text_lower);
        return { malicious: false, confidence: 0.1, reason: 'Incomplete phrase - likely safe' };
    }
    
    // Check for ambiguous patterns that need full analysis
    const ambiguous_patterns = [
        'how to create', 'how to make', 'how to build', 'how to generate'
    ];
    
    const has_ambiguous_pattern = ambiguous_patterns.some(pattern => text_lower.includes(pattern));
    if (has_ambiguous_pattern && text_lower.length < 20) {
        console.log('🔍 Ambiguous pattern detected in content script - needs full analysis:', text_lower);
        return { malicious: false, confidence: 0.2, reason: 'Ambiguous pattern - needs full analysis' };
    }
    
    return { malicious: false, confidence: 0.3, reason: 'Needs full analysis' };
}

// Debounce function to prevent multiple rapid calls
let analysisTimeout = null;
let lastAnalyzedText = '';

// Handle input from any monitored element
function handleElementInput(e) {
    const element = e.target;
    const text = extractTextFromElement(element);
    
    // Check if protection is enabled
    if (!protectionEnabled) {
        console.log('🛡️ Protection disabled, skipping analysis for:', text.substring(0, 30) + '...');
        return;
    }
    
    // Check if detection should be skipped for this element
    if (shouldSkipDetection(element)) {
        console.log('🚫 Detection skipped due to flag being true');
        return;
    }
    
    // Reset flag if element becomes empty
    resetDetectionFlag(element);
    
    // Show current flag status for debugging
    console.log('🔍 Detection flag status for element:', detectionFlags.get(element) ? 'disabled' : 'enabled');
    
    // Clear previous timeout
    if (analysisTimeout) {
        clearTimeout(analysisTimeout);
    }
    
    // Debounce analysis to prevent multiple rapid calls (200ms delay)
    analysisTimeout = setTimeout(() => {
        // Skip if text is too short or same as last analyzed
        if (text.length < 10 || text === lastAnalyzedText) {
            return;
        }
        
        lastAnalyzedText = text;
        console.log('=== Element input changed: ===', text.substring(0, 50));
        
        // Quick check for obvious malicious content (more specific patterns)
        const lowerText = text.toLowerCase();
        console.log('🔍 Quick detection check for:', lowerText);
        
        // Only check for obvious malicious patterns if text is complete enough
        if (text.length >= 15) {
            const obviousMalicious = [
                'how to kill a person', 'how to kill someone', 'how to murder someone',
                'how to make a bomb', 'how to create a bomb', 'how to build a bomb',
                'how to hack into', 'how to hack computer', 'how to hack system',
                'create nude image', 'make nude image', 'generate nude image',
                'create porn video', 'make porn video', 'generate porn video',
                'kill myself', 'how to commit suicide', 'how to end my life',
                'how to poison someone', 'how to poison food',
                'how to make drugs', 'how to create drugs', 'how to manufacture drugs',
                'how to make cocaine', 'how to make heroin', 'how to make meth',
                'how to make lsd', 'how to make ecstasy', 'how to make marijuana',
                'how to make weed', 'how to make pot', 'how to make cannabis'
            ];
            
            const isObviouslyMalicious = obviousMalicious.some(pattern => lowerText.includes(pattern));
            console.log('🚨 Quick detection result:', isObviouslyMalicious);
            
            if (isObviouslyMalicious) {
                // Store the text and element for potential undo
                lastClearedText = text;
                lastClearedElement = element;
                console.log('💾 Stored text for undo:', text.substring(0, 50) + '...');
                console.log('💾 Stored element for undo:', element.tagName, element.className);
                
                // Immediately clear and block obvious malicious content
                if (element.contentEditable === 'true' || element.contentEditable === '') {
                    element.textContent = '';
                    element.innerHTML = '';
                } else {
                    element.value = '';
                }
                
                const categoryInfo = categorizeContent(text);
                showNotification(`${categoryInfo.category} detected and blocked!\n\n Blocked-Content: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n\nClick undo to restore if this was a mistake.`, true, 10000, categoryInfo);
                console.log('⚠️ Obvious malicious content detected and cleared immediately:', text);
                
                // Log to background script for tracking
                sendMessageToBackground({
                    action: 'logAttempt',
                    payload: {
                        result: 'malicious',
                        text: text,
                        timestamp: Date.now(),
                        url: window.location.href,
                        ml_prediction: 'malicious',
                        confidence: 0.95,
                        malicious_probability: 0.95,
                        elementType: element.tagName,
                        isContentEditable: element.contentEditable === 'true',
                        detectionMethod: 'quick_detection'
                    }
                }, function(response) {
                    console.log('Quick detection log response:', response);
                });
                
                lastAnalyzedText = '';
                return;
            }
        }
        
        analyzeTextOptimized(text).then(analysis => {
            console.log('Element ML analysis result:', analysis);
            console.log('Analysis type:', typeof analysis);
            console.log('Analysis keys:', Object.keys(analysis || {}));
            
            // Debug: Check if analysis is valid
            if (!analysis) {
                console.error('❌ Analysis result is null or undefined!');
                return;
            }
            
            // Handle error objects from background script
            if (analysis.error || analysis.message) {
                console.error('❌ Background script error:', analysis.error || analysis.message);
                return;
            }
            
            // Handle both old format (result) and new format (is_malicious)
            const isMalicious = analysis.result === 'malicious' || analysis.result === 'personal_info_blocked' || analysis.is_malicious === true;
            
            if (!analysis.result && !analysis.is_malicious) {
                console.error('❌ Analysis result missing both "result" and "is_malicious" properties!');
                console.log('Available properties:', Object.keys(analysis));
                return;
            }
            
            if (isMalicious) {
                // Check confidence level - only block if confidence is above 65%
                const confidence = Math.round(analysis.confidence * 100);
                
                if (confidence >= 65) {
                    // Store the text and element for potential undo
                    lastClearedText = text;
                    lastClearedElement = element;
                    console.log('💾 Stored text for undo (ML):', text.substring(0, 50) + '...');
                    console.log('💾 Stored element for undo (ML):', element.tagName, element.className);
                    
                    // Clear dangerous content immediately
                    if (element.contentEditable === 'true' || element.contentEditable === '') {
                        element.textContent = '';
                        element.innerHTML = '';
                    } else {
                        element.value = '';
                    }
                    
                    // Show notification with ML results and undo option
                    const categoryInfo = categorizeContent(text);
                    showNotification(`${categoryInfo.category} blocked with ${confidence}% confidence!\n\n Blocked-Content: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n\nClick undo to restore if this was a mistake.`, true, 10000, categoryInfo);
                    
                    console.log('⚠️ Harmful content detected and cleared:', text);
                    
                    // Log to background script
                    sendMessageToBackground({
                        action: 'logAttempt',
                        payload: {
                            result: analysis.result || (analysis.is_malicious ? 'malicious' : 'safe'), // Handle both formats
                            text: text,
                            timestamp: Date.now(),
                            url: window.location.href,
                            ml_prediction: analysis.ml_prediction || analysis.result || (analysis.is_malicious ? 'malicious' : 'safe'),
                            confidence: analysis.confidence,
                            malicious_probability: analysis.malicious_probability || analysis.confidence,
                            elementType: element.tagName,
                            isContentEditable: element.contentEditable === 'true'
                        }
                    }, function(response) {
                        console.log('Element log response:', response);
                    });
                    
                    // Clear the last analyzed text to allow future analysis
                    lastAnalyzedText = '';
                } else {
                    console.log(`⚠️ Malicious content detected but confidence too low (${confidence}% < 65%):`, text);
                    // Don't block, just log for monitoring
                    sendMessageToBackground({
                        action: 'logAttempt',
                        payload: {
                            result: 'low_confidence',
                            text: text,
                            timestamp: Date.now(),
                            url: window.location.href,
                            ml_prediction: analysis.ml_prediction,
                            confidence: analysis.confidence,
                            malicious_probability: analysis.malicious_probability,
                            elementType: element.tagName,
                            isContentEditable: element.contentEditable === 'true'
                        }
                    }, function(response) {
                        console.log('Low confidence log response:', response);
                    });
                }
                
                // Clear the last analyzed text to allow future analysis
                lastAnalyzedText = '';
            } else {
                console.log('Content is safe, no visual feedback needed');
            }
        }).catch(error => {
            console.error('Error in ML analysis:', error);
        });
    }, 200); // 200ms delay for faster response
}

// Content restoration system
// Global variables for tracking cleared content and detection flags
let lastClearedText = '';
let lastClearedElement = null;
let detectionFlags = new Map(); // Maps element to boolean flag (false = detection enabled, true = detection disabled)

// Notification deduplication
let lastNotificationMessage = '';
let notificationTimeout = null;

// Content categorization system
function categorizeContent(text) {
    const lowerText = text.toLowerCase();
    
    // Personal details being shared (not requested)
    if ((lowerText.includes('my email is') || lowerText.includes('my email:') || lowerText.includes('my email=') ||
         lowerText.includes('my phone is') || lowerText.includes('my phone:') || lowerText.includes('my phone=') ||
         lowerText.includes('my number is') || lowerText.includes('my number:') || lowerText.includes('my number=') ||
         lowerText.includes('my address is') || lowerText.includes('my address:') || lowerText.includes('my address=') ||
         lowerText.includes('my credit card is') || lowerText.includes('my credit card:') || lowerText.includes('my credit card=') ||
         lowerText.includes('my password is') || lowerText.includes('my password:') || lowerText.includes('my password=') ||
         lowerText.includes('my ssn is') || lowerText.includes('my ssn:') || lowerText.includes('my ssn=') ||
         lowerText.includes('my social security is') || lowerText.includes('my social security:') || lowerText.includes('my social security=') ||
         lowerText.includes('my bank account is') || lowerText.includes('my bank account:') || lowerText.includes('my bank account=') ||
         lowerText.includes('my personal info is') || lowerText.includes('my personal info:') || lowerText.includes('my personal info=') ||
         lowerText.includes('my private info is') || lowerText.includes('my private info:') || lowerText.includes('my private info=') ||
         lowerText.includes('my contact is') || lowerText.includes('my contact:') || lowerText.includes('my contact=') ||
         lowerText.includes('my birthday is') || lowerText.includes('my birthday:') || lowerText.includes('my birthday=') ||
         lowerText.includes('my full name is') || lowerText.includes('my full name:') || lowerText.includes('my full name=')) ||
        // Also detect patterns like "john@example.com" or "555-123-4567" after "my email" or "my phone"
        (lowerText.includes('@') && (lowerText.includes('my email') || lowerText.includes('my email address'))) ||
        (/\d{3}[-.]?\d{3}[-.]?\d{4}/.test(lowerText) && (lowerText.includes('my phone') || lowerText.includes('my number'))) ||
        (/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/.test(lowerText) && (lowerText.includes('my credit card') || lowerText.includes('my card'))) ||
        (/\d{3}-\d{2}-\d{4}/.test(lowerText) && (lowerText.includes('my ssn') || lowerText.includes('my social security')))) {
        return {
            category: 'Personal Details',
            icon: '🔒',
            color: '#28a745',
            description: 'Personal or sensitive information being shared'
        };
    }
    
    // Violence and weapons
    if (lowerText.includes('kill') || lowerText.includes('murder') || lowerText.includes('assassinate') || 
        lowerText.includes('suicide') || lowerText.includes('die') || lowerText.includes('death')) {
        return {
            category: 'Violence',
            icon: '🔪',
            color: '#dc2626',
            description: 'Violent or harmful content'
        };
    }
    
    // Bombs and explosives
    if (lowerText.includes('bomb') || lowerText.includes('explosive') || lowerText.includes('blast') || 
        lowerText.includes('detonate') || lowerText.includes('explode')) {
        return {
            category: 'Explosives',
            icon: '💣',
            color: '#ea580c',
            description: 'Explosive or bomb-related content'
        };
    }
    
    // Face swapping and deepfakes
    if (lowerText.includes('face swap') || lowerText.includes('face swapping') || 
        lowerText.includes('deepfake') || lowerText.includes('fake video') || 
        lowerText.includes('fake image') || lowerText.includes('swap face')) {
        return {
            category: 'Face Manipulation',
            icon: '🎭',
            color: '#7c3aed',
            description: 'Face swapping or deepfake content'
        };
    }
    
    // Drugs and illegal substances
    if (lowerText.includes('cocaine') || lowerText.includes('heroin') || lowerText.includes('meth') || 
        lowerText.includes('drugs') || lowerText.includes('lsd') || lowerText.includes('ecstasy') ||
        lowerText.includes('opium') || lowerText.includes('marijuana') ||
        // Drug-related action patterns
        lowerText.includes('how to make drugs') || lowerText.includes('how to create drugs') || lowerText.includes('how to manufacture drugs') ||
        lowerText.includes('how to make a drug') || lowerText.includes('how to create a drug') || lowerText.includes('how to manufacture a drug') ||
        lowerText.includes('how to sell drugs') || lowerText.includes('how to distribute drugs') || lowerText.includes('how to traffic drugs') ||
        lowerText.includes('how to sell a drug') || lowerText.includes('how to distribute a drug') || lowerText.includes('how to traffic a drug') ||
        lowerText.includes('how to market drugs') || lowerText.includes('how to advertise drugs') || lowerText.includes('how to promote drugs') ||
        lowerText.includes('how to market a drug') || lowerText.includes('how to advertise a drug') || lowerText.includes('how to promote a drug')) {
        return {
            category: 'Illegal Substances',
            icon: '💊',
            color: '#059669',
            description: 'Illegal drug-related content'
        };
    }
    
    // Hacking and cyber attacks
    if (lowerText.includes('hack') || lowerText.includes('cyber attack') || lowerText.includes('malware') || 
        lowerText.includes('virus') || lowerText.includes('phishing')) {
        return {
            category: 'Cyber Security',
            icon: '🖥️',
            color: '#0891b2',
            description: 'Hacking or cyber attack content'
        };
    }
    
    // Adult content
    if (lowerText.includes('nude') || lowerText.includes('porn') || lowerText.includes('sexual') || 
        lowerText.includes('adult content') || lowerText.includes('explicit')) {
        return {
            category: 'Adult Content',
            icon: '🚫',
            color: '#be185d',
            description: 'Adult or explicit content'
        };
    }
    
    // Safe patterns that should not be categorized as malicious
    const safePatterns = [
        'how to sell products', 'how to sell services', 'how to sell online',
        'how to make money', 'how to earn money', 'how to start business',
        'how to market products', 'how to advertise products', 'how to promote products',
        'how to create a website', 'how to build an app', 'how to design',
        'how to cook', 'how to clean', 'how to organize', 'how to exercise',
        'how to learn', 'how to study', 'how to improve', 'how to write',
        'how to read', 'how to speak', 'how to drive', 'how to swim'
    ];
    
    // Check if it's a safe pattern
    for (const pattern of safePatterns) {
        if (lowerText.includes(pattern)) {
            return {
                category: 'Safe Content',
                icon: '✅',
                color: '#059669',
                description: 'Legitimate and safe content'
            };
        }
    }
    
    // Default category for other malicious content
    return {
        category: 'Malicious Content',
        icon: '⚠️',
        color: '#dc2626',
        description: 'Potentially harmful content'
    };
}

function showNotification(message, showUndo = false, duration = 10000, categoryInfo = null) {
    // Prevent duplicate notifications
    if (message === lastNotificationMessage) {
        return;
    }
    
    // Clear previous notification timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('[data-ai-detector-notification]');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.remove();
        }
    });
    
    // Default colors if no category info
    let bgColor = '#dc2626';
    let shadowColor = 'rgba(220, 38, 38, 0.4)';
    
    // Use category-specific colors if available
    if (categoryInfo) {
        bgColor = categoryInfo.color;
        shadowColor = `${categoryInfo.color}66`; // 40% opacity
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.setAttribute('data-ai-detector-notification', 'true');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, ${bgColor}, ${bgColor}dd);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px ${shadowColor};
        z-index: 10000;
        max-width: 400px;
        min-width: 350px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        animation: slideIn 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
    `;
    
    // Process message to handle line breaks and styling
    const processedMessage = message.replace(/\n/g, '<br>');
    
    let notificationContent = `
        <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600; font-size: 16px;">
                        ${categoryInfo ? categoryInfo.icon + ' ' + categoryInfo.category : '⚠️ Alert'}
                    </span>
                    ${categoryInfo ? `<span style="margin-left: 8px; font-size: 12px; opacity: 0.8; background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 4px;">${categoryInfo.description}</span>` : ''}
                </div>
                <div style="font-size: 14px; line-height: 1.6; opacity: 0.95;">
                    ${processedMessage}
                </div>
            </div>
            <button id="close-notification" style="
                margin-left: 12px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 6px;
                transition: all 0.2s;
                min-width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">×</button>
        </div>
    `;
    
    // Add undo button if requested and we have content to restore
    if (showUndo && lastClearedText && lastClearedElement && lastClearedText.trim() !== '') {
        notificationContent += `
            <div style="display: flex; gap: 12px; margin-top: 16px;">
                <button id="undo-button" style="
                    background: rgba(255, 255, 255, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.25);
                    color: white;
                    padding: 10px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.2s;
                    flex: 1;
                    text-align: center;
                ">
                    ↩ Restore Content
                </button>
            </div>
        `;
    }
    
    notification.innerHTML = notificationContent;
    
    // Add event listeners after creating the notification
    const closeButton = notification.querySelector('#close-notification');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            notification.remove();
        });
    }
    
    const undoButton = notification.querySelector('#undo-button');
    if (undoButton) {
        undoButton.addEventListener('click', () => {
            undoClear();
        });
        
        // Add hover effects
        undoButton.addEventListener('mouseenter', () => {
            undoButton.style.background = 'rgba(255, 255, 255, 0.25)';
            undoButton.style.transform = 'translateY(-1px)';
            undoButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        });
        
        undoButton.addEventListener('mouseleave', () => {
            undoButton.style.background = 'rgba(255, 255, 255, 0.15)';
            undoButton.style.transform = 'translateY(0)';
            undoButton.style.boxShadow = 'none';
        });
    }
    
    // Add hover effects for close button
    if (closeButton) {
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
            closeButton.style.transform = 'scale(1.1)';
        });
        
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
            closeButton.style.transform = 'scale(1)';
        });
    }
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Store current message
    lastNotificationMessage = message;
    
    // Auto-remove after specified duration
    notificationTimeout = setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
        lastNotificationMessage = '';
    }, duration);
}

// Function to restore the last cleared content
function undoClear() {
    console.log('🔄 Undo button clicked!');
    console.log('📊 Current state:');
    console.log('  lastClearedText:', lastClearedText ? `"${lastClearedText.substring(0, 50)}..."` : 'null');
    console.log('  lastClearedElement:', lastClearedElement ? `${lastClearedElement.tagName}.${lastClearedElement.className}` : 'null');
    console.log('  lastClearedElement exists:', !!lastClearedElement);
    console.log('  lastClearedText length:', lastClearedText ? lastClearedText.length : 0);
    
    if (lastClearedText && lastClearedElement && lastClearedText.trim() !== '') {
        console.log('✅ Found text and element to restore');
        
        // Verify the element still exists in the DOM
        if (!document.contains(lastClearedElement)) {
            console.error('❌ Element no longer exists in DOM');
            showNotification('❌ Cannot restore content!\n\nThe input field is no longer available.', false, 5000);
            return;
        }
        
        // Restore the text to the element
        try {
            if (lastClearedElement.contentEditable === 'true' || lastClearedElement.contentEditable === '') {
                lastClearedElement.textContent = lastClearedText;
                lastClearedElement.innerHTML = lastClearedText;
            } else {
                lastClearedElement.value = lastClearedText;
            }
            
            console.log('✅ Text restored successfully:', lastClearedText);
            
            // Set the flag to true for this element (content restored, disable detection)
            detectionFlags.set(lastClearedElement, true);
            console.log('🚫 Detection disabled for this element (flag set to true)');
            
            // Notify background script about content restoration to adjust stats
            sendMessageToBackground({
                action: 'contentRestored',
                payload: {
                    text: lastClearedText,
                    timestamp: Date.now(),
                    url: window.location.href,
                    elementType: lastClearedElement.tagName,
                    isContentEditable: lastClearedElement.contentEditable === 'true'
                }
            }, function(response) {
                console.log('Content restoration notification response:', response);
                
                // Only clear the stored data AFTER successfully sending the message
                // This ensures the undo button works even if there's a delay
                setTimeout(() => {
                    lastClearedText = '';
                    lastClearedElement = null;
                    console.log('🧹 Stored data cleared after successful restoration');
                }, 1000); // Wait 1 second to ensure message is sent
            });
            
            // Show success notification for 10 seconds
            const successCategory = {
                category: 'Success',
                icon: '✅',
                color: '#059669',
                description: 'Content restored successfully'
            };
            showNotification('Content Restored Successfully!\n\nThe blocked content has been returned to the input field.\n\nDetection is now disabled for this field until it becomes empty.', false, 10000, successCategory);
            
            // Remove the current notification
            const notification = document.querySelector('[data-ai-detector-notification]');
            if (notification) {
                notification.remove();
            }
        } catch (error) {
            console.error('❌ Error restoring text:', error);
            showNotification('❌ Error restoring content!\n\nPlease try again or refresh the page.', false, 5000);
        }
    } else {
        console.error('❌ No text or element to restore!');
        console.log('🔍 Debugging info:');
        console.log('  lastClearedText:', lastClearedText);
        console.log('  lastClearedElement:', lastClearedElement);
        console.log('  lastClearedElement exists:', !!lastClearedElement);
        console.log('  lastClearedText length:', lastClearedText ? lastClearedText.length : 0);
        console.log('  lastClearedText type:', typeof lastClearedText);
        console.log('  lastClearedElement type:', typeof lastClearedElement);
        
        // Show error notification
        showNotification('❌ No content to restore!\n\nNo recently blocked content found to restore.', true, 5000);
    }
}

// Function to check if detection should be skipped for an element
function shouldSkipDetection(element) {
    const flag = detectionFlags.get(element);
    if (flag === true) {
        console.log('🚫 Detection skipped for element (flag is true - disabled):', element.tagName, element.className);
        return true;
    }
    return false;
}

// Function to reset flag when element becomes empty
function resetDetectionFlag(element) {
    const currentText = extractTextFromElement(element);
    
    console.log('🔄 resetDetectionFlag called for element:', element.tagName, element.className);
    console.log('  Current text:', currentText ? `"${currentText.substring(0, 30)}..."` : 'empty');
    console.log('  lastClearedElement:', lastClearedElement ? `${lastClearedElement.tagName}.${lastClearedElement.className}` : 'null');
    console.log('  Is this the same element?', lastClearedElement === element);
    
    // If element is empty, set flag to false (enable detection)
    if (!currentText || currentText.trim() === '') {
        detectionFlags.set(element, false);
        console.log('🔄 Detection enabled for element (field is empty):', element.tagName, element.className);
        
        // Only clear stored text if this element is not the one that was just cleared
        // This prevents the undo button from losing its reference
        if (lastClearedElement !== element) {
            console.log('🔄 Clearing stored text (different element)');
            lastClearedText = '';
            lastClearedElement = null;
        } else {
            console.log('🔄 Preserving undo reference for recently cleared element');
            console.log('  lastClearedText preserved:', lastClearedText ? `"${lastClearedText.substring(0, 30)}..."` : 'null');
        }
    }
}

// Function to initialize detection flag for a new element
function initializeDetectionFlag(element) {
    // Set default flag to false (detection enabled) for new elements
    if (!detectionFlags.has(element)) {
        detectionFlags.set(element, false);
        console.log('🆕 Detection flag initialized to false (enabled) for new element:', element.tagName, element.className);
    }
}

// Function to monitor a single element
function monitorElement(element) {
    // Initialize detection flag for this element
    initializeDetectionFlag(element);
    
    console.log('Monitoring element:', element.tagName, element.className, 'Detection flag initialized to false (enabled)');
    
    // Add input event listeners
    const events = ['input', 'keyup', 'paste', 'drop'];
    events.forEach(eventType => {
        element.addEventListener(eventType, handleElementInput, true);
    });
    
    // Add event listener for Enter key to re-enable detection
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // User pressed Enter (likely submitting), re-enable detection
            if (detectionFlags.get(element) === true) {
                detectionFlags.set(element, false);
                console.log('🔄 Detection enabled for element (Enter pressed):', element.tagName, element.className);
                // Only clear stored text if this element is not the one that was just cleared
                if (lastClearedElement !== element) {
                    lastClearedText = '';
                    lastClearedElement = null;
                } else {
                    console.log('🔄 Preserving undo reference for recently cleared element (monitorElement)');
                }
            }
        }
    }, true);
    
    // Add event listener for form submission
    const form = element.closest('form');
    if (form) {
        form.addEventListener('submit', () => {
            // User submitted form, re-enable detection
            if (detectionFlags.get(element) === true) {
                detectionFlags.set(element, false);
                console.log('🔄 Detection enabled for element (form submitted):', element.tagName, element.className);
                // Only clear stored text if this element is not the one that was just cleared
                if (lastClearedElement !== element) {
                    lastClearedText = '';
                    lastClearedElement = null;
                } else {
                    console.log('🔄 Preserving undo reference for recently cleared element (monitorElement)');
                }
            }
        }, true);
    }
    
    // Add event listener for when field is cleared (backspace, delete, etc.)
    element.addEventListener('input', (e) => {
        const currentText = extractTextFromElement(element);
        // If field becomes empty and we have disabled detection for this element, re-enable it
        if ((!currentText || currentText.trim() === '') && detectionFlags.get(element) === true) {
            detectionFlags.set(element, false);
            console.log('🔄 Detection enabled for element (field cleared):', element.tagName, element.className);
            // Only clear stored text if this element is not the one that was just cleared
            if (lastClearedElement !== element) {
                lastClearedText = '';
                lastClearedElement = null;
            } else {
                console.log('🔄 Preserving undo reference for recently cleared element (monitorElement input)');
            }
        }
    }, true);
}

// Global variable to track protection status
let protectionEnabled = true;

// Make functions available globally for testing
window.aiDetectorDebug = {
    showFlagStatus: () => {
        console.log('📊 Current Detection Flag Status:');
        detectionFlags.forEach((flag, element) => {
            const text = extractTextFromElement(element);
            const isEmpty = !text || text.trim() === '';
            console.log(`  ${element.tagName}.${element.className}: flag=${flag} (${flag ? 'disabled' : 'enabled'}), empty=${isEmpty}`);
        });
    },
    resetAllFlags: () => {
        detectionFlags.clear();
        console.log('🔄 All detection flags have been reset');
    },
    detectionFlags: detectionFlags,
    // Quick function to check current element's flag
    checkCurrentElement: () => {
        const activeElement = document.activeElement;
        if (activeElement) {
            const flag = detectionFlags.get(activeElement);
            console.log('🔍 Current active element:', activeElement.tagName, activeElement.className);
            console.log('🚩 Detection flag status:', flag, `(${flag ? 'disabled' : 'enabled'})`);
            return flag;
        } else {
            console.log('❌ No active element found');
            return null;
        }
    },
    // Check protection status
    checkProtectionStatus: () => {
        console.log('🛡️ Current protection status:', protectionEnabled ? 'ENABLED' : 'DISABLED');
        return protectionEnabled;
    },
    // Toggle protection for testing
    toggleProtection: () => {
        protectionEnabled = !protectionEnabled;
        console.log('🛡️ Protection toggled to:', protectionEnabled ? 'ENABLED' : 'DISABLED');
        return protectionEnabled;
    },
    
    // Vector system testing
    testVectorAnalysis: (text) => {
        console.log('🧪 Testing vector analysis for:', text);
        sendMessageToBackground({
            action: 'analyzeText',
            text: text
        }, function(response) {
            console.log('🧪 Vector analysis result:', response);
        });
    },
    
    // Add vector embedding
    addVectorEmbedding: (text, isMalicious) => {
        console.log('➕ Adding vector embedding:', text, 'isMalicious:', isMalicious);
        sendMessageToBackground({
            action: 'addVectorEmbedding',
            payload: { text, isMalicious }
        }, function(response) {
            console.log('➕ Vector embedding added:', response);
        });
    },
    
    // Get vector statistics
    getVectorStats: () => {
        sendMessageToBackground({
            action: 'getVectorStats'
        }, function(response) {
            console.log('📊 Vector statistics:', response.stats);
        });
    },
    
    // Manual clear detection flag for testing
    clearDetectionFlag: (elementSelector) => {
        const element = document.querySelector(elementSelector);
        if (element && detectionFlags.has(element)) {
            detectionFlags.set(element, false);
            console.log('🧪 Manually cleared detection flag for:', elementSelector);
            return true;
        } else {
            console.log('❌ No detection flag found for:', elementSelector);
            return false;
        }
    },
    
    // Set detection flag for testing
    setDetectionFlag: (elementSelector, enabled) => {
        const element = document.querySelector(elementSelector);
        if (element) {
            detectionFlags.set(element, !enabled); // true = disabled, false = enabled
            console.log('🧪 Manually set detection flag for:', elementSelector, 'to', enabled ? 'enabled' : 'disabled');
            return true;
        } else {
            console.log('❌ Element not found:', elementSelector);
            return false;
        }
    },
    
    // Check current last cleared text status
    checkLastClearedStatus: () => {
        console.log('📊 Last Cleared Text Status:');
        console.log('  Text:', lastClearedText ? lastClearedText.substring(0, 50) + '...' : 'null');
        console.log('  Element:', lastClearedElement ? `${lastClearedElement.tagName}.${lastClearedElement.className}` : 'null');
        console.log('  Text length:', lastClearedText ? lastClearedText.length : 0);
        console.log('  Element exists:', !!lastClearedElement);
        console.log('  Element type:', typeof lastClearedElement);
        console.log('  Text type:', typeof lastClearedText);
        return { text: lastClearedText, element: lastClearedElement };
    },
    
    // Test undo functionality
    testUndo: () => {
        console.log('🧪 Testing undo functionality...');
        if (lastClearedText && lastClearedElement) {
            console.log('✅ Undo test: Text and element found, calling undoClear()');
            undoClear();
        } else {
            console.log('❌ Undo test: No text or element to restore');
        }
    },
    
    // Force store content for testing undo
    forceStoreContent: (text, elementSelector) => {
        const element = document.querySelector(elementSelector);
        if (element) {
            lastClearedText = text;
            lastClearedElement = element;
            console.log('🧪 Force stored content for testing:', text.substring(0, 50) + '...', 'in element:', elementSelector);
            return true;
        } else {
            console.log('❌ Element not found:', elementSelector);
            return false;
        }
    },
    
    // Clear stored content for testing
    clearStoredContent: () => {
        lastClearedText = '';
        lastClearedElement = null;
        console.log('🧪 Cleared stored content for testing');
    }
};

// Initialize extension
function initExtension() {
    console.log('=== Initializing extension... ===');
    
    // Check if extension is still valid
    if (!isExtensionContextValid()) {
        console.log('Extension context invalid, stopping initialization');
        return;
    }
    
    // Load initial protection status
    try {
        chrome.storage.local.get(['protectionEnabled'], function(data) {
            protectionEnabled = data.protectionEnabled !== false; // Default to true
            console.log('Initial protection status:', protectionEnabled ? 'ENABLED' : 'DISABLED');
        });
    } catch (error) {
        console.log('Storage access failed, using default protection enabled');
        protectionEnabled = true;
    }
    
    // Listen for protection toggle messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'toggleProtection') {
            protectionEnabled = request.enabled;
            console.log('Protection status updated via message:', protectionEnabled ? 'ENABLED' : 'DISABLED');
            sendResponse({ success: true });
        }
    });
    
    // Listen for storage changes to update protection status
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.protectionEnabled) {
            protectionEnabled = changes.protectionEnabled.newValue !== false;
            console.log('Protection status updated via storage change:', protectionEnabled ? 'ENABLED' : 'DISABLED');
        }
    });
    
    // Find and monitor all chat elements
    const chatElements = findChatElements();
    chatElements.forEach(element => {
        observeElement(element);
    });
    
    // Monitor for dynamically added elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if the new element is a chat element
                    const newChatElements = findChatElements.call(node.ownerDocument || document);
                    newChatElements.forEach(element => {
                        if (!element.hasAttribute('data-ai-detector-monitored')) {
                            observeElement(element);
                        }
                    });
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Periodic check to reinitialize if context is lost
    setInterval(() => {
        if (!isExtensionContextValid()) {
            console.log('Extension context lost, attempting to reinitialize...');
            // Clear monitored attributes to allow re-monitoring
            document.querySelectorAll('[data-ai-detector-monitored]').forEach(el => {
                el.removeAttribute('data-ai-detector-monitored');
            });
            // Reinitialize
            initExtension();
        }
    }, 10000); // Check every 10 seconds
    
    // Periodic check to ensure detection flags are properly reset
    setInterval(() => {
        detectionFlags.forEach((flag, element) => {
            const currentText = extractTextFromElement(element);
            // If element is empty, clear the restored text
            if (!currentText || currentText.trim() === '') {
                detectionFlags.set(element, false); // Reset flag to false
                console.log('🔄 Detection enabled for element (periodic check):', element.tagName, element.className);
                // Only clear stored text if this element is not the one that was just cleared
                if (lastClearedElement !== element) {
                    lastClearedText = '';
                    lastClearedElement = null;
                } else {
                    console.log('🔄 Preserving undo reference for recently cleared element (periodic check)');
                }
            }
        });
    }, 5000); // Check every 5 seconds
}

// Run immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtension);
} else {
    initExtension();
}