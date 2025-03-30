import { __awaiter } from "tslib";
import { popupHeight, popupVerticalOffset, popupWidth } from './markup';
import debounce from 'lodash-es/debounce';
export const logPrefix = 'Langfive ';
export function createElementFromHTML(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = toTrustedHTML(htmlString.trim());
    return div.firstChild;
}
export function isVisible(el) {
    if (!el)
        return false;
    const style = window.getComputedStyle(el);
    return (style.width !== '0' &&
        style.height !== '0' &&
        style.opacity !== '0' &&
        style.display !== 'none' &&
        style.visibility !== 'hidden');
}
export function injectCss(path) {
    const link = document.createElement('link');
    link.href = chrome.runtime.getURL(path);
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.getElementsByTagName('head')[0].appendChild(link);
}
export function injectJs(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = chrome.runtime.getURL(path);
            s.onload = function () {
                this.remove();
                resolve();
            };
            (document.head || document.documentElement).appendChild(s);
        });
    });
}
export function fetchTextNodes(node) {
    if (node instanceof Text)
        return [node];
    const result = [];
    const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    let textNode = null;
    do {
        textNode = walk.nextNode();
        if (textNode) {
            result.push(textNode);
        }
    } while (textNode);
    return result;
}
export function positionElement(element, anchorElement, fitElement) {
    const gap = 5;
    const anchorElementRect = anchorElement.getBoundingClientRect();
    const fitElementRect = fitElement.getBoundingClientRect();
    let left = anchorElementRect.x - popupWidth / 2 + anchorElementRect.width / 2;
    const top = anchorElementRect.y > popupHeight
        ? anchorElementRect.y - popupHeight - popupVerticalOffset
        : anchorElementRect.y + anchorElementRect.height + popupVerticalOffset;
    if (left < fitElementRect.x) {
        left = fitElementRect.x + gap;
    }
    if (left + popupWidth > fitElementRect.x + fitElementRect.width) {
        left = fitElementRect.x + fitElementRect.width - popupWidth - gap;
    }
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
}
let stopScrollPosition = null;
window.addEventListener('scroll', (e) => {
    if (stopScrollPosition !== null) {
        window.scrollTo(window.scrollX, stopScrollPosition);
        e.stopImmediatePropagation();
    }
});
export function disableScroll() {
    stopScrollPosition = window.scrollY;
}
export function enableScroll() {
    stopScrollPosition = null;
}
/**
 * Custom 'mouseenter' and 'mouseleave' addEventListener.
 * By means of document.elementsFromPoint this implementation works even when other element overlaps the target or when .
 * */
export default function addMouseEnterLeaveEventListeners({ selector, ignoreElClassName, onEnter, onLeave, }) {
    let selectedElement = null;
    document.addEventListener('mousemove', debounce(({ clientX, clientY }) => {
        const elementsUnderPointer = document.elementsFromPoint(clientX, clientY);
        const ignoreElement = elementsUnderPointer.find((e) => e.classList.contains(ignoreElClassName));
        if (ignoreElement)
            return;
        const element = elementsUnderPointer.find((e) => e.matches(selector));
        if (element && selectedElement !== element) {
            if (selectedElement) {
                onLeave(selectedElement);
            }
            onEnter(element);
            selectedElement = element;
        }
        if (!element && selectedElement) {
            onLeave(selectedElement);
            selectedElement = null;
        }
    }, 10));
}
export function toTrustedHTML(htmlString) {
    // @ts-ignore
    const renderPolicy = window.trustedTypes.createPolicy('render-policy', {
        createHTML: (input) => input,
    });
    return renderPolicy.createHTML(htmlString);
}
//# sourceMappingURL=utils.js.map