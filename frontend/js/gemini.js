
import { GEMINI_API_KEY } from './config.js';


const GEMINI_API_URL = "https://genailanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";


export async function initGemini() {

  if (!GEMINI_API_KEY) {
    console.error("Gemini API key is missing. Please check your config.js file.");
    return false;
  }
  
  console.log("Gemini initialized successfully");
  return true;
}


export async function askGemini(prompt) {
    try {
      if (!GEMINI_API_KEY) {
        return "Gemini API key is not configured. Please check settings.";
      }
  
      console.log("Sending prompt to Gemini:", prompt); // Log the prompt
  
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            topP: 0.8,
            topK: 40
          }
        })
      });
  
      console.log("Gemini API Response Status:", response.status); // Log the status code
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API error:", errorData);
        return `Sorry, I couldn't process your request at this time. Status: ${response.status}`; // Include status in error message
      }
  
      const data = await response.json();
      console.log("Gemini API Response Data:", data); // Log the entire response data
  
      if (data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts &&
          data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text || "No response text found.";
      } else {
        console.error("Unexpected response format:", data);
        return "I received an unexpected response format. Please try again.";
      }
    } catch (error) {
      console.error("Error querying Gemini:", error);
      return "Sorry, there was an error communicating with the assistant service.";
    }
}