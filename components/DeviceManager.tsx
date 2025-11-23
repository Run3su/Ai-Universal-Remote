import React, { useState } from 'react';
import { Button } from './Button';
import { Device, ConnectionType } from '../types';
import { scanBleDevices } from '../services/remoteService';
import { scanHotspotNetwork } from '../services/networkScanner';

interface DeviceManagerProps {
  onConnect: (device: Device) => void;
  currentDevice: Device | null;
}

type Tab = 'BLE' | 'HOTSPOT' | 'WIFI';

export const DeviceManager: React.FC<DeviceManagerProps> = ({ onConnect, currentDevice }) => {
  const [activeTab, setActiveTab] = useState<Tab>('BLE');
  const [manualIp, setManualIp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Hotspot Scanning State
  const [scanProgress, setScanProgress] = useState(0);
  const [foundDevices, setFoundDevices] = useState<Device[]>([]);

  const handleBleScan = async () => {
    setIsLoading(true);
    setError("");
    try {
      const devices = await scanBleDevices();
      if (devices.length > 0) {
        onConnect(devices[0]);
      } else {
        setError("No compatible BLE devices selected.");
      }
    } catch (e: any) {
      if (e.name === 'NotFoundError' || e.message?.includes('cancelled')) {
        return;
      }
      setError(e.message || "Bluetooth scan failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHotspotScan = async () => {
    setIsLoading(true);
    setFoundDevices([]);
    setScanProgress(0);
    setError("");

    try {
      const devices = await scanHotspotNetwork((count, currentFound) => {
        setScanProgress(count);
        setFoundDevices([...currentFound]);
      });
      
      if (devices.length === 0) {
        setError("No devices found on hotspot. Try Manual IP.");
      }
    } catch (e) {
      setError("Hotspot scan interrupted.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualConnect = (type: ConnectionType) => {
    if (!manualIp) {
      setError("Please enter an IP address.");
      return;
    }
    onConnect({
      id: `manual-${manualIp}`,
      name: `TV (${manualIp})`,
      type: type,
      ip: manualIp
    });
  };

  return (
    <div className="bg-gray-800 rounded-3xl shadow-xl border border-gray-700 w-full max-w-md mx-auto overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="bg-gray-900/50 p-6 text-center border-b border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-1">Connect Device</h2>
        <p className="text-gray-400 text-xs">Select a method to control your TV</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button 
          onClick={() => setActiveTab('BLE')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'BLE' ? 'bg-gray-700 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:bg-gray-700/50'}`}
        >
          Bluetooth
        </button>
        <button 
          onClick={() => setActiveTab('HOTSPOT')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'HOTSPOT' ? 'bg-gray-700 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:bg-gray-700/50'}`}
        >
          Hotspot
        </button>
        <button 
          onClick={() => setActiveTab('WIFI')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'WIFI' ? 'bg-gray-700 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:bg-gray-700/50'}`}
        >
          Wi-Fi
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        
        {/* BLE Tab */}
        {activeTab === 'BLE' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
              <h3 className="text-blue-200 font-semibold mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Best for:
              </h3>
              <p className="text-xs text-gray-300">Newer TVs, when you have no WiFi, or for initial setup.</p>
            </div>
            
            <Button 
              onClick={handleBleScan} 
              disabled={isLoading}
              className="w-full h-14 text-lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> Scanning...</span>
              ) : "Scan & Connect BLE"}
            </Button>
            <p className="text-xs text-center text-gray-500">Requires a browser with Web Bluetooth (Chrome/Edge/Android).</p>
          </div>
        )}

        {/* Hotspot Tab */}
        {activeTab === 'HOTSPOT' && (
          <div className="space-y-4 animate-fade-in">
             {/* Instructions */}
             <ol className="text-xs text-gray-400 list-decimal pl-4 space-y-2">
               <li>Turn on <strong>Personal Hotspot</strong> on this phone.</li>
               <li>Connect your TV to this phone's Hotspot WiFi.</li>
               <li>Tap <strong>Scan Network</strong> below.</li>
             </ol>

             <Button 
              onClick={handleHotspotScan} 
              disabled={isLoading}
              variant="secondary"
              className="w-full h-12"
            >
              {isLoading ? "Scanning Hotspot..." : "Scan Network"}
            </Button>

            {/* Scan Visualization */}
            {isLoading && (
               <div className="space-y-1">
                 <div className="flex justify-between text-xs text-gray-400">
                   <span>Scanning IP range...</span>
                   <span>{scanProgress} IPs checked</span>
                 </div>
                 <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse w-full origin-left transform scale-x-50"></div>
                 </div>
                 <p className="text-[10px] text-gray-500 text-center">Checking Android (192.168.43.x) & iOS (172.20.10.x)</p>
               </div>
            )}

            {/* Found Devices List */}
            <div className="space-y-2">
              {foundDevices.map((dev) => (
                <button
                  key={dev.id}
                  onClick={() => onConnect(dev)}
                  className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded-xl flex items-center justify-between transition-colors border border-gray-600"
                >
                  <span className="text-white font-medium">{dev.name}</span>
                  <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">Connect</span>
                </button>
              ))}
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
              <div className="relative flex justify-center text-xs"><span className="px-2 bg-gray-800 text-gray-500">Or Manual Entry</span></div>
            </div>

            <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="e.g. 192.168.43.100"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <Button onClick={() => handleManualConnect(ConnectionType.WIFI_HOTSPOT)} className="px-4 text-xs">Set</Button>
            </div>
          </div>
        )}

        {/* WiFi Tab */}
        {activeTab === 'WIFI' && (
          <div className="space-y-6 animate-fade-in">
             <div className="text-sm text-gray-300">
               Enter the IP address of your Roku or Smart TV directly. 
               <br/><span className="text-xs text-gray-500">Make sure you are on the same WiFi network.</span>
             </div>

             <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">TV IP Address</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="e.g. 192.168.1.50"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 text-white focus:outline-none focus:border-blue-500 transition-colors h-12"
                />
                <Button onClick={() => handleManualConnect(ConnectionType.WIFI_ROKU)} className="px-6">Connect</Button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <Button variant="ghost" onClick={() => onConnect({ id: 'demo', name: 'Demo TV', type: ConnectionType.DEMO })} className="w-full text-gray-400">
                Try Demo Mode
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Status */}
      {(error || currentDevice) && (
        <div className={`p-3 text-xs text-center border-t ${error ? 'bg-red-900/30 border-red-500/30 text-red-200' : 'bg-green-900/30 border-green-500/30 text-green-200'} border-gray-700`}>
           {error ? error : `Connected: ${currentDevice?.name}`}
        </div>
      )}
    </div>
  );
};
