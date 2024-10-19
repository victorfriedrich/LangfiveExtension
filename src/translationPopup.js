import { getPopupHTML, getTranslationHTML, subLoadingClassName, subPopupClassName, subPopupWrapperClassName, } from './markup';
// @ts-ignore
import styles from 'bundle-text:./translationPopup.css';
import { positionElement, toTrustedHTML } from './utils';
export function insertTranslationPopup(targetEl, containerEl, offsetBottom, onClose) {
    var _a;
    const shadowDomWrapperEl = document.createElement('div');
    shadowDomWrapperEl.classList.add(subPopupWrapperClassName);
    const shadow = shadowDomWrapperEl.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = styles;
    shadow.innerHTML = toTrustedHTML(getPopupHTML(offsetBottom));
    shadow.appendChild(style);
    containerEl.appendChild(shadowDomWrapperEl);
    const popupEl = shadow.querySelector(`.${subPopupClassName}`);
    positionElement(popupEl, targetEl, containerEl);
    (_a = popupEl.querySelector('.sub-tr-plus-button')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', onClose);
    return popupEl;
}
function postToContentScript(data) {
    window.postMessage({
        source: "translationPopup",
        payload: data
    }, "*");
}
export function insertTranslationResult(translationPopupEl, translations, hideTranslationPopup) {
    const html = getTranslationHTML([translations]);
    const loaderEl = translationPopupEl.querySelector(`.${subLoadingClassName}`);
    loaderEl === null || loaderEl === void 0 ? void 0 : loaderEl.insertAdjacentHTML('afterend', toTrustedHTML(html));
    loaderEl === null || loaderEl === void 0 ? void 0 : loaderEl.remove();
    // Attach event listeners to the new buttons
    translationPopupEl.querySelectorAll('.sub-tr-plus-button').forEach(button => {
        button.addEventListener('click', async () => {
            const wordId = button.getAttribute('data-id');
            if (wordId) {
                hideTranslationPopup();
                postToContentScript({ wordId });
            }
            else {
                console.error('No word ID found');
            }
        });
    });
}
export function hideTranslationPopup() {
    const popupEl = document.querySelector(`.${subPopupWrapperClassName}`);
    popupEl === null || popupEl === void 0 ? void 0 : popupEl.remove();
}
//# sourceMappingURL=translationPopup.js.map