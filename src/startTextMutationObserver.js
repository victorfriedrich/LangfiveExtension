import uniq from 'lodash-es/uniq';
import { fetchTextNodes, logPrefix } from './utils';
let isObserving = false;
let observer = null;
let observingElement = null;
const textNodes = new Map();
/**
 * Starts to observe text mutation under the target element.
 * Restarts every time when target element is available again.
 * */
export default function startTextMutationObserver({ containerSelector, onTextAdded, onTextRemoved, onTextChanged, }) {
    const targetEl = document.querySelector(containerSelector);
    if (!observer) {
        observer = createTextMutationObserver(onTextAdded);
    }
    textNodes.forEach((nodeText, node) => {
        var _a;
        // Remove node if it was removed from the DOM
        if (!(targetEl === null || targetEl === void 0 ? void 0 : targetEl.contains(node))) {
            textNodes.delete(node);
            onTextRemoved === null || onTextRemoved === void 0 ? void 0 : onTextRemoved(node);
        }
        else if (nodeText !== node.textContent) {
            // Update node if its text was changed.
            textNodes.set(node, (_a = node.textContent) !== null && _a !== void 0 ? _a : '');
            onTextChanged === null || onTextChanged === void 0 ? void 0 : onTextChanged(node);
        }
    });
    if (targetEl && !isObserving) {
        console.log(logPrefix, 'start observing text');
        observingElement = targetEl;
        observer.observe(observingElement, { childList: true, subtree: true });
        isObserving = true;
    }
    else if (!targetEl && isObserving) {
        console.log(logPrefix, 'stop observing text');
        observer === null || observer === void 0 ? void 0 : observer.disconnect();
        isObserving = false;
    }
    else if (targetEl && targetEl !== observingElement) {
        console.log(logPrefix, 'restart observing text');
        observer.disconnect();
        observingElement = targetEl;
        observer.observe(observingElement, { childList: true, subtree: true });
    }
    // Restart observer if not started yet.
    // It is necessary if user changed a page with video and then came back
    setTimeout(() => {
        startTextMutationObserver({
            containerSelector: containerSelector,
            onTextAdded,
            onTextRemoved,
            onTextChanged,
        });
    }, 50);
}
function createTextMutationObserver(onTextAdded) {
    return new MutationObserver((mutationsList) => {
        const addedTextNodes = mutationsList
            .filter((m) => m.type === 'childList' && m.addedNodes.length)
            .map((m) => Array.from(m.addedNodes).map(fetchTextNodes));
        const uniqTextNodes = uniq(addedTextNodes.flat(2));
        uniqTextNodes.forEach((node) => {
            var _a;
            textNodes.set(node, (_a = node.textContent) !== null && _a !== void 0 ? _a : '');
            onTextAdded(node);
        });
    });
}
//# sourceMappingURL=startTextMutationObserver.js.map