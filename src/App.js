import React from "react";
import { loadModules } from "esri-loader";
import { items } from "./fakeServer";
import { governorate } from "./governorate";
import { GetSales } from "./services";
import axios from "axios";

export class WebMapView extends React.Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();

    // this.state = {index:-1,location:{}}
  }
  state = {
    data: items,
    govs: governorate,
    currentGov: null,
    curentLocation: null,
    index: -1,
    location: {},
  };

  loadMap = () => {
    loadModules(
      [
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/FeatureLayer",
        "esri/Graphic",
        "esri/layers/GraphicsLayer",
        "esri/widgets/CoordinateConversion",
        "esri/widgets/Search",
        "esri/tasks/Locator",
        "esri/Graphic",
      ],
      { css: true }
    ).then(
      ([
        ArcGISMap,
        MapView,
        FeatureLayer,
        Graphic,
        GraphicsLayer,
        CoordinateConversion,
        Search,
        Locator,
      ]) => {
        const map = new ArcGISMap({
          basemap: "topo-vector",
        });
        var view = new MapView({
          container: this.mapRef.current,
          map: map,
          center:
            this.state.curentLocation == null
              ? [29.9187387, 31.2000924]
              : [this.state.curentLocation.lat, this.state.curentLocation.long],
          zoom: 13,
        });
        console.log(this.mapRef.current);
        var graphicsLayer = new GraphicsLayer();
        map.add(graphicsLayer);
        /////scrolling zoom in & out

        var coordinateConversionWidget = new CoordinateConversion({
          view: view,
        });
        view.ui.add(coordinateConversionWidget, "bottom-right");
        // view.ui.add(coordsWidget, "bottom-right");
        const showCoordinates = (pt) => {
          var coords =
            "Lat/Lon " +
            pt.x.toFixed(3) +
            " " +
            pt.y.toFixed(3) +
            " | Scale 1:" +
            Math.round(view.scale * 1) / 1 +
            " | Zoom " +
            view.zoom;
          coordinateConversionWidget.innerHTML = coords;
          // console.log(coordinateConversionWidget);
          // console.log(pt.x.toFixed(3), pt.y.toFixed(3), view.zoom);
        };
        view.watch("stationary", function (isStationary) {
          showCoordinates(view.center);
        });

        view.on("pointer-move", function (evt) {
          showCoordinates(view.toMap({ x: evt.x, y: evt.y }));
        });
        /////scrolling zoom in & out

        ///////search to place
        var search = new Search({
          view: view,
        });

        view.ui.add(search, "top-right");
        view.on("click", function (evt) {
          search.clear();
          view.popup.clear();
          if (search.activeSource) {
            var geocoder = search.activeSource.locator; // World geocode service
            var params = {
              location: evt.mapPoint,
            };
            var address;
            geocoder.locationToAddress(params).then(
              function (response) {
                // Show the address found
                debugger;
                address = response.address;
                console.log(evt.mapPoint, address);

                showPopup(address, evt.mapPoint);
              },
              function (err) {
                // Show no address found
                showPopup("No address found.", evt.mapPoint);
              }
            );
          }
        });

        function showPopup(address, pt) {
          // console.log(address, pt.longitude, pt.latitude);
          view.popup.open({
            title:
              +Math.round(pt.longitude * 100000) / 100000 +
              "," +
              Math.round(pt.latitude * 100000) / 100000,
            content: address,
            location: pt,
          });
        }
        var trailsLayer = new FeatureLayer({
          url:
            "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0",
        });
        search.sources.push({
          layer: trailsLayer,
          searchFields: ["TRL_NAME"],
          displayField: "TRL_NAME",
          exactMatch: false,
          outFields: ["TRL_NAME", "PARK_NAME"],
          resultGraphicEnabled: true,
          name: "Trailheads",
          placeholder: "Example: Medea Creek Trail",
        });
        ///////search to place

        /////find plkaces/////
        var places = [
          "Coffee shop",
          "Gas station",
          "Food",
          "Hotel",
          "Parks and Outdoors",
        ];

        var select = document.createElement("select", "");
        select.setAttribute("class", "esri-widget esri-select");
        select.setAttribute(
          "style",
          "width: 175px; font-family: Avenir Next W00; font-size: 1em"
        );
        places.forEach(function (p) {
          var option = document.createElement("option");
          option.value = p;
          option.innerHTML = p;
          select.appendChild(option);
        });

        view.ui.add(select, "top-right");
        var locator = new Locator({
          url:
            "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
        });
        function findPlaces(category, pt) {
          locator
            .addressToLocations({
              location: pt,
              categories: [category],
              maxLocations: 25,
              outFields: ["Place_addr", "PlaceName"],
            })
            .then(function (results) {
              // Clear the map
              view.popup.close();
              view.graphics.removeAll();
              // Add graphics
              results.forEach(function (result) {
                view.graphics.add(
                  new Graphic({
                    attributes: result.attributes,
                    geometry: result.location,
                    symbol: {
                      type: "simple-marker",
                      color: "#000000",
                      size: "12px",
                      outline: {
                        color: "#ffffff",
                        width: "2px",
                      },
                    },
                    popupTemplate: {
                      title: "{PlaceName}",
                      content: "{Place_addr}",
                    },
                  })
                );
              });
            });
        }
        // Search for places in center of map when the app loads
        findPlaces(select.value, view.center);

        // Listen for category changes and find places
        select.addEventListener("change", function (event) {
          findPlaces(event.target.value, view.center);
        });

        // Listen for mouse clicks and find places
        view.on("click", function (event) {
          view.hitTest(event.screenPoint).then(function (response) {
            if (response.results.length < 2) {
              // If graphic is not clicked, find places
              findPlaces(
                select.options[select.selectedIndex].text,
                event.mapPoint
              );
            }
          });
        });
        /////find plkaces/////
        this.state.govs.map((i, index) => {
          var point = {
            type: "point",
            latitude: i.location.long,
            longitude: i.location.lat,
          };
          var simpleMarkerSymbol = {
            type: "simple-marker",
            style: "triangle",
            color: "#aa3a3a",
            outline: {
              color: [255, 255, 255],
              width: 2,
            },
            size: 15,
          };
          var attributes = {
            Name: "" + "governorate code : " + i.governorate_code + "",
            Location: " Point Dume State Beach",
          };

          const getInfo = async (feature) => {
            this.setState({ index });
            console.log(this.state.govs[index]);
            const gov_code = { gov_code: this.state.govs[index].gov_code };
            await axios
              .post("http://10.43.30.182:16797/bi-api/maps/reps", gov_code)
              .then((res) => {
                console.log(res.data);
                debugger;
                res.data.map((item, index) => {
                  // debugger;
                  const pointSales = {
                    type: "point",
                    latitude: item.location.lat,
                    longitude: item.location.long,
                  };
                  console.log("hhhh");
                  const simpleMarkerSymbolSales = {
                    type: "simple-marker",
                    // style: "triangle",
                    color: "" + item.status + "",
                    outline: {
                      color: [255, 255, 255],
                      width: 2,
                    },
                    size: 10,
                  };
                  const attributesSales = {
                    Name: "" + "Sales code : " + i.rep_code + "",
                    Location: " Point Dume State Beach",
                  };

                  const getInfo = (feature) => {
                    this.setState({ index });
                    let content =
                      "" + "district_name : " + item.district_name + "";

                    return content;
                  };
                  const popupTemplateSales = {
                    title: "{Name}",
                    // content: "" + "merchant code : " + i.damen_merchant_code + "",
                    content: getInfo,
                  };

                  var pointGraphic3 = new Graphic({
                    geometry: pointSales,
                    symbol: simpleMarkerSymbolSales,
                    attributes: attributesSales,
                    popupTemplate: popupTemplateSales,
                    index: index,
                  });
                  graphicsLayer.add(pointGraphic3);
                });
              });
          };

          var popupTemplate = {
            title: "{Name}",
            // content: "" + "merchant code : " + i.damen_merchant_code + "",
            content: getInfo,
          };

          var pointGraphic2 = new Graphic({
            geometry: point,
            symbol: simpleMarkerSymbol,
            attributes: attributes,
            popupTemplate: popupTemplate,
            index: index,
          });

          graphicsLayer.add(pointGraphic2);
        });
      }
    );
  };
  //       this.state.data.map((i, index) => {
  //         var point = {
  //           type: "point",
  //           longitude: i.y_coordinate,
  //           latitude: i.x_coordinate,
  //         };
  //         if (i.y_coordinate <= 30) {
  //           var simpleMarkerSymbol = {
  //             type: "simple-marker",
  //             color: [0, 150, 50],
  //             outline: {
  //               color: [255, 255, 255],
  //               width: 2,
  //             },
  //             size: 10,
  //           };
  //         } else if (i.y_coordinate >= 30) {
  //           var simpleMarkerSymbol = {
  //             type: "simple-marker",
  //             // style:"triangle",
  //             color: "#aa3a3a",
  //             outline: {
  //               color: [255, 255, 255],
  //               width: 2,
  //             },
  //             size: 10,
  //           };
  //         }

  //         var attributes = {
  //           Name: "" + "governorate code : " + i.governorate_code + "",
  //           Location: " Point Dume State Beach",
  //         };

  //         const getInfo = (feature) => {
  //           this.setState({ index });
  //           let content = "" + "merchant code : " + i.damen_merchant_code + "";
  //           console.log(this.state.govs[index]);
  //           return content;
  //         };
  //         var popupTemplate = {
  //           title: "{Name}",
  //           // content: "" + "merchant code : " + i.damen_merchant_code + "",
  //           content: getInfo,
  //         };

  //         var pointGraphic = new Graphic({
  //           geometry: point,
  //           symbol: simpleMarkerSymbol,
  //           attributes: attributes,
  //           popupTemplate: popupTemplate,
  //           // index:index,
  //         });

  //         graphicsLayer.add(pointGraphic);
  //       });
  //       var polygon = {
  //         type: "polygon",
  //         rings: [
  //           [30.0228069, 31.2142028],
  //           [30.029507, 31.212698],
  //           [30.0281133, 31.2106249],
  //           [30.0236394, 31.2073342],
  //           [30.0209446, 31.2057394],
  //           [30.0175873, 31.2050287],
  //         ],
  //       };

  //       var simpleFillSymbol = {
  //         type: "simple-fill",
  //         color: [227, 139, 79, 0.8],

  //         outline: {
  //           color: [255, 255, 255],
  //           width: 1,
  //         },
  //         // style: "backward-diagonal",
  //       };

  //       var polygonGraphic = new Graphic({
  //         geometry: polygon,
  //         symbol: simpleFillSymbol,
  //       });

  //       graphicsLayer.add(polygonGraphic);
  //     }
  //   );
  // };

  handleChange = (e) => {
    console.log("hiii");
    const currentGov = e.target.value;
    this.setState({ currentGov }, () => {
      console.log(this.state.currentGov);
    });
    // console.log(e.target.value);
    debugger;
    const govDetail = this.state.govs.find((g) => g.en_name == currentGov);
    const location = govDetail.location;
    this.setState({ curentLocation: location });

    console.log(this.state.curentLocation);
    if (this.state.curentLocation !== null) {
      console.log(this.state.curentLocation.lat);
      console.log(this.state.curentLocation.long);
    }
    this.loadMap();
  };
  handleCurrentLoc = () => {
    navigator.geolocation.getCurrentPosition((position) => {
      if (position !== undefined) {
        this.setState({
          curentLocation: {
            lat: position.coords.longitude,
            long: position.coords.latitude,
          },
        });
      }
      console.log("lat", position.coords.latitude);
      console.log("long", position.coords.longitude);
      this.loadMap();
    });
  };
  componentDidMount() {
    // setInterval(() => {
    //   let new_data = [...this.state.data];

    //   new_data[0] = {
    //     ...new_data[0],
    //     x_coordinate: new_data[0].x_coordinate + 30.0,
    //   };

    //   this.setState({ data: new_data });
    //   // this.loadMap();
    // }, 7000);
    this.loadMap();
  }
  componentDidUpdate() {
    // this.loadMap();
    // this.view.on("click", function (event) {
    //   // you must overwrite default click-for-popup
    //   // behavior to display your own popup
    //   this.view.popup.autoOpenEnabled = false;
    //   // Get the coordinates of the click on the view
    //   var lat = Math.round(event.mapPoint.latitude * 1000) / 1000;
    //   var lon = Math.round(event.mapPoint.longitude * 1000) / 1000;
    //   console.log("beeeeeeeb");
    //   this.view.popup.open({
    //     // Set the popup's title to the coordinates of the location
    //     title: "Reverse geocode: [" + lon + ", " + lat + "]",
    //     location: event.mapPoint, // Set the location of the popup to the clicked location
    //     // content: "This is a point of interest"  // content displayed in the popup
    //   });
    // });
  }

  componentWillUnmount() {
    if (this.view) {
      // destroy the map view
      this.view.destroy();
    }
  }

  render() {
    console.log("indexxxxxxxxx", this.state.index);

    // this.loadMap()
    return (
      <div>
        <select
          value={this.state.currentGov}
          onChange={(e) => this.handleChange(e)}
        >
          {this.state.govs.map((i) => {
            return <option>{i.en_name}</option>;
          })}
        </select>
        <button
          style={{
            color: "#1f3c88",
            position: "absolute",
            bottom: 100,
            right: 100,
            width: 50,
            height: 50,
            zIndex: 1,
          }}
          onClick={() => this.handleCurrentLoc()}
        >
          <i class="fas fa-map-marker-alt fa-2x"></i>
        </button>
        <div style={{ display: "flex" }}>
          <div
            className="webmap"
            style={{ height: 1000, width: "80%" }}
            ref={this.mapRef}
          />
          <div
            style={{ display: "flex", flexDirection: "column", padding: 10 }}
          >
            {this.state.index !== -1 &&
              Object.keys(this.state.data[this.state.index]).map((key) => {
                return (
                  <view>
                    <view>{key + "  :  "}</view>
                    <view>{this.state.data[this.state.index][key]}</view>
                  </view>
                );
              })}
          </div>
        </div>
      </div>
    );
  }
}
export default WebMapView;
