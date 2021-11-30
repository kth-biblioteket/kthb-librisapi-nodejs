require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const VerifyToken = require('./VerifyToken');
const libris = require('./libris')
const cors = require('cors');
const app = express();

const config = {}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var allowedOrigins = ['http://localhost:3000',
	'http://localhost:4200',
	'http://localhost:4201',
	'https://apps.lib.kth.se'];
app.use(cors({
	origin: allowedOrigins,
	exposedHeaders: ['Authorization'],
	methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH']
}));

async function deletebyholding(holdinguri, res, req) {
	if (holdinguri.data.totalItems > 0) {
		//gå igenom items och hitta "@type": "Instance"
		for (let i = 0; i < holdinguri.data.items.length; i++) {
			if (holdinguri.data.items[i]["@type"] == "Instance") {
				if (typeof holdinguri.data.items[i]['@reverse'] !== 'undefined') {
					//Endast de som är KTH-innehav(SIGEL)
					for (let j = 0; j < holdinguri.data.items[i]['@reverse'].itemOf.length; j++) {
						if (holdinguri.data.items[i]['@reverse'].itemOf[j].heldBy['@id'] == 'https://libris.kb.se/library/T'
							|| holdinguri.data.items[i]['@reverse'].itemOf[j].heldBy['@id'] == 'https://libris.kb.se/library/Te'
							|| holdinguri.data.items[i]['@reverse'].itemOf[j].heldBy['@id'] == 'https://libris.kb.se/library/Tct'
							|| holdinguri.data.items[i]['@reverse'].itemOf[j].heldBy['@id'] == 'https://libris.kb.se/library/Ta'
							|| holdinguri.data.items[i]['@reverse'].itemOf[j].heldBy['@id'] == 'https://libris.kb.se/library/Tdig') {
							try {
								console.log(holdinguri.data.items[i]['@reverse'].itemOf[j]['@id'])
								const etag = await libris.getEtag(holdinguri.data.items[i]['@reverse'].itemOf[j]['@id'])
								const deleteholding = await libris.deleteHolding(holdinguri.data.items[i]['@reverse'].itemOf[j]['@id'], etag.headers.etag, access_token)
								res.json({ "holding": "Deleted" });
								break;
							}
							catch (e) {
								//TODO Övriga fel?
								switch (e.response.status) {
									case 410:
										res.json({ "holding": "Resurs hittades inte, id: " + req.params.id });
										break;
									case 403:
										res.json({ "holding": "You don't have the permission to access the requested resource, id: " + req.params.id });
										break;
									default:
										res.json({ "holding": "Error deleting, id: " + req.params.id });
								}
								break;
							}
						}
					}
				} else {
					res.json({ "holding": "No reverse, id: " + req.params.id });
				}
				break;
			}
		}
	} else {
		res.json({ "holding": "Hittades inte, id: " + req.params.id });
	}
}

var apiRoutes = express.Router();

apiRoutes.get('/', function (req, res) {
	res.send('Hello! The API is at ' + req.headers.host + '/libris/api/v1');
});

/* Hämta Instans från bibid (035 i Alma)*/
apiRoutes.get("/librisinstance/:type/:bibid/", VerifyToken, async function (req, res, next) {
	
});

/**
 * Hämta Holdings från bibid
 * 
 * Body: 
 * 
 * bibid
 * 
 */
apiRoutes.get("/librisholding", async function (req, res, next) {
	try {
		librisholdings = await libris.getHolding(req.body.bibid);
		
		res.json(
			{
				"status": 204,
				"msg": "Holdings, id: " + req.body.bibid
			}
		);
	} catch (err) {
		switch (err.response.status) {
			case 410:
				res.json({
					"status": 410,
					"msg": "Resurs hittades inte, id: " + req.body.bibid
				});
				break;
			case 403:
				res.json({
					"status": 403,
					"msg": "Behörighet att hämta beståndet saknas, id: " + req.body.bibid
				});
				break;
			default:
				res.json({
					"status": 400,
					"msg": "Fel vid hämtning, id: " + req.body.bibid
				});
		}
	}
});

/**
 * Skapa bestånd i Libris
 * 
 * Body: 
 * 
 * sigel
 * json_ld
 * 
 */
apiRoutes.post("/librisholding", VerifyToken, async function (req, res) {
	try {
		librisholdings = await libris.createHolding(req.body);
		
		res.json(
			{
				"status": 204,
				"msg": "Holdings skapad, id: " + req.body.bibid
			}
		);
	} catch (err) {
		switch (err.response.status) {
			case 410:
				res.json({
					"status": 410,
					"msg": "Resurs hittades inte, id: " + req.body.bibid
				});
				break;
			case 403:
				res.json({
					"status": 403,
					"msg": "Behörighet att skapa beståndet saknas, id: " + req.body.bibid
				});
				break;
			default:
				res.json({
					"status": 400,
					"msg": "Fel vid skapande, id: " + req.body.bibid
				});
		}
	}
});

/**
 * Uppdatera bestånd i Libris
 * 
 * Body: 
 * 
 * bibid
 * jsonld
 *
 */

apiRoutes.put("/librisholding/", VerifyToken, async function (req, res) {
	try {
		librisholdings = await libris.updateHolding(req.body);
		
		res.json(
			{
				"status": 204,
				"msg": "Holdings uppdaterad, id: " + req.body.bibid
			}
		);
	} catch (err) {
		switch (err.response.status) {
			case 410:
				res.json({
					"status": 410,
					"msg": "Resurs hittades inte, id: " + req.body.bibid
				});
				break;
			case 403:
				res.json({
					"status": 403,
					"msg": "Behörighet att uppdatera beståndet saknas, id: " + req.body.bibid
				});
				break;
			default:
				res.json({
					"status": 400,
					"msg": "Fel vid uppdatering, id: " + req.body.bibid
				});
		}
	}

});

/**
 * Delete holding from bibid
 * 
 * Body: 
 * 
 * bibid
 *
 */

apiRoutes.delete("/librisholding/", VerifyToken, async function (req, res, next) {
	try {
		librisholdings = await libris.deleteHolding(req.body);
		
		res.json(
			{
				"status": 204,
				"msg": "Holdings uppdaterad, id: " + req.body.bibid
			}
		);
	} catch (err) {
		switch (err.response.status) {
			case 410:
				res.json({
					"status": 410,
					"msg": "Resurs hittades inte, id: " + req.body.bibid
				});
				break;
			case 403:
				res.json({
					"status": 403,
					"msg": "Behörighet att uppdatera beståndet saknas, id: " + req.body.bibid
				});
				break;
			default:
				res.json({
					"status": 400,
					"msg": "Fel vid uppdatering, id: " + req.body.bibid
				});
		}
	}
});

app.use('/libris/api/v1', apiRoutes);

var server = app.listen(process.env.PORT || 3002, function () {
	var port = server.address().port;
	console.log("App now running on port", port);
});