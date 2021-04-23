/*
To run, 

1. Ensure you have node.js installed, and the fs and kijiji-scraper packages
2. Open powershell and type:
	node C:\path-to-script\app.js
	
	(ex. node C:\Users\$env:username\source\repos\KijijiScraper\KijijiScraper\app.js)
*/

const kijiji = require("kijiji-scraper");
const fs = require('fs');
const util = require('util');
const { exec } = require('child_process');
const path = require('path');


//==============================================

//Any searches in the json file containing these tags will be ran.
var mytags_AND = ["PSU"]
var mytags_OR = [""]

//VARIABLE SETUP

//json file used:
let rawdata = fs.readFileSync(path.resolve(__dirname, 'Searches.json'));

//Set to empty array to remove city constraint
//Cities:		"Burlington", "Hamilton", "Milton", "Oakville", "Mississauga", "Brampton", "Etobicoke", "Vaughan", "Woodbridge", "Toronto", "York", "Scarboruogh", "Markham", "Richmond Hill"
var cities = [ "Ancaster", "Hamilton", "Burlington", "Dundas", "Milton", "Oakville", "Mississauga", "Brampton", "Etobicoke", "Vaughan", "Maple", "Woodbridge", "Toronto", "York", "Scarborough", "Markham", "Thornhill", "Richmond Hill" ]

//If set to 1, returns all items matching search criteria, up until 2.5x the price from the json.
var priceIrrelevant = 0

//Open all results in a seperate tab in the web browser
var openInBrowser = 0

//When OpenInBrowser is set to 1, which browser is used?
var browserToOpen = "chrome" //alternatives: msedge, Firefox

//In the HTML file, prefix all url's with microsoft-edge: so that they open in edge
var msedgeLinks = 0

//What to filter on. Set to title, shortDescription, longDescription 
var filter = 'longDescription'

//Open the CSV file at program end (depreciated)
var openSpreadsheet = 0

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
var noFiltering = 0

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
			
		}
	}
	if(block_MaxPrices.length !== 0){
		var maxSearchPrice = 0;
		for(let j = 0; j < block_MaxPrices.length; j++){
			if (block_MaxPrices[j] > maxSearchPrice){
				maxSearchPrice = block_MaxPrices[j];
			}
		}
		if(priceIrrelevant) { 
			maxSearchPrice *= 2.5
		}
		
		importedSearches[i].MaxPrice = maxSearchPrice
		searches.push(importedSearches[i])
	}
}
	
//Clear old files
try {
	fs.truncateSync(path.resolve(__dirname, 'KijijiSearch.csv'))
	fs.truncateSync(path.resolve(__dirname, 'KijijiSearch.html'))
} catch(err) {
  console.error(err)
}

const stream = fs.createWriteStream(path.resolve(__dirname, 'KijijiSearch.csv'), { flags: 'a' });
const HTMLstream = fs.createWriteStream(path.resolve(__dirname, 'KijijiSearch.html'), { flags: 'a' });

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
<link href="http://www.w3schools.com/lib/w3.css" rel="stylesheet"/>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
<style>
img {
  display: block;
  margin-left: auto;
  margin-right: auto;
}
</style>
<table id="myTable">
  <tr>
   	<th>Del</th>
	<th>Image</th>
    <th onclick="sortTable('myTable', 2)">Price</th>
    <th onclick="sortTable('myTable', 3)">Description</th>
	<th onclick="sortTable('myTable', 4)">City</th>
  </tr>

`)


var endScript = `<script>
var sliderObjects = [];
createSliderObjects();

function plusDivs(obj, n) {
  var parentDiv = $(obj).parent();
  var matchedDiv;
  $.each(sliderObjects, function(i, item) {
    if ($(parentDiv[0]).attr('id') == $(item).attr('id')) {
      matchedDiv = item;
      return false;
    }
  });
  matchedDiv.slideIndex=matchedDiv.slideIndex+n;
  showDivs(matchedDiv, matchedDiv.slideIndex);
}

function createSliderObjects() {
  var sliderDivs = $('.slider');
  $.each(sliderDivs, function(i, item) {
    var obj = {};
    obj.id = $(item).attr('id');
    obj.divContent = item;
    obj.slideIndex = 1;
    obj.slideContents = $(item).find('.mySlides');
    showDivs(obj, 1);
    sliderObjects.push(obj);
  });
}

function showDivs(divObject, n) {
  debugger;
  var i;
  if (n > divObject.slideContents.length) {
    divObject.slideIndex = 1
  }
  if (n < 1) {
    divObject.slideIndex = divObject.slideContents.length
  }
  for (i = 0; i < divObject.slideContents.length; i++) {
    divObject.slideContents[i].style.display = "none";
  }
  divObject.slideContents[divObject.slideIndex - 1].style.display = "block";
}
</script>
`

stream.write("BUY THIS:");
console.log("Performing the following searches:\n\n")
console.log(searches)
RunSearches(searches, descSort)




//====================================================================================


function showOutput(ShownAds)
{	
		if(!(ShownAds.length)){
		console.log("Didn't find any ads.")
	}
	
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
		console.log(ShownAds[i].attributes.price + '\t' + ShownAds[i].title.replace("\n", "").replace("\r", ""))
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
		
		//Generate CSV
		stream.write('\n"' + ShownAds[i].attributes.price + '","' + ShownAds[i].title + '"');
		stream.write(',"' + ShownAds[i].url + '"');
		stream.write(',"' + ShownAds[i].attributes.location + '"');
		stream.write(',"' + ShownAds[i].fullDescription.replace("...", "") + '"');
		stream.write(',"' + ShownAds[i].date + '"');
		
		
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
		HTMLstream.write('\n\t<td><a style="color:black; text-decoration:none" href=' + mapsURL + '" target="_blank" rel="noopener noreferrer">' + pre + ", ON " + PostalCode + '</a></td>\n</tr>')
	}
	//console.log("\n" + urlList.trim() + "\n")
	
	//Open the HTML or CSV file
	stream.close(() => {
		if (openSpreadsheet) {
			exec("start " + path.resolve(__dirname, 'KijijiSearch.csv'));
		}
	});
	HTMLstream.write("\n</table></body>\n" + endScript + '\n</html>');
	
	HTMLstream.close(() => {
		exec("start " + path.resolve(__dirname, 'KijijiSearch.html'));
	});
	console.log("");
}

//====================================================================================

function RunSearches(searches, callback){  
	var ShownAds = [];
	var numSearches = 0
	var searchesDone = 0
	var AdsScanned = 0
	var evaluatedAds = [];
	
	
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
						
						
						
						
						//Search
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
									//Duplicates
									for (let j = 0; j < evaluatedAds.length; ++j) {
										if (evaluatedAds[j].url == ads[i].url || (evaluatedAds[j].title == ads[i].title & evaluatedAds[j].description == ads[i].description) || (evaluatedAds[j].title == ads[i].title & evaluatedAds[j].attributes.location == ads[i].attributes.location)){
											continue AdLoop;
										}
									}
									evaluatedAds.push(ads[i]);
							
									var loc = ads[i].attributes.location

									City_CriteriaMet = 0
									for (let j = 0; j < cities.length; ++j) { //For cities searched for
										if (loc.includes(cities[j])) {
											City_CriteriaMet = 1
										}
									}
									if (!City_CriteriaMet && cities.length != 0){
										continue AdLoop;
									}

									
									CriteriaLoop: //For all criteria blocks in the json file
									for (ci = 0; ci < searches[si].criteria.length; ++ci)
									{
										//Price is too large, or undefined.
										if ((searches[si].criteria[ci].MaxPrice < ads[i].attributes.price & !priceIrrelevant) || ads[i].attributes.price == undefined) {
											continue CriteriaLoop
										}
										
										//Or_tag
										var OR_tagMet = 0
										TagLoop:
										for (let j = 0; j < searches[si].criteria[ci].tags.length; ++j) { //For all tags in json
											for (let k = 0; k < mytags_OR.length; ++k){ //For all tags searched for
												if(searches[si].criteria[ci].tags[j].toLowerCase() == mytags_OR[k].toLowerCase() | mytags_OR[k] == ""){
													OR_tagMet = 1
													break TagLoop
												}
											}
										}
										if (!(OR_tagMet)){
											continue CriteriaLoop //Or_tag criteria not met
										}
										
										//And_tag
										for (let k = 0; k < mytags_AND.length; ++k){ //For all tags searched for
											var AND_tagMet = 0;
											for (let j = 0; j < searches[si].criteria[ci].tags.length && mytags_AND[k] != ""; ++j) { //For all tags in search criteria
												if(searches[si].criteria[ci].tags[j].toLowerCase() == mytags_AND[k].toLowerCase()) { 
													AND_tagMet = 1;
												}
											}
											if(!(AND_tagMet)){
												continue CriteriaLoop
											}
										}
										
										//NOR with title and/or shortDescription
										var adContent = ads[i].title
										if(filter != "title"){
											adContent += ads[i].description
										}
										adContent = adContent.toLowerCase()
											
										for (let k = 0; k < searches[si].criteria[ci].Contains_NOR.length; ++k){ //For all tags searched for											
											if (adContent.includes(searches[si].criteria[ci].Contains_NOR[k].toLowerCase())) { //NOR Criteria not met
												continue CriteriaLoop
											}
										}
										
										ads[i].criteriaBlock = searches[si].criteria[ci]
										ShownAds.push(ads[i]);
										continue AdLoop
									}
								}
								else { //noFiltering
									ShownAds.push(ads[i]);
								}
							}
							searchesDone++
							if (searchesDone == numSearches) {
								console.log("Ads scanned:\t" + AdsScanned)
								console.log("Filter 1:\t" + ShownAds.length)
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

//Stage 2: Sort by description. Also, append full description to ad.
function descSort(ads2, callback){
	//Get Full Description
	ShownAds2 = [];
	numFinished = 0;
	
	
	
	if(filter == 'shortDescription' || filter == 'title'){
		filterLoop:
		for(let ci = 0; ci < ads2.length; ci++){
			var adText = ads2[ci].title
			if(filter == 'shortDescription'){
				adText += ads2[ci].description;
			}
			adText = adText.toLowerCase()
			var OR_CriteriaMet = 0
			for (let j = 0; j < ads2[ci].criteriaBlock.Contains_OR.length; ++j) {
				if ((adText.includes(ads2[ci].criteriaBlock.Contains_OR[j].toLowerCase()))) { //OR criteria met
					OR_CriteriaMet = 1
					break
				}
			}
			if(!OR_CriteriaMet){ //OR criteria not met
				ads2.splice(ci, 1);
				ci--
				continue filterLoop
			}
			//And Criteria
			for (let j = 0; j < ads2[ci].criteriaBlock.Contains_AND.length; ++j) {
				if (!(adText.includes(ads2[ci].criteriaBlock.Contains_AND[j].toLowerCase()))) { //AND criteria not met
					ads2.splice(ci, 1);
					ci--
					continue filterLoop
				}
			}
			//Nor criteria
			for (let j = 0; j < ads2[ci].criteriaBlock.Contains_NOR.length; ++j) {
				if ((adText.includes(ads2[ci].criteriaBlock.Contains_NOR[j].toLowerCase()))) { //NOR Criteria not met
					ads2.splice(ci, 1);
					ci--
					console.log("This should never trigger")
					continue filterLoop
				}
			}
		}
	}
	
	
	for(let ci = 0; ci < ads2.length; ci++){ //For all ads at stage 2:
		kijiji.Ad.Get(ads2[ci].url).then(ad => {
			ads2[ci].fullDescription = ad.description //Change description
			
			if(filter == 'longDescription'){
				var adText = (ads2[ci].title + ads2[ci].fullDescription).toLowerCase();
				
				//OR criteria
				var OR_CriteriaMet = 0
				for (let j = 0; j < ads2[ci].criteriaBlock.Contains_OR.length; ++j) {
					if ((adText.includes(ads2[ci].criteriaBlock.Contains_OR[j].toLowerCase()))) { //OR criteria met
						OR_CriteriaMet = 1
						break
					}
				}
				//And Criteria
				var AND_CriteriaMet = 1
				for (let j = 0; j < ads2[ci].criteriaBlock.Contains_AND.length; ++j) {
					if (!(adText.includes(ads2[ci].criteriaBlock.Contains_AND[j].toLowerCase()))) { //AND criteria not met
						AND_CriteriaMet = 0
						break
					}
				}
				//Nor criteria
				var NOR_CriteriaMet = 1
				for (let j = 0; j < ads2[ci].criteriaBlock.Contains_NOR.length; ++j) {
					if ((adText.includes(ads2[ci].criteriaBlock.Contains_NOR[j].toLowerCase()))) { //NOR Criteria not met
						NOR_CriteriaMet = 0;
						break
					}
				}
				if(OR_CriteriaMet && AND_CriteriaMet && NOR_CriteriaMet){
					ShownAds2.push(ads2[ci]);
				}
			}
			else{
				ShownAds2.push(ads2[ci]);
			}
			
			numFinished++;
			if (numFinished == ads2.length){
				console.log("Filter 2:\t" + ShownAds2.length + "\n")
				callback(ShownAds2)
			}
		}).catch(console.error);
	}
}

