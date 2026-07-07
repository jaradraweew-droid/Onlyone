const fs = require('fs');
let code = fs.readFileSync('src/components/HomeScreen.tsx', 'utf8');

// 1. Add state variables
code = code.replace(
  "const [showMoodCheckIn, setShowMoodCheckIn] = useState(() => {",
  "const [isEditingRoomName, setIsEditingRoomName] = useState(false);\n  const [roomNameInput, setRoomNameInput] = useState(user.roomName || 'Sanctuary');\n  const [showMoodCheckIn, setShowMoodCheckIn] = useState(() => {"
);

// 2. Add handleSaveRoomName function
const handleSave = `
  const handleSaveRoomName = () => {
    setIsEditingRoomName(false);
    if (roomNameInput.trim() !== '' && roomNameInput !== user.roomName) {
      onUpdateUser({ ...user, roomName: roomNameInput.trim() });
    }
  };
`;
code = code.replace(
  "const calculateAnniversary = () => {",
  handleSave + "\n  const calculateAnniversary = () => {"
);

// 3. Update calculateAnniversary to Thai
const oldCalc = `    if (years > 0) parts.push(\`\${years} year\${years !== 1 ? 's' : ''}\`);
    if (months > 0) parts.push(\`\${months} month\${months !== 1 ? 's' : ''}\`);
    if (days > 0 || (years === 0 && months === 0)) parts.push(\`\${days} day\${days !== 1 ? 's' : ''}\`);
    
    return parts.join(', ').replace(/, ([^,]*)$/, ' and $1');`;
const newCalc = `    if (years > 0) parts.push(\`\${years} ปี\`);
    if (months > 0) parts.push(\`\${months} เดือน\`);
    if (days > 0 || (years === 0 && months === 0)) parts.push(\`\${days} วัน\`);
    
    return parts.join(' ');`;
code = code.replace(oldCalc, newCalc);

// 4. Update the header UI
const oldHeader = `          <div>
            <div className="flex items-baseline gap-3">
              <h2 className="font-serif text-2xl text-sage-900">Sanctuary</h2>
              {user.anniversaryDate && (
                <span className="text-xs font-medium text-sage-500 bg-white/60 px-2 py-0.5 rounded-full shadow-sm">
                  {calculateAnniversary()}
                </span>
              )}
            </div>
            <p className="text-xs text-sage-700 flex items-center gap-1.5 mt-1">
              <span className={\`w-2 h-2 rounded-full \${getMoodColor(partnerMood)} shadow-sm\`}></span>
              Partner is feeling {getMoodLabel(partnerMood)}
            </p>
          </div>
        </div>
        <button 
          onClick={triggerLeafFall}
          className="w-11 h-11 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 hover:bg-sage-300 transition-colors shadow-sm"
          title="Thinking of you"
        >
          <Leaf size={22} />
        </button>`;

const newHeader = `          <div className="flex flex-col">
            {user.anniversaryDate && (
              <span className="text-[10px] font-medium text-sage-500 mb-0.5">
                {calculateAnniversary()}
              </span>
            )}
            <div className="flex items-center gap-2 group h-8">
              {isEditingRoomName ? (
                <input 
                  type="text" 
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  onBlur={handleSaveRoomName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRoomName()}
                  autoFocus
                  className="font-serif text-2xl text-sage-900 bg-transparent border-b border-sage-300 outline-none w-32"
                />
              ) : (
                <h2 
                  className="font-serif text-2xl text-sage-900 cursor-pointer" 
                  onClick={() => setIsEditingRoomName(true)}
                >
                  {user.roomName || 'Sanctuary'}
                </h2>
              )}
            </div>
            <p className="text-xs text-sage-700 flex items-center gap-1.5 mt-1">
              <span className={\`w-2 h-2 rounded-full \${getMoodColor(partnerMood)} shadow-sm\`}></span>
              Partner is feeling {getMoodLabel(partnerMood)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowMoodCheckIn(!showMoodCheckIn)}
            className="w-11 h-11 rounded-full bg-white/80 border border-sage-100 flex items-center justify-center text-sage-500 hover:text-sage-700 hover:bg-white transition-all shadow-sm"
            title="Check-in mood"
          >
            <Smile size={20} />
          </button>
          <button 
            onClick={triggerLeafFall}
            className="w-11 h-11 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 hover:bg-sage-300 transition-colors shadow-sm"
            title="Thinking of you"
          >
            <Leaf size={22} />
          </button>
        </div>`;

code = code.replace(oldHeader, newHeader);

fs.writeFileSync('src/components/HomeScreen.tsx', code);
