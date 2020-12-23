import React from "react";
import { loadModules } from "esri-loader";
import { items } from "./fakeServer";
import { governorate } from "./governorate";
import { GetSales } from "./services";
import PivotTableUI from "react-pivottable/PivotTableUI";
import "react-pivottable/pivottable.css";

import { PivotData } from "react-pivottable/Utilities";
import axios from "axios";
import react from "react";
import logo from "./Smart-Logo-01.png";

export class WebMapView extends React.Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();

    // this.state = {index:-1,location:{}}
  }
  state = {
    data: items,
    govs: governorate,
    currentGov: 1,
    currentGovName: "Cairo",
    currentOutlet: "",
    curentLocation: null,
    index: -1,
    location: {},
    zoom: 10,
    repCode: null,
    currentRepArr: [],
    salesRepFlag: true,
    merchantFlag: true,
    renderedObject: {},
    merchantsGraphics: [],
    salesGraphics: [],
    currentSales: "",
    curentSalesArray: [],
    outlets: [],
    view: null,
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
        "esri/views/draw/DrawAction",
        "esri/widgets/Locate",
        "esri/geometry/geometryEngine",
        "esri/tasks/RouteTask",
        "esri/tasks/support/RouteParameters",
        "esri/tasks/support/FeatureSet",
        "esri/intl",
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
        intl,
        Locator,
        Locate,
        geometryEngine,
        RouteTask,
        RouteParameters,
        FeatureSet,
      ]) => {
        const map = new ArcGISMap({
          basemap: "topo-vector",
        });
        var view = new MapView({
          container: this.mapRef.current,
          map: map,
          center:
            this.state.curentLocation == null
              ? [31.2357116, 30.0444196]
              : [this.state.curentLocation.lat, this.state.curentLocation.long],
          zoom: this.state.zoom,
        });
        this.setState({ view });

        // Do something with the bundle

        // Set the locale to French

        // intl.setLocale("ar");
        console.log(this.mapRef.current);
        var graphicsLayer = new GraphicsLayer();
        map.add(graphicsLayer);
        //////////////////location btn///////////
        // var locateBtn = new Locate({
        //   view: view,
        // });

        // // Add the locate widget to the top left corner of the view
        // view.ui.add(locateBtn, {
        //   position: "top-left",
        // });
        // //////////////////location btn///////////

        this.getSales(Graphic, graphicsLayer, this.state.currentGov);
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
          // const points = getCoordsFromScreenPoint();
          // console.log(points);
          // console.log(coordinateConversionWidget);
          console.log(view.zoom);

          //   this.setState({ zoom: view.zoom });
          //   if (view.zoom == 12 && this.state.salesRepFlag == true) {
          //     debugger;
          //     this.setState({ salesRepFlag: false });
          //     this.setState({ zoom: 12 });

          //     this.getSales(Graphic, graphicsLayer, this.state.currentGov);
          //   }
          //   // else if (view.zoom == 14 && this.state.merchantFlag == true) {
          //   //   debugger;

          //   //   this.setState({ merchantFlag: false });

          //   //   this.getMerchants(Graphic, graphicsLayer, this.state.currentGov);
          //   // }
          //   // this.state.currentRepArr.map((item) => {
          //   // });
          //   else if (
          //     view.zoom == 10 &&
          //     this.state.salesRepFlag == false &&
          //     this.state.merchantFlag == true
          //   ) {
          //     debugger;
          //     this.setState({ salesRepFlag: true });
          //     this.setState({ currSales: [] });
          //     this.setState({ zoom: 11 });
          //     // this.loadMap();
          //     graphicsLayer.removeMany(this.state.salesGraphics);

          //     console.log("drilledUp");
          //   } else if (
          //     view.zoom == 11 &&
          //     this.state.merchantFlag == true &&
          //     this.state.salesRepFlag == false
          //   ) {
          //     debugger;

          //     this.setState({ merchantFlag: true });
          //     graphicsLayer.removeMany(this.state.merchantsGraphics);

          //     console.log("drilledUp");
          //   }
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

        var address;
        view.on("click", function (evt) {
          search.clear();
          view.popup.clear();
          if (search.activeSource) {
            var geocoder = search.activeSource.locator; // World geocode service
            var params = {
              location: evt.mapPoint,
            };

            geocoder.locationToAddress(params).then(
              function (response) {
                view.zoom = this.state.zoom;
                // Show the address found
                debugger;
                address = response.address;
                console.log(evt.mapPoint, address);
                debugger;

                showPopup(address, evt.mapPoint);
              },
              function (err) {
                // Show no address found
                showPopup("No address found.", evt.mapPoint);
              }
            );
          }
        });
        view.watch("center", function (newValue, oldValue, propertyName) {
          console.log(
            propertyName + " changed",
            newValue.__accessor__.store._values.get("x"),
            newValue.__accessor__.store._values.get("y")
          );
        });
        function showPopup(address, pt) {
          console.log(address, pt);
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

        // /////search to place

        // // /find plkaces/; ////
        // var places = [
        //   "Coffee shop",
        //   "Gas station",
        //   "Food",
        //   "Hotel",
        //   "Parks and Outdoors",
        // ];

        // var select = document.createElement("select", "");
        // select.setAttribute("class", "esri-widget esri-select");
        // select.setAttribute(
        //   "style",
        //   "width: 175px; font-family: Avenir Next W00; font-size: 1em"
        // );
        // places.forEach(function (p) {
        //   var option = document.createElement("option");
        //   option.value = p;
        //   option.innerHTML = p;
        //   select.appendChild(option);
        // });

        // view.ui.add(select, "top-right");
        // var locator = new Locator({
        //   url:
        //     "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
        // });
        // function findPlaces(category, pt) {
        //   locator
        //     .addressToLocations({
        //       location: pt,
        //       categories: [category],
        //       maxLocations: 25,
        //       outFields: ["Place_addr", "PlaceName"],
        //     })
        //     .then(function (results) {
        //       // Clear the map
        //       view.popup.close();
        //       view.graphics.removeAll();
        //       // Add graphics
        //       results.forEach(function (result) {
        //         view.graphics.add(
        //           new Graphic({
        //             attributes: result.attributes,
        //             geometry: result.location,
        //             symbol: {
        //               type: "simple-marker",
        //               color: "#000000",
        //               size: "12px",
        //               outline: {
        //                 color: "#ffffff",
        //                 width: "2px",
        //               },
        //             },
        //             popupTemplate: {
        //               title: "{PlaceName}",
        //               content: "{Place_addr}",
        //             },
        //           })
        //         );
        //       });
        //     });
        // }
        // // Search for places in center of map when the app loads
        // findPlaces(select.value, view.center);

        // // Listen for category changes and find places
        // select.addEventListener("change", function (event) {
        //   findPlaces(event.target.value, view.center);
        // });

        // // Listen for mouse clicks and find places
        // view.on("click", function (event) {
        //   view.hitTest(event.screenPoint).then(function (response) {
        //     if (response.results.length < 2) {
        //       // If graphic is not clicked, find places
        //       findPlaces(
        //         select.options[select.selectedIndex].text,
        //         event.mapPoint
        //       );
        //     }
        //   });
        // });
        // ///find plkaces/////
        this.drawGovs(Graphic, graphicsLayer);
        ///////////////////////nearest position///////////////////
        // var routeTask = new RouteTask({
        //   url:
        //     "https://utility.arcgis.com/usrsvcs/appservices/<your-id>/rest/services/World/Route/NAServer/Route_World/solve",
        // });
        // view.on("click", function (event) {
        //   if (view.graphics.length === 0) {
        //     addGraphic("start", event.mapPoint);
        //   } else if (view.graphics.length === 1) {
        //     addGraphic("finish", event.mapPoint);
        //     //*** ADD ***//
        //     getRoute();
        //   } else {
        //     view.graphics.removeAll();
        //     addGraphic("start", event.mapPoint);
        //   }
        // });

        // function addGraphic(type, point) {
        //   var graphic = new Graphic({
        //     symbol: {
        //       type: "simple-marker",
        //       color: type === "start" ? "white" : "black",
        //       size: "8px",
        //     },
        //     geometry: point,
        //   });
        //   view.graphics.add(graphic);
        // }
        // function getRoute() {
        //   // Setup the route parameters
        //   var routeParams = new RouteParameters({
        //     stops: new FeatureSet({
        //       features: view.graphics.toArray(), // Pass the array of graphics
        //     }),
        //     returnDirections: true,
        //   });
        //   // Get the route
        //   routeTask.solve(routeParams).then(function (data) {
        //     // Display the route
        //     data.routeResults.forEach(function (result) {
        //       result.route.symbol = {
        //         type: "simple-line",
        //         color: [5, 150, 255],
        //         width: 3,
        //       };
        //       view.graphics.add(result.route);
        //     });

        //     //*** ADD ***//

        //     // Display the directions
        //     var directions = document.createElement("ol");
        //     directions.classList =
        //       "esri-widget esri-widget--panel esri-directions__scroller";
        //     directions.style.marginTop = 0;
        //     directions.style.paddingTop = "15px";

        //     // Show the directions
        //     var features = data.routeResults[0].directions.features;
        //     features.forEach(function (result, i) {
        //       var direction = document.createElement("li");
        //       direction.innerHTML =
        //         result.attributes.text +
        //         " (" +
        //         result.attributes.length.toFixed(2) +
        //         " miles)";
        //       directions.appendChild(direction);
        //     });

        //     // Add directions to the view
        //     view.ui.empty("top-right");
        //     view.ui.add(directions, "top-right");
        //   });
        // }
        ///////////////////////nearest position///////////////////
      }
    );
  };

  drawGovs = (Graphic, graphicsLayer) => {
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
        size: 11,
      };
      var attributes = {
        Name: "" + "governorate  : " + i.ar_name + "",
        Location: " Point Dume State Beach",
      };

      const getInfo = async (feature) => {
        this.setState({ currentGov: this.state.govs[index].gov_code });

        if (this.state.currSales.length !== 0) {
          this.setState({ renderedObject: i });
          console.log(this.state.govs[index]);
          const gov_code = { gov_code: this.state.govs[index].gov_code };
          this.setState({ currentGov: gov_code.gov_code });
          console.log(gov_code.gov_code);
          this.setState({ curentLocation: this.state.govs[index].location });
        } else {
          console.log("yarab");
        }
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
  };

  getSales = async (Graphic, graphicsLayer, govCode) => {
    debugger;
    // const test = await GetSales(gov_code);
    // console.log(test.data);
    // .post("http://172.22.224.1:16797/bi-api/maps/reps/by-gov", {
    //   gov_code: gov_code,
    // .get("http://10.22.1.221/bi-api/maps/reps/all")
    // })
    await axios
      .post("http://10.22.1.221/bi-api/maps/reps/by-gov", {
        gov_code: govCode,
      })
      .then((res) => {
        console.log(res.data);
        this.setState({ currentRepArr: res.data });
        console.log(this.state.currentRepArr);

        // debugger;
        res.data.map((item, index) => {
          // debugger;
          // console.log("item",item)
          const pointSales = {
            type: "point",
            latitude: item.location.lat,
            longitude: item.location.long,
          };
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
            Name: "" + "Sales code : " + item.rep_code + "",
            Location: " Point Dume State Beach",
          };
          if (this.state.repCode !== null) {
            this.getMerchants(Graphic, graphicsLayer, this.state.repCode);
          }

          const getInfo = (feature) => {
            this.setState({ renderedObject: item });
            this.setState({ index });

            let content = "" + "اسم الحي : " + item.district_name + "";

            //check if merchants exist

            // if (this.state.merchantsGraphics.length > 0) {
            //   //remove existing merchants

            //   graphicsLayer.removeMany(this.state.merchantsGraphics);

            //   this.setState({ merchantsGraphics: [] });

            //   if (item.rep_code !== this.state.currentSales) {
            //     this.setState({ currentSales: item.rep_code });

            // this.getMerchants(Graphic, graphicsLayer, item.rep_code);
            // }
            // } else {
            //   //first load merchants

            //   this.setState({ currentSales: item.rep_code });

            //   this.getMerchants(Graphic, graphicsLayer, item.rep_code);
            // }

            // console.log("hh",pointGraphic3)

            // this.getMerchants(Graphic, graphicsLayer, item.rep_code);
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
          this.setState({
            salesGraphics: [...this.state.salesGraphics, pointGraphic3],
          });
          graphicsLayer.add(pointGraphic3);
        });
      })
      .catch((err) => console.log(err, "dd"));
  };

  getMerchants = async (Graphic, graphicsLayer, rep_code) => {
    await axios
      .post("http://10.22.1.221/bi-api/maps/merchs/by-rep", {
        rep_code: rep_code,
      })
      .then((res) => {
        // console.log("hghghgfhgfh",res.data);
        // debugger;
        res.data.map((item, index) => {
          // debugger;
          // console.log("item",item)
          const pointSales = {
            type: "point",
            latitude: item.location.lat,
            longitude: item.location.long,
          };
          const simpleMarkerSymbolSales = {
            type: "simple-marker",
            style: "square",
            color: "" + item.status + "",
            outline: {
              color: [255, 255, 255],
              width: 2,
            },
            size: 10,
          };
          const attributesSales = {
            Name: "" + item.name + " : " + "الاسم" + "",
            Location: " Point Dume State Beach",
          };

          const getInfo = (feature) => {
            this.setState({ renderedObject: item });
            // let content =
            //   " " + "district_name : " + item.district_name + "";

            return "  ";
          };
          const popupTemplateSales = {
            title: "{Name}",
            // content: "" + "merchant code : " + item.address + "",
            content: getInfo,
          };

          var pointGraphic3 = new Graphic({
            geometry: pointSales,
            symbol: simpleMarkerSymbolSales,
            attributes: attributesSales,
            popupTemplate: popupTemplateSales,
            index: index,
          });
          this.setState({
            merchantsGraphics: [...this.state.merchantsGraphics, pointGraphic3],
          });
          graphicsLayer.add(pointGraphic3);
        });

        // graphicsLayer.add(pointGraphic3);
      });
  };
  handleChange = (e) => {
    console.log("hiii");
    const currentGov = e.target.value;
    this.setState({ currentGovName: currentGov });
    // console.log(e.target.value);
    debugger;
    const govDetail = this.state.govs.find((g) => g.en_name == currentGov);
    const location = govDetail.location;
    const govCode = govDetail.gov_code;
    this.setState({ currentGov: govCode }, () => {
      console.log(this.state.currentGov);
    });
    this.setState({ curentLocation: location });

    console.log(this.state.curentLocation);
    if (this.state.curentLocation !== null) {
      console.log(this.state.curentLocation.lat);
      console.log(this.state.curentLocation.long);
    }
    this.setState({ zoom: 10 });

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
  handleChangeRepsByGov = (e) => {
    debugger;
    const currentOutlet = e.target.value;
    this.setState({ currentOutlet });
    const item = this.state.currentRepArr.find(
      (i) => i.name.split(" ").join("") == currentOutlet.split(" ").join("")
    );
    this.setState({ zoom: 15 });
    const loc = { lat: item.location.long, long: item.location.lat };
    this.setState({ curentLocation: loc }, () => {
      this.setState({ location: loc });
      console.log(this.state.curentLocation);
      this.setState({ repCode: item.rep_code });
      this.loadMap();
    });
  };
  handleShowInMap = () => {};
  componentDidMount() {
    // setInterval(() => {
    //   let new_data = [...this.state.govs];

    //   new_data[0] = {
    //     ...new_data[0],
    //     gov_code: new_data[0].gov_code + 1,
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

  drawTable = () => {
    // return Object.keys(this.state.renderedObject).map((key) => {
    //   if (key !== "location" && key !== "status") {
    return (
      <div style={{ marginTop: 25 }}>
        <span style={{ color: "blue", float: "right" }}> : الاسم </span>
        <span style={{ float: "right" }}>
          {this.state.renderedObject["name"].toString()}
        </span>
        <br />
        <span style={{ color: "blue", float: "right" }}> : العنوان</span>
        <span style={{ float: "right" }}>
          {this.state.renderedObject["address"].toString()}
        </span>
        <br />
        <span style={{ color: "blue", float: "right" }}> : رقم التليفون</span>
        <span style={{ float: "right" }}>
          {this.state.renderedObject["mobile"].toString()}
        </span>
      </div>
    );
    //   }
    // });
  };
  render() {
    console.log("indexxxxxxxxx", this.state.index);

    // this.loadMap()
    return (
      <div>
        {/* <button
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
        </button> */}
        <div style={{ display: "flex" }}>
          <div
            className="webmap"
            style={{ height: 1000, width: "80%" }}
            ref={this.mapRef}
          />
          <div
            style={{ display: "flex", flexDirection: "column", padding: 10 }}
          >
            {/* <div
              style={{
                display: "flex",
                flexDirection: "column",
                border: "1px solid grey",
                padding: 10,
                width: 200,
              }}
            >
              <div>
                <span>Governorate : </span>
                <i
                  class="fa fa-caret-up"
                  style={{ fontSize: 30, position: "relative", top: 5 }}
                ></i>
              </div>
              <div>
                <span>Sales Representative : </span>
                <i class="fa fa-circle" style={{ fontSize: 15 }}></i>
              </div>
              <div>
                <span>Merchants : </span>
                <i class="fa fa-square" style={{ fontSize: 15 }}></i>
              </div>
            </div> */}
            <div style={{ display: "flex", flexDirection: "row" }}>
              <span>
                <select
                  value={this.state.currentGovName}
                  onChange={(e) => this.handleChange(e)}
                >
                  {this.state.govs.map((i) => {
                    return <option>{i.ar_name}</option>;
                  })}
                </select>
              </span>
              <span style={{ color: "blue", float: "right" }}>
                {"  : " + "المحافظه"}
              </span>
            </div>
            <br />
            <div style={{ display: "flex", flexDirection: "row" }}>
              <span>
                <select
                  value={this.state.currentOutlet}
                  onChange={(e) => this.handleChangeRepsByGov(e)}
                >
                  <option></option>);
                  {this.state.currentRepArr.map((i) => {
                    return (
                      <react.Fragment>
                        <option>{i.name}</option>
                      </react.Fragment>
                    );
                  })}
                </select>
              </span>
              <span style={{ color: "blue", float: "right" }}>
                {"  : " + "المندوبين"}
              </span>
            </div>

            {/* <PivotTableUI />
            <button onClick={this.handleShowInMap} style={{ marginTop: 25 }}>
              Show in map
            </button> */}
            {Object.entries(this.state.renderedObject).length > 0 &&
              this.drawTable()}
            <button onClick={this.loadMap} style={{ marginTop: 25 }}>
              Reset Map
            </button>
            <img
              style={{
                width: "300px",
                height: "239px",
                bottom: "10px",
                position: "absolute",
              }}
              src={logo}
              alt="photo"
            />
          </div>
        </div>
      </div>
    );
  }
}
export default WebMapView;
