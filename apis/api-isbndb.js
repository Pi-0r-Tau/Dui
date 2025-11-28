// ISBNdb API requires a paid plan, but if the user has a key
// they can use it here.

var ISBNdbAPI = (function () {
    var SOURCE_NAME = 'ISBNdb';
    var BASE_URL = 'https://api2.isbndb.com';
    var REQUIRES_KEY = true;

    function getInfo() {
        return {
            id: 'isbndb',
            name: SOURCE_NAME,
            description: 'ISBNdb book database. Requires paid API key.',
            requiresKey: REQUIRES_KEY,
           // keyDescription: 'Required. https://isbndb.com/apidocs/v2', Commenting out due to mess up on the UI
            website: 'https://isbndb.com',
            enabled: false
        };
    }

    function lookup(isbn, isbn13, apiKey) {
        APIBase.log.info(SOURCE_NAME, 'Starting lookup', { isbn: isbn, isbn13: isbn13 });

        var result = APIBase.emptyResult(SOURCE_NAME);

        if (!apiKey) {
            APIBase.log.warn(SOURCE_NAME, 'No API key provided');
            return Promise.resolve(result);
        }

        var headers = {
            'Authorization': apiKey
        };

        return APIBase.fetchJSON(
            BASE_URL + '/book/' + isbn13,
            'ISBNdb Book API',
            15000,
            headers
        ).then(function (response) {

            if (!response.ok || !response.data) {
                if (isbn !== isbn13) {
                    return APIBase.fetchJSON(
                        BASE_URL + '/book/' + isbn,
                        'ISBNdb Book API (ISBN-10)',
                        15000,
                        headers
                    );
                }
            }
            return response;

        }).then(function (response) {

            if (response.ok && response.data && response.data.book) {
                var book = response.data.book;

                result.found = true;
                result.title = book.title;
                result.publisher = book.publisher;
                result.publishDate = book.date_published;

                if (book.authors && book.authors.length > 0) {
                    result.author = book.authors.join(', ');
                }

                if (book.dewey_decimal) {
                    result.deweyDecimal = APIBase.formatDewey(book.dewey_decimal);
                    result.deweySource = SOURCE_NAME;
                    APIBase.log.success(SOURCE_NAME, 'Found Dewey', { dewey: result.deweyDecimal });
                }

                if (book.subjects && book.subjects.length > 0) {
                    result.subjects = book.subjects;
                }

                APIBase.log.success(SOURCE_NAME, 'Book found', { title: result.title });
            }

            APIBase.log.info(SOURCE_NAME, 'Lookup complete', result);
            return result;
        });
    }

    function testConnection(apiKey) {
        if (!apiKey) {
            return Promise.resolve(false);
        }
        var headers = {
            'Authorization': apiKey
        };

        return APIBase.fetchJSON(
            BASE_URL + '/book/9781908714725', // Gut Garden (was on bookshelf)
            'ISBNdb connection test',
            5000,
            headers
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

window.ISBNdbAPI = ISBNdbAPI; 
