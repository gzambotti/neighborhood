// code by Giovanni Zambotti - 30 April 2020
// ESRI JS 4.15

require([
        "esri/WebMap",
        "esri/views/MapView",
        "esri/widgets/Search",
        "esri/layers/GraphicsLayer",
        "esri/widgets/Sketch/SketchViewModel",
        "esri/views/layers/support/FeatureFilter",
        "esri/geometry/geometryEngine",
        "esri/Graphic",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleLineSymbol"
      ], function(
        WebMap,MapView,Search, GraphicsLayer,SketchViewModel,FeatureFilter,geometryEngine,Graphic, SimpleFillSymbol,SimpleLineSymbol) {
        
        let geoidarray = [];
        
        const neighbor = {
          sessionid:"",
          geoid:"",
          address:"",
          datetime:""
        };

        Date.prototype.IsoNum = function (n) {
          var tzoffset = this.getTimezoneOffset() * 60000; //offset in milliseconds
          var localISOTime = (new Date(this - tzoffset)).toISOString().slice(0,-1);
          return localISOTime.replace(/[-T:\.Z]/g, "").substring(0,n || 20); // YYYYMMDD
        };

        let timeX = new Date();
        let time = timeX.IsoNum(14);
        neighbor.datetime = timeX.toString();

        // generate time
        let hash = function(s){    
          if (typeof(s) == "number" && s === parseInt(s, 10)){
              s = Array(s + 1).join("x");
          }
          return s.replace(/x/g, function(){
              let n = Math.round(Math.random() * 61) + 48;
              n = n > 57 ? (n + 7 > 90 ? n + 13 : n + 7) : n;
              return String.fromCharCode(n);
          });
        };
      
        let userhash = hash(10);                
        neighbor.sessionid = userhash;

        // add a GraphicsLayer for the sketches and the buffer
        let sketchLayer = new GraphicsLayer();        
        
        //view.map.addMany([sketchLayer]);

        const webmap = new WebMap({
          portalItem:{
            id: "8e5ebb87041a43f7a44f793e908e7c67"
          },
          layers: [sketchLayer]
        })
        
        const view = new MapView({
          container: "viewDiv",
          map: webmap
        });

        const searchWidget = new Search({
          view: view,
          container: "searchDiv"
        });

        // Add the search widget to the top right corner of the view
        /*view.ui.add(searchWidget, {
          position: "top-right"
        });
        */
        searchWidget.on("select-result", function(event){          
          //let pt = event.result.feature.geometry.getCentroid();  
          //webmap.centerAndZoom(pt, 2); //Change this to suit your needs
          console.log("The selected search result: ", event.result.name);
          neighbor.address = event.result.name;
          console.log(event.result)
          view.center = [event.result.feature.geometry.longitude, event.result.feature.geometry.latitude];  // Sets the center point of the view at a specified lon/lat
          view.zoom = 12;  // Sets the zoom LOD to 13
        });
               

        // set the outFields for the layer coming from webmap
        webmap.when(function () {
          //console.log("test")
          console.log(webmap.layers)
          layer = webmap.layers.getItemAt(1);
          layer.outFields = ["FIPS","BLKGRP"];          
          webmap.layers.reorder(layer, 0)
        });

        // create the layerView's to add the filter
        let sceneLayerView = null;
        let featureLayerView = null;
        
        view.map.load().then(function() {
          // loop through webmap's operational layers
          view.map.layers.forEach(function(layer, index) {
            view.whenLayerView(layer).then(function(layerView) {
                if (layer.type === "feature") {                  
                  featureLayerView = layerView;                  
                }
              }).catch(console.error);
          });
        });

        
        
        // use SketchViewModel to draw polygons that are used as a filter
        let sketchGeometry = null;
        const sketchViewModel = new SketchViewModel({
          layer: sketchLayer,
          view: view,   
          polygonSymbol: {
            type: "simple-fill",  // autocasts as new SimpleFillSymbol()
            color: [51,0,0,0],
            style: "backward-diagonal",
            outline: {  // autocasts as new SimpleLineSymbol()
              color: "red",
              width: 1.2
            }
            /*type: "polygon-3d",            
            symbolLayers: [
              {
                type: "fill",
                material: {
                  color: [255, 255, 255, 0]
                },
                outline: {
                  color: [255, 0, 0, 0.8],
                  size: "8px"
                }
              }
            ]*/
          },
          defaultCreateOptions: { hasZ: false }
        });

        //sketchViewModel.create("polygon", {mode: "click"});


        sketchViewModel.on(["create"], function(event) {         
          // update the filter every time the user finishes drawing the filtergeometry
          if (event.state == "complete") {
            sketchGeometry = event.graphic.geometry;
            updateFilter();
          }
        });

        sketchViewModel.on(["update"], function(event) {
          const eventInfo = event.toolEventInfo;
          // update the filter every time the user moves the filtergeometry
          if (eventInfo && eventInfo.type.includes("move")) {
            if (eventInfo.type === "move-stop") {
              sketchGeometry = event.graphics[0].geometry;
              updateFilter();
            }
          }
          // update the filter every time the user changes the vertices of the filtergeometry
          if (eventInfo && eventInfo.type.includes("reshape")) {
            if (eventInfo.type === "reshape-stop") {
              sketchGeometry = event.graphics[0].geometry;
              updateFilter();
            }
          }
        });

        // select the layer to filter on
        let featureLayerViewFilterSelected = true;
        
        document.getElementById("polygon-geometry-button").onclick = geometryButtonsClickHandler;

        function geometryButtonsClickHandler(event) {
          const geometryType = event.target.value;
          clearFilter();
          sketchViewModel.create(geometryType);
        }

        // get the selected spatialRelationship
        let selectedFilter = "intersects";
        
        // remove the filter
        document.getElementById("clearFilter").addEventListener("click", function() {
            clearFilter();
          });

        function clearFilter() {
          sketchGeometry = null;
          filterGeometry = null;
          sketchLayer.removeAll();
          //bufferLayer.removeAll();          
          featureLayerView.filter = null;
        }

        
        // set the geometry filter on the visible FeatureLayerView
        function updateFilter() {
          geoidarray = [];
          updateFilterGeometry();
          featureFilter = {
            // autocasts to FeatureFilter
            geometry: filterGeometry,
            spatialRelationship: selectedFilter
          };

          if (featureLayerView) {
            if (featureLayerViewFilterSelected) {
              featureLayerView.filter = featureFilter;
              console.log(featureLayerView.availableFields)
              // get all the features available for drawing.
              featureLayerView.queryFeatures().then(function(results){
                // prints the array of result graphics to the console
                console.log(results.features.length);
                results.features.forEach(element => {
                  //console.log(element.attributes.FIPS)
                  geoidarray.push(element.attributes.FIPS)
                });
              });
            } else {
              featureLayerView.filter = null;
            }
          }
          console.log(geoidarray)
        }

        // update the filter geometry depending on bufferSize
        let filterGeometry = null;
        function updateFilterGeometry() {
          // add a polygon graphic for the bufferSize
          if (sketchGeometry) {
            //bufferLayer.removeAll();
            filterGeometry = sketchGeometry;            
          }
        }
        document.getElementById("infoDiv").style.display = "block";

        document.getElementById("submitResult").addEventListener("click", function(){
          neighbor.geoid = geoidarray;
          console.log(JSON.stringify(neighbor))
          let xmlhttp = new XMLHttpRequest();   // new HttpRequest instance 
          xmlhttp.open("POST", "/survey");
          xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
          console.log(xmlhttp)
          xmlhttp.send(JSON.stringify(neighbor));
          
          let win = window.open("https://google.com", '_blank');
          win.focus();          
        });

        
      });