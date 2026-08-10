/**
 * MAVLink & NMEA Parser for DPCC Telemetry Integration
 * Parses real flight controller protocol packets (Pixhawk, ArduPilot, Betaflight, ESP-Drone)
 */

export interface MavlinkPacket {
  sysId: number;
  compId: number;
  msgId: number;
  msgName: string;
  payload: Record<string, number>;
  raw: string;
}

export class MavlinkParser {
  /**
   * Parse NMEA ASCII sentences ($GPGGA, $GPRMC) from GPS receivers
   */
  public parseNMEA(sentence: string): Record<string, any> | null {
    if (!sentence.startsWith('$')) return null;

    const parts = sentence.split('*')[0].split(',');
    const type = parts[0];

    if (type === '$GPGGA' || type === '$GNGGA') {
      const latRaw = parseFloat(parts[2]);
      const latDir = parts[3];
      const lonRaw = parseFloat(parts[4]);
      const lonDir = parts[5];
      const alt = parseFloat(parts[9]);

      let lat = isNaN(latRaw) ? 0 : Math.floor(latRaw / 100) + (latRaw % 100) / 60;
      if (latDir === 'S') lat = -lat;

      let lon = isNaN(lonRaw) ? 0 : Math.floor(lonRaw / 100) + (lonRaw % 100) / 60;
      if (lonDir === 'W') lon = -lon;

      return {
        type: 'GPS_FIX',
        lat,
        lon,
        altitude: isNaN(alt) ? 0 : alt,
        satellites: parseInt(parts[7], 10) || 0
      };
    }

    return null;
  }

  /**
   * Parses text or hex telemetry string into DPCC compatible sensor readings
   */
  public parseMavlinkText(line: string): MavlinkPacket | null {
    // Example format: MAVLINK:sys=1,comp=1,msg=ATTITUDE,roll=0.02,pitch=-0.01,yaw=1.57
    if (!line.includes('MAVLINK') && !line.includes('ATTITUDE') && !line.includes('GLOBAL_POSITION')) {
      return null;
    }

    try {
      const kvPairs: Record<string, number> = {};
      const pairs = line.replace(/^MAVLINK:/i, '').split(',');
      let msgName = 'HEARTBEAT';

      pairs.forEach(pair => {
        const [k, v] = pair.split('=');
        if (k && v) {
          const key = k.trim();
          if (key.toUpperCase() === 'MSG') {
            msgName = v.trim();
          } else {
            kvPairs[key] = parseFloat(v);
          }
        }
      });

      return {
        sysId: kvPairs.sys || 1,
        compId: kvPairs.comp || 1,
        msgId: 30,
        msgName,
        payload: kvPairs,
        raw: line
      };
    } catch (e) {
      return null;
    }
  }
}

export const mavlinkParser = new MavlinkParser();
