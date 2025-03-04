// api-service.js - Hardcoded backend URL instead of process.env
// Define the backend URL directly - don't use process.env in browser context
const BACKEND_URL = 'https://major-wynny-victorfriedrich-7c04e8cd.koyeb.app';

// Parse article content using backend
window.parseArticleWithBackend = async function(articleContent, language) {
  try {
    console.log('Sending parse request to:', `${BACKEND_URL}/parse`);
    const response = await fetch(`${BACKEND_URL}/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text: articleContent,
        language: language
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error parsing article:', error);
    return null;
  }
};

// Get translation for word
window.fetchTranslation = async function(word, language) {
  try {
    console.log('Sending translation request for:', word);
    const response = await fetch(`${BACKEND_URL}/api/translate-word`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word, language }),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      id: parseInt(data.id),
      root: data.root,
      translation: data.translation,
    };
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
};

// Get translation for section
window.translateSection = async function(section, language) {
  try {
    console.log('Sending translation request for:', section);
    const response = await fetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ section, language }),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
};

// Save word to user's flashcards
window.saveWordToFlashcards = function(wordId) {
  // Use window.postMessage as specified in your code
  window.postMessage({
    source: "translationPopup",
    payload: { wordId }
  }, "*");
  
  try {
    // Also send message to background script if needed
    chrome.runtime.sendMessage({
      type: 'ADD_WORD_TO_FLASHCARDS',
      wordId: wordId
    });
  } catch (e) {
    console.warn('Could not send message to background script:', e);
    // Continue anyway since we already used postMessage
  }
};

// Log that API functions are ready
console.log('API functions initialized and ready');