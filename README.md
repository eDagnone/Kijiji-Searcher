# Kijiji-Searcher
Scrapes ads from Kijiji that match certian parameters. Output those ads to a CSV, and opens each ad in MS edge.

Dependancies:

  - Node.js
  - Open (https://www.npmjs.com/package/open)
  - fs (https://www.npmjs.com/package/fs)
  - kijiji-scraper (https://www.npmjs.com/package/kijiji-scraper)

Running:

  1. Change search parameters in the Json files
  2. Choose which json file you want to use
  3. Run the following command: node <path to script>\app.js
  
Notes:

As far as I'm aware, Kijiji will currently only let you run 500 simultaneous searches. Trying to run more without modifying the code may result in errors.
