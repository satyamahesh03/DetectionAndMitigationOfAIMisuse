
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        protectionEnabled: true,
        stats: { total: 0, blocked: 0 },
        history: [],
        userFeedback: {
            falsePositives: [],
            falseNegatives: [],
            suggestions: []
        },
        safe_patterns: [],
        high_risk_patterns: []
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    
    if (request.action === 'test') {
        console.log('Test message received:', request.message);
        sendResponse({status: 'Background script is working!'});
        return true;
    }
    
    if (request.action === 'analyzeText') {
        console.log('Background: Received analyzeText request for:', request.text.substring(0, 50));
        analyzeTextHybrid(request.text, sendResponse);
        return true;
    }
    
    if (request.action === 'logAttempt') {
        console.log('Background: Received logAttempt request:', request.payload);
        logAttempt(request.payload);
        sendResponse({ success: true });
        return true; // Keep the message channel open for async response
    }
    
    if (request.action === 'contentRestored') {
        console.log('Background: Received contentRestored request:', request.payload);
        handleContentRestored(request.payload);
        sendResponse({ success: true });
        return true; // Keep the message channel open for async response
    }
    
    if (request.action === 'addVectorEmbedding') {
        console.log('Background: Adding vector embedding:', request.payload);
        addEmbeddingToVectorDetector(request.payload.text, request.payload.isMalicious);
        sendResponse({ success: true });
        return true;
    }
    
    if (request.action === 'getVectorStats') {
        console.log('Background: Getting vector statistics');
        const stats = getVectorAnalysisStats();
        sendResponse({ success: true, stats });
        return true;
    }
});

async function analyzeTextHybrid(text, sendResponse) {
    try {
        console.log('Background: Starting hybrid analysis for:', text.substring(0, 50) + '...');
        
        const analysis = analyzeWithHybridApproach(text);
        
        // Note: Stats are updated in logAttempt function, not here
        console.log('Background: Analysis complete, stats will be updated via logAttempt');
        
        const response_data = {
            result: analysis.is_malicious ? 'malicious' : 'safe',
            is_malicious: analysis.is_malicious, // Add this for compatibility
            confidence: analysis.confidence,
            malicious_probability: analysis.is_malicious ? analysis.confidence : 1 - analysis.confidence,
            safe_probability: analysis.is_malicious ? 1 - analysis.confidence : analysis.confidence,
            ml_prediction: analysis.is_malicious ? 'malicious' : 'safe',
            intent: analysis.intent,
            reasoning: analysis.reasoning,
            risk_level: analysis.risk_level,
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            python_model_used: false,
            analysis_method: analysis.method
        };
        
        console.log('Background: Sending response:', response_data);
        console.log('Response keys:', Object.keys(response_data));
        sendResponse(response_data);
        
    } catch (error) {
        console.error('Error in hybrid analysis:', error);
        
        const fallback_response = {
            result: 'safe',
            is_malicious: false, // Add this for compatibility
            confidence: 0.3,
            malicious_probability: 0.3,
            safe_probability: 0.7,
            ml_prediction: 'safe',
            intent: 'unknown',
            reasoning: ['Analysis error, defaulting to safe'],
            risk_level: 'low',
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            python_model_used: false,
            analysis_method: 'fallback'
        };
        
        sendResponse(fallback_response);
    }
}

function analyzeWithHybridApproach(text) {
    console.log('Starting hybrid analysis for:', text);
    
    if (!text || text.trim().length < 5) {
        return {
            intent: 'unknown',
            confidence: 0.3,
            is_malicious: false,
            reasoning: ['Text too short for reliable analysis'],
            risk_level: 'low',
            method: 'rule_based'
        };
    }
    
    const text_lower = text.toLowerCase().trim();
    
    // STEP 0: RULE-BASED ANALYSIS FIRST (Most reliable for known patterns)
    console.log('🔍 Starting rule-based analysis...');
    
    // STEP 1: HIGH PROBABILITY RULE-BASED (Obvious malicious patterns)
    
    // STEP 1: HIGH PROBABILITY RULE-BASED (Obvious malicious patterns)
    const high_risk_patterns = [
        // Violence against people
        'how to kill a person', 'how to kill someone', 'how to murder someone',
        'how to assassinate', 'how to murder', 'how to kill myself',
        'how to commit suicide', 'how to end my life', 'how to die', 'how to kill a man',
        'how to kill a woman', 'how to kill people', 'how to murder people',
        'how to eliminate', 'how to get rid of', 'how to dispose of',
        'how to hurt someone', 'how to harm someone', 'how to injure someone',
        'how to attack someone', 'how to assault someone', 'how to beat someone',
        
        // Weapons and explosives
        'how to make a bomb', 'how to create explosives', 'how to build a bomb',
        'how to make explosives', 'how to create a bomb', 'how to build explosives',
        'how to make gunpowder', 'how to make dynamite', 'how to make tnt',
        'how to make molotov', 'how to make grenade', 'how to make weapon',
        'how to build weapon', 'how to create weapon', 'how to make arms',
        'how to make ammunition', 'how to make bullets', 'how to make shells',
        
        // Harmful content creation
        'create nude image', 'make nude image', 'generate nude image',
        'create porn video', 'make porn video', 'generate porn video',
        'create porn', 'make porn', 'generate porn',
        'create a porn', 'make a porn', 'generate a porn',
        'create porn content', 'make porn content', 'generate porn content',
        'create deepfake', 'generate deepfake',
        'create fake nude', 'make fake nude', 'generate fake nude',
        'create revenge porn', 'make revenge porn', 'generate revenge porn',
        'create fake video', 'make fake video', 'generate fake video',
        'create fake image', 'make fake image', 'generate fake image',
        'create fake photo', 'make fake photo', 'generate fake photo',
        
        // Poisoning and harmful substances
        'how to poison someone', 'how to poison food', 'how to poison drink',
        'how to poison water', 'how to poison air', 'how to poison gas',
        'how to make poison', 'how to create poison', 'how to brew poison',
        'how to make drugs', 'how to create drugs', 'how to manufacture drugs',
        'how to make a drug', 'how to create a drug', 'how to manufacture a drug',
        'how to sell drugs', 'how to distribute drugs', 'how to traffic drugs',
        'how to sell a drug', 'how to distribute a drug', 'how to traffic a drug',
        'how to market drugs', 'how to advertise drugs', 'how to promote drugs',
        'how to market a drug', 'how to advertise a drug', 'how to promote a drug',
        'how to make cocaine', 'how to make heroin', 'how to make meth',
        'how to make lsd', 'how to make ecstasy', 'how to make marijuana',
        'how to make weed', 'how to make pot', 'how to make cannabis',
        'how to make amphetamine', 'how to make speed', 'how to make crack',
        'how to make crystal', 'how to make ice', 'how to make mdma',
        'how to make pills', 'how to make tablets', 'how to make powder',
        'how to make liquid', 'how to make injection', 'how to make syringe',
        
        // Hacking and cyber attacks
        'how to hack', 'how to hack into', 'how to hack computer',
        'how to hack system', 'how to hack network', 'how to hack website',
        'how to hack account', 'how to hack password', 'how to hack email',
        'how to hack social media', 'how to hack facebook', 'how to hack instagram',
        'how to hack twitter', 'how to hack snapchat', 'how to hack whatsapp',
        'how to hack phone', 'how to hack iphone', 'how to hack android',
        'how to hack wifi', 'how to hack router', 'how to hack camera',
        'how to hack microphone', 'how to hack webcam', 'how to hack gps',
        
        // Cheating and fraud
        'how to cheat', 'how to cheat in', 'how to cheat on',
        'how to scam', 'how to fraud', 'how to steal',
        'how to cheat in exam', 'how to cheat in test', 'how to cheat in quiz',
        'how to cheat in game', 'how to cheat in online', 'how to cheat in casino',
        'how to scam people', 'how to scam money', 'how to scam online',
        'how to fraud people', 'how to fraud money', 'how to fraud bank',
        'how to steal money', 'how to steal data', 'how to steal identity',
        'how to steal credit card', 'how to steal password', 'how to steal account',
        
        // Identity theft and privacy violations
        'how to steal identity', 'how to steal personal info', 'how to steal data',
        'how to hack identity', 'how to hack personal info', 'how to hack data',
        'how to get personal info', 'how to get private info', 'how to get secret info',
        'how to spy on', 'how to stalk', 'how to track without permission',
        'how to monitor without consent', 'how to record without permission',
        
        // Financial crimes
        'how to counterfeit', 'how to make fake money', 'how to create fake money',
        'how to forge', 'how to make fake', 'how to create fake',
        'how to launder money', 'how to hide money', 'how to conceal money',
        'how to evade tax', 'how to avoid tax', 'how to cheat tax',
        
        // Terrorism and extremism
        'how to make terrorist', 'how to create terrorist', 'how to build terrorist',
        'how to make extremist', 'how to create extremist', 'how to build extremist',
        'how to radicalize', 'how to indoctrinate', 'how to brainwash',
        
        // Child exploitation
        'how to exploit child', 'how to abuse child', 'how to harm child',
        'how to hurt child', 'how to manipulate child', 'how to groom child',
        'child porn', 'child pornography', 'child exploitation',
        
        // Animal cruelty
        'how to torture animal', 'how to hurt animal', 'how to harm animal',
        'how to kill animal', 'how to abuse animal', 'how to mistreat animal',
        'how to fight animal', 'how to make animal fight', 'how to organize fight',
        
        // Additional malicious patterns for better coverage
        'create a deepfake', 'generate a deepfake', 'produce a deepfake',
        'make a deepfake',
        'poison someone', 'poison food', 'poison water',
        'how do i kill myself', 'how do i commit suicide', 'how do i end my life', 'how do i take my own life',
        'how to poison ourselves', 'artemin'
    ];
    
    // STEP 2: LOW PROBABILITY RULE-BASED (Obvious safe patterns) - Check FIRST
    const safe_patterns = [
        // Harmless targets
        'how to kill mosquitos', 'how to kill bugs', 'how to kill insects',
        'how to kill pests', 'how to kill weeds', 'how to kill time',
        'how to kill bacteria', 'how to kill germs', 'how to kill viruses',
        'how to kill flies', 'how to kill ants', 'how to kill spiders',
        
        // Educational and legitimate topics
        'how to become rich', 'how to make money', 'how to earn money',
        'how to start a business', 'how to invest', 'how to save money',
        'how to learn', 'how to study', 'how to improve',
        'how to cook', 'how to clean', 'how to organize',
        'how to exercise', 'how to diet', 'how to lose weight',
        'how to gain weight', 'how to build muscle',
        'how to write', 'how to read', 'how to speak',
        'how to drive', 'how to swim', 'how to dance',
        
        // Technology (legitimate)
        'how to code', 'how to program', 'how to develop',
        'how to design', 'how to create a website', 'how to build an app',
        'how to use', 'how to install', 'how to configure',
        
        // UI/Design related content (legitimate)
        'better ui', 'better ux', 'ui design', 'ux design', 'user interface',
        'user experience', 'css styling', 'css design', 'web design',
        'interface design', 'ui improvement', 'ux improvement',
        'better interface', 'better design', 'improve ui', 'improve ux',
        
        // Personal development
        'how to be happy', 'how to be confident', 'how to be successful',
        'how to be healthy', 'how to be productive', 'how to be organized',
        'how to be creative', 'how to be positive', 'how to be motivated',
        
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
    
    // Check safe patterns FIRST (priority over malicious patterns) - More specific matching
    for (const pattern of safe_patterns) {
        // Use more specific matching to avoid false positives
        const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(text_lower)) {
            console.log('🔍 Safe pattern matched:', pattern, 'for text:', text_lower);
            return {
                intent: 'educational',
                confidence: 0.1,
                is_malicious: false,
                reasoning: [`Safe pattern detected: ${pattern}`],
                risk_level: 'low',
                method: 'rule_based_low'
            };
        }
    }
    
    // STEP 3: HIGH PROBABILITY RULE-BASED (Obvious malicious patterns) - Check AFTER safe patterns
    for (const pattern of high_risk_patterns) {
        if (text_lower.includes(pattern)) {
            console.log('🚨 Malicious pattern matched:', pattern, 'for text:', text_lower);
            return {
                intent: 'malicious',
                confidence: 0.95,
                is_malicious: true,
                reasoning: [`High risk pattern detected: ${pattern}`],
                risk_level: 'high',
                method: 'rule_based_high'
            };
        }
    }
    
    // STEP 4: MEDIUM PROBABILITY - Use NLP Analysis
    const medium_risk_indicators = [
        'how to lie', 'how to manipulate', 'how to deceive', 'how to trick'
    ];
    
    // Check for medium risk patterns (more specific)
    const has_medium_risk = medium_risk_indicators.some(indicator => text_lower.includes(indicator));
    
    // Check for ambiguous patterns that need NLP analysis
    const ambiguous_patterns = [
        'how to create', 'how to make', 'how to build', 'how to generate'
    ];
    
    const has_ambiguous_pattern = ambiguous_patterns.some(pattern => text_lower.includes(pattern));
    
    // IMPORTANT: Check for specific malicious combinations before treating as ambiguous
    const specific_malicious_combinations = [
        'how to make a bomb', 'how to create a bomb', 'how to build a bomb',
        'how to make explosives', 'how to create explosives', 'how to build explosives',
        'how to create deepfake', 'how to make deepfake', 'how to generate deepfake',
        'how to create fake', 'how to make fake', 'how to generate fake',
        'how to create nude', 'how to make nude', 'how to generate nude',
        'how to create porn', 'how to make porn', 'how to generate porn',
        'how to sell drugs', 'how to distribute drugs', 'how to traffic drugs',
        'how to make a drug', 'how to create a drug', 'how to manufacture a drug',
        'how to sell a drug', 'how to distribute a drug', 'how to traffic a drug'
    ];
    
    // Check specific malicious combinations first
    for (const combination of specific_malicious_combinations) {
        if (text_lower.includes(combination)) {
            console.log('🚨 Specific malicious combination detected:', combination);
            return {
                intent: 'malicious',
                confidence: 0.95,
                is_malicious: true,
                reasoning: [`Specific malicious combination detected: ${combination}`],
                risk_level: 'high',
                method: 'rule_based_specific'
            };
        }
    }
    
    // Only use NLP analysis if text is long enough for reliable analysis
    if ((has_medium_risk || has_ambiguous_pattern) && text_lower.length >= 20) {
        console.log('Medium risk or ambiguous pattern detected, using NLP analysis...');
        return analyzeWithNLP(text);
    }
    
    // For short ambiguous patterns, be more lenient
    if (has_ambiguous_pattern && text_lower.length < 20) {
        // Be extra lenient for incomplete phrases that end with articles or prepositions
        if (text_lower.endsWith(' a ') || text_lower.endsWith(' an ') || text_lower.endsWith(' the ') || 
            text_lower.endsWith(' a') || text_lower.endsWith(' an') || text_lower.endsWith(' the') ||
            text_lower.endsWith(' for ') || text_lower.endsWith(' to ') || text_lower.endsWith(' of ') ||
            text_lower.endsWith(' for') || text_lower.endsWith(' to') || text_lower.endsWith(' of')) {
            return {
                intent: 'unknown',
                confidence: 0.1,
                is_malicious: false,
                reasoning: ['Incomplete phrase detected - likely safe'],
                risk_level: 'low',
                method: 'rule_based_incomplete'
            };
        }
        
        return {
            intent: 'unknown',
            confidence: 0.2,
            is_malicious: false,
            reasoning: ['Ambiguous pattern detected but text too short for reliable analysis'],
            risk_level: 'low',
            method: 'rule_based_ambiguous'
        };
    }
    
    // For very short text (less than 15 characters), be very lenient
    if (text_lower.length < 15) {
        return {
            intent: 'unknown',
            confidence: 0.1,
            is_malicious: false,
            reasoning: ['Text too short for reliable analysis'],
            risk_level: 'low',
            method: 'rule_based_short'
        };
    }
    
    // STEP 4: VECTOR-BASED ANALYSIS (For unknown patterns)
    if (text.length >= 10) { // Only use vectors for longer text
        console.log('🔍 Using vector-based analysis for unknown patterns...');
        const vectorResult = vectorDetector.analyzeWithVectors(text);
        
        // If vector analysis gives high confidence, use it
        if (vectorResult.confidence > 0.8) {
            console.log('✅ High confidence vector result:', vectorResult);
            return vectorResult;
        }
        
        // If vector analysis gives medium confidence, use it as a strong signal
        if (vectorResult.confidence > 0.6) {
            console.log('⚠️ Medium confidence vector result, will influence final decision');
            // Continue with NLP analysis but consider vector result
        }
    }
    
    // STEP 5: NEW PATTERNS - Use NLP Analysis
    console.log('New pattern detected, using NLP analysis...');
    return analyzeWithNLP(text);
}

function analyzeWithNLP(text) {
    console.log('Starting NLP analysis for:', text);
    
    const text_lower = text.toLowerCase().trim();
    const reasoning = [];
    let confidence = 0.5;
    let intent = 'unknown';
    
    // Check if text is too short for reliable NLP analysis
    if (text_lower.length < 15) {
        return {
            intent: 'unknown',
            confidence: 0.3,
            is_malicious: false,
            reasoning: ['Text too short for reliable NLP analysis'],
            risk_level: 'low',
            method: 'nlp_analysis_short'
        };
    }
    
    // NLP Feature 1: Intent Analysis
    const intent_scores = analyzeIntent(text_lower);
    
    // NLP Feature 2: Context Similarity
    const context_similarity = analyzeContextSimilarity(text_lower);
    
    // NLP Feature 3: Sentence Structure Analysis
    const structure_analysis = analyzeSentenceStructure(text_lower);
    
    // Combine NLP features for final classification
    let educational_score = intent_scores.educational + context_similarity.educational;
    let malicious_score = intent_scores.malicious + context_similarity.malicious;
    let personal_info_score = intent_scores.personal_info + context_similarity.personal_info;
    
    // Adjust based on sentence structure
    if (structure_analysis.is_question) {
        educational_score += 0.2;
        malicious_score -= 0.1;
    }
    
    if (structure_analysis.is_command) {
        malicious_score += 0.2;
        educational_score -= 0.1;
    }
    
    // For partial text, be more lenient (but not for obvious malicious patterns)
    if (text_lower.length < 25) {
        // Check if it contains obvious malicious words
        const obvious_malicious_words = ['hack', 'steal', 'cheat', 'scam', 'fraud', 'bomb', 'kill', 'poison', 'lie', 'manipulate', 'deceive', 'trick'];
        const has_obvious_malicious = obvious_malicious_words.some(word => text_lower.includes(word));
        
        if (!has_obvious_malicious) {
            malicious_score *= 0.8; // Reduce malicious score for shorter text
            educational_score *= 1.1; // Increase educational score for shorter text
        }
    }
    
    // Determine dominant intent
    const max_score = Math.max(educational_score, malicious_score, personal_info_score);
    
    if (max_score === educational_score) {
        intent = 'educational';
        confidence = Math.min(0.8, educational_score);
        reasoning.push('NLP: Educational intent detected');
    } else if (max_score === malicious_score) {
        intent = 'malicious';
        confidence = Math.min(0.9, malicious_score);
        reasoning.push('NLP: Malicious intent detected');
    } else {
        intent = 'personal_info';
        confidence = Math.min(0.9, personal_info_score);
        reasoning.push('NLP: Personal information intent detected');
    }
    
    // Add structure analysis to reasoning
    if (structure_analysis.is_question) {
        reasoning.push('Sentence structure: Question format detected');
    }
    if (structure_analysis.is_command) {
        reasoning.push('Sentence structure: Command format detected');
    }
    
    const is_malicious = intent === 'malicious' || intent === 'personal_info';
    
    return {
        intent: intent,
        confidence: confidence,
        is_malicious: is_malicious,
        reasoning: reasoning,
        risk_level: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low',
        method: 'nlp_analysis'
    };
}

function analyzeIntent(text) {
    const intent_scores = {
        educational: 0,
        malicious: 0,
        personal_info: 0
    };
    
    // Educational intent patterns
    const educational_patterns = {
        question_words: ['what', 'how', 'why', 'when', 'where', 'who', 'which'],
        educational_verbs: ['explain', 'describe', 'discuss', 'analyze', 'research', 'study', 'learn'],
        context_modifiers: ['detect', 'prevent', 'identify', 'recognize', 'spot', 'avoid', 'protect'],
        research_words: ['research', 'study', 'investigate', 'examine', 'explore', 'review']
    };
    
    // Check educational patterns
    if (educational_patterns.question_words.some(word => text.includes(word))) {
        intent_scores.educational += 0.3;
    }
    if (educational_patterns.educational_verbs.some(verb => text.includes(verb))) {
        intent_scores.educational += 0.4;
    }
    if (educational_patterns.context_modifiers.some(mod => text.includes(mod))) {
        intent_scores.educational += 0.5;
    }
    if (educational_patterns.research_words.some(word => text.includes(word))) {
        intent_scores.educational += 0.3;
    }
    
    // Malicious intent patterns
    const malicious_patterns = {
        action_verbs: ['create', 'make', 'build', 'generate', 'produce', 'develop', 'hack', 'steal'],
        harmful_objects: ['bomb', 'weapon', 'virus', 'malware', 'scam', 'deepfake', 'fake'],
        instruction_words: ['how to', 'tutorial', 'guide', 'instructions', 'steps', 'method']
    };
    
    // Check malicious patterns
    if (malicious_patterns.action_verbs.some(verb => text.includes(verb))) {
        intent_scores.malicious += 0.3;
    }
    if (malicious_patterns.harmful_objects.some(obj => text.includes(obj))) {
        intent_scores.malicious += 0.4;
    }
    if (malicious_patterns.instruction_words.some(word => text.includes(word))) {
        intent_scores.malicious += 0.2;
    }
    
    // Personal info patterns
    const personal_patterns = {
        possession_words: ['my', 'i have', 'my personal', 'my private', 'my own'],
        data_types: ['email', 'phone', 'address', 'card', 'password', 'ssn', 'birthday'],
        sharing_indicators: ['is', 'are', 'number', 'details', 'information', 'account']
    };
    
    // Check personal info patterns
    if (personal_patterns.possession_words.some(word => text.includes(word))) {
        intent_scores.personal_info += 0.3;
    }
    if (personal_patterns.data_types.some(data_type => text.includes(data_type))) {
        intent_scores.personal_info += 0.4;
    }
    if (personal_patterns.sharing_indicators.some(indicator => text.includes(indicator))) {
        intent_scores.personal_info += 0.2;
    }
    
    // Normalize scores
    const total_score = Object.values(intent_scores).reduce((sum, score) => sum + score, 0);
    if (total_score > 0) {
        Object.keys(intent_scores).forEach(key => {
            intent_scores[key] = intent_scores[key] / total_score;
        });
    }
    
    return intent_scores;
}

function analyzeContextSimilarity(text) {
    // Context examples for similarity analysis
    const context_examples = {
        educational: [
            "how to detect deepfake videos",
            "what are the signs of a scam",
            "explain how to prevent cyber attacks",
            "research about online threats",
            "how to identify fake news",
            "how to become rich",
            "how to make money",
            "how to start a business",
            "how to create a website",
            "how to create an app",
            "how to create content",
            "how to create a presentation",
            "how to create a resume",
            "how to create a budget",
            "how to create a plan",
            "how to create art",
            "how to create music",
            "how to create a story",
            "how to create a video",
            "how to create a blog"
        ],
        malicious: [
            "how to create a deepfake video",
            "how to make a bomb",
            "how to hack into a computer",
            "how to steal credit card information",
            "how to create a scam",
            "how to cheat in games",
            "how to create malware",
            "how to create a virus",
            "how to create fake documents",
            "how to create fake money",
            "how to create a phishing site"
        ],
        personal_info: [
            "my email is john@example.com",
            "my phone number is 555-123-4567",
            "my credit card number is 1234-5678-9012-3456",
            "my password is secret123",
            "my address is 123 Main Street"
        ]
    };
    
    // Improved similarity calculation with partial text handling
    const text_words = new Set(text.split(/\s+/));
    const text_length = text_words.size;
    
    const similarities = {};
    
    for (const [context_type, examples] of Object.entries(context_examples)) {
        let max_similarity = 0;
        
        for (const example of examples) {
            const example_words = new Set(example.toLowerCase().split(/\s+/));
            const intersection = new Set([...text_words].filter(word => example_words.has(word)));
            const union = new Set([...text_words, ...example_words]);
            
            // Calculate base similarity
            let similarity = union.size > 0 ? intersection.size / union.size : 0;
            
            // For short text (partial typing), be more lenient
            if (text_length < 4) {
                // Require higher word overlap for short text
                const overlap_ratio = intersection.size / Math.max(text_length, 1);
                if (overlap_ratio < 0.8) {
                    similarity *= 0.5; // Reduce similarity for partial matches
                }
            }
            
            // Penalize very short text that might be incomplete
            if (text_length < 3) {
                similarity *= 0.7;
            }
            
            max_similarity = Math.max(max_similarity, similarity);
        }
        
        similarities[context_type] = max_similarity;
    }
    
    return similarities;
}

function analyzeSentenceStructure(text) {
    const analysis = {
        is_question: false,
        is_command: false,
        complexity: 'simple'
    };
    
    // Check for question structure
    const question_words = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
    if (text.includes('?') || question_words.some(word => text.includes(word))) {
        analysis.is_question = true;
    }
    
    // Check for command structure
    const command_indicators = ['create', 'make', 'build', 'generate', 'produce', 'develop'];
    if (command_indicators.some(indicator => text.includes(indicator))) {
        analysis.is_command = true;
    }
    
    // Analyze complexity
    const word_count = text.split(/\s+/).length;
    if (word_count > 10) {
        analysis.complexity = 'complex';
    } else if (word_count > 5) {
        analysis.complexity = 'medium';
    }
    
    return analysis;
}

function logAttempt(payload) {
    console.log('Logging attempt:', payload);
    
    chrome.storage.local.get(['history', 'stats'], (data) => {
        const history = data.history || [];
        const stats = data.stats || { total: 0, blocked: 0 };
        
        console.log('Current history length:', history.length);
        console.log('Current stats:', stats);
        
        const newEntry = {
            ...payload,
            timestamp: Date.now()
        };
        
        history.unshift(newEntry);
        console.log('Added new entry:', newEntry);
        
        // Update stats based on the logged result
        stats.total += 1;
        if (payload.result === 'malicious' || payload.result === 'personal_info_blocked') {
            stats.blocked += 1;
            console.log('Incrementing blocked count for result:', payload.result);
        }
        
        // Keep only last 100 entries
        if (history.length > 100) {
            const removed = history.splice(100);
            console.log('Removed old entries:', removed.length);
        }
        
        chrome.storage.local.set({ history, stats }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving history/stats:', chrome.runtime.lastError);
            } else {
                console.log('History and stats successfully updated, new length:', history.length, 'new stats:', stats);
            }
        });
    });
}

// Handle content restoration - adjust stats when user restores content
function handleContentRestored(payload) {
    console.log('Handling content restoration:', payload);
    
    chrome.storage.local.get(['history', 'stats'], (data) => {
        const history = data.history || [];
        const stats = data.stats || { total: 0, blocked: 0 };
        
        console.log('Current stats before restoration adjustment:', stats);
        
        // Find the most recent entry with the same text and mark it as restored
        const recentEntry = history.find(entry => 
            entry.text === payload.text && 
            entry.result === 'malicious' && 
            !entry.restored
        );
        
        if (recentEntry) {
            recentEntry.restored = true;
            recentEntry.restoredAt = Date.now();
            console.log('Marked entry as restored:', recentEntry);
            
            // Decrement the blocked count since user chose to allow this content
            if (stats.blocked > 0) {
                stats.blocked -= 1;
                console.log('Decremented blocked count due to restoration');
            }
            
            chrome.storage.local.set({ history, stats }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error updating stats for restoration:', chrome.runtime.lastError);
                } else {
                    console.log('Stats updated after restoration, new stats:', stats);
                }
            });
        } else {
            console.log('No matching entry found to mark as restored');
        }
    });
}

// Vector-based detection system with cosine similarity
class VectorDetector {
    constructor() {
        // Pre-computed embeddings for malicious and safe content
        this.maliciousEmbeddings = [
            // Violence
            this.textToVector('how to kill someone'),
            this.textToVector('how to murder a person'),
            this.textToVector('how to assassinate someone'),
            this.textToVector('how to commit suicide'),
            this.textToVector('how to end my life'),
            
            // Weapons and explosives
            this.textToVector('how to make a bomb'),
            this.textToVector('how to create explosives'),
            this.textToVector('how to build a weapon'),
            this.textToVector('how to make gunpowder'),
            
            // Drugs and harmful substances
            this.textToVector('how to make drugs'),
            this.textToVector('how to create cocaine'),
            this.textToVector('how to manufacture heroin'),
            this.textToVector('how to make meth'),
            this.textToVector('how to produce marijuana'),
            
            // Hacking and cyber attacks
            this.textToVector('how to hack into a computer'),
            this.textToVector('how to hack someone account'),
            this.textToVector('how to steal passwords'),
            this.textToVector('how to hack social media'),
            
            // Harmful content creation
            this.textToVector('create nude image'),
            this.textToVector('make fake video'),
            this.textToVector('generate deepfake'),
            this.textToVector('create revenge porn'),
            
            // Fraud and theft
            this.textToVector('how to scam people'),
            this.textToVector('how to steal money'),
            this.textToVector('how to commit fraud'),
            this.textToVector('how to steal identity'),
            
            // Child exploitation
            this.textToVector('child pornography'),
            this.textToVector('exploit children'),
            this.textToVector('harm child'),
            
            // Animal cruelty
            this.textToVector('torture animal'),
            this.textToVector('hurt animal'),
            this.textToVector('abuse animal')
        ];
        
        this.safeEmbeddings = [
            // Educational
            this.textToVector('calculate average of marks'),
            this.textToVector('solve math problem'),
            this.textToVector('homework help'),
            this.textToVector('study guide'),
            this.textToVector('educational content'),
            
            // Health and medical
            this.textToVector('how to treat illness'),
            this.textToVector('medical advice'),
            this.textToVector('health tips'),
            this.textToVector('how to stay healthy'),
            
            // Cooking and food
            this.textToVector('how to cook pasta'),
            this.textToVector('recipe for dinner'),
            this.textToVector('cooking instructions'),
            this.textToVector('how to make food'),
            this.textToVector('how to make meal'),
            this.textToVector('how to make dinner'),
            this.textToVector('how to make lunch'),
            this.textToVector('how to make breakfast'),
            this.textToVector('how to make pasta'),
            this.textToVector('how to make rice'),
            this.textToVector('how to make soup'),
            this.textToVector('how to make salad'),
            this.textToVector('how to make sandwich'),
            this.textToVector('how to make pizza'),
            
            // Technology and software
            this.textToVector('how to code'),
            this.textToVector('programming tutorial'),
            this.textToVector('how to create website'),
            this.textToVector('software development'),
            this.textToVector('how to make app'),
            this.textToVector('how to make program'),
            this.textToVector('how to make software'),
            
            // Creative and artistic
            this.textToVector('how to draw'),
            this.textToVector('create art'),
            this.textToVector('how to paint'),
            this.textToVector('artistic tutorial'),
            this.textToVector('how to make art'),
            this.textToVector('how to make music'),
            this.textToVector('how to make video'),
            this.textToVector('how to make film'),
            this.textToVector('how to make content'),
            this.textToVector('how to make design'),
            this.textToVector('how to make drawing'),
            this.textToVector('how to make painting'),
            this.textToVector('how to make sculpture'),
            this.textToVector('how to make craft'),
            
            // Sports and fitness
            this.textToVector('how to exercise'),
            this.textToVector('fitness training'),
            this.textToVector('workout routine'),
            this.textToVector('sports training'),
            this.textToVector('how to make progress'),
            this.textToVector('how to make improvement'),
            
            // Travel and navigation
            this.textToVector('travel guide'),
            this.textToVector('how to travel'),
            this.textToVector('vacation planning'),
            this.textToVector('trip advice'),
            this.textToVector('how to make plans'),
            this.textToVector('how to make reservation'),
            
            // Professional development
            this.textToVector('career advice'),
            this.textToVector('job interview tips'),
            this.textToVector('professional skills'),
            this.textToVector('work improvement'),
            this.textToVector('how to make money'),
            this.textToVector('how to make career'),
            this.textToVector('how to make business'),
            
            // Home and lifestyle
            this.textToVector('how to clean'),
            this.textToVector('home organization'),
            this.textToVector('lifestyle tips'),
            this.textToVector('home improvement'),
            this.textToVector('how to make home'),
            this.textToVector('how to make room'),
            this.textToVector('how to make space'),
            
            // General safe patterns
            this.textToVector('how to make'),
            this.textToVector('how to create'),
            this.textToVector('how to build'),
            this.textToVector('how to develop'),
            this.textToVector('how to produce'),
            this.textToVector('how to generate'),
            this.textToVector('how to form'),
            this.textToVector('how to construct'),
            this.textToVector('how to establish'),
            this.textToVector('how to set up'),
            this.textToVector('how to organize'),
            this.textToVector('how to arrange'),
            this.textToVector('how to prepare'),
            this.textToVector('how to plan'),
            this.textToVector('how to design'),
            this.textToVector('how to structure'),
            this.textToVector('how to compose'),
            this.textToVector('how to assemble'),
            this.textToVector('how to configure'),
            this.textToVector('how to customize')
        ];
        
        // Similarity thresholds
        this.maliciousThreshold = 0.75; // High similarity for malicious content
        this.safeThreshold = 0.70; // Lower threshold for safe content
    }
    
    // Convert text to vector representation (simplified TF-IDF like approach)
    textToVector(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2);
        
        // Create a simple word frequency vector
        const vector = {};
        words.forEach(word => {
            vector[word] = (vector[word] || 0) + 1;
        });
        
        return vector;
    }
    
    // Calculate cosine similarity between two vectors
    cosineSimilarity(vec1, vec2) {
        const words = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
        
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        words.forEach(word => {
            const val1 = vec1[word] || 0;
            const val2 = vec2[word] || 0;
            
            dotProduct += val1 * val2;
            norm1 += val1 * val1;
            norm2 += val2 * val2;
        });
        
        if (norm1 === 0 || norm2 === 0) return 0;
        
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }
    
    // Find the highest similarity score for a given text
    findHighestSimilarity(text, embeddings) {
        const textVector = this.textToVector(text);
        let maxSimilarity = 0;
        let bestMatch = null;
        
        embeddings.forEach((embedding, index) => {
            const similarity = this.cosineSimilarity(textVector, embedding);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestMatch = { similarity, index };
            }
        });
        
        return maxSimilarity;
    }
    
    // Analyze text using vector similarity
    analyzeWithVectors(text) {
        console.log('🔍 Vector analysis for:', text.substring(0, 50) + '...');
        
        // For very short text (less than 15 characters), be more lenient
        if (text.length < 15) {
            console.log('📏 Short text detected, using lenient analysis');
            return {
                is_malicious: false,
                confidence: 0.3,
                intent: 'safe',
                reasoning: ['Short text, defaulting to safe'],
                risk_level: 'low',
                method: 'vector_similarity_short',
                malicious_similarity: 0,
                safe_similarity: 0
            };
        }
        
        // Find highest similarity with malicious and safe embeddings
        const maliciousSimilarity = this.findHighestSimilarity(text, this.maliciousEmbeddings);
        const safeSimilarity = this.findHighestSimilarity(text, this.safeEmbeddings);
        
        console.log('📊 Similarity scores - Malicious:', maliciousSimilarity.toFixed(3), 'Safe:', safeSimilarity.toFixed(3));
        
        // For ambiguous short phrases like "how to make", be more lenient
        if (text.toLowerCase().trim() === 'how to make' || 
            text.toLowerCase().trim() === 'how to create' ||
            text.toLowerCase().trim() === 'how to build') {
            console.log('🛡️ Ambiguous phrase detected, defaulting to safe');
            return {
                is_malicious: false,
                confidence: 0.4,
                intent: 'safe',
                reasoning: ['Ambiguous phrase, defaulting to safe'],
                risk_level: 'low',
                method: 'vector_similarity_ambiguous',
                malicious_similarity: maliciousSimilarity,
                safe_similarity: safeSimilarity
            };
        }
        
        // For incomplete phrases that end with articles or prepositions, be very lenient
        const text_lower = text.toLowerCase().trim();
        if (text_lower.length < 20 && (
            text_lower.endsWith(' a') || text_lower.endsWith(' an') || text_lower.endsWith(' the') ||
            text_lower.endsWith(' for') || text_lower.endsWith(' to') || text_lower.endsWith(' of'))) {
            console.log('🛡️ Incomplete phrase detected in vector analysis, defaulting to safe');
            return {
                is_malicious: false,
                confidence: 0.2,
                intent: 'safe',
                reasoning: ['Incomplete phrase detected, defaulting to safe'],
                risk_level: 'low',
                method: 'vector_similarity_incomplete',
                malicious_similarity: maliciousSimilarity,
                safe_similarity: safeSimilarity
            };
        }
        
        // Determine result based on similarity scores
        if (maliciousSimilarity > this.maliciousThreshold) {
            return {
                is_malicious: true,
                confidence: maliciousSimilarity,
                intent: 'malicious',
                reasoning: [`High similarity (${maliciousSimilarity.toFixed(3)}) with malicious content`],
                risk_level: 'high',
                method: 'vector_similarity',
                malicious_similarity: maliciousSimilarity,
                safe_similarity: safeSimilarity
            };
        } else if (safeSimilarity > this.safeThreshold) {
            return {
                is_malicious: false,
                confidence: safeSimilarity,
                intent: 'safe',
                reasoning: [`High similarity (${safeSimilarity.toFixed(3)}) with safe content`],
                risk_level: 'low',
                method: 'vector_similarity',
                malicious_similarity: maliciousSimilarity,
                safe_similarity: safeSimilarity
            };
        } else {
            // Ambiguous case - use similarity ratio but be more lenient
            const ratio = maliciousSimilarity / (safeSimilarity + 0.001);
            const isMalicious = ratio > 1.5; // Increased threshold to 50% higher than safe
            
            return {
                is_malicious: isMalicious,
                confidence: Math.max(maliciousSimilarity, safeSimilarity),
                intent: isMalicious ? 'malicious' : 'safe',
                reasoning: [
                    `Ambiguous similarity - Malicious: ${maliciousSimilarity.toFixed(3)}, Safe: ${safeSimilarity.toFixed(3)}`,
                    `Ratio: ${ratio.toFixed(3)} (${isMalicious ? 'malicious' : 'safe'} based on ratio)`
                ],
                risk_level: isMalicious ? 'medium' : 'low',
                method: 'vector_similarity_ratio',
                malicious_similarity: maliciousSimilarity,
                safe_similarity: safeSimilarity,
                similarity_ratio: ratio
            };
        }
    }
}

// Initialize vector detector
const vectorDetector = new VectorDetector();

// Function to add new embeddings based on user feedback
function addEmbeddingToVectorDetector(text, isMalicious) {
    const embedding = vectorDetector.textToVector(text);
    
    if (isMalicious) {
        vectorDetector.maliciousEmbeddings.push(embedding);
        console.log('➕ Added malicious embedding:', text.substring(0, 50));
    } else {
        vectorDetector.safeEmbeddings.push(embedding);
        console.log('➕ Added safe embedding:', text.substring(0, 50));
    }
}

// Function to get vector analysis statistics
function getVectorAnalysisStats() {
    return {
        maliciousEmbeddings: vectorDetector.maliciousEmbeddings.length,
        safeEmbeddings: vectorDetector.safeEmbeddings.length,
        maliciousThreshold: vectorDetector.maliciousThreshold,
        safeThreshold: vectorDetector.safeThreshold
    };
}

// Enhanced Context Analysis
function analyzeWithEnhancedContext(text) {
    const text_lower = text.toLowerCase().trim();
    
    // Educational context indicators
    const educational_indicators = [
        'learn', 'study', 'understand', 'explain', 'what is', 'why do',
        'how does', 'tutorial', 'guide', 'educational', 'academic'
    ];
    
    // Harmful context indicators
    const harmful_indicators = [
        'illegal', 'unauthorized', 'malicious', 'harmful', 'dangerous',
        'weapon', 'explosive', 'poison', 'kill', 'hurt', 'damage'
    ];
    
    // Check for educational context
    const has_educational_context = educational_indicators.some(indicator => 
        text_lower.includes(indicator)
    );
    
    // Check for harmful context
    const has_harmful_context = harmful_indicators.some(indicator => 
        text_lower.includes(indicator)
    );
    
    // Length-based analysis
    if (text_lower.length < 20) {
        // For short text, be more lenient unless obviously harmful
        if (has_harmful_context) {
            return { malicious: true, confidence: 0.8, reason: 'Harmful context detected' };
        }
        return { malicious: false, confidence: 0.6, reason: 'Short text, no obvious harm' };
    }
    
    // For longer text, use more sophisticated analysis
    return analyzeWithHybridApproach(text);
}

// User Feedback System
let userFeedback = {
    falsePositives: [],
    falseNegatives: [],
    suggestions: []
};

// Adaptive Learning System
function updateDetectionPatterns(feedback) {
    if (feedback.type === 'falsePositive') {
        // Add to safe patterns
        safe_patterns.push(feedback.text.toLowerCase());
        console.log('Added to safe patterns:', feedback.text);
    } else if (feedback.type === 'falseNegative') {
        // Add to high risk patterns
        high_risk_patterns.push(feedback.text.toLowerCase());
        console.log('Added to high risk patterns:', feedback.text);
    }
    
    // Save updated patterns
    chrome.storage.local.set({
        userFeedback: userFeedback,
        safe_patterns: safe_patterns,
        high_risk_patterns: high_risk_patterns
    });
}

// Load user feedback on startup
chrome.storage.local.get(['userFeedback', 'safe_patterns', 'high_risk_patterns'], function(data) {
    if (data.userFeedback) {
        userFeedback = data.userFeedback;
    }
    if (data.safe_patterns) {
        safe_patterns = data.safe_patterns;
    }
    if (data.high_risk_patterns) {
        high_risk_patterns = data.high_risk_patterns;
    }
});

// Security and Privacy Enhancements
const ENCRYPTION_KEY = 'ai-detector-secure-key-2024';

// Simple encryption for sensitive data
function encryptData(data) {
    try {
        return btoa(JSON.stringify(data));
    } catch (error) {
        console.error('Encryption failed:', error);
        return data;
    }
}

function decryptData(encryptedData) {
    try {
        return JSON.parse(atob(encryptedData));
    } catch (error) {
        console.error('Decryption failed:', error);
        return encryptedData;
    }
}

// Secure storage functions
function secureStore(key, data) {
    const encryptedData = encryptData(data);
    chrome.storage.local.set({ [key]: encryptedData });
}

function secureRetrieve(key, callback) {
    chrome.storage.local.get([key], function(result) {
        if (result[key]) {
            const decryptedData = decryptData(result[key]);
            callback(decryptedData);
        } else {
            callback(null);
        }
    });
}

// Enhanced logging with privacy protection
function logSecureEvent(event) {
    const secureEvent = {
        ...event,
        timestamp: Date.now(),
        url: window.location.hostname, // Only store domain, not full URL
        userAgent: navigator.userAgent.substring(0, 50) // Truncated user agent
    };
    
    // Store encrypted logs
    secureStore('secureLogs', secureEvent);
}