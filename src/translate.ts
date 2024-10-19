import { Language } from './preferencePopup/languages';

interface BackendTranslationResponse {
  id: string;
  root: string;
  translation: string;
}

export interface Translation {
  id: number;
  root: string;
  translation: string;
  text?: string;
  transcription?: string;
  pos?: string;
  values?: string[];
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export async function translate(
  word: string,
  language: Language
): Promise<Translation | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/translate-word`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word, language }),
    });

    console.log(response);

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data: BackendTranslationResponse = await response.json();
    return {
      id: parseInt(data.id),
      root: data.root,
      translation: data.translation,
    };
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
}

export function cancelTranslate(): void {
  // Since we're using backend API, there's no need for abort controllers here.
  // However, if you implement request cancellation, you can add it here.
}
