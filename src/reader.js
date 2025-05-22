// reader.js

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('reader-container');
  const language = "spanish";

  if (!container) {
    console.error('Reader container not found.');
    return;
  }

  // --- Load Article Content from Storage ---
  // Show a spinner while loading
  const spinnerElement = document.createElement('div');
  spinnerElement.className = 'spinner';
  spinnerElement.style.margin = '50px auto';
  container.appendChild(spinnerElement);

  chrome.storage.local.get('currentArticle', (articleResult) => {
    if (spinnerElement.parentNode) spinnerElement.parentNode.removeChild(spinnerElement);

    if (!articleResult.currentArticle) {
      container.innerHTML = '<p class="error">No article content available.</p>';
      return;
    }

    // Clear the container and add title if available and not present in content
    container.innerHTML = '';
    if (articleResult.currentArticle.title) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = articleResult.currentArticle.content || '';
      if (!tempDiv.querySelector('h1')) {
        const titleElement = document.createElement('h1');
        titleElement.textContent = articleResult.currentArticle.title;
        titleElement.className = 'article-title';
        container.appendChild(titleElement);
      }
    }

    // Insert the article content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'article-content';
    contentDiv.innerHTML = articleResult.currentArticle.content || '';
    container.appendChild(contentDiv);

    // Keep one reference so we can update highlights later
    let currentKnownWords = new Set();

    // Process text nodes to wrap words
    chrome.storage.local.get(`knownWords_${language}`, (result) => {
      const words = result[`knownWords_${language}`] || [];
      currentKnownWords = new Set(words.map(w => w.toLowerCase()));
      processTextNodes(contentDiv, currentKnownWords);
    });

    // Listen for the moment the background script finishes writing known words
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const key = `knownWords_${language}`;
      if (!changes[key]) return;

      // Build a fresh Set with the new data
      currentKnownWords = new Set(
        (changes[key].newValue || []).map((w) => w.toLowerCase())
      );

      // Walk every wrapped word once and update its state
      contentDiv.querySelectorAll('span.word').forEach((span) => {
        const unknown = !currentKnownWords.has(span.textContent.toLowerCase());
        span.classList.toggle('unknown-word', unknown);
      });
    });
  });

  // --- Attach event handlers ---
  container.addEventListener('click', e => {
    if (!e.target.classList?.contains('word')) return;

    // If it’s already active, close and bail out
    if (e.target.classList.contains('word-active')) {
      closeWordPopups();
      return;
    }

    // Otherwise show a new popup
    handleWordClick(e.target);

    // Don’t let this bubble up and trigger the document listener below
    e.stopPropagation();
  });

  // Handle clicks anywhere else to dismiss the popup
  document.addEventListener('click', e => {
    if (e.target.closest('.word-popup') || e.target.classList?.contains('word')) {
      return;
    }
    closeWordPopups();
  });

  // Install section translation functionality (text selection)
  setupSectionTranslation();

  // --- Initialize Sidebar, Settings Panel, and Scroll Progress ---
  initSidebar();
  initSettingsPanel();
  window.addEventListener('scroll', updateScrollProgress);
  updateScrollProgress(); // Set initial progress
});


// ====================== Text Processing Functions ======================

const SPECIAL_CHARS =
  ".,!?¿¡'\"1234567890()«»%: -_[]{}#@$&*+=|\\<>/~`^…;”“";

// Split text into groups of word and non-word characters, mark unknown words.
function groupText(text, knownWordsSet) {
  if (!text) return [];
  let result = [];
  let currentGroup = "";
  let currentIsSpecial = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isSpecial = SPECIAL_CHARS.indexOf(char) >= 0;
    if (currentGroup === "") {
      currentGroup = char;
      currentIsSpecial = isSpecial;
    } else if (isSpecial === currentIsSpecial) {
      currentGroup += char;
    } else {
      result.push({ content: currentGroup, isWord: !currentIsSpecial });
      currentGroup = char;
      currentIsSpecial = isSpecial;
    }
  }

  if (currentGroup !== "") {
    result.push({ content: currentGroup, isWord: !currentIsSpecial });
  }

  return result.map(group => {
    if (group.isWord) {
      group.unknown = !knownWordsSet.has(group.content.toLowerCase());
    }
    return group;
  });
}

// Process all text nodes within the container.
function processTextNodes(container, knownWordsSet) {
  if (!container) return;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  const nodesToProcess = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue?.trim().length > 0) {
      nodesToProcess.push(node);
    }
  }

  nodesToProcess.forEach(node => {
    const groups = groupText(node.nodeValue, knownWordsSet);
    const frag = document.createDocumentFragment();
    groups.forEach(group => {
      if (group.isWord) {
        const span = document.createElement('span');
        span.className = 'word' + (group.unknown ? ' unknown-word' : '');
        if (group.content.trim().length > 0) {
          span.textContent = group.content;
          frag.appendChild(span);
        }
      } else {
        frag.appendChild(document.createTextNode(group.content));
      }
    });
    if (node.parentNode) {
      node.parentNode.replaceChild(frag, node);
    }
  });
}


// ====================== Word Popup and Translation ======================

// Handle click on a word to show its translation popup.
function handleWordClick(wordElement) {
  closeWordPopups();
  if (!wordElement) return;

  wordElement.classList.add('word-active');

  // Create and show a loading popup for translation.
  const loadingPopup = createLoadingPopup();
  document.body.appendChild(loadingPopup);
  positionPopup(loadingPopup, wordElement);

  // Fetch translation (assuming window.fetchTranslation is available, or it will use our API below)
  window.fetchTranslation(wordElement.textContent, 'es')
    .then(translation => {
      loadingPopup.classList.remove('show');
      setTimeout(() => loadingPopup.parentNode?.removeChild(loadingPopup), 300);

      const popup = createWordPopup(wordElement.textContent, translation);
      document.body.appendChild(popup);
      positionPopup(popup, wordElement);
      setTimeout(() => popup.classList.add('show'), 10);
    })
    .catch(error => {
      console.error('Translation error:', error);
      const header = loadingPopup.querySelector('.popup-header');
      if (header) header.textContent = wordElement.textContent;
      const loadingContent = loadingPopup.querySelector('.loading-content');
      if (loadingContent) {
        loadingContent.innerHTML = '<p class="error">Error loading translation</p>';
      }
      const retryBtn = document.createElement('button');
      retryBtn.className = 'flashcard-btn';
      retryBtn.textContent = 'Try Again';
      retryBtn.addEventListener('click', () => {
        loadingPopup.classList.remove('show');
        setTimeout(() => {
          loadingPopup.parentNode?.removeChild(loadingPopup);
          handleWordClick(wordElement);
        }, 300);
      });
      loadingPopup.appendChild(retryBtn);
    });
}

// Create a loading popup element.
function createLoadingPopup() {
  const popup = document.createElement('div');
  popup.className = 'word-popup loading-popup';
  popup.innerHTML = `
    <div class="popup-header">Loading...</div>
    <div class="loading-content"><div class="spinner small"></div></div>
  `;
  return popup;
}

// Create a word popup element with translations.
function createWordPopup(wordText, translation) {
  const popup = document.createElement('div');
  popup.className = 'word-popup';

  // Popup header with the word
  const header = document.createElement('div');
  header.className = 'popup-header';
  header.textContent = wordText;
  if (translation?.root && translation.root !== wordText) {
    const rootSpan = document.createElement('span');
    rootSpan.className = 'word-root';
    rootSpan.textContent = ` (${translation.root})`;
    header.appendChild(rootSpan);
  }
  popup.appendChild(header);

  // Container for translations
  const translationsContainer = document.createElement('div');
  translationsContainer.className = 'translations-container';
  if (translation?.translation) {
    translation.translation.split(',').map(t => t.trim()).forEach((text, index) => {
      const translationEl = document.createElement('div');
      translationEl.className = `translation ${index === 0 ? 'high' : 'medium'}`;
      translationEl.textContent = text;
      translationsContainer.appendChild(translationEl);
    });
  } else {
    translationsContainer.innerHTML = '<div class="translation">No translation available</div>';
  }
  popup.appendChild(translationsContainer);

  // Button to add word to flashcards
  const flashcardBtn = document.createElement('button');
  flashcardBtn.className = 'flashcard-btn';
  flashcardBtn.textContent = 'Add to Flashcards';
  flashcardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    flashcardBtn.classList.add('pressed');
    if (translation?.id) {
      window.saveWordToFlashcards(translation.id);
    }
    setTimeout(() => {
      flashcardBtn.classList.remove('pressed');
      flashcardBtn.textContent = 'Added to Flashcards ✓';
      flashcardBtn.disabled = true;
    }, 300);
  });
  popup.appendChild(flashcardBtn);

  return popup;
}

// Position a popup relative to a reference element.
function positionPopup(popup, referenceElement) {
  if (!popup || !referenceElement) return;
  const rect = referenceElement.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  popup.style.top = `${rect.bottom + scrollTop + 10}px`;
  popup.style.left = `${rect.left}px`;

  const viewportWidth = window.innerWidth;
  const popupRect = popup.getBoundingClientRect();
  if (popupRect.right > viewportWidth - 20) {
    popup.style.left = `${viewportWidth - popupRect.width - 20}px`;
  }
}

// Remove all word popups and clear active word highlights.
function closeWordPopups() {
  document.querySelectorAll('.word-popup').forEach(popup => {
    popup.classList.remove('show');
    setTimeout(() => popup.parentNode?.removeChild(popup), 300);
  });
  document.querySelectorAll('.word-active').forEach(word => {
    word.classList.remove('word-active');
  });
}


// ====================== Section Translation (on Text Selection) ======================

function setupSectionTranslation() {
  let currentPopupInfo = null;
  let justSelected = false;

  function handleTextSelection(event) {
    if (event.target.closest('.dismissable-popup, .word-popup')) return;
    const selection = window.getSelection();
    if (!selection) return;
    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.split(/\s+/).length < 2) return;

    justSelected = true;
    let position = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const popupWidth = 400;
      let leftPos = rect.left + (rect.width / 2) - (popupWidth / 2);
      const viewportWidth = window.innerWidth;
      if (leftPos < 20) leftPos = 20;
      if (leftPos + popupWidth > viewportWidth - 20) leftPos = viewportWidth - popupWidth - 20;
      position = { top: `${rect.bottom + scrollTop + 10}px`, left: `${leftPos}px`, transform: 'none' };
    }

    currentPopupInfo = { text: selectedText, position };
    showTranslationLoadingPopup();
    fetchTranslation(selectedText);
  }

  function handleDocumentClick(event) {
    if (justSelected) { justSelected = false; return; }
    if (!event.target.closest('.dismissable-popup, .word-popup')) {
      removeTranslationPopups();
      currentPopupInfo = null;
    }
  }

  function removeTranslationPopups() {
    document.querySelectorAll('.dismissable-popup').forEach(popup => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 300);
    });
  }

  function showTranslationLoadingPopup() {
    removeTranslationPopups();
    const popup = document.createElement('div');
    popup.className = 'dismissable-popup';
    popup.id = 'dismissable-popup-' + Date.now();
    if (currentPopupInfo?.position) {
      Object.assign(popup.style, currentPopupInfo.position);
    }
    popup.innerHTML = `
      <div class="dismissable-original">${currentPopupInfo?.text || ''}</div>
      <div class="dismissable-loading">
        <div class="dismissable-spinner"></div>
        <div>Translating...</div>
      </div>
      <div class="dismissable-footer">Fetching translation...</div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('show'), 10);
  }

  function showTranslationPopup(translation) {
    const popupId = 'dismissable-popup-' + Date.now();
    const popup = document.createElement('div');
    popup.className = 'dismissable-popup';
    popup.id = popupId;
    if (currentPopupInfo?.position) {
      Object.assign(popup.style, currentPopupInfo.position);
    }
    popup.innerHTML = `
      <div class="dismissable-original">${currentPopupInfo?.text || ''}</div>
      <div class="dismissable-translation">${translation || 'No translation available'}</div>
      <div class="dismissable-footer">Powered by Neural Translation</div>
    `;
    document.body.appendChild(popup);
    if (currentPopupInfo) currentPopupInfo.translation = translation;
    setTimeout(() => {
      document.querySelectorAll('.dismissable-popup').forEach(existingPopup => {
        if (existingPopup.id !== popupId) existingPopup.remove();
      });
      popup.classList.add('show');
    }, 5);
  }

  function fetchTranslation(text) {
    fetch('https://major-wynny-victorfriedrich-7c04e8cd.koyeb.app/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: text, language: 'es' })
    })
      .then(response => {
        if (!response.ok) throw new Error(`Error ${response.status}`);
        return response.text();
      })
      .then(rawText => {
        let translationText = 'No translation available';
        try {
          const data = JSON.parse(rawText);
          if (typeof data === 'string' && data.trim()) {
            translationText = data;
          } else if (data?.translation && typeof data.translation === 'string') {
            translationText = data.translation;
          } else if (typeof data === 'object') {
            const stringProps = Object.values(data).filter(value => typeof value === 'string' && value.trim().length > 0);
            if (stringProps.length > 0) translationText = stringProps[0];
          }
        } catch (e) {
          if (rawText?.trim() && !rawText.includes('<!DOCTYPE html>')) translationText = rawText;
        }
        showTranslationPopup(translationText);
      })
      .catch(error => {
        showTranslationPopup(`Error: ${error.message || 'Failed to fetch translation'}`);
      });
  }

  // Clear any existing handlers if present.
  if (window._translationHandlers) {
    document.removeEventListener('mouseup', window._translationHandlers.selection);
    document.removeEventListener('click', window._translationHandlers.click);
  }
  window._translationHandlers = {
    selection: handleTextSelection,
    click: handleDocumentClick
  };
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('click', handleDocumentClick);
}


// ====================== Scroll Progress Indicator ======================

function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercentage = (scrollTop / scrollHeight) * 100;
  document.getElementById('scroll-progress-bar').style.width = scrollPercentage + '%';
}


// ====================== Sidebar and Settings Panel ======================

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('expanded');
  });
  initSidebarButtons();
}

function initSidebarButtons() {
  const translateBtn = document.getElementById('translate-page');
  const highlightBtn = document.getElementById('toggle-highlight');
  const flashcardsBtn = document.getElementById('access-flashcards');
  const settingsBtn = document.getElementById('reader-settings');

  // Translate page button handler
  translateBtn.addEventListener('click', () => {
    translateBtn.classList.toggle('active');
    alert('Translating entire page...');
    setTimeout(() => translateBtn.classList.remove('active'), 1000);
  });

  // Toggle highlighting for unknown words
  highlightBtn.addEventListener('click', () => {
    highlightBtn.classList.toggle('active');
    const unknownWords = document.querySelectorAll('.unknown-word');
    if (highlightBtn.classList.contains('active')) {
      unknownWords.forEach(word => {
        word.style.backgroundColor = 'transparent';
        word.style.borderBottom = 'none';
        word.classList.add('no-highlight');
      });
      const style = document.createElement('style');
      style.id = 'highlight-override';
      style.textContent = '.unknown-word.no-highlight::after { display: none !important; }';
      document.head.appendChild(style);
    } else {
      unknownWords.forEach(word => {
        word.style.backgroundColor = '';
        word.style.borderBottom = '';
        word.classList.remove('no-highlight');
      });
      const overrideStyle = document.getElementById('highlight-override');
      if (overrideStyle) overrideStyle.remove();
    }
  });

  // Flashcards button handler
  flashcardsBtn.addEventListener('click', () => {
    alert('Opening flashcards interface with your saved words...');
  });

  // Settings panel toggle
  settingsBtn.addEventListener('click', () => {
    document.getElementById('settings-panel').classList.toggle('show');
  });
}

function initSettingsPanel() {
  const settingsPanel = document.getElementById('settings-panel');
  const closeBtn = document.getElementById('close-settings');
  closeBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('show');
  });

  // Font size controls
  const decreaseFontBtn = document.getElementById('decrease-font');
  const increaseFontBtn = document.getElementById('increase-font');
  const fontSizeValue = document.getElementById('font-size-value');
  let currentFontSize = 18;
  decreaseFontBtn.addEventListener('click', () => {
    if (currentFontSize > 14) { currentFontSize -= 1; updateFontSize(); }
    updateFontControls();
  });
  increaseFontBtn.addEventListener('click', () => {
    if (currentFontSize < 24) { currentFontSize += 1; updateFontSize(); }
    updateFontControls();
  });
  function updateFontSize() {
    document.body.style.fontSize = `${currentFontSize}px`;
    fontSizeValue.textContent = `${currentFontSize}px`;
  }
  function updateFontControls() {
    decreaseFontBtn.disabled = currentFontSize <= 14;
    increaseFontBtn.disabled = currentFontSize >= 24;
  }

  // Line height controls
  const decreaseLineHeightBtn = document.getElementById('decrease-line-height');
  const increaseLineHeightBtn = document.getElementById('increase-line-height');
  const lineHeightValue = document.getElementById('line-height-value');
  let currentLineHeight = 1.7;
  decreaseLineHeightBtn.addEventListener('click', () => {
    if (currentLineHeight > 1.3) {
      currentLineHeight = Math.round((currentLineHeight - 0.1) * 10) / 10;
      updateLineHeight();
    }
    updateLineHeightControls();
  });
  increaseLineHeightBtn.addEventListener('click', () => {
    if (currentLineHeight < 2.2) {
      currentLineHeight = Math.round((currentLineHeight + 0.1) * 10) / 10;
      updateLineHeight();
    }
    updateLineHeightControls();
  });
  function updateLineHeight() {
    document.querySelectorAll('.article-content').forEach(content => {
      content.style.lineHeight = currentLineHeight;
    });
    lineHeightValue.textContent = currentLineHeight.toFixed(1);
  }
  function updateLineHeightControls() {
    decreaseLineHeightBtn.disabled = currentLineHeight <= 1.3;
    increaseLineHeightBtn.disabled = currentLineHeight >= 2.2;
  }

  // Text width controls
  const decreaseWidthBtn = document.getElementById('decrease-width');
  const increaseWidthBtn = document.getElementById('increase-width');
  const widthValue = document.getElementById('width-value');
  let currentWidth = 700;
  decreaseWidthBtn.addEventListener('click', () => {
    if (currentWidth > 500) { currentWidth -= 50; updateWidth(); }
    updateWidthControls();
  });
  increaseWidthBtn.addEventListener('click', () => {
    if (currentWidth < 900) { currentWidth += 50; updateWidth(); }
    updateWidthControls();
  });
  function updateWidth() {
    document.getElementById('reader-container').style.maxWidth = `${currentWidth}px`;
    widthValue.textContent = `${currentWidth}px`;
  }
  function updateWidthControls() {
    decreaseWidthBtn.disabled = currentWidth <= 500;
    increaseWidthBtn.disabled = currentWidth >= 900;
  }

  // Theme controls
  const themeLight = document.getElementById('theme-light');
  const themeSepia = document.getElementById('theme-sepia');
  const themeDark = document.getElementById('theme-dark');
  themeLight.addEventListener('click', () => setTheme('light'));
  themeSepia.addEventListener('click', () => setTheme('sepia'));
  themeDark.addEventListener('click', () => setTheme('dark'));
  function setTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-sepia', 'theme-dark');
    if (theme !== 'light') {
      document.body.classList.add(`theme-${theme}`);
    }
    themeLight.classList.toggle('active', theme === 'light');
    themeSepia.classList.toggle('active', theme === 'sepia');
    themeDark.classList.toggle('active', theme === 'dark');
  }

  // Font family controls
  const fontSerif = document.getElementById('font-serif');
  const fontSans = document.getElementById('font-sans');
  fontSerif.addEventListener('click', () => setFontFamily('serif'));
  fontSans.addEventListener('click', () => setFontFamily('sans'));
  function setFontFamily(family) {
    document.body.classList.remove('font-serif', 'font-sans');
    if (family === 'sans') {
      document.body.classList.add('font-sans');
    }
    fontSerif.classList.toggle('active', family === 'serif');
    fontSans.classList.toggle('active', family === 'sans');
  }
}
