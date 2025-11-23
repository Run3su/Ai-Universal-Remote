import { Device, ConnectionType } from "../types";

// Standard Hotspot Subnets
// Android usually defaults to 192.168.43.x
// iOS usually defaults to 172.20.10.x
const SUBNETS = [
  { prefix: '192.168.43', name: 'Android Hotspot' },
  { prefix: '172.20.10', name: 'iOS Hotspot' },
  { prefix: '192.168.1', name: 'Home WiFi (Std)' },
  { prefix: '192.168.0', name: 'Home WiFi (Alt)' }
];

// Target Ports to scan
// 8060 = Roku
// 8001 = Samsung (Control)
// 3000 = WebOS (LG)
const TARGET_PORTS = [8060]; 

/**
 * Checks a specific IP:Port.
 * We use a trick here: Browsers block reading the response of local network requests (CORS),
 * BUT they usually distinguish between "Connection Refused/Timed Out" (Network Error)
 * and "CORS Error" (Opaque Response).
 * 
 * If we get an Opaque Response (it connected but browser blocked reading), 
 * we know a device exists there.
 */
export const checkIp = async (ip: string, port: number, timeout = 1500): Promise<boolean> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    // Mode 'no-cors' allows the request to be sent.
    // If it resolves (even opaquely), the port is OPEN.
    // If it throws, the port is CLOSED or unreachable.
    await fetch(`http://${ip}:${port}/`, { 
      method: 'GET', 
      mode: 'no-cors', 
      signal: controller.signal 
    });
    clearTimeout(id);
    return true; 
  } catch (error: any) {
    clearTimeout(id);
    return false;
  }
};

/**
 * Scans a range of IPs for active TV devices.
 * Because we are single-threaded JS, we batch requests to avoid freezing the browser.
 */
export const scanHotspotNetwork = async (
  onProgress: (scannedCount: number, found: Device[]) => void
): Promise<Device[]> => {
  const foundDevices: Device[] = [];
  let scannedCount = 0;

  // We scan the first 20 IPs of common subnets (most hotspots assign low IPs)
  // and a few high ones just in case.
  const suffixes = Array.from({ length: 25 }, (_, i) => i + 2); // .2 to .26

  for (const subnet of SUBNETS) {
    // Batch processing
    const promises = suffixes.map(async (suffix) => {
      const ip = `${subnet.prefix}.${suffix}`;
      
      // Check for Roku first (most common HTTP open protocol)
      const isRoku = await checkIp(ip, 8060);
      
      scannedCount++;
      // Notify progress roughly every 5 scans or on find
      if (scannedCount % 5 === 0) onProgress(scannedCount, foundDevices);

      if (isRoku) {
        const device: Device = {
          id: `hotspot-${ip}`,
          name: `Roku TV (${subnet.name})`, // We guess the name based on subnet
          type: ConnectionType.WIFI_HOTSPOT, // Treated as Hotspot/WiFi
          ip: ip
        };
        foundDevices.push(device);
        onProgress(scannedCount, foundDevices);
      }
    });

    await Promise.all(promises);
  }

  return foundDevices;
};