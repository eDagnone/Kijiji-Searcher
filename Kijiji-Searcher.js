/*
To run, 

1. Ensure you have node.js installed, and the fs and kijiji-scraper packages
2. Open powershell and type:
	node C:\path-to-script\Kijiji-Searcher.js
	
	(ex. node C:\Users\$env:username\source\repos\KijijiScraper\KijijiScraper\Kijiji-Searcher.js)
*/
const kijiji = require("kijiji-scraper");
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const config = require('./config');

//==============================================

//Reverse Search Structure:
//For each part, have specific and a general
// If not specific, put in general.
// After "collecting" a part, get rid of description including that part.

let rawdata = fs.readFileSync(path.resolve(__dirname, 'Searches.json')); //Searches.JSON
var searchBlocks = JSON.parse(rawdata);
let rawdata2 = fs.readFileSync(path.resolve(__dirname, 'ReverseBlocks.json'));
var reverseBlocks = JSON.parse(rawdata2);
var apiStartLocation = config.startLocation.replace(/ /g, "%2C").replace(/,/g, "")
const csvFileName = 'KijijiSearch.csv'
const HTMLFileName = 'KijijiSearch.html'
const jsonFileName = 'KijijiSearch.json'
var locations = []
var cities = config.cities || [""]
if (cities.includes("Waterloo")) {
	locations =[1700212]
}
else {
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
}
function addLocation(areaNumber){
	for(let j = 0; j < locations.length; j++){
		if (locations[j] == areaNumber){
			return
		}
	}
	locations.push(areaNumber)
}

var LinkPlatform = ""
if (config.msEdgeLinks) {
	LinkPlatform = "microsoft-edge:";
}



//Figure out which searches need to be done based on tags
var searches = [];
var block_MaxPrices = [];
var AND_met = 0
var OR_met = 0

SearchLoop:
for(let i = 0; i < searchBlocks.length; ++i) { //cycle all search objects
	//Collect all prices for big search object
	block_MaxPrices = [];	
	for (let m = 0; m < searchBlocks[i].criteria.length; ++m) { //cycle criteria blocks in search object
		if (andTagMatch(searchBlocks[i].criteria[m].tags, config.mytags_AND)){
			if (orTagMatch(searchBlocks[i].criteria[m].tags, config.mytags_OR)){
				block_MaxPrices.push(searchBlocks[i].criteria[m].MaxPrice)
			}
		}
	}
	if(block_MaxPrices.length !== 0){
		var maxSearchPrice = 0;
		for(let j = 0; j < block_MaxPrices.length; j++){
			if (block_MaxPrices[j] > maxSearchPrice){
				maxSearchPrice = block_MaxPrices[j];
			}
		}
		maxSearchPrice *= config.priceMultiplier
		
		searchBlocks[i].MaxPrice = maxSearchPrice
		searches.push(searchBlocks[i])
	}
}

if(searches.length == 0){
	console.log("\nNo searches found in JSON matching the following tag criteria:")
	if(config.mytags_AND.length > 0){
		console.log("Search contains all of these tags:")
		console.log(config.mytags_AND)
	}
	if(config.mytags_OR.length > 0){
		console.log("Search contains one of these tags:")
		console.log(config.mytags_OR)
	}
	process.exit()
}	

console.log("\n#=======================================================")
console.log("|   Performing the following searches:")
console.log("}-------------------------------------------------------")
for(let i = 0; i < searches.length; i++){

	console.log("|\tSearchTerms:\t" + searches[i].SearchTerms)
	console.log("|\tPrice:\t\t" + (searches[i].MinPrice | "0") + " - " + (Math.round(searches[i].MaxPrice * 100) / 100).toFixed(2))
	console.log("|\tCategories:\t" + searches[i].categories)
	console.log("}- - - - - - - - - - - - - - - - - - - - - - - - - - - -")
}

RunSearches(searches, showOutput)


//====================================================================================
function errorFn (err) {
	if (err) throw err
	console.log('Successfully moved!')
}
	

function showOutput(ShownAds){	
	if(!(ShownAds.length)){
		console.log("Didn't find any ads.")
	}
	else{
		//Move old csv and html files, create write streams
		try {
			fs.rename(path.resolve(__dirname, jsonFileName), path.resolve(__dirname + "/old/", +Date.now().toString()+jsonFileName), errorFn)
			fs.rename(path.resolve(__dirname, csvFileName), path.resolve(__dirname + "/old/", +Date.now().toString()+csvFileName), errorFn)
			fs.rename(path.resolve(__dirname, HTMLFileName), path.resolve(__dirname + "/old/", +Date.now().toString()+HTMLFileName), errorFn)
			
		} catch(err) {
		  console.error(err)
		}
		const CSVstream = fs.createWriteStream(path.resolve(__dirname, csvFileName), { flags: 'a' });
		const HTMLstream = fs.createWriteStream(path.resolve(__dirname, HTMLFileName), { flags: 'a' });	
		fs.writeFile(path.resolve(__dirname, jsonFileName), JSON.stringify(ShownAds), 'utf8', function (err) {
			if (err) {
				console.log("An error occured while writing JSON Object to File.");
				return console.log(err);
			}
		 	console.log("JSON file has been saved.");
		});
		
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
		console.log("\n\n#=================================================================================================")
		console.log("| BUY THIS")
		console.log("}-------------------------------------------------------------------------------------------------")
		
		
		for (let i = 0; i < ShownAds.length; ++i) { //For all shown ads
			var displayLocation = ""
			var mapsURL = ""
			//Object.keys(ShownAds[i]).forEach((prop)=> console.log(prop))
			
			//Open as Browser tabs
			urlList += " " + ShownAds[i].url
			if (config.openInBrowser & ((i+1)%30 == 0  | i + 1==ShownAds.length)) {
				exec("start " + config.browserToOpen + " " + urlList, (err, stdout, stderr) => {
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
			console.log("| " + ShownAds[i].attributes.price + '\t: ' + ShownAds[i].title.replace("\n", "").replace("\r", ""))
			//console.log(ShownAds[i].metCriteria.tags)

			//Address Crap (Organized as "City, postal Code" for filtering)
			if (ShownAds[i].attributes.location !== undefined){
				var locString = ShownAds[i].attributes.location.replace(/[A-Z]{2,3}, Canada,/g, 'ON,')
				displayLocation = locString
				locInfo = locString.match(/[, ]?((\w* )?(\w*)), [A-Z]{2,3} (\w\d\w[ ]?(\d\w\d)?)/);
				if (!locInfo){
					for(let j = 0; j < cities.length; j++){
						if(ShownAds[i].attributes.location.includes(cities[j])){
							displayLocation = cities[j]
						}
					}
				}else{
					var city = locInfo[1]
					var postalCode = locInfo[4]
					displayLocation = city + ", " + postalCode.replace(" ", "")
				}
				var apiLocation = ShownAds[i].attributes.location.replace(/ /g, "%2C").replace(/,/g, "")
				mapsURL = "https://www.google.com/maps/dir/?api=1&origin=" + apiStartLocation + "&destination=" + apiLocation
			}
						
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
					if(ShownAds[i].image !== ''){
						HTMLstream.write('\n\t<td><div class="w3-content w3-display-container slider" id="div' + i + '">')
						HTMLstream.write('\n\t\t<a href="'+ShownAds[i].image + '"><img class="mySlides" src="' + ShownAds[i].image + '" alt="No Image" height="300" style="max-width:400px"></a>')
						HTMLstream.write('\n\t</div></td>')
					} else {
						HTMLstream.write('\n\t<td>No Image</td>')
					}
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
		console.log("}-------------------------------------------------------------------------------------------------")		
		//Open the HTML or CSV file
		CSVstream.close(() => {
			if (config.openSpreadsheet) {
				exec("start " + path.resolve(__dirname, csvFileName));
			}
		});
		let endScript = fs.readFileSync(path.resolve(__dirname, 'HTMLstring2.txt'), "utf8")
		HTMLstream.write("\n</table></body>\n" + endScript + '\n</html>');
		
		HTMLstream.close(() => {
			exec("start " + path.resolve(__dirname, HTMLFileName));
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
		if(config.minimizeAPIcalls){
			searches[i].PriceMargin = (searches[i].MaxPrice - searches[i].MinPrice)*config.priceMultiplier + 1
		}
		searches[i].PriceMargin *= config.priceMultiplier
		if ((searches[i].MaxPrice - searches[i].MinPrice) % searches[i].PriceMargin == 0) {
			numSearches += searches[i].SearchTerms.length * locations.length * searches[i].categories.length * (Math.ceil((searches[i].MaxPrice - searches[i].MinPrice) / searches[i].PriceMargin) + 1)
		}
		else {
			numSearches += searches[i].SearchTerms.length * locations.length * searches[i].categories.length * Math.ceil((searches[i].MaxPrice - searches[i].MinPrice) / searches[i].PriceMargin)
        }
	}
	console.log("\n\n}===========================================")
	console.log("|   Running " + numSearches + " searches...")
	console.log("}-------------------------------------------")
	
	for (let si = 0; si < searches.length; ++si) {
		var options = {
			minResults: -1,
			maxResults: -1,
			scrapeResultDetails: !config.minimizeAPIcalls
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
			while (params.minPrice <= searches[si].MaxPrice) { //For each price range that needs to be searched
				if (params.maxPrice > searches[si].MaxPrice) {
					params.maxPrice = searches[si].MaxPrice;
				}
				for (let categoryIndex = 0; categoryIndex < searches[si].categories.length; ++categoryIndex) { //for each category (search terms) that needs to be searched
					params.categoryId = searches[si].categories[categoryIndex];
					for (let LocIndex = 0; LocIndex < locations.length; ++LocIndex) { //for each location that needs to be searched
						params.locationId = locations[LocIndex];
						//RUN THE SEARCH
						kijiji.search(params, options).then(ads => {
							AdsScanned += ads.length
							AdLoop:
							for (let i = 0; i < ads.length; ++i) //For all ads scraped
							{
								var added = 0;
								if(!config.noFiltering){ //if filtering
									evaluatedAds.push(ads[i]);
									for (let j = 0; j < evaluatedAds.length -1; ++j) {	//For all ads seen so far
										if (evaluatedAds[j].url == ads[i].url || (evaluatedAds[j].title == ads[i].title & evaluatedAds[j].description == ads[i].description) || (evaluatedAds[j].title == ads[i].title & evaluatedAds[j].attributes.location == ads[i].attributes.location)){ //eliminate duplicates
											continue AdLoop;
										}
									}	
									if(CityMatch(cities, ads[i].attributes.location) & //City name filter
									(!(ads[i].title.toLowerCase().includes("sold")) | !config.removeSoldTitle)){ //"sold" is not in title (or we don't care about it)
										for (ci = 0; ci < searches[si].criteria.length & ads[i].metCriteria === undefined; ++ci){  //For all criteria blocks in the search from the json file
											if (searches[si].criteria[ci].MaxPrice*config.priceMultiplier <= ads[i].attributes.price | ads[i].attributes.price === undefined){ //Price Filter
												if (orTagMatch(searches[si].criteria[ci].tags, config.mytags_OR) & andTagMatch(searches[si].criteria[ci].tags, config.mytags_AND)){ //AND/OR tag filter
													//Get adText
													var adText = ads[i].title
													if(searches[si].criteria[ci].filter != "title"){
														adText += "[ s e p a r a t o r ]" + ads[i].description
													}
													adText = adText.toLowerCase()
													adText = removeIgnored(adText, searches[si].criteria[ci].Ignore) //Remove Ignored words
													
													if (NorMatch(searches[si].criteria[ci].Contains_NOR, adText)){ //Nor Filter
														if (searches[si].criteria[ci].filter === undefined) //Criteria filter setup
															searches[si].criteria[ci].filter = config.defaultFilter															
														if(searches[si].criteria[ci].filter == 'title' | searches[si].criteria[ci].filter == 'short' | !config.pullFullDesc){ //IF TITLE OR SHORT FILTER USED
															if(OrMatch(searches[si].criteria[ci].Contains_OR, adText)){ //adText OR filter 
																if (AndMatch(searches[si].criteria[ci].Contains_AND, adText)){ //adText AND filter
																	ads[i].metCriteria = searches[si].criteria[ci] //No further filtering required. Criteria met, loop will stop.																				
																	ads[i].fullDescription = ads[i].description
																}
															}
														}
														else { //LONG filter used and desc must be pulled
															kijiji.Ad.Get(ads[i].url).then(ad => { //For all ads at stage 2:		
																ads[i].fullDescription = ad.description //Change description
																ads[i].attributes.visits = ad.attributes.visits //FLAG
																adText2 = (ads[i].title + "[s e p a r a t o r]" + ads[i].fullDescription).toLowerCase();
																adText2 = removeIgnored(adText2, ads[i].criteria[ci].Ignore) //Remove Ignored Words
																if (( OrMatch(ads[i].criteria[ci].Contains_OR, adText2))& //OR filter
																( AndMatch(ads[i].criteria[ci].Contains_AND, adText2)) & //AND filter
																( NorMatch(ads[i].criteria[ci].Contains_NOR, adText2)) & //NOR filter
																(ads[i].attributes.visits <= config.maxVisits || config.maxVisits == 0)){ //Views filter
																	//EXPERIMENTAL
																	let allText = ads[i].title + "[s e p a r a t o r]" + ads[i].fullDescription
																	let estValue = 0;
																	for(let i = 0; i < reverseBlocks.length; ++i) { //cycle all search objects	
																		for (let m = 0; m < reverseBlocks[i].criteria.length; ++m) { //cycle criteria blocks in search object
																			if (OrMatch(reverseBlocks[i].criteria[m].Contains_OR, allText) & AndMatch(reverseBlocks[i].criteria[m].Contains_AND, allText)){ //And/Or match
																				if(orTagMatch(reverseBlocks[i].criteria[m].tags, ["cpu", "gpu", "ram", "SSD", "HDD", "PSU", "motherboard"])){ //Relevent tag to reverse
																					estValue += reverseBlocks[i].criteria[m].MaxPrice
																					ads[i].fullDescription += ("\nValue after " + reverseBlocks[i].criteria[m].tags[reverseBlocks[i].criteria[m].tags.length-1] + " " + reverseBlocks[i].SearchTerms[0] + " is " + estValue)
																				}
																				ads[i].metCriteria = ads[i].criteria[ci] //No further filtering required. Criteria met, loop will stop.
																			}
																		}
																	}
																}
															})
															.catch((error) => { //Runs when "Search" returns ads that are no longer live...
																console.log(error)
																Object.keys(searches[si]).forEach((prop)=> console.log(prop))
															});
														}
													}										
												}
											}
										} //End of CriteriaLoop
										if(ads[i].metCriteria !== undefined){ //If it met some criteria
											ShownAds.push(ads[i]);
										}
									}
									
								}
								else { //config.noFiltering
									ads[i].metCriteria = "No Filtering"
									ShownAds.push(ads[i]);
								}
							}
							searchesDone++
							if (searchesDone == numSearches) {
								console.log("|\tAds scanned:\t" + AdsScanned)
								console.log("|\tFiltered:\t" + ShownAds.length)
								callback(ShownAds)
							}
						}).catch(console.error);
					}
				}
				params.minPrice += searches[si].PriceMargin
				params.maxPrice += searches[si].PriceMargin
			} 
		}
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
		for (let j = 0; j < searchTags.length; ++j) { //For all tags in JSON search criteria
			if(searchTags[j].toLowerCase() == myTags_AND[k].toLowerCase() || myTags_AND[k] == "") { 
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
	
	if(!cities.length | adLocation === undefined){
		return true
	} else {
		for (let j = 0; j < cities.length; ++j) { //For cities searched for
			if (adLocation.mapAddress.includes(cities[j])) {
				return true											
			}
		}
		return false
	}
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
