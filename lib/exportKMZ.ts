// KMZ export logic for DJI Fly / DJI RC2 waypoint missions.
//
// Generated archive structure:
//   wpmz/template.kml
//   wpmz/waylines.wpml
//
// This structure follows KMZ files created directly on DJI RC2.

import JSZip from 'jszip';
import { Mission, Waypoint } from './types';
import { getDroneEnumValue } from './droneEnumMap';

const WPML_NS = 'http://www.uav.com/wpmz/1.0.2';

function calcAvgSpeed(mission: Mission): number {
  if (mission.waypoints.length === 0) {
    return 2.5;
  }

  const avg =
    mission.waypoints.reduce((sum, wp) => sum + (wp.speed || 2.5), 0) /
    mission.waypoints.length;

  return Number.isFinite(avg) && avg > 0 ? avg : 2.5;
}

function nowMs(): number {
  return Date.now();
}

function formatNumber(value: number, digits = 12): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return Number(value.toFixed(digits)).toString();
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeHeading(angle: number): number {
  let result = angle;

  while (result > 180) result -= 360;
  while (result < -180) result += 360;

  return result;
}

function bearingDeg(a: Waypoint, b: Waypoint): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return normalizeHeading(bearing);
}

function waypointHeadingAngle(
  mission: Mission,
  wp: Waypoint,
  index: number,
): number {
  if (typeof wp.headingAngle === 'number') {
    return normalizeHeading(wp.headingAngle);
  }

  const points = mission.waypoints;

  if (points.length <= 1) {
    return 0;
  }

  if (index < points.length - 1) {
    return bearingDeg(points[index], points[index + 1]);
  }

  return bearingDeg(points[index - 1], points[index]);
}

function missionConfigXml(mission: Mission, droneEnumValue: number): string {
  const avgSpeed = calcAvgSpeed(mission).toFixed(1);

  return `    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>goHome</wpml:finishAction>
      <wpml:exitOnRCLost>executeLostAction</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>goBack</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>${avgSpeed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>${droneEnumValue}</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>`;
}

function generateTemplateKML(mission: Mission, droneEnumValue: number): string {
  const ts = nowMs();

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${WPML_NS}">
  <Document>
    <wpml:author>fly</wpml:author>
    <wpml:createTime>${ts}</wpml:createTime>
    <wpml:updateTime>${ts}</wpml:updateTime>
${missionConfigXml(mission, droneEnumValue)}
  </Document>
</kml>
`;
}

function headingParamXml(mission: Mission, wp: Waypoint, index: number): string {
  const headingAngle = waypointHeadingAngle(mission, wp, index);

  return `        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>smoothTransition</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>${headingAngle.toFixed(1)}</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
          <wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex>
        </wpml:waypointHeadingParam>`;
}

function turnParamXml(): string {
  return `        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>`;
}

function initialGimbalRotateActionGroupXml(
  wp: Waypoint,
  index: number,
): string {
  if (typeof wp.gimbalPitch !== 'number') {
    return '';
  }

  return `        <wpml:actionGroup>
          <wpml:actionGroupId>${index * 10 + 1}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${index}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${index}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>${index * 10 + 1}</wpml:actionId>
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
          </wpml:action>
        </wpml:actionGroup>`;
}

function smoothGimbalRotateActionGroupXml(
  wp: Waypoint,
  index: number,
  lastIndex: number,
): string {
  if (typeof wp.gimbalPitch !== 'number') {
    return '';
  }

  const endIndex = Math.min(index + 1, lastIndex);

  return `        <wpml:actionGroup>
          <wpml:actionGroupId>${index * 10 + 2}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${index}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${endIndex}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>${index * 10 + 2}</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalEvenlyRotate</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalPitchRotateAngle>${wp.gimbalPitch}</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>`;
}

function takePhotoActionGroupXml(wp: Waypoint, index: number): string {
  if (wp.cameraAction !== 'photo') {
    return '';
  }

  return `        <wpml:actionGroup>
          <wpml:actionGroupId>${index * 10 + 3}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${index}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${index}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>${index * 10 + 3}</wpml:actionId>
            <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>`;
}

function startRecordActionGroupXml(wp: Waypoint, index: number): string {
  if (wp.cameraAction !== 'startVideo') {
    return '';
  }

  return `        <wpml:actionGroup>
          <wpml:actionGroupId>${index * 10 + 4}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${index}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${index}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>${index * 10 + 4}</wpml:actionId>
            <wpml:actionActuatorFunc>startRecord</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>`;
}

function stopRecordActionGroupXml(wp: Waypoint, index: number): string {
  if (wp.cameraAction !== 'stopVideo') {
    return '';
  }

  return `        <wpml:actionGroup>
          <wpml:actionGroupId>${index * 10 + 5}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${index}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${index}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>${index * 10 + 5}</wpml:actionId>
            <wpml:actionActuatorFunc>stopRecord</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>`;
}

function actionGroupsXml(
  wp: Waypoint,
  index: number,
  lastIndex: number,
): string {
  const groups: string[] = [];

  // DJI Fly / RC2 native missions typically set gimbal angle at the first point.
  if (index === 0) {
    groups.push(initialGimbalRotateActionGroupXml(wp, index));
    groups.push(smoothGimbalRotateActionGroupXml(wp, index, lastIndex));
  }

  groups.push(takePhotoActionGroupXml(wp, index));
  groups.push(startRecordActionGroupXml(wp, index));
  groups.push(stopRecordActionGroupXml(wp, index));

  return groups.filter(Boolean).join('\n');
}

function waypointGimbalHeadingParamXml(): string {
  return `        <wpml:waypointGimbalHeadingParam>
          <wpml:waypointGimbalPitchAngle>0</wpml:waypointGimbalPitchAngle>
          <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
        </wpml:waypointGimbalHeadingParam>`;
}

function placemarkXml(
  mission: Mission,
  wp: Waypoint,
  index: number,
): string {
  const lastIndex = mission.waypoints.length - 1;
  const height = Number.isFinite(wp.height) ? wp.height : 50;
  const speed = Number.isFinite(wp.speed) && wp.speed > 0 ? wp.speed : calcAvgSpeed(mission);

  return `      <Placemark>
        <Point>
          <coordinates>
            ${formatNumber(wp.lng, 13)},${formatNumber(wp.lat, 13)}
          </coordinates>
        </Point>
        <wpml:index>${index}</wpml:index>
        <wpml:executeHeight>${formatNumber(height, 1)}</wpml:executeHeight>
        <wpml:waypointSpeed>${formatNumber(speed, 1)}</wpml:waypointSpeed>
${headingParamXml(mission, wp, index)}
${turnParamXml()}
        <wpml:useStraightLine>1</wpml:useStraightLine>
${actionGroupsXml(wp, index, lastIndex)}
${waypointGimbalHeadingParamXml()}
      </Placemark>`;
}

function generateWaylinesWPML(mission: Mission, droneEnumValue: number): string {
  const avgSpeed = calcAvgSpeed(mission).toFixed(1);

  const placemarks = mission.waypoints
    .map((wp, index) => placemarkXml(mission, wp, index))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${WPML_NS}">
  <Document>
${missionConfigXml(mission, droneEnumValue)}
    <Folder>
      <wpml:templateId>0</wpml:templateId>
      <wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:distance>0</wpml:distance>
      <wpml:duration>0</wpml:duration>
      <wpml:autoFlightSpeed>${avgSpeed}</wpml:autoFlightSpeed>
${placemarks}
    </Folder>
  </Document>
</kml>
`;
}

export async function exportKMZ(
  mission: Mission,
  droneName?: string,
): Promise<void> {
  if (mission.waypoints.length === 0) {
    throw new Error('Mise nemá žádné waypointy');
  }

  const droneEnumValue = getDroneEnumValue(droneName);
  const zip = new JSZip();

  const wpmz = zip.folder('wpmz');

  if (!wpmz) {
    throw new Error('Failed to create wpmz folder');
  }

  wpmz.file('template.kml', generateTemplateKML(mission, droneEnumValue));
  wpmz.file('waylines.wpml', generateWaylinesWPML(mission, droneEnumValue));

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `${xmlEscape(mission.name).replace(/\s+/g, '_')}.kmz`;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}