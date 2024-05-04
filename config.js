// config.js
const config = {
	mytags_OR: [""],
	mytags_AND: ["computer", "catchall"],
	//cities: ["Waterloo", "Kitchener", "Kitchener / Waterloo"], //Set to empty to remove constraint
	cities: ["Ancaster", "Hamilton", "Burlington", "Dundas", "Milton", "Oakville", "Mississauga", "Brampton", "Etobicoke", "Vaughan", "Maple", "Woodbridge", "Toronto", "York", "Scarborough", "Markham", "Thornhill", "Richmond Hill"], //Set to empty to remove constraint
	priceMultiplier: 0.3, 							//Multiply all max prices by this
	maxVisits: 500, 								//Maximum number of views an ad can have before being filtered out
	removeSoldTitle: true, 							//Remove ads with "sold" in the title
	noFiltering: false, 							//Accept all scraped ads
	pullFullDesc: false,							//Use another request to get the full description. Only effective when filter = title or short
	minimizeAPIcalls: true,							//Use 1 price per search
	openInBrowser: false, 							//Open each ad on Kijiji website
	msEdgeLinks: true, 								//MSedge links on the html file
	openSpreadsheet: false, 						//Open KijijiSearch.csv when program finishes
	browserToOpen: "chrome", 						//alternatives: msedge, Firefox
	startLocation: "Mississauga, ON L5K 2H2", 		//"Origin" for google maps links.
	defaultFilter: 'short' 							//If filter is not set in json. title, short, long
};

module.exports = config;
