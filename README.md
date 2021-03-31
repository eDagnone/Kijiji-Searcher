# Kijiji-Searcher
Scrapes ads from Kijiji that match certian parameters. Output those ads to a CSV and to an HTML file. 
Additionally, it can open each ad in an individual broser tab so that you can easily browse them.


DEPENDANCIES:
---------------------------------------------------

  - Node.js
  - fs (https://www.npmjs.com/package/fs)
  - kijiji-scraper (https://www.npmjs.com/package/kijiji-scraper)


RUNNING:
---------------------------------------------------

Without making any changes, this will the searcher will run with the following command: 
node \<path to script\>\app.js
By default, it will return a list of CPU's in the GTA.


PERSONALIZATION:
---------------------------------------------------

You can change search settings at the top of the app.js file. Some of the most important ones are:

 - What "tagged items" to search for
 - What cities you want to be included
 - Whether or not to open all individual ads once the search is done
 - What browser the searches open in
 - Your location (for directions when you click on the Location in the HTML file)

You can change the criteria for the items you want to search for in Searches.json.



  
