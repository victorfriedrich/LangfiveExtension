let sessionId: string | undefined;

let os_name: string | undefined;
let os_version: string | undefined;

async function getOrCreateUserId() {
  const result = await chrome.storage.local.get('userId');
  let userId = result.userId;
  if (!userId) {
    userId = self.crypto.randomUUID();
    await chrome.storage.local.set({ userId });
  }
  return userId;
}

// Word storage and retrieval system
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message.type);

  // Store words in chrome.storage.local
  if (message.type === "STORE_WORDS") {
    const { words, language } = message;
    console.log(`Storing ${words.length} ${language} words in storage`);
    
    chrome.storage.local.set({ 
      [`knownWords_${language}`]: words 
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error storing words:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log(`Successfully stored ${words.length} ${language} words`);
        sendResponse({ success: true });
      }
    });
    return true; // Important: Keeps the message channel open for async response
  }
  
  // Retrieve words from chrome.storage.local
  if (message.type === "GET_WORDS") {
    const { language } = message;
    console.log(`Getting ${language} words from storage`);
    
    chrome.storage.local.get(`knownWords_${language}`, (result) => {
      const words = result[`knownWords_${language}`] || [];
      console.log(`Retrieved ${words.length} ${language} words from storage`);
      sendResponse({ words });
    });
    return true; // Important: Keeps the message channel open for async response
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'session') {
    sessionId = crypto.randomUUID();
  }
  if (msg.type === 'view-popup') {
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_SUCCESS') {
    console.log('Received AUTH_SUCCESS message');
    
    // Store the session data in chrome.storage.local
    chrome.storage.local.set({ supabaseSession: message.session }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error storing session:', chrome.runtime.lastError);
      } else {
        console.log('Session stored successfully');
      }
    });

    // Optionally, you can send a response back to the auth handler
    sendResponse({ status: 'received' });

    // If you want to notify other parts of your extension about the successful auth

  }
});

function openReaderView(tabId) {
  console.log('Opening reader view for tab:', tabId);
  
  // First check if the tab exists
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error('Tab does not exist:', chrome.runtime.lastError);
      openReaderWithError('Tab does not exist');
      return;
    }
    
    // Try to inject the content script first to ensure it's available
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['src/contentScript.js'] // Update this to match your content script filename
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Could not inject content script:', chrome.runtime.lastError);
        // If we can't inject the script, try to extract content using DOM serialization
        extractArticleAsFallback(tabId);
        return;
      }
      
      // Give the content script a moment to initialize
      setTimeout(() => {
        // Now try to communicate with the content script
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_ARTICLE' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Could not communicate with content script:', chrome.runtime.lastError);
            extractArticleAsFallback(tabId);
            return;
          }
          
          if (response && response.article) {
            // Success! We have article content
            chrome.storage.local.set({ currentArticle: response.article }, () => {
              chrome.tabs.create({ url: chrome.runtime.getURL('src/reader.html') });
            });
          } else {
            console.error('No article data received');
            openReaderWithError('Could not extract article content');
          }
        });
      }, 200); // Small delay to ensure content script is ready
    });
  });
}

// Fallback extraction method using chrome.scripting
function extractArticleAsFallback(tabId) {
  console.log('Using fallback extraction method for tab:', tabId);
  
  // Execute script in the page to get the HTML content
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      // Simple extraction of page content
      const title = document.title;
      const content = document.body.innerText;
      return { title, content };
    }
  }, (results) => {
    if (chrome.runtime.lastError || !results || !results[0]) {
      console.error('Failed to extract using fallback:', chrome.runtime.lastError);
      openReaderWithError('Could not access page content');
      return;
    }
    
    const result = results[0].result;
    // @ts-ignore
    console.log('Extracted content using fallback:', result.title);
    
    // Send the raw content to the server for parsing
    fetch('https://major-wynny-victorfriedrich-7c04e8cd.koyeb.app/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      
      body: JSON.stringify({ 
        // @ts-ignore
        text: result.content,
        language: 'es' // Default language
      })
    })
    .then(response => response.json())
    .then(parsedArticle => {
      chrome.storage.local.set({ currentArticle: parsedArticle }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/reader.html') });
      });
    })
    .catch(error => {
      console.error('Error parsing with backend:', error);
      // Still open reader, but with raw content
      chrome.storage.local.set({ 
        currentArticle: { 
          // @ts-ignore
          title: result.title, 
          // @ts-ignore
          content: result.content 
        }
      }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/reader.html') });
      });
    });
  });
}

// Helper to open reader with an error message
// @ts-ignore
function openReaderWithError(errorMessage) {
  chrome.storage.local.set({ 
    currentArticle: { 
      title: 'Error Extracting Content', 
      content: `Sorry, we couldn't extract the article content: ${errorMessage}.` 
    }
  }, () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/reader.html') });
  });
}

// Update your command listener to use this function
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-reader') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        openReaderView(activeTab.id);
      }
    });
  }
});