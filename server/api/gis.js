const express = require('express');

const router = express.Router();

const queries = require('../db/queries');

router.get('/', (req, res) => {
  queries.getAll()
    .then(r => {
      res.json(r);
    });
});

router.get('/getCountOfLakes', (req, res) => {
    queries.getCountOfLakes()
        .then(r => {
            res.json(r);
        });
});

router.get('/getLakesInRegion', (req, res) => {
  queries.getLakesInRegion(req.query)
    .then(result => {
        let finalPolygons = [];
        let finalMarkers = [];
        result.forEach(r => {
            let geo = JSON.parse(r.geo);
            finalPolygons.push({
                type: "Feature",
                properties: {},
                geometry: {
                    type: geo.type,
                    coordinates: geo.coordinates
                }
            });
            let centroid = JSON.parse(r.centroid);
            finalMarkers.push({
                type: "Feature",
                poperties: {
                    name: r.name
                },
                geometry: {
                    type: centroid.type,
                    coordinates: centroid.coordinates
                }
            })
        });
        res.json({
            polygons: {
                type: "FeatureCollection",
                features: finalPolygons
            },
            markers: {
                type: "FeatureCollection",
                features: finalMarkers
            }
        });
    })
});

router.get('/getCentroid', (req, res) => {
    console.log(new Date());
    queries.getCentroid(req.query)
        .then(result => {
            console.log(new Date());
            let final = [];
            result.rows.forEach(r => {
                let geo = JSON.parse(r.geo);
                let finalGeo = {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: geo.type,
                        coordinates: geo.coordinates
                    }
                };
                final.push(finalGeo);
            });
            res.json({
                type: "FeatureCollection",
                features: final
            });
        })
});

router.get('/getRegion', (req, res) => {
    queries.getRegion(req.query)
        .then(result => {
            let final = [];
            result.rows.forEach(r => {
                let geo = JSON.parse(r.geo);
                let finalGeo = {
                    type: "Feature",
                    properties: {
                        name: r.name
                    },
                    geometry: {
                        type: geo.type,
                        coordinates: geo.coordinates
                    }
                };
                final.push(finalGeo);
            });
            res.json({
                type: "FeatureCollection",
                features: final
            });
        })
});

router.get('/getRegions', (req, res) => {
    queries.getRegions()
        .then(result => {
            let final = [];
            result.forEach(r => {
                let geo = JSON.parse(r.geo);
                let finalGeo = {
                    type: "Feature",
                    properties: {
                        name: r.name
                    },
                    geometry: {
                        type: geo.type,
                        coordinates: geo.coordinates
                    }
                };
                final.push(finalGeo);
            });
            res.json({
                type: "FeatureCollection",
                features: final
            });
        });
});

router.get('/getNearestServices', (req, res) => {
    queries.getNearestServices(req.query)
        .then(result => {
            let finalArr = result.map(r => {
                return {
                    dst: r.dst,
                    name: r.name,
                    type: r.type,
                    centroid: JSON.parse(r.centroid).coordinates
                }
            });

            res.json({result: finalArr});
        });
});

module.exports = router;