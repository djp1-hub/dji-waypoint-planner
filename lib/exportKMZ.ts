// KMZ export logic for DJI waypoint missions
// KMZ is a ZIP archive containing template.kml and waylines.wpml
import JSZip from 'jszip';
import { Mission, Waypoint, CameraAction } from './types';
import { getDroneEnumValue } from './droneEnumMap';

/** Calculate the average waypoint speed for a mission (fallback: 5 m/s) */
function calcAvgSpeed(mission: Mission): number {
  if (mission.waypoints.length === 0) return 5;
  return mission.waypoints.reduce((sum, wp) => sum + wp.speed, 0) / mission.waypoints.length;
}

/** Generate the template.kml content for a mission */
function generateTemplateKML(mission: Mission, droneEnumValue: number): string {
  const avgSpeed = calcAvgSpeed(mission);

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.2">
  <Document>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>goHome</wpml:finishAction>
      <wpml:exitOnRCLost>goContinue</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>hover</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>${avgSpeed.toFixed(1)}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>${droneEnumValue}</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
      <wpml:payloadInfo>
        <wpml:payloadEnumValue>67</wpml:payloadEnumValue>
        <wpml:payloadSubEnumValue>0</wpml:payloadSubEnumValue>
        <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
      </wpml:payloadInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateType>waypoint</wpml:templateType>
      <wpml:templateId>0</wpml:templateId>
      <wpml:waylineCoordinateSysParam>
        <wpml:coordinateMode>WGS84</wpml:coordinateMode>
        <wpml:heightMode>relativeToStartPoint</wpml:heightMode>
      </wpml:waylineCoordinateSysParam>
      <wpml:autoFlightSpeed>${avgSpeed.toFixed(1)}</wpml:autoFlightSpeed>
      <Placemark><Point><coordinates>0,0</coordinates></Point></Placemark>
    </Folder>
  </Document>
</kml>`;
}

/** Generate action XML for a single waypoint */
function generateActionXML(wp: Waypoint, index: number): string {
  const photoAction = wp.cameraAction === 'photo' ? `
          <wpml:action>
            <wpml:actionId>1</wpml:actionId>
            <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:fileSuffix></wpml:fileSuffix>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>` : '';

  const startVideoAction = wp.cameraAction === 'startVideo' ? `
          <wpml:action>
            <wpml:actionId>1</wpml:actionId>
            <wpml:actionActuatorFunc>startRecord</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:fileSuffix></wpml:fileSuffix>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>` : '';

  const stopVideoAction = wp.cameraAction === 'stopVideo' ? `
          <wpml:action>
            <wpml:actionId>1</wpml:actionId>
            <wpml:actionActuatorFunc>stopRecord</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>` : '';

  // Gimbal rotate action — only emitted when gimbalPitch is explicitly set
  const gimbalAction = wp.gimbalPitch !== undefined ? `
          <wpml:action>
            <wpml:actionId>2</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalHeadingYawBase>aircraft</wpml:gimbalHeadingYawBase>
              <wpml:gimbalRotateMode>absoluteAngle</wpml:gimbalRotateMode>
              <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
              <wpml:gimbalPitchRotateAngle>${wp.gimbalPitch}</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
              <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
              <wpml:gimbalYawRotateEnable>0</wpml:gimbalYawRotateEnable>
              <wpml:gimbalYawRotateAngle>0</wpml:gimbalYawRotateAngle>
              <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
              <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>` : '';

  return `
      <wpml:actionGroup>
          <wpml:actionGroupId>${index}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${index}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${index}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>0</wpml:actionId>
            <wpml:actionActuatorFunc>hover</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:hoverTime>${wp.waitTime}</wpml:hoverTime>
            </wpml:actionActuatorFuncParam>
          </wpml:action>${photoAction}${startVideoAction}${stopVideoAction}${gimbalAction}
        </wpml:actionGroup>`;
}

/** Generate the waylines.wpml content for a mission */
function generateWaylinesWPML(mission: Mission): string {
  const avgSpeed = calcAvgSpeed(mission);

  // Orbit missions aim the gimbal at the POI on every waypoint
  const isOrbit = mission.type === 'orbit' && mission.poi != null;

  const placemarks = mission.waypoints.map((wp, index) => {
    // Determine heading mode: per-waypoint fixed angle takes priority,
    // then orbit towardPOI, then default followWayline
    const headingParam = wp.headingAngle !== undefined
      ? `<wpml:waypointHeadingParam>
        <wpml:waypointHeadingMode>fixed</wpml:waypointHeadingMode>
        <wpml:waypointHeadingAngle>${wp.headingAngle.toFixed(1)}</wpml:waypointHeadingAngle>
      </wpml:waypointHeadingParam>`
      : isOrbit && mission.poi
      ? `<wpml:waypointHeadingParam>
        <wpml:waypointHeadingMode>towardPOI</wpml:waypointHeadingMode>
        <wpml:waypointPoiPoint>${mission.poi.lng},${mission.poi.lat},0</wpml:waypointPoiPoint>
      </wpml:waypointHeadingParam>`
      : `<wpml:waypointHeadingParam>
        <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
      </wpml:waypointHeadingParam>`;

    return `
    <Placemark>
      <Point>
        <coordinates>${wp.lng},${wp.lat}</coordinates>
      </Point>
      <wpml:index>${index}</wpml:index>
      <wpml:executeHeight>${wp.height}</wpml:executeHeight>
      <wpml:waypointSpeed>${wp.speed}</wpml:waypointSpeed>
      ${headingParam}
      <wpml:waypointTurnParam>
        <wpml:waypointTurnMode>coordinateTurn</wpml:waypointTurnMode>
        <wpml:waypointBankingParam>0</wpml:waypointBankingParam>
      </wpml:waypointTurnParam>
      <wpml:useStraightLine>1</wpml:useStraightLine>${generateActionXML(wp, index)}
    </Placemark>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.2">
  <Document>
    <Folder>
      <wpml:templateId>0</wpml:templateId>
      <wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:distance>0</wpml:distance>
      <wpml:duration>0</wpml:duration>
      <wpml:autoFlightSpeed>${avgSpeed.toFixed(1)}</wpml:autoFlightSpeed>
${placemarks}
    </Folder>
  </Document>
</kml>`;
}

/** Export a mission as a .kmz file and trigger browser download */
export async function exportKMZ(mission: Mission, droneName?: string): Promise<void> {
  if (mission.waypoints.length === 0) {
    throw new Error('Mise nemá žádné waypointy');
  }

  // Resolve droneEnumValue from active drone profile (fallback: 67 = DJI Mini 4 Pro)
  const droneEnumValue = getDroneEnumValue(droneName);

  const zip = new JSZip();

  // KMZ structure: wpmz/template.kml + wpmz/waylines.wpml
  const wpmz = zip.folder('wpmz');
  if (!wpmz) throw new Error('Failed to create wpmz folder');

  wpmz.file('template.kml', generateTemplateKML(mission, droneEnumValue));
  wpmz.file('waylines.wpml', generateWaylinesWPML(mission));

  // Generate the ZIP blob and trigger download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element to trigger the download
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${mission.name.replace(/\s+/g, '_')}.kmz`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Clean up the object URL after the download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
