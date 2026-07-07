const fs = require('fs');
let code = fs.readFileSync('src/components/ChatScreen.tsx', 'utf8');

// 1. Remove searchDate state
code = code.replace("const [searchDate, setSearchDate] = useState('');\n", "");

// 2. Remove date from filteredMessages
const filterOld = `  const filteredMessages = messages.filter(msg => {
    let matchesQuery = true;
    let matchesDate = true;

    if (searchQuery) {
      matchesQuery = !!msg.text?.toLowerCase().includes(searchQuery.toLowerCase());
    }

    if (searchDate) {
      const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
      matchesDate = msgDate === searchDate;
    }

    return matchesQuery && matchesDate;
  });`;

const filterNew = `  const filteredMessages = messages.filter(msg => {
    if (!searchQuery) return true;
    return !!msg.text?.toLowerCase().includes(searchQuery.toLowerCase());
  });`;
code = code.replace(filterOld, filterNew);

// 3. Update Search Header UI
const oldUI = `      {/* Search Header */}
      <AnimatePresence>
        {isSearchVisible && (
          <motion.div 
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-white/90 backdrop-blur-md px-6 py-4 border-b border-sage-100 flex flex-col gap-3 z-10 pt-16"
          >
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
              <input 
                type="text" 
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-sage-50 border border-sage-200 rounded-full py-2 pl-10 pr-4 text-sm outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-all text-sage-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-sage-500">Date:</span>
              <input 
                type="date" 
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="bg-sage-50 border border-sage-200 rounded-full px-3 py-1.5 text-xs outline-none focus:border-sage-400 text-sage-700 uppercase tracking-wide"
              />
              {(searchQuery || searchDate) && (
                <button 
                  onClick={() => { setSearchQuery(''); setSearchDate(''); }}
                  className="ml-auto text-xs text-sage-500 hover:text-sage-700 font-medium bg-sage-100 px-3 py-1.5 rounded-full"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>`;

const newUI = `      {/* Search Header */}
      <AnimatePresence>
        {isSearchVisible && (
          <motion.div 
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-mint/80 backdrop-blur-md px-6 py-4 border-b border-sage-200 flex items-center gap-3 z-10 pt-16 shadow-sm"
          >
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-500" />
              <input 
                type="text" 
                placeholder="ค้นหาข้อความ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/70 border-2 border-sage-200/50 rounded-full py-2.5 pl-11 pr-4 text-[15px] outline-none focus:border-sage-400 focus:bg-white transition-all text-sage-900 shadow-inner"
              />
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs text-sage-600 hover:text-sage-800 font-medium bg-sage-200/50 hover:bg-sage-300/50 px-4 py-2.5 rounded-full transition-colors"
              >
                Clear
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>`;

code = code.replace(oldUI, newUI);

fs.writeFileSync('src/components/ChatScreen.tsx', code);
