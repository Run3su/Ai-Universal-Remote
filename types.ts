export enum ConnectionType {
  BLE = 'BLE',
  WIFI_ROKU = 'WIFI_ROKU',
  WIFI_GENERIC = 'WIFI_GENERIC',
  WIFI_HOTSPOT = 'WIFI_HOTSPOT',
  DEMO = 'DEMO'
}

export enum RemoteKey {
  POWER = 'Power',
  VOLUME_UP = 'VolumeUp',
  VOLUME_DOWN = 'VolumeDown',
  MUTE = 'Mute',
  CHANNEL_UP = 'ChannelUp',
  CHANNEL_DOWN = 'ChannelDown',
  UP = 'Up',
  DOWN = 'Down',
  LEFT = 'Left',
  RIGHT = 'Right',
  OK = 'Select',
  BACK = 'Back',
  HOME = 'Home',
  INFO = 'Info',
  NETFLIX = 'Netflix',
  YOUTUBE = 'YouTube',
  SETTINGS = 'Settings',
  ASPECT = 'Aspect',
  DISPLAY = 'Display',
  MENU = 'Menu',
  SLEEP = 'Sleep',
  NUM_0 = 'Num0',
  NUM_1 = 'Num1',
  NUM_2 = 'Num2',
  NUM_3 = 'Num3',
  NUM_4 = 'Num4',
  NUM_5 = 'Num5',
  NUM_6 = 'Num6',
  NUM_7 = 'Num7',
  NUM_8 = 'Num8',
  NUM_9 = 'Num9'
}

export interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<any>;
    disconnect: () => void;
    getPrimaryService: (service: string | number) => Promise<any>;
  };
}

export interface Device {
  id: string;
  name: string;
  type: ConnectionType;
  ip?: string; // For WiFi/Hotspot
  bleDevice?: BluetoothDevice; // For BLE
}

export interface CommandResponse {
  success: boolean;
  message?: string;
}

export interface GeminiCommandResult {
  action: RemoteKey | null;
  repeat?: number;
}
