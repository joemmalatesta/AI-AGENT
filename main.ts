import express, { Express, Request, Response } from "express";
import csv from 'csv-parser';
import fs from 'fs';

const app = express();
const port = 3000;

// Load users from CSV into Map
const userDatabase = new Map();

console.log('Starting to load CSV file...');

fs.createReadStream('./db.csv')
  .pipe(csv())
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

app.use(express.json());

// Retell webhook endpoint for inbound calls
app.post('/', (req: Request, res: Response) => {
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
app.post('/saveUser', (req: Request, res: Response) => {
  const userName = req.body.args.name;
  const phoneNumber = req.body.call?.from_number;

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
  fs.appendFile('./db.csv', newLine, (err) => {
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
