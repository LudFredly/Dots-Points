# H4A Volleyball Team Data Backup

This folder contains the authoritative offline backup and portable schema for the team's data:
- **`team-data.json`**: Portable JSON source of truth containing players, positions, jersey numbers, fine records, dugnad (club duty) hours & points, rules, and settings.

## How to Export Live Team Data
1. Open the Admin dashboard at `/admin?key=YOUR_ADMIN_ACCESS_KEY`.
2. Click on the **Backup & Data** tab.
3. Click **"Export team data"**.
4. Save the downloaded JSON file as `data/team-data.json` in your repository.

## How to Import / Restore Data into Firestore
1. Open the Admin dashboard at `/admin?key=YOUR_ADMIN_ACCESS_KEY`.
2. Navigate to the **Backup & Data** tab.
3. Click **"Import team data"** and select your `team-data.json` file.
4. The system validates the file structure and displays an inspection preview showing player counts, fines, and dugnad records before committing any changes.
5. Choose either:
   - **Merge & Update**: Safely updates players and adds missing records without deleting existing documents.
   - **Replace Team Data**: Performs a clean complete restore of all players, fines, and dugnad entries.
6. Confirm the import to write the data to Firestore.

## Schema Structure
For every player:
- `firstName`: String
- `lastName`: String
- `role`: String (e.g., "Outside Hitter", "Setter", "Middle Blocker", "Opposite", "Libero")
- `number`: Number (jersey number)
- `totalFineSum`: Number (total fines in NOK)
- `totalDugnadHours`: Number (total duty hours)
- `totalDugnadPoints`: Number (total duty points)
- `fines`: Array of all individual fine reports for this player (id, date, ruleIds, ruleTitles, totalFine, comment, reportedBy, eventContext, status, paid)
- `dugnad`: Array of all individual dugnad entries for this player (id, date, activityType, hours, points, dutyHours, dutyPoints, hadTravel, travelHours, travelPoints, comment, status)
