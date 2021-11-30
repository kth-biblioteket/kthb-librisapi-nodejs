require('dotenv').config()
const axios = require("axios");

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const grant_type = process.env.GRANT_TYPE
const AUTH_URL = process.env.AUTH_URL
const API_URL = process.env.API_URL;

const getToken = () => axios({
    method: "POST",
    url: AUTH_URL + `?client_id=` + client_id + `&client_secret=` + client_secret + `&grant_type=` + grant_type,
    headers: {
        "content-type": "application/x-www-form-urlencoded",
    },
    params: {
        x: 's'
    }
})

const getEtag = (id) => {
    return axios({
        method: "GET",
        url: API_URL + id,
        headers: {
            "content-type": "application/json",
            "Accept": "application/ld+json"
        },
        params: {
            x: 's'
        }
    })
}

/**
 * 
 * @param {*} bibid 
 * @returns 
 */
const getHolding = async (bibid) => {
    return axios({
        method: "GET",
        url: bibid + "?embellished=false",
        headers: {
            "content-type": "application/json",
            "Accept": "application/ld+json"
        }
    })
}

/**
 * Funktion som skapar en beståndspost
 * utifrån ett jsondl-objekt
 * 
 * Exempel
 * {"@graph":[{"@id":"https://id.kb.se/TEMPID","@type":"Record","mainEntity":{"@id":"https://id.kb.se/TEMPID#it"}},{"@id":"https://id.kb.se/TEMPID#it","@type":"Person","familyName":"Testing"}]}
 * 
 * @param {*} body 
 * @returns 
 */
 const createHolding = async(body) => {
    const token = await getToken()
    return axios({
        method: "POST",
        url: API_URL,
        headers: {
            "content-type": "application/ld+json",
            "XL-Active-Sigel": body.sigel,
            "Authorization": "Bearer " + token.data.access_token
        },
        data: body.json_ld
    })
}

/**
 * Funktion för att uppdatera holdings i Libris
 * 
 * @param {*} body
 * bibid: "https://libris-qa.kb.se/katalogisering/jnvptsdp5ck5w1b"
 * libris_marc_852:
     {
		"8":"",
		"b":"T",
		"c":"",
		"h":"510.06 ",
		"j":"Physics",
		"l":"",
		"t":"",
		"i":""
	}
 * @returns 
 */
const updateHolding = async (body) => {
    const holding = await getHolding(body.bibid)
    const token = await getToken()
    let etag = holding.headers.etag
    let json_ld = holding.data
    let json_marc_852 = body.libris_marc_852;

    if (json_ld['@graph'][1].hasComponent) {
        for (let k = 0; k < json_ld['@graph'][1].hasComponent.length; k++) {
            //852 #8 LÄNK- OCH SEKVENSNUMMER
            if (json_ld['@graph'][1]["marc:groupid"] && json_marc_852['8'] != '') {
                json_ld['@graph'][1]["marc:groupid"] = json_marc_852['8']
            }

            //852 #b SIGEL
            lastslash = json_ld['@graph'][1].heldBy['@id'].lastIndexOf("/")
            json_ld['@graph'][1].heldBy['@id'] = json_ld['@graph'][1].heldBy['@id'].substring(0,lastslash + 1) + json_marc_852.b

            //852 #c SAMLING
            if (json_ld['@graph'][1].hasComponent[k].physicalLocation && json_marc_852.c != '') {
                json_ld['@graph'][1].hasComponent[k].physicalLocation = json_marc_852.c
            }

            //852 #h HYLLKOD
            if (json_ld['@graph'][1].hasComponent[k].shelfMark && json_marc_852.h != '') {
                json_ld['@graph'][1].hasComponent[k].shelfMark = json_marc_852.h;                    
            }

            //852 #j LÖPNUMMER
            if (json_ld['@graph'][1].hasComponent[k].shelfControlNumber && json_marc_852.j != '') {
                json_ld['@graph'][1].hasComponent[k].shelfControlNumber = json_marc_852.j;
            }

            //852 #l UPPSTÄLLNINGSORD
            if (json_ld['@graph'][1].hasComponent[k].shelfLabel && json_marc_852.l != '') {
                json_ld['@graph'][1].hasComponent[k].shelfLabel = json_marc_852.l;
            }
            
            //852 #t EXEMPLARNUMMER
            if (json_ld['@graph'][1].hasComponent[k].copyNumber && json_marc_852.t != '') {
                json_ld['@graph'][1].hasComponent[k].copyNumber = json_marc_852.t;
            }
            
            //852 #i EXEMPLARSTATUS
            if (json_ld['@graph'][1].hasComponent[k].availability && json_marc_852.i != '') {
                json_ld['@graph'][1].hasComponent[k].availability = json_marc_852.i;
            }
        }
    } else {
        //Eller poster med endast ett item per holding.
        //852 #8 LÄNK- OCH SEKVENSNUMMER
        if (json_marc_852['8'] != '') {
            json_ld['@graph'][1]["marc:groupid"] = json_marc_852['8']
        }

        //852 #b SIGEL
        lastslash = json_ld['@graph'][1].heldBy['@id'].lastIndexOf("/")
        json_ld['@graph'][1].heldBy['@id'] = json_ld['@graph'][1].heldBy['@id'].substring(0,lastslash + 1) + json_marc_852.b

        //852 #c SAMLING
        if (json_marc_852.c != '') {
            json_ld['@graph'][1].physicalLocation = json_marc_852.c
        }

        //852 #h HYLLKOD
        if (json_marc_852.h != '') {
            json_ld['@graph'][1].shelfMark = json_marc_852.h;                    
        }

        //852 #j LÖPNUMMER
        if (json_marc_852.j != '') {
            json_ld['@graph'][1].shelfControlNumber = json_marc_852.j;
        }

        //852 #l UPPSTÄLLNINGSORD
        if (json_marc_852.l != '') {
            json_ld['@graph'][1].shelfLabel = json_marc_852.l;
        }
        
        //852 #t EXEMPLARNUMMER
        if (json_marc_852.t != '') {
            json_ld['@graph'][1].copyNumber = json_marc_852.t;
        }
        
        //852 #i EXEMPLARSTATUS
        if (json_marc_852.i != '') {
            json_ld['@graph'][1].availability = json_marc_852.i;
        }
    }

    return axios({
        method: "PUT",
        url: body.bibid,
        headers: {
            "content-type": "application/ld+json",
            "XL-Active-Sigel": json_marc_852.b,
            "If-Match": etag,
            "Authorization": "Bearer " + token.data.access_token
        },
        data: json_ld
    })
}

/**
 * Funktion som tar bort en beståndspost
 * utifrån bibid
 * 
 * @param {*} body 
 * @returns 
 */
const deleteHolding = async(body) => {
    const token = await getToken()
    return axios({
        method: "DELETE",
        url: body.bibid,
        headers: {
            "content-type": "application/ld+json",
            "XL-Active-Sigel": "T",
            "Authorization": "Bearer " + token
        }
    })
}

exports.getToken = getToken;

exports.getEtag = getEtag;

exports.getHolding = getHolding;

exports.createHolding = createHolding;

exports.updateHolding = updateHolding;

exports.deleteHolding = deleteHolding;

