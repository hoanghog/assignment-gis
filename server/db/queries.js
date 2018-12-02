const knex = require('./db-connection');
const knexPostgis = require('knex-postgis');
const pg = require('pg');

const client = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'gis',
    port: 5432
});

client.connect();

const st = knexPostgis(knex);

module.exports = {
    getAll() {
        return knex('polygon').distinct('admin_level').select();
    },

    async getRegions() {
        return knex('polygon')
            .select('name', st.asGeoJSON('geo').as('geo'))
            .where({'admin_level': '4'});
    },

    async getLakesInRegion(params) {
        let lakeSubQ = knex('polygon')
            .avg(st.area('geo'))
            .whereIn('water', ['lake', 'pond', 'lake;pond', 'lagoon'])
            .toString();
        let lakeQ = knex('polygon')
            .select('geo', 'name', 'centroid')
            .whereIn('water', ['lake', 'pond', 'lake;pond', 'lagoon'])
            .andWhere(knex.raw(`st_area(geo) > (${lakeSubQ})`))
            .toString();
        let regionQ = knex('polygon')
            .select('geo')
            .where({'name': params.region}).toString();
        return knex('polygon')
            .with('lakes', knex.raw(lakeQ))
            .with('region', knex.raw(regionQ))
            .select(st.asGeoJSON('0.geo').as('geo'), '0.name as name', st.asGeoJSON('0.centroid').as('centroid'))
            .from(['lakes', 'region'])
            .where(st.intersects('1.geo', '0.geo'));
    },

    async getRegion(params) {
        let query = knex('polygon')
            .select('name', st.asGeoJSON('geo').as('geo'))
            .where(knex.raw(`unaccent(lower(name)) = unaccent(lower('${params.region}'))`))
            .toString();

        return await client.query(query);
    },

    async getCentroid(params) {
        let query = knex('polygon')
            .select(st.asGeoJSON('centroid').as('geo'))
            .where({'name': params.region})
            .toString();

        return await client.query(query);
    },

    async getCountOfLakes() {
        let regionQ = knex('polygon')
            .select('geo', 'name', 'osm_id')
            .where({'admin_level': '4'}).toString();
        let lakeSubQ = knex('polygon')
            .avg(st.area('geo'))
            .whereIn('water', ['lake', 'pond', 'lake;pond', 'lagoon'])
            .toString();
        let lakesQ = knex('polygon')
            .select('geo', 'osm_id')
            .whereIn('water', ['lake', 'pond', 'lake;pond', 'lagoon'])
            .andWhere(knex.raw(`st_area(geo) > (${lakeSubQ})`))
            .toString();
        return knex('polygon')
            .with('regions', knex.raw(regionQ))
            .with('lakes', knex.raw(lakesQ))
            .select('regions.name as name')
            .count('*')
            .from('regions')
            .leftJoin('lakes', function () {
                this.on(st.intersects('regions.geo', 'lakes.geo'))
            })
            .groupBy('regions.name');
    },

    async getNearestServices(params) {
        return knex('polygon')
            .select(st.distance(
                knex.raw(`st_transform(st_geomfromtext('POINT(${params.pointX} ${params.pointY})', 4326), 26986)`),
                knex.raw(`st_transform(geo, 26986)`)
            ).as('dst'), 'name', st.asGeoJSON('centroid').as('centroid'), 'amenity as type')
            .whereIn('amenity', ['ice_cream', 'cafe', 'toilets;showers;dresses room', 'waste_disposal', 'drinking_water', 'bbq', 'restaurant;bar', 'toilets', 'fuel', 'pub', 'bar', 'shower', 'restaurant', 'food_court', 'fast_food'])
            .orderBy('dst', 'asc')
            .limit(5)
            .offset(1);
    }
};