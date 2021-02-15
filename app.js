/*
To Run:
node C:\Users\ethan\source\repos\KijijiScraper\KijijiScraper\app.js
*/

const kijiji = require("kijiji-scraper");
const fs = require('fs');
const util = require('util');
const { exec } = require('child_process');
const path = require('path');



//==============================================

//Any searches in the json file containing these tags will be ran.
var mytags_AND = [""]
var mytags_OR = [""]




//VARIABLE SETUP

//json file used:
let rawdata = fs.readFileSync(path.resolve(__dirname, 'Searches.json'));

//Cities:		"Burlington", "Hamilton", "Milton", "Oakville", "Mississauga", "Brampton", "Etobicoke", "Vaughan", "Woodbridge", "Toronto", "York", "Scarboruogh", "Markham", "Richmond Hill"
var cities = [	"Burlington", "Hamilton", "Milton", "Oakville", "Mississauga", "Brampton", "Etobicoke", "Vaughan", "Woodbridge", "Toronto", "York", "Scarboruogh", "Markham", "Richmond Hill"]

//Kijiji Lctn:	Hamilton, 	Oakvlle/Halton,	Mississauga,	Toronto		Markham/York // 80014,		1700277,		1700276,		1700273,	1700274
var locations = [80014,		1700277,		1700276,		1700273,	1700274];

//If set to 1, returns all items matching search criteria, up until the max price for the search on the json.
var priceIrrelivent = 0
//Open all results in a seperate tab in the web browser
var openInBrowser = 1

//When OpenInBrowser is set to 1, which browser is used?
var browserToOpen = "chrome" //alternatives: msedge, Firefox

//In the HTML file, prefix all url's with microsoft-edge: so that they open in edge
var msedgeLinks = 0

//Open the CSV file at program end (depreciated)
var openSpreadsheet = 0

//"Origin" for google maps links. Set this to an address or area near you.
var startLocation = "Mississauga, ON, L5P1B2" 

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
var AND_met = 0
var OR_met = 0
var matched = 0
SearchLoop:
for(let i = 0; i < importedSearches.length; ++i) { //cycle all search objects
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
		//Cycle mytags_OR to compare
		for (let j = 0; j < importedSearches[i].criteria[m].tags.length; ++j){ //Cycle tags in said block
			for (let k = 0; k < mytags_OR.length; ++k){ //Cycle mytags_OR
				if (importedSearches[i].criteria[m].tags[j].toLowerCase() == mytags_OR[k].toLowerCase() | mytags_OR[k] == ""){ //If any mytags_OR match this block tag
					searches.push(importedSearches[i])
					continue SearchLoop
				}
			}
		}
	}
}
	
//Clear old files
try {
	fs.truncateSync("C:\\Users\\ethan\\source\\repos\\KijijiScraper\\KijijiScraper\\KijijiSearch.csv")
	fs.truncateSync("C:\\Users\\ethan\\source\\repos\\KijijiScraper\\KijijiScraper\\KijijiSearch.html")
} catch(err) {
  console.error(err)
}

const stream = fs.createWriteStream("C:\\Users\\ethan\\source\\repos\\KijijiScraper\\KijijiScraper\\KijijiSearch.csv", { flags: 'a' });
const HTMLstream = fs.createWriteStream("C:\\Users\\ethan\\source\\repos\\KijijiScraper\\KijijiScraper\\KijijiSearch.html", { flags: 'a' });

//Set up for new files
HTMLstream.write(`<!DOCTYPE html>
<html>
<head>
<title>Kijiji Results</title>
<style>
table {
  border-spacing: 0;
  width: 100%;
  border: 1px solid #ddd;
}

th {
  cursor: pointer;
}

th, td {
  text-align: left;
  padding: 10px;
}

tr:nth-child(even) {
  background-color: #f2f2f2
}
</style>
</head>
<body>
<script>
function sortTable(tableID, n) {
	var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;

	table = document.getElementById(tableID);
	switching = true;
	dir = "asc";
	while (switching) {
		switching = false;
		rows = table.rows;
		for (i = 1; i < (rows.length - 1); i++) {
			shouldSwitch = false;
			x = rows[i].getElementsByTagName("TD")[n];
			y = rows[i + 1].getElementsByTagName("TD")[n];
					var cmpX=isNaN(parseInt(x.innerHTML))?x.innerText.toLowerCase():parseInt(x.innerHTML);
					var cmpY=isNaN(parseInt(y.innerHTML))?y.innerText.toLowerCase():parseInt(y.innerHTML);
	cmpX=(cmpX=='-')?0:cmpX;
	cmpY=(cmpY=='-')?0:cmpY;
			if (dir == "asc") {
				if (cmpX > cmpY) {
					shouldSwitch= true;
					break;
				}
			} else if (dir == "desc") {
				if (cmpX < cmpY) {
					shouldSwitch= true;
					break;
				}
			}
		}
		if (shouldSwitch) {
			rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
			switching = true;
			switchcount ++;      
		} else {
			if (switchcount == 0 && dir == "asc") {
				dir = "desc";
				switching = true;
			}
		}
	}
}
function deleteRow(btn) {
  var row = btn.parentNode.parentNode;
  row.parentNode.removeChild(row);
}
</script>
<table id="myTable">
  <tr>
   	<th>Del</th>
    <th onclick="sortTable('myTable', 1)">Price</th>
    <th onclick="sortTable('myTable', 2)">Description</th>
	<th onclick="sortTable('myTable', 3)">City</th>
  </tr>

`)

stream.write("BUY THIS:");



RunSearches(searches, showOutput)




//====================================================================================


function showOutput(ShownAds)
{	
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
	
	
	
	//Display Output
	urlList = " --new-window "
	for (let i = 0; i < ShownAds.length; ++i) {
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
		console.log(ShownAds[i].attributes.price + '\t' + ShownAds[i].title)
		
		var CityPostalCode = ShownAds[i].attributes.location.replace(/ON, Canada,/g, 'ON,')
		var Index = CityPostalCode.indexOf(", ON")
		var PostalCode = CityPostalCode.substr(Index + 5).replace(/ /g, "").substr(0,6) 
		var pre = ShownAds[i].attributes.location.substring(0,Index)
		var x = 0
		while(pre.indexOf(", ") != -1 & x <= 5){
			pre = pre.substr(pre.indexOf(", ") + 2)
			x++
		}
		
		var apiLocation = ShownAds[i].attributes.location.replace(/ /g, "%2C").replace(/,/g, "")
		var mapsURL = "https://www.google.com/maps/dir/?api=1&origin=" + apiStartLocation + "&destination=" + apiLocation
		
		stream.write('\n"' + ShownAds[i].attributes.price + '","' + ShownAds[i].title + '"');
		stream.write(',"' + ShownAds[i].url + '"');
		stream.write(',"' + ShownAds[i].attributes.location + '"');
		stream.write(',"' + ShownAds[i].description.replace("...", "") + '"');
		stream.write(',"' + ShownAds[i].date + '"');
		
		HTMLstream.write('\n<tr>\n\t<td><input type="button" value="X" onclick="deleteRow(this)"/></td>')
		HTMLstream.write('\n\t<td>' + ShownAds[i].attributes.price + '</td>')
		HTMLstream.write("\n\t<td><a href=" + LinkPlatform + ShownAds[i].url + ">" + ShownAds[i].title + "</a><br>")
		HTMLstream.write(ShownAds[i].description + "</pre></td>")
		HTMLstream.write('\n\t<td><a style="color:black; text-decoration:none" href=' + mapsURL + ">"+ pre + ", ON " + PostalCode + '</a></td>\n</tr>')
	}
	//console.log("\n" + urlList.trim() + "\n")
	if(!(ShownAds.length)){
		console.log("Didn't find any ads.")
	}
	stream.close(() => {
		if (openSpreadsheet) {
			exec("start " + 'C:\\Users\\ethan\\source\\repos\\KijijiScraper\\KijijiScraper\\KijijiSearch.csv');
		}
	});
	HTMLstream.write("\n</table></body></html>");
	
	HTMLstream.close(() => {
		exec("start " + 'C:\\Users\\ethan\\source\\repos\\KijijiScraper\\KijijiScraper\\KijijiSearch.html');
	});
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

						kijiji.search(params, options).then(ads => {
							console.log("Results += " + ads.length)
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
								//Duplicates
								for (let j = 0; j < ShownAds.length; ++j) {
									if (ShownAds[j].url == ads[i].url | (ShownAds[j].title == ads[i].title & ShownAds[j].description == ads[i].description)) {
										continue AdLoop
									}
								}

								CriteriaLoop:
								for (ci = 0; ci < searches[si].criteria.length; ++ci)
								{
									if (searches[si].criteria[ci].MaxPrice < ads[i].attributes.price & !priceIrrelivent) {
										continue CriteriaLoop
									}
									
									var AND_CriteriaMet = 1
									var OR_CriteriaMet = 0
									var NOR_CriteriaMet = 1
									var OR_tagMet = 0
									
									TagLoop:
									for (let j = 0; j < searches[si].criteria[ci].tags.length; ++j) {
										for (let k = 0; k < mytags_OR.length; ++k){
											if(searches[si].criteria[ci].tags[j].toLowerCase() == mytags_OR[k].toLowerCase() | mytags_OR[k] == ""){
												OR_tagMet = 1
												break TagLoop
											}
										}
									}
									if (!(OR_tagMet)){
										continue CriteriaLoop 
									}
									for (let k = 0; k < mytags_AND.length; ++k){
										var AND_tagMet = 0
										for (let j = 0; j < searches[si].criteria[ci].tags.length; ++j) {
											if(searches[si].criteria[ci].tags[j].toLowerCase() == mytags_AND[k].toLowerCase() | mytags_AND[k] == "") {
												AND_tagMet = 1
												break
											}
										}
										if (!AND_tagMet){
											continue CriteriaLoop
										}
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

