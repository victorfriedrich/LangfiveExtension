import { detokenize, tokenize } from './tokenize';
import posTagger from 'wink-pos-tagger';
const tagger = posTagger();
function hideWords(tokens, wordsToHide) {
    return tagger.tagRawTokens(tokens).map((token) => {
        if (!wordsToHide.has(token.lemma || token.normal)) {
            return { isHidden: true, word: token.value };
        }
        return { isHidden: false, word: token.value };
    });
}
/**
 * Wrap words in the sentence in accordance with options
 * */
export const wrapNodeWords = (textNode, wrapWord, wrapHiddenWord, wordsToHide) => {
    var _a;
    const initialText = (_a = textNode.textContent) !== null && _a !== void 0 ? _a : '';
    const { tokens, delimiters } = tokenize(initialText);
    const processedTokens = hideWords(tokens, wordsToHide);
    const text = detokenize(processedTokens, delimiters, wrapWord, wrapHiddenWord);
    return {
        text,
        initialText,
    };
};
export const maskTextWords = (textNode, wordsToHide) => {
    const result = tokenize(textNode.textContent);
    const processedTokens = hideWords(result.tokens, wordsToHide);
    return processedTokens.flatMap((token, i) => {
        const range = new Range();
        range.setStart(textNode, result.indices[i]);
        range.setEnd(textNode, result.indices[i] + token.word.length);
        const rects = Array.from(range.getClientRects());
        return rects.map((rect) => ({ rect, word: token.word, isHidden: token.isHidden }));
    });
};
//# sourceMappingURL=wrapNodeWords.js.map