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
const config = require('./config');
//==============================================

//Reverse Search Structure:
//For each part, have specific and a general
// If not specific, put in general.
// After "collecting" a part, get rid of description including that part.

var apiStartLocation = config.startLocation.replace(/ /g, "%2C").replace(/,/g, "")
var LinkPlatform = ""
const url = 'https://www.kijiji.ca/v-computer-components/city-of-toronto/pc-case-fans-power-supply-and-i3-cpu/1601284596'
if (config.msEdgeLinks) {
	LinkPlatform = "microsoft-edge:";
}

RunSearches()


//====================================================================================
function RunSearches(){  
	var ShownAds = [];

	kijiji.Ad.Get(url).then(ad => { //For all ads at stage 2:		
		ShownAds.push(ad);
		showOutput(ShownAds)
	})
}

function showOutput(ShownAds){	
	if(!(ShownAds.length)){
		console.log("Didn't find any ads.")
	}
	else{
		try {
			fs.truncateSync(path.resolve(__dirname, 'KijijiSearchOne.html'))
		} catch(err) {
		  console.error(err)
		}
		const HTMLstream = fs.createWriteStream(path.resolve(__dirname, 'KijijiSearchOne.html'), { flags: 'a' });	


		 
		urlList = " --new-window "
		HTMLstream.write(fs.readFileSync(path.resolve(__dirname, 'HTMLstring1.txt'), "utf8"));
		console.log("\n\n#=================================================================================================")
		console.log("| BUY THIS")
		console.log("}-------------------------------------------------------------------------------------------------")
		console.log(util.inspect(ShownAds[0], false, null, true))

		
		for (let i = 0; i < ShownAds.length; ++i) { //For all shown ads
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
			
			console.log("| " + ShownAds[i].attributes.price + '\t: ' + ShownAds[i].title.replace("\n", "").replace("\r", ""))

			//Address Crap (Organized as "City, postal Code" for filtering)
			var locString = ShownAds[i].attributes.location.replace(/[A-Z]{2,3}, Canada,/g, 'ON,')
			locInfo = locString.match(/[, ]?((\w* )?(\w*)), [A-Z]{2,3} (\w\d\w[ ]?(\d\w\d)?)/);
			if (locInfo == undefined){
				for(let j = 0; j < cities.length; j++){
					if(ShownAds[i].attributes.location.includes(cities[j])){
						var displayLocation = cities[j]
					}
				}
			}else{
				var city = locInfo[1]
				var postalCode = locInfo[4]
				displayLocation = city + ", " + postalCode.replace(" ", "")
			}
			
			var apiLocation = ShownAds[i].attributes.location.replace(/ /g, "%2C").replace(/,/g, "")
			var mapsURL = "https://www.google.com/maps/dir/?api=1&origin=" + apiStartLocation + "&destination=" + apiLocation
			
			
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
			HTMLstream.write(ShownAds[i].description + '<br>\n</td>') //Description
			HTMLstream.write('\n\t<td><a style="color:black; text-decoration:none" href=' + mapsURL + '" target="_blank" rel="noopener noreferrer">' + displayLocation + '</a></td>\n</tr>')
		}
		console.log("}-------------------------------------------------------------------------------------------------")		
		//Open the HTML or CSV file
		
		let endScript = fs.readFileSync(path.resolve(__dirname, 'HTMLstring2.txt'), "utf8")
		HTMLstream.write("\n</table></body>\n" + endScript + '\n</html>');
		
		HTMLstream.close(() => {
			exec("start " + path.resolve(__dirname, 'KijijiSearchOne.html'));
		});
		console.log("");
	}
}

//====================================================================================



