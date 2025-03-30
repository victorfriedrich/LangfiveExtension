import { __awaiter } from "tslib";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export function translate(word, language) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${BACKEND_URL}/api/translate-word`, {
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
            const data = yield response.json();
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
    });
}
//# sourceMappingURL=translate.js.map