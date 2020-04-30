require([
        "esri/WebMap",
        "esri/views/MapView",
        "esri/layers/GraphicsLayer",
        "esri/widgets/Sketch/SketchViewModel",
        "esri/views/layers/support/FeatureFilter",
        "esri/geometry/geometryEngine",
        "esri/Graphic"
      ], function(
        WebMap,MapView,GraphicsLayer,SketchViewModel,FeatureFilter,geometryEngine,Graphic) {
        
        let foo = [];

        const webmap = new WebMap({
          portalItem:{
            id: "8e5ebb87041a43f7a44f793e908e7c67"
          }
        })
        
        const view = new MapView({
          container: "viewDiv",
          map: webmap
        });

        // add a GraphicsLayer for the sketches and the buffer
        let sketchLayer = new GraphicsLayer();
        let bufferLayer = new GraphicsLayer();
        
        view.map.addMany([bufferLayer, sketchLayer]);

        // set the outFields for the layer coming from webmap
        webmap.when(function () {
          //console.log("test")
          //console.log(webmap.layers)
          layer = webmap.layers.getItemAt(2);
          layer.outFields = ["FIPS","BLKGRP"];
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
          /*polygonSymbol: {
            //type: "polygon-3d",
            type: "polygon",
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
            ]
          },*/
          defaultCreateOptions: { hasZ: false }
        });

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
          bufferLayer.removeAll();          
          featureLayerView.filter = null;
        }

        
        // set the geometry filter on the visible FeatureLayerView
        function updateFilter() {
          foo = [];
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
                  console.log(element.attributes.FIPS)
                  foo.push(element.attributes.FIPS)
                });
              });
            } else {
              featureLayerView.filter = null;
            }
          }
          console.log(foo)
        }

        // update the filter geometry depending on bufferSize
        let filterGeometry = null;
        function updateFilterGeometry() {
          // add a polygon graphic for the bufferSize
          if (sketchGeometry) {
            bufferLayer.removeAll();
            filterGeometry = sketchGeometry;            
          }
        }
        document.getElementById("infoDiv").style.display = "block";
      });