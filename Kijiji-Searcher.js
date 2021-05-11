/*
To run, 

1. Ensure you have node.js installed, and the fs and kijiji-scraper packages
2. Open powershell and type:
	node C:\path-to-script\Kijiji-Searcher.js
	
	(ex. node C:\Users\$env:username\source\repos\KijijiScraper\KijijiScraper\Kijiji-Searcher.js)
*/
const kijiji = require("kijiji-scraper");
const fs = require('fs');
const util = require('util');
const { exec } = require('child_process');
const path = require('path');
//==============================================

//Any searches in the json file containing these tags will be ran.
var mytags_AND = ["ram"]
var mytags_OR = ["mid", "high"]

//VARIABLE SETUP

//json file used:
let rawdata = fs.readFileSync(path.resolve(__dirname, 'Searches.json'));

//Set to empty array to remove city constraint
//Cities:		"Burlington", "Hamilton", "Milton", "Oakville", "Mississauga", "Brampton", "Etobicoke", "Vaughan", "Woodbridge", "Toronto", "York", "Scarboruogh", "Markham", "Richmond Hill"
var cities = [ "Ancaster", "Hamilton", "Burlington", "Dundas", "Milton", "Oakville", "Mississauga", "Brampton", "Etobicoke", "Vaughan", "Maple", "Woodbridge", "Toronto", "York", "Scarborough", "Markham", "Thornhill", "Richmond Hill" ]

//Multiply the thresholds for prices of all items by this amount.
var priceMultiplier = 1

//Open all results in a seperate tab in the web browser
var openInBrowser = false

//When OpenInBrowser is set to 1, which browser is used?
var browserToOpen = "chrome" //alternatives: msedge, Firefox

//In the HTML file, prefix all url's with microsoft-edge: so that they open in edge
var msedgeLinks = true

//Filter out all ads with "sold" in the title
var removeSoldTitle = true

//What to filter on if not set in json. Set to title, short, full 
var defaultFilter = 'short'

//Open the CSV file at program end (depreciated)
var openSpreadsheet = false

//"Origin" for google maps links. Set this to an address or area near you.
var startLocation = "Mississauga, ON L5P 1B2" 
//Pearson: Mississauga, ON L5P 1B2

var locations =[]
for(let i = 0; i < cities.length; i++){
	if(cities[i] == "Hamilton" || cities[i] == "Burlington" || cities[i] == "Ancaster"){
		addLocation(80014);
	}
	if(cities[i] == "Oakville" || cities[i] == "Halton" || cities[i] == "Milton"){
		addLocation(1700277);
	}
	if(cities[i] == "Mississauga" || cities[i] == "Brampton"){
		addLocation(1700276);
	}
	if(cities[i] == "Toronto" || cities[i] == "Etobicoke" || cities[i] == "Vaughan" || cities[i] == "Maple" || cities[i] == "Woodbridge" || cities[i] == "York" || cities[i] == "Markham" || cities[i] == "Scarborough" || cities[i] =="Thornhill" || cities[i] == "Richmond Hill"){
		addLocation(1700273);
		addLocation(1700274);
	}
}
// OVERRIDE:
// var locations =[]
function addLocation(areaNumber){
	for(let j = 0; j < locations.length; j++){
		if (locations[j] == areaNumber){
			return
		}
	}
	locations.push(areaNumber)
}


//If set to 1, every ad scraped will be displayed. Useful for debugging.
var noFiltering = false

//=============================================
//Nothing below here needs to be touched by end users


var LinkPlatform = ""
if (msedgeLinks) {
	LinkPlatform = "microsoft-edge:";
}

var apiStartLocation = startLocation.replace(/ /g, "%2C").replace(/,/g, "")

let importedSearches = JSON.parse(rawdata);

//Figure out which searches need to be done based on tags
var searches = [];
var block_MaxPrices = [];
var AND_met = 0
var OR_met = 0

SearchLoop:
for(let i = 0; i < importedSearches.length; ++i) { //cycle all search objects
	block_MaxPrices = [];	
	CriteriaLoop:
	for (let m = 0; m < importedSearches[i].criteria.length; ++m) { //cycle criteria blocks in search object
		for (let k = 0; k < mytags_AND.length; ++k){ //Cycle mytags_AND to compare
			AND_met = 0
			for (let j = 0; j < importedSearches[i].criteria[m].tags.length; ++j){ //Cycle tags in said block
				if (importedSearches[i].criteria[m].tags[j].toLowerCase() == mytags_AND[k].toLowerCase()| mytags_AND[k] == ""){ //If any block tags match this mytags_AND
					AND_met = 1
					break
				}
			}
			if (!AND_met){
				continue CriteriaLoop
			}
		}
		OR_loop:
		for (let j = 0; j < importedSearches[i].criteria[m].tags.length; ++j){ //Cycle tags in said block
			for (let k = 0; k < mytags_OR.length; ++k){ //Cycle mytags_OR
				if (importedSearches[i].criteria[m].tags[j].toLowerCase() == mytags_OR[k].toLowerCase() | mytags_OR[k] == "" ){ //If any mytags_OR match this block tag
					block_MaxPrices.push(importedSearches[i].criteria[m].MaxPrice)
					OR_met = 1
					break OR_loop
				}
			}
		}
		if (!OR_met){
			continue CriteriaLoop
		}
	}
	if(block_MaxPrices.length !== 0){
		var maxSearchPrice = 0;
		for(let j = 0; j < block_MaxPrices.length; j++){
			if (block_MaxPrices[j] > maxSearchPrice){
				maxSearchPrice = block_MaxPrices[j];
			}
		}
		maxSearchPrice *= priceMultiplier
		
		importedSearches[i].MaxPrice = maxSearchPrice
		searches.push(importedSearches[i])
	}
}

if(searches.length == 0){
	console.log("No searches found in JSON matching the following tag criteria:")
	if(mytags_AND.length > 0){
		console.log("Search contains all of these tags:")
		console.log(mytags_AND)
	}
	if(mytags_OR.length > 0){
		console.log("Search contains one of these tags:")
		console.log(mytags_OR)
	}
	process.exit()
}	


console.log("Performing the following searches:\n\n")
console.log(searches)
RunSearches(searches, descFilter)




//====================================================================================


function showOutput(ShownAds)
{	
	if(!(ShownAds.length)){
		console.log("Didn't find any ads.")
	}
	else{
		//Clear old csv and html files, create write streams
		try {
			fs.truncateSync(path.resolve(__dirname, 'KijijiSearch.csv'))
			fs.truncateSync(path.resolve(__dirname, 'KijijiSearch.html'))
		} catch(err) {
		  console.error(err)
		}
		const CSVstream = fs.createWriteStream(path.resolve(__dirname, 'KijijiSearch.csv'), { flags: 'a' });
		const HTMLstream = fs.createWriteStream(path.resolve(__dirname, 'KijijiSearch.html'), { flags: 'a' });	

		
		//Sort items by price
		if (ShownAds.length >= 2) {
			var temp
			for (let i = 1; i < ShownAds.length; ++i) {
				for (let j = i; j > 0; j--) {
					if (ShownAds[j].attributes.price < ShownAds[j - 1].attributes.price) {
						temp = ShownAds[j];
						ShownAds[j] = ShownAds[j - 1];
						ShownAds[j - 1] = temp;
					}
				}
			}
		}

		 
		urlList = " --new-window "
		CSVstream.write("BUY THIS:");
		HTMLstream.write(fs.readFileSync(path.resolve(__dirname, 'HTMLstring1.txt'), "utf8"));
		
		for (let i = 0; i < ShownAds.length; ++i) { //For all shown ads
			urlList += " " + ShownAds[i].url
			if (((i+1)%30 == 0  | i + 1==ShownAds.length) & openInBrowser) {
				exec("start " + browserToOpen + " " + urlList, (err, stdout, stderr) => {
					if(err) {
						console.log(`stderr: ${stderr}`);
						return;
					}
				});
				urlList = ""
			}
			//Print to Powershell console
			var dollarSigns = (ShownAds[i].fullDescription.match(/\$/g) || []).length;
			if (dollarSigns > 4){
				console.log("BULK SELLER DETECTED:")
			}
			console.log(ShownAds[i].attributes.price + '\t' + ShownAds[i].title.replace("\n", "").replace("\r", ""))
			console.log(ShownAds[i].metCriteria.tags)

			//Address Crap (Organized as "City, postal Code" for filtering)
			var locString = ShownAds[i].attributes.location.replace(/[A-Z]{2,3}, Canada,/g, 'ON,')
			locInfo = locString.match(/[, ]?((\w* )?(\w*)), [A-Z]{2,3} (\w\d\w[ ]?(\d\w\d)?)/);
			if (locInfo == undefined){
				for(let j = 0; j < cities.length; j++){
					if(ShownAds[i].attributes.location.includes(cities[j])){
						var displayLocation = cities[j]
						console.log("here")
					}
				}
			}else{
				var city = locInfo[1]
				var postalCode = locInfo[4]
				displayLocation = city + ", " + postalCode.replace(" ", "")
			}
			
			var apiLocation = ShownAds[i].attributes.location.replace(/ /g, "%2C").replace(/,/g, "")
			var mapsURL = "https://www.google.com/maps/dir/?api=1&origin=" + apiStartLocation + "&destination=" + apiLocation
			
			//Generate CSV
			CSVstream.write('\n"' + ShownAds[i].attributes.price + '","' + ShownAds[i].title.replace('"', '""') + '"');
			CSVstream.write(',"' + ShownAds[i].url + '"');
			CSVstream.write(',"' + ShownAds[i].attributes.location + '"');
			CSVstream.write(',"' + ShownAds[i].fullDescription.replace("...", "").replace('"', '""')  + '"');
			CSVstream.write(',"' + ShownAds[i].date + '"');
			
			
			//Generate HTML
			HTMLstream.write('\n<tr>\n\t<td><input type="button" value="X" onclick="deleteRow(this)"/></td>') //X button
			
			//Images
			if(ShownAds[i].images !== undefined){ 
				if(ShownAds[i].images.length == 0){
					HTMLstream.write('\n\t<td>No Image</td>')
				}
				else {
					HTMLstream.write('\n\t<td><div class="w3-content w3-display-container slider" id="div' + i + '">')
					for(let imgCtr = 0; imgCtr < ShownAds[i].images.length; imgCtr++){
						HTMLstream.write('\n\t\t<a href="'+ShownAds[i].images[imgCtr]+ '"><img class="mySlides" src="' + ShownAds[i].images[imgCtr] + '" alt="No Image" height="300" style="max-width:400px"></a>')
					}
					if(ShownAds[i].images.length > 1){
						HTMLstream.write('\n\t\t<a class="w3-btn-floating w3-display-left" onclick="plusDivs(this, -1)">&#10094;</a>')
						HTMLstream.write('\n\t\t<a class="w3-btn-floating w3-display-right" onclick="plusDivs(this, 1)">&#10095;</a>')
					}
					HTMLstream.write('\n\t</div></td>')
				}
			}
			else{
				HTMLstream.write('\n\t<td>Images array undefined.</td>')
			}
			
			HTMLstream.write('\n\t<td>' + ShownAds[i].attributes.price + '</td>') //Price
			HTMLstream.write("\n\t<td><a href=" + LinkPlatform + ShownAds[i].url + ' target="_blank" rel="noopener noreferrer">' + ShownAds[i].title + "</a><br>") //title
			HTMLstream.write((ShownAds[i].fullDescription).replace(/(\r\n|\n|\r)/gm, '<br>\n') + "</td>") //Description
			HTMLstream.write('\n\t<td><a style="color:black; text-decoration:none" href=' + mapsURL + '" target="_blank" rel="noopener noreferrer">' + displayLocation + '</a></td>\n</tr>')
		}
		//console.log("\n" + urlList.trim() + "\n")
		
		//Open the HTML or CSV file
		CSVstream.close(() => {
			if (openSpreadsheet) {
				exec("start " + path.resolve(__dirname, 'KijijiSearch.csv'));
			}
		});
		let endScript = fs.readFileSync(path.resolve(__dirname, 'HTMLstring2.txt'), "utf8")
		HTMLstream.write("\n</table></body>\n" + endScript + '\n</html>');
		
		HTMLstream.close(() => {
			exec("start " + path.resolve(__dirname, 'KijijiSearch.html'));
		});
		console.log("");
	}
}

//====================================================================================

function RunSearches(searches, callback){  
	var ShownAds = [];
	var numSearches = 0
	var searchesDone = 0
	var AdsScanned = 0
	var evaluatedAds = [];
	
	for (let i = 0; i < searches.length; ++i) {
		searches[i].PriceMargin *= priceMultiplier
		if ((searches[i].MaxPrice - searches[i].MinPrice) % searches[i].PriceMargin == 0) {
			numSearches += searches[i].SearchTerms.length * locations.length * searches[i].categories.length * (Math.ceil((searches[i].MaxPrice - searches[i].MinPrice) / searches[i].PriceMargin) + 1)
		}
		else {
			numSearches += searches[i].SearchTerms.length * locations.length * searches[i].categories.length * Math.ceil((searches[i].MaxPrice - searches[i].MinPrice) / searches[i].PriceMargin)
        }
	}
	console.log("\nPerforming " + numSearches + " searches.\n")

	for (let si = 0; si < searches.length; ++si) {
		var options = {
			minResults: -1,
			maxResults: -1
		};

		var params = {
			minPrice: searches[si].MinPrice,
			maxPrice: searches[si].MinPrice + searches[si].PriceMargin - 0.01,
			locationId: 0,
			categoryId: 0,  
			q: "Placeholder",
			sortType: "PRICE_ASCENDING"
		};
		
		for (let searchTermIndex = 0; searchTermIndex < searches[si].SearchTerms.length; ++searchTermIndex) {
			params.q = searches[si].SearchTerms[searchTermIndex];
			params.minPrice = searches[si].MinPrice
			params.maxPrice = searches[si].MinPrice + searches[si].PriceMargin - 0.01;
			while (params.minPrice <= searches[si].MaxPrice) {
				if (params.maxPrice > searches[si].MaxPrice) {
					params.maxPrice = searches[si].MaxPrice;
				}
				for (let categoryIndex = 0; categoryIndex < searches[si].categories.length; ++categoryIndex) {
					params.categoryId = searches[si].categories[categoryIndex];
					for (let LocIndex = 0; LocIndex < locations.length; ++LocIndex) {
						params.locationId = locations[LocIndex];
						
						//RUN THE SEARCH
						kijiji.search(params, options).then(ads => {
							if(ads.length != 0){
								console.log("Scraped " + ads.length)
							}
							AdsScanned += ads.length

							AdLoop:
							for (let i = 0; i < ads.length; ++i) //For all ads scraped
							{
								var added = 0;
								if(!noFiltering){								
									//Eliminate Duplicates
									for (let j = 0; j < evaluatedAds.length; ++j) {
										if (evaluatedAds[j].url == ads[i].url || (evaluatedAds[j].title == ads[i].title & evaluatedAds[j].description == ads[i].description) || (evaluatedAds[j].title == ads[i].title & evaluatedAds[j].attributes.location == ads[i].attributes.location)){
											continue AdLoop;
										}
									}
									evaluatedAds.push(ads[i]);
									 
									if(CityMatch(cities, ads[i].attributes.location)){ //City name filter
										if( !ads[i].title.toLowerCase().includes("sold") | !removeSoldTitle){ //"sold" is not in title (or we don't care about it)
											ads[i].criteriaBlock = []
										
											for (ci = 0; ci < searches[si].criteria.length & ads[i].metCriteria === undefined; ++ci){  //For all criteria blocks in the search from the json file

												if (!((searches[si].criteria[ci].MaxPrice*priceMultiplier < ads[i].attributes.price) || ads[i].attributes.price === undefined)) { //Price Filter
													if (orTagMatch(searches[si].criteria[ci].tags, mytags_OR) & andTagMatch(searches[si].criteria[ci].tags, mytags_AND)){ //AND/OR tag filter
														//Get adText
														var adText = ads[i].title
														if(searches[si].criteria[ci].filter != "title"){
															adText += ads[i].description
														}
														adText = adText.toLowerCase()
														adText = removeIgnored(adText, searches[si].criteria[ci].Ignore) //Remove Ignored words
														
														if (NorMatch(searches[si].criteria[ci].Contains_NOR, adText)){ //Nor Filter
															if (searches[si].criteria[ci].filter === undefined) //Criteria filter setup
																searches[si].criteria[ci].filter = defaultFilter															
															if(searches[si].criteria[ci].filter == 'title' | searches[si].criteria[ci].filter == 'short'){ //IF TITLE OR SHORT FILTER USED
																if(OrMatch(searches[si].criteria[ci].Contains_OR, adText)){ //adText OR filter 
																	if (AndMatch(searches[si].criteria[ci].Contains_AND, adText)){ //adText AND filter
																		ads[i].metCriteria = searches[si].criteria[ci] //No further filtering required.
																	}
																}
															}
															else { //LONG filter used
																ads[i].criteriaBlock.push(searches[si].criteria[ci]) //Add to potential criteria for further description filtering
															}
														}										
													}
												}
											} //End of CriteriaLoop
											if(ads[i].criteriaBlock.length > 0 || ads[i].metCriteria !== undefined){
												ShownAds.push(ads[i]);
											}
										}
									}
								}
								else { //noFiltering
									ads[i].metCriteria = "No Filtering"
									ShownAds.push(ads[i]);
								}
							}
							searchesDone++
							if (searchesDone == numSearches) {
								console.log("Ads scanned:\t" + AdsScanned)
								console.log("Filter 1:\t" + ShownAds.length)
								callback(ShownAds, showOutput)
							}
						})//.catch(console.error);
					}
				}
				params.minPrice += searches[si].PriceMargin
				params.maxPrice += searches[si].PriceMargin
			} 
		}
	}
}

//Stage 2: Filter by description and append full description to ad.
function descFilter(ads2, callback){
	ShownAds2 = [];
	numFinished = 0;
	for(let ai = 0; ai < ads2.length; ai++){
		kijiji.Ad.Get(ads2[ai].url).then(ad => { //For all ads at stage 2:		
			ads2[ai].fullDescription = ad.description //Change description
			
			if(noFiltering | ads2[ai].metCriteria !== undefined){ 
				ShownAds2.push(ads2[ai]);
			}
			else{
				for(let ci = 0; ci < ads2[ai].criteriaBlock.length; ci++){ 
					var adText = (ads2[ai].title + ads2[ai].fullDescription).toLowerCase();
					adText = removeIgnored(adText, ads2[ai].criteriaBlock[ci].Ignore) //Remove Ignored Words
					if( OR_CriteriaMet = OrMatch(ads2[ai].criteriaBlock[ci].Contains_OR, adText)){ //OR filter
						if( AND_CriteriaMet = AndMatch(ads2[ai].criteriaBlock[ci].Contains_AND, adText)){ //AND filter
							if (NOR_CriteriaMet = NorMatch(ads2[ai].criteriaBlock[ci].Contains_NOR, adText)){ //NOR filter
								ads2[ai].metCriteria = ads2[ai].criteriaBlock[ci] 
								ShownAds2.push(ads2[ai]);
							}
						}
					}
				}
			}
			numFinished++;
			if (numFinished == ads2.length){
				ShownAds2 = removeDuplicates(ShownAds2)
				console.log("Filter 2:\t" + ShownAds2.length + "\n")
				callback(ShownAds2)
			}
		})
		.catch(() => { //Runs when "Search" returns ads that are no longer live...
			numFinished++
			if (numFinished == ads2.length){
				ShownAds2 = removeDuplicates(ShownAds2)
				console.log("Filter 2:\t" + ShownAds2.length + "\n")
				callback(ShownAds2)
			}
		});
	}
}



//================================================================================
//Utility Functions:
//--------------------------------------------------------------------------------


//Evaluates "or" tags
function orTagMatch(searchTags, myTags_OR){
	for (let j = 0; j < searchTags.length; ++j) { //For all tags in json
		for (let k = 0; k < myTags_OR.length; ++k){ //For all myTags searched for
			if(searchTags[j].toLowerCase() == myTags_OR[k].toLowerCase() | myTags_OR[k] == ""){
				return true
			}
		}
	}
	return false
}
//Evaluates "and" tags
function andTagMatch(searchTags, myTags_AND){
	for (let k = 0; k < myTags_AND.length; ++k){ //For all myTags searched for
		var AND_tagMet = 0;
		for (let j = 0; j < searchTags.length && myTags_AND[k] != ""; ++j) { //For all tags in JSON search criteria
			if(searchTags[j].toLowerCase() == myTags_AND[k].toLowerCase()) { 
				AND_tagMet = 1;
			}
		}
		if(!(AND_tagMet)){
			return false
		}
	}
	return true
}

//Compares cities list to adLocation
function CityMatch(cities, adLocation){
	for (let j = 0; j < cities.length; ++j) { //For cities searched for
		if (adLocation.includes(cities[j])) {
			return true											
		}
	}
	return false
}

//Evaluates AND match
function AndMatch(andArray, adText) {
	if (andArray !== undefined){
		for (let j = 0; j < andArray.length & andArray[j] != ""; ++j) {
			let regexCompare = new RegExp(andArray[j], 'i')
			if (!(regexCompare.test(adText))){
				return false
			}
		}
	}
	return true
}
//Evaluates OR match
function OrMatch(orArray, adText){
	if (orArray !== undefined){
		for (let j = 0; j < orArray.length; ++j) { //For all phrases in OR array
			let regexCompare = new RegExp(orArray[j], 'i')
			if (regexCompare.test(adText) | orArray[j] == ""){
				return true
			}
		}
		return false
	}
	return true
}
//Evaluates NOR match
function NorMatch(norArray, adText){
	if(norArray !== undefined){
		for (let j = 0; j < norArray.length & norArray[j] != ""; ++j) {
			let regexCompare = new RegExp(norArray[j], 'i')
			if (regexCompare.test(adText)){
				return false
			}
		}
	}
	return true
}
//Removes duplicate items from a list of ads
function removeDuplicates(ads){ 
	for(let j = 0; j < ads.length; j++){
		for(let k = j+1; k < ads.length; k++){
			if(ads[j].url == ads[k].url || ((ads[j].description == ads[k].description) & (ads[j].title == ads[k].title || ads[j].attributes.location == ads[k].attributes.location)) || (ads[j].title == ads[k].title & ads[j].attributes.location == ads[k].attributes.location)){
				ads.splice(k, 1)
				k--;
			}
		}
	}
	return ads;
}

//Removes list of Ignored regex phrases from a string
function removeIgnored(textString, ignoredPhrases){
	if(ignoredPhrases !== undefined){
		for (let k = 0; k < ignoredPhrases.length; k++){
			var regexCompare = new RegExp(ignoredPhrases[k], 'gi')
			textString = textString.replace(regexCompare, '')
		}
	}
	return textString
}