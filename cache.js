// Testing with library USB scanner showed that when user scanned in multiple barcodes
// in quick succession multiple API calls were being made for each barcode scanned, even if it had been previously scanned.
// So this is a ISBN lookup cache to store and retrieve lookup results from localStorage to avoid duplicate API calls

var ISBNCache = (function () {
    var CACHE_STORAGE_KEY = 'isbnLookupCache';
    var CACHE_EXPIRY_DAYS = 30;
    var cache = null;

    function load() {
        if (cache !== null) {
            return cache;
        }

        try {
            var saved = localStorage.getItem(CACHE_STORAGE_KEY);
            if (saved) {
                cache = JSON.parse(saved);
                cleanExpired();
            } else {
                cache = {};
            }
        } catch (e) {
            APIBase.log.error('ISBNCache', 'Failed to load cache', e);
            cache = {};
        }

        return cache;
    }

    function save() {
        try {
            localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
        } catch (e) {
            APIBase.log.error('ISBNCache', 'Failed to save cache', e);
            if (e.name === 'QuotaExceededError') {
                pruneOldest(50);
                try {
                    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
                } catch (e2) {
                    APIBase.log.error('ISBNCache', 'Failed to save cache after pruning', e2);
                }
            }
        }
    }

    function generateKey(isbn) {
        var cleaned = isbn.replace(/[-\s]/g, '').trim().toUpperCase();
        if (cleaned.length === 10) {
            return APIBase.isbn10to13(cleaned);
        }
        return cleaned;
    }

    function get(isbn) {
        load();
        var key = generateKey(isbn);
        var entry = cache[key];

        if (!entry) {
            return null;
        }

        var now = Date.now();
        var expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if (now - entry.cachedAt > expiryMs) {
            delete cache[key];
            save();
            return null;
        }

        return entry.data;
    }

    function set(isbn, result) {
        load();
        var key = generateKey(isbn);

        if (!result || !result.found) {
            return;
        }

        cache[key] = {
            data: result,
            cachedAt: Date.now()
        };

        save();
    }

    function cleanExpired() {
        var now = Date.now();
        var expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        Object.keys(cache).forEach(function (key) {
            if (now - cache[key].cachedAt > expiryMs) {
                delete cache[key];
            }
        });
    }

    function pruneOldest(count) {
        load();
        var entries = Object.keys(cache).map(function (key) {
            return { key: key, cachedAt: cache[key].cachedAt };
        });

        entries.sort(function (a, b) {
            return a.cachedAt - b.cachedAt;
        });

        var toRemove = entries.slice(0, count);
        toRemove.forEach(function (entry) {
            delete cache[entry.key];
        });
    }

    function clear() {
        cache = {};
        save();
    }

    function getStats() {
        load();
        return {
            totalEntries: Object.keys(cache).length
        };
    }

    return {
        get: get,
        set: set,
        clear: clear,
        getStats: getStats
    };

})();

window.ISBNCache = ISBNCache;