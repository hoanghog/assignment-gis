#Vytvorenie novych collumnov aby sa nemuselo vzdy prepocitavat
alter table point
add column centroid geometry;
					
alter table point
add column geo geometry;
					
update point
set geo = st_transform(way, 4326);
					
update point
set centroid = st_centroid(geo);

select geo
	from polygon
	where unaccent(lower(name)) = unaccent(lower('bratislavsky kraj'))

#Indexy
CREATE INDEX polygon_water ON public.polygon USING btree (water)
CREATE INDEX polygon_region_level ON public.polygon USING btree (admin_level)
CREATE INDEX spatial_polygon ON public.polygon USING gist (geo)
CREATE INDEX polygon_region_name_new ON public.polygon USING btree (name)
CREATE INDEX polygon_amenity ON public.polygon USING btree (amenity)
CREATE INDEX polygon_id ON public.polygon USING btree (osm_id)

#Insertovanie tabulky point do polygon
insert into polygon(geo, centroid, amenity)
select geo, centroid, amenity
from point
												 

#Zistovanie hodnot v stlpci
select distinct leisure
from point

#getRegions()
select name, st_asgeojson(geo) as geo
from polygon
where admin_level = '4'

#getLakesInRegion()
with lakes as (
	select geo, name, centroid
	from polygon
	where water in ('lake', 'pond', 'lake;pond', 'lagoon') and st_area(geo) > (
			select avg(st_area(geo))
			from polygon
			where water in ('lake', 'pond', 'lake;pond', 'lagoon')
		)
), region as (
	select geo
	from polygon
	where name = 'Bratislavsky Kraj'
)
select st_asgeojson(0.geo) as geo, 0.name as name, st_asgeojson(0.centroid) as centroid
from lakes as 0, region as 1
where st_intersects(1.geo, 0.geo)

#getRegion
select name, st_asgeojson(geo) as geo
from polygon
where name = 'Bratislavsky Kraj'

#getCentroid
select st_asgeojson(centroid) as geo
from polygon
where name = 'Bratislavsky Kraj'

#getCountOfLakes
with "regions" as (
	select "geo", "name", "osm_id" 
	from "polygon" 
	where "admin_level" = '4'
	), "lakes" as (
		select "geo", "osm_id" 
		from "polygon" 
		where "water" in ('lake', 'pond', 'lake;pond', 'lagoon') and st_area(geo) > (
			select avg(ST_area("geo")) 
			from "polygon" 
			where "water" in ('lake', 'pond', 'lake;pond', 'lagoon')
		)
	) 
	select "regions"."name" as "name", count(*) 
	from "regions" 
	left join "lakes" on ST_intersects("regions"."geo", "lakes"."geo") 
	group by "regions"."name"

#getNearest
select ST_Distance(
	st_transform(st_geomfromtext('POINT(19.2539900823717 48.3935773416933)', 4326), 26986), 
	st_transform(geo, 26986)) as "dst", "name", ST_asGeoJSON("centroid") as "centroid", "amenity" as "type" 
from "polygon" 
where "amenity" in ('ice_cream', 'cafe', 'toilets;showers;dresses room', 'waste_disposal', 'drinking_water', 'bbq', 'restaurant;bar', 'toilets', 'fuel', 'pub', 'bar', 'shower', 'restaurant', 'food_court', 'fast_food') 
order by "dst" asc 
limit 5 
offset 1
