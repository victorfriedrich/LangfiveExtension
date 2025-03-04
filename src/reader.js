// reader.js

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('reader-container');
  const language = "spanish";
  if (!container) {
    console.error('Reader container not found.');
    return;
  }

  // 1) Load the article from storage and insert its HTML to preserve formatting.
  chrome.storage.local.get('currentArticle', (articleResult) => {
    if (!articleResult.currentArticle) {
      container.innerHTML = '<p class="error">No article content available.</p>';
      return;
    }
    // Assume article.content contains the HTML (e.g. from Readability)
    container.innerHTML = articleResult.currentArticle.content;

    chrome.storage.local.get(`knownWords_${language}`, (result) => {
      const words = result[`knownWords_${language}`] || [];
      console.log(words);
      const knownWordsSet = new Set(words.map((w) => w.toLowerCase()));
      processTextNodes(container, knownWordsSet);
    });

  });

  // Delegate clicks on word spans to trigger translations.
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('word')) {
      handleWordClick(e, e.target);
    } else if (!e.target.closest('.word-popup')) {
      closeWordPopups();
    }
  });
});

/**
 * Groups a string into an array of objects.
 * Each object represents a group with:
 *   - content: the grouped text.
 *   - isWord: true if the group is comprised of non-special characters.
 *   - unknown: (added later) true if the word isn’t in the known words set.
 *
 * The grouping is based on a set of special characters.
 */
function groupText(text, knownWordsSet) {
  const SPECIAL_CHARACTERS = ".,!?¿¡'\"1234567890()«»%: -_[]{}#@$&*+=|\\<>/~`^“”…;";
  let result = [];
  let currentGroup = "";
  let currentIsSpecial = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isSpecial = SPECIAL_CHARACTERS.indexOf(char) >= 0;
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

  // For word groups, mark them as unknown if not present in the knownWordsSet.
  return result.map((group) => {
    if (group.isWord) {
      const normalized = group.content.toLowerCase();
      group.unknown = !knownWordsSet.has(normalized);
    }
    return group;
  });
}

/**
 * Processes all text nodes within the container.
 * For each text node, it replaces its content with a fragment in which
 * groups (as determined by groupText) that are words are wrapped in a span.
 * If a word is not in the knownWordsSet, an extra class "unknown-word" is added.
 */
function processTextNodes(container, knownWordsSet) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  let node;
  const nodesToProcess = [];
  while ((node = walker.nextNode())) {
    if (node.nodeValue.trim().length > 0) {
      nodesToProcess.push(node);
    }
  }
  nodesToProcess.forEach((node) => {
    const groups = groupText(node.nodeValue, knownWordsSet);
    const frag = document.createDocumentFragment();
    groups.forEach((group) => {
      if (group.isWord) {
        // Create a span for word groups.
        const span = document.createElement('span');
        span.className = 'word';
        // Add an extra class if the word is unknown.
        if (group.unknown) {
          span.classList.add('unknown-word');
        }
        span.textContent = group.content;
        frag.appendChild(span);
      } else {
        // Non-word groups (punctuation, spaces) are inserted as plain text.
        frag.appendChild(document.createTextNode(group.content));
      }
    });
    node.parentNode.replaceChild(frag, node);
  });
}

/**
 * Handles a click on a word span.
 * Uses the span's text as the term to translate.
 */
function handleWordClick(event, wordElement) {
  event.stopPropagation();
  closeWordPopups();
  wordElement.classList.add('word-active');

  const loadingPopup = createLoadingPopup(wordElement.textContent);
  document.body.appendChild(loadingPopup);
  positionPopup(loadingPopup, wordElement);

  console.log(`Fetching translation for "${wordElement.textContent}"`);
  window.fetchTranslation(wordElement.textContent, 'es')
    .then((translation) => {
      loadingPopup.classList.remove('show');
      setTimeout(() => loadingPopup.remove(), 300);
      const popup = createWordPopup(wordElement.textContent, translation);
      document.body.appendChild(popup);
      positionPopup(popup, wordElement);
      setTimeout(() => popup.classList.add('show'), 10);
    })
    .catch((error) => {
      console.error('Error fetching translation:', error);
      const header = loadingPopup.querySelector('.popup-header');
      if (header) header.textContent = wordElement.textContent;
      const loadingContent = loadingPopup.querySelector('.loading-content');
      if (loadingContent)
        loadingContent.innerHTML = '<p class="error">Error loading translation</p>';
      const retryBtn = document.createElement('button');
      retryBtn.className = 'flashcard-btn';
      retryBtn.textContent = 'Try Again';
      retryBtn.addEventListener('click', () => {
        loadingPopup.classList.remove('show');
        setTimeout(() => {
          loadingPopup.remove();
          handleWordClick(event, wordElement);
        }, 300);
      });
      loadingPopup.appendChild(retryBtn);
    });
}

/**
 * Creates a loading popup element.
 */
function createLoadingPopup(wordText) {
  const popup = document.createElement('div');
  popup.className = 'word-popup loading-popup';

  const header = document.createElement('div');
  header.className = 'popup-header';
  header.textContent = 'Loading...';
  popup.appendChild(header);

  const loadingContent = document.createElement('div');
  loadingContent.className = 'loading-content';
  loadingContent.innerHTML = '<div class="spinner small"></div>';
  popup.appendChild(loadingContent);

  return popup;
}

/**
 * Creates a popup element displaying the translation.
 */
function createWordPopup(wordText, translation) {
  const popup = document.createElement('div');
  popup.className = 'word-popup';

  const header = document.createElement('div');
  header.className = 'popup-header';
  header.textContent = wordText;
  if (translation && translation.root && translation.root !== wordText) {
    const rootSpan = document.createElement('span');
    rootSpan.className = 'word-root';
    rootSpan.textContent = ` (${translation.root})`;
    header.appendChild(rootSpan);
  }
  popup.appendChild(header);

  const translationsContainer = document.createElement('div');
  translationsContainer.className = 'translations-container';
  if (translation && translation.translation) {
    translation.translation.split(',').map(t => t.trim()).forEach((text, index) => {
      const translationEl = document.createElement('div');
      translationEl.className = `translation ${index === 0 ? 'high' : 'medium'}`;
      translationEl.textContent = text;
      translationsContainer.appendChild(translationEl);
    });
  } else {
    const noTranslationEl = document.createElement('div');
    noTranslationEl.className = 'translation';
    noTranslationEl.textContent = 'No translation available';
    translationsContainer.appendChild(noTranslationEl);
  }
  popup.appendChild(translationsContainer);

  const flashcardBtn = document.createElement('button');
  flashcardBtn.className = 'flashcard-btn';
  flashcardBtn.textContent = 'Add to Flashcards';
  flashcardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    flashcardBtn.classList.add('pressed');
    window.saveWordToFlashcards(translation.id);
    setTimeout(() => {
      flashcardBtn.classList.remove('pressed');
      flashcardBtn.textContent = 'Added to Flashcards ✓';
      flashcardBtn.disabled = true;
    }, 300);
  });
  popup.appendChild(flashcardBtn);

  return popup;
}

/**
 * Positions a popup relative to a reference element.
 */
function positionPopup(popup, referenceElement) {
  const rect = referenceElement.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  popup.style.top = `${rect.bottom + scrollTop + 10}px`;
  popup.style.left = `${rect.left}px`;
}

/**
 * Closes any open popups and removes the active styling from word spans.
 */
function closeWordPopups() {
  const popups = document.querySelectorAll('.word-popup');
  popups.forEach((popup) => {
    popup.classList.remove('show');
    setTimeout(() => popup.remove(), 300);
  });
  document.querySelectorAll('.word-active').forEach((word) => {
    word.classList.remove('word-active');
  });
}
