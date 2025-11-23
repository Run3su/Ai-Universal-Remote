import React, { useState, useRef, useEffect } from 'react';
import { Device, RemoteKey, CommandResponse, ConnectionType } from './types';
import { sendCommand, sendMouseMove, sendKeyboardCommand, validateConnection } from './services/remoteService';
import { Button } from './components/Button';
import { DeviceManager } from './components/DeviceManager';
import { VoiceControl } from './components/VoiceControl';

const App = () => {
  const [device, setDevice] = useState<Device | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isMouseMode, setIsMouseMode] = useState(false);
  const [lastAction, setLastAction] = useState<string>("");

  // Mouse tracking refs
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  const lastMoveTime = useRef(0);
  const isDragRef = useRef(false);

  // Check for API Key
  const hasApiKey = !!process.env.API_KEY;

  // Auto-Connect Effect
  useEffect(() => {
    const autoConnect = async () => {
      const savedDeviceJson = localStorage.getItem('omni_last_device');
      if (savedDeviceJson) {
        try {
          const savedDevice: Device = JSON.parse(savedDeviceJson);
          
          // We only auto-connect WiFi/Hotspot devices as BLE requires user gesture
          if (savedDevice.type === ConnectionType.WIFI_ROKU || savedDevice.type === ConnectionType.WIFI_HOTSPOT) {
            
            // Check if device is actually available on network
            const isAvailable = await validateConnection(savedDevice);
            
            if (isAvailable) {
              setDevice(savedDevice);
              setLastAction("Auto-Connected");
              // Clear message after delay
              setTimeout(() => setLastAction(""), 3000);
            } else {
              // If not found, we don't clear it immediately, maybe they are just offline momentarily.
              // But we do not set it as active device.
              console.log("Saved device not reachable.");
            }
          }
        } catch (e) {
          console.error("Auto-connect error:", e);
        }
      }
    };

    autoConnect();
  }, []);

  // Persistence Effect
  useEffect(() => {
    if (device && (device.type === ConnectionType.WIFI_ROKU || device.type === ConnectionType.WIFI_HOTSPOT)) {
      localStorage.setItem('omni_last_device', JSON.stringify(device));
    }
  }, [device]);

  const handleCommand = async (key: RemoteKey) => {
    if (!device) return;
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);
    
    setLastAction(`Sent: ${key}`);
    const response: CommandResponse = await sendCommand(device, key);
    
    if (!response.success) {
      setLastAction(`Error: ${response.message}`);
    } else {
        setTimeout(() => setLastAction(""), 2000);
    }
  };

  const handleKeyInput = async (char: string) => {
    if (!device) return;
    if (navigator.vibrate) navigator.vibrate(5);
    
    setLastAction(`Type: ${char === ' ' ? 'Space' : char}`);
    await sendKeyboardCommand(device, char);
  };

  // Mouse Pad Logic
  const handlePadDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    touchStartRef.current = { x: e.clientX, y: e.clientY };
    isDragRef.current = false;
  };

  const handlePadMove = (e: React.PointerEvent) => {
    if (!touchStartRef.current) return;

    const now = Date.now();
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;

    // Simple threshold to distinguish tap from drag
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        isDragRef.current = true;
    }

    // Throttle sending (approx 60fps)
    if (now - lastMoveTime.current < 16) return;
    
    lastMoveTime.current = now;
    touchStartRef.current = { x: e.clientX, y: e.clientY };

    sendMouseMove(device!, dx, dy);
  };

  const handlePadUp = (e: React.PointerEvent) => {
    touchStartRef.current = null;
    // If it wasn't a drag, treat as a Click (OK)
    if (!isDragRef.current) {
        handleCommand(RemoteKey.OK);
    }
  };

  const handleDisconnect = () => {
    if (device?.bleDevice?.gatt?.connected) {
      device.bleDevice.gatt.disconnect();
    }
    // Clear persisted device on explicit disconnect
    localStorage.removeItem('omni_last_device');
    setDevice(null);
    setLastAction("Disconnected");
  };

  const numberKeys = [
    { key: RemoteKey.NUM_1, label: '1' },
    { key: RemoteKey.NUM_2, label: '2' },
    { key: RemoteKey.NUM_3, label: '3' },
    { key: RemoteKey.NUM_4, label: '4' },
    { key: RemoteKey.NUM_5, label: '5' },
    { key: RemoteKey.NUM_6, label: '6' },
    { key: RemoteKey.NUM_7, label: '7' },
    { key: RemoteKey.NUM_8, label: '8' },
    { key: RemoteKey.NUM_9, label: '9' },
    { key: RemoteKey.NUM_0, label: '0' },
  ];

  // SVG Icons
  const Icons = {
    Power: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Menu: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
    Back: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
    Home: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    Mic: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
    VolUp: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>,
    VolDown: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>,
    Up: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>,
    Down: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
    Left: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
    Right: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
    Mouse: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>,
    Settings: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Aspect: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>,
    Display: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    Sleep: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-4 pb-10">
      
      {!device ? (
        <main className="w-full flex-1 flex flex-col justify-center animate-fade-in-up">
           <DeviceManager onConnect={setDevice} currentDevice={device} />
        </main>
      ) : (
        <main className="w-full max-w-[320px] flex flex-col gap-6 animate-fade-in mt-6">
          
          {/* Status Bar */}
          <div className="flex justify-between items-center bg-gray-800/50 rounded-lg px-4 py-3 text-xs text-gray-400 border border-gray-700/50 shadow-sm">
             <span className="font-medium text-gray-300">{device.name}</span>
             
             <div className="flex items-center gap-3">
               <span className={`${lastAction.startsWith("Error") ? "text-red-400" : "text-blue-400"} truncate max-w-[90px] text-right`}>
                 {lastAction || "Ready"}
               </span>
               <div className="w-px h-3 bg-gray-700"></div>
               <button 
                  onClick={handleDisconnect} 
                  className="text-red-400 hover:text-red-300 hover:underline transition-all font-medium"
               >
                 Disconnect
               </button>
             </div>
          </div>

          {/* Top Controls */}
          <div className="flex justify-between gap-4">
            <Button variant="danger" className="w-16 h-16 rounded-2xl" onClick={() => handleCommand(RemoteKey.POWER)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </Button>
            <div className="flex-1 flex items-center justify-between gap-3">
              <Button variant="secondary" className="flex-1 h-16 rounded-2xl" onClick={() => handleCommand(RemoteKey.INFO)}>Info</Button>
              <Button 
                variant="secondary" 
                onClick={() => handleCommand(RemoteKey.SLEEP)} 
                className="w-16 h-16 rounded-2xl"
                title="Sleep Timer"
              >
                {Icons.Sleep}
              </Button>
              <Button variant="secondary" className="flex-1 h-16 rounded-2xl" onClick={() => handleCommand(RemoteKey.MUTE)}>Mute</Button>
            </div>
          </div>

          {/* New Control Section: Settings, Aspect, Display, Menu */}
          <div className="grid grid-cols-4 gap-2">
            <Button 
              variant="secondary" 
              onClick={() => handleCommand(RemoteKey.SETTINGS)} 
              className="h-12 text-xs"
              title="Settings"
            >
              {Icons.Settings}
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleCommand(RemoteKey.ASPECT)} 
              className="h-12 text-xs"
              title="Aspect Ratio"
            >
              {Icons.Aspect}
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleCommand(RemoteKey.DISPLAY)} 
              className="h-12 text-xs"
              title="Display Info"
            >
              {Icons.Display}
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleCommand(RemoteKey.MENU)} 
              className="h-12 text-xs"
              title="Menu"
            >
              {Icons.Menu}
            </Button>
          </div>

          {/* Navigation Area (D-Pad / Mouse Pad) */}
          <div className="bg-gray-800 rounded-[3rem] p-6 shadow-xl border border-gray-700 aspect-square relative overflow-visible transition-all duration-300">
             
             {/* Mouse Mode Toggle Button - Floating Top Right */}
             <div className="absolute top-0 right-0 z-20 transform translate-x-2 -translate-y-2">
                <Button 
                    variant="control" 
                    active={isMouseMode} 
                    onClick={() => setIsMouseMode(!isMouseMode)} 
                    className="w-12 h-12 shadow-lg"
                    title="Toggle Mouse Mode"
                >
                    {Icons.Mouse}
                </Button>
             </div>

             {!isMouseMode ? (
               /* Standard D-Pad */
               <div className="w-full h-full relative animate-fade-in">
                 <div className="absolute inset-0 flex flex-col items-center justify-between p-1 pointer-events-none">
                   <Button variant="control" onClick={() => handleCommand(RemoteKey.UP)} className="w-14 h-14 mt-1 pointer-events-auto">{Icons.Up}</Button>
                   <Button variant="control" onClick={() => handleCommand(RemoteKey.DOWN)} className="w-14 h-14 mb-1 pointer-events-auto">{Icons.Down}</Button>
                 </div>
                 <div className="absolute inset-0 flex flex-row items-center justify-between p-1 pointer-events-none">
                   <Button variant="control" onClick={() => handleCommand(RemoteKey.LEFT)} className="w-14 h-14 ml-1 pointer-events-auto">{Icons.Left}</Button>
                   <Button variant="control" onClick={() => handleCommand(RemoteKey.RIGHT)} className="w-14 h-14 mr-1 pointer-events-auto">{Icons.Right}</Button>
                 </div>
                 {/* Center OK */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Button variant="primary" onClick={() => handleCommand(RemoteKey.OK)} className="w-20 h-20 rounded-full z-10 text-xl font-bold pointer-events-auto">
                    OK
                    </Button>
                 </div>
               </div>
             ) : (
               /* Mouse Touch Pad */
               <div 
                  className="w-full h-full rounded-2xl bg-gray-700/30 border-2 border-dashed border-gray-600/50 flex items-center justify-center cursor-crosshair touch-none relative animate-fade-in"
                  onPointerDown={handlePadDown}
                  onPointerMove={handlePadMove}
                  onPointerUp={handlePadUp}
                  onPointerLeave={handlePadUp}
               >
                  <div className="pointer-events-none text-gray-500 text-xs font-medium flex flex-col items-center gap-2 select-none">
                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                    <span>Touch Surface</span>
                    <span className="text-[10px] opacity-70">Tap to Click</span>
                  </div>
               </div>
             )}
          </div>

          {/* Number Pad Section */}
          <div className="grid grid-cols-5 gap-2 animate-fade-in">
             {numberKeys.map((item) => (
                <Button 
                  key={item.label} 
                  variant="secondary" 
                  onClick={() => handleCommand(item.key)}
                  className="h-10 font-bold text-sm"
                >
                  {item.label}
                </Button>
             ))}
          </div>

          {/* Middle Section: Volume/Channel Rockers OR Virtual Keyboard */}
          {!isMouseMode ? (
            <div className="grid grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-gray-800 rounded-2xl p-2 flex flex-col gap-2 items-center border border-gray-700 shadow-inner">
                 <span className="text-xs text-gray-500 font-bold uppercase py-1">Vol</span>
                 <Button variant="control" onClick={() => handleCommand(RemoteKey.VOLUME_UP)} className="w-full h-16 rounded-xl">{Icons.VolUp}</Button>
                 <Button variant="control" onClick={() => handleCommand(RemoteKey.VOLUME_DOWN)} className="w-full h-16 rounded-xl">{Icons.VolDown}</Button>
              </div>
              <div className="bg-gray-800 rounded-2xl p-2 flex flex-col gap-2 items-center border border-gray-700 shadow-inner">
                 <span className="text-xs text-gray-500 font-bold uppercase py-1">Ch</span>
                 <Button variant="control" onClick={() => handleCommand(RemoteKey.CHANNEL_UP)} className="w-full h-16 rounded-xl">{Icons.Up}</Button>
                 <Button variant="control" onClick={() => handleCommand(RemoteKey.CHANNEL_DOWN)} className="w-full h-16 rounded-xl">{Icons.Down}</Button>
              </div>
            </div>
          ) : (
            <VirtualKeyboard onKey={handleKeyInput} />
          )}

          {/* Navigation Utils */}
          <div className="flex justify-between gap-4">
             <Button variant="secondary" className="flex-1 h-14" onClick={() => handleCommand(RemoteKey.BACK)}>{Icons.Back} Back</Button>
             <Button variant="secondary" className="flex-1 h-14" onClick={() => handleCommand(RemoteKey.HOME)}>{Icons.Home} Home</Button>
          </div>

          {/* Smart Features */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
               variant="primary" 
               className={`h-14 ${!hasApiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
               onClick={() => hasApiKey && setIsVoiceOpen(true)}
               disabled={!hasApiKey}
            >
               <span className="flex items-center gap-2">
                 {Icons.Mic} AI Voice
               </span>
            </Button>
            <Button variant="danger" className="h-14 bg-gradient-to-b from-red-800 to-red-900 border-red-700" onClick={() => handleCommand(RemoteKey.NETFLIX)}>
               Netflix
            </Button>
          </div>
          
          {!hasApiKey && (
             <p className="text-center text-[10px] text-gray-600">
               Add API_KEY to environment for Voice features.
             </p>
          )}

        </main>
      )}

      {/* Voice Modal */}
      <VoiceControl 
        isOpen={isVoiceOpen} 
        onClose={() => setIsVoiceOpen(false)} 
        onCommand={handleCommand}
      />

    </div>
  );
};

// Internal Virtual Keyboard Component
const VirtualKeyboard = ({ onKey }: { onKey: (char: string) => void }) => {
  const [shift, setShift] = useState(false);

  const rows = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['z','x','c','v','b','n','m']
  ];

  const handleKey = (char: string) => {
    onKey(shift ? char.toUpperCase() : char);
    if (shift) setShift(false);
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-3 border border-gray-700 animate-fade-in select-none shadow-inner">
       <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
             <div key={i} className="flex justify-center gap-1">
                {row.map(char => (
                   <Button 
                     key={char} 
                     variant="secondary"
                     onClick={() => handleKey(char)}
                     className="h-10 min-w-[8%] flex-1 text-sm uppercase px-0 rounded-lg"
                   >
                     {shift ? char.toUpperCase() : char}
                   </Button>
                ))}
             </div>
          ))}
          <div className="flex justify-center gap-1 mt-1">
             <Button 
                variant={shift ? "primary" : "secondary"}
                onClick={() => setShift(!shift)} 
                className="h-10 px-3 rounded-lg"
             >
                ⇧
             </Button>
             <Button 
                variant="secondary"
                onClick={() => onKey(' ')} 
                className="h-10 flex-[4] rounded-lg"
             >
                Space
             </Button>
             <Button 
                variant="secondary"
                onClick={() => onKey('Backspace')} 
                className="h-10 px-3 rounded-lg"
             >
                ⌫
             </Button>
             <Button 
                variant="primary"
                onClick={() => onKey('Enter')} 
                className="h-10 px-3 rounded-lg"
             >
                ⏎
             </Button>
          </div>
       </div>
    </div>
  );
};

export default App;