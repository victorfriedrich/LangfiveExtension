const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export async function translate(word, language) {
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
        const data = await response.json();
        return {
            id: parseInt(data.id),
            root: data.root,
            translation: data.translation,
        };
    }
    catch (error) {
        console.error('Translation error:', error);
        return null;
    }
}
export function cancelTranslate() {
    // Since we're using backend API, there's no need for abort controllers here.
    // However, if you implement request cancellation, you can add it here.
}
//# sourceMappingURL=translate.js.map