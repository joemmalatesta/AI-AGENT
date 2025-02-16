"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Load users from CSV into Map
const userDatabase = new Map();
console.log('Starting to load CSV file...');
fs_1.default.createReadStream('./db.csv')
    .pipe((0, csv_parser_1.default)())
    .on('data', (row) => {
    // Clean up phone number by removing spaces and ensuring consistent format
    const cleanPhoneNumber = row.phone_number.trim().replace(/\s+/g, '');
    console.log('Loading row:', row);
    userDatabase.set(cleanPhoneNumber, row.name.trim());
})
    .on('error', (error) => {
    console.error('Error reading CSV:', error);
})
    .on('end', () => {
    console.log('CSV file successfully loaded');
    console.log('Current database contents:', Object.fromEntries(userDatabase));
});
app.use(express_1.default.json());
// Endpoint to get user name by phone number
app.get('/user/:phoneNumber', (req, res) => {
    const phoneNumber = req.params.phoneNumber;
    if (!phoneNumber) {
        res.status(400).json({ error: 'Phone number is required' });
        return;
    }
    const userName = userDatabase.get(phoneNumber);
    if (!userName) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json({ name: userName });
    return;
});
// Retell webhook endpoint for inbound calls
app.post('/', (req, res) => {
    const { from_number, to_number, llm_id } = req.body;
    // Look up user by their phone number
    const userName = userDatabase.get(from_number);
    console.log("caller name: ", userName);
    if (!userName) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    // Return the response in Retell's expected format
    res.json({
        "user_name": userName,
    });
    return;
});
// Endpoint to save new user
app.post('/saveUser', (req, res) => {
    var _a;
    const userName = req.body.args.name;
    const phoneNumber = (_a = req.body.call) === null || _a === void 0 ? void 0 : _a.from_number;
    console.log("userName: ", userName);
    console.log("phoneNumber: ", phoneNumber);
    if (!userName || !phoneNumber) {
        res.status(400).json({ error: 'Both name and phone number are required' });
        return;
    }
    // Clean up phone number and name
    const cleanPhoneNumber = phoneNumber.trim().replace(/\s+/g, '');
    const cleanName = userName.trim();
    // Save to Map
    userDatabase.set(cleanPhoneNumber, cleanName);
    // Append to CSV file
    const newLine = `\n${cleanName},${cleanPhoneNumber}`;
    fs_1.default.appendFile('./db.csv', newLine, (err) => {
        if (err) {
            console.error('Error saving to CSV:', err);
            res.status(500).json({ error: 'Failed to save user' });
            return;
        }
        res.status(201).json({
            message: 'User saved successfully',
            name: cleanName,
            phoneNumber: cleanPhoneNumber
        });
        return;
    });
});
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
