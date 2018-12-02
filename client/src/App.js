import React, {Component} from 'react';
import ReactMap, {GeoJSONLayer, Marker} from 'react-mapbox-gl';
import axios from 'axios';
import ReactJson from 'react-json-view';

import "./App.css";

const accessToken = "pk.eyJ1IjoiNXRhcmRhIiwiYSI6ImNqb3F3bnpicDA1dDMza21qeHllZTY2MTgifQ.gwfD4uBotDllImDewPuTdg";
const style = "mapbox://styles/mapbox/streets-v8";

const Map = ReactMap({
    accessToken
});


const fillLayout = {
    visibility: 'visible'
}

const fillPaint = {
    "fill-color": "#ff0000",
    "fill-opacity": 0.5,
    "fill-outline-color": '#000000'
};

const fillPaintLake = {
    "fill-color": "#73cdff",
    "fill-opacity": 0.7,
    "fill-outline-color": '#000000'
};

const mapStyle = {
    position: 'relative',
    top: 0,
    bottom: 0,
    width: '100%',
    height: '80vh'
};

class App extends Component {
    state = {
        center: [19.69, 48.67],
        zoom: [5],
        map: null,
        regions: null,
        categoryOptions: null,
        lake: null,
        lakeMarkers: null,
        nearestServices: null,
        currentRegion: null,
        calls: []
    }

    async componentWillMount() {
        let calls = [];
        if (!this.state.regions || !this.state.categoryOptions) {
            let regionsPolygons = await axios({
                method: 'GET',
                url: 'http://localhost:3010/api/gis/getRegions'
            });
            calls.unshift({call: regionsPolygons.config.url, data: regionsPolygons.data});
            let regions = await axios({
                method: 'GET',
                url: 'http://localhost:3010/api/gis/getCountOfLakes'
            });
            calls.unshift({call: regions.config.url, data: regions.data});
            let categoryOptions = regions.data.map(r => {
                let showingProp = `${r.name} (${r.count})`;
                return <option key={r.name} value={r.name}>{showingProp}</option>
            });

            this.setState({
                regions: regionsPolygons.data,
                categoryOptions,
                calls
            });
        }
    }

    async _chooseRegion(e) {
        let calls = [];

        let region = this.refs.region.value;
        let geoJson = await axios({
            method: 'GET',
            url: `http://localhost:3010/api/gis/getCentroid?region=${region}`
        });
        calls.unshift({call: geoJson.config.url, data: geoJson.data});

        let lakes = await axios({
            method: 'GET',
            url: `http://localhost:3010/api/gis/getLakesInRegion?region=${region}`
        });
        calls.unshift({call: lakes.config.url, data: lakes.data});

        let center = geoJson.data.features[0].geometry.coordinates;
        this.map.state.map.flyTo({
            center,
            zoom: [8]
        });

        this.setState({
            lake: lakes.data.polygons,
            lakeMarkers: lakes.data.markers.features,
            currentRegion: region,
            nearestServices: null,
            calls
        });
        this._showMarkers();
    }

    _showNearestServices() {
        if (this.state.nearestServices){
            let services = this.state.nearestServices;
            let mapped = services.map(m => {
                return (
                    <li>
                        ****************
                        <br/>
                        Distance: {(m.dst / 1000).toFixed(2) + ' km'}
                        <br/>
                        Name: {m.name}
                        <br/>
                        Type: {m.type}
                    </li>
                )
            });

            console.log(mapped);

            return (
                mapped
            );
        }
    }

    async _flyToMarker(coordinates) {
        let calls = [];
        let nearest = await axios({
            method: 'GET',
            url: `http://localhost:3010/api/gis/getNearestServices?pointX=${coordinates[0]}&pointY=${coordinates[1]}`
        });
        calls.unshift({call: nearest.config.url, data: nearest.data});

        this.setState({
            nearestServices: nearest.data.result,
            calls
        });

        this.map.state.map.flyTo({
            center: coordinates,
            zoom: [15]
        });
    }


    _showMarkers() {
        if (this.state.lakeMarkers) {
            let markers = this.state.lakeMarkers.map((m, i) => {
                let coordinates = m.geometry.coordinates;
                return (
                    <Marker
                        key={i}
                        coordinates={coordinates}
                        anchor="bottom"
                        onClick={this._flyToMarker.bind(this, coordinates)}
                    >
                        <img src={"http://maps.google.com/mapfiles/ms/icons/blue.png"}/>
                    </Marker>
                );
            });
            return markers;
        }
    }

    _showServices() {
        console.log(this.state.nearestServices);

        if (this.state.nearestServices) {
            let markers = this.state.nearestServices.map((m, i) => {
                let coordinates = m.centroid;
                return (
                    <Marker
                        key={i}
                        coordinates={coordinates}
                        anchor="bottom"
                    >
                        <img src={"http://maps.google.com/mapfiles/ms/icons/restaurant.png"}/>
                    </Marker>
                );
            });
            return markers;
        }
    }

    render() {
        return (
            <div>
                <div className="MainWindow">
                    <div>
                        <div>
                            <label>Region</label><br/>
                            <select ref="region">
                                {this.state.categoryOptions}
                            </select>
                        </div>
                        <br/>
                        <button type="button" onClick={this._chooseRegion.bind(this)}>
                            Select region
                        </button>
                        <br/>
                        {this._showNearestServices()}
                    </div>
                    <div className="MapPosition">
                        <Map
                            style={style}
                            containerStyle={mapStyle}
                            movingMethod={'jumpTo'}
                            center={this.state.center}
                            zoom={this.state.zoom}
                            ref={m => (this.map = m)}
                        >
                            <GeoJSONLayer
                                data={this.state.regions}
                                fillLayout={fillLayout}
                                fillPaint={fillPaint}
                            />

                            <GeoJSONLayer
                                data={this.state.lake}
                                fillLayout={fillLayout}
                                fillPaint={fillPaintLake}
                            />
                            {this._showMarkers()}
                            {this._showServices()}
                        </Map>
                    </div>
                </div>
                <div className="BottomJSON">
                    <ReactJson src={this.state.calls} theme="monokai" />
                </div>
            </div>
        );
    }
}

export default App;
