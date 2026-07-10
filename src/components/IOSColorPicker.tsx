import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { X, Pipette, Plus } from 'lucide-react';

interface IOSColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

type TabType = 'grid' | 'spectrum' | 'sliders';

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 160, g: 176, b: 163 };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    '#' +
    ((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)
      .toUpperCase()
  );
}

// Generate a 12x10 grid of colors (120 colors) for the Grid tab
const GRID_COLORS: string[] = [];
const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const lightLevels = [95, 85, 75, 65, 55, 45, 35, 25, 15, 5];

for (const l of lightLevels) {
  for (const h of hues) {
    // A simple HSL to HEX generation would be ideal, but for the grid we can just use inline HSL.
    // However, react-colorful uses HEX. So we need to store HEX.
    GRID_COLORS.push(hslToHex(h, 70, l));
  }
}

// We need an array of grayscale colors for the top row to exactly match iOS
const GRAYSCALE = [
  '#FFFFFF', '#F2F2F2', '#E5E5E5', '#D8D8D8', '#CCCCCC', '#BFBFBF',
  '#B2B2B2', '#A5A5A5', '#999999', '#8C8C8C', '#7F7F7F', '#000000'
];

// Replace the first row with grayscale
for (let i = 0; i < 12; i++) {
  GRID_COLORS[i] = GRAYSCALE[i];
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export default function IOSColorPicker({ color, onChange, onClose }: IOSColorPickerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('spectrum');
  const [rgb, setRgb] = useState(hexToRgb(color));
  const [hexInput, setHexInput] = useState(color.replace('#', '').toUpperCase());

  // Sync internal state when external color prop changes (e.g. from picker)
  useEffect(() => {
    const newRgb = hexToRgb(color);
    setRgb(newRgb);
    setHexInput(color.replace('#', '').toUpperCase());
  }, [color]);

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgb, [channel]: value };
    setRgb(newRgb);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(newHex.replace('#', ''));
    onChange(newHex);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setHexInput(val);
    if (/^[0-9A-F]{6}$/i.test(val)) {
      onChange('#' + val);
    }
  };

  const handleHexInputBlur = () => {
    // Revert to valid hex if invalid on blur
    if (!/^[0-9A-F]{6}$/i.test(hexInput)) {
      setHexInput(color.replace('#', '').toUpperCase());
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-[#F2F2F7] w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <button className="p-2 -ml-2 text-gray-800 hover:bg-gray-200 rounded-full transition-colors">
            <Pipette size={20} strokeWidth={2.5} />
          </button>
          <h3 className="font-semibold text-[17px] text-gray-900">สี</h3>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-800 hover:bg-gray-200 rounded-full transition-colors bg-gray-200/50"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-4">
          <div className="flex bg-[#E3E3E8] rounded-[9px] p-[2px]">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex-1 text-[13px] font-medium py-1.5 rounded-[7px] transition-all ${
                activeTab === 'grid' ? 'bg-white shadow-sm text-black' : 'text-gray-600'
              }`}
            >
              ตาราง
            </button>
            <button
              onClick={() => setActiveTab('spectrum')}
              className={`flex-1 text-[13px] font-medium py-1.5 rounded-[7px] transition-all ${
                activeTab === 'spectrum' ? 'bg-white shadow-sm text-black' : 'text-gray-600'
              }`}
            >
              สเปกตรัม
            </button>
            <button
              onClick={() => setActiveTab('sliders')}
              className={`flex-1 text-[13px] font-medium py-1.5 rounded-[7px] transition-all ${
                activeTab === 'sliders' ? 'bg-white shadow-sm text-black' : 'text-gray-600'
              }`}
            >
              แถบเลื่อน
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="px-4 pb-4 flex-1 h-[280px]">
          {activeTab === 'grid' && (
            <div className="w-full h-full bg-white rounded-xl overflow-hidden grid grid-cols-12 grid-rows-10 border border-gray-200">
              {GRID_COLORS.map((c, i) => (
                <button
                  key={i}
                  className="w-full h-full transition-transform active:scale-90"
                  style={{ backgroundColor: c }}
                  onClick={() => onChange(c)}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          )}

          {activeTab === 'spectrum' && (
            <div className="w-full h-full rounded-xl overflow-hidden shadow-inner relative">
              {/* Overriding react-colorful default dimensions to fill container */}
              <style>{`
                .react-colorful { width: 100% !important; height: 100% !important; }
                .react-colorful__pointer { width: 28px !important; height: 28px !important; border-width: 3px !important; }
                .react-colorful__hue { height: 24px !important; margin-top: 12px !important; border-radius: 12px !important; }
                .react-colorful__saturation { border-radius: 12px 12px 0 0 !important; }
                .react-colorful__alpha { display: none; }
              `}</style>
              <HexColorPicker color={color} onChange={onChange} />
            </div>
          )}

          {activeTab === 'sliders' && (
            <div className="w-full flex flex-col gap-5 pt-2">
              
              {/* Red Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-gray-700 w-12">สีแดง</span>
                <div className="flex-1 relative flex items-center">
                  <div 
                    className="absolute inset-0 rounded-full h-6"
                    style={{ background: `linear-gradient(to right, rgb(0, ${rgb.g}, ${rgb.b}), rgb(255, ${rgb.g}, ${rgb.b}))` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgb.r}
                    onChange={(e) => handleRgbChange('r', parseInt(e.target.value))}
                    className="w-full h-6 opacity-0 cursor-pointer relative z-10"
                  />
                  <div 
                    className="absolute h-6 w-6 rounded-full border-[3px] border-white shadow-sm pointer-events-none z-0 bg-transparent"
                    style={{ left: `calc(${(rgb.r / 255) * 100}% - 12px)` }}
                  />
                </div>
                <input
                  type="number"
                  value={rgb.r}
                  onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
                  className="w-[52px] h-8 bg-white border border-gray-200 rounded-lg text-center text-[15px] font-medium outline-none focus:border-blue-500"
                />
              </div>

              {/* Green Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-gray-700 w-12">สีเขียว</span>
                <div className="flex-1 relative flex items-center">
                  <div 
                    className="absolute inset-0 rounded-full h-6"
                    style={{ background: `linear-gradient(to right, rgb(${rgb.r}, 0, ${rgb.b}), rgb(${rgb.r}, 255, ${rgb.b}))` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgb.g}
                    onChange={(e) => handleRgbChange('g', parseInt(e.target.value))}
                    className="w-full h-6 opacity-0 cursor-pointer relative z-10"
                  />
                  <div 
                    className="absolute h-6 w-6 rounded-full border-[3px] border-white shadow-sm pointer-events-none z-0 bg-transparent"
                    style={{ left: `calc(${(rgb.g / 255) * 100}% - 12px)` }}
                  />
                </div>
                <input
                  type="number"
                  value={rgb.g}
                  onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
                  className="w-[52px] h-8 bg-white border border-gray-200 rounded-lg text-center text-[15px] font-medium outline-none focus:border-blue-500"
                />
              </div>

              {/* Blue Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-gray-700 w-12">สีน้ำเงิน</span>
                <div className="flex-1 relative flex items-center">
                  <div 
                    className="absolute inset-0 rounded-full h-6"
                    style={{ background: `linear-gradient(to right, rgb(${rgb.r}, ${rgb.g}, 0), rgb(${rgb.r}, ${rgb.g}, 255))` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgb.b}
                    onChange={(e) => handleRgbChange('b', parseInt(e.target.value))}
                    className="w-full h-6 opacity-0 cursor-pointer relative z-10"
                  />
                  <div 
                    className="absolute h-6 w-6 rounded-full border-[3px] border-white shadow-sm pointer-events-none z-0 bg-transparent"
                    style={{ left: `calc(${(rgb.b / 255) * 100}% - 12px)` }}
                  />
                </div>
                <input
                  type="number"
                  value={rgb.b}
                  onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
                  className="w-[52px] h-8 bg-white border border-gray-200 rounded-lg text-center text-[15px] font-medium outline-none focus:border-blue-500"
                />
              </div>

              {/* Hex Input */}
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-200">
                <span className="text-[15px] text-blue-500">sRGB เลขรหัสสี #</span>
                <input
                  type="text"
                  value={hexInput}
                  onChange={handleHexInputChange}
                  onBlur={handleHexInputBlur}
                  className="w-[84px] h-8 bg-white border border-gray-200 rounded-lg text-center text-[15px] font-medium uppercase outline-none focus:border-blue-500"
                  maxLength={6}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer (Preview) */}
        <div className="px-4 py-4 bg-gradient-to-b from-[#EAEAEF] to-[#D5D5DB] border-t border-gray-300 flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-xl shadow-sm border border-black/10"
            style={{ backgroundColor: color }}
          />
          <button className="p-2 text-gray-600 bg-black/5 hover:bg-black/10 rounded-full transition-colors">
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>

      </div>
    </div>
  );
}
