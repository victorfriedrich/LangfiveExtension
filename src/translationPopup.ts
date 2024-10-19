import {
  getPopupHTML,
  getTranslationHTML,
  subLoadingClassName,
  subPopupClassName,
  subPopupWrapperClassName,
} from './markup';
// @ts-ignore
import styles from 'bundle-text:./translationPopup.css';
import { positionElement, toTrustedHTML } from './utils';
import { Translation } from './translate';

export function insertTranslationPopup(
  targetEl: HTMLElement,
  containerEl: HTMLElement,
  offsetBottom: number,
  onClose: () => void,
): HTMLElement {
  const shadowDomWrapperEl = document.createElement('div');
  shadowDomWrapperEl.classList.add(subPopupWrapperClassName);
  const shadow = shadowDomWrapperEl.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;

  shadow.innerHTML = toTrustedHTML(getPopupHTML(offsetBottom));
  shadow.appendChild(style);
  containerEl.appendChild(shadowDomWrapperEl);

  const popupEl = shadow.querySelector(`.${subPopupClassName}`) as HTMLElement;
  positionElement(popupEl, targetEl, containerEl);
  popupEl.querySelector('.sub-tr-plus-button')?.addEventListener('click', onClose);
  return popupEl;
}

function postToContentScript(data: any) {
  window.postMessage({
    source: "translationPopup",
    payload: data
  }, "*");
}

export function insertTranslationResult(
  translationPopupEl: HTMLElement,
  translations: Translation,
  hideTranslationPopup: () => void
) {
  const html = getTranslationHTML([translations]);
  const loaderEl = translationPopupEl.querySelector(`.${subLoadingClassName}`);
  loaderEl?.insertAdjacentHTML('afterend', toTrustedHTML(html));
  loaderEl?.remove();

  // Attach event listeners to the new buttons
  translationPopupEl.querySelectorAll('.sub-tr-plus-button').forEach(button => {
    button.addEventListener('click', async () => {
      const wordId = button.getAttribute('data-id');
      if (wordId) {
        hideTranslationPopup();
        postToContentScript({ wordId })

      } else {
        console.error('No word ID found');
      }
    });
  });
}

export function hideTranslationPopup() {
  const popupEl = document.querySelector(`.${subPopupWrapperClassName}`);
  popupEl?.remove();
}