  }, [waypoints, draggableMarkers, onUpdateWaypoint]);

  const polylinePositions = waypoints.map(
    (wp) => [wp.lat, wp.lng] as [number, number],
  );

  const polygonPositions = polygonPoints.map(
    (p) => [p.lat, p.lng] as [number, number],
  );

  return (
    <MapContainer
      center={[50.08, 14.42]}
      zoom={13}
      style={{
        height: '100%',
        width: '100%',
      }}
      ref={mapRef}
    >
      <LayersControl />
      <MapEventHandler onMapClick={onMapClick} onCenterChange={onCenterChange} />

      <AirspaceLayer active={showAirspace} dataRegion={dataRegion} />

      <ProtectedAreasLayer
        active={showProtectedAreas}
        dataRegion={dataRegion}
      />

      <SmallReservesLayer active={showSmallReserves} dataRegion={dataRegion} />
      <WaterSourcesLayer active={showWaterSources} dataRegion={dataRegion} />
      <RailwayLayer active={showRailways} dataRegion={dataRegion} />
      <RoadLayer active={showRoads} dataRegion={dataRegion} />
      <PowerlineLayer active={showPowerlines} dataRegion={dataRegion} />

      {polylinePositions.length > 1 && (
        <Polyline
          positions={polylinePositions}
          color="#3b82f6"
          weight={2}
          opacity={0.8}
        />
      )}

      {gridRect && (
        <Rectangle
          bounds={gridRect}
          pathOptions={{
            color: '#f59e0b',
            weight: 2,
            fillOpacity: 0.1,
            fillColor: '#f59e0b',
          }}
        />
      )}

      {polygonPositions.length >= 2 && (
        <Polyline
          positions={polygonPositions}
          pathOptions={{
            color: '#22c55e',
            weight: 2,
            dashArray: polygonDrawActive ? '6 4' : undefined,
          }}
        />
      )}

      {polygonPositions.length >= 3 && (
        <Polygon
          positions={polygonPositions}
          pathOptions={{
            color: '#22c55e',
            weight: 2,
            fillOpacity: 0.08,
            fillColor: '#22c55e',
          }}
        />
      )}

      {facadeLine && (
        <Polyline
          positions={facadeLine}
          pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '6 4' }}
        />
      )}

      {buildingPolygon && (
        <Polygon
          positions={buildingPolygon}
          pathOptions={{
            color: '#f59e0b',
            weight: 2,
            dashArray: '6 4',
            fillOpacity: 0.08,
            fillColor: '#f59e0b',
          }}
        />
      )}
    </MapContainer>
  );
}