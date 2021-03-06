var request = require('request');
var async = require('async');
var format = require('util').format;
var cheerio = require('cheerio');
var when = require('when');
var store = require('./dataStore');

var linkTemplate = 'http://www.transfermarkt.de/aktuell/waspassiertheute/aktuell/new/datum/%s';

module.exports = {
    run : function() {
        var deferred = when.defer();
        store.getMissingTeamData().then(function (data) {
            async.mapLimit(data, 5, function (dataPoint, next) {
                var url = format(linkTemplate, dataPoint.date);
	            var config = {
	            	url: url,
	            	headers: {
	            		'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36'
		            }
		        }

	            request(config, function (err, response, body) {
                    if (err) throw err;
                    var $ = cheerio.load(body);

                    var getPositionFor = function (id) {
                        return /\d+/.exec($('tbody tr a[id='+id+']').prev().text()) || /\d+/.exec($('tbody tr a[id='+id+']').next().text()) || [];
                    };

                    var positionHome = getPositionFor(dataPoint.home.transfermarkt_id)[0];
                    var positionAway = getPositionFor(dataPoint.away.transfermarkt_id)[0];

                    if (positionHome) {
                        dataPoint.home.position = positionHome;
                    };

                    if (positionAway) {
                        dataPoint.away.position = positionAway;
                    };

                    store.save(dataPoint).then(function () {
                        next(null);
                    });
                });
            }, function (err) {
                if (err) throw err;
                console.log('Finished getting team data!');
                deferred.resolve();
            });
        });
        return deferred.promise;
    }
};
