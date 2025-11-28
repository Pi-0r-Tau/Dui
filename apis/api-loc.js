// Library of congress API
// fREE to use, api key not needed
// https://www.loc.gov/apis/

var LibraryOfCongressAPI = (function () {
    var SOURCE_NAME = 'Library of Congress';
    var BASE_URL = 'https://www.loc.gov';
    var REQUIRES_KEY = false;

    function getInfo() {
        return {
            id: 'loc',
            name: SOURCE_NAME,
            description: 'The Library of Congress catalog.  Good for LCC numbers, sometimes Dewey.',
            requiresKey: REQUIRES_KEY,
            website: 'https://www.loc.gov',
            enabled: true
        };
    }

    function lookup(isbn, isbn13) {
        APIBase.log.info(SOURCE_NAME, 'Starting lookup', { isbn: isbn, isbn13: isbn13 });

        var result = APIBase.emptyResult(SOURCE_NAME);

        return APIBase.fetchJSON(
            BASE_URL + '/books/?q=' + isbn13 + '&fo=json',
            'Library of Congress Search'
        ).then(function (response) {

            if (!response.ok || !response.data || !response.data.results || response.data.results.length === 0) {
                if (isbn !== isbn13) {
                    return APIBase.fetchJSON(
                        BASE_URL + '/books/?q=' + isbn + '&fo=json',
                        'Library of Congress Search (ISBN-10)'
                    );
                }
            }
            return response;

        }).then(function (response) {

            if (response.ok && response.data && response.data.results && response.data.results.length > 0) {
                var book = response.data.results[0];

                result.found = true;
                result.title = book.title;
                result.publishDate = book.date;

                if (book.contributor && book.contributor.length > 0) {
                    result.author = book.contributor[0];
                } else if (book.creator) {
                    result.author = book.creator;
                }

                if (book.subject && book.subject.length > 0) {
                    result.subjects = book.subject.slice(0, 20);
                }

                if (book.call_number && book.call_number.length > 0) {
                    var callNum = book.call_number[0];
                    if (/^\d{3}/.test(callNum)) {
                        result.deweyDecimal = APIBase.formatDewey(callNum);
                        result.deweySource = SOURCE_NAME;
                        APIBase.log.success(SOURCE_NAME, 'Found Dewey', { dewey: result.deweyDecimal });
                    } else {
                        result.lccNumber = callNum;
                        APIBase.log.info(SOURCE_NAME, 'Found LCC', { lcc: result.lccNumber });
                    }
                }

                APIBase.log.success(SOURCE_NAME, 'Book found', { title: result.title });
            }

            APIBase.log.info(SOURCE_NAME, 'Lookup complete', result);
            return result;
        });
    }

    function testConnection() {
        return APIBase.fetchJSON(
            BASE_URL + '/books/?q=9780140328721&fo=json', // Fantastic Mr.Fox by Roald Dahl, doesn't have a dewey decimal but has the LCC 
            'Library of Congress connection test',
            5000
        ).then(function (response) {
            return response.ok;
        });
    }

    return {
        getInfo: getInfo,
        lookup: lookup,
        testConnection: testConnection
    };

})();

window.LibraryOfCongressAPI = LibraryOfCongressAPI;
