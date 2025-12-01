// Exports lookup history as CSV or JSON

var ExportManager = (function () {

    function escapeCSVField(field) {
        if (field === null || field === undefined) {
            return '';
        }
        var str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }
    function exportToCSV(data, filename) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        APIBase.log.warn('ExportManager', 'No data to export');
        alert('No data to export');
        return;
    }

    var headers = [
        'ISBN',
        'ISBN-13',
        'Title',
        'Author',
        'Dewey Decimal',
        'Dewey Source',
        'LCC Number',
        'Publisher',
        'Publish Date',
        // TASK 003: Subjects export to CSV, if there is not a DDC number these are often helpful for classification
        'Subjects',
        'Lookup Date'
    ];

    var csvContent = headers.join(',') + '\n';

    data.forEach(function (item) {
        var row = [
            escapeCSVField(item.isbn),
            escapeCSVField(item.isbn13),
            escapeCSVField(item.title),
            escapeCSVField(item.author),
            escapeCSVField(item.deweyDecimal),
            escapeCSVField(item.deweySource),
            escapeCSVField(item.lccNumber),
            escapeCSVField(item.publisher),
            escapeCSVField(item.publishDate),
            escapeCSVField(item.subjects ? item.subjects.join('; ') : ''),
            escapeCSVField(item.timestamp ? new Date(item.timestamp).toISOString() : '')
        ];
        csvContent += row.join(',') + '\n';
    });

    downloadFile(csvContent, filename || 'isbn-dewey-export.csv', 'text/csv');
}

    function exportToJSON(data, filename) {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    var exportData = {
        exportDate: new Date().toISOString(),
        totalRecords: data.length,
        records: data.map(function (item) {
            return {
                isbn: item.isbn,
                isbn13: item.isbn13,
                title: item.title,
                author: item.author,
                deweyDecimal: item.deweyDecimal,
                deweySource: item.deweySource,
                lccNumber: item.lccNumber,
                publisher: item.publisher,
                publishDate: item.publishDate,
                subjects: item.subjects || [],
                lookupDate: item.timestamp ? new Date(item.timestamp).toISOString() : null
            };
        })
    };

    var jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, filename || 'isbn-dewey-export.json', 'application/json');
}

function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType + ';charset=utf-8;' });
    var url = URL.createObjectURL(blob);

    var link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}


return {
    exportToCSV: exportToCSV,
    exportToJSON: exportToJSON,
};
})();

window.ExportManager = ExportManager;