import { detokenize, tokenize } from './tokenize';
import posTagger from 'wink-pos-tagger';

export interface ProcessResult {
  initialText: string;
  text: string;
}

export interface TextProcessOptions {
  wordPrefix: string;
  wordPostfix: string;
  hiddenWordPrefix: string;
  hiddenWordPostfix: string;
}

export interface WordMask {
  rect: DOMRect;
  word: string;
  isHidden: boolean;
}

const tagger = posTagger();

function hideWords(tokens: string[], wordsToHide: Set<string>) {
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
export const wrapNodeWords = (
  textNode: Text,
  wrapWord: (word: string) => string,
  wrapHiddenWord: (word: string) => string,
  wordsToHide: Set<string>
) => {
  const initialText = textNode.textContent! ?? '';
  const { tokens, delimiters } = tokenize(initialText);
  const processedTokens = hideWords(tokens, wordsToHide);
  const text = detokenize(processedTokens, delimiters, wrapWord, wrapHiddenWord);

  return {
    text,
    initialText,
  } as ProcessResult;
};

export const maskTextWords = (textNode: Text, wordsToHide: Set<string>): WordMask[] => {
  const result = tokenize(textNode.textContent!);
  const processedTokens = hideWords(result.tokens, wordsToHide);

  return processedTokens.flatMap((token, i) => {
    const range = new Range();
    range.setStart(textNode, result.indices[i]);
    range.setEnd(textNode, result.indices[i] + token.word.length);
    const rects = Array.from(range.getClientRects());

    return rects.map((rect) => ({ rect, word: token.word, isHidden: token.isHidden }));
  });
};