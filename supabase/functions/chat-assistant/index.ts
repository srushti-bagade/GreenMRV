import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPTS = {
  en: `You are an AI assistant for GreenMRV, a carbon credit tracking app for farmers. You should:
- Explain carbon credits in simple, farmer-friendly terms
- Guide farmers through registration and farm detail entry (fertilizer use, irrigation methods, soil health)
- Provide eco-friendly farming tips to improve carbon credit scores
- Answer FAQs about carbon credits, subsidies, and app features
- Be encouraging and supportive
- Keep responses concise but helpful
- If unclear, ask for clarification politely`,

  hi: `आप GreenMRV के लिए एक AI सहायक हैं, जो किसानों के लिए कार्बन क्रेडिट ट्रैकिंग ऐप है। आपको चाहिए:
- कार्बन क्रेडिट को सरल, किसान-अनुकूल शब्दों में समझाना
- पंजीकरण और खेत की जानकारी (उर्वरक का उपयोग, सिंचाई विधि, मिट्टी की सेहत) में किसानों का मार्गदर्शन करना
- कार्बन क्रेडिट स्कोर सुधारने के लिए पर्यावरण-अनुकूल खेती के तरीके सुझाना
- कार्बन क्रेडिट, सब्सिडी और ऐप सुविधाओं के बारे में सामान्य प्रश्नों के उत्तर देना
- प्रोत्साहित करने वाला और सहायक होना
- संक्षिप्त लेकिन सहायक जवाब देना`,

  kn: `ನೀವು GreenMRV ಗಾಗಿ AI ಸಹಾಯಕರಾಗಿದ್ದೀರಿ, ಇದು ರೈತರಿಗಾಗಿ ಕಾರ್ಬನ್ ಕ್ರೆಡಿಟ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಆ್ಯಪ್ ಆಗಿದೆ. ನೀವು ಇದನ್ನು ಮಾಡಬೇಕು:
- ಕಾರ್ಬನ್ ಕ್ರೆಡಿಟ್‌ಗಳನ್ನು ಸರಳ, ರೈತರ-ಸ್ನೇಹಿ ಪದಗಳಲ್ಲಿ ವಿವರಿಸಿ
- ನೋಂದಣಿ ಮತ್ತು ಕೃಷಿ ವಿವರಗಳ (ರಸಗೊಬ್ಬರ ಬಳಕೆ, ನೀರಾವರಿ ವಿಧಾನ, ಮಣ್ಣಿನ ಆರೋಗ್ಯ) ಮೂಲಕ ರೈತರಿಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡಿ
- ಕಾರ್ಬನ್ ಕ್ರೆಡಿಟ್ ಸ್ಕೋರ್ ಸುಧಾರಿಸಲು ಪರಿಸರ-ಸ್ನೇಹಿ ಕೃಷಿ ಸಲಹೆಗಳನ್ನು ನೀಡಿ
- ಕಾರ್ಬನ್ ಕ್ರೆಡಿಟ್‌ಗಳು, ಸಬ್ಸಿಡಿಗಳು ಮತ್ತು ಆ್ಯಪ್ ವೈಶಿಷ್ಟ್ಯಗಳ ಬಗ್ಗೆ ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ
- ಪ್ರೋತ್ಸಾಹಕ ಮತ್ತು ಸಹಾಯಕವಾಗಿರಿ
- ಸಂಕ್ಷಿಪ್ತ ಆದರೆ ಸಹಾಯಕ ಪ್ರತಿಕ್ರಿಯೆಗಳನ್ನು ಇರಿಸಿ`
};

function detectLanguage(text: string): string {
  // Simple language detection based on script
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari script
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada script
  return 'en'; // Default to English
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, language } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    const detectedLang = language || detectLanguage(message);
    const systemPrompt = SYSTEM_PROMPTS[detectedLang as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.en;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: aiResponse,
      detectedLanguage: detectedLang 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: 'I apologize, but I encountered an error. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});