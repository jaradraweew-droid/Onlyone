const fs = require('fs');
let code = fs.readFileSync('src/components/HomeScreen.tsx', 'utf8');
code = code.replace(
  "const [showMoodCheckIn, setShowMoodCheckIn] = useState(false); // () => {\n    const today = new Date().toDateString();\n    return localStorage.getItem('last_check_in_date') !== today;\n  });",
  "const [showMoodCheckIn, setShowMoodCheckIn] = useState(false);"
);
fs.writeFileSync('src/components/HomeScreen.tsx', code);
