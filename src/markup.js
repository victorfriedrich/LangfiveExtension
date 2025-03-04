export const popupWidth = 100;
export const popupHeight = 20;
export const popupVerticalOffset = 35;
export const subContainerClassName = 'sub-tr-text';
export const subWordClassName = 'sub-tr-word';
export const subWordMaskClassName = 'sub-tr-mask';
export const subWordMaskHiddenClassName = 'sub-tr-mask-hidden';
export const subWordHiddenClassName = 'sub-tr-word-hidden';
export const subPopupWrapperClassName = 'sub-tr-popup-wrapper';
export const subPopupClassName = 'sub-tr-popup';
export const subWordReveal = 'sub-tr-reveal';
export const subLoadingClassName = 'sub-tr-loading';
const spinnerHTML = '<div class="lds-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>';
export function getSubtitlesWordHTML(word) {
    return `<span class="${subWordClassName}">${word}</span>`;
}
export function getSubtitlesHiddenWordHTML(word) {
    return `<span class="${subWordClassName} ${subWordHiddenClassName}">${word}</span>`;
}
export function getPopupHTML(offsetBottom) {
    console.log(`Popup offsetBottom: ${offsetBottom}`);
    return `
    <div class="${subPopupClassName}">
      <div class="sub-tr-popup-container" style="margin-bottom: ${offsetBottom}px;">
        <div class="${subLoadingClassName}">

        </div>
      </div>
    </div>
  `;
}
function closeIconSVG() {
    return `
    <svg class="sub-tr-close-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 122.88"><path d="M61.44,0A61.44,61.44,0,1,1,0,61.44,61.44,61.44,0,0,1,61.44,0ZM74.58,36.8c1.74-1.77,2.83-3.18,5-1l7,7.13c2.29,2.26,2.17,3.58,0,5.69L73.33,61.83,86.08,74.58c1.77,1.74,3.18,2.83,1,5l-7.13,7c-2.26,2.29-3.58,2.17-5.68,0L61.44,73.72,48.63,86.53c-2.1,2.15-3.42,2.27-5.68,0l-7.13-7c-2.2-2.15-.79-3.24,1-5l12.73-12.7L36.35,48.64c-2.15-2.11-2.27-3.43,0-5.69l7-7.13c2.15-2.2,3.24-.79,5,1L61.44,49.94,74.58,36.8Z"/></svg>
  `;
}
export function getTranslationHTML(translations) {
    // prettier-ignore
    return `
    <div class="sub-tr-popup-content">
      <div class="sub-tr-dict">
        ${translations.map((translation) => {
        var _a, _b;
        return `
          <div class="sub-tr-dict-item">
            <div class="sub-tr-dict-item-title">
              <div class="nomargin">
                <p>${(_a = translation.root) !== null && _a !== void 0 ? _a : 'no root'}</p>
                <span class="sub-tr-dict-item-text">${(_b = translation.translation) !== null && _b !== void 0 ? _b : ''}</span>
              </div>
              <button class="sub-tr-plus-button" data-id="${translation.id}" aria-label="Add word ${translation.translation}">+</button>
            </div>
          </div>
        `;
    }).join('')}
      </div>
    </div>
  `;
}
export function getWordMaskHTML(targetElementRect, wordMask) {
    const { rect, word, isHidden } = wordMask;
    return `
    <div
      class="${subWordMaskClassName} ${isHidden ? subWordMaskHiddenClassName : ''}"
      data-word="${word}" 
      style=" 
        top: ${rect.top - targetElementRect.top + 1}px;
        left: ${rect.left - targetElementRect.left}px;  
        width: ${rect.width}px; 
        height: ${rect.height - 2}px;
      "/>
  `;
}
export function getWordWrapperHTML(word) {
    return `
    <span class="${subContainerClassName}">${word}</span>
  `;
}
//# sourceMappingURL=markup.js.map