//Ran on Runkit. Set up an IDE for local files and URL launching.



const kijiji = require("kijiji-scraper");
const open = require("open");
const fs = require('fs');
const util = require('util');
const { exec } = require('child_process');
const path = require('path');




//==============================================

//All of GTA=1700272, Hamilton=80014, Oakville/Halton=1700277, Peel=1700276, Toronto=1700273, York=1700274 

var mytags = ["i5"]
let rawdata = fs.readFileSync(path.resolve(__dirname, '.cpu.json'));


//				"Burlington", "Hamilton", "Milton", "Oakville", "Mississauga", "Brampton", "Etobicoke", "Vaughan", "Woodbridge", "Toronto", "York", "Scarboruogh", "Markham", "Richmond Hill"
var cities = [	"Burlington", "Hamilton", "Milton", "Oakville", "Mississauga", "Brampton", "Etobicoke", "Vaughan", "Woodbridge", "Toronto", "York", "Scarboruogh", "Markham", "Richmond Hill"]


var locations = [80014, 1700277, 1700276, 1700273, 1700274];
var openInBrowser = 1
var openSpreadsheet = 0

//=============================================



let importedSearches = JSON.parse(rawdata);

//Figure out which searches need to be done based on tags
var searches = [];
SearchLoop:
for(let i = 0; i < importedSearches.length; ++i) {
	for (let m = 0; m < importedSearches[i].criteria.length; ++m) {
		for (let j = 0; j < importedSearches[i].criteria[m].tags.length; ++j){
			for (let k = 0; k < mytags.length; ++k){
				if(importedSearches[i].criteria[m].tags[j].toLowerCase() == mytags[k].toLowerCase()){
					searches.push(importedSearches[i])
					continue SearchLoop
				}
			}
		}
	}
}
	

try {
	fs.truncateSync("C:\\Users\\ethan\\source\\repos\\KijijiScraper\\KijijiScraper\\KijijiSearch.csv")
} catch(err) {
  console.error(err)
}

const stream = fs.createWriteStream("C:\\Users\\ethan\\source\\repos\\KijijiScraper\\KijijiScraper\\KijijiSearch.csv", { flags: 'a' });
stream.write("BUY THIS:");



RunSearches(searches, SortOutput)


//====================================================================================
function SortOutput(ShownAds, callback) {
	var temp
	for (let i = 1; i < ShownAds.length; ++i) {
		if (ShownAds.length >= 2) {
			for (let j = i; j > 0; j--) {
				if (ShownAds[j].attributes.price < ShownAds[j - 1].attributes.price) {
					temp = ShownAds[j];
					ShownAds[j] = ShownAds[j - 1];
					ShownAds[j - 1] = temp;
				}
			}
		}
	}
	callback(ShownAds)
}
	//console.log('\n"' + ShownAds[0].attributes.price + '","' + ShownAds[i].title + '"')

function showOutput(ShownAds)
{
	urlList = ""
	for (let i = 0; i < ShownAds.length; ++i) {
		urlList += " " + ShownAds[i].url
		console.log(ShownAds[i].attributes.price + '\t' + ShownAds[i].title)

		//If it's wiped, It'll write
		stream.write('\n"' + ShownAds[i].attributes.price + '","' + ShownAds[i].title + '"');
		stream.write(',"' + ShownAds[i].url + '"');
		stream.write(',"' + ShownAds[i].description.replace("...", "") + '"');
		stream.write(',"' + ShownAds[i].date + '"');
	}
	console.log("\n" + urlList.trim() + "\n")
	if (openInBrowser) {
		exec("start msedge" + urlList, (err, stdout, stderr) => {
			if(err) {
				console.log(`stderr: ${stderr}`);
				return;
			}
		});
	}
	stream.close()
	if (openSpreadsheet) {
		open('KijijiSearch.csv', {app: 'notepad'});
	}
	
}

//====================================================================================

function RunSearches(searches, callback){   
	var ShownAds = [];
	var numSearches = 0
	var searchesDone = 0
	var AdsScanned = 0
	
	for (let i = 0; i < searches.length; ++i) {
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
			minResults: 100,
			maxResults: 100 
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
						//console.log(params)  

						kijiji.search(params, options).then(ads => {
							console.log("Results = " + ads.length)
							if (ads.length >= options.minResults) {
								console.log("\nWARNING: Some ads unscraped in the following area:" + util.inspect(ads[0], {showHidden: false, depth: null}) + "\n\n" + util.inspect(ads[ads.length - 1], {showHidden: false, depth: null}));
							}
							AdsScanned += ads.length
							AdLoop:
							for (let i = 0; i < ads.length; ++i) 
							{
								var adText = ads[i].title.toLowerCase() + " " + ads[i].description.toLowerCase();								
								var loc = ads[i].attributes.location
								//console.log(adText);
								City_CriteriaMet = 0
								
								if (cities.length != 0) {
									for (let j = 0; j < cities.length; ++j) {
										if (loc.includes(cities[j])) {
											City_CriteriaMet = 1
										}
									}
								}
								if (!City_CriteriaMet){
									continue AdLoop
								}
								for (let j = 0; j < ShownAds.length; ++j) {
									if (ShownAds[j].url == ads[i].url) {
										continue AdLoop
									}
								}

								CriteriaLoop:
								for (ci = 0; ci < searches[si].criteria.length; ++ci)
								{
									if (searches[si].criteria[ci].MaxPrice < ads[i].attributes.price) {
										continue CriteriaLoop
									}
									
									var AND_CriteriaMet = 1
									var OR_CriteriaMet = 0
									var NOR_CriteriaMet = 1
									var Not_Duplicate = 1
									var Tag_CriteriaMet = 0
									TagLoop:
									for (let j = 0; j < searches[si].criteria[ci].tags.length; ++j) {
										
										for (let k = 0; k < mytags.length; ++k){
											if(searches[si].criteria[ci].tags[j].toLowerCase() == mytags[k].toLowerCase()){
												Tag_CriteriaMet = 1
												break TagLoop
											}
										}
									}
									if (!(Tag_CriteriaMet)){
										continue CriteriaLoop 
									}
									
									for (let j = 0; j < searches[si].criteria[ci].Contains_AND.length; ++j) {
										if (!(adText.includes(searches[si].criteria[ci].Contains_AND[j].toLowerCase()))) {
											AND_CriteriaMet = 0
											break
										}
									}
									for (let j = 0; j < searches[si].criteria[ci].Contains_OR.length; ++j) {
										if ((adText.includes(searches[si].criteria[ci].Contains_OR[j].toLowerCase()))) {
											OR_CriteriaMet = 1
											break
										}
									}
									for (let j = 0; j < searches[si].criteria[ci].Contains_NOR.length; ++j) {
										if ((adText.includes(searches[si].criteria[ci].Contains_NOR[j].toLowerCase()))) {
											NOR_CriteriaMet = 0
											break
										}
									}									

									//console.log(AND_CriteriaMet + " " + OR_CriteriaMet + " " + NOR_CriteriaMet + " " + "\t" + ads[i].title)
									if (AND_CriteriaMet && OR_CriteriaMet && NOR_CriteriaMet) {
										ShownAds.push(ads[i]);
										break CriteriaLoop
									}
								}
							}
							searchesDone++
							if (searchesDone == numSearches) {
								console.log("Ads scanned:\t" + AdsScanned)
								console.log("Ads found:\t" + ShownAds.length + "\n")
								callback(ShownAds, showOutput)
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

