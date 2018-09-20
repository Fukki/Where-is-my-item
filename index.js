const request = require('request-promise-native');
const path = require("path");
const fs = require("fs");
module.exports = function WhereIsMyItem(mod) {
	const cmd = mod.command || mod.require.command;
	let gameId, serverId, playerId;
	let playerData = {}, itemData = {}, configFile = {};
	let enable, region, consol, operat;
	let itemUpdate = false, dataLoaded = false, getInv = false;
	loadConfig();
	try {
		itemData = require('./data/itemData.json');
	} catch(e) { 
		itemData = {}
	}
	
	cmd.add(operat, (...arg) => {
		let op = ''; for (n in arg) op = (n > 0 ? op+' '+arg[n]:arg[n]);
		Search(op);
	});
	
	mod.hook("S_LOGIN", 10, (e) => {
		({gameId, serverId, playerId} = e);
		itemUpdate = false;
		if (!dataLoaded) {
			try {
				playerData = require('./data/'+serverId+'.json');
			} catch(e) { 
				playerData = {}
			}
			dataLoaded = true;
		}
		if (playerData[playerId]) delete playerData[playerId];
		playerData[playerId] = {owner: e.name}
	});
	
	mod.hook("S_RETURN_TO_LOBBY", 'raw', () => {
		if (enable) {
			saveData(serverId, playerData);
			if (itemUpdate) saveData('itemData', itemData);
		}
	});
	
	mod.hook('S_INVEN', 16, (e) => {
		if (enable && !getInv) {
			getInv = true;
			let itemInv = e.items, d;
			for (i = 0; i < itemInv.length; i++) {
				d = itemInv[i].id;
				if (!itemData[d] ||
					itemData[d] === '' ||
					itemData[d].region != region) {
					getData(d);
				}
				playerData[playerId][d] = {
						name: (!itemData[d] ? '(no-data)' : itemData[d].name),
						amount: itemInv[i].amount
				}
			}
			getInv = false;
		}
	});
	
	function Search(s) {
		if (!s || s === '') return;
		let o, c = 0, b = false;
		let l = '-------------------------';
		let d = s.match(/#(\d*)@/);
		d = d ? Number(d[1]) : 0;
		for (k in playerData) {
			if (d > 0 || Number(s) > 0) {
				o = (d > 0 ? playerData[k][d] : playerData[k][s]);
				if (o) {
					if (c === 0 && !b) msg(l); c++; b = true;
					msg('['+c+']: '+o.name+' - ('+o.amount+')');
				}
			} else {
				for (d in playerData[k]) {
					o = playerData[k][d];
					if (o.name && o.name.toLowerCase().search(s.toLowerCase()) >= 0) {
						if (c === 0 && !b) msg(l); c++; b = true;
						msg('['+c+']: '+o.name+' - ('+o.amount+')');
					}
				}
			}
			if (c > 0) {
				msg('Owner: ' + playerData[k].owner);
				msg(l);
			}
			c = 0;
		}
		if (!b) {
			msg('Connot found: ' + s);
		}
	}
	
	function msg(s) {
		cmd.message(s);
		if (consol) console.log(s);
	}
	
	function saveData(s,d) {
		fs.writeFileSync(path.join(__dirname, 'data\\'+s+'.json'), JSON.stringify(d, null, 2));
	}

	function saveConfig() {
		configFile.region = getRegion(configFile.region);
		fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(configFile, null, 2));
	}
	
	function loadConfig() {
		try {
			configFile = require('./config.json'); }
		catch(e) { 
			configFile = {
				enable: true,
				region: getRegion(mod.region),
				operator: ['forgot', 'where', 'item'],
				console: false
			}
			saveConfig();
		}
		enable = configFile.enable;
		region = configFile.region;
		operat = configFile.operator;
		consol = configFile.console;
	}
	
	function getRegion(d) {
		switch (d) {
			case 'us':
			case 'en':
			case 'ru':
			case 'de':
			case 'fr':
			case 'jp':
			case 'kr':
				return d;
			break;
			default:
				return 'us';
			break;
		}
	}
	
	async function getData(d) {
		try {
			const a = await request('https://teralore.com/'+region+'/item/'+d).then((h) => {
				h = h.match(/data-basename="(.*?)"/);
				if (h) {
					h = h[1].replace('&#39;s',"'s");
					if (h === '') h = '(no-name)';
					itemData[d] = {
						name: h,
						region, region
					}
					itemUpdate = true;
				}
			});
		} catch (e) {
		}
	}
}