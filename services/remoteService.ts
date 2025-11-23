import { ConnectionType, Device, RemoteKey, CommandResponse } from "../types";
import { checkIp } from "./networkScanner";

// Standard HID UUIDs
const HID_SERVICE_UUID = 0x1812;
// Roku External Control Port (ECP) default
const ROKU_PORT = 8060;

/**
 * Sends a command to the currently connected device.
 */
export const sendCommand = async (device: Device, key: RemoteKey): Promise<CommandResponse> => {
  console.log(`Sending ${key} to ${device.name} via ${device.type}`);

  try {
    switch (device.type) {
      case ConnectionType.BLE:
        return await sendBleCommand(device, key);
      case ConnectionType.WIFI_ROKU:
      case ConnectionType.WIFI_HOTSPOT: // Hotspot uses same logic as Roku WiFi
        return await sendRokuCommand(device, key);
      case ConnectionType.DEMO:
        return { success: true, message: "Demo command simulated" };
      default:
        return { success: false, message: "Unsupported device type" };
    }
  } catch (err: any) {
    console.error("Command failed:", err);
    return { success: false, message: err.message || "Command failed" };
  }
};

/**
 * Validates if a device is currently reachable.
 * Used for auto-connection on app start.
 */
export const validateConnection = async (device: Device): Promise<boolean> => {
  if (device.type === ConnectionType.DEMO) return true;
  
  if ((device.type === ConnectionType.WIFI_ROKU || device.type === ConnectionType.WIFI_HOTSPOT) && device.ip) {
     console.log(`Validating connection to ${device.ip}...`);
     return await checkIp(device.ip, ROKU_PORT, 1000);
  }
  
  // BLE cannot be auto-validated without user gesture due to browser security
  return false;
};

/**
 * Sends a single character or special key (for typing).
 */
export const sendKeyboardCommand = async (device: Device, char: string): Promise<CommandResponse> => {
  try {
    if (device.type === ConnectionType.WIFI_ROKU || device.type === ConnectionType.WIFI_HOTSPOT) {
      // Roku Literal Key transmission
      // Special handling for space, backspace, enter
      let command = `Lit_${encodeURIComponent(char)}`;
      
      if (char === 'Backspace') command = 'Backspace';
      if (char === 'Enter') command = 'Enter'; // or Select
      if (char === ' ') command = 'Lit_%20';

      const url = `http://${device.ip}:${ROKU_PORT}/keypress/${command}`;
      await fetch(url, { method: 'POST', mode: 'no-cors' });
      return { success: true };
    }

    if (device.type === ConnectionType.BLE) {
       // Placeholder for BLE Keyboard Report
       if (device.bleDevice?.gatt?.connected) {
           return { success: true };
       }
       return { success: false, message: "BLE disconnected" };
    }

    return { success: true, message: "Simulated Type: " + char };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

/**
 * Sends a mouse movement command.
 * @param device The target device
 * @param x Delta X movement
 * @param y Delta Y movement
 */
export const sendMouseMove = async (device: Device, x: number, y: number): Promise<CommandResponse> => {
  try {
    if (device.type === ConnectionType.BLE) {
       // Placeholder for BLE Mouse Report Writing
       if (device.bleDevice?.gatt?.connected) {
           return { success: true };
       }
       return { success: false, message: "BLE disconnected" };
    }
    
    if (device.type === ConnectionType.WIFI_ROKU || device.type === ConnectionType.WIFI_HOTSPOT) {
      // Roku does not support mouse cursor control via ECP.
      return { success: true };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

/**
 * BLE Implementation (Generic HID simulation)
 */
const sendBleCommand = async (device: Device, key: RemoteKey): Promise<CommandResponse> => {
  if (!device.bleDevice || !device.bleDevice.gatt?.connected) {
    return { success: false, message: "BLE Device disconnected" };
  }

  try {
    const service = await device.bleDevice.gatt.getPrimaryService(HID_SERVICE_UUID);
    // Real implementation would get characteristic and writeValue
    return { success: true };
  } catch (e) {
    console.warn("BLE Write failed (expected in demo without matching hardware):", e);
    return { success: false, message: "BLE Write failed (Check console)" };
  }
};

/**
 * Roku Wi-Fi / Hotspot Implementation
 */
const sendRokuCommand = async (device: Device, key: RemoteKey): Promise<CommandResponse> => {
  if (!device.ip) return { success: false, message: "No IP address" };

  // Roku Key Mapping
  const rokuMap: Record<string, string> = {
    [RemoteKey.POWER]: 'Power',
    [RemoteKey.VOLUME_UP]: 'VolumeUp',
    [RemoteKey.VOLUME_DOWN]: 'VolumeDown',
    [RemoteKey.MUTE]: 'VolumeMute',
    [RemoteKey.CHANNEL_UP]: 'ChannelUp',
    [RemoteKey.CHANNEL_DOWN]: 'ChannelDown',
    [RemoteKey.UP]: 'Up',
    [RemoteKey.DOWN]: 'Down',
    [RemoteKey.LEFT]: 'Left',
    [RemoteKey.RIGHT]: 'Right',
    [RemoteKey.OK]: 'Select',
    [RemoteKey.BACK]: 'Back',
    [RemoteKey.HOME]: 'Home',
    [RemoteKey.INFO]: 'Info',
    [RemoteKey.NETFLIX]: 'Launch/12',
    [RemoteKey.YOUTUBE]: 'Launch/837',
    [RemoteKey.SETTINGS]: 'Info', // Roku uses * (Info) for settings context
    [RemoteKey.MENU]: 'Home',     // Roku main menu is Home
    [RemoteKey.DISPLAY]: 'Info',  // Common fallback
    [RemoteKey.ASPECT]: 'Info',   // Common fallback
    [RemoteKey.SLEEP]: 'Sleep',   // Specific command for devices that support it
    [RemoteKey.NUM_0]: 'Lit_0',
    [RemoteKey.NUM_1]: 'Lit_1',
    [RemoteKey.NUM_2]: 'Lit_2',
    [RemoteKey.NUM_3]: 'Lit_3',
    [RemoteKey.NUM_4]: 'Lit_4',
    [RemoteKey.NUM_5]: 'Lit_5',
    [RemoteKey.NUM_6]: 'Lit_6',
    [RemoteKey.NUM_7]: 'Lit_7',
    [RemoteKey.NUM_8]: 'Lit_8',
    [RemoteKey.NUM_9]: 'Lit_9',
  };

  const command = rokuMap[key];
  if (!command) return { success: false, message: "Key not supported on Roku" };

  const url = `http://${device.ip}:${ROKU_PORT}/keypress/${command}`;

  try {
    // Use fetch with no-cors to attempt "fire and forget" even if opaque
    // This allows it to work across local subnets and hotspots
    await fetch(url, { method: 'POST', mode: 'no-cors' });
    return { success: true };
  } catch (e) {
    // In Hotspot mode, connection stability can vary
    return { success: false, message: "Signal lost. Check Hotspot connection." };
  }
};

/**
 * Scan for BLE Devices
 */
export const scanBleDevices = async (): Promise<Device[]> => {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error("Web Bluetooth not supported in this browser.");
  }

  try {
    // Request device with HID service (remote control) or battery service
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [HID_SERVICE_UUID, 'battery_service']
    });

    if (device) {
      // Attempt to connect immediately to validate GATT availability
      if (device.gatt) {
         await device.gatt.connect();
      }

      return [{
        id: device.id,
        name: device.name || "Unknown BLE Device",
        type: ConnectionType.BLE,
        bleDevice: device
      }];
    }
    return [];
  } catch (error: any) {
    // Suppress logging for user cancellation to keep console clean
    if (error.name === 'NotFoundError' || error.message?.includes('cancelled')) {
      console.log("BLE Scan cancelled by user.");
      throw error; // Re-throw to let UI handle the cancellation state
    }
    console.error("BLE Scan failed", error);
    throw error;
  }
};