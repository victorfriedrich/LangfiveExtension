import {
  wrapNodeWords,
  maskTextWords,
  WordMask,
} from './textProcessing/wrapNodeWords';
import { translate } from './translate';
import { storeWords, getStoredWords } from './wordstorage'
import {
  insertTranslationPopup,
  insertTranslationResult,
  hideTranslationPopup,
} from './translationPopup';
import { defaultPrefs, Prefs } from './preferencePopup/prefs';
import {
  subWordClassName,
  subContainerClassName,
  subWordReveal,
  getSubtitlesWordHTML,
  getSubtitlesHiddenWordHTML,
  subPopupWrapperClassName,
  getWordMaskHTML,
  subWordMaskClassName,
  getWordWrapperHTML,
  subWordHiddenClassName,
} from './markup';
import startTextMutationObserver from './startTextMutationObserver';
import { getSiteSpecificApi } from './siteApi';
import addMouseEnterLeaveEventListeners, {
  createElementFromHTML,
  logPrefix,
  positionElement,
} from './utils';
import { fetchWords } from './fetchWords';

const siteApi = getSiteSpecificApi(location.host);
let sourceLang = defaultPrefs.sourceLang;
let targetLang = defaultPrefs.targetLang;

const subtitleMasks = new Map<Text, HTMLElement[]>();
let lastHoveredElement: HTMLElement | null = null;
let lastTranslationPopup: HTMLElement | null = null;
let videoPlayTimer: null | ReturnType<typeof setTimeout> = null;

let isVideoPaused = false;

/**
 * Wraps words of the target text in separate tags.
 * */
function wrapWordsInTextElement(textNode: Text, wordsToHide: Set<string>): void {
  const parentElClassList = textNode.parentElement?.classList;
  if (
    parentElClassList?.contains?.(subWordClassName) ||
    parentElClassList?.contains?.(subContainerClassName)
  )
    return;

  const processedText = wrapNodeWords(
    textNode,
    getSubtitlesWordHTML,
    getSubtitlesHiddenWordHTML,
    wordsToHide
  ).text;
  const wrappedText = createElementFromHTML(getWordWrapperHTML(processedText));
  textNode.parentElement!.replaceChild(wrappedText, textNode);
}

function insertWordMasksInDOM(targetElement: HTMLElement, wordMasks: WordMask[]) {
  const targetElementRect = targetElement.getBoundingClientRect();
  const rectElements: HTMLElement[] = [];

  wordMasks.forEach((wordMask) => {
    const maskHTML = getWordMaskHTML(targetElementRect, wordMask);
    const maskElement = createElementFromHTML(maskHTML);
    targetElement.appendChild(maskElement);
    rectElements.push(maskElement);
  });

  return rectElements;
}

function addWordMasks(textNode: Text, wordsToHide: Set<string>) {
  const containerEl = document.querySelector<HTMLElement>(
    'maskContainerSelector' in siteApi
      ? siteApi.maskContainerSelector
      : siteApi.subtitleSelector,
  );
  if (!containerEl) return;

  // Make sure the subtitle element is not static because masks are positioned absolutely
  if (window.getComputedStyle(containerEl).getPropertyValue('position') === 'static') {
    containerEl.style.position = 'relative';
  }

  const wordMasks = maskTextWords(textNode, wordsToHide);
  const masks = insertWordMasksInDOM(containerEl, wordMasks);
  subtitleMasks.set(textNode, masks);
}

function removeWordMasks(textNode: Text) {
  const masks = subtitleMasks.get(textNode);
  masks?.forEach((mask) => mask.remove());
  subtitleMasks.delete(textNode);
}

function adjustTranslationPopupPosition() {
  if (!siteApi.subtitlePopupSelector || siteApi.subtitlePopupSelector.trim() === '') {
    return;
  }

  const containerEl = document.querySelector<HTMLElement>(siteApi.subtitlePopupSelector);
  const popupWrapperEl = document.querySelector<HTMLElement>(
    `.${subPopupWrapperClassName}`,
  );

  if (
    !containerEl ||
    !lastHoveredElement ||
    !document.contains(lastHoveredElement) ||
    !lastTranslationPopup ||
    !popupWrapperEl?.shadowRoot?.contains(lastTranslationPopup)
  )
    return;
  positionElement(lastTranslationPopup, lastHoveredElement, containerEl);
}

/**
 * Play video if it was paused and the popup is hidden
 * */
function playVideo() {
  videoPlayTimer = setTimeout(() => {
    if (isVideoPaused && !lastTranslationPopup) {
      siteApi.play();
      isVideoPaused = false;
    }
  }, 300);
}

function translateWord(el: HTMLElement, popupEl: HTMLElement) {
  const word = el.dataset['word'] ?? el.innerText;
  const language = sourceLang; // Assuming sourceLang is already defined

  translate(word, language)
    .then((translation) => {
      if (translation) {
        insertTranslationResult(popupEl, translation, hideTranslationPopup);
      } else {
        // Handle translation failure
        insertTranslationResult(popupEl, {
          id: 0,
          root: 'unknown',
          translation: 'Translation not available.',
        },
          hideTranslationPopup);
      }
    })
    .catch((error) => {
      console.error('Translation error:', error);
      throw error;
    });
}

function sendPopupViewedMessage(isHidden: boolean) {
  document.dispatchEvent(
    new CustomEvent<ViewPopupEvent>('view-popup', {
      detail: {
        sourceLang,
        targetLang,
        host: location.host,
        isHidden,
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light',
      },
    }),
  );
}

// Observe subtitles change on a page and replace text nodes with hidden words
// or with just custom nodes to make translation on mouseover easier
fetchWords("spanish").then((words) => {

  const wordsArray = Array.from(words);
  console.log(wordsArray);
  // storeWords(wordsArray, "spanish")

  if (siteApi.subtitleTransformType === 'mask') {

    startTextMutationObserver({
      containerSelector: siteApi.subtitleSelector,
      onTextAdded(textNode) {
        addWordMasks(textNode, words)
      },
      onTextRemoved: removeWordMasks,
      onTextChanged(textNode) {
        removeWordMasks(textNode);
        addWordMasks(textNode, words);
      },
    });
  } else {
    startTextMutationObserver({
      containerSelector: siteApi.subtitleSelector,
      onTextAdded(textNode) {
        wrapWordsInTextElement(textNode, words);
      },
    });
  }
})


function onWordLeaveHandler(el: HTMLElement) {
  hideTranslationPopup();
  el.classList.remove(subWordReveal);
  lastHoveredElement = null;
  lastTranslationPopup = null;
  playVideo();
}
// Show/hide the popup with translation on mousehover of a word in the subtitles.
addMouseEnterLeaveEventListeners({
  selector: `.${subWordClassName}, .${subWordMaskClassName}`,
  ignoreElClassName: subPopupWrapperClassName,

  // Translate hovered word and show translation popup
  onEnter: (el: HTMLElement) => {
    sendPopupViewedMessage(
      el.classList.contains(subWordHiddenClassName) ||
      el.classList.contains(subWordMaskClassName),
    );
    el.classList.add(subWordReveal);
    const containerEl = document.querySelector<HTMLElement>(
      siteApi.subtitlePopupSelector,
    );

    if (!containerEl) return;

    const popupEl = insertTranslationPopup(
      el,
      containerEl,
      siteApi.popupOffsetBottom,
      () => {
        onWordLeaveHandler(el);
      },
    );
    lastTranslationPopup = popupEl;
    lastHoveredElement = el;
    isVideoPaused = isVideoPaused || siteApi.pause();
    clearTimeout(Number(videoPlayTimer));
    translateWord(el, popupEl);
  },

  onLeave: onWordLeaveHandler,
});

// Listen to changes in preferences and update lang and word settings.
document.addEventListener('prefs', (event: CustomEvent<Prefs>) => {
  const prefs = event.detail;
  // updateWordsToHide(
  //   // prefs.hideWords,
  //   true,
  //   new Set(["the", "short", "answer"])
  // );
  sourceLang = prefs.sourceLang;
  targetLang = prefs.targetLang;

  console.log(logPrefix, 'prefs updated:', prefs);
});

setInterval(() => {
  // Keep the position of the translation popup actual
  // because it has "position: fixed" and subtitles can be moved.
  adjustTranslationPopupPosition();
}, 100);

console.log(logPrefix, 'initialized');

document.dispatchEvent(new CustomEvent<undefined>('session'));