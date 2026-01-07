var GoogleBooksAPI = (function () {
    var SOURCE_NAME = 'Google Books';
    var BASE_URL = 'https://www.googleapis.com/books/v1';
    var REQUIRES_KEY = false;

    function getInfo() {
        return {
            id: 'googlebooks',
            name: SOURCE_NAME,
            description: 'Google\'s book database. Good for book details and metadata..',
            requiresKey: REQUIRES_KEY,
            keyOptional: true,
            keyDescription: 'Optional. Increases rate limits from 100 to 1000 requests per day.', // Do need to clarify limits here at some point
            website: 'https://console.cloud.google.com/apis/library/books.googleapis.com',
            enabled: true
        };
    }

    function lookup(isbn, isbn13, apiKey) {
        APIBase.log.info(SOURCE_NAME, 'Starting lookup', { isbn: isbn, isbn13: isbn13 });

        var result = APIBase.emptyResult(SOURCE_NAME);

        var url = BASE_URL + '/volumes?q=isbn:' + isbn13;
        if (apiKey) {
            url += '&key=' + apiKey;
        }

        return APIBase.fetchJSON(url, 'Google Books API')
            .then(function (response) {

                if (!response.ok || !response.data || !response.data.totalItems) {
                    if (isbn !== isbn13) {
                        var url10 = BASE_URL + '/volumes?q=isbn:' + isbn;
                        if (apiKey) {
                            url10 += '&key=' + apiKey;
                        }
                        return APIBase.fetchJSON(url10, 'Google Books API (ISBN-10)');
                    }
                    return response;
                }
                return response;

            }).then(function (response) {

                if (response.ok && response.data && response.data.totalItems > 0) {
                    var book = response.data.items[0].volumeInfo;
                    result.found = true;
                    result.title = book.title;
                    if (book.authors) {
                        result.author = book.authors.join(', ');
                    }
                    result.publisher = book.publisher;
                    result.publishDate = book.publishedDate;
                    if (book.categories) {
                        result.subjects = book.categories;
                    }
                    APIBase.log.success(SOURCE_NAME, 'Book found', { title: result.title });
                }

                APIBase.log.info(SOURCE_NAME, 'Lookup complete', result);
                return result;
            });
    }

    function testConnection(apiKey) {
        var url = BASE_URL + '/volumes?q=isbn:0192825844'; // The Oxford Book of War Poetry (was on bookshelf)
        if (apiKey) {
            url += '&key=' + apiKey;
        }
        return APIBase.fetchJSON(url, 'Google Books connection test', 5000)
            .then(function (response) {
                return response.ok;
            });
    }

    return {
        getInfo: getInfo,
        lookup: lookup,
        testConnection: testConnection
    };
})();

window.GoogleBooksAPI = GoogleBooksAPI;