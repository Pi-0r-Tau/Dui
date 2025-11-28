
// So messy at the moment but will tidy up into modules later down the line

var DEWEY_CATEGORIES = {
    '0': 'Computer Science, Information & General Works',
    '1': 'Philosophy & Psychology',
    '2': 'Religion',
    '3': 'Social Sciences',
    '4': 'Language',
    '5': 'Science',
    '6': 'Technology',
    '7': 'Arts & Recreation',
    '8': 'Literature',
    '9': 'History & Geography'
};

var availableAPIs = {};
var currentSettings = null;
var inputBuffer = '';
var lastKeyTime = 0;
var scannerTimeout = null;
var lookupHistory = [];

var SCANNER_THRESHOLD_MS = 50;
var SCANNER_MIN_LENGTH = 10;
var HISTORY_STORAGE_KEY = 'isbnLookupHistory';
var elements = {};

function init() {
    console.log('[INIT] Initialising ISBN to Dewey Decimal Lookup');

    elements = {
        isbnInput: document.getElementById('isbn-input'),
        searchBtn: document.getElementById('search-btn'),
        clearBtn: document.getElementById('clear-btn'),
        scannerStatus: document.getElementById('scanner-status'),
        resultsSection: document.getElementById('results-section'),
        historyList: document.getElementById('history-list'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        exportCsvBtn: document.getElementById('export-csv-btn'),
        exportJsonBtn: document.getElementById('export-json-btn'),
        settingsToggle: document.getElementById('settings-toggle'),
        settingsPanel: document.getElementById('settings-panel'),
        apiSettingsList: document.getElementById('api-settings-list'),
        saveSettingsBtn: document.getElementById('save-settings-btn')
    };

    // Register available APIs
    registerAPIs();

    // Load settings and history
    Promise.all([
        Settings.load(),
        loadHistory()
    ]).then(function (results) {
        currentSettings = results[0];
        renderApiSettings();
        renderHistory();
        testApiConnections();
    });

    setupEventListeners();

    setTimeout(function () {
        if (elements.isbnInput) {
            elements.isbnInput.focus();
        }
    }, 100);

    console.log('[INIT] Initialisation complete');
}

function registerAPIs() {
    if (typeof OpenLibraryAPI !== 'undefined') {
        availableAPIs.openlibrary = OpenLibraryAPI;
    }
    if (typeof GoogleBooksAPI !== 'undefined') {
        availableAPIs.googlebooks = GoogleBooksAPI;
    }
    if (typeof LibraryOfCongressAPI !== 'undefined') {
        availableAPIs.loc = LibraryOfCongressAPI;
    }
    if (typeof ISBNdbAPI !== 'undefined') {
        availableAPIs.isbndb = ISBNdbAPI;
    }

    console.log('[INIT] Registered APIs:', Object.keys(availableAPIs));
}

function testApiConnections() {
    console.log('[INIT] Testing API connections...');

    Object.keys(availableAPIs).forEach(function (apiId) {
        var api = availableAPIs[apiId];
        var apiKey = currentSettings.apiKeys[apiId] || '';

        api.testConnection(apiKey).then(function (connected) {
            var statusEl = document.getElementById('api-status-' + apiId);
            if (statusEl) {
                statusEl.className = 'api-status ' + (connected ? 'connected' : 'disconnected');
                statusEl.textContent = connected ? 'Connected' : 'Unavailable';
            }
        });
    });
}

function setupEventListeners() {
    elements.isbnInput.addEventListener('keydown', handleKeyDown);
    elements.isbnInput.addEventListener('input', handleInput);

    elements.searchBtn.addEventListener('click', function () {
        performLookup(elements.isbnInput.value);
    });

    elements.clearBtn.addEventListener('click', clearInput);
    elements.clearHistoryBtn.addEventListener('click', clearHistory);

    elements.isbnInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performLookup(elements.isbnInput.value);
        }
    });

    // Export buttons
    elements.exportCsvBtn.addEventListener('click', function () {
        ExportManager.exportToCSV(lookupHistory);
    });

    elements.exportJsonBtn.addEventListener('click', function () {
        ExportManager.exportToJSON(lookupHistory);
    });

    // Settings panel toggle
    elements.settingsToggle.addEventListener('click', function () {
        var panel = elements.settingsPanel;
        var isHidden = panel.style.display === 'none' || !panel.style.display;
        panel.style.display = isHidden ? 'block' : 'none';
        this.textContent = isHidden ? 'Hide settings' : 'API Settings';
    });

    elements.saveSettingsBtn.addEventListener('click', saveSettings);
}

function handleKeyDown(e) {
    var currentTime = Date.now();
    var timeDiff = currentTime - lastKeyTime;

    if (timeDiff < SCANNER_THRESHOLD_MS && inputBuffer.length > 0) {
        setScannerMode(true);
    }

    lastKeyTime = currentTime;

    if (scannerTimeout) {
        clearTimeout(scannerTimeout);
    }

    scannerTimeout = setTimeout(function () {
        if (elements.isbnInput.value.length >= SCANNER_MIN_LENGTH) {
            var cleanedISBN = cleanISBN(elements.isbnInput.value);
            if (isValidISBN(cleanedISBN)) {
                performLookup(elements.isbnInput.value);
            }
        }
        setScannerMode(false);
        inputBuffer = '';
    }, 200);
}

function handleInput() {
    inputBuffer = elements.isbnInput.value;
}

function setScannerMode(active) {
    var statusTextEl = elements.scannerStatus.querySelector('.status-text');
    if (active) {
        elements.isbnInput.classList.add('scanning');
        elements.scannerStatus.classList.add('scanning');
        if (statusTextEl) {
            statusTextEl.textContent = 'Scanning barcode...';
        }
    } else {
        elements.isbnInput.classList.remove('scanning');
        elements.scannerStatus.classList.remove('scanning');
        if (statusTextEl) {
            statusTextEl.textContent = 'Ready for barcode scan';
        }
    }
}

function cleanISBN(isbn) {
    return isbn.replace(/[-\s]/g, '').trim().toUpperCase();
}

function isValidISBN10(isbn) {
    if (isbn.length !== 10) return false;

    var sum = 0;
    for (var i = 0; i < 9; i++) {
        if (!/\d/.test(isbn[i])) return false;
        sum += parseInt(isbn[i]) * (10 - i);
    }

    var lastChar = isbn[9];
    if (lastChar === 'X') {
        sum += 10;
    } else if (/\d/.test(lastChar)) {
        sum += parseInt(lastChar);
    } else {
        return false;
    }

    return sum % 11 === 0;
}

function isValidISBN13(isbn) {
    if (isbn.length !== 13) return false;
    if (!/^\d{13}$/.test(isbn)) return false;

    var sum = 0;
    for (var i = 0; i < 13; i++) {
        sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    }

    return sum % 10 === 0;
}

function isValidISBN(isbn) {
    var cleaned = cleanISBN(isbn);
    return isValidISBN10(cleaned) || isValidISBN13(cleaned);
}

function performLookup(rawISBN) {
    console.log('[LOOKUP] Starting lookup for:', rawISBN);

    var isbn = cleanISBN(rawISBN);

    if (!isbn) {
        showError('Enter an ISBN number');
        return;
    }

    if (!isValidISBN(isbn)) {
        showError('Enter a valid ISBN number.  Check the number and try again.');
        return;
    }

    showLoading();
    elements.searchBtn.disabled = true;

    var isbn13 = isbn;
    var isbn10 = isbn;

    if (isbn.length === 10) {
        isbn10 = isbn;
        isbn13 = APIBase.isbn10to13(isbn);
    } else {
        isbn13 = isbn;
        isbn10 = APIBase.isbn13to10(isbn13) || isbn;
    }

    lookupWithAllAPIs(isbn10, isbn13).then(function (result) {
        console.log('[LOOKUP] Lookup complete:', result);
        displayResult(result);
        addToHistory(result);
    }).catch(function (error) {
        console.error('[LOOKUP] Lookup failed:', error);
        showError('There was a problem looking up this ISBN. Please try again.');
    }).finally(function () {
        elements.searchBtn.disabled = false;
    });
}

function lookupWithAllAPIs(isbn10, isbn13) {
    return Settings.getEnabledApis().then(function (enabledApiIds) {
        console.log('[LOOKUP] Enabled APIs:', enabledApiIds);

        var bestResult = {
            isbn: isbn10.length === 10 ? isbn10 : isbn13,
            isbn13: isbn13,
            title: null,
            author: null,
            deweyDecimal: null,
            deweySource: null,
            lccNumber: null,
            publisher: null,
            publishDate: null,
            subjects: [],
            found: false,
            sources: []
        };

        // Chains API lookups 
        var promise = Promise.resolve(bestResult);

        enabledApiIds.forEach(function (apiId) {
            promise = promise.then(function (currentBest) {
                var api = availableAPIs[apiId];
                if (!api) return currentBest;

                var apiKey = currentSettings.apiKeys[apiId] || '';

                var info = api.getInfo();
                if (info.requiresKey && !apiKey) {
                    console.log('[LOOKUP] Skipping ' + apiId + ' (no API key)');
                    return currentBest;
                }

                return api.lookup(isbn10, isbn13, apiKey).then(function (result) {
                    if (result.found) {
                        currentBest.found = true;
                        if (currentBest.sources.indexOf(result.source) === -1) {
                            currentBest.sources.push(result.source);
                        }

                        currentBest.title = currentBest.title || result.title;
                        currentBest.author = currentBest.author || result.author;
                        currentBest.publisher = currentBest.publisher || result.publisher;
                        currentBest.publishDate = currentBest.publishDate || result.publishDate;

                        if (!currentBest.deweyDecimal && result.deweyDecimal) {
                            currentBest.deweyDecimal = result.deweyDecimal;
                            currentBest.deweySource = result.deweySource;
                        }

                        if (!currentBest.lccNumber && result.lccNumber) {
                            currentBest.lccNumber = result.lccNumber;
                        }

                        if (result.subjects && result.subjects.length > 0) {
                            var combined = currentBest.subjects.concat(result.subjects);
                            currentBest.subjects = combined.filter(function (item, index) {
                                return combined.indexOf(item) === index;
                            });
                        }
                    }

                    return currentBest;
                }).catch(function (err) {
                    console.error('[LOOKUP] API error:', apiId, err);
                    return currentBest;
                });
            });
        });

        return promise.then(function (finalResult) {
            if (!finalResult.found) {
                finalResult.title = 'Book Not Found';
                finalResult.author = 'Unknown';
            }
            return finalResult;
        });
    });
}

function getDeweyDescription(dewey) {
    if (!dewey) return null;

    var firstDigit = dewey.toString().charAt(0);
    var mainCategory = DEWEY_CATEGORIES[firstDigit];

    if (!mainCategory) return null;

    return firstDigit + '00s - ' + mainCategory;
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function displayResult(result) {
    var deweyDescription = getDeweyDescription(result.deweyDecimal);
    var html = '';

    if (!result.found) {
        html = '<div class="govuk-error-summary" role="alert">' +
            '<h2 class="govuk-error-summary__title">Book not found</h2>' +
            '<p class="govuk-body">No book was found for ISBN: <strong>' + escapeHtml(result.isbn) + '</strong></p>' +
            '</div>';
    } else if (result.deweyDecimal) {
        html = '<div class="govuk-panel govuk-panel--confirmation">' +
            '<div class="result-dewey-number">' + result.deweyDecimal + '</div>' +
            (deweyDescription ? '<div class="result-classification">' + deweyDescription + '</div>' : '') +
            '<div class="result-source">Source: ' + escapeHtml(result.deweySource) + '</div>' +
            '</div>' +
            buildBookDetailsHtml(result);
    } else {
        html = '<div class="govuk-warning-text">' +
            '<span class="govuk-warning-text__icon">! </span>' +
            '<div>' +
            '<strong>No Dewey Decimal Classification found</strong>' +
            '<p class="govuk-body">This book was found but does not have a Dewey Decimal Classification. </p>' +
            (result.lccNumber ? '<p class="govuk-body">LCC: <strong>' + escapeHtml(result.lccNumber) + '</strong></p>' : '') +
            '</div>' +
            '</div>' +
            buildBookDetailsHtml(result);
    }

    elements.resultsSection.innerHTML = html;
}

function buildBookDetailsHtml(result) {
    var html = '<div class="govuk-card govuk-card--with-border" style="margin-top: 30px;">' +
        '<h2 class="govuk-heading-m">Book details</h2>' +
        '<dl class="govuk-summary-list book-details-list">' +
        '<div class="govuk-summary-list__row">' +
        '<dt class="govuk-summary-list__key">Title</dt>' +
        '<dd class="govuk-summary-list__value book-title">' + escapeHtml(result.title) + '</dd>' +
        '</div>' +
        '<div class="govuk-summary-list__row">' +
        '<dt class="govuk-summary-list__key">Author</dt>' +
        '<dd class="govuk-summary-list__value book-author">' + escapeHtml(result.author || 'Unknown') + '</dd>' +
        '</div>' +
        '<div class="govuk-summary-list__row">' +
        '<dt class="govuk-summary-list__key">ISBN</dt>' +
        '<dd class="govuk-summary-list__value book-isbn">' + (result.isbn13 || result.isbn) + '</dd>' +
        '</div>';

    if (result.publisher) {
        html += '<div class="govuk-summary-list__row">' +
            '<dt class="govuk-summary-list__key">Publisher</dt>' +
            '<dd class="govuk-summary-list__value book-publisher">' + escapeHtml(result.publisher) + '</dd>' +
            '</div>';
    }

    if (result.publishDate) {
        html += '<div class="govuk-summary-list__row">' +
            '<dt class="govuk-summary-list__key">Published</dt>' +
            '<dd class="govuk-summary-list__value book-date">' + escapeHtml(result.publishDate) + '</dd>' +
            '</div>';
    }

    if (result.lccNumber) {
        html += '<div class="govuk-summary-list__row">' +
            '<dt class="govuk-summary-list__key">LCC Number</dt>' +
            '<dd class="govuk-summary-list__value book-lcc">' + escapeHtml(result.lccNumber) + '</dd>' +
            '</div>';
    }

    html += '</dl>';

    if (result.sources && result.sources.length > 0) {
        html += '<div class="sources-list">' +
            '<span class="sources-label">Data from:</span> ' +
            result.sources.map(function (s) {
                return getSourceLink(s);
            }).join(' ') +
            '</div>';
    }

    html += '</div>';
    return html;
}

function getSourceLink(sourceName) {
    var sourceLinks = {
        'Open Library': 'https://openlibrary.org',
        'Google Books': 'https://books.google.com',
        'Library of Congress': 'https://www.loc.gov',
        'ISBNdb': 'https://isbndb.com'
    };

    var url = sourceLinks[sourceName] || '#';
    return '<a href="' + url + '" target="_blank" class="govuk-tag govuk-tag--grey source-link">' + escapeHtml(sourceName) + '</a>';
}

function showLoading() {
    elements.resultsSection.innerHTML = '<div class="govuk-card govuk-card--with-border">' +
        '<div class="loading-spinner">' +
        '<div class="spinner"></div>' +
        '<div class="loading-text">' +
        '<strong>Searching library databases...</strong>' +
        '</div>' +
        '</div>' +
        '</div>';
}

function showError(message) {
    elements.resultsSection.innerHTML = '<div class="govuk-error-summary" role="alert">' +
        '<h2 class="govuk-error-summary__title">There is a problem</h2>' +
        '<p class="govuk-body">' + escapeHtml(message) + '</p>' +
        '</div>';
}

function clearInput() {
    elements.isbnInput.value = '';
    inputBuffer = '';
    elements.resultsSection.innerHTML = '';
    elements.isbnInput.focus();
}

function loadHistory() {
    return new Promise(function (resolve) {
        try {
            var saved = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (saved) {
                lookupHistory = JSON.parse(saved);
            }
            resolve(lookupHistory);
        } catch (e) {
            lookupHistory = [];
            resolve(lookupHistory);
        }
    });
}

function saveHistory() {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(lookupHistory));
    } catch (e) {
        console.error('Failed to save history:', e);
    }
}

function addToHistory(result) {
    lookupHistory = lookupHistory.filter(function (h) {
        return h.isbn !== result.isbn && h.isbn !== result.isbn13;
    });

    lookupHistory.unshift({
        isbn: result.isbn,
        isbn13: result.isbn13,
        title: result.title,
        author: result.author,
        deweyDecimal: result.deweyDecimal,
        deweySource: result.deweySource,
        lccNumber: result.lccNumber,
        publisher: result.publisher,
        publishDate: result.publishDate,
        subjects: result.subjects,
        timestamp: Date.now()
    });

    lookupHistory = lookupHistory.slice(0, 100);

    saveHistory();
    renderHistory();
    updateExportButtons();
}

function renderHistory() {
    if (lookupHistory.length === 0) {
        elements.historyList.innerHTML = '<p class="govuk-body empty-history">No recent lookups</p>';
        elements.clearHistoryBtn.style.display = 'none';
        updateExportButtons();
        return;
    }

    elements.clearHistoryBtn.style.display = 'block';

    var html = '';
    for (var i = 0; i < Math.min(lookupHistory.length, 20); i++) {
        var item = lookupHistory[i];
        var title = item.title || '';
        var displayTitle = title.length > 40 ? title.substring(0, 40) + '...' : title;

        html += '<div class="history-item" data-isbn="' + item.isbn + '" tabindex="0">' +
            '<div>' +
            '<span class="history-isbn">' + (item.isbn13 || item.isbn) + '</span>' +
            '<span class="history-title">' + escapeHtml(displayTitle) + '</span>' +
            '</div>' +
            '<span class="history-dewey ' + (item.deweyDecimal ? '' : 'none') + '">' +
            (item.deweyDecimal || 'No DDC') +
            '</span>' +
            '</div>';
    }

    if (lookupHistory.length > 20) {
        html += '<p class="govuk-body" style="margin-top: 15px; color: #505a5f;">Showing 20 of ' + lookupHistory.length + ' records</p>';
    }

    elements.historyList.innerHTML = html;

    var historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach(function (historyItem) {
        historyItem.addEventListener('click', function () {
            var isbn = this.getAttribute('data-isbn');
            elements.isbnInput.value = isbn;
            performLookup(isbn);
        });
        historyItem.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                var isbn = this.getAttribute('data-isbn');
                elements.isbnInput.value = isbn;
                performLookup(isbn);
            }
        });
    });

    updateExportButtons();
}

function updateExportButtons() {
    var hasData = lookupHistory.length > 0;
    elements.exportCsvBtn.disabled = !hasData;
    elements.exportJsonBtn.disabled = !hasData;
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all lookup history?')) {
        lookupHistory = [];
        saveHistory();
        renderHistory();
    }
}

// Settings panel
function renderApiSettings() {
    var html = '';

    Object.keys(availableAPIs).forEach(function (apiId) {
        var api = availableAPIs[apiId];
        var info = api.getInfo();
        var isEnabled = currentSettings.enabledApis[apiId] === true;
        var apiKey = currentSettings.apiKeys[apiId] || '';

        html += '<div class="api-setting-item">' +
            '<div class="api-setting-header">' +
            '<label class="govuk-label">' +
            '<input type="checkbox" class="api-enabled-checkbox" data-api="' + apiId + '" ' + (isEnabled ? 'checked' : '') + '> ' +
            info.name +
            '</label>' +
            '<span id="api-status-' + apiId + '" class="api-status">Testing... </span>' +
            '</div>' +
            '<p class="govuk-hint">' + info.description + '</p>';

        if (info.requiresKey || info.keyOptional) {
            html += '<div class="api-key-input">' +
                '<label class="govuk-label" for="api-key-' + apiId + '">' +
                'API Key' + (info.keyOptional ? ' (optional)' : ' (required)') +
                '</label>' +
                '<input type="password" class="govuk-input" id="api-key-' + apiId + '" data-api="' + apiId + '" value="' + escapeHtml(apiKey) + '" placeholder="Enter API key">' +
                (info.keyDescription ? '<p class="govuk-hint">' + info.keyDescription + '</p>' : '') +
                '</div>';
        }

        if (info.website) {
            html += '<p class="govuk-body-s"><a href="' + info.website + '" target="_blank" class="govuk-link">Learn more</a></p>';
        }

        html += '</div>';
    });

    elements.apiSettingsList.innerHTML = html;

    document.querySelectorAll('.api-enabled-checkbox').forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
            var apiId = this.getAttribute('data-api');
            var statusEl = document.getElementById('api-status-' + apiId);

            if (this.checked) {
                statusEl.textContent = 'Testing...';
                statusEl.className = 'api-status';
                // Test connection for enabled API
                var api = availableAPIs[apiId];
                var apiKey = currentSettings.apiKeys[apiId] || '';
                api.testConnection(apiKey).then(function (connected) {
                    statusEl.className = 'api-status ' + (connected ? 'connected' : 'disconnected');
                    statusEl.textContent = connected ? 'Connected' : 'Unavailable';
                });
            } else {
                statusEl.textContent = 'Disabled';
                statusEl.className = 'api-status disabled';
            }
        });
    });
}

function saveSettings() {
    var newSettings = {
        apiKeys: {},
        enabledApis: {},
        apiPriority: currentSettings.apiPriority
    };

    // Get enabled state for each API
    document.querySelectorAll('.api-enabled-checkbox').forEach(function (checkbox) {
        var apiId = checkbox.getAttribute('data-api');
        newSettings.enabledApis[apiId] = checkbox.checked;
    });

    // Get API keys
    document.querySelectorAll('.api-key-input input').forEach(function (input) {
        var apiId = input.getAttribute('data-api');
        newSettings.apiKeys[apiId] = input.value.trim();
    });

    Settings.save(newSettings).then(function () {
        currentSettings = newSettings;
        alert('Settings saved successfully');
        testApiConnections();
    }).catch(function (err) {
        alert('Failed to save settings: ' + err.message);
    });
}

document.addEventListener('DOMContentLoaded', init);