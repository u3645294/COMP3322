> To be tested, not yet confirmed
# Set up guide for Windows
Download the following apps
1. Docker Desktop
2. Git for Windows
3. Node.js
4. Ubuntu

## Github
1. Green code button
2. Download zip
3. Unzip the folder

## Git bash
`cd c:\Users\Downloads\COMP3322-main`  
`cp .env.example .env`  
`notepad .env`

## Notepad
1. Replace `SESSION_SECRET=replace_with_a_random_string_at_least_32_characters` with `SESSION_SECRET=12345678901234567890123456789012`
2. Save the file

## Git bash
`cd backend/data`  
`npm install`  
`npm run recipes:import`  
`cd c\Users\Downloads\COMP3322-main`  
`docker compose up —-build`  

## Browser
Open http://localhost:3000
