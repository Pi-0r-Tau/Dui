# Dui

## ISBN to Dewey Decimal Classification
Dui is a web-based tool for librarians to quickly look up Dewey Decimal Classification (DDC) numbers from ISBN barcodes or manual entry.

## Dui allows librarians to:

- Scan ISBN barcodes using a barcode scanner
- Manually enter ISBNs (10 or 13 digit)
- Retrieve Dewey Decimal numbers from multiple library databases
- Export lookup history as CSV or JSON files

## What if Dui cannot find Dewey Decimal Numbers for a ISBN?

If Dui cannot return a DDC number for a typed or scanned in ISBN, it shall provide quick links for the ISBN in question to:

- Blackwell's
- Browns Books
- WorldCat

## APIs used:

- Open Library
- Library of Congress (For LCC numbers)
- Google Books (For metadata)


## Optional API:

- ISBNdb (API key required)

## Export Options
- CSV
- JSON

# Upcoming updates:
- Local lookup from [BFS Dewey_JSON Data](https://github.com/Pi-0r-Tau/BFS_Dewey_JSON_Data) for the last 10 years of published books in English, 000 - 800.999 DDC.

## Data Privacy

- All data is stored locally in browser (localStorage)
- No data is sent to external servers except for ISBN lookups
- Lookup history remains on your device

### Legal bit
This project:

- Operates within the acceptable usage policies of each API provider
- Respects rate limits imposed by each service
- Does not cache or redistribute API data beyond local browser storage for user convenience
- Makes no guarantees about data accuracy all data is provided by the source APIs

Users are responsible for ensuring their usage complies with each API's terms of service.
This tool is a user interface only. It does not host or store any data. All book information and Dewey Decimal classifications are retrieved in real-time from third-party library APIs.
