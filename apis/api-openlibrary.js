// Open Library API
// Fre to use , no need for an API key

var OpenLibraryAPI = (function () {
    var SOURCE_NAME = 'Open Library';
    var BASE_URL = 'https://openlibrary.org';
    var REQUIRES_KEY = false;

    function getInfo() {
        return {
            id: 'openlibrary',
            name: SOURCE_NAME,
            description: 'Millions of books.  Good coverage of Dewey Decimal classifications.',
            requiresKey: REQUIRES_KEY,
            website: 'https://openlibrary.org',
            enabled: true
        };
    }

    function lookup(isbn, isbn13) {
        APIBase.log.info(SOURCE_NAME, 'Starting lookup', { isbn: isbn, isbn13: isbn13 });

        var result = APIBase.emptyResult(SOURCE_NAME);

        return APIBase.fetchJSON(
            BASE_URL + '/isbn/' + isbn13 + '.json',
            'Open Library Edition API'
        ).then(function (editionResponse) {

            if (!editionResponse.ok || !editionResponse.data) {
                if (isbn !== isbn13) {
                    return APIBase.fetchJSON(
                        BASE_URL + '/isbn/' + isbn + '.json',
                        'Open Library Edition API (ISBN-10)'
                    );
                }
            }
            return editionResponse;

        }).then(function (editionResponse) {

            if (!editionResponse.ok || !editionResponse.data) {
                APIBase.log.info(SOURCE_NAME, 'Edition not found');
                return result;
            }

            var edition = editionResponse.data;
            result.found = true;
            result.title = edition.title;
            result.publishDate = edition.publish_date;

            if (edition.publishers && edition.publishers.length > 0) {
                result.publisher = edition.publishers[0];
            }

            if (edition.dewey_decimal_class && edition.dewey_decimal_class.length > 0) {
                result.deweyDecimal = APIBase.formatDewey(edition.dewey_decimal_class[0]);
                result.deweySource = SOURCE_NAME;
                APIBase.log.success(SOURCE_NAME, 'Found Dewey in edition', { dewey: result.deweyDecimal });
            }

            if (edition.lc_classifications && edition.lc_classifications.length > 0) {
                result.lccNumber = edition.lc_classifications[0];
            }

            if (edition.works && edition.works.length > 0) {
                var workKey = edition.works[0].key;

                return APIBase.fetchJSON(
                    BASE_URL + workKey + '.json',
                    'Open Library Work API'
                ).then(function (workResponse) {

                    if (workResponse.ok && workResponse.data) {
                        var work = workResponse.data;

                        if (!result.deweyDecimal && work.dewey_number && work.dewey_number.length > 0) {
                            result.deweyDecimal = APIBase.formatDewey(work.dewey_number[0]);
                            result.deweySource = SOURCE_NAME;
                            APIBase.log.success(SOURCE_NAME, 'Found Dewey in work', { dewey: result.deweyDecimal });
                        }

                        if (work.subjects && work.subjects.length > 0) {
                            result.subjects = work.subjects.slice(0, 20);
                        }

                        if (work.authors && work.authors.length > 0) {
                            var authorRef = work.authors[0].author;
                            if (authorRef && authorRef.key) {
                                return APIBase.fetchJSON(
                                    BASE_URL + authorRef.key + '.json',
                                    'Open Library Author API'
                                ).then(function (authorResponse) {
                                    if (authorResponse.ok && authorResponse.data) {
                                        result.author = authorResponse.data.name;
                                    }
                                    return result;
                                });
                            }
                        }
                    }
                    return result;
                });
            }

            return result;

        }).then(function (result) {
            if (!result.deweyDecimal && result.found) {
                return APIBase.fetchJSON(
                    BASE_URL + '/api/books?bibkeys=ISBN:' + isbn13 + '&jscmd=data&format=json',
                    'Open Library Books API'
                ).then(function (booksResponse) {

                    if (booksResponse.ok && booksResponse.data) {
                        var bookData = booksResponse.data['ISBN:' + isbn13] || booksResponse.data['ISBN:' + isbn];
                        if (bookData) {
                            if (bookData.classifications &&
                                bookData.classifications.dewey_decimal_class &&
                                bookData.classifications.dewey_decimal_class.length > 0) {
                                result.deweyDecimal = APIBase.formatDewey(bookData.classifications.dewey_decimal_class[0]);
                                result.deweySource = SOURCE_NAME;
                                APIBase.log.success(SOURCE_NAME, 'Found Dewey in Books API', { dewey: result.deweyDecimal });
                            }
                            if (!result.author && bookData.authors && bookData.authors.length > 0) {
                                result.author = bookData.authors.map(function (a) { return a.name; }).join(', ');
                            }
                        }
                    }
                    return result;
                });
            }

            return result;
        }).then(function (result) {

            if (!result.deweyDecimal && result.found && result.title) {
                var searchQuery = encodeURIComponent(result.title);
                return APIBase.fetchJSON(
                    BASE_URL + '/search.json?q=' + searchQuery + '&fields=key,title,author_name,ddc,lcc&limit=5',
                    'Open Library Search API'
                ).then(function (searchResponse) {

                    if (searchResponse.ok && searchResponse.data &&
                        searchResponse.data.docs && searchResponse.data.docs.length > 0) {
                        for (var i = 0; i < searchResponse.data.docs.length; i++) {
                            var doc = searchResponse.data.docs[i];
                            if (doc.ddc && doc.ddc.length > 0) {
                                result.deweyDecimal = APIBase.formatDewey(doc.ddc[0]);
                                result.deweySource = SOURCE_NAME;
                                APIBase.log.success(SOURCE_NAME, 'Found Dewey via search', { dewey: result.deweyDecimal });
                                break;
                            }
                        }
                        if (!result.lccNumber) {
                            for (var j = 0; j < searchResponse.data.docs.length; j++) {
                                var doc2 = searchResponse.data.docs[j];
                                if (doc2.lcc && doc2.lcc.length > 0) {
                                    result.lccNumber = doc2.lcc[0];
                                    break;
                                }
                            }
                        }
                    }
                    return result;
                });
            }

            return result;

        }).then(function (result) {
            APIBase.log.info(SOURCE_NAME, 'Lookup complete', result);
            return result;
        });
    }

    function testConnection() {
        return APIBase.fetchJSON(
            BASE_URL + '/isbn/1405953195.json', // Unruly David Mitchell
            'Open Library connection test',
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

window.OpenLibraryAPI = OpenLibraryAPI;