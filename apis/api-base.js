var APIBase = (function() {
        var log = {
            info: function (source, message, data) {
                console.log('%c[' + source + '] ' + message, 'color: #1d70b8', data !== undefined ? data : '');
            },
            success: function (source, message, data) {
                console.log('%c[' + source + '] ' + message, 'color: #00703c', data !== undefined ? data : '');
            },
            warn: function (source, message, data) {
                console.warn('%c[' + source + '] ' + message, 'color: #d97e50ff', data !== undefined ? data : '');
            },
            error: function (source, message, data) {
                console.error('%c[' + source + '] ' + message, 'color: #e62e11ff', data !== undefined ? data : '');
            },
            debug: function (source, message, data) {
                console.log('%c[' + source + '] ' + message, 'color: #fbfdfdff', data !== undefined ? data : '');
            }
        };

        function formatDewey(dewey) {
            if (!dewey) return null;

            var cleaned = String(dewey).trim();

            cleaned = cleaned.replace(/\s+[A-Za-z].*$/, '');
            cleaned = cleaned.replace(/\[.*?\]/g, '');
            cleaned = cleaned.replace(/\(.*?\)/g, '');
            cleaned = cleaned.replace(/\//g, '.');
            cleaned = cleaned.replace(/[^\d.]/g, '');

            var parts = cleaned.split('.');
            if (parts.length > 2) {
                cleaned = parts[0] + '.' + parts.slice(1).join('');
            }

            if (!/^\d+/.test(cleaned)) {
                return null;
            }

            var intPart = cleaned.split('.')[0] || ''; // Whole number part
            var decPart = cleaned.split('.')[1] || ''; // Decimal part

            if (intPart.length > 3) {
                intPart = intPart.substring(0, 3);
            }
            intPart = intPart.padStart(3, '0');

            if (!decPart) {
                decPart = '000';
            } else if (decPart.length < 3) {
                decPart = decPart.padEnd(3, '0');
            } else if (decPart.length > 3) {
                decPart = decPart.substring(0, 3);
            }

            return intPart + '.' + decPart;

        }
    
    function fetchJSON(url, description, timeout, headers) {
        timeout = timeout || 15000; // Default 15 secs
        headers = headers || {};
        log.info('API', 'Fetching: ' + description, {url: url});
    
        return new Promise(function (resolve) {
            var controller = new AbortController();
            var timeoutId = setTimeout(function () {
                controller.abort();
            }, timeout);

            var fetchOptions = {
                signal: controller.signal,
                headers: headers
            };

            fetch(url, fetchOptions)
                .then(function (response) {
                    clearTimeout(timeoutId);
                    if (!response.ok) {
                        log.warn('API', 'HTTP Error: ' + response.status, { url: url });
                        resolve({ ok: false, data: null, status: response.status });
                        return null;
                    }
                    return response.json();
                })
                .then(function (data){
                    if (data !== null && data !== undefined) {
                        log.success('API', 'Fetched: ' + description);
                        resolve({ ok: true, data: data});
                    }
                })
                .catch(function (error){
                    clearTimeout(timeoutId);
                    log.error('API', 'Failed: ' + description, { error: error.message});
                    resolve({ ok: false, data: null, error: error.message });
                })
        });
    }

    function isbn10to13(isbn10) {
        var prefix = '978' + isbn10.slice(0, 9);
        var sum = 0;
        for (var i = 0; i < 12; i++) {
            sum += parseInt(prefix[i]) * (i % 2 === 0 ? 1 : 3);
        }
        var checkDigit = (10 - (sum % 10)) % 10;
        return prefix + checkDigit;
    }

    function isbn13to10(isbn13) {
        if (!isbn13.startsWith('978')) {
            return null;
        }
        var core = isbn13.slice(3, 12);
        var sum = 0;
        for (var i = 0; i < 9; i++) {
            sum += parseInt(core[i]) * (10 - i);
        }
        var checkDigit = (11 - (sum % 11)) % 11;
        return core + (checkDigit === 10 ? 'X' : checkDigit.toString());
    }

    function emptyResult(source) {
        return {
            source: source,
            found: false,
            title: null,
            author: null,
            deweyDecimal: null,
            deweySource: null,
            lccNumber: null,
            publisher: null,
            publishDate: null,
            subjects: []
    };
}

    return {
        log: log,
        formatDewey: formatDewey,
        fetchJSON: fetchJSON,
        isbn10to13: isbn10to13,
        isbn13to10: isbn13to10,
        emptyResult: emptyResult
    };


})();

window.APIBase = APIBase;
