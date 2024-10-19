import { wrapNodeWords, maskTextWords, } from './textProcessing/wrapNodeWords';
import { translate, cancelTranslate } from './translate';
import { insertTranslationPopup, insertTranslationResult, hideTranslationPopup, } from './translationPopup';
import { defaultPrefs } from './preferencePopup/prefs';
import { subWordClassName, subContainerClassName, subWordReveal, getSubtitlesWordHTML, getSubtitlesHiddenWordHTML, subPopupWrapperClassName, getWordMaskHTML, subWordMaskClassName, getWordWrapperHTML, subWordHiddenClassName, } from './markup';
import startTextMutationObserver from './startTextMutationObserver';
import { getSiteSpecificApi } from './siteApi';
import addMouseEnterLeaveEventListeners, { createElementFromHTML, logPrefix, positionElement, } from './utils';
import { fetchWords } from './fetchWords';
const siteApi = getSiteSpecificApi(location.host);
let sourceLang = defaultPrefs.sourceLang;
let targetLang = defaultPrefs.targetLang;
const subtitleMasks = new Map();
let lastHoveredElement = null;
let lastTranslationPopup = null;
let videoPlayTimer = null;
let isVideoPaused = false;
/**
 * Wraps words of the target text in separate tags.
 * */
function wrapWordsInTextElement(textNode, wordsToHide) {
    var _a, _b, _c;
    const parentElClassList = (_a = textNode.parentElement) === null || _a === void 0 ? void 0 : _a.classList;
    if (((_b = parentElClassList === null || parentElClassList === void 0 ? void 0 : parentElClassList.contains) === null || _b === void 0 ? void 0 : _b.call(parentElClassList, subWordClassName)) ||
        ((_c = parentElClassList === null || parentElClassList === void 0 ? void 0 : parentElClassList.contains) === null || _c === void 0 ? void 0 : _c.call(parentElClassList, subContainerClassName)))
        return;
    const processedText = wrapNodeWords(textNode, getSubtitlesWordHTML, getSubtitlesHiddenWordHTML, wordsToHide).text;
    const wrappedText = createElementFromHTML(getWordWrapperHTML(processedText));
    textNode.parentElement.replaceChild(wrappedText, textNode);
}
function insertWordMasksInDOM(targetElement, wordMasks) {
    const targetElementRect = targetElement.getBoundingClientRect();
    const rectElements = [];
    wordMasks.forEach((wordMask) => {
        const maskHTML = getWordMaskHTML(targetElementRect, wordMask);
        const maskElement = createElementFromHTML(maskHTML);
        targetElement.appendChild(maskElement);
        rectElements.push(maskElement);
    });
    return rectElements;
}
function addWordMasks(textNode, wordsToHide) {
    const containerEl = document.querySelector('maskContainerSelector' in siteApi
        ? siteApi.maskContainerSelector
        : siteApi.subtitleSelector);
    if (!containerEl)
        return;
    // Make sure the subtitle element is not static because masks are positioned absolutely
    if (window.getComputedStyle(containerEl).getPropertyValue('position') === 'static') {
        containerEl.style.position = 'relative';
    }
    const wordMasks = maskTextWords(textNode, wordsToHide);
    const masks = insertWordMasksInDOM(containerEl, wordMasks);
    subtitleMasks.set(textNode, masks);
}
function removeWordMasks(textNode) {
    const masks = subtitleMasks.get(textNode);
    masks === null || masks === void 0 ? void 0 : masks.forEach((mask) => mask.remove());
    subtitleMasks.delete(textNode);
}
function adjustTranslationPopupPosition() {
    var _a;
    const containerEl = document.querySelector(siteApi.subtitlePopupSelector);
    const popupWrapperEl = document.querySelector(`.${subPopupWrapperClassName}`);
    if (!containerEl ||
        !lastHoveredElement ||
        !document.contains(lastHoveredElement) ||
        !lastTranslationPopup ||
        !((_a = popupWrapperEl === null || popupWrapperEl === void 0 ? void 0 : popupWrapperEl.shadowRoot) === null || _a === void 0 ? void 0 : _a.contains(lastTranslationPopup)))
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
function translateWord(el, popupEl) {
    var _a;
    const word = (_a = el.dataset['word']) !== null && _a !== void 0 ? _a : el.innerText;
    const language = targetLang; // Assuming targetLang is already defined
    translate(word, language)
        .then((translation) => {
        if (translation) {
            insertTranslationResult(popupEl, translation, hideTranslationPopup);
        }
        else {
            // Handle translation failure
            insertTranslationResult(popupEl, {
                id: 0,
                root: 'unknown',
                translation: 'Translation not available.',
            }, hideTranslationPopup);
        }
    })
        .catch((error) => {
        console.error('Translation error:', error);
        throw error;
    });
}
function sendPopupViewedMessage(isHidden) {
    document.dispatchEvent(new CustomEvent('view-popup', {
        detail: {
            sourceLang,
            targetLang,
            host: location.host,
            isHidden,
            theme: window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light',
        },
    }));
}
// Observe subtitles change on a page and replace text nodes with hidden words
// or with just custom nodes to make translation on mouseover easier
fetchWords("italian").then((words) => {
    console.log("italian", words);
    if (siteApi.subtitleTransformType === 'mask') {
        startTextMutationObserver({
            containerSelector: siteApi.subtitleSelector,
            onTextAdded(textNode) {
                addWordMasks(textNode, words);
            },
            onTextRemoved: removeWordMasks,
            onTextChanged(textNode) {
                removeWordMasks(textNode);
                addWordMasks(textNode, words);
            },
        });
    }
    else {
        startTextMutationObserver({
            containerSelector: siteApi.subtitleSelector,
            onTextAdded(textNode) {
                wrapWordsInTextElement(textNode, words);
            },
        });
    }
});
function onWordLeaveHandler(el) {
    hideTranslationPopup();
    el.classList.remove(subWordReveal);
    lastHoveredElement = null;
    lastTranslationPopup = null;
    cancelTranslate();
    playVideo();
}
// Show/hide the popup with translation on mousehover of a word in the subtitles.
addMouseEnterLeaveEventListeners({
    selector: `.${subWordClassName}, .${subWordMaskClassName}`,
    ignoreElClassName: subPopupWrapperClassName,
    // Translate hovered word and show translation popup
    onEnter: (el) => {
        sendPopupViewedMessage(el.classList.contains(subWordHiddenClassName) ||
            el.classList.contains(subWordMaskClassName));
        el.classList.add(subWordReveal);
        const containerEl = document.querySelector(siteApi.subtitlePopupSelector);
        if (!containerEl)
            return;
        const popupEl = insertTranslationPopup(el, containerEl, siteApi.popupOffsetBottom, () => {
            onWordLeaveHandler(el);
        });
        lastTranslationPopup = popupEl;
        lastHoveredElement = el;
        isVideoPaused = isVideoPaused || siteApi.pause();
        clearTimeout(Number(videoPlayTimer));
        translateWord(el, popupEl);
    },
    onLeave: onWordLeaveHandler,
});
// Listen to changes in preferences and update lang and word settings.
document.addEventListener('prefs', (event) => {
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
document.dispatchEvent(new CustomEvent('session'));
//# sourceMappingURL=index.js.map