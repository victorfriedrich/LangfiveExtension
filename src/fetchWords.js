import { supabase } from "./supabaseclient";
/**
 * Fetch all known words in a paginated manner and store them in a Set.
 *
 * @param {string} targetLanguage - The target language to filter words.
 * @param {number} pageSize - Number of records to fetch per page.
 * @returns {Promise<Set<string>>} - A Promise that resolves to a Set of words.
 */
export async function fetchWords(targetLanguage, pageSize = 1000) {
    const allWords = new Set();
    let offset = 0;
    let hasMore = true;
    try {
        console.log("Fetching session...", await supabase.auth.getSession());
        while (hasMore) {
            // Fetch a page of known words using the paginated RPC call
            const { data, error } = await supabase.rpc('get_known_words', {
                _target_language: targetLanguage,
                _limit: pageSize,
                _offset: offset
            });
            if (error) {
                console.error('Error fetching known words:', error);
                throw error;
            }
            if (data && data.length > 0) {
                // Add fetched words to the Set
                // @ts-ignore
                data.forEach(row => {
                    if (row.word) {
                        allWords.add(row.word);
                    }
                });
                // Prepare for next iteration
                offset += pageSize;
                // If fewer records than pageSize are returned, we've reached the last page
                if (data.length < pageSize) {
                    hasMore = false;
                }
            }
            else {
                // No more data to fetch
                hasMore = false;
            }
        }
        console.log(`Total words fetched: ${allWords.size}`);
        return allWords;
    }
    catch (err) {
        console.error('Error getting and setting known words:', err);
        throw err;
    }
}
//# sourceMappingURL=fetchWords.js.map