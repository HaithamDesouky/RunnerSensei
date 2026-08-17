import React, { useRef, useEffect } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { RunPoint } from "../types";

interface Props {
  points: RunPoint[];
  followUser?: boolean;
  style?: object;
}

function buildLeafletHTML(points: RunPoint[], followUser: boolean): string {
  const center =
    points.length > 0
      ? [
          points[points.length - 1].latitude,
          points[points.length - 1].longitude,
        ]
      : [0, 0];
  const zoom = points.length > 0 ? 17 : 2;
  const polyline = points
    .map((p) => `[${p.latitude},${p.longitude}]`)
    .join(",");
  const startMarker =
    points.length > 0
      ? `L.circleMarker([${points[0].latitude},${points[0].longitude}], {radius:8,color:'green',fillColor:'green',fillOpacity:1}).addTo(map).bindPopup('Start');`
      : "";
  const currentMarker =
    points.length > 1
      ? `L.circleMarker([${center[0]},${center[1]}], {radius:8,color:'#E84545',fillColor:'#E84545',fillOpacity:1}).addTo(map);`
      : "";

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:true,attributionControl:false}).setView([${center[0]},${center[1]}],${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  ${polyline ? `L.polyline([${polyline}],{color:'#E84545',weight:4}).addTo(map);` : ""}
  ${startMarker}
  ${currentMarker}
</script>
</body></html>`;
}

const RunMap: React.FC<Props> = ({ points, followUser = false, style }) => {
  const webViewRef = useRef<WebView>(null);

  // Push updated map state into the WebView when points change
  useEffect(() => {
    if (!webViewRef.current || points.length === 0) return;
    const last = points[points.length - 1];
    const polyline = points
      .map((p) => `[${p.latitude},${p.longitude}]`)
      .join(",");
    const js = `
      if(window._poly) map.removeLayer(window._poly);
      window._poly = L.polyline([${polyline}],{color:'#E84545',weight:4}).addTo(map);
      ${followUser ? `map.setView([${last.latitude},${last.longitude}],17);` : ""}
      true;
    `;
    webViewRef.current.injectJavaScript(js);
  }, [points, followUser]);

  const html = buildLeafletHTML(points, followUser);

  return (
    <WebView
      ref={webViewRef}
      style={[styles.map, style]}
      source={{ html }}
      originWhitelist={["*"]}
      javaScriptEnabled
    />
  );
};

const styles = StyleSheet.create({ map: { flex: 1 } });
export default RunMap;

